using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.Rendering;
using UnityEditor.Rendering.HighDefinition;
using UnityEngine;
using UnityEngine.Rendering.HighDefinition;
namespace UngaBunga45001.Editor
{
    public static class PrehistoricCastV2
    {
        public const string Root="Assets/UngaBunga45001/NativeCastV2";
        public static string[] Names={"Aurelien","Dylan","Mathieu","Georges","Eliott","Mathilde","Neila","Lorette"};
        public static void ImportAndInspect()
        {
            var rows=new System.Collections.Generic.List<string>();
            foreach(string name in Names)
            {
                string path=Root+"/"+name+"/"+name+".fbx";AssetDatabase.ImportAsset(path,ImportAssetOptions.ForceSynchronousImport);
                var importer=(ModelImporter)AssetImporter.GetAtPath(path);importer.animationType=ModelImporterAnimationType.Human;importer.avatarSetup=ModelImporterAvatarSetup.CreateFromThisModel;importer.importAnimation=false;importer.isReadable=true;importer.SaveAndReimport();
                var avatar=AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault();
                rows.Add(name+" valid="+(avatar!=null&&avatar.isValid)+" human="+(avatar!=null&&avatar.isHuman));
            }
            foreach(string name in new[]{"Idle_Talking_Big","Building_Loop","Mine_Swing","Gather_Stand_Loop","Sit_Loop","Basic_Walk"})
            {var clip=AssetDatabase.LoadAssetAtPath<AnimationClip>("Assets/AnimationClip/"+name+".anim");rows.Add(name+" humanMotion="+clip?.humanMotion+" length="+clip?.length);}
            File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision2/native-cast-import.txt",rows);
        }
        public static AnimatorController Controller(string id)
        {
            string folder="Assets/UngaBunga45001/Generated/NativeCastV2";Directory.CreateDirectory(folder);AssetDatabase.Refresh();string path=folder+"/"+id+".controller";
            var prior=AssetDatabase.LoadAssetAtPath<AnimatorController>(path);if(prior!=null)return prior;
            var controller=AnimatorController.CreateAnimatorControllerAtPath(path);controller.AddParameter("Speed",AnimatorControllerParameterType.Float);var machine=controller.layers[0].stateMachine;
            var layers=controller.layers;layers[0].iKPass=true;controller.layers=layers;
            AnimationClip Clip(string name)=>AssetDatabase.LoadAssetAtPath<AnimationClip>("Assets/AnimationClip/"+name+".anim");
            var idle=Clip("Breathing Idle");var walk=Clip("Basic_Walk");var run=Clip("Movement_Run");
            if(idle==null||walk==null||run==null)throw new InvalidOperationException("Native locomotion clips missing");
            var blend=new BlendTree{name=id+" native locomotion",blendType=BlendTreeType.Simple1D,blendParameter="Speed",useAutomaticThresholds=false};AssetDatabase.AddObjectToAsset(blend,controller);blend.AddChild(idle,0);blend.AddChild(walk,.5f);blend.AddChild(run,1);
            var state=machine.AddState("Locomotion");state.motion=blend;machine.defaultState=state;
            foreach(var pair in new[]{("Talk","Idle_Talking_Big"),("Listen","Idle_Stand_Listen"),("Work","Building_Loop"),("Craft","Craft_SimpleLoop"),("Mine","Mine_Swing"),("Gather","Gather_Stand_Loop"),("Sit","Sit_Loop"),("Wave","Idle_Waving_High"),("Clap","Idle_Stand_Clap"),("Throw","A_Standing_ItemThrow_Start"),("React","Hit_Back")})
            {var clip=Clip(pair.Item2);if(clip!=null){var pose=machine.AddState(pair.Item1);pose.motion=clip;}}
            return controller;
        }
        public static CharacterBinding Create(string id,string appearance,Transform parent)
        {
            string path=Root+"/"+appearance+"/"+appearance+".fbx";var model=AssetDatabase.LoadAssetAtPath<GameObject>(path);var go=(GameObject)PrefabUtility.InstantiatePrefab(model,parent.gameObject.scene);go.name="Prehistoric_"+id;go.transform.SetParent(parent,false);
            go.transform.localRotation=Quaternion.identity;
            var animator=go.GetComponentInChildren<Animator>();var avatar=AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().First();if(!avatar.isValid||!avatar.isHuman)throw new InvalidOperationException(id+" invalid native human Avatar");
            animator.avatar=avatar;animator.runtimeAnimatorController=Controller(id);animator.applyRootMotion=false;animator.cullingMode=AnimatorCullingMode.AlwaysAnimate;
            if(animator.GetComponent<FootGrounding>()==null)animator.gameObject.AddComponent<FootGrounding>();
            var native=AssetDatabase.LoadAssetAtPath<Material>("Assets/Material/universal-a-Tribesperson.mat");
            var shader=AssetDatabase.LoadAssetAtPath<Shader>("Packages/com.unity.render-pipelines.high-definition/Runtime/Material/Lit/Lit.shader");
            foreach(var renderer in go.GetComponentsInChildren<Renderer>())
            {
                renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.On;renderer.receiveShadows=true;
                if(renderer.name.StartsWith("PrehistoricBody")){renderer.sharedMaterial=native;continue;}
                var mats=renderer.sharedMaterials;
                for(int i=0;i<mats.Length;i++)
                {
                    var source=mats[i];string matPath="Assets/UngaBunga45001/Generated/NativeCastV2/"+id+"-"+i+"-"+renderer.name+".mat";var material=AssetDatabase.LoadAssetAtPath<Material>(matPath);
                    if(material==null){material=new Material(shader){name=source.name};material.SetColor("_BaseColor",source.HasProperty("_Color")?source.GetColor("_Color"):source.color);material.SetFloat("_Smoothness",.08f);HDShaderUtils.ResetMaterialKeywords(material);AssetDatabase.CreateAsset(material,matPath);}mats[i]=material;
                    if(renderer.name.StartsWith("MeshyHead")){material.SetColor("_BaseColor",Color.white);material.SetTexture("_BaseColorMap",AssetDatabase.LoadAssetAtPath<Texture2D>(Root+"/"+appearance+"/"+appearance+"-HeadPalette.png"));EditorUtility.SetDirty(material);}
                }
                renderer.sharedMaterials=mats;
            }
            return new CharacterBinding{id=id,meshyActor=go,animator=animator,useMeshy=true};
        }
    }
}
