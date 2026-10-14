using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using UnityEngine;

public class NacreRuntime:MonoBehaviour {
 public NacreSimulation sim;Mesh soilMesh,seaMesh;MeshCollider soilCollider;Camera cam;Light sun;Material waterMat;
 Vector3[] soilV,seaV;Color[] soilC,seaC;string tool="shovel";bool add,night,paused,holding;float radius=.4f,yaw,bucket=2,acc,meshT,saveT,reportT,orbit=.57f,zoom=13;
 int actions,stampCount,undoCount;Vector3 target,hit;bool hasHit;GameObject toolVisual;readonly List<GameObject> fishes=new List<GameObject>();readonly List<Transform> grasses=new List<Transform>();
 readonly Stack<string> undo=new Stack<string>();GameObject particles;ParticleSystem dust;Transform marker,toolMotion;float anim,motionTime;
 float carried,nextScoop,moldStarted;int pickups,drops;Vector3 scoopOrigin,lastRake;Transform sandpile;
 readonly List<Transform> sourceBillboards=new List<Transform>();
 [Serializable]public class Save {public int version=3;public string cells;public float bucket;public int actions,stamps;}
 [Serializable]public class Legacy {public int version;public float[] sable;public Piece[] pieces;}
 [Serializable]public class Piece {public string type;public float x,z,angle,taille;}
 [Serializable]public class State {public bool ready=true;public string engine="Unity 6.3",tool;public int steps,actions,stamps,undo,fish,shells;public float min,max,bucket,wave,tide,waterEnergy,velocity;public double eroded,deposited;public bool night,paused,holding;public float carried;public double sandVolume;public int pickups,drops;}
 #if UNITY_WEBGL && !UNITY_EDITOR
 [DllImport("__Internal")]static extern void NacreReport(string json);
 #endif
 void Start(){Application.targetFrameRate=60;sim=new NacreSimulation();Restore();Build();Report();}
 Mesh Grid(string name){int n=sim.N;var m=new Mesh{name=name,indexFormat=UnityEngine.Rendering.IndexFormat.UInt32};var p=new Vector3[n*n];var uv=new Vector2[p.Length];var tri=new int[(n-1)*(n-1)*6];int q=0;
  for(int z=0;z<n;z++)for(int x=0;x<n;x++){int k=sim.I(x,z);p[k]=new Vector3(sim.X(x),0,sim.X(z));uv[k]=new Vector2(x/(float)n,z/(float)n);if(x<n-1&&z<n-1){tri[q++]=k;tri[q++]=k+n;tri[q++]=k+1;tri[q++]=k+1;tri[q++]=k+n;tri[q++]=k+n+1;}}
  m.vertices=p;m.uv=uv;m.triangles=tri;m.RecalculateNormals();return m;
 }
 void Build(){
  RenderSettings.ambientMode=UnityEngine.Rendering.AmbientMode.Flat;RenderSettings.ambientLight=new Color(.53f,.56f,.53f);RenderSettings.fog=true;RenderSettings.fogColor=new Color(.32f,.45f,.48f);RenderSettings.fogMode=FogMode.Exponential;RenderSettings.fogDensity=.006f;
  cam=Camera.main;if(!cam){cam=new GameObject("Main Camera").AddComponent<Camera>();cam.tag="MainCamera";}cam.clearFlags=CameraClearFlags.SolidColor;cam.backgroundColor=new Color(.35f,.48f,.50f);cam.orthographic=true;cam.nearClipPlane=.1f;cam.farClipPlane=150;cam.allowHDR=true;cam.allowMSAA=true;
  sun=new GameObject("Soleil").AddComponent<Light>();sun.type=LightType.Directional;sun.transform.rotation=Quaternion.Euler(43,-35,0);sun.color=new Color(1,.88f,.71f);sun.intensity=1.15f;sun.shadows=LightShadows.Soft;sun.shadowBias=.035f;sun.shadowNormalBias=.25f;
  var floor=new GameObject("Île modelable");soilMesh=Grid("Sable vivant");floor.AddComponent<MeshFilter>().sharedMesh=soilMesh;var renderer=floor.AddComponent<MeshRenderer>();renderer.sharedMaterial=Resources.Load<Material>("SandMaterial");soilCollider=floor.AddComponent<MeshCollider>();soilV=soilMesh.vertices;soilC=new Color[soilV.Length];
  var sea=new GameObject("Mer à hauteur et vitesse");seaMesh=Grid("Houle simulée");sea.AddComponent<MeshFilter>().sharedMesh=seaMesh;waterMat=Resources.Load<Material>("WaterMaterial");sea.AddComponent<MeshRenderer>().sharedMaterial=waterMat;seaV=seaMesh.vertices;seaC=new Color[seaV.Length];
  // Stretch only the outermost water cells: a continuous ocean with no
  // detached plane seam, keeping the coastal simulation grid unchanged.
  for(int z=0;z<sim.N;z++)for(int x=0;x<sim.N;x++){int k=sim.I(x,z);if(x==0)seaV[k].x=-180;if(x==sim.N-1)seaV[k].x=180;if(z==0)seaV[k].z=-180;if(z==sim.N-1)seaV[k].z=180;}
  var ring=new GameObject("Empreinte de l’outil");var lr=ring.AddComponent<LineRenderer>();lr.positionCount=65;lr.loop=false;lr.startWidth=lr.endWidth=.028f;lr.material=new Material(Shader.Find("Sprites/Default"));lr.startColor=lr.endColor=new Color(.87f,.99f,.88f,.8f);ring.transform.parent=transform;marker=ring.transform;
  particles=new GameObject("Grains de sable");dust=particles.AddComponent<ParticleSystem>();var main=dust.main;main.loop=false;main.startLifetime=.55f;main.startSpeed=1;main.startSize=.026f;main.startColor=new Color(.82f,.7f,.47f);main.maxParticles=160;main.simulationSpace=ParticleSystemSimulationSpace.World;main.gravityModifier=1;var emission=dust.emission;emission.enabled=false;var shape=dust.shape;shape.shapeType=ParticleSystemShapeType.Sphere;shape.radius=.16f;
  var pm=particles.GetComponent<ParticleSystemRenderer>();pm.material=Resources.Load<Material>("ParticleMaterial");
  DressIsland();ChangeTool("shovel");UpdateMeshes();MoveCamera();
 }
 GameObject Spawn(string name,Vector3 position,float yaw,float scale){
  var parent=new GameObject(name);parent.transform.position=position;parent.transform.rotation=Quaternion.Euler(0,yaw,0);
  string source=name=="NacreShovel"?"ShovelMedium_01":name=="NacreRake"?"RakeMedium_01":name=="NacreWall"?"WallPortion_01":name=="NacreTower"?"TowerRound_01":name=="NacreShell"?"CalicoScallopShell_01":name=="NacreFish"?"Fish_01":name;
  string plant=name=="NacreBush"?"BuffaloGrass_01_ImposterAtlas":name=="NacreSeaGrass"?"Seagrass_01_ImposterAtlas":name=="NacreCoralPink"?"CarnationCoral_01_ImposterAtlas":name=="NacreCoralOchre"?"GroovedBrainCoral_01_ImposterAtlas":null;
  GameObject child;
  if(plant!=null){child=GameObject.CreatePrimitive(PrimitiveType.Quad);Destroy(child.GetComponent<Collider>());var m=new Material(Resources.Load<Material>("SourcePlantMaterial"));m.mainTexture=Resources.Load<Texture2D>("Sandcastle/"+plant);float n=(plant.Contains("Buffalo")||plant.Contains("Carnation"))?14:plant.Contains("Seagrass")?12:plant.Contains("Grooved")?8:16;m.mainTextureScale=Vector2.one/n;child.GetComponent<Renderer>().sharedMaterial=m;child.transform.SetParent(parent.transform,false);child.transform.localScale=Vector3.one*scale*1.8f;child.transform.localPosition=Vector3.up*scale*.8f;child.transform.rotation=cam.transform.rotation;sourceBillboards.Add(child.transform);}
  else{var prefab=Resources.Load<GameObject>("Sandcastle/"+source);bool original=prefab!=null;child=Instantiate(prefab?prefab:Resources.Load<GameObject>(name));child.transform.SetParent(parent.transform,false);child.transform.localScale*=scale;if(original)foreach(var r in child.GetComponentsInChildren<Renderer>())r.sharedMaterial=Resources.Load<Material>("SourceMaterial");}
  return parent;
 }
 Material Lit(Color c,float smooth=.2f){var m=new Material(Shader.Find("Standard"));m.color=c;m.SetFloat("_Glossiness",smooth);return m;}
 GameObject Primitive(string name,PrimitiveType p,Vector3 at,Vector3 scale,Material m){var o=GameObject.CreatePrimitive(p);o.name=name;o.transform.position=at;o.transform.localScale=scale;o.GetComponent<Renderer>().sharedMaterial=m;Destroy(o.GetComponent<Collider>());return o;}
 void DressIsland(){UnityEngine.Random.InitState(317);Material stone=Lit(new Color(.35f,.37f,.31f)),shell=Lit(new Color(.92f,.74f,.60f)),wood=Lit(new Color(.42f,.27f,.14f)),leaf=Lit(new Color(.29f,.43f,.22f));
  for(int i=0;i<44;i++){float a=i*2.399f;float r=i<20?1.08f+UnityEngine.Random.value*.55f:.87f;float x=Mathf.Cos(a)*6.5f*r,z=Mathf.Sin(a)*4.8f*r,h=sim.Sample(sim.ground,x,z);Spawn("Rock_0"+(1+i%6),new Vector3(x,h-.08f,z),i*37,.22f+UnityEngine.Random.value*.22f);}
  for(int i=0;i<28;i++){float a=i*2.399f,x=Mathf.Cos(a)*5.6f,z=Mathf.Sin(a)*4f,h=sim.Sample(sim.ground,x,z);var prefab=Resources.Load<GameObject>("NacreShell");if(prefab){var o=Spawn("NacreShell",new Vector3(x,h+.04f,z),a*57,.22f);}else Primitive("Coquillage",PrimitiveType.Sphere,new Vector3(x,h+.035f,z),new Vector3(.16f,.05f,.12f),shell);}
  for(int i=0;i<16;i++){float a=i*2.399f,cx=i<6?3.65f:i<11?1.55f:-3.5f,cz=i<6?1.3f:i<11?-2.65f:-1.6f,x=cx+Mathf.Cos(a)*(.25f+UnityEngine.Random.value*.5f),z=cz+Mathf.Sin(a)*(.2f+UnityEngine.Random.value*.4f);float h=sim.Sample(sim.ground,x,z);var prefab=Resources.Load<GameObject>("NacreBush");if(prefab){var o=Spawn("NacreBush",new Vector3(x,h,z),i*53,.48f+UnityEngine.Random.value*.25f);grasses.Add(o.transform);}else{for(int k=0;k<5;k++)Primitive("Buisson",PrimitiveType.Sphere,new Vector3(x+Mathf.Sin(k*2)*.24f,h+.27f,z+Mathf.Cos(k*2)*.24f),new Vector3(.7f,.55f,.6f),leaf);}}
  for(int i=0;i<50;i++){float a=i*2.399f,r=1.15f+(i%9)*.1f,x=Mathf.Cos(a)*6.5f*r,z=Mathf.Sin(a)*4.8f*r,h=sim.Sample(sim.ground,x,z);var o=Spawn("NacreSeaGrass",new Vector3(x,h,z),i*47,.7f+UnityEngine.Random.value*.6f);grasses.Add(o.transform);}
  for(int i=0;i<24;i++){float a=i*2.399f,x=Mathf.Cos(a)*7.9f,z=Mathf.Sin(a)*6.1f,h=sim.Sample(sim.ground,x,z);var coral=Spawn(i%2==0?"NacreCoralPink":"NacreCoralOchre",new Vector3(x,h,z),i*37,.7f+UnityEngine.Random.value*.7f);}
  var fishMat=Lit(new Color(.54f,.72f,.61f),.5f);for(int i=0;i<30;i++){var prefab=Resources.Load<GameObject>("NacreFish");GameObject f;if(prefab){f=Spawn("NacreFish",Vector3.zero,0,.26f);}else f=Primitive("Poisson",PrimitiveType.Sphere,Vector3.zero,new Vector3(.24f,.08f,.08f),fishMat);fishes.Add(f);}
  // Pier sits on driven piles; its stairs meet the island surface.
  for(int i=0;i<15;i++){float z=4+i*.16f;Primitive("Planche du ponton",PrimitiveType.Cube,new Vector3(-2.8f,.6f,z),new Vector3(1,.085f,.145f),wood);if(i%4==0)foreach(float x in new[]{-3.25f,-2.35f}){float h=sim.Sample(sim.ground,x,z);Primitive("Pieu",PrimitiveType.Cylinder,new Vector3(x,(h+.72f)/2,z),new Vector3(.11f,(.72f-h)/2,.11f),wood);}}
  for(int i=0;i<5;i++){float z=3.35f+i*.13f,h=Mathf.Lerp(sim.Sample(sim.ground,-2.8f,3.35f),.6f,i/4f);Primitive("Marche d’accès",PrimitiveType.Cube,new Vector3(-2.8f,h,z),new Vector3(.95f,.08f,.14f),wood);}
 }
 void Update(){float dt=Mathf.Min(Time.deltaTime,.05f);if(!paused){acc+=dt;while(acc>=1f/60){sim.Step(1f/60,Time.time);acc-=1f/60;}}
  InputTools(dt);meshT+=dt;if(meshT>.085f){UpdateMeshes();meshT=0;}Animate(dt);MoveCamera();saveT+=dt;if(saveT>8){SaveNow();saveT=0;}reportT+=dt;if(reportT>.4f){Report();reportT=0;}
 }
 void MoveCamera(){if(Input.GetMouseButton(1))orbit+=Input.GetAxis("Mouse X")*.025f;zoom=Mathf.Clamp(zoom-Input.mouseScrollDelta.y*.7f,7,21);cam.orthographicSize=Mathf.Max(zoom,7.5f/cam.aspect);cam.transform.position=new Vector3(Mathf.Sin(orbit)*25,23,Mathf.Cos(orbit)*25);cam.transform.LookAt(new Vector3(0,.4f,0));}
 void InputTools(float dt){var ray=cam.ScreenPointToRay(Input.mousePosition);RaycastHit r;hasHit=soilCollider.Raycast(ray,out r,120)&&Mathf.Abs(r.point.x)<5.4f&&Mathf.Abs(r.point.z)<3.9f;hit=r.point;if(toolVisual)toolVisual.SetActive(hasHit);marker.gameObject.SetActive(hasHit);if(hasHit){var lr=marker.GetComponent<LineRenderer>();for(int i=0;i<65;i++){float a=i/64f*Mathf.PI*2,x=hit.x+Mathf.Cos(a)*radius,z=hit.z+Mathf.Sin(a)*radius;lr.SetPosition(i,new Vector3(x,sim.Sample(sim.ground,x,z)+.05f,z));}}
  if(Input.GetMouseButtonDown(0)&&hasHit&&Time.time>=nextScoop){Checkpoint();holding=true;actions++;anim=1;motionTime=0;lastRake=hit;scoopOrigin=hit;moldStarted=Time.time;
   if(tool=="shovel"){scoopOrigin=hit;float capacity=radius<.3f?.005f:radius<.5f?.03f:.1f;carried=-sim.Scoop(hit.x,hit.z,radius,-capacity);pickups++;Emit(12);}
   if(tool=="wall"){sim.Stamp(hit.x,hit.z,tool,yaw,radius/.4f);stampCount++;Emit(50);SaveNow();}
  }
  if(Input.GetMouseButton(0)&&holding&&hasHit&&tool=="rake"){
   float distance=Vector3.Distance(hit,lastRake);int strokes=Mathf.CeilToInt(distance/Mathf.Max(.02f,radius*.15f));
   for(int i=1;i<=strokes;i++){var at=Vector3.Lerp(lastRake,hit,i/(float)strokes);sim.Sculpt(at.x,at.z,radius,"rake",false,Mathf.Min(distance,.5f)/strokes*.65f);}
   if(distance>.001f){yaw=Mathf.Atan2(hit.x-lastRake.x,hit.z-lastRake.z);anim=1;}lastRake=hit;
  }
  if(Input.GetMouseButtonUp(0)&&holding){if(tool=="tower"&&Time.time-moldStarted>.25f){sim.Stamp(scoopOrigin.x,scoopOrigin.z,tool,yaw,radius/.4f);stampCount++;Emit(50);}if(tool=="shovel"){Deposit(hasHit?hit:scoopOrigin);nextScoop=Time.time+.3f;}holding=false;motionTime=0;SaveNow();Report();}
 }
 void Deposit(Vector3 at){if(carried<=0)return;sim.Scoop(at.x,at.z,radius,carried);carried=0;drops++;hit=at;Emit(12);}
 void SettleScoop(){if(carried>0)Deposit(scoopOrigin);holding=false;}

