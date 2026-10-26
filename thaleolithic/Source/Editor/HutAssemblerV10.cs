using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using UngaBunga45001;
using UnityEditor.SceneManagement;
public static class HutAssemblerV10
{
 public static List<int[]> Components(Mesh mesh)
 {
  var v=mesh.vertices;var parent=Enumerable.Range(0,v.Length).ToArray();int Find(int x){while(parent[x]!=x){parent[x]=parent[parent[x]];x=parent[x];}return x;}void Join(int a,int b){a=Find(a);b=Find(b);if(a!=b)parent[b]=a;}
  var coincident=new Dictionary<Vector3Int,int>();for(int i=0;i<v.Length;i++){var k=Vector3Int.RoundToInt(v[i]*10000);if(coincident.TryGetValue(k,out int j))Join(i,j);else coincident[k]=i;}
  var t=mesh.triangles;for(int i=0;i<t.Length;i+=3){Join(t[i],t[i+1]);Join(t[i],t[i+2]);}var groups=new Dictionary<int,List<int>>();for(int i=0;i<t.Length;i+=3){int key=Find(t[i]);if(!groups.TryGetValue(key,out var group)){group=new List<int>();groups[key]=group;}group.Add(t[i]);group.Add(t[i+1]);group.Add(t[i+2]);}return groups.Values.Select(g=>g.ToArray()).ToList();
 }
 public static void Analyze()
 {
  var lines=new List<string>();foreach(var mesh in UnityEngine.Object.FindObjectsByType<MeshFilter>(FindObjectsInactive.Include,FindObjectsSortMode.None).Where(f=>IsNativeHut(f.sharedMesh)).Select(f=>f.sharedMesh).Distinct())
  {var groups=Components(mesh);lines.Add(mesh.name+" components="+groups.Count+" triangles="+mesh.triangles.Length/3);var v=mesh.vertices;foreach(var g in groups.OrderByDescending(g=>g.Length).Take(30)){var b=new Bounds(v[g[0]],Vector3.zero);foreach(int i in g)b.Encapsulate(v[i]);lines.Add("  triangles="+g.Length/3+" "+b);}}
  File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision10/hut-components.txt",lines);
 }
 static bool IsNativeHut(Mesh mesh)=>mesh!=null&&new[]{"hut-mammoth-medium-construct-a-frame-primeval","hut-mammoth-medium-construct-a-frame-destroyed-primeval","hut-mammoth-medium-construct-b-hide-primeval","hut-mammoth-medium-construct-b-hide-destroyed-primeval","hut-mammoth-medium-primeval","hut-mammoth-medium-destroyed-primeval"}.Contains(mesh.name);
 public static void CleanGeneratedAssemblies()
 {
  var all=UnityEngine.Object.FindObjectsByType<HutCollapse>(FindObjectsInactive.Include,FindObjectsSortMode.None);
  var roots=all.Where(h=>IsNativeHut(h.intactRenderer?.GetComponent<MeshFilter>()?.sharedMesh)).GroupBy(h=>h.gameObject).Select(g=>g.First()).ToArray();
  File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision10/hut-root-inventory-"+(RenderBackend.HDRP?"PC":"Web")+".txt",roots.Select(h=>h.name+" | "+h.assemblyId+" | "+AssetDatabase.GetAssetPath(h.intactRenderer?.GetComponent<MeshFilter>()?.sharedMesh)));
  if(all.Length>0&&roots.Length!=11)throw new InvalidOperationException("Expected eleven original hut assemblies, found "+roots.Length+"; cleanup refused");
  int nested=all.Length-roots.Length;
  foreach(var root in roots)
  {
   var obstacle=root.GetComponent<UnityEngine.AI.NavMeshObstacle>();if(obstacle!=null)obstacle.enabled=false;root.intactRenderer.enabled=true;foreach(var col in root.intactColliders)if(col!=null)col.enabled=true;
   foreach(Transform child in root.transform.Cast<Transform>().ToArray())
   {var mesh=child.GetComponent<MeshFilter>()?.sharedMesh;if(child.name.StartsWith("Renfort posé")||child.name=="Poteau porteur"||child.name=="Support de toiture"||child.name=="Traverse et paroi"||child.name=="Lien et assemblage"||mesh!=null&&AssetDatabase.GetAssetPath(mesh).Contains("/Generated/StructureV10/"))UnityEngine.Object.DestroyImmediate(child.gameObject);}
   foreach(var component in root.GetComponents<HutCollapse>())UnityEngine.Object.DestroyImmediate(component);
  }
  File.WriteAllText("E:/UNGA-BUNGA-45001/Revision10/hut-clean-"+(RenderBackend.HDRP?"PC":"Web")+".txt","Original assemblies preserved="+roots.Length+"; nested generated assemblies removed="+nested);
 }
 public static void Build()
 {
  CleanGeneratedAssemblies();const string folder="Assets/UngaBunga45001/Generated/StructureV10";Directory.CreateDirectory(folder);AssetDatabase.Refresh();var c=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();var stage=c.GetComponent<CinematicStage>();var habitation=c.bindings.Find("habitations");
  var dust=AssetDatabase.LoadAssetAtPath<Material>(folder+"/Dust.mat");if(dust==null){dust=new Material(Shader.Find(RenderBackend.HDRP?"UngaBunga/NativeParticleV3":"Universal Render Pipeline/Particles/Unlit"));dust.name="Poussière de contact";dust.SetFloat("_Surface",1);if(dust.HasProperty("_SurfaceType"))dust.SetFloat("_SurfaceType",1);dust.SetFloat("_SrcBlend",5);dust.SetFloat("_DstBlend",10);dust.SetFloat("_ZWrite",0);dust.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");dust.renderQueue=3000;
   #if !UNGA_WEB_RENDERER
   UnityEngine.Rendering.HighDefinition.HDMaterial.ValidateMaterial(dust);
   #endif
   AssetDatabase.CreateAsset(dust,folder+"/Dust.mat");}
  var friction=AssetDatabase.LoadAssetAtPath<PhysicsMaterial>(folder+"/DryWood.physicMaterial");if(friction==null){friction=new PhysicsMaterial("Bois sec · débris"){dynamicFriction=.78f,staticFriction=.9f,bounciness=0,frictionCombine=PhysicsMaterialCombine.Maximum,bounceCombine=PhysicsMaterialCombine.Minimum};AssetDatabase.CreateAsset(friction,folder+"/DryWood.physicMaterial");}
  var meshes=new Dictionary<Mesh,(Mesh mesh,Vector3 center,int kind,float delay,float mass)[]>();int built=0;
  foreach(var filter in UnityEngine.Object.FindObjectsByType<MeshFilter>(FindObjectsInactive.Include,FindObjectsSortMode.None).Where(f=>IsNativeHut(f.sharedMesh)&&(f.transform.IsChildOf(stage.fallingFrame)||f.transform.IsChildOf(habitation))).ToArray())
  {
   if(filter.GetComponent<HutCollapse>()!=null)continue;var source=filter.sharedMesh;var renderer=filter.GetComponent<MeshRenderer>();if(renderer==null)continue;
   if(!meshes.TryGetValue(source,out var parts))
   {
    var groups=Components(source);var vertices=source.vertices;var normals=source.normals;var uv=source.uv;var assembled=new List<(Mesh,Vector3,int,float,float)>();
    for(int index=0;index<groups.Count;index++)
    {
     var group=groups[index];var unique=group.Distinct().ToArray();var bounds=new Bounds(vertices[unique[0]],Vector3.zero);foreach(int i in unique)bounds.Encapsulate(vertices[i]);var map=unique.Select((value,i)=>(value,i)).ToDictionary(x=>x.value,x=>x.i);string path=folder+"/"+source.name+"-"+index+".asset";var piece=AssetDatabase.LoadAssetAtPath<Mesh>(path);
     if(piece==null){piece=new Mesh{name=source.name+" · pièce "+index};piece.vertices=unique.Select(i=>vertices[i]-bounds.center).ToArray();piece.normals=unique.Select(i=>normals[i]).ToArray();piece.uv=unique.Select(i=>uv[i]).ToArray();piece.triangles=group.Select(i=>map[i]).ToArray();piece.RecalculateBounds();AssetDatabase.CreateAsset(piece,path);}
     int kind=bounds.center.y>1.75f?1:bounds.size.y>1.6f?0:bounds.size.magnitude<.45f?3:2;float delay=kind==0?(bounds.center.x>0?1.15f:4.2f)+index%4*.12f:kind==1?2.0f+index%6*.14f:3.4f+index%5*.15f;float mass=kind==3?.3f:Mathf.Clamp(bounds.size.x*bounds.size.y*bounds.size.z*45,kind==1?1.5f:3,18);assembled.Add((piece,bounds.center,kind,delay,mass));
    }
    parts=assembled.ToArray();meshes[source]=parts;
   }
   var assembly=filter.gameObject.AddComponent<HutCollapse>();assembly.intactRenderer=renderer;assembly.site=filter.transform.IsChildOf(stage.fallingFrame)?"charpente":"habitations";assembly.assemblyId=assembly.site+":"+filter.transform.position.x.ToString("F2",System.Globalization.CultureInfo.InvariantCulture)+":"+filter.transform.position.z.ToString("F2",System.Globalization.CultureInfo.InvariantCulture)+":"+source.name;assembly.dustMaterial=dust;
   var model=filter.transform.parent?.parent??filter.transform;assembly.intactColliders=model.GetComponentsInChildren<Collider>(true).Where(col=>!col.isTrigger).ToArray();var pieces=new List<StructuralPiece>();
   foreach(var part in parts)
   {
    var go=new GameObject(part.kind==0?"Poteau porteur":part.kind==1?"Support de toiture":part.kind==3?"Lien et assemblage":"Traverse et paroi");go.layer=filter.gameObject.layer;go.transform.SetParent(filter.transform,false);go.transform.localPosition=part.center;go.AddComponent<MeshFilter>().sharedMesh=part.mesh;var visible=go.AddComponent<MeshRenderer>();visible.sharedMaterials=renderer.sharedMaterials;visible.shadowCastingMode=renderer.shadowCastingMode;visible.receiveShadows=true;var col=go.AddComponent<MeshCollider>();col.sharedMesh=part.mesh;col.convex=true;col.sharedMaterial=friction;var rb=go.AddComponent<Rigidbody>();rb.mass=part.mass;rb.isKinematic=true;rb.useGravity=false;rb.linearDamping=.22f;rb.angularDamping=.8f;rb.maxAngularVelocity=2.3f;rb.maxDepenetrationVelocity=1;rb.interpolation=RigidbodyInterpolation.Interpolate;rb.collisionDetectionMode=CollisionDetectionMode.Discrete;pieces.Add(new StructuralPiece{root=go.transform,restPosition=part.center,restRotation=Quaternion.identity,kind=part.kind,releaseAt=part.delay,mass=part.mass});go.SetActive(false);
   }
   assembly.pieces=pieces.ToArray();EditorUtility.SetDirty(assembly);built++;
  }
  EditorSceneManager.MarkSceneDirty(UnityEngine.SceneManagement.SceneManager.GetActiveScene());EditorSceneManager.SaveOpenScenes();AssetDatabase.SaveAssets();File.WriteAllText("E:/UNGA-BUNGA-45001/Revision10/hut-build-"+(RenderBackend.HDRP?"PC":"Web")+".txt","Assemblies="+built+"; distinct native meshes="+meshes.Count+"; split mesh assets="+meshes.Values.Sum(p=>p.Length));
 }
}
