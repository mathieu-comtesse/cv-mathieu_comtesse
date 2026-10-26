using System;
using System.Linq;
using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed partial class TribalInterface
    {
        void DrawMap(){GetComponent<CampaignMap>().SetTribalHost(Content);}
    }
    public sealed partial class CampaignMap
    {
        Transform mapOriginalParent;RectTransform tribalHost;string inspectedId="";string inspectedLabel="";RectTransform mapFollow;
        void SyncIncidentMarkers()
        {
            foreach(var accident in campaign.State.accidents)
            {
                string id="incident:"+accident.id+":"+accident.elapsedSeconds.ToString("R",System.Globalization.CultureInfo.InvariantCulture);if(markers.Any(m=>m.id==id))continue;
                var point=new GameObject("Lieu de l’incident · "+accident.title);point.transform.SetParent(campaign.transform,false);point.transform.position=accident.position;campaign.bindings.objects=campaign.bindings.objects.Concat(new[]{new ObjectBinding{id=id,target=point.transform}}).ToArray();names[id]="Incident · "+accident.title;AddMarker(id,point.transform,names[id],false);var marker=markers.Last().marker;var shape=marker.GetComponent<AdventureShape>();shape.kind="cross";shape.color=TribalStyle.Danger;shape.SetVerticesDirty();
            }
        }
        public string DisplayName(string id)=>id==null?"Poste inconnu":names.TryGetValue(id,out string name)?name:campaign?.Data?.characters.FirstOrDefault(c=>c.id==id)?.name??id;
        public void SetTribalHost(RectTransform host)
        {
            if(window==null)return;if(host==null&&tribalHost==null)return;
            if(host!=null){if(mapOriginalParent==null)mapOriginalParent=window.parent;tribalHost=host;window.SetParent(host,false);window.anchorMin=Vector2.zero;window.anchorMax=Vector2.one;window.offsetMin=window.offsetMax=Vector2.zero;window.localScale=Vector3.one;IsOpen=true;window.gameObject.SetActive(true);nextRefresh=0;}
            else{IsOpen=false;window.gameObject.SetActive(false);window.SetParent(mapOriginalParent,false);window.anchorMin=Vector2.zero;window.anchorMax=Vector2.one;window.offsetMin=window.offsetMax=Vector2.zero;tribalHost=null;}
        }
        void Inspect(string id,Transform target,string label){inspected=target;inspectedId=id;inspectedLabel=label;nextRefresh=0;}
        void LayoutTribalMap()
        {
            float w=window.rect.width,h=window.rect.height;bool small=w<1000,narrow=w<550;float side=narrow?0:Mathf.Min(300,w*.29f),mapW=w-side-16,mapH=h-66;
            RectTransform Child(string name)=>window.Find(name) as RectTransform;
            void Top(RectTransform r,float x,float y,float width,float height){if(r==null)return;r.anchorMin=r.anchorMax=new Vector2(0,1);r.pivot=new Vector2(0,1);r.anchoredPosition=new Vector2(x,-y);r.sizeDelta=new Vector2(width,height);}
            var backdrop=window.GetComponent<UnityEngine.UI.Image>();if(backdrop!=null)backdrop.color=new Color(.02f,.014f,.04f,.78f);
            Child("Titre").gameObject.SetActive(false);Child("Aide carte").gameObject.SetActive(false);Child("Légende").gameObject.SetActive(false);
            var zone=Child("Zone carte");Top(zone,0,54,mapW,mapH);var frame=fullRect.parent as RectTransform;float ratio=worldSize.x/worldSize.y;frame.sizeDelta=new Vector2(Mathf.Min(mapW,mapH*ratio),Mathf.Min(mapH,mapW/ratio));
            Top(caption.rectTransform,narrow?10:mapW+24,narrow?64:64,narrow?Mathf.Min(220,w-20):side-24,narrow?130:h-156);caption.fontSize=small?14:18;caption.raycastTarget=false;
            int index=0;float bw=(w-8)/7;foreach(string name in new[]{"Lieux","Personnages","Dangers","Village","Monde","Itinéraire","Fermer"})
            {
                var r=Child(name);Top(r,index++*bw,0,bw-4,44);r.GetComponentInChildren<TMP_Text>().fontSize=small?11:15;
                var image=r.GetComponent<UnityEngine.UI.Image>();if(image!=null){image.color=Color.clear;image.raycastTarget=false;var shape=r.Find("Fond oblique") as RectTransform;if(shape==null){shape=AdventureUI.Fill(r,"Fond oblique");shape.SetAsFirstSibling();var polygon=TribalStyle.Panel(shape,"row",raycast:true);r.GetComponent<UnityEngine.UI.Button>().targetGraphic=polygon;}}
            }
            if(mapFollow==null){mapFollow=TribalStyle.Top(window,"Suivre le lieu sélectionné",0,0,100,44);TribalStyle.Button(mapFollow,font,"SUIVRE",()=>{if(string.IsNullOrEmpty(inspectedId))return;GetComponent<AdventureMenus>().Close();navigation.Follow("travel:"+inspectedId);},true);}
            Top(mapFollow,narrow?12:mapW+24,h-64,narrow?w-24:side-24,44);mapFollow.gameObject.SetActive(inspected!=null);mapFollow.GetComponent<UnityEngine.UI.Button>().interactable=campaign.FindAction("travel:"+inspectedId)!=null;
            if(inspected!=null)caption.text=inspectedLabel.ToUpperInvariant()+"\n\n"+(campaign.State.characters.FirstOrDefault(c=>c.id==inspectedId) is CharacterState c?(c.alive?"Énergie "+c.energy.ToString("0")+" · Fatigue "+c.fatigue.ToString("0"):"Décédé"):"Lieu du village")+"\n"+Vector3.Distance(campaign.bindings.player.position,inspected.position).ToString("0")+" m\n\n"+navigation.Status;
        }
    }
}
