using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed class AccidentInterface:MonoBehaviour
    {
        CampaignRuntime campaign;AccidentDirector director;RectTransform panel,upper,lower,mobileBody;TMP_Text title,causes;string key;
        public void Build(CampaignRuntime runtime,Canvas canvas,TMP_FontAsset font,Texture2D portrait)
        {
            campaign=runtime;director=GetComponent<AccidentDirector>();
            panel=AdventureUI.Rect(canvas.transform,"Fin de tentative de Dylan",Vector2.one*.5f,Vector2.one*.5f,Vector2.zero,new Vector2(1180,740));var background=AdventureUI.Shape(panel,new Color(.035f,.02f,.024f,.96f),"panel");background.raycastTarget=true;
            var rim=AdventureUI.Rect(panel,"Portrait de Dylan",new Vector2(.5f,1),new Vector2(.5f,1),new Vector2(0,55),new Vector2(110,110));AdventureUI.Shape(rim,AdventureUI.Paper);var mask=AdventureUI.Fill(rim,"Masque",4);AdventureUI.Shape(mask,Color.white);mask.gameObject.AddComponent<UnityEngine.UI.Mask>();var raw=AdventureUI.Fill(mask,"Dylan").gameObject.AddComponent<UnityEngine.UI.RawImage>();raw.texture=portrait;raw.raycastTarget=false;
            title=AdventureUI.Text(AdventureUI.Rect(panel,"Titre",new Vector2(0,1),new Vector2(0,1),new Vector2(50,-92),new Vector2(1080,140)),font,"",32,AdventureUI.Gold,TextAlignmentOptions.Center);
            causes=AdventureUI.Text(AdventureUI.Rect(panel,"Causes et prévention",new Vector2(0,1),new Vector2(0,1),new Vector2(65,-255),new Vector2(1050,330)),font,"",24);
            AdventureUI.Button(AdventureUI.Rect(panel,"Recommencer",Vector2.zero,Vector2.zero,new Vector2(40,42),new Vector2(310,58)),font,"RECOMMENCER",()=>director.Retry());
            AdventureUI.Button(AdventureUI.Rect(panel,"Comprendre",Vector2.zero,Vector2.zero,new Vector2(375,42),new Vector2(430,58)),font,"COMPRENDRE L’ACCIDENT",()=>director.ToggleAnalysis());
            AdventureUI.Button(AdventureUI.Rect(panel,"Menu",Vector2.zero,Vector2.zero,new Vector2(830,42),new Vector2(310,58)),font,"REVENIR AU MENU",()=>{if(director.Retry())campaign.GetComponent<AdventureMenus>().Open("Réglages");});
            upper=AdventureUI.Fill(canvas.transform,"Bande cinéma accident haute");upper.anchorMin=new Vector2(0,.9f);AdventureUI.Panel(upper,Color.black);
            lower=AdventureUI.Fill(canvas.transform,"Bande cinéma accident basse");lower.anchorMax=new Vector2(1,.18f);AdventureUI.Panel(lower,Color.black);
            panel.gameObject.SetActive(false);upper.gameObject.SetActive(false);lower.gameObject.SetActive(false);
        }
        void Update()
        {
            if(panel==null||director==null)return;panel.gameObject.SetActive(director.DeathScreen);upper.gameObject.SetActive(director.Playing);lower.gameObject.SetActive(director.Playing);
            if(!director.DeathScreen)return;panel.SetAsLastSibling();if(MobileControls.TouchActive)LayoutMobile();string stamp=director.Current?.id+":"+director.Analysis;if(key==stamp)return;key=stamp;var d=director.Current;if(d==null)return;
            title.text=d.title;causes.text=director.Analysis?"SIGNAUX D’ALERTE\n"+d.warning+"\n\nMESURES QUI AURAIENT ÉVITÉ L’ÉVÉNEMENT\n"+d.correctiveAction+"\n\nL’analyse porte sur les décisions, les moyens et l’organisation.":"Cause immédiate : "+d.immediateCause+"\n\nAlerte ignorée : oui.\n\nCause organisationnelle : "+d.organizationalCause+"\n\nRéférence pédagogique : ISO 45001, "+string.Join(", ",d.iso)+".";
        }
        void LayoutMobile()
        {
            var mobile=MobileControls.Instance;var size=mobile.Viewport-Vector2.one*24;panel.sizeDelta=size;panel.localScale=Vector3.one*mobile.Units;bool narrow=size.x<600;float footer=narrow?164:60;
            var rim=panel.Find("Portrait de Dylan") as RectTransform;rim.anchorMin=rim.anchorMax=new Vector2(0,1);rim.pivot=new Vector2(0,1);rim.anchoredPosition=new Vector2(12,-10);rim.sizeDelta=Vector2.one*60;
            title.rectTransform.anchoredPosition=new Vector2(84,-10);title.rectTransform.sizeDelta=new Vector2(size.x-96,70);title.fontSize=20;
            if(mobileBody==null){var root=AdventureUI.Rect(panel,"Lecture des causes",new Vector2(0,1),new Vector2(0,1),new Vector2(12,-86),Vector2.one);AdventureUI.Panel(root,new Color(0,0,0,.001f)).raycastTarget=true;root.gameObject.AddComponent<UnityEngine.UI.RectMask2D>();var scroll=root.gameObject.AddComponent<UnityEngine.UI.ScrollRect>();scroll.horizontal=false;scroll.movementType=UnityEngine.UI.ScrollRect.MovementType.Clamped;mobileBody=AdventureUI.Rect(root,"Contenu des causes",new Vector2(0,1),new Vector2(0,1),Vector2.zero,Vector2.one);causes.transform.SetParent(mobileBody,false);scroll.viewport=root;scroll.content=mobileBody;}
            var viewport=mobileBody.parent as RectTransform;viewport.sizeDelta=new Vector2(size.x-24,Mathf.Max(80,size.y-98-footer));causes.fontSize=16;float height=Mathf.Max(viewport.rect.height,causes.GetPreferredValues(causes.text,size.x-36,Mathf.Infinity).y+12);mobileBody.sizeDelta=new Vector2(size.x-24,height);causes.rectTransform.anchorMin=Vector2.zero;causes.rectTransform.anchorMax=Vector2.one;causes.rectTransform.offsetMin=Vector2.zero;causes.rectTransform.offsetMax=Vector2.zero;
            int index=0;foreach(string name in new[]{"Recommencer","Comprendre","Menu"}){var r=panel.Find(name) as RectTransform;r.anchoredPosition=new Vector2(narrow?12:12+index*(size.x-24)/3,narrow?12+(2-index)*52:12);r.sizeDelta=new Vector2(narrow?size.x-24:(size.x-36)/3,44);var label=r.GetComponentInChildren<TMP_Text>();label.text=name;label.fontSize=16;index++;}
        }
    }
}
