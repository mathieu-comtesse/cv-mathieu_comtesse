using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public static class TalasCampaignSetup
{
 const string Root="Assets/TalasCampaign",ScenePath="Assets/TalasScenes/Talas-Campagne.unity";
 [Serializable] class Specs {public Spec[] rigs;}
 [Serializable] class Spec {public string name;public string[] hidden;public Paint[] materials;}
 [Serializable] class Paint {public string name;public float[] color;}
 public static void ImportRigs()
 {
  var specs=JsonUtility.FromJson<Specs>(AssetDatabase.LoadAssetAtPath<TextAsset>(Root+"/TalasRigSpecs.json").text);
  foreach(var spec in specs.rigs)
  {
   string path=Root+"/Rigs/"+spec.name+"-Rig.fbx";var imp=AssetImporter.GetAtPath(path) as ModelImporter;if(imp==null)throw new Exception(path);
   imp.animationType=ModelImporterAnimationType.Legacy;imp.importAnimation=true;imp.animationCompression=ModelImporterAnimationCompression.Off;
   var clips=imp.defaultClipAnimations;foreach(var clip in clips){int split=clip.name.LastIndexOf('|');if(split>=0)clip.name=clip.name.Substring(split+1);clip.loopTime=clip.name.EndsWith("_Loop");clip.loopPose=clip.loopTime;}
   imp.clipAnimations=clips;imp.SaveAndReimport();
   var prefab=AssetDatabase.LoadAssetAtPath<GameObject>(path);var actor=new GameObject(spec.name+" — articulé");var model=(GameObject)PrefabUtility.InstantiatePrefab(prefab);model.transform.SetParent(actor.transform,false);model.transform.localRotation=Quaternion.Euler(0,180,0)*prefab.transform.localRotation;
   foreach(var t in model.GetComponentsInChildren<Transform>(true))foreach(var hide in spec.hidden)if(t.name==hide)t.gameObject.SetActive(false);
   var mats=new Dictionary<string,Material>();foreach(var p in spec.materials){string mp=Root+"/Rigs/"+spec.name+"-"+p.name.Replace(":","-")+".mat";var m=AssetDatabase.LoadAssetAtPath<Material>(mp);if(m==null){m=new Material(Shader.Find("Universal Render Pipeline/Lit"));AssetDatabase.CreateAsset(m,mp);}m.SetColor("_BaseColor",new Color(p.color[0],p.color[1],p.color[2],p.color.Length>3?p.color[3]:1));m.SetFloat("_Smoothness",.27f);mats[p.name]=m;}
   foreach(var r in model.GetComponentsInChildren<Renderer>(true)){var mm=r.sharedMaterials;for(int i=0;i<mm.Length;i++){string n=mm[i]!=null?mm[i].name:"";if(mats.TryGetValue(n,out var material))mm[i]=material;else foreach(var pair in mats)if(n.StartsWith(pair.Key+".")){mm[i]=pair.Value;break;}}r.sharedMaterials=mm;r.shadowCastingMode=r.name.Contains("eye")||r.name.Contains("pupil")?ShadowCastingMode.Off:ShadowCastingMode.On;r.receiveShadows=true;}
   Fit(actor,1.95f);
   var animation=model.GetComponent<Animation>()??model.AddComponent<Animation>();animation.playAutomatically=false;foreach(var a in AssetDatabase.LoadAllAssetsAtPath(path))if(a is AnimationClip c&&!c.name.StartsWith("__preview")){c.legacy=true;animation.AddClip(c,c.name);animation[c.name].wrapMode=c.name.EndsWith("_Loop")?WrapMode.Loop:WrapMode.Once;}
   var driver=actor.AddComponent<TalasRigAnimator>();driver.animationPlayer=animation;
   PrefabUtility.SaveAsPrefabAsset(actor,Root+"/Rigs/"+spec.name+"Actor.prefab");UnityEngine.Object.DestroyImmediate(actor);
  }
  AssetDatabase.SaveAssets();
 }
 static void Fit(GameObject go,float h)
 {
  bool first=true;Bounds b=new Bounds();foreach(var r in go.GetComponentsInChildren<Renderer>()){Bounds mb=r is SkinnedMeshRenderer sk?sk.sharedMesh.bounds:r.GetComponent<MeshFilter>().sharedMesh.bounds;for(int x=-1;x<=1;x+=2)for(int y=-1;y<=1;y+=2)for(int z=-1;z<=1;z+=2){var p=r.transform.TransformPoint(mb.center+Vector3.Scale(mb.extents,new Vector3(x,y,z)));if(first){b=new Bounds(p,Vector3.zero);first=false;}else b.Encapsulate(p);}}
  go.transform.localScale*=h/b.size.y;go.transform.position-=new Vector3(b.center.x,b.min.y,b.center.z)*h/b.size.y;
 }
 public static void Create()
 {
  if(EditorApplication.isPlaying)throw new Exception("Stop Play Mode");if(AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath)!=null)throw new Exception("Campaign scene already exists");
  if(!AssetDatabase.CopyAsset("Assets/TalasScenes/Quai-Retravaille.unity",ScenePath))throw new Exception("Copy failed");var scene=EditorSceneManager.OpenScene(ScenePath);
  foreach(var m in UnityEngine.Object.FindObjectsByType<TalasContextMission>(FindObjectsSortMode.None))m.gameObject.SetActive(false);
  var player=GameObject.Find("Dylan — silhouette de travail");foreach(Transform child in player.transform)child.gameObject.SetActive(false);
  var rigPrefab=AssetDatabase.LoadAssetAtPath<GameObject>(Root+"/Rigs/DylanActor.prefab");var rig=(GameObject)PrefabUtility.InstantiatePrefab(rigPrefab);rig.transform.SetParent(player.transform,false);
  var movement=player.GetComponent<TalasQuayMovement>();movement.visualRoot=rig.transform;movement.rig=rig.GetComponent<TalasRigAnimator>();movement.minimumX=-14;movement.maximumX=141;
  var games=new GameObject("Épreuves Talas").AddComponent<TalasMiniGames>();games.characterPrefab=rigPrefab;games.bossPrefab=AssetDatabase.LoadAssetAtPath<GameObject>(Root+"/Rigs/AurelienActor.prefab");games.workshopPrefab=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/TalasAdaptation01/AtelierTalas.fbx");
  var campaign=new GameObject("Campagne des sept chapitres").AddComponent<TalasCampaign>();campaign.player=player.transform;campaign.companion=GameObject.Find("Boulon — silhouette de travail").transform;campaign.games=games;campaign.font=AssetDatabase.LoadAssetAtPath<TMPro.TMP_FontAsset>("Assets/TextMesh Pro/Resources/Fonts & Materials/LiberationSans SDF.asset");
  BuildVillage(games);
  var urp=UniversalRenderPipeline.asset;urp.supportsCameraDepthTexture=true;urp.supportsHDR=true;
  var camera=Camera.main;camera.GetUniversalAdditionalCameraData().requiresDepthTexture=true;camera.GetUniversalAdditionalCameraData().renderPostProcessing=true;camera.allowHDR=true;
  PlayerSettings.productName="Talas — Les sept ateliers";PlayerSettings.companyName="Talas";PlayerSettings.defaultScreenWidth=1920;PlayerSettings.defaultScreenHeight=1080;PlayerSettings.runInBackground=true;
  EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(ScenePath,true)};EditorSceneManager.MarkSceneDirty(scene);EditorSceneManager.SaveScene(scene);AssetDatabase.SaveAssets();
 }
 static Material Mat(string n,Color c,string shader="Universal Render Pipeline/Lit")
 {string path=Root+"/"+n+".mat";var m=AssetDatabase.LoadAssetAtPath<Material>(path);if(m==null){m=new Material(Shader.Find(shader));AssetDatabase.CreateAsset(m,path);}m.SetColor("_BaseColor",c);return m;}
 static GameObject Shape(string n,Vector3 p,Vector3 scale,Material m,PrimitiveType type=PrimitiveType.Cube,Transform parent=null)
 {var go=GameObject.CreatePrimitive(type);go.name=n;go.transform.position=p;go.transform.localScale=scale;if(parent!=null)go.transform.SetParent(parent,true);go.GetComponent<Renderer>().sharedMaterial=m;UnityEngine.Object.DestroyImmediate(go.GetComponent<Collider>());return go;}
 static GameObject Painted(string file,Vector3 p,float h,Color tint)
 {var t=AssetDatabase.LoadAssetAtPath<Texture2D>(Root+"/SilverReworked/"+file+".png");if(t==null)throw new Exception(file);var m=Mat(file+"-adapté",tint,"Universal Render Pipeline/Unlit");m.SetTexture("_BaseMap",t);m.SetFloat("_AlphaClip",1);m.SetFloat("_Cutoff",.15f);m.EnableKeyword("_ALPHATEST_ON");m.SetFloat("_Cull",0);return Shape(file+" retravaillé",p,new Vector3(h*t.width/t.height,h,1),m,PrimitiveType.Quad);}
 static void BuildVillage(TalasMiniGames games)
 {
  var steel=Mat("Acier patiné",new Color(.15f,.23f,.25f));steel.SetFloat("_Smoothness",.5f);var wood=Mat("Platelage étendu",new Color(.18f,.25f,.24f));games.floorMaterial=wood;
  var water=Mat("Eau vivante",new Color(.025f,.12f,.16f),"Talas/Eau animee");games.waterMaterial=water;
  var sea=GameObject.Find("Eau du bassin");sea.GetComponent<Renderer>().sharedMaterial=water;sea.transform.position=new Vector3(65,-1.2f,-10);sea.transform.localScale=new Vector3(190,.1f,12);
  foreach(var r in UnityEngine.Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None))if(r.name=="Reflet fin")r.gameObject.SetActive(false);
  var kit=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/TalasAdaptation01/AtelierTalas.fbx");var mats=GameObject.Find("Atelier 01 — contexte").GetComponentsInChildren<Renderer>();var original=GameObject.Find("Atelier 01 — contexte");original.transform.position=new Vector3(4.8f,0,4.2f);
  Shape("Rive complète",new Vector3(65,-.65f,15),new Vector3(190,1.1f,35),steel);
  Shape("Quai complet",new Vector3(65,-.17f,0),new Vector3(168,.3f,8),steel);
  var deck=new GameObject("Village — platelage");for(int i=0;i<420;i++)Shape("Lame du village",new Vector3(-14+i*.37f,-.03f,0),new Vector3(.352f,.07f,7.7f),wood,PrimitiveType.Cube,deck.transform);
  var bank=TalasBank.Load();for(int i=0;i<7;i++)
  {
   float x=TalasCampaign.ChapterX(i);if(i>0){var go=(GameObject)PrefabUtility.InstantiatePrefab(kit);go.name="Atelier "+bank.chapters[i].clause+" — "+bank.chapters[i].text;go.transform.position=new Vector3(x+4.8f,0,4.2f);var rr=go.GetComponentsInChildren<Renderer>();for(int j=0;j<rr.Length;j++)rr[j].sharedMaterials=mats[j].sharedMaterials;}
   var label=new GameObject("Enseigne "+bank.chapters[i].text);label.transform.position=new Vector3(x+4.7f,4.1f,3.35f);var text=label.AddComponent<TMPro.TextMeshPro>();text.font=AssetDatabase.LoadAssetAtPath<TMPro.TMP_FontAsset>("Assets/TextMesh Pro/Resources/Fonts & Materials/LiberationSans SDF.asset");text.text=bank.chapters[i].clause+"  "+bank.chapters[i].text.ToUpperInvariant();text.fontSize=2.1f;text.alignment=TMPro.TextAlignmentOptions.Center;text.color=new Color(.94f,.75f,.42f);label.GetComponent<RectTransform>().sizeDelta=new Vector2(11,1);
   Shape("Seuil de l’atelier",new Vector3(x,.02f,.7f),new Vector3(1.6f,.025f,2.5f),Mat("Seuils d’accueil",new Color(.65f,.47f,.18f)));
   var lamp=new GameObject("Lampe atelier "+i).AddComponent<Light>();lamp.type=LightType.Point;lamp.color=new Color(1,.65f,.32f);lamp.intensity=2.5f;lamp.range=9;lamp.transform.position=new Vector3(x,2.8f,1.7f);
   var mist=Mat("Brume de volume",new Color(.22f,.34f,.37f),"Talas/Brume volumetrique");mist.SetFloat("_Density",.045f);Shape("Volume de brume "+i,new Vector3(x,1.1f,8),new Vector3(24,4.5f,20),mist);
   Painted("ElectricalPole01",new Vector3(x-9,3.8f,7),7.6f,new Color(.38f,.44f,.41f));Painted("Pipes01Straight",new Vector3(x+7,1.3f,2.9f),2.1f,new Color(.37f,.53f,.57f));Painted("MetalScaffolding01",new Vector3(x+11,2.3f,6),4.5f,new Color(.43f,.46f,.4f));
   Painted(i==3?"NoteBoard01":i==5?"ComputerDesktop01":i==4?"Paint_Can_Paint_01":"File_Cabinet01",new Vector3(x-1,1.1f,1.7f),1.7f,new Color(.64f,.76f,.72f));
   if(i%2==0)Painted("Crane01",new Vector3(x-6,7,22),13,new Color(.13f,.22f,.26f));
   for(int n=0;n<4;n++){float bx=x-7+n*2.1f;Shape("Caisse de pièces",new Vector3(bx,.5f,2),new Vector3(1.6f,1,1.3f),wood);Shape("Sangle métallique",new Vector3(bx,.5f,1.335f),new Vector3(.07f,1.02f,.04f),steel);}
   var npc=AssetDatabase.LoadAssetAtPath<GameObject>(Root+"/Rigs/"+(i==1?"Aurelien":i==3?"Femme":"Homme")+"Actor.prefab");var actor=(GameObject)PrefabUtility.InstantiatePrefab(npc);actor.name="Travailleur de l’atelier "+i;actor.transform.position=new Vector3(x+2,0,.8f);actor.AddComponent<TalasIdleActor>();
  }
  for(int i=0;i<45;i++){float x=-28+i*4;float z=32+(i%5)*3;var trunk=Shape("Pin de la rive",new Vector3(x,2,z),new Vector3(.3f,4,.3f),wood,PrimitiveType.Cylinder);for(int j=0;j<3;j++)Shape("Ramure",new Vector3(x,4+j*1.4f,z),new Vector3(3.7f-j*.65f,2.3f,3.7f-j*.65f),steel,PrimitiveType.Sphere);}
  var camera=Camera.main;camera.backgroundColor=new Color(.105f,.19f,.23f);RenderSettings.fog=true;RenderSettings.fogColor=new Color(.19f,.29f,.32f);RenderSettings.fogMode=FogMode.Linear;RenderSettings.fogStartDistance=28;RenderSettings.fogEndDistance=100;
  foreach(var volume in UnityEngine.Object.FindObjectsByType<Volume>(FindObjectsSortMode.None)){if(volume.sharedProfile==null)continue;var p=volume.sharedProfile;if(!p.TryGet(out Vignette v))v=p.Add<Vignette>();v.intensity.Override(.18f);v.smoothness.Override(.65f);if(p.TryGet(out Bloom b))b.intensity.Override(.22f);EditorUtility.SetDirty(p);}
 }
 public static void FinishVillage()
 {
  var scene=UnityEngine.SceneManagement.SceneManager.GetActiveScene();if(scene.path!=ScenePath)throw new Exception("Wrong scene");
  foreach(var go in scene.GetRootGameObjects())if(go.name=="Pin de la rive"||go.name=="Ramure"||go.name.StartsWith("Atelier lointain"))go.SetActive(false);
  for(int i=0;i<48;i++){float x=-28+i*4;float z=29+(i%5)*2.5f;float h=9+(i%7)*.65f;Painted(i%3==0?"PineTree01Blurred":"PineTree01LOD1",new Vector3(x,h/2,z),h,new Color(.4f,.52f,.5f));}
  for(int i=0;i<7;i++){float x=TalasCampaign.ChapterX(i);Painted("CurbGrass01",new Vector3(x+5,.25f,7.7f),.45f,new Color(.53f,.65f,.54f));Painted("GrassTall01",new Vector3(x-5,.5f,10),1.1f,new Color(.45f,.57f,.5f));}
  var sky=Mat("Ciel peint",Color.white,"Talas/Ciel du bassin");RenderSettings.skybox=sky;Camera.main.clearFlags=CameraClearFlags.Skybox;Camera.main.fieldOfView=23;
  RenderSettings.ambientMode=AmbientMode.Flat;RenderSettings.ambientLight=new Color(.46f,.48f,.48f);RenderSettings.fogColor=new Color(.29f,.35f,.35f);
  foreach(var light in UnityEngine.Object.FindObjectsByType<Light>(FindObjectsSortMode.None))if(light.type==LightType.Directional){light.color=new Color(.85f,.88f,.84f);light.intensity=1.25f;light.shadows=LightShadows.Soft;}
  var game=UnityEngine.Object.FindFirstObjectByType<TalasMiniGames>();var village=GameObject.Find("Atelier 01 — contexte");game.workshopPrefab=PrefabUtility.SaveAsPrefabAsset(village,Root+"/AtelierScene.prefab");
  EditorSceneManager.MarkSceneDirty(scene);EditorSceneManager.SaveScene(scene);AssetDatabase.SaveAssets();
 }
 public static void ImportProps()
 {
  var specs=JsonUtility.FromJson<Specs>(AssetDatabase.LoadAssetAtPath<TextAsset>(Root+"/Props/specs.json").text);var prefabs=new List<GameObject>();
  foreach(var spec in specs.rigs){string path=Root+"/Props/"+spec.name+".fbx";var imp=(ModelImporter)AssetImporter.GetAtPath(path);imp.importAnimation=false;imp.SaveAndReimport();var source=AssetDatabase.LoadAssetAtPath<GameObject>(path);var actor=new GameObject(spec.name);var model=(GameObject)PrefabUtility.InstantiatePrefab(source);model.transform.SetParent(actor.transform,false);model.transform.localRotation=Quaternion.Euler(0,180,0)*source.transform.localRotation;
   var mats=new Dictionary<string,Material>();foreach(var p in spec.materials){string mp=Root+"/Props/"+spec.name+"-"+p.name+".mat";var m=AssetDatabase.LoadAssetAtPath<Material>(mp);if(m==null){m=new Material(Shader.Find("Universal Render Pipeline/Lit"));AssetDatabase.CreateAsset(m,mp);}m.SetColor("_BaseColor",new Color(p.color[0],p.color[1],p.color[2],p.color.Length>3?p.color[3]:1));m.SetFloat("_Smoothness",.35f);mats[p.name]=m;}
   foreach(var r in model.GetComponentsInChildren<Renderer>()){var mm=r.sharedMaterials;for(int i=0;i<mm.Length;i++)if(mm[i]!=null&&mats.TryGetValue(mm[i].name,out var material))mm[i]=material;r.sharedMaterials=mm;}Fit(actor,1);prefabs.Add(PrefabUtility.SaveAsPrefabAsset(actor,Root+"/Props/"+spec.name+".prefab"));UnityEngine.Object.DestroyImmediate(actor);
  }
  var games=UnityEngine.Object.FindFirstObjectByType<TalasMiniGames>();games.propPrefabs=prefabs.ToArray();
  var scene=UnityEngine.SceneManagement.SceneManager.GetActiveScene();EditorSceneManager.MarkSceneDirty(scene);EditorSceneManager.SaveScene(scene);AssetDatabase.SaveAssets();
 }
}
