using UnityEngine;
namespace UngaBunga45001
{
    public sealed class CarriedLoad:MonoBehaviour
    {
        public Animator animator;public Transform actor;public Mesh mesh;public Material material;
        public bool carrying;public int deposits;
        GameObject load;float weight;
        void Start()
        {
            load=new GameObject("Charge transportée / prise à deux mains");load.transform.SetParent(actor,false);load.transform.localPosition=new Vector3(0,.97f,.40f);
            load.AddComponent<MeshFilter>().sharedMesh=mesh;load.AddComponent<MeshRenderer>().sharedMaterial=material;
            if(mesh!=null){float scale=.56f/Mathf.Max(mesh.bounds.size.x,mesh.bounds.size.y,mesh.bounds.size.z);load.transform.localScale=Vector3.one*scale;load.transform.localPosition-=mesh.bounds.center*scale;}
            load.SetActive(false);
        }
        void Update(){weight=Mathf.MoveTowards(weight,carrying?1:0,Time.deltaTime*5);if(load!=null)load.SetActive(carrying);}
        void OnAnimatorIK(int layer)
        {
            if(!enabled||animator==null||actor==null||!animator.isHuman||weight<=0)return;
            animator.SetIKPositionWeight(AvatarIKGoal.LeftHand,weight);animator.SetIKPositionWeight(AvatarIKGoal.RightHand,weight);
            animator.SetIKPosition(AvatarIKGoal.LeftHand,actor.TransformPoint(new Vector3(-.19f,.99f,.40f)));animator.SetIKPosition(AvatarIKGoal.RightHand,actor.TransformPoint(new Vector3(.19f,.99f,.40f)));
        }
        public void Deposit(){carrying=false;deposits++;}
        public void ShowPresentation(bool visible){if(load!=null)load.SetActive(visible&&carrying);}
    }
}
