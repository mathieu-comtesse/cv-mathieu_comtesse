using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class VillagePresentationViewV18:MonoBehaviour
 {
  RectTransform root;TMP_Text title;VillageUpgradeV18 village;
  void Update()
  {
   if(village==null)village=GetComponent<VillageUpgradeV18>();if(village==null)return;
   if(root==null)
   {
    var hud=GetComponent<CampaignHud>();if(hud?.Canvas==null)return;
    root=AdventureUI.Rect(hud.Canvas.transform,"Révélation du totem",new Vector2(.5f,0),new Vector2(.5f,0),new Vector2(0,40),new Vector2(900,190));TribalStyle.Panel(root);
    title=TribalStyle.Text(TribalStyle.Top(root,"Chapitre réellement terminé",25,12,850,115),hud.font,"",28,TribalStyle.Gold,true);title.alignment=TextAlignmentOptions.Center;
    TribalStyle.Button(TribalStyle.Top(root,"Passer",25,136,850,42),hud.font,"REVENIR AU VILLAGE",village.SkipPresentation);
   }
   bool show=village.Presenting;root.gameObject.SetActive(show);if(show){title.text=village.PresentationTitle;root.localScale=Vector3.one*Mathf.Min(1,((RectTransform)root.parent).rect.width/960);}
  }
 }
}
