using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Unity.AI.Navigation;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.Profiling;

internal static class WebAssetInventoryV241
{
    const string Scene = "Assets/UngaBunga45001/Scenes/UngaBunga45001-Web.unity";
    const string Output = "E:/UNGA-BUNGA-45001/Revision24-1";

    public static void Baseline()
    {
        var report = BuildReport.GetLatestReport();
        if (report == null || report.summary.platform != BuildTarget.WebGL ||
            !report.summary.outputPath.Replace('\\', '/').EndsWith("/Web-V24", StringComparison.Ordinal))
            throw new InvalidOperationException("Le dernier Build Report doit être celui du WebGL V24.");
        Write(report, "v24");
    }

    public static void Write(BuildReport report, string label)
    {
        Directory.CreateDirectory(Output);
        EditorSceneManager.OpenScene(Scene);
        var sceneDependencies = new HashSet<string>(AssetDatabase.GetDependencies(Scene, true));
        var packed = report.packedAssets.SelectMany(file => file.contents)
            .Where(entry => !string.IsNullOrEmpty(entry.sourceAssetPath))
            .GroupBy(entry => entry.sourceAssetPath).ToArray();
        var materials = new Dictionary<string, SortedSet<string>>();
        foreach (var path in packed.Where(group => group.Any(entry => entry.type == typeof(Material)))
            .Select(group => group.Key))
            foreach (var dependency in AssetDatabase.GetDependencies(path, false))
            {
                if (dependency == path) continue;
                if (!materials.TryGetValue(dependency, out var users)) materials.Add(dependency, users = new SortedSet<string>());
                users.Add(path);
            }

        var textures = new List<TextureRow>();
        foreach (var group in packed.OrderByDescending(group => group.Sum(entry => (decimal)entry.packedSize)))
        {
            if (!group.Any(entry => typeof(Texture).IsAssignableFrom(entry.type))) continue;
            var texture = AssetDatabase.LoadAllAssetsAtPath(group.Key).OfType<Texture>().FirstOrDefault();
            var importer = AssetImporter.GetAtPath(group.Key) as TextureImporter;
            if (texture == null && importer == null) continue;
            var web = importer?.GetPlatformTextureSettings("WebGL");
            textures.Add(new TextureRow { name = texture == null ? Path.GetFileName(group.Key) : texture.name,
                path = group.Key, width = texture == null ? 0 : texture.width, height = texture == null ? 0 : texture.height,
                source = Path.GetExtension(group.Key), importedFormat = texture == null ? "indisponible" : texture.graphicsFormat.ToString(),
                webOverride = web != null && web.overridden ? web.format.ToString() : "automatique",
                mipmaps = texture == null ? 0 : texture.mipmapCount, sourceBytes = File.Exists(group.Key) ? new FileInfo(group.Key).Length : 0,
                packedBytes = (long)group.Sum(entry => (decimal)entry.packedSize),
                editorBytes = texture == null ? 0 : Profiler.GetRuntimeMemorySizeLong(texture),
                materialPaths = materials.TryGetValue(group.Key, out var used) ? used.ToArray() : Array.Empty<string>(),
                scene = sceneDependencies.Contains(group.Key) ? Scene : "",
                loading = sceneDependencies.Contains(group.Key) ? "dépendance de la scène initiale" : "ressource embarquée, usage dynamique à vérifier"
            });
        }

        var nav = UnityEngine.Object.FindObjectsByType<NavMeshSurface>(FindObjectsInactive.Include, FindObjectsSortMode.None)
            .Select(surface => {
                var path = AssetDatabase.GetAssetPath(surface.navMeshData);
                return new SurfaceRow { name = surface.name, asset = path, active = surface.isActiveAndEnabled,
                    agentType = surface.agentTypeID, bounds = surface.navMeshData == null ? new Bounds() : surface.navMeshData.sourceBounds,
                    collectObjects = surface.collectObjects.ToString(), tile = surface.tileSize,
                    sourceBytes = File.Exists(path) ? new FileInfo(path).Length : 0 };
            }).ToArray();
        var graph = NavMesh.CalculateTriangulation();
        var inventory = new Inventory { buildPath = report.summary.outputPath, scene = Scene, textures = textures.ToArray(),
            surfaces = nav, navVertices = graph.vertices.Length, navTriangles = graph.indices.Length / 3 };
        File.WriteAllText(Path.Combine(Output, "inventory-" + label + ".json"), JsonUtility.ToJson(inventory, true));
        Debug.Log("Inventaire Web : " + textures.Count + " chemins de textures, " + nav.Length + " surfaces NavMesh.");
    }

    [Serializable] sealed class Inventory
    {
        public string buildPath, scene;
        public TextureRow[] textures;
        public SurfaceRow[] surfaces;
        public int navVertices, navTriangles;
    }

    [Serializable] sealed class TextureRow
    {
        public string name, path, source, importedFormat, webOverride, scene, loading;
        public int width, height, mipmaps;
        public long sourceBytes, packedBytes, editorBytes;
        public string[] materialPaths;
    }

    [Serializable] sealed class SurfaceRow
    {
        public string name, asset, collectObjects;
        public bool active;
        public int agentType, tile;
        public Bounds bounds;
        public long sourceBytes;
    }
}