using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;

public static class TalasVisualFinish
{
    const string Folder="Assets/TalasAdaptation01/";
    public static void RepairCharacters()
    {
        foreach(var name in new[]{"Dylan","Boulon"})
        {
            var prefab=AssetDatabase.LoadAssetAtPath<GameObject>(Folder+name+".fbx");
            GameObject.Find(name+"Model").transform.localRotation=Quaternion.Euler(0,180,0)*prefab.transform.localRotation;
        }
        Fit(GameObject.Find("DylanModel"),GameObject.Find("Dylan — silhouette de travail").transform,1.95f,false);
        Fit(GameObject.Find("BoulonModel"),GameObject.Find("Boulon — silhouette de travail").transform,.85f,true);
        Colour(GameObject.Find("DylanModel"),false);Colour(GameObject.Find("BoulonModel"),true);
        var scene=UnityEngine.SceneManagement.SceneManager.GetActiveScene();EditorSceneManager.MarkSceneDirty(scene);EditorSceneManager.SaveScene(scene);AssetDatabase.SaveAssets();
    }
    public static void Apply()
    {
        if(EditorApplication.isPlaying)throw new System.InvalidOperationException("Stop Play Mode first.");
        var scene=UnityEngine.SceneManagement.SceneManager.GetActiveScene();
        if(!scene.path.EndsWith("Quai-Retravaille.unity"))throw new System.InvalidOperationException("Wrong scene.");
        if(GameObject.Find("DylanModel")!=null)throw new System.InvalidOperationException("Already installed.");
        var shader=Shader.Find("Talas/Couleurs des personnages");if(shader==null)throw new System.InvalidOperationException("Missing character shader.");
        var material=new Material(shader);AssetDatabase.CreateAsset(material,Folder+"Personnages.mat");
        Character("Dylan","Dylan — silhouette de travail",1.95f,false,material);
        Character("Boulon","Boulon — silhouette de travail",.85f,true,material);
        var facade=AssetDatabase.LoadAssetAtPath<Material>(Folder+"Facade.mat");
        var background=new Material(facade);background.name="Facade lointaine";background.SetColor("_BaseColor",new Color(.32f,.52f,.63f));
        AssetDatabase.CreateAsset(background,Folder+"FacadeLointaine.mat");
        var prefab=AssetDatabase.LoadAssetAtPath<GameObject>(Folder+"AtelierTalas.fbx");
        var body=AssetDatabase.LoadAssetAtPath<Material>(Folder+"BoisBleu.mat");
        for(int i=0;i<5;i++)
        {
            var go=(GameObject)PrefabUtility.InstantiatePrefab(prefab);go.name="Atelier lointain "+(i+1);
            float scale=.56f+(i%3)*.09f;go.transform.localScale=Vector3.one*scale;
            go.transform.position=new Vector3(-23+i*9.3f,.2f+(i%2)*.45f,16+(i%3)*2);
            foreach(var r in go.GetComponentsInChildren<Renderer>())r.sharedMaterial=r.name.Contains("Facade")?background:body;
        }
        var lighthouse=new GameObject("Phare du bassin");
        var stone=NewMat("Pierre du phare",new Color(.23f,.34f,.38f),false);
        var glow=NewMat("Lentille du phare",new Color(.9f,.7f,.36f),true);
        Primitive("Tour",PrimitiveType.Cylinder,new Vector3(-13,3.15f,20),new Vector3(1.3f,3.15f,1.3f),stone,lighthouse);
        Primitive("Balcon",PrimitiveType.Cylinder,new Vector3(-13,6.35f,20),new Vector3(2.1f,.09f,2.1f),stone,lighthouse);
        Primitive("Lanterne",PrimitiveType.Cylinder,new Vector3(-13,6.9f,20),new Vector3(.95f,.48f,.95f),glow,lighthouse);
        Primitive("Toit",PrimitiveType.Sphere,new Vector3(-13,7.47f,20),new Vector3(1.5f,.45f,1.5f),stone,lighthouse);
        var mist=AssetDatabase.LoadAssetAtPath<Material>(Folder+"Mist.mat");
        var farMist=new Material(mist);farMist.SetColor("_BaseColor",new Color(.24f,.39f,.47f,.32f));AssetDatabase.CreateAsset(farMist,Folder+"BrumeLointaine.mat");
        var quad=GameObject.CreatePrimitive(PrimitiveType.Quad);quad.name="Brume derrière le bassin";quad.transform.position=new Vector3(0,4,13);
        quad.transform.localScale=new Vector3(75,10,1);quad.GetComponent<Renderer>().sharedMaterial=farMist;Object.DestroyImmediate(quad.GetComponent<Collider>());
        var cam=Camera.main;cam.fieldOfView=29;cam.transform.position=new Vector3(1,7.4f,-29);cam.transform.LookAt(new Vector3(1,2.4f,1));
        EditorSceneManager.MarkSceneDirty(scene);EditorSceneManager.SaveScene(scene);AssetDatabase.SaveAssets();
    }
    static void Character(string asset,string rootName,float height,bool centered,Material material)
    {
        var root=GameObject.Find(rootName);if(root==null)throw new System.InvalidOperationException("Missing "+rootName);
        var prefab=AssetDatabase.LoadAssetAtPath<GameObject>(Folder+asset+".fbx");if(prefab==null)throw new System.InvalidOperationException("Missing "+asset);
        foreach(Transform child in root.transform)child.gameObject.SetActive(false);
        var go=(GameObject)PrefabUtility.InstantiatePrefab(prefab);go.name=asset+"Model";go.transform.SetParent(root.transform,false);
        go.transform.localRotation=Quaternion.Euler(0,180,0)*prefab.transform.localRotation;
        Fit(go,root.transform,height,centered);Colour(go,asset=="Boulon");
        if(asset=="Dylan")
        {
            var movement=root.GetComponent<TalasQuayMovement>();movement.visualRoot=go.transform;
        }
    }
    static Bounds MeshBounds(GameObject go)
    {
        bool first=true;var bounds=new Bounds();
        foreach(var f in go.GetComponentsInChildren<MeshFilter>())
        {
            var b=f.sharedMesh.bounds;
            for(int x=-1;x<=1;x+=2)for(int y=-1;y<=1;y+=2)for(int z=-1;z<=1;z+=2)
            {
                var point=f.transform.TransformPoint(b.center+Vector3.Scale(b.extents,new Vector3(x,y,z)));
                if(first){bounds=new Bounds(point,Vector3.zero);first=false;}else bounds.Encapsulate(point);
            }
        }
        return bounds;
    }
    static void Fit(GameObject go,Transform root,float height,bool centered)
    {
        var bounds=MeshBounds(go);if(bounds.size.y<=0)throw new System.InvalidOperationException("Empty character bounds");
        go.transform.localScale*=height/bounds.size.y;bounds=MeshBounds(go);
        go.transform.position+=new Vector3(root.position.x-bounds.center.x,centered?root.position.y-bounds.center.y:root.position.y-bounds.min.y,root.position.z-bounds.center.z);
    }
    static void Colour(GameObject go,bool robot)
    {
        var palette=robot?new System.Collections.Generic.Dictionary<string,string>{{"yellow","#ffd02a"},{"screen","#26d1dc"},{"metal","#73848e"},{"metal2","#4b6576"},{"dark","#1c2c39"},{"red","#ed743b"}}:
            new System.Collections.Generic.Dictionary<string,string>{{"skin","#e6ad86"},{"nose","#d89c78"},{"shirt","#6cb0e8"},{"sleeve","#6cb0e8"},{"vest","#ff8420"},{"stripe","#e8ecef"},{"pants","#3a58b8"},{"belt","#3a2210"},{"shoe","#6e4220"},{"sole","#3a2210"},{"hair","#5a3214"},{"hat","#ffd02a"},{"white","#ffffff"},{"pupil","#1f4f9a"},{"mouth","#6a2418"},{"stubble","#c99472"}};
        foreach(var r in go.GetComponentsInChildren<Renderer>())
        {
            int split=r.name.IndexOf("__",System.StringComparison.Ordinal);if(split<0)continue;
            var role=r.name.Substring(split+2).Split('.')[0];if(!palette.TryGetValue(role,out var html))continue;
            var path=Folder+(robot?"Robot-":"Dylan-")+role+".mat";var mat=AssetDatabase.LoadAssetAtPath<Material>(path);
            if(mat==null){mat=new Material(Shader.Find("Talas/Couleurs des personnages"));ColorUtility.TryParseHtmlString(html,out var color);mat.SetColor("_BaseColor",color);AssetDatabase.CreateAsset(mat,path);}
            r.sharedMaterial=mat;if(r.name.StartsWith("mouthO"))r.gameObject.SetActive(false);
        }
    }
    static Material NewMat(string name,Color color,bool unlit)
    {
        var m=new Material(Shader.Find(unlit?"Universal Render Pipeline/Unlit":"Universal Render Pipeline/Lit"));m.SetColor("_BaseColor",color);
        AssetDatabase.CreateAsset(m,Folder+name+".mat");return m;
    }
    static void Primitive(string name,PrimitiveType type,Vector3 pos,Vector3 scale,Material mat,GameObject root)
    {
        var go=GameObject.CreatePrimitive(type);go.name=name;go.transform.position=pos;go.transform.localScale=scale;
        go.transform.SetParent(root.transform,true);go.GetComponent<Renderer>().sharedMaterial=mat;Object.DestroyImmediate(go.GetComponent<Collider>());
    }
}
