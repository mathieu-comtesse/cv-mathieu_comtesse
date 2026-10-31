using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
 public sealed class CinematicWeatherV15:MonoBehaviour
 {
  readonly Dictionary<Renderer,MaterialPropertyBlock> previous=new Dictionary<Renderer,MaterialPropertyBlock>();readonly List<GameObject> objects=new List<GameObject>();readonly List<Material> materials=new List<Material>();CampaignRuntime c;
  public void Begin(CampaignRuntime campaign){End();c=campaign;}
  public void Wind()
  {
   foreach(var r in FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None))
   {
    if(previous.ContainsKey(r))continue;bool foliage=false;float strength=0;foreach(var m in r.sharedMaterials)if(m!=null&&m.HasProperty("_WindStrength")){strength=Mathf.Max(strength,m.GetFloat("_WindStrength"));foliage|=strength>.01f;}if(!foliage)continue;
    var old=new MaterialPropertyBlock();r.GetPropertyBlock(old);previous[r]=old;var changed=new MaterialPropertyBlock();r.GetPropertyBlock(changed);changed.SetFloat("_WindStrength",strength*1.7f);r.SetPropertyBlock(changed);
   }
  }
  public void Rain(Vector3 site)
  {
   Wind();var go=new GameObject("Averse locale de réalisation");go.transform.position=site+Vector3.up*7;go.transform.rotation=Quaternion.Euler(90,0,0);objects.Add(go);
   var ps=go.AddComponent<ParticleSystem>();ps.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);var main=ps.main;main.startLifetime=1.5f;main.startSpeed=7;main.startSize=new ParticleSystem.MinMaxCurve(.018f,.03f);main.maxParticles=160;main.simulationSpace=ParticleSystemSimulationSpace.World;main.startColor=new Color(.58f,.7f,.8f,.4f);var emission=ps.emission;emission.rateOverTime=90;
   var shape=ps.shape;shape.shapeType=ParticleSystemShapeType.Box;shape.scale=new Vector3(15,12,.1f);var renderer=ps.GetComponent<ParticleSystemRenderer>();renderer.renderMode=ParticleSystemRenderMode.Stretch;renderer.lengthScale=5;renderer.velocityScale=.015f;renderer.shadowCastingMode=ShadowCastingMode.Off;renderer.receiveShadows=false;
   var material=new Material(c.GetComponent<EnvironmentInteraction>().rippleMaterial);materials.Add(material);renderer.sharedMaterial=material;
   var collision=ps.collision;collision.enabled=true;collision.type=ParticleSystemCollisionType.World;collision.mode=ParticleSystemCollisionMode.Collision3D;collision.quality=ParticleSystemCollisionQuality.Low;collision.lifetimeLoss=1;collision.enableDynamicColliders=false;ps.Play();
  }
  public void Ember(Vector3 site,bool safe)
  {
   NativeFire nearest=null;float distance=float.PositiveInfinity;foreach(var fire in NativeFire.ActiveFires){float d=(fire.transform.position-site).sqrMagnitude;if(d<distance){distance=d;nearest=fire;}}if(nearest==null)return;
   var go=GameObject.CreatePrimitive(PrimitiveType.Cube);go.name="Braise suivie jusqu’au sol";go.transform.position=nearest.transform.position+Vector3.up*.6f;go.transform.localScale=Vector3.one*.055f;go.GetComponent<MeshRenderer>().sharedMaterial=nearest.innerMaterial;go.GetComponent<Collider>().isTrigger=false;go.GetComponent<MeshRenderer>().shadowCastingMode=ShadowCastingMode.Off;
   var rb=go.AddComponent<Rigidbody>();rb.mass=.01f;rb.linearDamping=.15f;rb.linearVelocity=new Vector3(safe?.4f:1.2f,2.2f,.4f);objects.Add(go);
  }
  public void End(){foreach(var pair in previous)if(pair.Key!=null)pair.Key.SetPropertyBlock(pair.Value);previous.Clear();foreach(var go in objects)if(go!=null)Destroy(go);objects.Clear();foreach(var m in materials)if(m!=null)Destroy(m);materials.Clear();}
  void OnDisable()=>End();
 }
}
