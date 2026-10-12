using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

public static class TalasGeometryAudit
{
    const string BudgetPath = "Assets/TalasSettings/GeometryBudget.asset";

    [Serializable] public class MeshRow
    {
        public string objectPath;
        public long triangles;
        public int vertices;
        public bool intersectsCameraFrustum;
        public int materialSlots;
    }
    [Serializable] public class Report
    {
        public string utc, scene, camera, gpu;
        public bool supports32BitIndices;
        public int activeMeshRenderers, uniqueMeshes;
        public long allActiveTriangles, allActiveVertices, uniqueMeshVertices;
        public long frustumTrianglesUpperBound, frustumVerticesUpperBound;
        public int windowsTriangleBudget, windowsVertexBudget;
        public bool withinWindowsGeometryBudget;
        public string scope = "Active MeshRenderer/SkinnedMeshRenderer instances in the active scene. " +
            "Frustum is an AABB intersection upper bound: includes occluded objects and all enabled LODs. " +
            "Excludes particles, terrain, procedural draws, shadow/depth passes. Not GPU frame statistics or a performance test.";
        public List<MeshRow> meshes = new List<MeshRow>();
    }

    [MenuItem("Talas/Géométrie/Configurer le budget de 1 million")]
    public static void Configure()
    {
        if (!AssetDatabase.IsValidFolder("Assets/TalasSettings"))
            AssetDatabase.CreateFolder("Assets", "TalasSettings");
        var budget = AssetDatabase.LoadAssetAtPath<TalasGeometryBudget>(BudgetPath);
        if (budget == null)
        {
            budget = ScriptableObject.CreateInstance<TalasGeometryBudget>();
            AssetDatabase.CreateAsset(budget, BudgetPath);
        }
        // An explicit menu action resets only the two requested Windows limits.
        Undo.RecordObject(budget, "Budget Talas de 1 million");
        budget.windowsTriangles = 1000000;
        budget.windowsVertices = 1000000;
        EditorUtility.SetDirty(budget);
        AssetDatabase.SaveAssets();
        Selection.activeObject = budget;
    }

    [MenuItem("Talas/Géométrie/Mesurer la scène")]
    public static void AuditFromMenu()
    {
        var report = Capture();
        var directory = Path.Combine(Directory.GetParent(Application.dataPath).FullName, "Reports");
        Directory.CreateDirectory(directory);
        File.WriteAllText(Path.Combine(directory, "GeometryAudit.json"), JsonUtility.ToJson(report, true));
        Debug.Log("Talas : " + report.frustumTrianglesUpperBound + " triangles et " +
            report.frustumVerticesUpperBound + " sommets dans le cadrage (borne supérieure). Rapport : Reports/GeometryAudit.json");
    }

    public static Report Capture()
    {
        var scene = SceneManager.GetActiveScene();
        var camera = Camera.main;
        var planes = camera != null ? GeometryUtility.CalculateFrustumPlanes(camera) : null;
        var budget = AssetDatabase.LoadAssetAtPath<TalasGeometryBudget>(BudgetPath);
        var report = new Report
        {
            utc = DateTime.UtcNow.ToString("o"), scene = scene.path,
            camera = camera != null ? camera.name : "None",
            gpu = SystemInfo.graphicsDeviceName,
            supports32BitIndices = SystemInfo.supports32bitsIndexBuffer,
            windowsTriangleBudget = budget != null ? budget.windowsTriangles : 1000000,
            windowsVertexBudget = budget != null ? budget.windowsVertices : 1000000
        };
        var unique = new HashSet<Mesh>();
        foreach (var root in scene.GetRootGameObjects())
        foreach (var renderer in root.GetComponentsInChildren<Renderer>(false))
        {
            if (!renderer.enabled || !renderer.gameObject.activeInHierarchy) continue;
            Mesh mesh = null;
            if (renderer is SkinnedMeshRenderer skinned) mesh = skinned.sharedMesh;
            else if (renderer is MeshRenderer)
            {
                var filter = renderer.GetComponent<MeshFilter>();
                if (filter != null) mesh = filter.sharedMesh;
            }
            if (mesh == null) continue;
            long triangles = 0;
            for (int sub = 0; sub < mesh.subMeshCount; sub++)
                if (mesh.GetTopology(sub) == MeshTopology.Triangles)
                    triangles += (long)mesh.GetIndexCount(sub) / 3;
            bool visible = camera != null && (camera.cullingMask & (1 << renderer.gameObject.layer)) != 0 &&
                GeometryUtility.TestPlanesAABB(planes, renderer.bounds);
            report.activeMeshRenderers++;
            report.allActiveTriangles += triangles;
            report.allActiveVertices += mesh.vertexCount;
            if (unique.Add(mesh)) report.uniqueMeshVertices += mesh.vertexCount;
            if (visible)
            {
                report.frustumTrianglesUpperBound += triangles;
                report.frustumVerticesUpperBound += mesh.vertexCount;
            }
            report.meshes.Add(new MeshRow
            {
                objectPath = HierarchyPath(renderer.transform), triangles = triangles,
                vertices = mesh.vertexCount, intersectsCameraFrustum = visible,
                materialSlots = renderer.sharedMaterials.Length
            });
        }
        report.uniqueMeshes = unique.Count;
        report.withinWindowsGeometryBudget = camera != null &&
            report.frustumTrianglesUpperBound <= report.windowsTriangleBudget &&
            report.frustumVerticesUpperBound <= report.windowsVertexBudget;
        return report;
    }

    static string HierarchyPath(Transform transform)
    {
        string path = transform.name;
        while (transform.parent != null) { transform = transform.parent; path = transform.name + "/" + path; }
        return path;
    }
}
