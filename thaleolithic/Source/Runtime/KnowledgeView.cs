using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.InputSystem;
namespace UngaBunga45001
{
    public sealed partial class AdventureMenus
    {
        string selectedKnowledge="4.1";Vector2 knowledgePosition;float knowledgeZoom=1;
        void RenderKnowledge(RectTransform parent,TMP_FontAsset sourceFont,bool mobile)
        {
            float width=parent.rect.width,height=parent.rect.height,graphWidth=width*(mobile?.47f:.61f),detailsX=graphWidth+18,detailsWidth=width-detailsX;
            var viewportRoot=AdventureUI.Rect(parent,"Arbre des savoirs",new Vector2(0,1),new Vector2(0,1),Vector2.zero,new Vector2(graphWidth,height-52));
            var scroll=viewportRoot.gameObject.AddComponent<UnityEngine.UI.ScrollRect>();scroll.horizontal=scroll.vertical=true;scroll.movementType=UnityEngine.UI.ScrollRect.MovementType.Clamped;
            var viewport=AdventureUI.Fill(viewportRoot,"Viewport");AdventureUI.Panel(viewport,new Color(.035f,.025f,.04f,.85f)).raycastTarget=true;viewport.gameObject.AddComponent<UnityEngine.UI.RectMask2D>();
            float nodeWidth=mobile?168:252,row=mobile?64:73;var phases=new[]{"Repères","Planifier","Agir","Vérifier","Améliorer"};int rows=KnowledgeCatalog.Clauses.GroupBy(c=>c.phase).Max(g=>g.Count());
            var graph=AdventureUI.Rect(viewport,"Nœuds ISO",new Vector2(0,1),new Vector2(0,1),knowledgePosition,new Vector2((nodeWidth+20)*phases.Length+20,rows*row+70));graph.localScale=Vector3.one*knowledgeZoom;scroll.viewport=viewport;scroll.content=graph;
            for(int p=0;p<phases.Length;p++)
            {
                AdventureUI.Text(AdventureUI.Rect(graph,phases[p],new Vector2(0,1),new Vector2(0,1),new Vector2(12+p*(nodeWidth+20),-12),new Vector2(nodeWidth,35)),font,phases[p],mobile?18:23,AdventureUI.Gold);
                int index=0;foreach(var clause in KnowledgeCatalog.Clauses.Where(c=>c.phase==phases[p]))
                {
                    var node=clause;int level=campaign.State.knowledge.FirstOrDefault(n=>n.id==node.id)?.level??0;var r=AdventureUI.Rect(graph,node.id,new Vector2(0,1),new Vector2(0,1),new Vector2(12+p*(nodeWidth+20),-58-index++*row),new Vector2(nodeWidth,mobile?56:62));
                    var b=AdventureUI.Button(r,font,node.id+" · "+node.title,()=>{selectedKnowledge=node.id;knowledgePosition=graph.anchoredPosition;Render();});b.GetComponentInChildren<TMP_Text>().fontSize=mobile?15:20;b.targetGraphic.color=level>=4?new Color(.18f,.34f,.24f):level>=3?new Color(.35f,.24f,.1f):level>=1?new Color(.2f,.16f,.12f):new Color(.08f,.065f,.09f);
                }
            }
            var pinch=viewportRoot.gameObject.AddComponent<KnowledgePinch>();pinch.content=graph;pinch.minimum=mobile?1:.6f;pinch.changed=(position,zoom)=>{knowledgePosition=position;knowledgeZoom=zoom;};
            var selected=KnowledgeCatalog.Clauses.First(c=>c.id==selectedKnowledge);var quest=campaign.Data.quests.FirstOrDefault(q=>q.iso.Contains(selected.id));int progress=campaign.State.knowledge.FirstOrDefault(n=>n.id==selected.id)?.level??0;
            var infoRoot=AdventureUI.Rect(parent,"Description de la notion",new Vector2(0,1),new Vector2(0,1),new Vector2(detailsX,0),new Vector2(detailsWidth,height-57));var infoScroll=infoRoot.gameObject.AddComponent<UnityEngine.UI.ScrollRect>();infoScroll.horizontal=false;var infoViewport=AdventureUI.Fill(infoRoot,"Viewport");AdventureUI.Panel(infoViewport,new Color(0,0,0,.001f)).raycastTarget=true;infoViewport.gameObject.AddComponent<UnityEngine.UI.RectMask2D>();
            var info=AdventureUI.Rect(infoViewport,"Détail",new Vector2(0,1),new Vector2(0,1),Vector2.zero,new Vector2(detailsWidth,600));string status=selected.Intro?"Repère introductif":new[]{"À découvrir","Découvert","En cours","Application réalisée","Vérifié"}[Mathf.Clamp(progress,0,4)];
            string body=$"<color=#FFD16A><b>{selected.id} · {selected.title}</b></color>\n\n{status}\n\n"+(selected.Intro?"Ce repère introduit le système. Il ne représente pas une exigence à certifier.":"Mets cette notion en relation avec une situation du village, puis examine les résultats de tes actions.");
            if(selected.id=="4.1"||selected.id=="4.2")body+="\n\nClimat · Amd 1:2024 : observer la pertinence des évolutions climatiques et les attentes associées dans le contexte de la tribu.";
            if(quest!=null)body+="\n\nMission : "+quest.title+"\n\n"+string.Join("\n",quest.actionIds.Select(id=>(campaign.State.completedActions.Contains(id)?"Fait : ":"À réaliser : ")+campaign.FindAction(id)?.title))+"\n\nRécompenses : "+string.Join(", ",quest.rewards.Select(r=>r.name));
            body+="\n\nFragments de savoir : "+campaign.Value("resource","knowledge").ToString("0")+"\n\nRéférences pédagogiques. Les intitulés du jeu ne reproduisent pas la norme et ne déclarent aucune certification.";
            var text=AdventureUI.Text(info,font,body,mobile?16:22);text.alignment=TextAlignmentOptions.TopLeft;text.overflowMode=TextOverflowModes.Overflow;info.sizeDelta=new Vector2(detailsWidth,Mathf.Max(200,text.GetPreferredValues(body,detailsWidth,Mathf.Infinity).y+20));infoScroll.viewport=infoViewport;infoScroll.content=info;
            var follow=AdventureUI.Button(AdventureUI.Rect(parent,"Mission liée",new Vector2(0,1),new Vector2(0,1),new Vector2(detailsX,-height+48),new Vector2(detailsWidth,46)),font,"Suivre la mission",()=>{Close();campaign.TrackQuest(quest.id);});follow.interactable=quest!=null;follow.GetComponentInChildren<TMP_Text>().fontSize=mobile?16:21;
            void Zoom(string label,float x,float factor){var b=AdventureUI.Button(AdventureUI.Rect(parent,label,new Vector2(0,1),new Vector2(0,1),new Vector2(x,-height+48),new Vector2(mobile?52:95,46)),font,label,()=>{knowledgeZoom=Mathf.Clamp(knowledgeZoom*factor,mobile?1:.6f,2.5f);knowledgePosition=graph.anchoredPosition;Render();});b.GetComponentInChildren<TMP_Text>().fontSize=mobile?16:21;}
            Zoom("−",0,.8f);Zoom("+",mobile?59:104,1.25f);var center=AdventureUI.Button(AdventureUI.Rect(parent,"Recentrer l’arbre",new Vector2(0,1),new Vector2(0,1),new Vector2(mobile?118:208,-height+48),new Vector2(mobile?Mathf.Max(80,graphWidth-118):180,46)),font,"Recentrer",()=>{knowledgePosition=Vector2.zero;knowledgeZoom=1;Render();});center.GetComponentInChildren<TMP_Text>().fontSize=mobile?14:21;
        }
    }
    public sealed class KnowledgePinch:MonoBehaviour
    {
        public RectTransform content;public float minimum=1;public System.Action<Vector2,float> changed;float previous;
        void Update()
        {
            var touch=Touchscreen.current;if(touch==null)return;var points=touch.touches.Where(t=>t.press.isPressed).Take(2).ToArray();if(points.Length!=2){previous=0;return;}float distance=Vector2.Distance(points[0].position.ReadValue(),points[1].position.ReadValue());
            if(previous>0){float scale=Mathf.Clamp(content.localScale.x*distance/Mathf.Max(1,previous),minimum,2.5f);content.localScale=Vector3.one*scale;changed?.Invoke(content.anchoredPosition,scale);}previous=distance;
        }
    }
}
