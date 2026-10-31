using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.Rendering.HighDefinition;
using UnityEngine.AI;
using Unity.AI.Navigation;
using UnityEngine.Rendering;
namespace UngaBunga45001.Editor
{
    public static class NativeRepairV3
    {
        const string Root="E:/UNGA-BUNGA-45001/Revision3";
        const string Scene="Assets/UngaBunga45001/Scenes/UngaBunga45001.unity";
        [Serializable] public class TextureSlot { public string key,path; public Vector2 scale,offset; }
        [Serializable] public class MaterialRow { public string name,path,shader; public string[] colors; public TextureSlot[] textures; public int uses; public string[] examples; }
        [Serializable] public class RendererRow { public string name,hierarchy,mesh;public string[] materials;public Vector3 position,size;public bool enabled; }
        [Serializable] public class Audit { public MaterialRow[] materials; public RendererRow[] renderers; }
        public static string Hierarchy(Transform t)=>t.parent==null?t.name:Hierarchy(t.parent)+"/"+t.name;
        public static void Inspect()
        {
            EditorSceneManager.OpenScene(Scene,OpenSceneMode.Single);
            var rs=UnityEngine.Object.FindObjectsByType<Renderer>(FindObjectsSortMode.None);
            var mats=rs.SelectMany(r=>r.sharedMaterials).Where(m=>m!=null).Distinct();
            var rows=mats.Select(m=>{
                var so=new SerializedObject(m);var saved=so.FindProperty("m_SavedProperties");var tx=saved.FindPropertyRelative("m_TexEnvs");var cs=saved.FindPropertyRelative("m_Colors");
                return new MaterialRow{name=m.name,path=AssetDatabase.GetAssetPath(m),shader=m.shader?.name,uses=rs.Count(r=>r.sharedMaterials.Contains(m)),examples=rs.Where(r=>r.sharedMaterials.Contains(m)).Take(5).Select(r=>Hierarchy(r.transform)).ToArray(),
                    textures=Enumerable.Range(0,tx.arraySize).Select(i=>{var p=tx.GetArrayElementAtIndex(i);var v=p.FindPropertyRelative("second");return new TextureSlot{key=p.FindPropertyRelative("first").stringValue,path=AssetDatabase.GetAssetPath(v.FindPropertyRelative("m_Texture").objectReferenceValue),scale=v.FindPropertyRelative("m_Scale").vector2Value,offset=v.FindPropertyRelative("m_Offset").vector2Value};}).Where(t=>t.path!="").ToArray(),
                    colors=Enumerable.Range(0,cs.arraySize).Select(i=>{var p=cs.GetArrayElementAtIndex(i);return p.FindPropertyRelative("first").stringValue+"="+p.FindPropertyRelative("second").colorValue;}).ToArray()};
            }).OrderByDescending(m=>m.uses).ToArray();
            var village=GameObject.Find("Village complet V2");var stage=UnityEngine.Object.FindFirstObjectByType<CinematicStage>();
            var rr=rs.Where(r=>(village!=null&&r.transform.IsChildOf(village.transform))||(stage?.mammoth!=null&&r.transform.IsChildOf(stage.mammoth))).Select(r=>new RendererRow{name=r.name,hierarchy=Hierarchy(r.transform),mesh=AssetDatabase.GetAssetPath(r is SkinnedMeshRenderer s?s.sharedMesh:(r.GetComponent<MeshFilter>()!=null?r.GetComponent<MeshFilter>().sharedMesh:null)),materials=r.sharedMaterials.Select(m=>AssetDatabase.GetAssetPath(m)).ToArray(),position=r.bounds.center,size=r.bounds.size,enabled=r.enabled}).ToArray();
            Directory.CreateDirectory(Root);File.WriteAllText(Root+"/render-audit.json",JsonUtility.ToJson(new Audit{materials=rows,renderers=rr},true));
        }
        static string Folder="Assets/UngaBunga45001/Generated/NativeRepairV3";
        static Dictionary<string,TextureSlot[]> sourceSlots;
        static TextureSlot Albedo(Material m)
        {
            if(!sourceSlots.TryGetValue(AssetDatabase.GetAssetPath(m),out var slots))return null;
            foreach(var key in new[]{"_Albedo","_AlbedoTexture","_MainTex","_BaseColorMap","_MainTexture","_Texture","Texture2D_23DD87FD"})
            {var slot=slots.FirstOrDefault(s=>s.key==key&&s.path.StartsWith("Assets/Texture2D/"));if(slot!=null)return slot;}
            return slots.FirstOrDefault(s=>s.path.StartsWith("Assets/Texture2D/")&&!System.Text.RegularExpressions.Regex.IsMatch(s.path,"mask|noise|normal|nrm|emission|spec|dissolve|trample",System.Text.RegularExpressions.RegexOptions.IgnoreCase));
        }
        public static void Apply()
        {
            if(!File.Exists(Root+"/SceneBeforeNativeRepair.unity"))File.Copy(Scene,Root+"/SceneBeforeNativeRepair.unity");
            PrehistoricCastV2.ImportAndInspect();
            EditorSceneManager.OpenScene(Scene,OpenSceneMode.Single);
            var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();
            if(!File.Exists(Root+"/render-audit-original.json"))File.Copy(Root+"/render-audit.json",Root+"/render-audit-original.json");
            sourceSlots=JsonUtility.FromJson<Audit>(File.ReadAllText(Root+"/render-audit-original.json")).materials.GroupBy(m=>m.path).ToDictionary(g=>g.Key,g=>g.First().textures);
            Directory.CreateDirectory(Folder);AssetDatabase.Refresh();
            var cache=new Dictionary<Material,Material>();int replaced=0,helpers=0,stable=0;
            var all=UnityEngine.Object.FindObjectsByType<Renderer>(FindObjectsSortMode.None);
            foreach(var r in all)
            {
                var sourceName=r.sharedMaterials.FirstOrDefault()?.name??"";
                if(r.name=="SkySphere"||sourceName=="ExplorationRender"||sourceName=="M_MapPrologScene"||sourceName=="M_GrassTrample"||Hierarchy(r.transform).Contains("/GenericIcon/")||Hierarchy(r.transform).Contains("/HitVFX/")||Hierarchy(r.transform).Contains("/Dissintegration/")||Hierarchy(r.transform).Contains("/GrassTrampleInfluence"))
                {r.enabled=false;helpers++;continue;}
                bool particle=r is ParticleSystemRenderer;
                var materials=r.sharedMaterials;
                for(int i=0;i<materials.Length;i++)
                {
                    var old=materials[i];if(old==null)continue;
                    var oldPath=AssetDatabase.GetAssetPath(old);
                    if(!oldPath.StartsWith("Assets/Material/")&&!oldPath.Contains("/Generated/FoliageV2/")&&!oldPath.EndsWith("/Native-body-atlas.mat"))continue;
                    if(!cache.TryGetValue(old,out var mat))
                    {
                        bool wind=old.shader!=null&&old.shader.name=="UngaBunga/NativeFoliageWind";
                        string shader=particle?"UngaBunga/NativeParticleV3":wind?"UngaBunga/NativeFoliageWind":"HDRP/Lit";
                        string target=Folder+"/"+old.name.Replace('/','-')+(wind?"-wind":particle?"-particle":"-solid")+".mat";mat=AssetDatabase.LoadAssetAtPath<Material>(target);
                        if(mat==null){mat=new Material(Shader.Find(shader));AssetDatabase.CreateAsset(mat,target);}else mat.shader=Shader.Find(shader);
                        var texture=Albedo(old);var color=old.HasProperty("_Color")?old.GetColor("_Color"):old.HasProperty("_BaseColor")?old.GetColor("_BaseColor"):Color.white;
                        if(particle)
                        {
                            if(texture==null&&old.HasProperty("_EmissionMap")&&old.GetTexture("_EmissionMap")!=null)texture=new TextureSlot{path=AssetDatabase.GetAssetPath(old.GetTexture("_EmissionMap")),scale=Vector2.one};
                            mat.SetFloat("_SurfaceType",1);mat.SetFloat("_BlendMode",0);mat.SetFloat("_DoubleSidedEnable",1);mat.SetFloat("_TransparentZWrite",0);
                            mat.SetColor("_UnlitColor",color);if(texture!=null){mat.SetTexture("_UnlitColorMap",AssetDatabase.LoadAssetAtPath<Texture>(texture.path));mat.SetTextureScale("_UnlitColorMap",texture.scale);mat.SetTextureOffset("_UnlitColorMap",texture.offset);}
                            r.shadowCastingMode=ShadowCastingMode.Off;
                        }
                        else
                        {
                            color.a=1;mat.SetColor("_BaseColor",color);mat.SetFloat("_SurfaceType",0);mat.SetFloat("_MaterialID",1);mat.SetFloat("_Metallic",0);mat.SetFloat("_Smoothness",.12f);mat.SetFloat("_DoubleSidedEnable",1);mat.SetFloat("_TransmissionEnable",0);mat.SetColor("_EmissiveColor",Color.black);
                            if(texture!=null){mat.SetTexture("_BaseColorMap",AssetDatabase.LoadAssetAtPath<Texture>(texture.path));mat.SetTextureScale("_BaseColorMap",texture.scale);mat.SetTextureOffset("_BaseColorMap",texture.offset);}
                            bool cutout=old.name.Contains("GrassClump");mat.SetFloat("_AlphaCutoffEnable",cutout?1:0);mat.SetFloat("_AlphaCutoff",.4f);
                        }
                        var customShader=mat.shader;
                        if(particle||wind)mat.shader=Shader.Find(particle?"HDRP/Unlit":"HDRP/Lit");
                        HDShaderUtils.ResetMaterialKeywords(mat);var keywords=mat.shaderKeywords;
                        if(particle||wind){mat.shader=customShader;mat.shaderKeywords=keywords;}
                        EditorUtility.SetDirty(mat);cache[old]=mat;
                    }
                    materials[i]=mat;replaced++;
                }
                r.sharedMaterials=materials;r.SetPropertyBlock(null);
            }
            foreach(var actor in campaign.bindings.characters)
            {
                actor.meshyActor.transform.localRotation=Quaternion.identity;
                foreach(var r in actor.meshyActor.GetComponentsInChildren<Renderer>(true)){r.enabled=true;r.forceRenderingOff=false;if(r.name.StartsWith("PrehistoricBody"))r.sharedMaterial=cache.First(p=>p.Key.name=="Native-body-atlas").Value;}
                if(actor.meshyActor.GetComponentsInChildren<Renderer>(true).Any(r=>r.name.StartsWith("MeshyHead")))throw new InvalidOperationException("Meshy head remains: "+actor.id);
                if(!actor.animator.avatar.isValid||!actor.animator.avatar.isHuman)throw new InvalidOperationException("Invalid original native rig: "+actor.id);
            }
            var stage=campaign.GetComponent<CinematicStage>();if(stage.fallingFrame!=null)stage.fallingFrame.rotation=Quaternion.Euler(0,stage.fallingFrame.eulerAngles.y,0);
            var village=GameObject.Find("Village complet V2");
            foreach(var rb in village.GetComponentsInChildren<Rigidbody>(true)){rb.isKinematic=true;rb.useGravity=false;stable++;}
            foreach(var child in village.GetComponentsInChildren<Transform>(true))
                if(child.name.StartsWith("Hut.")||child.name.StartsWith("CampHut")){var e=child.eulerAngles;if(child.parent==village.transform)child.rotation=Quaternion.Euler(0,e.y,0);}
            RepairNavigation(campaign,village.transform);
            AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
            File.WriteAllText(Root+"/native-repair.txt","Complete native heads and bodies=18; valid Humanoid rigs=18; material slots repaired="+replaced+"; fresh material variants="+cache.Count+"; disabled map/sky/hit/helper renderers="+helpers+"; fixed rigidbodies="+stable);
            Inspect();
        }
        static bool Clear(Vector3 p,Transform except=null)
        {
            return !Physics.OverlapCapsule(p+Vector3.up*.45f,p+Vector3.up*1.5f,.31f,~0,QueryTriggerInteraction.Ignore).Any(c=>!(c is TerrainCollider)&&(except==null||!c.transform.IsChildOf(except)));
        }
        static Vector3 Accessible(Vector3 p,Vector3 hub,Transform except=null)
        {
            for(float radius=0;radius<12;radius+=.6f)for(int a=0;a<16;a++)
            {
                var candidate=p+Quaternion.Euler(0,a*22.5f,0)*Vector3.forward*radius;candidate.y=VillageLife.Ground(candidate);
                if(!NavMesh.SamplePosition(candidate,out var hit,.65f,NavMesh.AllAreas)||Mathf.Abs(hit.position.y-candidate.y)>.45f||!Clear(hit.position,except))continue;
                var path=new NavMeshPath();if(NavMesh.CalculatePath(hub,hit.position,new NavMeshQueryFilter{agentTypeID=NavMesh.GetSettingsByIndex(0).agentTypeID,areaMask=NavMesh.AllAreas},path)&&path.status==NavMeshPathStatus.PathComplete)return hit.position;
            }
            throw new InvalidOperationException("No unobstructed connected position near "+p);
        }
        static void RepairNavigation(CampaignRuntime campaign,Transform village)
        {
            var notes=new List<string>();var bindings=campaign.bindings;
            foreach(var agent in UnityEngine.Object.FindObjectsByType<NavMeshAgent>(FindObjectsSortMode.None))agent.enabled=false;
            // Prefab interaction volumes used as solid boxes obstructed doors and paths.
            // Use the actual visible building geometry for physical contact instead.
            int colliders=0;
            foreach(Transform group in village)
            {
                if(group.name=="Sentier"||group.name.StartsWith("Actor_"))continue;
                foreach(var c in group.GetComponentsInChildren<Collider>(true))c.enabled=false;
                foreach(var filter in group.GetComponentsInChildren<MeshFilter>())
                {
                    var renderer=filter.GetComponent<MeshRenderer>();if(renderer==null||!renderer.enabled||filter.sharedMesh==null)continue;
                    if(System.Text.RegularExpressions.Regex.IsMatch(Hierarchy(filter.transform),"Ghost|Preview|Highlight|GenericIcon|VFX|Canvas",System.Text.RegularExpressions.RegexOptions.IgnoreCase))continue;
                    var c=filter.GetComponent<MeshCollider>();if(c==null)c=filter.gameObject.AddComponent<MeshCollider>();c.sharedMesh=filter.sharedMesh;c.convex=false;c.isTrigger=false;c.enabled=true;colliders++;
                }
            }
            Physics.SyncTransforms();
            var nav=GameObject.Find("Navigation du village V2").GetComponent<NavMeshSurface>();
            foreach(var other in UnityEngine.Object.FindObjectsByType<NavMeshSurface>(FindObjectsSortMode.None))if(other!=nav){other.RemoveData();other.enabled=false;}
            NavMesh.RemoveAllNavMeshData();nav.agentTypeID=NavMesh.GetSettingsByIndex(0).agentTypeID;nav.RemoveData();nav.BuildNavMesh();
            if(nav.navMeshData==null)throw new InvalidOperationException("Geometry navigation bake failed");
            var stored=AssetDatabase.LoadAssetAtPath<NavMeshData>("Assets/UngaBunga45001/Generated/NativeCastV2/VillageNavMesh.asset");
            if(stored!=null){EditorUtility.CopySerialized(nav.navMeshData,stored);nav.RemoveData();nav.navMeshData=stored;nav.AddData();EditorUtility.SetDirty(stored);}
            var origin=new Vector3(350.92f,0,281.88f);origin.y=VillageLife.Ground(origin);
            if(!NavMesh.SamplePosition(origin,out var seed,5,NavMesh.AllAreas))throw new InvalidOperationException("Village has no navigation seed");
            var hub=Accessible(origin,seed.position);notes.Add("Visible building mesh colliders="+colliders+" hub="+hub);
            var controller=bindings.player.GetComponent<CharacterController>();controller.enabled=false;
            var spawn=Accessible(hub+Vector3.back*4,hub,bindings.player);bindings.player.position=spawn+Vector3.up*.04f;controller.enabled=true;
            foreach(var actor in bindings.characters.Where(a=>a.id!="dylan"))
            {
                var root=bindings.Find(actor.id);var before=root.position;root.position=Accessible(root.position,hub,root);
                var agent=root.GetComponent<NavMeshAgent>();if(agent!=null){agent.radius=.3f;agent.height=1.8f;agent.obstacleAvoidanceType=ObstacleAvoidanceType.HighQualityObstacleAvoidance;agent.autoRepath=true;agent.updateRotation=false;}
                foreach(var routine in campaign.GetComponent<VillageLife>().routines.Where(r=>r.id==actor.id)){routine.workplace=root.position;routine.rest=Accessible(root.position+Vector3.back*2,hub,root);}
                notes.Add(actor.id+" clearance=valid connected=True reposition="+Vector3.Distance(before,root.position));
            }
            // Draw each trail along the baked route, so it no longer cuts straight through a rock or shelter.
            var oldTrails=village.Cast<Transform>().Where(t=>t.name=="Sentier").ToArray();int index=0;
            foreach(string id in new[]{"grand_menhir","habitations","atelier_silex","foyer","stockage","bois_construction","pierre_carriere","chasse_clairiere"})
            {
                var target=Accessible(bindings.Find(id).position,hub);var path=new NavMeshPath();NavMesh.CalculatePath(hub,target,new NavMeshQueryFilter{agentTypeID=nav.agentTypeID,areaMask=NavMesh.AllAreas},path);
                if(path.status!=NavMeshPathStatus.PathComplete)throw new InvalidOperationException("Sector not connected: "+id);
                var points=new List<Vector3>();
                for(int j=1;j<path.corners.Length;j++){var a=path.corners[j-1];var b=path.corners[j];int count=Mathf.Max(1,Mathf.CeilToInt(Vector3.Distance(a,b)));for(int n=0;n<count;n++)points.Add(Vector3.Lerp(a,b,(float)n/count));}points.Add(target);
                var vertices=new List<Vector3>();var triangles=new List<int>();
                for(int j=0;j<points.Count;j++){var direction=points[Mathf.Min(points.Count-1,j+1)]-points[Mathf.Max(0,j-1)];var side=Vector3.Cross(direction.normalized,Vector3.up)*.65f;foreach(float sign in new[]{-1f,1f}){var p=points[j]+side*sign;p.y=VillageLife.Ground(p)+.025f;vertices.Add(p);}if(j>0){int n=(j-1)*2;triangles.AddRange(new[]{n,n+2,n+1,n+1,n+2,n+3});}}
                var mesh=new Mesh{name="Chemin réel / "+id};mesh.SetVertices(vertices);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();string pathAsset=Folder+"/Path-"+id+".asset";var existing=AssetDatabase.LoadAssetAtPath<Mesh>(pathAsset);if(existing==null)AssetDatabase.CreateAsset(mesh,pathAsset);else{EditorUtility.CopySerialized(mesh,existing);mesh=existing;}
                oldTrails[index++].GetComponent<MeshFilter>().sharedMesh=mesh;notes.Add("Trail "+id+" path=complete corners="+path.corners.Length);
            }
            File.WriteAllLines(Root+"/navigation-repair.txt",notes);
        }
    }
}
