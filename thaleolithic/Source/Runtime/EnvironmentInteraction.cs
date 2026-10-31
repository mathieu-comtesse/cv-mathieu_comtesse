using System.Linq;
using UnityEngine;
#if !UNGA_WEB_RENDERER
using UnityEngine.Rendering.HighDefinition;
#endif
namespace UngaBunga45001
{
    public sealed class EnvironmentInteraction:MonoBehaviour
    {
        public SceneBindings bindings;
        #if !UNGA_WEB_RENDERER
        public WaterSurface[] waters;
        #endif
        [System.Serializable]public sealed class WaterPlane{public MeshRenderer renderer;public float height;}
        public WaterPlane[] webWaterPlanes=System.Array.Empty<WaterPlane>();
        public Mesh rippleMesh;public Material rippleMaterial;
        public float WaterDepth{get;private set;}
        public int WaterQueriesSucceeded{get;private set;}
        public int SplashEmissions{get;private set;}
        public float MinimumRawDepth{get;private set;}=999;
        public float MaximumRawDepth{get;private set;}=-999;
        public Vector3 DeepestSample{get;private set;}
        public bool SampleDepth(Vector3 player,out float depth)
        {
            depth=0;bool queried=false;
            if(!RenderBackend.HDRP)
            {
                foreach(var plane in webWaterPlanes)if(plane.renderer!=null&&OverRenderer(plane.renderer,player))
                {queried=true;WaterQueriesSucceeded++;float d=plane.height-player.y;MinimumRawDepth=Mathf.Min(MinimumRawDepth,d);if(d>MaximumRawDepth){MaximumRawDepth=d;DeepestSample=player;}depth=Mathf.Max(depth,d);}return queried;
            }
            #if !UNGA_WEB_RENDERER
            if(waters==null)return false;
            foreach(var surface in waters)
            {
                if(!surface.isActiveAndEnabled||!OverSurface(surface,player))continue;
                var query=new WaterSearchParameters{startPositionWS=player,targetPositionWS=player,error=.025f,maxIterations=8,includeDeformation=true,outputNormal=false};
                // HDRP custom-mesh CPU queries return displacement with an identity waterToWorld matrix.
                // Add the original horizontal lake mesh height, as the rendered mesh already does.
                float baseHeight=surface.meshRenderers[0].bounds.center.y;
                if(surface.ProjectPointOnWaterSurface(query,out var result)){queried=true;WaterQueriesSucceeded++;float d=result.projectedPositionWS.y+baseHeight-player.y;MinimumRawDepth=Mathf.Min(MinimumRawDepth,d);if(d>MaximumRawDepth){MaximumRawDepth=d;DeepestSample=player;}if(d>0)depth=Mathf.Max(depth,d);}
            }
            #endif
            return queried;
        }
        private readonly Vector4[] positions=new Vector4[24];
        private float nextRipple;
        private Vector3 previous;
        CinematicWildlifeV15 cinematicHerd;
        private readonly System.Collections.Generic.Dictionary<MeshRenderer,(Vector3[] vertices,int[] triangles)> footprints=new System.Collections.Generic.Dictionary<MeshRenderer,(Vector3[],int[])>();
        #if !UNGA_WEB_RENDERER
        private bool OverSurface(WaterSurface surface,Vector3 p)
        {
            if(surface.geometryType!=WaterGeometryType.Custom)return false;
            return surface.meshRenderers.Any(renderer=>OverRenderer(renderer,p));
        }
        #endif
        private bool OverRenderer(MeshRenderer renderer,Vector3 p)
            {
                var bounds=renderer.bounds;if(p.x<bounds.min.x||p.z<bounds.min.z||p.x>bounds.max.x||p.z>bounds.max.z)return false;
                if(!footprints.TryGetValue(renderer,out var footprint))
                {var mesh=renderer.GetComponent<MeshFilter>().sharedMesh;var verts=mesh.vertices;for(int i=0;i<verts.Length;i++)verts[i]=renderer.transform.TransformPoint(verts[i]);footprint=(verts,mesh.triangles);footprints[renderer]=footprint;}
                var v=footprint.vertices;var t=footprint.triangles;
                for(int i=0;i<t.Length;i+=3)
                {var a=v[t[i]];var b=v[t[i+1]];var c=v[t[i+2]];float ab=(p.x-b.x)*(a.z-b.z)-(a.x-b.x)*(p.z-b.z),bc=(p.x-c.x)*(b.z-c.z)-(b.x-c.x)*(p.z-c.z),ca=(p.x-a.x)*(c.z-a.z)-(c.x-a.x)*(p.z-a.z);if(!((ab<0||bc<0||ca<0)&&(ab>0||bc>0||ca>0)))return true;}
            return false;
        }
        private void Start(){
            #if !UNGA_WEB_RENDERER
            waters=FindObjectsByType<WaterSurface>(FindObjectsSortMode.None);
            #endif
            previous=bindings.player.position;
        }
        private void Update()
        {
            int count=0;foreach(var actor in bindings.characters.Where(c=>c.meshyActor!=null&&c.meshyActor.activeInHierarchy).Take(24)){var p=bindings.Find(actor.id).position;positions[count++]=new Vector4(p.x,p.y,p.z,1.1f);}
            if(cinematicHerd==null)cinematicHerd=GetComponent<CinematicWildlifeV15>();if(cinematicHerd!=null)count=cinematicHerd.AppendGrassActors(positions,count);
            Shader.SetGlobalInt("_UngaActorCount",count);Shader.SetGlobalVectorArray("_UngaActors",positions);
            var player=bindings.player.position;SampleDepth(player,out float depth);WaterDepth=depth;
            bool moving=(player-previous).sqrMagnitude>.00001f;previous=player;
            if(WaterDepth>.08f&&moving&&Time.time>=nextRipple&&rippleMesh!=null&&rippleMaterial!=null)
            {
                nextRipple=Time.time+.22f;var go=new GameObject("Onde circulaire du pas");go.transform.position=player+Vector3.up*(WaterDepth+.012f);go.AddComponent<MeshFilter>().sharedMesh=rippleMesh;var renderer=go.AddComponent<MeshRenderer>();renderer.sharedMaterial=rippleMaterial;renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;go.AddComponent<WaterFootstepRing>();SplashEmissions++;
            }
        }
    }
}
