using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace UngaBunga45001.Editor
{
    // Explicit shader reconstruction for editable use; never presented as the
    // recovered original ShaderGraph/HLSL or as visually verified parity.
    public static class RecoveredMaterialAdapter
    {
        [Serializable] private class Change { public string material, sourceShader, targetShader; public bool approximate; public string albedo; }
        [Serializable] private class Receipt { public string status; public bool originalShadersRestored, visuallyVerified; public Change[] changes; public string[] skipped; }
        private sealed class Tex { public Texture value; public Vector2 scale, offset; }
        public static void Apply()
        {
            const string root = "E:/UNGA-BUNGA-45001";
            if (!string.Equals(Path.GetFullPath(Path.Combine(Application.dataPath, "..")).Replace('\\', '/'),root+"/Unity",StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Unexpected project");
            var ui = UnityEditor.PackageManager.PackageInfo.GetAllRegisteredPackages().FirstOrDefault(p=>p.name=="com.unity.ugui");
            if(ui==null)throw new InvalidOperationException("Genuine uGUI package required");
            string essentials = Path.Combine(ui.resolvedPath,"Package Resources/TMP Essential Resources.unitypackage");
            if (!AssetDatabase.IsValidFolder("Assets/TextMesh Pro/Resources")) { AssetDatabase.ImportPackage(essentials,false); AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport); }
            var genuine=new Dictionary<string,Shader>();
            foreach(string guid in AssetDatabase.FindAssets("t:Shader"))
            {
                string path=AssetDatabase.GUIDToAssetPath(guid);
                if(!path.StartsWith("Packages/",StringComparison.Ordinal) && !path.StartsWith("Assets/TextMesh Pro/",StringComparison.Ordinal))continue;
                var shader=AssetDatabase.LoadAssetAtPath<Shader>(path);if(shader!=null)genuine[shader.name]=shader;
            }
            if(!genuine.TryGetValue("HDRP/Lit",out Shader lit))throw new InvalidOperationException("Genuine HDRP/Lit not imported");
            var changes=new List<Change>();var skipped=new List<string>();
            foreach(string guid in AssetDatabase.FindAssets("t:Material",new[]{"Assets"}))
            {
                string path=AssetDatabase.GUIDToAssetPath(guid);
                if(path.StartsWith("Assets/UngaBunga",StringComparison.Ordinal)||path.StartsWith("Assets/TextMesh Pro/",StringComparison.Ordinal)||Path.GetExtension(path)==".fbx")continue;
                var material=AssetDatabase.LoadAssetAtPath<Material>(path);if(material==null||material.shader==null){skipped.Add(path+": missing material/shader");continue;}
                string source=material.shader.name;
                if(!AssetDatabase.GetAssetPath(material.shader).StartsWith("Assets/Shader/",StringComparison.Ordinal)){skipped.Add(path+": shader already functional or outside recovered shader directory");continue;}
                bool exact=genuine.TryGetValue(source,out Shader target);
                if(!exact && (source.IndexOf("TextMesh",StringComparison.OrdinalIgnoreCase)>=0||source.StartsWith("UI/",StringComparison.Ordinal))){skipped.Add(path+": unresolved UI shader "+source);continue;}
                if(!exact)target=lit;
                var serialized=new SerializedObject(material);var saved=serialized.FindProperty("m_SavedProperties");
                var textures=new Dictionary<string,Tex>();var colors=new Dictionary<string,Color>();var floats=new Dictionary<string,float>();
                var texs=saved.FindPropertyRelative("m_TexEnvs");
                for(int i=0;i<texs.arraySize;i++){var pair=texs.GetArrayElementAtIndex(i);var value=pair.FindPropertyRelative("second");textures[pair.FindPropertyRelative("first").stringValue]=new Tex{value=value.FindPropertyRelative("m_Texture").objectReferenceValue as Texture,scale=value.FindPropertyRelative("m_Scale").vector2Value,offset=value.FindPropertyRelative("m_Offset").vector2Value};}
                var cs=saved.FindPropertyRelative("m_Colors");for(int i=0;i<cs.arraySize;i++){var p=cs.GetArrayElementAtIndex(i);colors[p.FindPropertyRelative("first").stringValue]=p.FindPropertyRelative("second").colorValue;}
                var fs=saved.FindPropertyRelative("m_Floats");for(int i=0;i<fs.arraySize;i++){var p=fs.GetArrayElementAtIndex(i);floats[p.FindPropertyRelative("first").stringValue]=p.FindPropertyRelative("second").floatValue;}
                string backup=root+"/Analysis/MaterialBackups/"+path;
                if(!File.Exists(backup)){Directory.CreateDirectory(Path.GetDirectoryName(backup));File.Copy(path,backup);}
                material.shader=target;
                string albedo=null;
                if(!exact)
                {
                    albedo=new[]{"_Albedo","_BaseColorMap","_BaseMap","_MainTex"}.FirstOrDefault(n=>textures.TryGetValue(n,out Tex t)&&t.value!=null);
                    if(albedo!=null){var t=textures[albedo];material.SetTexture("_BaseColorMap",t.value);material.SetTextureScale("_BaseColorMap",t.scale);material.SetTextureOffset("_BaseColorMap",t.offset);}
                    Color color=colors.TryGetValue("_Color",out Color c)?c:colors.TryGetValue("_BaseColor",out c)?c:Color.white;color.a=1;material.SetColor("_BaseColor",color);
                    material.SetFloat("_Metallic",floats.TryGetValue("_Metallic",out float metal)?metal:0);material.SetFloat("_Smoothness",floats.TryGetValue("_Smoothness",out float smooth)?smooth:.18f);
                    string normal=new[]{"_NormalMap","_Normal","_BumpMap"}.FirstOrDefault(n=>textures.TryGetValue(n,out Tex t)&&t.value!=null);
                    if(normal!=null)material.SetTexture("_NormalMap",textures[normal].value);
                    if(textures.TryGetValue("_MaskMap",out Tex mask)&&mask.value!=null)material.SetTexture("_MaskMap",mask.value);
                    if(source.IndexOf("leaves",StringComparison.OrdinalIgnoreCase)>=0||material.name.IndexOf("foliage",StringComparison.OrdinalIgnoreCase)>=0||material.name.IndexOf("leaves",StringComparison.OrdinalIgnoreCase)>=0)material.SetFloat("_DoubleSidedEnable",1);
                    material.SetFloat("_AlphaCutoffEnable",0);
                }
                EditorUtility.SetDirty(material);
                changes.Add(new Change{material=path,sourceShader=source,targetShader=target.name,approximate=!exact,albedo=albedo});
            }
            AssetDatabase.SaveAssets();
            File.WriteAllText(root+"/Analysis/unity-material-adaptation.json",JsonUtility.ToJson(new Receipt{status="material-shaders-adapted-awaiting-render",originalShadersRestored=false,visuallyVerified=false,changes=changes.ToArray(),skipped=skipped.ToArray()},true));
            Debug.Log("UNGA_BUNGA_MATERIAL_ADAPTATION_COMPLETE "+changes.Count);
        }
    }
}
