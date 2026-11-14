using System.Linq;
using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class MainQuestMarkerV18:MonoBehaviour
 {
  CampaignRuntime c;QuestNavigationController navigation;UISettingsController settings;RectTransform root,diamond,tablet;TMP_Text nameText,titleText;Canvas canvas;float nextCheck;Transform target,head;string id="",title="";bool occluded;
  public string TargetId=>id;public bool Visible=>root!=null&&root.gameObject.activeSelf;public int Transfers{get;private set;}
  void Start(){c=GetComponent<CampaignRuntime>();navigation=GetComponent<QuestNavigationController>();settings=GetComponent<UISettingsController>();}
  void Build()
  {
   var hud=GetComponent<CampaignHud>();if(hud?.Canvas==null)return;canvas=hud.Canvas;
   root=AdventureUI.Rect(canvas.transform,"Quête principale · double losange V18",new Vector2(.5f,.5f),new Vector2(.5f,0),Vector2.zero,new Vector2(270,105));
   diamond=AdventureUI.Rect(root,"Double contour doré",new Vector2(.5f,1),new Vector2(.5f,1),Vector2.zero,new Vector2(50,50));
   var graphic=diamond.gameObject.AddComponent<QuestDiamondGraphicV18>();graphic.raycastTarget=false;
   tablet=AdventureUI.Rect(root,"Repère d’activité · tablette",new Vector2(.5f,1),new Vector2(.5f,1),Vector2.zero,new Vector2(42,47));
   TribalStyle.Panel(tablet,"panel",new Color(.61f,.42f,.24f));TribalStyle.Icon(AdventureUI.Fill(tablet,"Inscription",9),"book");
   var band=TribalStyle.Top(root,"Bandeau du référent",0,56,270,49);TribalStyle.Panel(band,"row");
   nameText=TribalStyle.Text(TribalStyle.Top(band,"Nom",15,3,240,24),hud.font,"",18,TribalStyle.Paper,true);nameText.alignment=TextAlignmentOptions.Center;nameText.fontStyle=FontStyles.Bold;
   titleText=TribalStyle.Text(TribalStyle.Top(band,"Mission",15,26,240,21),hud.font,"",13,TribalStyle.Gold);titleText.alignment=TextAlignmentOptions.Center;
   var button=band.gameObject.AddComponent<UnityEngine.UI.Button>();button.targetGraphic=band.GetComponent<UnityEngine.UI.Graphic>();
   if(button.targetGraphic!=null)button.targetGraphic.raycastTarget=true;
   button.onClick.AddListener(()=>{
    var step=c.Objectives.Current;if(step?.Action==null)return;
    if(c.Near(step.TargetBindingId)&&step.Phase!=ObjectivePhase.Travel)GetComponent<WorldInteraction>().Execute(step.Action.id);
    else navigation.Follow(step.Action.id);
   });
  }
  void Resolve()
  {
   var step=c.Objectives.Current;
   string next=step?.TargetBindingId??"";
   if(next!=id)
   {
    id=next;Transfers++;
    target=c.bindings.Find(id);
    head=target!=null&&step?.TargetObjectId==null?c.bindings.AnimatorFor(id)?.GetBoneTransform(HumanBodyBones.Head):null;
   }
   bool assembly=step?.Action?.id==QuestGuidanceV243.Sst;
   bool tabletMarker=step?.TargetObjectId!=null||step?.Optional==true;
   string header=step?.Phase switch
   {
    ObjectivePhase.Offer=>"MISSION PRINCIPALE",
    ObjectivePhase.Validate=>"VALIDER LA MISSION",
    ObjectivePhase.Claim=>"RÉCLAMER LA RÉCOMPENSE",
    _=>step?.Optional==true?"OBJECTIF FACULTATIF":assembly?"ASSEMBLER LE SYSTÈME SST":step?.Verb.ToUpperInvariant()
   };
   nameText.text=header??"";
   nameText.enableAutoSizing=true;nameText.fontSizeMin=13;nameText.fontSizeMax=18;
   title=assembly?QuestGuidanceV243.Command(settings)+" · Interagir":step?.TargetObjectId!=null?step.Site:c.CharacterName(id);
   diamond.gameObject.SetActive(!tabletMarker);tablet.gameObject.SetActive(tabletMarker);
  }
  void LateUpdate()
  {
   if(c?.State==null)return;if(root==null){Build();if(root==null)return;}
   if(Time.unscaledTime>=nextCheck)
   {
    nextCheck=Time.unscaledTime+.15f;Resolve();occluded=false;
    if(target!=null){var p=MarkerPosition();var cam=c.bindings.gameplayCamera;
     foreach(var hit in Physics.RaycastAll(cam.transform.position,p-cam.transform.position,Vector3.Distance(cam.transform.position,p),~0,QueryTriggerInteraction.Ignore))
      if(!hit.transform.IsChildOf(target)&&!hit.transform.IsChildOf(c.bindings.player)&&hit.collider.GetComponentInParent<Animator>()==null){occluded=true;break;}}
   }
   bool visible=target!=null&&!c.IsModal&&!c.IsBusy&&!occluded&&(GetComponent<UISettingsController>()?.preferences.worldMarkers??true);
   var camera=c.bindings.gameplayCamera;var at=MarkerPosition();
   var screen=camera.WorldToScreenPoint(at);float distance=Vector3.Distance(camera.transform.position,at);visible&=screen.z>camera.nearClipPlane&&distance<65&&screen.x>12&&screen.x<Screen.width-12&&screen.y<Screen.height-12;
   if(root.gameObject.activeSelf!=visible)root.gameObject.SetActive(visible);if(!visible)return;
   if(c.Objectives.Current?.TargetObjectId!=null){screen.x=Mathf.Clamp(screen.x,145,Screen.width-145);screen.y=Mathf.Min(screen.y,Screen.height-116);}
   RectTransformUtility.ScreenPointToLocalPointInRectangle(canvas.transform as RectTransform,screen,canvas.renderMode==RenderMode.ScreenSpaceOverlay?null:canvas.worldCamera,out var local);root.anchoredPosition=local;
   float scale=(Screen.width<700?.82f:1)/Mathf.Max(.01f,canvas.scaleFactor);root.localScale=Vector3.one*scale;
   diamond.localScale=Vector3.one*(settings.preferences.reducedMotion?1:1+.025f*Mathf.Sin(Time.unscaledTime*2));
   string text=distance>28?"":title;if(titleText.text!=text)titleText.text=text;
  }
  Vector3 MarkerPosition()
  {
   if(target==null)return Vector3.zero;
   if(c.Objectives.Current?.TargetObjectId!=null)
    return navigation.Target==target&&navigation.Corners.Length>=2?navigation.InteractionPoint+Vector3.up*1.8f:
      target.position+Vector3.up*(id==QuestGuidanceV243.Menhir?3.4f:2.1f);
   return head!=null?head.position+Vector3.up*.42f:target.position+Vector3.up*2.2f;
  }
 }
 public sealed class QuestDiamondGraphicV18:UnityEngine.UI.MaskableGraphic
 {
  protected override void OnPopulateMesh(UnityEngine.UI.VertexHelper vh)
  {
   vh.Clear();var r=rectTransform.rect;var center=r.center;
   void D(float s,Color c){int start=vh.currentVertCount;vh.AddVert(center+new Vector2(0,r.height*.5f*s),c,Vector2.zero);vh.AddVert(center+new Vector2(r.width*.5f*s,0),c,Vector2.zero);vh.AddVert(center-new Vector2(0,r.height*.5f*s),c,Vector2.zero);vh.AddVert(center-new Vector2(r.width*.5f*s,0),c,Vector2.zero);vh.AddTriangle(start,start+1,start+2);vh.AddTriangle(start,start+2,start+3);}
   D(1,TribalStyle.Gold);D(.89f,new Color(.09f,.05f,.02f));D(.76f,TribalStyle.Gold);D(.66f,new Color(1,.83f,.15f));
   void Quad(Vector2 a,Vector2 b){int i=vh.currentVertCount;vh.AddVert(center+a,Color.white,Vector2.zero);vh.AddVert(center+new Vector2(b.x,a.y),Color.white,Vector2.zero);vh.AddVert(center+b,Color.white,Vector2.zero);vh.AddVert(center+new Vector2(a.x,b.y),Color.white,Vector2.zero);vh.AddTriangle(i,i+1,i+2);vh.AddTriangle(i,i+2,i+3);}
   Quad(new Vector2(-2,-3),new Vector2(2,11));Quad(new Vector2(-2,-9),new Vector2(2,-5));
  }
 }
}
