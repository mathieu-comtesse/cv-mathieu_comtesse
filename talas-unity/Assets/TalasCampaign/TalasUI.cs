using UnityEngine;
using TMPro;
using UnityEngine.UI;
using UnityEngine.EventSystems;
public static class TalasUI
{
 public static TMP_FontAsset Font;
 public static readonly Color Ink=new Color(0,0,0,.8f), Amber=new Color(1,.428571f,0,.737255f),Paper=new Color(.86f,.86f,.83f);
 static Sprite LoadSprite(string name)=>Resources.Load<Sprite>("SilverUI/"+name);
 public static GameObject Canvas(string name,int order)
 {
  var go=new GameObject(name,typeof(RectTransform),typeof(Canvas),typeof(CanvasScaler),typeof(GraphicRaycaster));go.GetComponent<Canvas>().renderMode=RenderMode.ScreenSpaceOverlay;go.GetComponent<Canvas>().sortingOrder=order;
  var s=go.GetComponent<CanvasScaler>();s.uiScaleMode=CanvasScaler.ScaleMode.ScaleWithScreenSize;s.referenceResolution=new Vector2(1280,720);s.matchWidthOrHeight=1;
  if(Object.FindFirstObjectByType<EventSystem>()==null){var e=new GameObject("EventSystem",typeof(EventSystem));e.AddComponent<UnityEngine.InputSystem.UI.InputSystemUIInputModule>();}
  return go;
 }
 public static RectTransform Place(GameObject go,Transform parent,float x,float y,float w,float h)
 {
  go.transform.SetParent(parent,false);var r=go.GetComponent<RectTransform>();r.anchorMin=r.anchorMax=new Vector2(0,1);r.pivot=new Vector2(0,1);r.anchoredPosition=new Vector2(x,-y);r.sizeDelta=new Vector2(w,h);return r;
 }
 public static GameObject Panel(string name,Transform parent,float x,float y,float w,float h,Color? colour=null)
 {
  var go=new GameObject(name,typeof(RectTransform),typeof(Image));Place(go,parent,x,y,w,h);var image=go.GetComponent<Image>();image.color=colour??Ink;image.sprite=LoadSprite("Grittypanel01");image.type=Image.Type.Sliced;image.raycastTarget=false;return go;
 }
 public static TextMeshProUGUI Text(Transform parent,string text,float x,float y,float w,float h,float size=20)
 {
  var go=new GameObject("Texte",typeof(RectTransform));Place(go,parent,x,y,w,h);var t=go.AddComponent<TextMeshProUGUI>();t.font=Font??TMP_Settings.defaultFontAsset;t.text=text;t.fontSize=size;t.color=Paper;t.raycastTarget=false;t.textWrappingMode=TextWrappingModes.Normal;return t;
 }
 public static Button Button(Transform parent,string text,float x,float y,float w,float h,System.Action click)
 {
  var go=Panel(text,parent,x,y,w,h,new Color(.09f,.09f,.085f,.94f));var image=go.GetComponent<Image>();image.sprite=LoadSprite("GrittypanelActionButtonWhite");image.raycastTarget=true;var b=go.AddComponent<Button>();b.targetGraphic=image;b.transition=Selectable.Transition.None;
  var t=Text(go.transform,text,16,5,w-32,h-10,18);t.alignment=TextAlignmentOptions.MidlineLeft;t.enableAutoSizing=true;t.fontSizeMin=14;t.fontSizeMax=18;b.onClick.AddListener(()=>click());var style=go.AddComponent<TalasChoiceStyle>();style.label=t;style.image=image;style.button=b;return b;
 }
 public static TalasDialogueBar Dialogue(Transform parent,string speaker,string text,string portrait)
 {
  // Silver Pines CanvasGameUI is 1920x1080. Keep its measured coordinates inside a 2/3 scale root.
  var root=new GameObject("DialogueBar",typeof(RectTransform));root.transform.SetParent(parent,false);var rect=root.GetComponent<RectTransform>();rect.anchorMin=rect.anchorMax=new Vector2(.5f,.5f);rect.pivot=new Vector2(.5f,.5f);rect.anchoredPosition=new Vector2(0,-180);rect.sizeDelta=new Vector2(1123.1626f,285.977f);rect.localScale=Vector3.one*(2f/3f);
  var bg=new GameObject("DialogueBackground",typeof(RectTransform),typeof(Image));bg.transform.SetParent(root.transform,false);var br=bg.GetComponent<RectTransform>();br.anchorMin=new Vector2(0,.5f);br.anchorMax=new Vector2(1,.5f);br.pivot=new Vector2(.5f,.5f);br.anchoredPosition=new Vector2(0,-15.3237f);br.sizeDelta=new Vector2(0,197.8688f);var bi=bg.GetComponent<Image>();bi.sprite=LoadSprite("GrittyPanelDoubleSided");bi.type=Image.Type.Sliced;bi.color=Ink;bi.raycastTarget=false;
  var picture=new GameObject("PortraitLeft",typeof(RectTransform),typeof(Image),typeof(Mask));picture.transform.SetParent(root.transform,false);var pr=picture.GetComponent<RectTransform>();pr.anchorMin=pr.anchorMax=new Vector2(0,.5f);pr.pivot=new Vector2(0,.5f);pr.anchoredPosition=new Vector2(154,0);pr.sizeDelta=new Vector2(172,253.977f);picture.GetComponent<Image>().sprite=LoadSprite("portrait_mask");picture.GetComponent<Image>().raycastTarget=false;picture.GetComponent<Mask>().showMaskGraphic=false;
  var portraitImage=new GameObject("Portrait",typeof(RectTransform),typeof(Image));portraitImage.transform.SetParent(picture.transform,false);var pir=portraitImage.GetComponent<RectTransform>();pir.anchorMin=Vector2.zero;pir.anchorMax=Vector2.one;pir.offsetMin=pir.offsetMax=Vector2.zero;var pi=portraitImage.GetComponent<Image>();pi.sprite=LoadSprite("por-"+portrait);pi.preserveAspect=true;pi.raycastTarget=false;
  var name=Text(root.transform,speaker,0,0,400,36.5182f,26);name.gameObject.name="CharacterNameTextLeft";var nr=name.rectTransform;nr.anchorMin=nr.anchorMax=new Vector2(1,.5f);nr.pivot=Vector2.zero;nr.anchoredPosition=new Vector2(-764.26f,26.73f);name.fontStyle=FontStyles.Bold|FontStyles.UpperCase;name.color=Amber;name.alignment=TextAlignmentOptions.BottomLeft;
  var body=Text(root.transform,text,0,0,595.35f,140.59f,25);body.gameObject.name="SubtitleText";var tr=body.rectTransform;tr.anchorMin=tr.anchorMax=new Vector2(.5f,.5f);tr.pivot=new Vector2(.5f,.5f);tr.anchoredPosition=new Vector2(95,-7.0459f);body.color=new Color(.698113f,.698113f,.698113f);body.alignment=TextAlignmentOptions.MidlineLeft;body.lineSpacing=-16;body.overflowMode=TextOverflowModes.Page;
  var bar=root.AddComponent<TalasDialogueBar>();bar.body=body;bar.speaker=name;
  var more=new GameObject("MorePrompt",typeof(RectTransform),typeof(Image),typeof(Button));more.transform.SetParent(root.transform,false);var mr=more.GetComponent<RectTransform>();mr.anchorMin=mr.anchorMax=new Vector2(.5f,0);mr.pivot=Vector2.one;mr.anchoredPosition=new Vector2(16,-8.2f);mr.sizeDelta=new Vector2(32,10.5359f);var mi=more.GetComponent<Image>();mi.sprite=LoadSprite("DossierDownArrow");mi.color=Paper;var next=more.GetComponent<Button>();next.transition=Selectable.Transition.None;next.onClick.AddListener(()=>bar.NextPage());bar.next=next;
  body.raycastTarget=true;var bodyClick=body.gameObject.AddComponent<Button>();bodyClick.transition=Selectable.Transition.None;bodyClick.onClick.AddListener(()=>bar.NextPage());return bar;
 }
}
