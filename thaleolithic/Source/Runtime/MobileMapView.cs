using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed partial class CampaignMap
    {
        readonly List<Action> restoreMap=new List<Action>();bool mobileMap;
        void LateUpdate()
        {
            if(window==null||!IsOpen)return;if(tribalHost!=null){LayoutTribalMap();return;}
            if(!MobileControls.TouchActive){if(mobileMap){foreach(var action in restoreMap)action();restoreMap.Clear();mobileMap=false;}return;}
            if(!mobileMap)
            {
                foreach(var r in window.GetComponentsInChildren<RectTransform>(true)){var min=r.anchorMin;var max=r.anchorMax;var pivot=r.pivot;var pos=r.anchoredPosition;var size=r.sizeDelta;bool active=r.gameObject.activeSelf;var text=r.GetComponent<TMP_Text>();float fs=text!=null?text.fontSize:0;restoreMap.Add(()=>{r.anchorMin=min;r.anchorMax=max;r.pivot=pivot;r.anchoredPosition=pos;r.sizeDelta=size;r.gameObject.SetActive(active);if(text!=null)text.fontSize=fs;});}mobileMap=true;
            }
            float u=MobileControls.Instance.Units,w=MobileControls.Instance.Viewport.x,h=MobileControls.Instance.Viewport.y;
            RectTransform Child(string name)=>window.Find(name) as RectTransform;
            void Top(RectTransform r,Vector2 pos,Vector2 size){if(r==null)return;r.anchorMin=r.anchorMax=new Vector2(0,1);r.pivot=new Vector2(0,1);r.anchoredPosition=new Vector2(pos.x,-pos.y)*u;r.sizeDelta=size*u;}
            Top(Child("Titre"),new Vector2(12,8),new Vector2(w-24,32));Child("Titre").GetComponent<TMP_Text>().fontSize=20*u;
            Top(caption.rectTransform,new Vector2(12,52),new Vector2(190,h-124));caption.fontSize=16*u;
            Child("Aide carte").gameObject.SetActive(false);Child("Légende").gameObject.SetActive(false);
            var zone=Child("Zone carte");float availableW=Mathf.Max(120,w-226),availableH=Mathf.Max(120,h-116);Top(zone,new Vector2(214,52),new Vector2(availableW,availableH));
            var frame=fullRect.parent as RectTransform;float ratio=worldSize.x/worldSize.y;frame.sizeDelta=new Vector2(Mathf.Min(availableW,availableH*ratio),Mathf.Min(availableH,availableW/ratio))*u;
            int index=0;float buttonWidth=(w-24)/7;foreach(string name in new[]{"Lieux","Personnages","Dangers","Village","Monde","Itinéraire","Fermer"}){var r=Child(name);r.anchorMin=r.anchorMax=Vector2.zero;r.pivot=Vector2.zero;r.anchoredPosition=new Vector2(12+index++*buttonWidth,8)*u;r.sizeDelta=new Vector2(buttonWidth-5,44)*u;r.GetComponentInChildren<TMP_Text>().fontSize=16*u;}
        }
    }
}
