using System;
using System.Linq;
using UnityEngine;
using UnityEngine.InputSystem;
namespace UngaBunga45001
{
    public sealed class AdventureItem
    {public string id,name,description,shape;public Color color;public AdventureItem(string key,string title,string text,string icon,Color tint){id=key;name=title;description=text;shape=icon;color=tint;}}
    public sealed class InventoryController:MonoBehaviour
    {
        public CampaignRuntime campaign;public Mesh axeMesh;public Material axeMaterial;public Transform LockedTarget{get;private set;}
        public event System.Action Changed;UISettingsController settings;AdventureMenus menus;GameObject heldTool;
        public readonly AdventureItem[] items={
            new AdventureItem("wood","Bois","Matériau des structures et des supports.","wood",new Color(.65f,.35f,.14f)),new AdventureItem("stone","Pierre","Pierre brute pour les aménagements et le débitage.","stone",new Color(.69f,.67f,.62f)),
            new AdventureItem("flint","Silex","Éclats débités à l'atelier pour fabriquer un outil.","stone",new Color(.45f,.57f,.63f)),new AdventureItem("fiber","Fibres","Liens et attaches pour le montage.","fiber",new Color(.77f,.68f,.38f)),
            new AdventureItem("food","Nourriture","Consommer une unité : nourriture +25, énergie +10.","food",new Color(.86f,.4f,.28f)),new AdventureItem("tool","Hache de pierre","Outil équipé dans la main. Les travaux restent soumis à leurs prérequis.","tool",new Color(.67f,.71f,.63f)),
            new AdventureItem("notebook","Carnet des risques","Objectifs, risques et traces des décisions.","book",new Color(.75f,.52f,.28f)),new AdventureItem("evidence","Preuves","Consulter les références et preuves enregistrées.","diamond",new Color(.78f,.35f,.89f))};
        public int Selected=>Mathf.Clamp(campaign.State?.inventorySlot??0,0,7);public AdventureItem Item=>items[Selected];public bool CanUseCurrent=>Quantity(Item.id)>0&&(Item.id=="food"||Item.id=="tool"||Item.id=="notebook"||Item.id=="evidence");
        public float Quantity(string id)=>id=="notebook"?1:id=="evidence"?campaign.State.evidence.Count:campaign.Value("resource",id);
        System.Collections.IEnumerator Start()
        {
            while(campaign.Data==null||campaign.State==null)yield return null;
            settings=GetComponent<UISettingsController>();menus=GetComponent<AdventureMenus>();
            ActionDefinition Recipe(string id,string title,float skill,CostDefinition[] costs,EffectDefinition[] effects)=>new ActionDefinition{id=id,title=title,actId="*",targetBindingId="atelier_silex",durationSeconds=3,repeatable=true,minimumCompetence=skill,costs=costs,effects=effects};
            if(!campaign.Data.actions.Any(a=>a.id=="craft:flint"))campaign.Data.actions=campaign.Data.actions.Concat(new[]{
                Recipe("craft:flint","Débiter deux éclats de silex",15,new[]{new CostDefinition{id="stone",amount=1}},new[]{new EffectDefinition{kind="resource",target="flint",operation="add",value=2},new EffectDefinition{kind="stat",target="fatigue",operation="add",value=2}}),
                Recipe("craft:tool","Fabriquer une hache de pierre",15,new[]{new CostDefinition{id="flint",amount=2},new CostDefinition{id="wood",amount=1},new CostDefinition{id="fiber",amount=1}},new[]{new EffectDefinition{kind="resource",target="tool",operation="add",value=1},new EffectDefinition{kind="stat",target="fatigue",operation="add",value=3}})}).ToArray();
            campaign.Changed+=RefreshEquipment;RefreshEquipment();
        }
        void OnDestroy(){if(campaign!=null)campaign.Changed-=RefreshEquipment;}
        public void Select(int index){campaign.State.inventorySlot=Mathf.Clamp(index,0,7);Changed?.Invoke();}
        void Update()
        {
            if(campaign.State==null||campaign.cinematicDirector.IsPlaying||campaign.Dialogue!=null||campaign.Ending!=null)return;
            if(settings.Pressed("inventory"))menus.Toggle("Inventaire");if(settings.Pressed("craft"))menus.Toggle("Fabrication");if(settings.Pressed("journal"))GetComponent<CampaignHud>().OpenJournal();if(settings.Pressed("tree"))menus.Toggle("ISO 45001");
            if(settings.Pressed("commands"))menus.Toggle("Commandes");
            if(campaign.IsModal||campaign.IsBusy)return;
            if(Keyboard.current!=null)for(int i=0;i<8;i++)if(Keyboard.current[(Key)((int)Key.Digit1+i)].wasPressedThisFrame)Select(i);
            if(Mouse.current?.leftButton.wasPressedThisFrame==true&&CanUseCurrent)Use();if(Mouse.current?.rightButton.wasPressedThisFrame==true)ToggleTarget();
            if(LockedTarget!=null&&(Vector3.Distance(campaign.bindings.player.position,LockedTarget.position)>18||!LockedTarget.gameObject.activeInHierarchy))LockedTarget=null;
        }
        public void Use()
        {
            if(Quantity(Item.id)<=0){campaign.Inform("Cet emplacement est vide.");return;}
            settings.Learn(8);
            if(Item.id=="food")
            {
                if(campaign.Value("stat","food")>=99&&campaign.Value("stat","energy")>=99){campaign.Inform("Tu es rassasié et reposé.");return;}
                campaign.Apply(new EffectDefinition{kind="resource",target="food",operation="add",value=-1});campaign.Apply(new EffectDefinition{kind="stat",target="food",operation="add",value=25});campaign.Apply(new EffectDefinition{kind="stat",target="energy",operation="add",value=10});campaign.Inform("Nourriture consommée");campaign.Save();Changed?.Invoke();
            }
            else if(Item.id=="notebook"){menus.Close();GetComponent<CampaignHud>().OpenJournal();}
            else if(Item.id=="evidence"){menus.Close();GetComponent<CampaignHud>().OpenJournal("Codex");}
            else if(Item.id=="tool"){campaign.State.equippedItem=campaign.State.equippedItem=="tool"?"":"tool";RefreshEquipment();campaign.Save();Changed?.Invoke();}
            else menus.Open("Fabrication");
        }
        void RefreshEquipment()
        {
            if(campaign.State==null)return;
            if(heldTool==null&&axeMesh!=null)
            {var binding=campaign.bindings.characters.First(c=>c.id==campaign.Data.playerCharacterId);var hand=binding.animator.GetBoneTransform(HumanBodyBones.RightHand);heldTool=new GameObject("Hache équipée du joueur");heldTool.transform.SetParent(hand,false);var scale=hand.lossyScale;var inverse=new Vector3(1/Mathf.Abs(scale.x),1/Mathf.Abs(scale.y),1/Mathf.Abs(scale.z));heldTool.transform.localScale=inverse;heldTool.transform.localPosition=Vector3.Scale(new Vector3(0,.02f,.025f),inverse);heldTool.transform.localRotation=Quaternion.Euler(0,0,90);heldTool.AddComponent<MeshFilter>().sharedMesh=axeMesh;heldTool.AddComponent<MeshRenderer>().sharedMaterial=axeMaterial;}
            if(heldTool!=null)heldTool.SetActive(campaign.State.equippedItem=="tool"&&Quantity("tool")>0);
        }
        public Transform CommandTarget()=>LockedTarget;
        public void ToggleTarget()
        {
            if(LockedTarget!=null){LockedTarget=null;Changed?.Invoke();return;}
            var player=campaign.bindings.player;var camera=campaign.bindings.gameplayCamera;
            LockedTarget=campaign.bindings.characters.Where(c=>c.id!=campaign.Data.playerCharacterId&&campaign.State.characters.First(s=>s.id==c.id).alive)
                .Select(c=>campaign.bindings.Find(c.id)).Where(t=>Vector3.Distance(player.position,t.position)<12&&Vector3.Dot(camera.transform.forward,(t.position+Vector3.up-camera.transform.position).normalized)>.2f)
                .Where(t=>!Physics.Linecast(player.position+Vector3.up*1.3f,t.position+Vector3.up*1.3f,~0,QueryTriggerInteraction.Ignore))
                .OrderBy(t=>(t.position-player.position).sqrMagnitude).FirstOrDefault();if(LockedTarget!=null)settings.Learn(16);Changed?.Invoke();
        }
    }
}
