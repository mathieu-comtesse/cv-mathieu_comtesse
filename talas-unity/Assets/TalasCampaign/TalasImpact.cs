using UnityEngine;
public class TalasImpact:MonoBehaviour
{
 Vector3 velocity;float life;Material material;
 public static void Burst(Vector3 p,Color color)
 {
  for(int i=0;i<14;i++){var go=GameObject.CreatePrimitive(PrimitiveType.Cube);go.name="Éclat";go.transform.position=p;go.transform.localScale=new Vector3(.06f,.12f,.06f);Destroy(go.GetComponent<Collider>());var m=new Material(Shader.Find("Universal Render Pipeline/Unlit"));m.color=color;go.GetComponent<Renderer>().sharedMaterial=m;var fx=go.AddComponent<TalasImpact>();fx.material=m;float a=i*Mathf.PI*2/14;fx.velocity=new Vector3(Mathf.Cos(a)*3,Mathf.Sin(a)*3+2,0);fx.life=.6f;}
 }
 void Update(){velocity.y-=8*Time.deltaTime;transform.position+=velocity*Time.deltaTime;transform.Rotate(70*Time.deltaTime,0,180*Time.deltaTime);life-=Time.deltaTime;transform.localScale*=1-Time.deltaTime*.8f;if(life<=0)Destroy(gameObject);}
 void OnDestroy(){if(material!=null)Destroy(material);}
}
