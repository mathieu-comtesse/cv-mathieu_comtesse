using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

/// <summary>Etape 3 : habille le quai de la campagne avec le kit peint (braseros, tonneaux, caisses, mousse, herbe, bambous, rochers). Purement décoratif : aucun collider, rejouable.</summary>
public static class TalasPaintedDress
{
 const string Name="Habillage peint";

 static GameObject Put(Transform root,string piece,Vector3 p,float yaw=0,float scale=1)
 {
  var prefab=AssetDatabase.LoadAssetAtPath<GameObject>(TalasPaintedImport.Root+"/Prefabs/"+piece+".prefab");if(prefab==null)throw new System.Exception("Prefab manquant : "+piece+" (étape 1 ?)");
  var go=(GameObject)PrefabUtility.InstantiatePrefab(prefab);go.transform.SetParent(root,false);go.transform.position=p;go.transform.rotation=Quaternion.Euler(0,yaw,0);go.transform.localScale=Vector3.one*scale;
  foreach(var c in go.GetComponentsInChildren<Collider>())Object.DestroyImmediate(c);return go;
 }

 [MenuItem("Talas/Peint/3 Habiller le quai")]
 public static void Run()
 {
  var old=GameObject.Find(Name);if(old!=null)Object.DestroyImmediate(old);
  var root=new GameObject(Name).transform;var rnd=new System.Random(45001);float R(float a,float b)=>(float)(a+rnd.NextDouble()*(b-a));
  for(int i=0;i<7;i++)
  {
   float x=TalasCampaign.ChapterX(i);
   Put(root,"Brazier",new Vector3(x-3.6f,0,-2.9f),R(0,360),1.0f);Put(root,"TorchPost",new Vector3(x+1.4f,0,-3.4f),0,1.0f);
   Put(root,"Barrel",new Vector3(x+8.4f,0,-2.7f),R(0,360));Put(root,"Barrel",new Vector3(x+9.4f,0,-2.5f),R(0,360));Put(root,"Barrel",new Vector3(x+8.9f,1.1f,-2.6f),R(0,360));
   Put(root,"Crate",new Vector3(x+10.8f,0,-2.8f),R(-20,20),.9f);Put(root,"MossPatch",new Vector3(x-1.2f,.09f,-1.6f),R(0,360),1.4f);Put(root,"MossPatch",new Vector3(x+6.2f,.09f,-1.9f),R(0,360),1.1f);
   Put(root,"GrassClump",new Vector3(x-5.8f,0,-3.5f),R(0,360),1.2f);Put(root,"GrassClump",new Vector3(x+3.8f,0,-3.6f),R(0,360),1f);
   if(i%2==0)Put(root,"LanternCage",new Vector3(x+12.5f,0,-2.6f),0,.9f);
   Put(root,"Boulder",new Vector3(x+5f,0,11f),R(0,360),R(1.2f,2f));Put(root,"BambooTree",new Vector3(x-4f,0,15f),R(0,360),R(1.1f,1.5f));Put(root,"MushroomTree",new Vector3(x+10f,0,18f),R(0,360),R(1.2f,1.7f));
  }
  EditorSceneManager.MarkSceneDirty(UnityEngine.SceneManagement.SceneManager.GetActiveScene());Debug.Log("Talas peint : quai habillé ("+root.childCount+" objets)");
 }
}
