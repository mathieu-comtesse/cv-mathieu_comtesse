using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using Unity.AI.Navigation;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;
using UnityEngine.SceneManagement;
using UngaBunga45001;

internal sealed class ChapterMotionBuildV241 : IDisposable
{
    const string Source = "Assets/UngaBunga45001/Resources/CinematicsV18/Clips";
    const string Parked = "Assets/ThaleolithicMotionV241";
    const string Manifest = "Assets/UngaBunga45001/Resources/ThaleolithicChapterMotion.json";
    const string Marker = "Library/ThaleolithicMotionV241";
    const string Intermediate = "Library/ThaleolithicMotionBundlesV241";
    readonly ChapterMotionV241.Pack[] packs =
    {
        new ChapterMotionV241.Pack { chapter = "07", clips = new[] { "V18_Dylan_PointSecurite" } },
        new ChapterMotionV241.Pack { chapter = "08", clips = new[] { "V18_Aurelien_Transat", "V18_Georges_PoseTorchis",
            "V18_Neila_ManipulationPoterie", "V18_Ouways_Embrasement", "V18_Ouways_Peinture", "V18_Tarek_Palissade" } }
    };

    public static ChapterMotionBuildV241 Create()
    {
        Restore();
        if (AssetDatabase.IsValidFolder(Parked) || File.Exists(Manifest))
            throw new InvalidOperationException("Chemins réservés aux lots Web déjà présents.");
        var scope = new ChapterMotionBuildV241();
        File.WriteAllText(Marker, "V24.1");
        try { scope.Build(); return scope; }
        catch { scope.Dispose(); throw; }
    }

    void Build()
    {
        Move(Source, Parked);
        var known = packs.SelectMany(pack => pack.clips).OrderBy(id => id).ToArray();
        var found = Directory.GetFiles(Parked, "*.anim").Select(Path.GetFileNameWithoutExtension).OrderBy(id => id).ToArray();
        if (!known.SequenceEqual(found)) throw new InvalidDataException("Le catalogue des animations différées a changé.");
        var definitions = packs.Select(pack => new AssetBundleBuild {
            assetBundleName = "iso-" + pack.chapter + ".bundle",
            assetNames = pack.clips.Select(id => Parked + "/" + id + ".anim").ToArray(),
            addressableNames = pack.clips
        }).ToArray();
        Directory.CreateDirectory(Intermediate);
        var result = BuildPipeline.BuildAssetBundles(Intermediate, definitions,
            BuildAssetBundleOptions.ChunkBasedCompression | BuildAssetBundleOptions.StrictMode, BuildTarget.WebGL);
        if (result == null) throw new InvalidOperationException("Compilation des lots ISO impossible.");
        using (var sha = SHA256.Create())
            for (int i = 0; i < packs.Length; i++)
            {
                string name = definitions[i].assetBundleName;
                if (result.GetAllDependencies(name).Length != 0) throw new InvalidDataException("Dépendance entre lots : " + name);
                using var file = File.OpenRead(Path.Combine(Intermediate, name));
                var hash = BitConverter.ToString(sha.ComputeHash(file)).Replace("-", "").ToLowerInvariant().Substring(0, 12);
                packs[i].file = "iso-" + packs[i].chapter + "-" + hash + ".bundle";
            }
        File.WriteAllText(Manifest, JsonUtility.ToJson(new ChapterMotionV241.Manifest { packs = packs }));
        AssetDatabase.ImportAsset(Manifest, ImportAssetOptions.ForceSynchronousImport);
    }

    public void VerifyAndCopy(BuildReport report, string output)
    {
        if (report.packedAssets.Any(file => file.contents.Any(item => item.sourceAssetPath != null &&
            item.sourceAssetPath.StartsWith(Parked + "/", StringComparison.Ordinal))))
            throw new InvalidDataException("Un clip différé est encore référencé par le noyau Web.");
        string streaming = Path.Combine(output, "StreamingAssets");
        Directory.CreateDirectory(streaming);
        foreach (var pack in packs)
            File.Copy(Path.Combine(Intermediate, "iso-" + pack.chapter + ".bundle"), Path.Combine(streaming, pack.file));
    }

    public void Dispose() => Restore();

    static void Restore()
    {
        if (!File.Exists(Marker)) return;
        if (File.Exists(Manifest) && !AssetDatabase.DeleteAsset(Manifest))
            throw new IOException("Impossible de retirer le manifeste temporaire.");
        if (AssetDatabase.IsValidFolder(Parked)) Move(Parked, Source);
        File.Delete(Marker);
    }

    static void Move(string from, string to)
    {
        string error = AssetDatabase.MoveAsset(from, to);
        if (!string.IsNullOrEmpty(error)) throw new IOException(error);
    }
}

internal sealed class WebSceneNavigationV241 : IProcessSceneWithReport
{
    public int callbackOrder => 0;
    public static bool Enabled { get; set; }

    public void OnProcessScene(Scene scene, BuildReport report)
    {
        if (!Enabled || report == null || report.summary.platform != BuildTarget.WebGL ||
            scene.path != "Assets/UngaBunga45001/Scenes/UngaBunga45001-Web.unity") return;
        foreach (var root in scene.GetRootGameObjects())
            foreach (var surface in root.GetComponentsInChildren<NavMeshSurface>(true))
                if (!surface.isActiveAndEnabled && surface.name == "Terrain" &&
                    AssetDatabase.GetAssetPath(surface.navMeshData) == "Assets/NavMeshData/NavMesh-Terrain.asset")
                    surface.navMeshData = null;
    }
}