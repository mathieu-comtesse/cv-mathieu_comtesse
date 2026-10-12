using TMPro;
using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;
public class TalasDialogueBar:MonoBehaviour
{
 public TextMeshProUGUI body,speaker;public Button next;string shown;readonly List<string> pages=new List<string>();int page;
 void Prepare()
 {
  if(body.text==shown)return;string raw=body.text;pages.Clear();string part="";
  // Long Talas instructions are paginated to keep the original subtitle and speaker boxes apart.
  foreach(string word in raw.Replace("\n"," \n ").Split(' ')){string candidate=part+(part.Length==0?"":" ")+word;if(part.Length>0&&body.GetPreferredValues(candidate,595.35f,float.PositiveInfinity).y>66){pages.Add(part.Trim());part=word;}else part=candidate;}
  if(part.Trim().Length>0)pages.Add(part.Trim());if(pages.Count==0)pages.Add("");page=0;body.overflowMode=TextOverflowModes.Truncate;Show();
 }
 void Show(){shown=pages[page];body.text=shown;body.pageToDisplay=1;if(next!=null)next.gameObject.SetActive(page+1<pages.Count);}
 void LateUpdate(){Prepare();}
 public int Pages {get{Prepare();return pages.Count;}}
 public bool NextPage(){Prepare();if(page+1>=pages.Count)return false;page++;Show();return true;}
}
