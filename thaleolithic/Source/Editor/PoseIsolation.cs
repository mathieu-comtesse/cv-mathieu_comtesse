using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
namespace UngaBunga45001.Editor
{
    public static class PoseIsolation
    {
        public static void Run(CampaignRuntime campaign)
        {
            var notes=new System.Collections.Generic.List<string>();
            foreach(string path in new[]{"Assets/UngaBunga45001/NativeCastV2/Dylan/Dylan.fbx","Assets/Resources/NPC_Twig_Member.prefab"})
            {
                var go=UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path));go.transform.position=new Vector3(5000,0,5000);
                foreach(var script in go.GetComponentsInChildren<MonoBehaviour>(true))if(script!=null)UnityEngine.Object.DestroyImmediate(script);
                go.SetActive(true);var animator=go.GetComponentsInChildren<Animator>(true).FirstOrDefault();if(animator==null){notes.Add(path+" no animator");UnityEngine.Object.DestroyImmediate(go);continue;}
                for(var t=animator.transform;t!=null&&t.IsChildOf(go.transform);t=t.parent)t.gameObject.SetActive(true);
                foreach(var controller in go.GetComponentsInChildren<CharacterController>(true))controller.enabled=false;
                foreach(var agent in go.GetComponentsInChildren<UnityEngine.AI.NavMeshAgent>(true))agent.enabled=false;
                notes.Add(path+" avatar="+animator.avatar?.name+" valid="+(animator.avatar!=null&&animator.avatar.isValid)+" human="+(animator.avatar!=null&&animator.avatar.isHuman));
                if(animator.avatar==null||!animator.avatar.isValid||!animator.avatar.isHuman){UnityEngine.Object.DestroyImmediate(go);continue;}
                var binding=new CharacterBinding{id=path,meshyActor=go,animator=animator};animator.fireEvents=false;animator.enabled=false;
                try{notes.Add("REST "+AnatomyProbe.Measure(binding));}catch(Exception e){notes.Add("REST error="+e.Message);}
                animator.enabled=true;animator.runtimeAnimatorController=campaign.bindings.characters.First(c=>c.id=="dylan").animator.runtimeAnimatorController;animator.Rebind();animator.Play("Locomotion");animator.SetFloat("Speed",.5f);animator.Update(.4f);
                try{notes.Add("WALK "+AnatomyProbe.Measure(binding));}catch(Exception e){notes.Add("WALK error="+e.Message);}
                animator.enabled=false;
                try{using(var handler=new HumanPoseHandler(animator.avatar,animator.transform)){var pose=new HumanPose();handler.GetHumanPose(ref pose);for(int i=0;i<pose.muscles.Length;i++)pose.muscles[i]=0;pose.bodyRotation=Quaternion.identity;handler.SetHumanPose(ref pose);}notes.Add("ZERO "+AnatomyProbe.Measure(binding));}catch(Exception e){notes.Add("ZERO error="+e.Message);}
                UnityEngine.Object.DestroyImmediate(go);
            }
            foreach(bool fullSkeleton in new[]{false,true})
            {
                var go=UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/UngaBunga45001/NativeCastV2/Dylan/Dylan.fbx"));go.name="Dylan";go.transform.SetPositionAndRotation(new Vector3(5000,0,5000),Quaternion.identity);
                var animator=go.GetComponentInChildren<Animator>();animator.enabled=false;var desc=animator.avatar.humanDescription;
                var human=desc.human;for(int i=0;i<human.Length;i++){var limit=human[i].limit;limit.useDefaultValues=true;human[i].limit=limit;}desc.human=human;
                desc.skeleton=fullSkeleton?go.GetComponentsInChildren<Transform>(true).Select(t=>new SkeletonBone{name=t.name,position=t.localPosition,rotation=t.localRotation,scale=t.localScale}).ToArray():Array.Empty<SkeletonBone>();
                var avatar=AvatarBuilder.BuildHumanAvatar(go,desc);notes.Add("BUILDER fullSkeleton="+fullSkeleton+" valid="+avatar.isValid+" humanMappings="+human.Length);
                if(avatar.isValid&&avatar.isHuman)
                {
                    animator.avatar=avatar;using(var handler=new HumanPoseHandler(avatar,animator.transform)){var pose=new HumanPose();handler.GetHumanPose(ref pose);for(int i=0;i<pose.muscles.Length;i++)pose.muscles[i]=0;pose.bodyRotation=Quaternion.identity;handler.SetHumanPose(ref pose);}
                    notes.Add("BUILDER ZERO "+AnatomyProbe.Measure(new CharacterBinding{id=fullSkeleton?"explicit-full":"explicit-auto",meshyActor=go,animator=animator}));
                }
                UnityEngine.Object.DestroyImmediate(go);UnityEngine.Object.DestroyImmediate(avatar);
            }
            File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision3/pose-isolation.txt",notes);
        }
    }
}
