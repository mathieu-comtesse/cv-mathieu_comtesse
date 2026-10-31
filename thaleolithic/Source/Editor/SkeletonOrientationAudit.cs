using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
namespace UngaBunga45001.Editor
{
    public static class SkeletonOrientationAudit
    {
        public static void Inspect()
        {
            var notes=new System.Collections.Generic.List<string>();
            foreach(var name in PrehistoricCastV2.Names)
            {
                var source=AssetDatabase.LoadAssetAtPath<GameObject>(PrehistoricCastV2.Root+"/"+name+"/"+name+".fbx");var instance=UnityEngine.Object.Instantiate(source);var animator=instance.GetComponentInChildren<Animator>();animator.fireEvents=false;
                animator.runtimeAnimatorController=PrehistoricCastV2.Controller(name.ToLowerInvariant());
                foreach(var pose in new[]{"Locomotion","Talk","Work"})
                {
                    animator.Rebind();animator.Play(pose,0,0);animator.SetFloat("Speed",pose=="Locomotion"?.5f:0);animator.Update(.4f);
                    var head=animator.GetBoneTransform(HumanBodyBones.Head);var chest=animator.GetBoneTransform(HumanBodyBones.Chest);var hip=animator.GetBoneTransform(HumanBodyBones.Hips);var lf=animator.GetBoneTransform(HumanBodyBones.LeftFoot);var lt=animator.GetBoneTransform(HumanBodyBones.LeftToes);var rf=animator.GetBoneTransform(HumanBodyBones.RightFoot);var rt=animator.GetBoneTransform(HumanBodyBones.RightToes);
                    Vector3 feet=(lt.position-lf.position)+(rt.position-rf.position);feet.y=0;feet.Normalize();
                    notes.Add(name+" "+pose+" headForward="+head.forward+" chestForward="+chest.forward+" hipsForward="+hip.forward+" feet="+feet+" headDotFeet="+Vector3.Dot(head.forward,feet)+" chestDotFeet="+Vector3.Dot(chest.forward,feet)+" headUp="+head.up+" valid="+animator.avatar.isValid);
                }
                UnityEngine.Object.DestroyImmediate(instance);
            }
            File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision3/skeleton-orientation.txt",notes);
        }
    }
}
