using System;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed class AccidentRagdoll:MonoBehaviour
    {
        sealed class Bone{public Transform bone;public Rigidbody body;public CharacterJoint joint;}
        readonly List<Bone> bones=new List<Bone>();readonly List<Mesh> owned=new List<Mesh>();Vector3 origin;bool frozen;
        public int Bodies=>bones.Count;public bool Frozen=>frozen;public bool Detached{get;private set;}
        public void Create(CharacterBinding binding,Vector3 position,float yaw,int gore,Material blood)
        {
            origin=position;var original=binding.meshyActor;var model=Instantiate(original,transform);model.name="Corps natif · "+binding.id;model.SetActive(true);
            var animator=model.GetComponentInChildren<Animator>(true);model.transform.position+=position+Vector3.up*.95f-animator.GetBoneTransform(HumanBodyBones.Hips).position;
            foreach(var behaviour in model.GetComponentsInChildren<MonoBehaviour>(true))if(behaviour!=null)Destroy(behaviour);
            foreach(var audio in model.GetComponentsInChildren<AudioSource>(true))audio.enabled=false;
            animator.enabled=false;
            foreach(var collider in model.GetComponentsInChildren<Collider>(true))Destroy(collider);
            var map=new Dictionary<HumanBodyBones,Bone>();
            var specs=new[]{(HumanBodyBones.Hips,HumanBodyBones.LastBone,HumanBodyBones.Chest),(HumanBodyBones.Chest,HumanBodyBones.Hips,HumanBodyBones.Head),(HumanBodyBones.Head,HumanBodyBones.Chest,HumanBodyBones.LastBone),
                (HumanBodyBones.LeftUpperArm,HumanBodyBones.Chest,HumanBodyBones.LeftLowerArm),(HumanBodyBones.LeftLowerArm,HumanBodyBones.LeftUpperArm,HumanBodyBones.LeftHand),(HumanBodyBones.LeftHand,HumanBodyBones.LeftLowerArm,HumanBodyBones.LastBone),
                (HumanBodyBones.RightUpperArm,HumanBodyBones.Chest,HumanBodyBones.RightLowerArm),(HumanBodyBones.RightLowerArm,HumanBodyBones.RightUpperArm,HumanBodyBones.RightHand),(HumanBodyBones.RightHand,HumanBodyBones.RightLowerArm,HumanBodyBones.LastBone),
                (HumanBodyBones.LeftUpperLeg,HumanBodyBones.Hips,HumanBodyBones.LeftLowerLeg),(HumanBodyBones.LeftLowerLeg,HumanBodyBones.LeftUpperLeg,HumanBodyBones.LeftFoot),(HumanBodyBones.LeftFoot,HumanBodyBones.LeftLowerLeg,HumanBodyBones.LastBone),
                (HumanBodyBones.RightUpperLeg,HumanBodyBones.Hips,HumanBodyBones.RightLowerLeg),(HumanBodyBones.RightLowerLeg,HumanBodyBones.RightUpperLeg,HumanBodyBones.RightFoot),(HumanBodyBones.RightFoot,HumanBodyBones.RightLowerLeg,HumanBodyBones.LastBone)};
            var colliders=new List<Collider>();
            foreach(var spec in specs)
            {
                var bone=animator.GetBoneTransform(spec.Item1);if(bone==null)continue;var go=new GameObject("Physique bornée · "+spec.Item1);go.transform.SetParent(transform);go.transform.SetPositionAndRotation(bone.position,bone.rotation);
                var rb=go.AddComponent<Rigidbody>();rb.mass=spec.Item1==HumanBodyBones.Hips?8:spec.Item1==HumanBodyBones.Chest?6:1;rb.linearDamping=.7f;rb.angularDamping=1.5f;rb.maxLinearVelocity=11;rb.maxAngularVelocity=12;rb.collisionDetectionMode=CollisionDetectionMode.ContinuousSpeculative;rb.solverIterations=12;
                var shape=new GameObject("Volume de collision");shape.transform.SetParent(go.transform,false);var end=spec.Item3==HumanBodyBones.LastBone?null:animator.GetBoneTransform(spec.Item3);var delta=end==null?Vector3.up*.15f:end.position-bone.position;shape.transform.localPosition=go.transform.InverseTransformVector(delta*.5f);shape.transform.rotation=Quaternion.FromToRotation(Vector3.up,delta.normalized);var capsule=shape.AddComponent<CapsuleCollider>();capsule.height=Mathf.Max(.14f,delta.magnitude);capsule.radius=spec.Item1==HumanBodyBones.Chest?.16f:spec.Item1==HumanBodyBones.Hips?.14f:.075f;colliders.Add(capsule);
                var entry=new Bone{bone=bone,body=rb};bones.Add(entry);map[spec.Item1]=entry;
                if(map.TryGetValue(spec.Item2,out var parent))
                {var joint=go.AddComponent<CharacterJoint>();joint.connectedBody=parent.body;joint.anchor=Vector3.zero;joint.autoConfigureConnectedAnchor=true;joint.enablePreprocessing=false;joint.lowTwistLimit=new SoftJointLimit{limit=-25};joint.highTwistLimit=new SoftJointLimit{limit=25};joint.swing1Limit=new SoftJointLimit{limit=35};joint.swing2Limit=new SoftJointLimit{limit=30};entry.joint=joint;}
            }
            for(int i=0;i<colliders.Count;i++)for(int j=i+1;j<colliders.Count;j++)Physics.IgnoreCollision(colliders[i],colliders[j]);
            if(gore==0&&map.TryGetValue(HumanBodyBones.LeftLowerArm,out var forearm))DetachLimb(model,animator,forearm,blood);
        }
        void DetachLimb(GameObject model,Animator animator,Bone forearm,Material blood)
        {
            var skin=model.GetComponentsInChildren<SkinnedMeshRenderer>(true).FirstOrDefault(s=>s.bones.Length>20);if(skin==null||!skin.sharedMesh.isReadable)return;
            var weights=skin.sharedMesh.boneWeights;var selected=new HashSet<int>();for(int i=0;i<skin.bones.Length;i++)if(skin.bones[i]==forearm.bone||skin.bones[i].IsChildOf(forearm.bone))selected.Add(i);
            bool InLimb(int i){var w=weights[i];return (selected.Contains(w.boneIndex0)?w.weight0:0)+(selected.Contains(w.boneIndex1)?w.weight1:0)+(selected.Contains(w.boneIndex2)?w.weight2:0)+(selected.Contains(w.boneIndex3)?w.weight3:0)>.55f;}
            var full=skin.sharedMesh.triangles;var cut=new List<int>();var kept=new List<int>();for(int i=0;i<full.Length;i+=3){var list=(InLimb(full[i])?1:0)+(InLimb(full[i+1])?1:0)+(InLimb(full[i+2])?1:0)>=2?cut:kept;list.Add(full[i]);list.Add(full[i+1]);list.Add(full[i+2]);}if(cut.Count==0)return;
            var baked=new Mesh();skin.BakeMesh(baked);var vertices=baked.vertices;for(int i=0;i<vertices.Length;i++)vertices[i]=forearm.body.transform.InverseTransformPoint(skin.transform.TransformPoint(vertices[i]));baked.vertices=vertices;baked.triangles=cut.ToArray();baked.RecalculateBounds();baked.RecalculateNormals();owned.Add(baked);
            var limb=new GameObject("Membre natif détaché");limb.transform.SetParent(forearm.body.transform,false);limb.AddComponent<MeshFilter>().sharedMesh=baked;limb.AddComponent<MeshRenderer>().sharedMaterial=skin.sharedMaterial;
            var body=Instantiate(skin.sharedMesh);body.triangles=kept.ToArray();skin.sharedMesh=body;owned.Add(body);if(forearm.joint!=null)Destroy(forearm.joint);Detached=true;
            var cap=GameObject.CreatePrimitive(PrimitiveType.Cylinder);cap.name="Section rouge stylisée";Destroy(cap.GetComponent<Collider>());cap.transform.SetParent(forearm.body.transform,false);cap.transform.localScale=new Vector3(.105f,.012f,.105f);cap.GetComponent<MeshRenderer>().sharedMaterial=blood;
        }
        public void Impulse(Vector3 impulse){foreach(var bone in bones)bone.body.AddForce(impulse,ForceMode.VelocityChange);if(bones.Count>0)bones[0].body.AddTorque(new Vector3(2,0,4),ForceMode.VelocityChange);}
        void LateUpdate()
        {
            foreach(var b in bones)
            {if(!frozen&&(b.body.position-origin).sqrMagnitude>225){b.body.position=origin+Vector3.ClampMagnitude(b.body.position-origin,12);b.body.linearVelocity=Vector3.zero;}b.bone.SetPositionAndRotation(b.body.position,b.body.rotation);}
        }
        public void Freeze(){frozen=true;foreach(var bone in bones){bone.body.linearVelocity=Vector3.zero;bone.body.angularVelocity=Vector3.zero;bone.body.isKinematic=true;}}
        void OnDestroy(){foreach(var mesh in owned)if(mesh!=null)Destroy(mesh);}
    }
}
