using System;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
namespace UngaBunga45001
{
    public static class TribalStyle
    {
        public static readonly Color Ink=new Color(.018f,.014f,.031f,.93f),Paper=new Color(.94f,.93f,.92f),Muted=new Color(.63f,.6f,.67f),Gold=new Color(1,.71f,.03f),Orange=new Color(1,.43f,.015f),Cyan=new Color(.02f,.91f,.75f),Violet=new Color(.42f,.08f,.85f),Pink=new Color(.95f,.3f,.7f),Danger=new Color(.95f,.18f,.16f);
        public static RectTransform Top(Transform parent,string name,float x,float y,float width,float height)=>AdventureUI.Rect(parent,name,new Vector2(0,1),new Vector2(0,1),new Vector2(x,-y),new Vector2(width,height));
        public static TribalPolygon Panel(RectTransform rect,string kind="panel",Color? left=null,Color? right=null,bool raycast=false)
        {var shape=rect.gameObject.AddComponent<TribalPolygon>();shape.kind=kind;shape.left=left??Ink;shape.right=right??shape.left;shape.raycastTarget=raycast;return shape;}
        public static TMP_Text Text(RectTransform rect,TMP_FontAsset font,string value,float size=18,Color? color=null,bool heading=false)
        {var text=AdventureUI.Text(rect,font,value,size,color??Paper,TextAlignmentOptions.TopLeft);text.characterSpacing=heading?2:0;text.lineSpacing=2;return text;}
        public static UnityEngine.UI.Button Button(RectTransform rect,TMP_FontAsset font,string label,UnityEngine.Events.UnityAction action,bool selected=false,string kind="row")
        {
            var face=Panel(rect,kind,selected?Gold:Ink,selected?Orange:Ink,true);var button=rect.gameObject.AddComponent<UnityEngine.UI.Button>();button.targetGraphic=face;button.onClick.AddListener(action);
            var colors=button.colors;colors.normalColor=Color.white;colors.highlightedColor=new Color(1,1,1,1);colors.pressedColor=new Color(.8f,.8f,.8f);colors.selectedColor=new Color(1,.96f,.85f);colors.disabledColor=new Color(.4f,.4f,.4f,.6f);colors.fadeDuration=.1f;button.colors=colors;
            float padding=kind=="row"?Mathf.Max(6,rect.rect.width*.08f+4):10;var labelRect=AdventureUI.Fill(rect,"Libellé",6);labelRect.offsetMin=new Vector2(padding,6);labelRect.offsetMax=new Vector2(-padding,-6);var text=Text(labelRect,font,label,18,selected?new Color(.06f,.035f,.025f):Paper);text.alignment=TextAlignmentOptions.MidlineLeft;return button;
        }
        public static Texture2D Texture(string id)=>Resources.Load<Texture2D>("TribalUI/Icons/"+id);
        public static UnityEngine.UI.RawImage Icon(RectTransform rect,string id,Color? tint=null)
        {var image=rect.gameObject.AddComponent<UnityEngine.UI.RawImage>();image.texture=Texture(id);image.color=tint??Color.white;image.raycastTarget=false;if(image.texture==null){image.color=Color.clear;AdventureUI.Shape(AdventureUI.Fill(rect,"Signe",rect.rect.width*.18f),tint??Gold,id=="notebook"?"book":id=="danger"?"cross":"diamond");}return image;}
        public static void Portrait(RectTransform rect,string id,bool alive=true)
        {
            AdventureUI.Shape(rect,alive?Paper:Muted);var mask=AdventureUI.Fill(rect,"Masque losange",2);AdventureUI.Shape(mask,new Color(.04f,.025f,.06f));mask.gameObject.AddComponent<UnityEngine.UI.Mask>();
            var image=AdventureUI.Fill(mask,"Portrait natif").gameObject.AddComponent<UnityEngine.UI.RawImage>();image.texture=Resources.Load<Texture2D>("TribalUI/Portraits/"+id);image.color=alive?Color.white:new Color(.5f,.5f,.5f);image.raycastTarget=false;
        }
        public static TribalMeter Meter(RectTransform rect,Func<float> value,Color? left=null,Color? right=null)
        {var meter=rect.gameObject.AddComponent<TribalMeter>();meter.value=value;meter.left=left??Cyan;meter.right=right??Cyan;meter.raycastTarget=false;return meter;}
        public static RectTransform Scroll(RectTransform parent,string name,float x,float y,float width,float height,bool horizontal=false)
        {
            var root=Top(parent,name,x,y,width,height);var scroll=root.gameObject.AddComponent<UnityEngine.UI.ScrollRect>();scroll.horizontal=horizontal;scroll.vertical=!horizontal;scroll.movementType=UnityEngine.UI.ScrollRect.MovementType.Clamped;
            var viewport=AdventureUI.Fill(root,"Viewport");var image=viewport.gameObject.AddComponent<UnityEngine.UI.Image>();image.color=Color.white;image.raycastTarget=true;viewport.gameObject.AddComponent<UnityEngine.UI.Mask>().showMaskGraphic=false;
            var content=Top(viewport,"Content",0,0,width,height);var layout=content.gameObject.AddComponent<UnityEngine.UI.VerticalLayoutGroup>();layout.padding=new RectOffset(0,3,0,0);layout.spacing=6;layout.childControlWidth=layout.childControlHeight=true;layout.childForceExpandWidth=true;layout.childForceExpandHeight=false;
            var fitter=content.gameObject.AddComponent<UnityEngine.UI.ContentSizeFitter>();fitter.verticalFit=UnityEngine.UI.ContentSizeFitter.FitMode.PreferredSize;scroll.viewport=viewport;scroll.content=content;return content;
        }
        public static RectTransform Row(RectTransform parent,string name,float height)
        {var row=Top(parent,name,0,0,parent.rect.width,height);var layout=row.gameObject.AddComponent<UnityEngine.UI.LayoutElement>();layout.preferredHeight=height;layout.minHeight=height;return row;}
        public static RectTransform Grid(RectTransform parent,string name,float x,float y,float width,float height,int columns,float cell)
        {
            var root=Top(parent,name,x,y,width,height);var scroll=root.gameObject.AddComponent<UnityEngine.UI.ScrollRect>();scroll.horizontal=false;scroll.movementType=UnityEngine.UI.ScrollRect.MovementType.Clamped;
            var viewport=AdventureUI.Fill(root,"Viewport");var image=viewport.gameObject.AddComponent<UnityEngine.UI.Image>();image.color=Color.white;image.raycastTarget=true;viewport.gameObject.AddComponent<UnityEngine.UI.Mask>().showMaskGraphic=false;
            var content=Top(viewport,"Content",0,0,width,0);var grid=content.gameObject.AddComponent<UnityEngine.UI.GridLayoutGroup>();grid.cellSize=Vector2.one*cell;grid.spacing=Vector2.one*6;grid.constraint=UnityEngine.UI.GridLayoutGroup.Constraint.FixedColumnCount;grid.constraintCount=columns;grid.padding=new RectOffset(0,3,0,0);
            var fit=content.gameObject.AddComponent<UnityEngine.UI.ContentSizeFitter>();fit.verticalFit=UnityEngine.UI.ContentSizeFitter.FitMode.PreferredSize;scroll.viewport=viewport;scroll.content=content;return content;
        }
    }
    [RequireComponent(typeof(CanvasRenderer))]public sealed class TribalPolygon:UnityEngine.UI.MaskableGraphic
    {
        public Color left=Color.black,right=Color.black,border=Color.clear;public string kind="panel";public float thickness=1.5f;
        protected override void OnPopulateMesh(UnityEngine.UI.VertexHelper mesh)
        {
            mesh.Clear();var r=rectTransform.rect;
            Vector2[] points=kind=="row"||kind=="tab"?new[]{new Vector2(.035f,0),new Vector2(.955f,0),new Vector2(1,1),new Vector2(.08f,1)}:kind=="slot"?new[]{new Vector2(0,0),new Vector2(.98f,0),new Vector2(1,.93f),new Vector2(.98f,1),new Vector2(0,1)}:new[]{new Vector2(.01f,0),new Vector2(.985f,.012f),new Vector2(1,.965f),new Vector2(.965f,1),new Vector2(.018f,.99f),new Vector2(0,.04f)};
            void Polygon(Rect box,Color a,Color b){int start=mesh.currentVertCount;foreach(var p in points)mesh.AddVert(new Vector3(box.x+p.x*box.width,box.y+p.y*box.height),Color.Lerp(a,b,p.x)*color,Vector2.zero);for(int i=1;i<points.Length-1;i++)mesh.AddTriangle(start,start+i,start+i+1);}
            if(border.a>0){Polygon(r,border,border);r=new Rect(r.x+thickness,r.y+thickness,Mathf.Max(0,r.width-2*thickness),Mathf.Max(0,r.height-2*thickness));}Polygon(r,left,right);
        }
        protected override void OnEnable(){base.OnEnable();SetVerticesDirty();}
    }
    [RequireComponent(typeof(CanvasRenderer))]public sealed class TribalMeter:UnityEngine.UI.MaskableGraphic
    {
        public Func<float> value;public Color left=Color.cyan,right=Color.cyan;float shown=-1;
        void Update(){float next=Mathf.Clamp01(value?.Invoke()??0);if(!Mathf.Approximately(next,shown)){shown=next;SetVerticesDirty();}}
        protected override void OnPopulateMesh(UnityEngine.UI.VertexHelper mesh)
        {
            mesh.Clear();var r=rectTransform.rect;void Bar(float width,Color a,Color b){int start=mesh.currentVertCount;mesh.AddVert(new Vector3(r.x,r.y),a,Vector2.zero);mesh.AddVert(new Vector3(r.x+width,r.y),b,Vector2.zero);mesh.AddVert(new Vector3(r.x+width+r.height*.7f,r.yMax),b,Vector2.zero);mesh.AddVert(new Vector3(r.x+r.height*.7f,r.yMax),a,Vector2.zero);mesh.AddTriangle(start,start+1,start+2);mesh.AddTriangle(start,start+2,start+3);}Bar(r.width-r.height*.7f,new Color(0,0,0,.85f),new Color(0,0,0,.85f));if(shown>0)Bar((r.width-r.height*.7f)*shown,left,right);
        }
    }
    public sealed class TribalTip:MonoBehaviour,IPointerEnterHandler,IPointerExitHandler
    {public Action<string> show;public Action hide;public string text;public void OnPointerEnter(PointerEventData data)=>show?.Invoke(text);public void OnPointerExit(PointerEventData data)=>hide?.Invoke();void OnDisable()=>hide?.Invoke();}
}
