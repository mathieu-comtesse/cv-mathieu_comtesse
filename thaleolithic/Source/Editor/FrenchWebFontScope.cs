using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using TMPro;
using UnityEditor;
using UnityEngine;

// Changes only the French Web payload. The rollback survives an interrupted build.
internal sealed class FrenchWebFontScope : IDisposable
{
    const string Parking = "Assets/ThaleolithicWebBuildFontParking";
    const string Fonts = "Assets/Resources/fonts & materials";
    const string Recovery = "Library/ThaleolithicWebFontRestore";
    const string Journal = Recovery + "/assets.json";
    static readonly string[] Excluded = { "NotoSansSC-", "NotoSansTC-", "NotoSansHK-", "NotoSansJP-", "NotoSansKR-" };

    [Serializable] sealed class Parked
    {
        public string path, temporary;
    }

    [Serializable] sealed class Snapshot
    {
        public string[] fallbackAssets;
        public Parked[] parkedAssets;
    }

    public static FrenchWebFontScope Create()
    {
        Restore();
        var scope = new FrenchWebFontScope();
        try { scope.Exclude(); return scope; }
        catch { scope.Dispose(); throw; }
    }

    void Exclude()
    {
        var excludedPaths = AssetDatabase.FindAssets("t:TMP_FontAsset", new[] { Fonts })
            .Select(AssetDatabase.GUIDToAssetPath)
            .Where(path => Excluded.Any(prefix => Path.GetFileName(path).StartsWith(prefix, StringComparison.Ordinal)))
            .Distinct().ToArray();
        if (excludedPaths.Length == 0) throw new InvalidOperationException("Catalogue TMP CJK introuvable.");
        var excluded = new HashSet<TMP_FontAsset>(excludedPaths.Select(AssetDatabase.LoadAssetAtPath<TMP_FontAsset>));
        var changed = new Dictionary<string, TMP_FontAsset>();
        foreach (var guid in AssetDatabase.FindAssets("t:TMP_FontAsset"))
        {
            var path = AssetDatabase.GUIDToAssetPath(guid);
            var font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(path);
            if (font != null && !excluded.Contains(font) && font.fallbackFontAssetTable?.Any(excluded.Contains) == true)
                changed[path] = font;
        }

        var snapshot = new Snapshot {
            fallbackAssets = changed.Keys.ToArray(),
            parkedAssets = excludedPaths.Select(path => new Parked {
                path = path,
                temporary = Parking + "/" + AssetDatabase.AssetPathToGUID(path) + "-" + Path.GetFileName(path)
            }).ToArray()
        };
        Directory.CreateDirectory(Recovery);
        for (int i = 0; i < snapshot.fallbackAssets.Length; i++)
            File.Copy(snapshot.fallbackAssets[i], Backup(i), true);
        File.WriteAllText(Journal + ".tmp", JsonUtility.ToJson(snapshot));
        File.Move(Journal + ".tmp", Journal);

        foreach (var font in changed.Values)
        {
            font.fallbackFontAssetTable = font.fallbackFontAssetTable.Where(item => !excluded.Contains(item)).ToList();
            EditorUtility.SetDirty(font);
        }
        AssetDatabase.SaveAssets();
        if (!AssetDatabase.IsValidFolder(Parking)) AssetDatabase.CreateFolder("Assets", Path.GetFileName(Parking));
        foreach (var asset in snapshot.parkedAssets) Move(asset.path, asset.temporary);
        Debug.Log("THALÉOLITHIC Web FR : " + excludedPaths.Length + " polices TMP CJK sorties du chargement initial.");
    }

    public void Dispose() => Restore();

    static void Restore()
    {
        if (!File.Exists(Journal)) return;
        var snapshot = JsonUtility.FromJson<Snapshot>(File.ReadAllText(Journal));
        foreach (var asset in snapshot.parkedAssets)
            if (File.Exists(asset.temporary)) Move(asset.temporary, asset.path);

        for (int i = 0; i < snapshot.fallbackAssets.Length; i++)
        {
            var path = snapshot.fallbackAssets[i];
            File.Copy(Backup(i), path, true);
            AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceUpdate | ImportAssetOptions.ForceSynchronousImport);
        }
        if (AssetDatabase.IsValidFolder(Parking) && !Directory.EnumerateFileSystemEntries(Parking).Any())
            AssetDatabase.DeleteAsset(Parking);
        File.Delete(Journal);
        for (int i = 0; i < snapshot.fallbackAssets.Length; i++) File.Delete(Backup(i));
        if (!Directory.EnumerateFileSystemEntries(Recovery).Any()) Directory.Delete(Recovery);
    }

    static string Backup(int index) => Recovery + "/" + index + ".asset.bytes";

    static void Move(string source, string destination)
    {
        string error = AssetDatabase.MoveAsset(source, destination);
        if (!string.IsNullOrEmpty(error)) throw new IOException(error);
    }
}