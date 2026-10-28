using UnityEngine;
namespace UngaBunga45001
{
    public sealed class WaterfallFlow:MonoBehaviour
    {
        public Renderer target;private MaterialPropertyBlock properties;
        private void Update(){if(target==null)return;if(properties==null)properties=new MaterialPropertyBlock();target.GetPropertyBlock(properties);properties.SetVector("_BaseColorMap_ST",new Vector4(2,2,0,-Time.time*.28f));target.SetPropertyBlock(properties);}
    }
}
