using UnityEngine;
using TMPro;
namespace UngaBunga45001
{
 // A physical consequence of the duel; its full content also uses the canonical interaction menu.
 public sealed class MenhirPolicyBoard:MonoBehaviour
 {
  CampaignRuntime campaign;GameObject board;TextMeshPro caption;
  void Start(){campaign=GetComponent<CampaignRuntime>();}
  void Update()
  {
   if(campaign?.State==null)return;bool useful=campaign.HasFlag("menhir:useful");if(!useful){if(board!=null)board.SetActive(false);return;}
   if(board==null)
   {var menhir=campaign.bindings.Find("grand_menhir");board=new GameObject("Engagements et responsabilités affichés");board.transform.position=menhir.position+Vector3.up*1.3f+Vector3.back*.7f;
    var plaque=GameObject.CreatePrimitive(PrimitiveType.Cube);plaque.name="Panneau en bois";plaque.transform.SetParent(board.transform,false);plaque.transform.localScale=new Vector3(1.8f,1.05f,.09f);var mat=GetComponent<VillageLife>().carriedMaterial;if(mat!=null)plaque.GetComponent<Renderer>().sharedMaterial=mat;
    var text=new GameObject("Engagements lisibles",typeof(TextMeshPro));text.transform.SetParent(board.transform,false);text.transform.localPosition=new Vector3(0,0,-.065f);text.transform.localRotation=Quaternion.Euler(0,180,0);caption=text.GetComponent<TextMeshPro>();caption.text="NOS ENGAGEMENTS\nDes moyens · Des rôles clairs\nDécider avec les travailleurs\nSuivre et vérifier les résultats";caption.fontSize=1.6f;caption.color=TribalStyle.Paper;caption.alignment=TextAlignmentOptions.Center;caption.rectTransform.sizeDelta=new Vector2(1.7f,.95f);
   }
   board.SetActive(true);caption.gameObject.SetActive(!campaign.MenhirActive&&Vector3.Distance(campaign.bindings.player.position,board.transform.position)<7);
  }
 }
}
