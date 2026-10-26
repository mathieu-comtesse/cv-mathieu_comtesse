using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
namespace UngaBunga45001
{
    public static class AdventureUI
    {
        public static readonly Color Gold=new Color(1,.76f,.3f), Paper=new Color(.95f,.9f,.78f), Ink=new Color(.035f,.027f,.045f,.85f);
        public static RectTransform Rect(Transform parent,string name,Vector2 anchor,Vector2 pivot,Vector2 position,Vector2 size)
        {var go=new GameObject(name,typeof(RectTransform));go.transform.SetParent(parent,false);var r=go.GetComponent<RectTransform>();r.anchorMin=r.anchorMax=anchor;r.pivot=pivot;r.anchoredPosition=position;r.sizeDelta=size;return r;}
        public static RectTransform Fill(Transform parent,string name,float inset=0)
        {var r=Rect(parent,name,Vector2.zero,Vector2.zero,Vector2.zero,Vector2.zero);r.anchorMax=Vector2.one;r.offsetMin=Vector2.one*inset;r.offsetMax=Vector2.one*-inset;return r;}
        public static UnityEngine.UI.Image Panel(RectTransform rect,Color color)
        {var image=rect.gameObject.AddComponent<UnityEngine.UI.Image>();image.color=color;image.raycastTarget=false;return image;}
        public static TMP_Text Text(RectTransform rect,TMP_FontAsset font,string value,float size=22,Color? color=null,TextAlignmentOptions alignment=TextAlignmentOptions.MidlineLeft)
        {var t=rect.gameObject.AddComponent<TextMeshProUGUI>();t.font=font;t.fontSize=size;t.color=color??Paper;t.text=value;t.alignment=alignment;t.raycastTarget=false;t.textWrappingMode=TextWrappingModes.Normal;t.overflowMode=TextOverflowModes.Ellipsis;return t;}
        public static UnityEngine.UI.Button Button(RectTransform rect,TMP_FontAsset font,string value,UnityEngine.Events.UnityAction action)
        {var image=Panel(rect,new Color(.19f,.13f,.11f,.94f));image.raycastTarget=true;var b=rect.gameObject.AddComponent<UnityEngine.UI.Button>();b.targetGraphic=image;b.onClick.AddListener(action);var c=b.colors;c.highlightedColor=new Color(1,.87f,.62f);c.selectedColor=c.highlightedColor;b.colors=c;Text(Fill(rect,"Libellé",8),font,value,21);return b;}
        public static AdventureShape Shape(RectTransform rect,Color color,string kind="diamond")
        {var shape=rect.gameObject.AddComponent<AdventureShape>();shape.color=color;shape.kind=kind;shape.raycastTarget=false;return shape;}
    }
    [RequireComponent(typeof(CanvasRenderer))]public sealed class AdventureShape:UnityEngine.UI.MaskableGraphic
    {
        public string kind="diamond";
        protected override void OnPopulateMesh(UnityEngine.UI.VertexHelper vh)
        {
            vh.Clear();var r=rectTransform.rect;var paint=color;
            void Poly(params Vector2[] points){int n=vh.currentVertCount;foreach(var p in points)vh.AddVert(new Vector3(r.x+p.x*r.width,r.y+p.y*r.height),paint,Vector2.zero);for(int i=1;i<points.Length-1;i++)vh.AddTriangle(n,n+i,n+i+1);}
            if(kind.StartsWith("mouse-"))
            {
                Poly(new Vector2(.16f,.05f),new Vector2(.02f,.3f),new Vector2(.02f,.72f),new Vector2(.18f,.95f),new Vector2(.5f,1),new Vector2(.82f,.95f),new Vector2(.98f,.72f),new Vector2(.98f,.3f),new Vector2(.84f,.05f));
                paint=new Color(1,.55f,.08f);if(kind=="mouse-left")Poly(new Vector2(.08f,.6f),new Vector2(.08f,.76f),new Vector2(.23f,.93f),new Vector2(.46f,.96f),new Vector2(.46f,.6f));else Poly(new Vector2(.54f,.6f),new Vector2(.54f,.96f),new Vector2(.78f,.93f),new Vector2(.92f,.76f),new Vector2(.92f,.6f));
                paint=new Color(.12f,.12f,.15f);Poly(new Vector2(.47f,.59f),new Vector2(.53f,.59f),new Vector2(.53f,.98f),new Vector2(.47f,.98f));Poly(new Vector2(.03f,.57f),new Vector2(.97f,.57f),new Vector2(.97f,.61f),new Vector2(.03f,.61f));
            }
            else if(kind=="talk"){Poly(new Vector2(.04f,.25f),new Vector2(.04f,.9f),new Vector2(.96f,.9f),new Vector2(.96f,.25f));Poly(new Vector2(.17f,.3f),new Vector2(.17f,.02f),new Vector2(.48f,.3f));}
            else if(kind=="inspect"){var points=new Vector2[18];for(int i=0;i<18;i++){float a=i*Mathf.PI*2/18;points[i]=new Vector2(.4f+Mathf.Cos(a)*.36f,.6f+Mathf.Sin(a)*.36f);}Poly(points);Poly(new Vector2(.55f,.28f),new Vector2(.72f,.45f),new Vector2(.99f,.12f),new Vector2(.86f,0));paint=new Color(.09f,.04f,.13f);for(int i=0;i<18;i++){float a=i*Mathf.PI*2/18;points[i]=new Vector2(.4f+Mathf.Cos(a)*.23f,.6f+Mathf.Sin(a)*.23f);}Poly(points);}
            else if(kind=="lock"){Poly(new Vector2(.13f,.03f),new Vector2(.87f,.03f),new Vector2(.87f,.55f),new Vector2(.13f,.55f));Poly(new Vector2(.24f,.5f),new Vector2(.24f,.84f),new Vector2(.4f,.98f),new Vector2(.6f,.98f),new Vector2(.76f,.84f),new Vector2(.76f,.5f));paint=new Color(.08f,.07f,.1f);Poly(new Vector2(.38f,.55f),new Vector2(.38f,.78f),new Vector2(.5f,.86f),new Vector2(.62f,.78f),new Vector2(.62f,.55f));}
            else if(kind=="check"){Poly(new Vector2(.04f,.45f),new Vector2(.19f,.59f),new Vector2(.48f,.23f),new Vector2(.35f,.07f));Poly(new Vector2(.35f,.07f),new Vector2(.49f,.02f),new Vector2(.98f,.86f),new Vector2(.82f,.98f));}
            else if(kind=="circle"){var points=new Vector2[26];for(int i=0;i<26;i++){float a=i*Mathf.PI*2/26;points[i]=new Vector2(.5f+Mathf.Cos(a)*.5f,.5f+Mathf.Sin(a)*.5f);}Poly(points);}
            else if(kind=="panel")Poly(new Vector2(.012f,0),new Vector2(.992f,.009f),new Vector2(1,.93f),new Vector2(.984f,1),new Vector2(.006f,.988f),new Vector2(0,.06f));
            else if(kind=="house"){Poly(new Vector2(0,.55f),new Vector2(.5f,1),new Vector2(1,.55f));Poly(new Vector2(.14f,.04f),new Vector2(.86f,.04f),new Vector2(.86f,.58f),new Vector2(.14f,.58f));}
            else if(kind=="arrow")Poly(new Vector2(.5f,1),new Vector2(.06f,.06f),new Vector2(.5f,.3f),new Vector2(.94f,.06f));
            else if(kind=="bar")Poly(new Vector2(0,1),new Vector2(1,1),new Vector2(.97f,0),new Vector2(.025f,0));
            else if(kind=="stone")Poly(new Vector2(.08f,.18f),new Vector2(.02f,.65f),new Vector2(.42f,.97f),new Vector2(.92f,.75f),new Vector2(.98f,.2f),new Vector2(.5f,.02f));
            else if(kind=="wood")Poly(new Vector2(.1f,0),new Vector2(.02f,.72f),new Vector2(.26f,1),new Vector2(.88f,.24f),new Vector2(.74f,.03f));
            else if(kind=="food")Poly(new Vector2(.14f,.13f),new Vector2(.02f,.55f),new Vector2(.24f,.9f),new Vector2(.72f,.98f),new Vector2(.98f,.63f),new Vector2(.85f,.2f));
            else if(kind=="fiber"){Poly(new Vector2(.1f,0),new Vector2(.2f,1),new Vector2(.4f,1),new Vector2(.28f,0));Poly(new Vector2(.5f,0),new Vector2(.6f,1),new Vector2(.8f,.9f),new Vector2(.68f,0));}
            else if(kind=="book")Poly(new Vector2(.08f,.08f),new Vector2(.08f,.95f),new Vector2(.86f,.83f),new Vector2(.92f,.06f));
            else if(kind=="tool"){Poly(new Vector2(.18f,0),new Vector2(.58f,1),new Vector2(.72f,.92f),new Vector2(.34f,0));Poly(new Vector2(.32f,.9f),new Vector2(.9f,.95f),new Vector2(.99f,.56f),new Vector2(.5f,.62f));}
            else if(kind=="cross"){Poly(new Vector2(.36f,0),new Vector2(.64f,0),new Vector2(.64f,1),new Vector2(.36f,1));Poly(new Vector2(0,.36f),new Vector2(1,.36f),new Vector2(1,.64f),new Vector2(0,.64f));}
            else Poly(new Vector2(.5f,1),new Vector2(1,.5f),new Vector2(.5f,0),new Vector2(0,.5f));
        }
    }
    public sealed class AdventureTooltip:MonoBehaviour,IPointerEnterHandler,IPointerExitHandler
    {public TMP_Text label;public string caption;public void OnPointerEnter(PointerEventData e){label.text=caption;label.gameObject.SetActive(true);}public void OnPointerExit(PointerEventData e){label.gameObject.SetActive(false);}}
    public sealed class WorldMapProjection
    {
        public Vector2 origin,size;
        public WorldMapProjection(Vector2 from,Vector2 extent){origin=from;size=extent;}
        public Vector2 ToUv(Vector3 world)=>new Vector2((world.x-origin.x)/size.x,(world.z-origin.y)/size.y);
        public Vector3 ToWorld(Vector2 uv,float height=0)=>new Vector3(origin.x+uv.x*size.x,height,origin.y+uv.y*size.y);
        public Vector2 Project(Vector3 world,Rect crop,float heading=0){var uv=ToUv(world);var p=new Vector2((uv.x-crop.x)/crop.width-.5f,(uv.y-crop.y)/crop.height-.5f);return (Vector2)(Quaternion.Euler(0,0,heading)*p)+Vector2.one*.5f;}
    }
}
