using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public static class TalasSetup
{
    [MenuItem("Talas/Préparer la scène du quai")]
    public static void CreateQuay()
    {
        if (AssetDatabase.LoadAssetAtPath<SceneAsset>("Assets/TalasScenes/Quai.unity") != null)
            throw new System.InvalidOperationException("La scène Quai existe déjà : aucune modification effectuée.");
        if (!AssetDatabase.IsValidFolder("Assets/TalasMaterials")) AssetDatabase.CreateFolder("Assets", "TalasMaterials");
        if (!AssetDatabase.IsValidFolder("Assets/TalasScenes")) AssetDatabase.CreateFolder("Assets", "TalasScenes");
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var ground = Material("Sol humide", new Color(.16f,.24f,.26f), .35f);
        var metal = Material("Atelier bleu", new Color(.24f,.35f,.39f), .25f);
        var amber = Material("Repère ambre", new Color(.95f,.53f,.12f), .1f);
        var yellow = Material("Casque et Boulon", new Color(.98f,.73f,.1f), .2f);
        var navy = Material("Tenue de Dylan", new Color(.1f,.22f,.33f), .1f);
        var cyan = Material("Écran de Boulon", new Color(.05f,.8f,.86f), .2f);
        Cube("Quai",new Vector3(0,-.35f,0),new Vector3(32,.7f,8),ground);
        Cube("Atelier — volume de travail",new Vector3(9,3.5f,3),new Vector3(7,7,2),metal);
        Cube("Porte — repère objectif",new Vector3(8,1.5f,1.8f),new Vector3(1.7f,3,.2f),amber);
        for(int i=0;i<7;i++) Cube("Pieu du quai",new Vector3(-14+i*4,.65f,-3.7f),new Vector3(.25f,1.3f,.25f),metal);
        var dylan = new GameObject("Dylan — silhouette de travail");
        dylan.transform.position = new Vector3(-5,0,0);
        Part(dylan,"Tenue",PrimitiveType.Capsule,new Vector3(0,.9f,0),new Vector3(.55f,.8f,.55f),navy);
        Part(dylan,"Casque",PrimitiveType.Sphere,new Vector3(0,1.8f,0),new Vector3(.62f,.35f,.62f),yellow);
        dylan.AddComponent<TalasQuayMovement>();
        var boulon = new GameObject("Boulon — silhouette de travail");
        boulon.transform.position = new Vector3(-3,1.6f,0);
        Part(boulon,"Boîtier",PrimitiveType.Cube,Vector3.zero,new Vector3(.65f,.65f,.45f),yellow);
        Part(boulon,"Écran",PrimitiveType.Cube,new Vector3(0,0,-.24f),new Vector3(.48f,.35f,.04f),cyan);
        Part(boulon,"Rotor",PrimitiveType.Cube,new Vector3(0,.48f,0),new Vector3(.9f,.035f,.08f),metal);
        var camObject=new GameObject("Caméra du quai");
        var cam=camObject.AddComponent<Camera>();
        camObject.tag="MainCamera";
        camObject.AddComponent<AudioListener>();
        cam.fieldOfView=30;
        camObject.transform.position=new Vector3(0,8,-23);
        camObject.transform.LookAt(new Vector3(0,1.4f,0));
        cam.clearFlags=CameraClearFlags.SolidColor;
        cam.backgroundColor=new Color(.22f,.34f,.4f);
        camObject.AddComponent<UniversalAdditionalCameraData>().renderPostProcessing=true;
        var sun=new GameObject("Lumière côtière").AddComponent<Light>();
        sun.type=LightType.Directional; sun.intensity=1.3f; sun.color=new Color(.68f,.82f,1);
        sun.transform.rotation=Quaternion.Euler(35,-30,0); sun.shadows=LightShadows.Soft;
        var lamp=new GameObject("Lumière de l'atelier").AddComponent<Light>();
        lamp.type=LightType.Point; lamp.range=9; lamp.intensity=5; lamp.color=new Color(1,.58f,.2f);
        lamp.transform.position=new Vector3(8,3,0);
        RenderSettings.ambientMode=AmbientMode.Flat;
        RenderSettings.ambientLight=new Color(.24f,.33f,.39f);
        RenderSettings.fog=true; RenderSettings.fogMode=FogMode.Linear;
        RenderSettings.fogColor=new Color(.32f,.45f,.49f); RenderSettings.fogStartDistance=25; RenderSettings.fogEndDistance=65;
        var volume=new GameObject("Ambiance — réglages IA").AddComponent<Volume>(); volume.isGlobal=true;
        var profile=ScriptableObject.CreateInstance<VolumeProfile>();
        var tone=profile.Add<Tonemapping>(true); tone.mode.Override(TonemappingMode.ACES);
        var bloom=profile.Add<Bloom>(true); bloom.intensity.Override(.18f); bloom.threshold.Override(1.1f);
        var color=profile.Add<ColorAdjustments>(true); color.saturation.Override(-12); color.contrast.Override(8);
        AssetDatabase.CreateAsset(profile,"Assets/TalasMaterials/AmbianceQuai.asset");
        foreach(var component in profile.components) AssetDatabase.AddObjectToAsset(component,profile);
        volume.sharedProfile=profile;
        PlayerSettings.companyName="Talas"; PlayerSettings.productName="Talas — le quai des brumes";
        PlayerSettings.defaultScreenWidth=1280; PlayerSettings.defaultScreenHeight=720;
        PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Disabled;
        EditorSceneManager.SaveScene(scene,"Assets/TalasScenes/Quai.unity");
        EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene("Assets/TalasScenes/Quai.unity",true)};
        AssetDatabase.SaveAssets();
        Debug.Log("Talas : scène de préparation originale sauvegardée. Les mécaniques ISO ne sont pas encore portées.");
    }
    static Material Material(string name,Color color,float smoothness)
    {
        var mat=new Material(Shader.Find("Universal Render Pipeline/Lit")); mat.name=name;
        mat.SetColor("_BaseColor",color); mat.SetFloat("_Smoothness",smoothness);
        AssetDatabase.CreateAsset(mat,"Assets/TalasMaterials/"+name+".mat"); return mat;
    }
    static GameObject Cube(string name,Vector3 pos,Vector3 scale,Material mat)
    {
        var go=GameObject.CreatePrimitive(PrimitiveType.Cube); go.name=name;
        go.transform.position=pos; go.transform.localScale=scale;
        go.GetComponent<Renderer>().sharedMaterial=mat; return go;
    }
    static void Part(GameObject root,string name,PrimitiveType type,Vector3 pos,Vector3 scale,Material mat)
    {
        var go=GameObject.CreatePrimitive(type); go.name=name; go.transform.SetParent(root.transform,false);
        go.transform.localPosition=pos; go.transform.localScale=scale; go.GetComponent<Renderer>().sharedMaterial=mat;
        Object.DestroyImmediate(go.GetComponent<Collider>());
    }
}
