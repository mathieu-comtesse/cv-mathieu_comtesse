using System.Collections.Generic;
using UnityEngine;

public static class TalasWebRendering
{
 static Shader webShader;
 static readonly Dictionary<Material,Material> copies=new Dictionary<Material,Material>();
 public static Material MaterialFor(Material source)
 {
  if(Application.platform!=RuntimePlatform.WebGLPlayer||source==null||source.shader.name!="Universal Render Pipeline/Lit")return source;
  if(copies.TryGetValue(source,out var copy))return copy;
  if(webShader==null)webShader=Resources.Load<Shader>("TalasWebLit");
  copy=new Material(source){shader=webShader,name=source.name+" Web"};copy.shaderKeywords=System.Array.Empty<string>();copies.Add(source,copy);return copy;
 }
 public static void Adapt(GameObject root)
 {
  if(Application.platform!=RuntimePlatform.WebGLPlayer)return;
  foreach(var renderer in root.GetComponentsInChildren<Renderer>(true))
  {
   var materials=renderer.sharedMaterials;
   for(int i=0;i<materials.Length;i++)materials[i]=MaterialFor(materials[i]);
   renderer.sharedMaterials=materials;
  }
 }
 [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
 static void SceneLoaded(){if(Application.platform==RuntimePlatform.WebGLPlayer)foreach(var root in UnityEngine.SceneManagement.SceneManager.GetActiveScene().GetRootGameObjects())Adapt(root);}
}
