using System;
using UnityEngine;
namespace UngaBunga45001
{
    // Stable low-poly fire independent of the unavailable native fuel/VFX scripts.
    public sealed class NativeFire:MonoBehaviour
    {
        public static readonly System.Collections.Generic.List<NativeFire> ActiveFires=new System.Collections.Generic.List<NativeFire>();
        UnityEngine.AI.NavMeshObstacle exclusion;
        void OnEnable(){if(!ActiveFires.Contains(this))ActiveFires.Add(this);exclusion=GetComponent<UnityEngine.AI.NavMeshObstacle>();if(exclusion==null)exclusion=gameObject.AddComponent<UnityEngine.AI.NavMeshObstacle>();exclusion.shape=UnityEngine.AI.NavMeshObstacleShape.Capsule;exclusion.carving=true;exclusion.carveOnlyStationary=false;exclusion.center=Vector3.up;exclusion.height=2.5f;exclusion.radius=radius+.8f;exclusion.enabled=lit;}
        void OnDisable(){ActiveFires.Remove(this);if(exclusion!=null)exclusion.enabled=false;}
        public Material outerMaterial,innerMaterial,coalMaterial;public AudioClip crackle;
        public bool lit=true;public float radius=.45f,height=1.05f;
        public int AnimatedFlames=>flames?.Length??0;public Light WarmLight{get;private set;}
        Transform[] flames,embers;AudioSource audioSource;float phase;Mesh flameMesh,coalMesh;
        void Start()
        {
            phase=Mathf.Abs(transform.position.x*3.71f+transform.position.z*1.13f);
            flameMesh=new Mesh{name="Flamme polyédrique"};flameMesh.vertices=new[]{new Vector3(-.5f,0,-.3f),new Vector3(.5f,0,-.3f),new Vector3(0,0,.5f),new Vector3(-.22f,.45f,-.12f),new Vector3(.22f,.45f,-.12f),new Vector3(0,.45f,.22f),new Vector3(.04f,1,0)};flameMesh.triangles=new[]{0,1,3,1,4,3,1,2,4,2,5,4,2,0,5,0,3,5,3,4,6,4,5,6,5,3,6,2,1,0};flameMesh.RecalculateNormals();
            coalMesh=new Mesh{name="Braise polygonale"};coalMesh.vertices=new[]{Vector3.up*.4f,Vector3.down*.4f,Vector3.left*.5f,Vector3.right*.5f,Vector3.forward*.5f,Vector3.back*.5f};coalMesh.triangles=new[]{0,4,3,0,2,4,0,5,2,0,3,5,1,3,4,1,4,2,1,2,5,1,5,3};coalMesh.RecalculateNormals();
            Transform Make(string name,Mesh mesh,Material material){var go=new GameObject(name);go.transform.SetParent(transform,false);go.AddComponent<MeshFilter>().sharedMesh=mesh;var renderer=go.AddComponent<MeshRenderer>();renderer.sharedMaterial=material;renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;return go.transform;}
            flames=new Transform[7];for(int i=0;i<flames.Length;i++)flames[i]=Make("Flamme "+i,flameMesh,i<4?outerMaterial:innerMaterial);
            embers=new Transform[9];for(int i=0;i<embers.Length;i++)embers[i]=Make("Étincelle "+i,coalMesh,innerMaterial);
            for(int i=0;i<8;i++){var coal=Make("Braise "+i,coalMesh,coalMaterial);float a=i*2.399f;coal.localPosition=new Vector3(Mathf.Sin(a)*radius*.7f,.025f,Mathf.Cos(a)*radius*.7f);coal.localScale=new Vector3(.19f,.085f,.16f);}
            var glow=new GameObject("Lumière chaude du foyer");glow.transform.SetParent(transform,false);glow.transform.localPosition=Vector3.up*.65f;WarmLight=glow.AddComponent<Light>();WarmLight.type=LightType.Point;WarmLight.color=new Color(1,.39f,.085f);WarmLight.range=7;WarmLight.intensity=1800;WarmLight.shadows=LightShadows.Soft;
            RenderBackend.FireLight(WarmLight);
            audioSource=gameObject.AddComponent<AudioSource>();audioSource.clip=crackle;audioSource.loop=true;audioSource.spatialBlend=1;audioSource.minDistance=1;audioSource.maxDistance=14;audioSource.rolloffMode=AudioRolloffMode.Linear;audioSource.volume=.32f;if(lit&&crackle!=null)audioSource.Play();
        }
        void Update()
        {
            if(exclusion!=null){exclusion.enabled=lit;exclusion.radius=radius+.8f;}
            if(flames==null)return;float t=Time.time+phase;bool active=lit;
            foreach(var f in flames)if(f.gameObject.activeSelf!=active)f.gameObject.SetActive(active);
            foreach(var e in embers)if(e.gameObject.activeSelf!=active)e.gameObject.SetActive(active);
            WarmLight.enabled=active;if(!active){if(audioSource.isPlaying)audioSource.Stop();return;}if(!audioSource.isPlaying&&crackle!=null)audioSource.Play();
            for(int i=0;i<flames.Length;i++){float a=i*2.399f,s=i<4?1:.56f;flames[i].localPosition=new Vector3(Mathf.Sin(a)*radius*.42f,0,Mathf.Cos(a)*radius*.42f);flames[i].localScale=new Vector3(radius*s*(.75f+.15f*Mathf.Sin(t*8+i)),height*s*(.85f+.18f*Mathf.Sin(t*5.7f+i*1.4f)),radius*s);flames[i].localRotation=Quaternion.Euler(Mathf.Sin(t*4+i)*6,t*13+i*65,Mathf.Cos(t*3+i)*7);}
            for(int i=0;i<embers.Length;i++){float y=Mathf.Repeat(t*.43f+i*.23f,1);embers[i].localPosition=new Vector3(Mathf.Sin(t*.8f+i)*radius*.7f,y*height*2.2f,Mathf.Cos(t+i)*radius*.6f);embers[i].localScale=Vector3.one*(1-y)*.045f;}
            WarmLight.intensity=(RenderBackend.HDRP?1800:2.5f)*(.92f+.08f*Mathf.Sin(t*17)+.045f*Mathf.Sin(t*31));
        }
        void OnDestroy(){if(flameMesh!=null)Destroy(flameMesh);if(coalMesh!=null)Destroy(coalMesh);}
    }
}
