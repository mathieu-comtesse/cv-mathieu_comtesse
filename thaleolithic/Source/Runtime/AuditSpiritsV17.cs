using System.Collections.Generic;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class AuditSpiritsV17:MonoBehaviour
 {
  CampaignRuntime c;CampaignActivitiesV17 activity;Transform root;readonly List<CinematicActorV15> actors=new List<CinematicActorV15>();readonly List<Material> materials=new List<Material>();readonly List<Vector3> seats=new List<Vector3>();float start;
  public int Count=>actors.Count;
  void Start(){c=GetComponent<CampaignRuntime>();activity=GetComponent<CampaignActivitiesV17>();}
  void Create()
  {
   root=new GameObject("Conseil des esprits · personnages natifs translucides").transform;root.SetParent(transform);start=Time.time;
   var ids=new List<string>{"mathieu","aurelien","georges","nork","mathilde"};ids.AddRange(c.State.characters.Where(x=>!x.alive).Select(x=>x.id));var center=c.bindings.Find("alban").position;
   for(int i=0;i<ids.Count;i++)
   {
    var source=c.bindings.AnimatorFor(ids[i]);if(source==null)continue;var clone=Instantiate(source.gameObject,root);clone.name="Esprit · "+c.CharacterName(ids[i]);
    foreach(var collider in clone.GetComponentsInChildren<Collider>())collider.enabled=false;
    foreach(var b in clone.GetComponentsInChildren<Behaviour>())if(!(b is Animator))b.enabled=false;
    var animator=clone.GetComponent<Animator>();animator.enabled=true;animator.cullingMode=AnimatorCullingMode.CullUpdateTransforms;
    float angle=(-65+i%5*32.5f)*Mathf.Deg2Rad;var p=center+new Vector3(Mathf.Sin(angle),0,Mathf.Cos(angle))*(2.7f+i/5*1.2f);p.y=VillageLife.Ground(p)+.16f;clone.transform.position=p;clone.transform.rotation=Quaternion.LookRotation(new Vector3(center.x-p.x,0,center.z-p.z));seats.Add(p);
    foreach(var renderer in clone.GetComponentsInChildren<SkinnedMeshRenderer>())
    {
     renderer.sharedMaterials=renderer.sharedMaterials.Select(original=>{var material=new Material(original);material.SetFloat("_Surface",1);material.SetFloat("_SrcBlend",(float)UnityEngine.Rendering.BlendMode.SrcAlpha);material.SetFloat("_DstBlend",(float)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);material.SetFloat("_ZWrite",0);material.SetColor("_BaseColor",new Color(.35f,.9f,.8f,.4f));material.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");material.renderQueue=3000;material.SetShaderPassEnabled("ShadowCaster",false);materials.Add(material);return material;}).ToArray();renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;
    }
    var owner=animator.GetComponent<CinematicActorV15>()??animator.gameObject.AddComponent<CinematicActorV15>();owner.enabled=true;owner.FootContacts=false;owner.Acquire(animator);actors.Add(owner);
   }
  }
  void LateUpdate()
  {
   if(activity?.Current?.mode!="audit"){if(root!=null)Clear();return;}if(root==null)Create();
   var clips=new[]{"C01_Mathieu_AppelDylan","C01_Aurelien_DiscoursIronique","C08_Georges_InspectionFondations","V18_Ouways_Peinture","C08_Mathilde_VerificationConditions"};
   for(int i=0;i<actors.Count;i++)
   {var clip=Resources.Load<AnimationClip>("CinematicsV18/Clips/"+clips[i%5])??CinematicCatalogueV15.Clip(clips[i%5]);if(clip==null)continue;float t=Time.time-start;actors[i].Sample(clip,Mathf.Min(clip.length-.05f,.5f+t*.55f+i*.1f),1);actors[i].Look(c.bindings.player.position+Vector3.up*1.3f,.8f);actors[i].transform.position=seats[i]+Vector3.up*Mathf.Sin(t*1.5f+i)*.08f;}
  }
  void Clear(){foreach(var actor in actors)if(actor!=null)actor.Release();actors.Clear();seats.Clear();foreach(var m in materials)if(m!=null)Destroy(m);materials.Clear();if(root!=null)Destroy(root.gameObject);root=null;}
  void OnDisable(){Clear();}
 }
}
