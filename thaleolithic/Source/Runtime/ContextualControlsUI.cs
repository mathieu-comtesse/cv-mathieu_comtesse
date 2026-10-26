using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed class ContextualControlsUI:MonoBehaviour
    {
        TMP_Text[] labels,caps;RectTransform[] rows;AdventureShape[] mice;
        public void Build(TMP_FontAsset font,bool inLine=false)
        {
            int count=inLine?3:5;labels=new TMP_Text[count];caps=new TMP_Text[count];rows=new RectTransform[count];mice=new AdventureShape[count];
            for(int i=0;i<count;i++)
            {
                rows[i]=AdventureUI.Rect(transform,"Commande "+i,inLine?Vector2.zero:new Vector2(0,1),inLine?Vector2.zero:new Vector2(0,1),inLine?new Vector2(i*260,0):new Vector2(0,-i*28),new Vector2(240,26));
                labels[i]=AdventureUI.Text(AdventureUI.Rect(rows[i],"Action",Vector2.zero,Vector2.zero,Vector2.zero,new Vector2(158,26)),font,"",inLine?17:19,Color.white,TextAlignmentOptions.MidlineRight);
                var cap=AdventureUI.Rect(rows[i],"Touche",Vector2.right,Vector2.right,new Vector2(-5,0),new Vector2(62,26));AdventureUI.Panel(cap,new Color(.77f,.77f,.78f));caps[i]=AdventureUI.Text(AdventureUI.Fill(cap,"Raccourci",1),font,"",16,new Color(.06f,.05f,.065f),TextAlignmentOptions.Center);
                mice[i]=AdventureUI.Shape(AdventureUI.Rect(rows[i],"Souris",Vector2.right,Vector2.right,new Vector2(-26,0),new Vector2(19,27)),Color.white,"mouse-left");
            }
        }
        public void Set(params (string label,string key)[] hints)
        {
            for(int i=0;i<rows.Length;i++)
            {bool show=i<hints.Length;rows[i].gameObject.SetActive(show);if(!show)continue;labels[i].text=hints[i].label;bool mouse=hints[i].key.StartsWith("mouse-");caps[i].transform.parent.gameObject.SetActive(!mouse);mice[i].gameObject.SetActive(mouse);mice[i].kind=hints[i].key;mice[i].SetVerticesDirty();caps[i].text=hints[i].key;}
        }
    }
}
