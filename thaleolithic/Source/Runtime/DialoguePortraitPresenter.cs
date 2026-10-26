using System;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
namespace UngaBunga45001
{
    // Render the actual native skinned actor, including the pose it is currently playing.
    public sealed class DialoguePortraitPresenter:MonoBehaviour
    {
        public RenderTexture Portrait{get;private set;}public RenderTexture Body{get;private set;}public string ActorId{get;private set;}="";
        public Material BodyComposite{get;private set;}RenderTexture silhouette;Material white;
        CampaignRuntime campaign;Camera portraitCamera,bodyCamera;GameObject copy;Mesh baked;SkinnedMeshRenderer source;Animator animator;float nextRender;Light fill;
        const int Layer=31;public bool Visible; public bool BodyVisible=true;static int stageIndex;
        sealed class ExtraPart{public MeshRenderer original,rendered;public GameObject copy;}
        readonly System.Collections.Generic.List<ExtraPart> extras=new System.Collections.Generic.List<ExtraPart>();
        public void Initialize(CampaignRuntime runtime)
        {
            campaign=runtime;Portrait=new RenderTexture(384,384,24,RenderTextureFormat.ARGB32);Body=new RenderTexture(576,800,24,RenderTextureFormat.ARGB32);Portrait.Create();Body.Create();
            silhouette=new RenderTexture(576,800,24,RenderTextureFormat.ARGB32);silhouette.Create();white=RenderBackend.SilhouetteMaterial();BodyComposite=new Material(Resources.Load<Shader>("UngaPortraitComposite"));BodyComposite.SetTexture("_MaskTex",silhouette);
            Camera Make(string name){var go=new GameObject(name);go.transform.SetParent(transform,false);var cam=go.AddComponent<Camera>();cam.enabled=false;cam.cullingMask=1<<Layer;cam.nearClipPlane=.02f;cam.farClipPlane=9;cam.fieldOfView=30;RenderBackend.PortraitCamera(cam);return cam;}
            portraitCamera=Make("Portrait natif · visage");bodyCamera=Make("Portrait natif · personnage");campaign.bindings.gameplayCamera.cullingMask&=~(1<<Layer);if(campaign.cinematicDirector.cinematicCamera!=null)campaign.cinematicDirector.cinematicCamera.cullingMask&=~(1<<Layer);
            baked=new Mesh{name="Pose native pour dialogue"};float stage=10000+100*stageIndex++;foreach(var existing in UnityEngine.Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None).Where(r=>r.name=="Personnage natif pour les dialogues"))stage=Mathf.Max(stage,existing.transform.position.x+100);copy=new GameObject("Personnage natif pour les dialogues"){hideFlags=HideFlags.HideAndDontSave};copy.layer=Layer;copy.transform.position=new Vector3(stage,0,10000);copy.AddComponent<MeshFilter>().sharedMesh=baked;copy.AddComponent<MeshRenderer>().shadowCastingMode=ShadowCastingMode.Off;
            var light=new GameObject("Lumière du portrait natif");light.transform.SetParent(transform,false);fill=light.AddComponent<Light>();fill.type=LightType.Spot;fill.range=9;fill.spotAngle=80;fill.intensity=150000;fill.color=new Color(1,.91f,.8f);fill.cullingMask=1<<Layer;
            RenderBackend.PortraitLight(fill);
        }
        public bool SetActor(string id)
        {
            if(campaign==null)return false;var actor=campaign.bindings.characters.FirstOrDefault(a=>a.id==id);if(actor==null)return false;
            var skin=actor.meshyActor.GetComponentsInChildren<SkinnedMeshRenderer>(true).FirstOrDefault(r=>r.sharedMesh!=null&&r.bones.Length>20);if(skin==null)return false;
            var parts=actor.meshyActor.GetComponentsInChildren<MeshRenderer>(true).Where(r=>r.GetComponent<MeshFilter>()?.sharedMesh!=null).ToArray();
            if(ActorId!=id||source!=skin||parts.Length!=extras.Count)
            {
                foreach(var part in extras){part.copy.SetActive(false);Release(part.copy);}extras.Clear();
                foreach(var part in parts){var go=new GameObject("Accessoire natif du portrait");go.layer=Layer;go.AddComponent<MeshFilter>().sharedMesh=part.GetComponent<MeshFilter>().sharedMesh;var renderer=go.AddComponent<MeshRenderer>();renderer.sharedMaterials=part.sharedMaterials;renderer.shadowCastingMode=ShadowCastingMode.Off;extras.Add(new ExtraPart{original=part,rendered=renderer,copy=go});}
            }
            ActorId=id;source=skin;animator=actor.animator;copy.GetComponent<MeshRenderer>().sharedMaterials=skin.sharedMaterials;nextRender=0;return true;
        }
        void LateUpdate()
        {
            if(!Visible||source==null||Time.unscaledTime<nextRender)return;nextRender=Time.unscaledTime+.1f;
            source.BakeMesh(baked);copy.transform.rotation=source.transform.rotation;copy.transform.localScale=source.transform.lossyScale;
            foreach(var part in extras){part.copy.SetActive(part.original!=null&&part.original.enabled&&part.original.gameObject.activeInHierarchy);if(!part.copy.activeSelf)continue;part.copy.transform.SetPositionAndRotation(copy.transform.position+part.original.transform.position-source.transform.position,part.original.transform.rotation);part.copy.transform.localScale=part.original.transform.lossyScale;}
            var local=baked.bounds;var bounds=new Bounds(copy.transform.TransformPoint(local.center),Vector3.zero);for(int i=0;i<8;i++)bounds.Encapsulate(copy.transform.TransformPoint(local.center+Vector3.Scale(local.extents,new Vector3((i&1)==0?-1:1,(i&2)==0?-1:1,(i&4)==0?-1:1))));var head=copy.transform.TransformPoint(source.transform.InverseTransformPoint(animator.GetBoneTransform(HumanBodyBones.Head).position))+Vector3.up*.12f*source.transform.lossyScale.y;
            Vector3 front=campaign.bindings.characters.First(a=>a.id==ActorId).meshyActor.transform.forward;front.y=0;front.Normalize();
            portraitCamera.transform.position=head+front*.94f+Vector3.up*.015f;portraitCamera.transform.LookAt(head);
            var center=bounds.center+Vector3.up*.03f;bodyCamera.transform.position=center+front*4.4f+Vector3.up*.08f;bodyCamera.transform.LookAt(center);
            fill.transform.position=center+front*2.5f+Vector3.up*.8f;fill.transform.LookAt(center+Vector3.up*.3f);
            RenderPipeline.SubmitRenderRequest(portraitCamera,new RenderPipeline.StandardRequest{destination=Portrait});if(!BodyVisible)return;RenderPipeline.SubmitRenderRequest(bodyCamera,new RenderPipeline.StandardRequest{destination=Body});
            var renderer=copy.GetComponent<MeshRenderer>();renderer.sharedMaterial=white;foreach(var part in extras)part.rendered.sharedMaterial=white;RenderPipeline.SubmitRenderRequest(bodyCamera,new RenderPipeline.StandardRequest{destination=silhouette});renderer.sharedMaterials=source.sharedMaterials;foreach(var part in extras)part.rendered.sharedMaterials=part.original.sharedMaterials;
        }
        public void RenderNow(){nextRender=0;LateUpdate();}
        static void Release(UnityEngine.Object value){if(value==null)return;if(Application.isPlaying)Destroy(value);else DestroyImmediate(value);}
        void OnDestroy(){if(Portrait!=null){Portrait.Release();Release(Portrait);}if(Body!=null){Body.Release();Release(Body);}if(silhouette!=null){silhouette.Release();Release(silhouette);}Release(white);Release(BodyComposite);Release(baked);Release(copy);foreach(var part in extras)Release(part.copy);if(portraitCamera!=null)Release(portraitCamera.gameObject);if(bodyCamera!=null)Release(bodyCamera.gameObject);if(fill!=null)Release(fill.gameObject);}
    }
}
