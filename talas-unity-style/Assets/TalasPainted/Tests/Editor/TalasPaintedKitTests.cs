using NUnit.Framework;
using UnityEditor;
using UnityEngine;

/// <summary>Garde-fous du kit peint : à lancer après les menus Talas/Peint/1 et 2 (Window > General > Test Runner > EditMode).</summary>
public class TalasPaintedKitTests
{
 [System.Serializable] class Manifest{public string[] pieces;public string[] cells;}
 static Manifest Load()=>JsonUtility.FromJson<Manifest>(AssetDatabase.LoadAssetAtPath<TextAsset>(TalasPaintedImport.Root+"/TalasPaintedKit.json").text);

 [Test] public void AtlasIs1024AndHas16Cells(){var t=AssetDatabase.LoadAssetAtPath<Texture2D>(TalasPaintedImport.Root+"/TalasPainted_Atlas.png");Assert.NotNull(t);Assert.AreEqual(1024,t.width);Assert.AreEqual(1024,t.height);Assert.AreEqual(16,Load().cells.Length);}

 [Test] public void EveryPieceHasAPrefabOnTheSharedMaterial()
 {
  var mat=AssetDatabase.LoadAssetAtPath<Material>(TalasPaintedImport.Root+"/TalasPainted.mat");Assert.NotNull(mat,"Matériau absent : menu Talas/Peint/1");Assert.NotNull(mat.GetTexture("_BaseMap"));Assert.NotNull(mat.GetTexture("_EmissionMap"));
  foreach(var name in Load().pieces)
  {
   var p=AssetDatabase.LoadAssetAtPath<GameObject>(TalasPaintedImport.Root+"/Prefabs/"+name+".prefab");Assert.NotNull(p,name);
   var r=p.GetComponent<MeshRenderer>();Assert.NotNull(r,name);Assert.AreSame(mat,r.sharedMaterial,name+" doit partager l'atlas");Assert.Greater(p.GetComponent<MeshFilter>().sharedMesh.triangles.Length,0,name);
  }
 }

 [Test] public void LightPiecesCarryAFire()
 {
  foreach(var name in new[]{"Brazier","TorchPost","LanternCage"}){var p=AssetDatabase.LoadAssetAtPath<GameObject>(TalasPaintedImport.Root+"/Prefabs/"+name+".prefab");Assert.NotNull(p.GetComponentInChildren<Light>(),name+" sans lumière");}
 }

 [Test] public void LookProfileHasBloomAndVignette()
 {
  var p=AssetDatabase.LoadAssetAtPath<UnityEngine.Rendering.VolumeProfile>(TalasPaintedImport.Root+"/TalasPaintedLook.asset");Assert.NotNull(p,"Menu Talas/Peint/2");
  Assert.IsTrue(p.TryGet(out UnityEngine.Rendering.Universal.Bloom _));Assert.IsTrue(p.TryGet(out UnityEngine.Rendering.Universal.Vignette _));
 }
}
