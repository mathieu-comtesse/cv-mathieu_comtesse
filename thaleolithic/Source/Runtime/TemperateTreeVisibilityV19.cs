using System.Collections.Generic;using UnityEngine;using UnityEngine.Rendering;
namespace UngaBunga45001{
 public sealed class TemperateTreeVisibilityV19:MonoBehaviour{
  struct Tree{public Renderer renderer;public Vector3 foot;public bool wasHidden;}
  readonly List<Tree> trees=new List<Tree>();CampaignRuntime c;public int HiddenTrees{get;private set;}
  void Start(){c=GetComponent<CampaignRuntime>();foreach(var mesh in FindObjectsByType<MeshFilter>(FindObjectsSortMode.None)){if(mesh.sharedMesh==null)continue;string n=mesh.sharedMesh.name;if(!n.StartsWith("tree-")&&!n.StartsWith("TH19E_Tree"))continue;var r=mesh.GetComponent<Renderer>();if(r==null)continue;var b=r.bounds;trees.Add(new Tree{renderer=r,foot=new Vector3(b.center.x,b.min.y,b.center.z),wasHidden=r.forceRenderingOff});}RenderPipelineManager.beginCameraRendering+=BeforeCamera;}
  void BeforeCamera(ScriptableRenderContext context,Camera camera){if(c==null||c.State==null||(camera.cullingMask&1)==0||camera.cameraType==CameraType.Preview)return;int hidden=0;foreach(var tree in trees){if(tree.renderer==null)continue;float depth=Vector3.Dot(tree.foot-camera.transform.position,camera.transform.forward);bool beyond=depth>camera.farClipPlane-4;tree.renderer.forceRenderingOff=tree.wasHidden||beyond;if(beyond)hidden++;}HiddenTrees=hidden;}
  void OnDisable(){RenderPipelineManager.beginCameraRendering-=BeforeCamera;foreach(var tree in trees)if(tree.renderer!=null)tree.renderer.forceRenderingOff=tree.wasHidden;}
 }
}
