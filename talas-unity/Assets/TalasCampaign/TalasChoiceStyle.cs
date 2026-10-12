using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
public class TalasChoiceStyle:MonoBehaviour,IPointerEnterHandler,IPointerExitHandler,ISelectHandler,IDeselectHandler
{
 public TextMeshProUGUI label;public Image image;public Button button;bool selected;
 void Update(){if(label==null)return;image.color=!button.interactable?new Color(.07f,.07f,.07f,.65f):selected?new Color(.82f,.79f,.7f):new Color(.09f,.09f,.085f,.94f);label.color=!button.interactable?new Color(.45f,.45f,.43f):selected?new Color(.08f,.08f,.07f):TalasUI.Paper;}
 public void OnPointerEnter(PointerEventData e){selected=true;}public void OnPointerExit(PointerEventData e){selected=false;}public void OnSelect(BaseEventData e){selected=true;}public void OnDeselect(BaseEventData e){selected=false;}
}
