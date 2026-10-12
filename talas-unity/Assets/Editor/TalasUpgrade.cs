using System;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

public static class TalasUpgrade
{
    const string Folder = "Assets/TalasAdaptation01";
    const string Scene = "Assets/TalasScenes/Quai-Retravaille.unity";
    [MenuItem("Talas/Refonte/Installer le premier atelier")]
    public static void Apply()
    {
        if (EditorApplication.isPlaying) throw new InvalidOperationException("Stop Play Mode before upgrading.");
        if (AssetDatabase.LoadAssetAtPath<SceneAsset>(Scene) != null) throw new InvalidOperationException("Adapted scene already exists; no overwrite.");
        var workshop = AssetDatabase.LoadAssetAtPath<GameObject>(Folder+"/AtelierTalas.fbx");
        var spool = AssetDatabase.LoadAssetAtPath<GameObject>(Folder+"/TouretTalas.fbx");
        var bollard = AssetDatabase.LoadAssetAtPath<GameObject>(Folder+"/BollardTalas.fbx");
        var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(Folder+"/TalasFacade.png");
        if (workshop==null || spool==null || bollard==null || texture==null) throw new InvalidOperationException("Missing verified kit assets.");
        if (!AssetDatabase.CopyAsset("Assets/TalasScenes/Quai.unity",Scene)) throw new InvalidOperationException("Scene copy failed.");
        var scene = EditorSceneManager.OpenScene(Scene,OpenSceneMode.Single);
        var oldWorkshop = GameObject.Find("Atelier — volume de travail"); if(oldWorkshop!=null) oldWorkshop.SetActive(false);
        var oldDoor = GameObject.Find("Porte — repère objectif"); if(oldDoor!=null) oldDoor.SetActive(false);
        foreach(var root in scene.GetRootGameObjects()) if(root.name=="Pieu du quai") root.SetActive(false);
        var mats = new System.Collections.Generic.Dictionary<string,Material>
        {
            {"BoisBleu",Lit("BoisBleu",new Color(.12f,.24f,.28f),.35f)},
            {"AcierBrosse",Lit("AcierBrosse",new Color(.23f,.31f,.33f),.6f)},
            {"ReperesAmbre",Lit("ReperesAmbre",new Color(.94f,.64f,.13f),.35f)},
            {"BoisTouret",Lit("BoisTouret",new Color(.37f,.28f,.19f),.2f)}
        };
        var painted=new Material(Shader.Find("Universal Render Pipeline/Unlit")); painted.name="Facade peinte Talas";
        painted.SetTexture("_BaseMap",texture); painted.SetColor("_BaseColor",Color.white);
        painted.SetFloat("_AlphaClip",1); painted.SetFloat("_Cutoff",.3f); painted.EnableKeyword("_ALPHATEST_ON");
        painted.SetFloat("_Cull",0); AssetDatabase.CreateAsset(painted,Folder+"/Facade.mat"); mats.Add("TalasFacade",painted);
        var module=Spawn(workshop,"Atelier 01 — contexte",new Vector3(8.9f,0,3.2f),mats);
        Spawn(spool,"Touret — dossier activité",new Vector3(-8,0,1.65f),mats);
        var smaller=Spawn(spool,"Touret — attentes des travailleurs",new Vector3(-1,0,1.85f),mats); smaller.transform.localScale=Vector3.one*.78f;
        for(int i=0;i<9;i++) Spawn(bollard,"Bollard du quai",new Vector3(-14+i*3.5f,0,-3.1f),mats);
        var deck=Lit("Lames du quai",new Color(.19f,.27f,.28f),.72f);
        var dark=Lit("Interstices",new Color(.055f,.09f,.10f),.3f);
        GameObject.Find("Quai").GetComponent<Renderer>().sharedMaterial=dark;
        var planks=new GameObject("Platelage détaillé");
        for(int i=0;i<96;i++)
        {
            var go=Cube("Lame",new Vector3(-15.7f+i*.33f,-.055f,0),new Vector3(.315f,.10f,7.8f),deck);
            go.transform.SetParent(planks.transform,true);
            if(i%3==0) {var strip=Cube("Lame claire",new Vector3(go.transform.position.x+.05f,.002f,0),new Vector3(.008f,.003f,7.4f),mats["AcierBrosse"]);strip.transform.SetParent(planks.transform,true);}
        }
        var water=Lit("Eau pétrole",new Color(.045f,.17f,.22f),.92f);
        Cube("Eau du bassin",new Vector3(0,-1.2f,-10),new Vector3(70,.1f,12),water);
        var reflection=Lit("Reflets du bassin",new Color(.18f,.34f,.40f),.9f);
        for(int i=0;i<28;i++) Cube("Reflet fin",new Vector3(-17+(i*5.31f)%36,-1.14f,-5.5f-(i%8)*.65f),new Vector3(.4f+(i%5)*.7f,.01f,.025f),reflection);
        var mist=new Material(Shader.Find("Talas/Brume peinte"));mist.name="Brume basse animée";AssetDatabase.CreateAsset(mist,Folder+"/Mist.mat");
        for(int i=0;i<3;i++)
        {
            var go=GameObject.CreatePrimitive(PrimitiveType.Quad);go.name="Nappe de brume "+i;
            go.transform.position=new Vector3(0,.55f+i*.32f,-4.3f-i*1.1f);go.transform.localScale=new Vector3(38,2.2f,1);
            go.GetComponent<Renderer>().sharedMaterial=mist;UnityEngine.Object.DestroyImmediate(go.GetComponent<Collider>());
        }
        var marker=Lit("Repères dossier",new Color(1,.72f,.25f),.25f);
        foreach(var x in new[]{-8f,-1f})
        {
            Cube("Support du dossier",new Vector3(x,1.05f,1.05f),new Vector3(.65f,.48f,.12f),mats["BoisBleu"]);
            Cube("Dossier à examiner",new Vector3(x,1.06f,.96f),new Vector3(.48f,.31f,.02f),marker);
        }
        var camera=Camera.main;camera.fieldOfView=30;camera.transform.position=new Vector3(1.0f,6.6f,-25.5f);camera.transform.LookAt(new Vector3(1.0f,1.75f,.5f));
        camera.backgroundColor=new Color(.10f,.19f,.25f);
        var lamp=GameObject.Find("Lumière de l'atelier").GetComponent<Light>();lamp.transform.position=new Vector3(4.75f,2.8f,.3f);lamp.range=7;lamp.intensity=5;
        RenderSettings.fogColor=new Color(.16f,.28f,.33f);RenderSettings.fogStartDistance=38;RenderSettings.fogEndDistance=95;
        RenderSettings.ambientLight=new Color(.34f,.42f,.48f);
        var mission=new GameObject("Chapitre Contexte — première interaction").AddComponent<TalasContextMission>();
        mission.player=GameObject.Find("Dylan — silhouette de travail").transform;
        mission.companion=GameObject.Find("Boulon — silhouette de travail").transform;
        var fonts=AssetDatabase.FindAssets("t:TMP_FontAsset");
        foreach(var guid in fonts){var path=AssetDatabase.GUIDToAssetPath(guid);if(path.Contains("LiberationSans SDF")&&!path.Contains("Fallback")){mission.font=AssetDatabase.LoadAssetAtPath<TMPro.TMP_FontAsset>(path);break;}}
        if(mission.font==null)throw new InvalidOperationException("TMP font essentials missing.");
        EditorSceneManager.SaveScene(scene);
        EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(Scene,true)};AssetDatabase.SaveAssets();
        Debug.Log("Talas : première adaptation sauvegardée, base Quai conservée.");
    }
    static GameObject Spawn(GameObject prefab,string name,Vector3 position,System.Collections.Generic.Dictionary<string,Material> mats)
    {
        var go=(GameObject)PrefabUtility.InstantiatePrefab(prefab);go.name=name;go.transform.position=position;
        foreach(var r in go.GetComponentsInChildren<Renderer>())
        {
            var materials=r.sharedMaterials;
            for(int i=0;i<materials.Length;i++)foreach(var pair in mats)if(materials[i]!=null&&materials[i].name.StartsWith(pair.Key,StringComparison.Ordinal)){materials[i]=pair.Value;break;}
            r.sharedMaterials=materials;
        }
        return go;
    }
    static Material Lit(string name,Color color,float smoothness)
    {
        var m=new Material(Shader.Find("Universal Render Pipeline/Lit"));m.name=name;m.SetColor("_BaseColor",color);m.SetFloat("_Smoothness",smoothness);
        AssetDatabase.CreateAsset(m,Folder+"/"+name+".mat");return m;
    }
    static GameObject Cube(string name,Vector3 position,Vector3 scale,Material mat)
    {
        var go=GameObject.CreatePrimitive(PrimitiveType.Cube);go.name=name;go.transform.position=position;go.transform.localScale=scale;go.GetComponent<Renderer>().sharedMaterial=mat;return go;
    }
}
