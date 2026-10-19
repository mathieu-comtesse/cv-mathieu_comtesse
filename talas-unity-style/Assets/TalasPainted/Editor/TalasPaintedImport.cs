using System.IO;
using UnityEditor;
using UnityEngine;

/// <summary>Etape 1 : le kit forgé sous Blender devient des préfabriqués Unity (un par pièce), tous sur UN matériau à atlas peint.</summary>
public static class TalasPaintedImport
{
 public const string Root="Assets/TalasPainted";
 const string Fbx=Root+"/TalasPaintedKit.fbx",Atlas=Root+"/TalasPainted_Atlas.png",Emission=Root+"/TalasPainted_Emission.png",MatPath=Root+"/TalasPainted.mat";
 static readonly string[] Solid={"StoneBlock","Pillar","Barrel","Crate","Boulder","Brazier","LanternCage"};

 [MenuItem("Talas/Peint/1 Importer le kit")]
 public static void Run()
 {
  SetupTexture(Atlas,true);SetupTexture(Emission,false);
  var imp=(ModelImporter)AssetImporter.GetAtPath(Fbx);if(imp==null)throw new FileNotFoundException(Fbx);
  imp.importAnimation=false;imp.materialImportMode=ModelImporterMaterialImportMode.None;imp.useFileScale=true;imp.generateSecondaryUV=true;imp.SaveAndReimport();
  var mat=BuildMaterial();var source=AssetDatabase.LoadAssetAtPath<GameObject>(Fbx);
  Directory.CreateDirectory(Root+"/Prefabs");int n=0;
  foreach(Transform piece in source.transform)
  {
   var filter=piece.GetComponent<MeshFilter>();if(filter==null||filter.sharedMesh==null)continue;var mesh=filter.sharedMesh;
   var go=new GameObject(piece.name);go.AddComponent<MeshFilter>().sharedMesh=mesh;var r=go.AddComponent<MeshRenderer>();r.sharedMaterial=mat;
   r.shadowCastingMode=piece.name=="GrassClump"||piece.name=="MossPatch"?UnityEngine.Rendering.ShadowCastingMode.Off:UnityEngine.Rendering.ShadowCastingMode.On;
   if(System.Array.IndexOf(Solid,piece.name)>=0)go.AddComponent<BoxCollider>();
   AddLight(go,piece.name);
   PrefabUtility.SaveAsPrefabAsset(go,Root+"/Prefabs/"+piece.name+".prefab");Object.DestroyImmediate(go);n++;
  }
  AssetDatabase.SaveAssets();Debug.Log("Talas peint : "+n+" préfabriqués dans "+Root+"/Prefabs");
 }

 static void SetupTexture(string path,bool alpha)
 {
  var t=(TextureImporter)AssetImporter.GetAtPath(path);if(t==null)throw new FileNotFoundException(path);
  t.sRGBTexture=true;t.alphaIsTransparency=alpha;t.mipmapEnabled=true;t.wrapMode=TextureWrapMode.Clamp;t.filterMode=FilterMode.Bilinear;t.maxTextureSize=1024;t.textureCompression=TextureImporterCompression.CompressedHQ;t.SaveAndReimport();
 }

 public static Material BuildMaterial()
 {
  var m=AssetDatabase.LoadAssetAtPath<Material>(MatPath);if(m==null){m=new Material(Shader.Find("Universal Render Pipeline/Lit"));AssetDatabase.CreateAsset(m,MatPath);}
  m.SetTexture("_BaseMap",AssetDatabase.LoadAssetAtPath<Texture2D>(Atlas));m.SetColor("_BaseColor",Color.white);m.SetFloat("_Smoothness",.12f);m.SetFloat("_Metallic",0);
  m.SetFloat("_Cull",0);m.SetFloat("_AlphaClip",1);m.SetFloat("_Cutoff",.5f);m.EnableKeyword("_ALPHATEST_ON");m.renderQueue=(int)UnityEngine.Rendering.RenderQueue.AlphaTest;
  m.EnableKeyword("_EMISSION");m.SetTexture("_EmissionMap",AssetDatabase.LoadAssetAtPath<Texture2D>(Emission));m.SetColor("_EmissionColor",Color.white*1.8f);
  m.globalIlluminationFlags=MaterialGlobalIlluminationFlags.BakedEmissive;EditorUtility.SetDirty(m);return m;
 }

 static void AddLight(GameObject go,string piece)
 {
  Color c;float y,i;
  if(piece=="Brazier"){c=new Color(1f,.6f,.25f);y=1.7f;i=3.2f;}else if(piece=="TorchPost"){c=new Color(1f,.62f,.28f);y=2.9f;i=2.2f;}else if(piece=="LanternCage"){c=new Color(.3f,1f,.85f);y=1.4f;i=2.4f;}else return;
  var l=new GameObject("Feu").AddComponent<Light>();l.transform.SetParent(go.transform,false);l.transform.localPosition=new Vector3(0,y,0);l.type=LightType.Point;l.color=c;l.intensity=i;l.range=9;l.shadows=LightShadows.None;
 }
}
