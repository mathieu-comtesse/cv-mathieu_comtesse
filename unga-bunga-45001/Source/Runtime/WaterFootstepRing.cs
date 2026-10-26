using UnityEngine;
namespace UngaBunga45001
{
    public sealed class WaterFootstepRing:MonoBehaviour
    {
        private float age;private Renderer target;private MaterialPropertyBlock properties;
        private void Awake(){target=GetComponent<Renderer>();properties=new MaterialPropertyBlock();}
        private void Update(){age+=Time.deltaTime;float u=age/.7f;transform.localScale=Vector3.one*Mathf.Lerp(.35f,1.7f,u);var color=new Color(.40f,.71f,.70f,Mathf.Lerp(.42f,0,u));properties.SetColor("_UnlitColor",color);properties.SetColor("_BaseColor",color);target.SetPropertyBlock(properties);if(u>=1)Destroy(gameObject);}
    }
}