 void Emit(int n){particles.transform.position=hit+Vector3.up*.1f;dust.Emit(n);}
 void Animate(float dt){anim=Mathf.Max(0,anim-dt*2.8f);motionTime+=dt;if(toolVisual&&hasHit){if(holding&&tool=="tower"){toolVisual.transform.position=scoopOrigin;if(Vector3.Distance(hit,scoopOrigin)>.05f)yaw=Mathf.Atan2(hit.x-scoopOrigin.x,hit.z-scoopOrigin.z);}else toolVisual.transform.position=hit;toolVisual.transform.rotation=Quaternion.Euler(0,yaw*Mathf.Rad2Deg,0);string family=tool=="shovel"?"Shovel":tool=="rake"?"Rake":"Mold";string state=(holding||anim>0)?(family=="Mold"?"Molding":"Performing"):"Active";SourceMotion.Apply(toolMotion,family+"@"+state,motionTime);}
  if(sandpile)sandpile.gameObject.SetActive(carried>0);
  for(int i=0;i<fishes.Count;i++){float a=i*.57f+Time.time*(.12f+(i%4)*.02f),r=1.35f+(i%7)*.07f,x=Mathf.Cos(a)*6.5f*r,z=Mathf.Sin(a)*4.8f*r,h=sim.Sample(sim.ground,x,z);fishes[i].transform.position=new Vector3(x,Mathf.Max(h+.16f,-.62f)+Mathf.Sin(Time.time+i)*.05f,z);fishes[i].transform.rotation=Quaternion.Euler(0,-a*Mathf.Rad2Deg+90,Mathf.Sin(Time.time*9+i)*8);}
  for(int i=0;i<grasses.Count;i++)grasses[i].rotation=Quaternion.Euler(Mathf.Sin(Time.time*1.3f+i)*4,0,Mathf.Cos(Time.time+i)*5);
  foreach(var b in sourceBillboards)if(b){b.rotation=cam.transform.rotation;var m=b.GetComponent<Renderer>().sharedMaterial;float n=1/m.mainTextureScale.x;var d=(cam.transform.position-b.position).normalized;float den=Mathf.Abs(d.x)+Mathf.Abs(d.y)+Mathf.Abs(d.z);float u=d.x/den*.5f+.5f,v=d.z/den*.5f+.5f;m.mainTextureOffset=new Vector2(Mathf.Round(u*(n-1))/n,Mathf.Round(v*(n-1))/n);}
 }
 void UpdateMeshes(){Shader.SetGlobalFloat("_NacreSeaLevel",sim.tide);for(int k=0;k<soilV.Length;k++){soilV[k].y=sim.ground[k];soilC[k]=new Color(sim.wet[k],sim.compact[k],0,1);seaV[k].y=sim.tide+sim.water[k];float d=Mathf.Max(0,seaV[k].y-sim.ground[k]);float speed=Mathf.Sqrt(sim.vx[k]*sim.vx[k]+sim.vz[k]*sim.vz[k]);float foam=d<.28f&&d>.008f?Mathf.Clamp01(speed*.7f+Mathf.Abs(sim.water[k])*.6f)*.65f:0;seaC[k]=new Color(d,foam,0,1);}
  soilMesh.vertices=soilV;soilMesh.colors=soilC;soilMesh.RecalculateNormals();soilMesh.RecalculateBounds();soilCollider.sharedMesh=null;soilCollider.sharedMesh=soilMesh;seaMesh.vertices=seaV;seaMesh.colors=seaC;seaMesh.RecalculateNormals();seaMesh.RecalculateBounds();
 }
 public void ChangeTool(string s){if(s!="shovel"&&s!="rake"&&s!="wall"&&s!="tower")return;SettleScoop();tool=s;holding=false;motionTime=0;if(toolVisual)Destroy(toolVisual);string name=s=="shovel"?"NacreShovel":s=="rake"?"NacreRake":s=="wall"?"NacreWall":"NacreTower";var prefab=Resources.Load<GameObject>(name);if(prefab){toolVisual=Spawn(name,Vector3.zero,0,.7f);var model=toolVisual.transform.GetChild(0);toolMotion=new GameObject("Original streamed motion").transform;toolMotion.SetParent(toolVisual.transform,false);model.SetParent(toolMotion,false);sandpile=null;if(s=="shovel"){var pile=Resources.Load<GameObject>("Sandcastle/ShovelMediumSandpile_01");if(pile){var o=Instantiate(pile,toolMotion);o.transform.localScale*=.7f;foreach(var rr in o.GetComponentsInChildren<Renderer>())rr.sharedMaterial=Resources.Load<Material>("SourceMaterial");sandpile=o.transform;o.SetActive(false);}}}Report();}
 public void Mode(string s){add=s=="add";Report();}public void Size(string s){float f;if(float.TryParse(s,System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out f)){SettleScoop();radius=Mathf.Clamp(f,.2f,.6f);}}
 public void Rotate(string s){yaw+=Mathf.PI/4;Report();}public void Wave(string s){float f;if(float.TryParse(s,System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out f))sim.wave=Mathf.Clamp(f,0,.2f);Report();}
 public void Tide(string s){float f;if(float.TryParse(s,System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out f))sim.tide=Mathf.Clamp(f,-.18f,.48f);Report();}
 public void Night(string s){night=!night;sun.intensity=night?.21f:1.15f;sun.color=night?new Color(.63f,.7f,1):new Color(1,.88f,.71f);RenderSettings.ambientLight=night?new Color(.18f,.13f,.2f):new Color(.53f,.56f,.53f);cam.backgroundColor=night?new Color(.17f,.07f,.14f):new Color(.35f,.48f,.5f);RenderSettings.fogColor=cam.backgroundColor;waterMat.SetFloat("_Night",night?1:0);Report();}
 public void Pause(string s){paused=!paused;Report();}public void Fill(string s){bucket=8;Report();}
 string Snapshot(){var b=new byte[sim.ground.Length*4];for(int i=0;i<sim.ground.Length;i++){short h=(short)Mathf.RoundToInt(Mathf.Clamp(sim.ground[i],-3,5)*1000);b[i*4]=(byte)(h&255);b[i*4+1]=(byte)((h>>8)&255);b[i*4+2]=(byte)Mathf.RoundToInt(Mathf.Clamp01(sim.compact[i])*255);b[i*4+3]=(byte)Mathf.RoundToInt(Mathf.Clamp01(sim.wet[i])*255);}return JsonUtility.ToJson(new Save{cells=Convert.ToBase64String(b),bucket=bucket,actions=actions,stamps=stampCount});}
 void Checkpoint(){undo.Push(Snapshot());while(undo.Count>20){var a=undo.ToArray();undo.Clear();for(int i=18;i>=0;i--)undo.Push(a[i]);}}
 void Apply(string json){try{var d=JsonUtility.FromJson<Save>(json);if(d?.version!=3||string.IsNullOrEmpty(d.cells))return;var b=Convert.FromBase64String(d.cells);if(b.Length!=sim.ground.Length*4)return;for(int i=0;i<sim.ground.Length;i++){sim.ground[i]=(short)(b[i*4]|b[i*4+1]<<8)*.001f;sim.compact[i]=b[i*4+2]/255f;sim.wet[i]=b[i*4+3]/255f;}bucket=Mathf.Clamp(d.bucket,0,8);actions=d.actions;stampCount=d.stamps;}catch(Exception e){Debug.LogWarning("Sauvegarde Nacre ignorée : "+e.Message);}}
 void Restore(){if(PlayerPrefs.HasKey("nacre-island-v3"))Apply(PlayerPrefs.GetString("nacre-island-v3"));}
 public void ImportLegacy(string json){if(PlayerPrefs.HasKey("nacre-island-v3"))return;try{var d=JsonUtility.FromJson<Legacy>(json);if(d?.version!=1)return;if(d.sable?.Length==101*41){for(int z=0;z<sim.N;z++)for(int x=0;x<sim.N;x++){float px=sim.X(x),pz=sim.X(z);if(Mathf.Abs(px)>=3||Mathf.Abs(pz)>=1.2f)continue;int i=Mathf.Clamp(Mathf.RoundToInt((px+3)/6*100),0,100),j=Mathf.Clamp(Mathf.RoundToInt((pz+1.2f)/2.4f*40),0,40);float v=d.sable[j*101+i];if(!float.IsNaN(v)&&!float.IsInfinity(v))sim.ground[sim.I(x,z)]+=Mathf.Clamp(v,-.65f,1.3f);}}if(d.pieces!=null)foreach(var p in d.pieces){float x=p.x+3.64f,z=p.z-11.34f;if(Mathf.Abs(x)>5||Mathf.Abs(z)>3)continue;sim.Stamp(x,z,p.type=="mur"?"wall":"tower",p.angle,Mathf.Clamp(p.taille,.6f,1.5f));stampCount++;}UpdateMeshes();SaveNow();Report();}catch(Exception e){Debug.LogWarning("Ancienne création conservée : "+e.Message);}}
 public void Undo(string s){SettleScoop();if(undo.Count==0)return;Apply(undo.Pop());undoCount++;UpdateMeshes();SaveNow();Report();}
 public void ResetIsland(string s){SettleScoop();Checkpoint();Array.Copy(sim.initial,sim.ground,sim.ground.Length);Array.Clear(sim.water,0,sim.water.Length);for(int i=0;i<sim.compact.Length;i++){sim.compact[i]=.45f;sim.wet[i]=0;}stampCount=0;UpdateMeshes();SaveNow();Report();}
 public void FinishGesture(string s){SettleScoop();SaveNow();}
 public void SaveNow(){if(sim==null||carried>0)return;PlayerPrefs.SetString("nacre-island-v3",Snapshot());PlayerPrefs.Save();}
 void OnApplicationPause(bool p){if(p){SettleScoop();SaveNow();}}void OnApplicationQuit(){SettleScoop();SaveNow();}
 void Report(){if(sim==null)return;float min=10,max=-10,en=0,v=0;for(int i=0;i<sim.ground.Length;i++){min=Mathf.Min(min,sim.ground[i]);max=Mathf.Max(max,sim.ground[i]);en+=sim.water[i]*sim.water[i];v+=Mathf.Abs(sim.vx[i])+Mathf.Abs(sim.vz[i]);}double sandVolume=0;foreach(float h in sim.ground)sandVolume+=h*sim.Cell*sim.Cell;string json=JsonUtility.ToJson(new State{holding=holding,carried=carried,pickups=pickups,drops=drops,sandVolume=sandVolume,tool=tool,steps=sim.steps,actions=actions,stamps=stampCount,undo=undoCount,fish=fishes.Count,shells=28,min=min,max=max,bucket=bucket,wave=sim.wave,tide=sim.tide,waterEnergy=en,velocity=v,eroded=sim.eroded,deposited=sim.deposited,night=night,paused=paused});
  #if UNITY_WEBGL && !UNITY_EDITOR
  NacreReport(json);
  #else
  Debug.Log("NACRE_STATE "+json);
  #endif
 }
}
