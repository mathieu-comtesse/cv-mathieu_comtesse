using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEngine;

namespace UngaBunga45001.Editor
{
    public static class RecoveredScriptRemapper
    {
        [Serializable] private class Index { public Entry[] entries; }
        [Serializable] private class Entry { public string oldGuid, assembly, fullName, className; public long oldFileID; }
        [Serializable] private class Mapping { public string fullName, assembly, oldGuid, newGuid, packageScript; public long oldFileID, newFileID; public int replacements; }
        [Serializable] private class ChangedFile { public string path, backup; public int references; }
        [Serializable] private class Receipt { public string status; public int indexedTypes, packageScripts, resolvedTypes, changedReferences; public Mapping[] mappings; public Entry[] unresolvedTypes; public ChangedFile[] changedFiles; }
        public static void Remap()
        {
            string root = "E:/UNGA-BUNGA-45001";
            string project = Path.GetFullPath(Path.Combine(Application.dataPath, "..")).Replace('\\', '/');
            if (!string.Equals(project, root + "/Unity", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Unexpected project; refusing reference changes.");
            var index = JsonUtility.FromJson<Index>(File.ReadAllText(root + "/Analysis/monoscript-reference-index.json"));
            var actual = new Dictionary<string, Mapping>();
            var ambiguous = new HashSet<string>();
            var packageGuids = AssetDatabase.FindAssets("t:MonoScript", new[] { "Packages" });
            foreach (string guid in packageGuids)
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                var script = AssetDatabase.LoadAssetAtPath<MonoScript>(path);
                if (script == null) continue;
                Type type = script.GetClass();
                if (type == null || !AssetDatabase.TryGetGUIDAndLocalFileIdentifier(script, out string actualGuid, out long fid)) continue;
                string key = type.Assembly.GetName().Name + ":" + type.FullName;
                if (actual.ContainsKey(key)) { ambiguous.Add(key); continue; }
                actual.Add(key, new Mapping { fullName = type.FullName, assembly = type.Assembly.GetName().Name, newGuid = actualGuid, newFileID = fid, packageScript = path });
            }
            var mappings = new Dictionary<string, Mapping>();
            var unresolved = new List<Entry>();
            foreach (var entry in index.entries)
            {
                string key = entry.assembly + ":" + entry.fullName;
                if (ambiguous.Contains(key) || !actual.TryGetValue(key, out Mapping candidate)) { unresolved.Add(entry); continue; }
                var mapping = new Mapping { fullName = entry.fullName, assembly = entry.assembly, oldGuid = entry.oldGuid, oldFileID = entry.oldFileID, newGuid = candidate.newGuid, newFileID = candidate.newFileID, packageScript = candidate.packageScript };
                mappings.Add(entry.oldGuid + ":" + entry.oldFileID, mapping);
            }
            // This critical reference was also independently verified against the
            // native TMP_FontAsset fileID when creating the source index.
            if (!mappings.Values.Any(m => m.fullName == "TMPro.TMP_FontAsset")) throw new InvalidOperationException("Exact TMP_FontAsset mapping missing; refusing partial import repair.");
            var files = new List<ChangedFile>();
            var pattern = new Regex(@"(?m)^(\s*m_Script:\s*\{fileID:\s*)(-?\d+)(,\s*guid:\s*)([a-f0-9]{32})(,\s*type:\s*3\})");
            AssetDatabase.StartAssetEditing();
            try
            {
                foreach (string path in Directory.EnumerateFiles(Application.dataPath, "*", SearchOption.AllDirectories))
                {
                    string extension = Path.GetExtension(path);
                    if (extension != ".asset" && extension != ".prefab" && extension != ".unity") continue;
                    string text = File.ReadAllText(path);
                    if (!text.StartsWith("%YAML", StringComparison.Ordinal)) continue;
                    int count = 0;
                    string next = pattern.Replace(text, match =>
                    {
                        string key = match.Groups[4].Value + ":" + match.Groups[2].Value;
                        if (!mappings.TryGetValue(key, out Mapping mapping)) return match.Value;
                        count++; mapping.replacements++;
                        return match.Groups[1].Value + mapping.newFileID + match.Groups[3].Value + mapping.newGuid + match.Groups[5].Value;
                    });
                    if (count == 0) continue;
                    string relative = "Assets/" + path.Substring(Application.dataPath.Length + 1).Replace('\\', '/');
                    string backup = root + "/Analysis/ScriptReferenceBackups/" + relative;
                    if (File.Exists(backup)) throw new IOException("Existing remap backup; manual review required: " + backup);
                    Directory.CreateDirectory(Path.GetDirectoryName(backup)); File.Copy(path, backup);
                    File.WriteAllText(path, next);
                    files.Add(new ChangedFile { path = relative, backup = backup, references = count });
                }
            }
            finally { AssetDatabase.StopAssetEditing(); }
            var receipt = new Receipt { status = "exact-package-types-remapped", indexedTypes = index.entries.Length, packageScripts = packageGuids.Length, resolvedTypes = mappings.Count, changedReferences = files.Sum(f => f.references), mappings = mappings.Values.ToArray(), unresolvedTypes = unresolved.ToArray(), changedFiles = files.ToArray() };
            File.WriteAllText(root + "/Analysis/unity-script-remap.json", JsonUtility.ToJson(receipt, true));
            AssetDatabase.Refresh();
            Debug.Log("UNGA_BUNGA_EXACT_SCRIPT_REMAP_COMPLETE " + receipt.changedReferences);
        }
    }
}
