using System;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
namespace UngaBunga45001
{
    public sealed partial class TribalInterface
    {
        string selectedClause="4.1";Vector2 graphPosition;float graphZoom=1;bool knowledgeDetail;
        QuestDefinition[] ClauseQuests(string id)=>campaign.Data.quests.Where(q=>q.iso.Any(i=>i==id||i.StartsWith(id+".",StringComparison.Ordinal))).ToArray();
        bool ClauseVerified(QuestDefinition q,string clause)=>campaign.QuestState(q.id)?.validated==true&&(q.id!=CampaignRuntime.MenhirQuestId||campaign.MenhirCriterion(clause));
        float ClauseProgress(string id){var quests=ClauseQuests(id);return quests.Length==0?0:quests.Count(q=>ClauseVerified(q,id))/(float)quests.Length;}
        string ClauseStatus(string id)
        {
            var quests=ClauseQuests(id);if(quests.Length==0)return "À découvrir";
            if(quests.All(q=>ClauseVerified(q,id)))return "Vérifié dans les missions liées";
            if(quests.Any(q=>campaign.QuestState(q.id)?.accepted==true))return "En cours d’application";
            return quests.Any(q=>campaign.QuestState(q.id)?.status!=QuestStatus.LOCKED)?"Accessible":"Prérequis à compléter";
        }
        void DrawTechnology()
        {
            float split=Narrow?W:W*(Small?.52f:.62f),gap=Small?14:26;
            if(!Narrow||!knowledgeDetail)
            {
                var panel=TribalStyle.Top(Content,"Arbre technologique",0,0,split,H-54);TribalStyle.Panel(panel);
                var root=AdventureUI.Fill(panel,"Navigation dans les savoirs",10);var scroll=root.gameObject.AddComponent<UnityEngine.UI.ScrollRect>();scroll.horizontal=scroll.vertical=true;scroll.movementType=UnityEngine.UI.ScrollRect.MovementType.Clamped;
                var viewport=AdventureUI.Fill(root,"Viewport");var mask=viewport.gameObject.AddComponent<UnityEngine.UI.Image>();mask.color=new Color(0,0,0,.001f);mask.raycastTarget=true;viewport.gameObject.AddComponent<UnityEngine.UI.RectMask2D>();
                float nw=Small?206:244,row=Small?67:76;var phases=new[]{"Planifier","Agir","Vérifier","Améliorer"};int max=KnowledgeCatalog.Clauses.Where(c=>!c.Intro).GroupBy(c=>c.phase).Max(g=>g.Count());
                var graph=TribalStyle.Top(viewport,"Réseau des clauses 4 à 10",0,0,(nw+24)*4+24,max*row+64);graph.anchoredPosition=graphPosition;graph.localScale=Vector3.one*graphZoom;scroll.viewport=viewport;scroll.content=graph;
                var links=graph.gameObject.AddComponent<TribalKnowledgeLinks>();links.raycastTarget=false;
                for(int p=0;p<phases.Length;p++)
                {
                    Label(graph,phases[p],12+p*(nw+24),8,nw,30,phases[p].ToUpperInvariant(),14,TribalStyle.Muted,true);int index=0;
                    foreach(var clause in KnowledgeCatalog.Clauses.Where(c=>!c.Intro&&c.phase==phases[p]))
                    {
                        var node=clause;float x=12+p*(nw+24),nodeY=50+index++*row;var rect=TribalStyle.Top(graph,node.id,x,nodeY,nw,row-10);bool selected=node.id==selectedClause;float progress=ClauseProgress(node.id);var b=TribalStyle.Button(rect,font,node.id+" · "+node.title,()=>{graphPosition=graph.anchoredPosition;selectedClause=node.id;knowledgeDetail=true;owner.Render();},selected);
                        b.GetComponentInChildren<TMP_Text>().fontSize=Small?14:17;var polygon=b.targetGraphic as TribalPolygon;if(!selected){polygon.left=progress>=1?new Color(.02f,.31f,.28f):TribalStyle.Ink;polygon.right=progress>=1?new Color(.03f,.35f,.31f):TribalStyle.Ink;}
                        TribalStyle.Meter(TribalStyle.Top(rect,"Vérification des missions liées",12,row-16,nw-32,4),()=>ClauseProgress(node.id));
                        string parent=node.id.Contains(".")?node.id.Substring(0,node.id.LastIndexOf('.')):"";links.nodes[node.id]=new Vector2(x+nw*.5f,-nodeY-(row-10)*.5f);if(parent!="")links.parents[node.id]=parent;
                    }
                }
                links.SetVerticesDirty();var pinch=root.gameObject.AddComponent<KnowledgePinch>();pinch.content=graph;pinch.minimum=.55f;pinch.changed=(position,zoom)=>{graphPosition=position;graphZoom=zoom;};
                ActionButton(Content,"−",0,H-46,48,44,()=>{graphPosition=graph.anchoredPosition;graphZoom=Mathf.Clamp(graphZoom*.8f,.55f,2.5f);owner.Render();});ActionButton(Content,"+",54,H-46,48,44,()=>{graphPosition=graph.anchoredPosition;graphZoom=Mathf.Clamp(graphZoom*1.25f,.55f,2.5f);owner.Render();});ActionButton(Content,"RECENTRER",108,H-46,Mathf.Min(170,split-108),44,()=>{graphPosition=Vector2.zero;graphZoom=1;owner.Render();});
            }
            if(Narrow&&!knowledgeDetail)return;float dx=Narrow?0:split+gap,dw=Narrow?W:W-dx;var detail=TribalStyle.Top(Content,"Notion sélectionnée",dx,0,dw,H);TribalStyle.Panel(detail);
            var chosen=KnowledgeCatalog.Clauses.First(c=>c.id==selectedClause);float top=Narrow?56:16;if(Narrow)ActionButton(detail,"RETOUR À L’ARBRE",12,6,dw-24,44,()=>{knowledgeDetail=false;owner.Render();});
            Label(detail,"Clause",18,top,dw-36,Small?70:96,chosen.id+"\n"+chosen.title,Small?20:26,TribalStyle.Gold,true);float y=top+(Small?74:106);var quests=ClauseQuests(chosen.id);string body=ClauseStatus(chosen.id)+"\n\nMISSIONS LIÉES\n"+string.Join("\n",quests.Select(q=>(ClauseVerified(q,chosen.id)?"Vérifiée · ":"À vérifier · ")+q.title));
            body+="\n\nPRÉREQUIS\n"+string.Join("\n",quests.SelectMany(q=>q.prerequisites).Distinct().Select(id=>campaign.Data.quests.FirstOrDefault(q=>q.id==id)?.title??id));
            if(chosen.id=="4.1"||chosen.id=="4.2")body+="\n\nAmd 1:2024 · examine la pertinence du changement climatique et les attentes associées pour les activités de la tribu.";
            body+="\n\nFRAGMENTS DE SAVOIR : "+campaign.Value("resource","knowledge").ToString("0")+"\n\nUne mesure construite doit encore être contrôlée. Les titres sont des repères pédagogiques ; ils ne constituent pas une certification.";
            TextBody(detail,"Application de la notion",18,y,dw-36,Mathf.Max(32,H-y-72),body);
            var linked=quests.FirstOrDefault(q=>campaign.QuestState(q.id)?.claimed!=true&&campaign.QuestState(q.id)?.status!=QuestStatus.LOCKED)??quests.FirstOrDefault();var follow=ActionButton(detail,"VOIR LA MISSION LIÉE",18,H-58,dw-36,44,()=>{selectedQuest=linked.id;owner.Open("Quêtes");},true);follow.interactable=linked!=null;
        }
        void TextBody(RectTransform parent,string name,float x,float y,float width,float height,string value)
        {var list=TribalStyle.Scroll(parent,name,x,y,width,height);var row=TribalStyle.Row(list,"Texte",100);var text=TribalStyle.Text(AdventureUI.Fill(row,"Contenu",2),font,value,FontSize);float preferred=text.GetPreferredValues(value,width-8,Mathf.Infinity).y+12;row.GetComponent<UnityEngine.UI.LayoutElement>().preferredHeight=Mathf.Max(60,preferred);}
    }
    [RequireComponent(typeof(CanvasRenderer))]public sealed class TribalKnowledgeLinks:UnityEngine.UI.MaskableGraphic
    {
        public readonly System.Collections.Generic.Dictionary<string,Vector2> nodes=new System.Collections.Generic.Dictionary<string,Vector2>();public readonly System.Collections.Generic.Dictionary<string,string> parents=new System.Collections.Generic.Dictionary<string,string>();
        protected override void OnPopulateMesh(UnityEngine.UI.VertexHelper mesh)
        {mesh.Clear();foreach(var pair in parents){if(!nodes.TryGetValue(pair.Key,out var b)||!nodes.TryGetValue(pair.Value,out var a))continue;Vector2 normal=new Vector2(-(b-a).y,(b-a).x).normalized;int s=mesh.currentVertCount;var tint=new Color(.48f,.3f,.68f,.45f);mesh.AddVert(a-normal,tint,Vector2.zero);mesh.AddVert(a+normal,tint,Vector2.zero);mesh.AddVert(b+normal,tint,Vector2.zero);mesh.AddVert(b-normal,tint,Vector2.zero);mesh.AddTriangle(s,s+1,s+2);mesh.AddTriangle(s,s+2,s+3);}}
    }
}
