using System.Collections.Generic;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed class MapWorldGeometry:MonoBehaviour
    {
        public struct Footprint{public Bounds bounds;public Color color;}
        public readonly List<Footprint> footprints=new List<Footprint>();
        readonly Dictionary<Transform,MeshRenderer[]> sources=new Dictionary<Transform,MeshRenderer[]>();CampaignRuntime campaign;float refreshAt;
        public void Build(CampaignRuntime runtime)
        {
            campaign=runtime;var roots=new HashSet<Transform>();var village=GameObject.Find("Village complet V2")?.transform;
            if(village!=null)foreach(Transform child in village)if(System.Text.RegularExpressions.Regex.IsMatch(child.name,"Hut|Tent|Storage|Grindstone|HideRack|LogPile|Campfire|Bed",System.Text.RegularExpressions.RegexOptions.IgnoreCase))roots.Add(child);
            foreach(var building in campaign.bindings.buildings)foreach(var stage in building.stages)if(stage!=null)roots.Add(stage.transform);
            var evolution=GetComponent<VillageEvolution>();if(evolution!=null)foreach(var hut in evolution.earlyHuts.Concat(evolution.improvedHuts))if(hut!=null)roots.Add(hut.transform);
            foreach(var root in roots)sources[root]=root.GetComponentsInChildren<MeshRenderer>(true);Refresh();
        }
        void Update(){if(campaign!=null&&Time.unscaledTime>refreshAt){refreshAt=Time.unscaledTime+.5f;Refresh();}}
        void Refresh()
        {
            footprints.Clear();foreach(var source in sources)
            {
                if(!source.Key.gameObject.activeInHierarchy)continue;bool started=false;var bounds=new Bounds();foreach(var r in source.Value)if(r!=null&&r.enabled&&r.gameObject.activeInHierarchy){if(!started){bounds=r.bounds;started=true;}else bounds.Encapsulate(r.bounds);}
                if(!started||bounds.size.x<.2f||bounds.size.z<.2f)continue;var color=source.Key.name.ToLowerInvariant().Contains("grindstone")?new Color(.56f,.55f,.49f):new Color(.53f,.32f,.15f);footprints.Add(new Footprint{bounds=bounds,color=color});
            }
        }
    }
    [RequireComponent(typeof(CanvasRenderer))]public sealed class MapFootprintsGraphic:UnityEngine.UI.MaskableGraphic
    {
        public MapWorldGeometry geometry;public WorldMapProjection projection;Rect crop;float heading;
        public void SetView(Rect view,float rotation){crop=view;heading=rotation;SetVerticesDirty();}
        protected override void OnPopulateMesh(UnityEngine.UI.VertexHelper vh)
        {
            vh.Clear();if(geometry==null||projection==null)return;var r=rectTransform.rect;
            foreach(var footprint in geometry.footprints)
            {
                var b=footprint.bounds;var corners=new[]{new Vector3(b.min.x,0,b.min.z),new Vector3(b.max.x,0,b.min.z),new Vector3(b.max.x,0,b.max.z),new Vector3(b.min.x,0,b.max.z)};
                var points=corners.Select(p=>r.min+Vector2.Scale(projection.Project(p,crop,heading),r.size)).ToArray();var center=(points[0]+points[2])*.5f;int index=vh.currentVertCount;
                for(int i=0;i<4;i++)vh.AddVert(points[i],footprint.color*(i<2?.75f:1.1f),Vector2.zero);vh.AddVert(center,footprint.color*1.25f,Vector2.zero);
                for(int i=0;i<4;i++)vh.AddTriangle(index+i,index+(i+1)%4,index+4);
            }
        }
    }
}
