using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Rendering.HighDefinition;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering.HighDefinition;
namespace UngaBunga45001.Editor
{
    public static class FinalPresentationV2
    {
        public static void Run()
        {
            FixValidationV2.Apply();var scene=EditorSceneManager.GetActiveScene();var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();
            foreach(var actor in campaign.bindings.characters)actor.meshyActor.transform.localRotation=Quaternion.identity;
            foreach(var actor in campaign.bindings.characters.Where(a=>a.id!="dylan")){var root=campaign.bindings.Find(actor.id);var steering=root.GetComponent<NativeLocomotionAgent>();if(steering==null)steering=root.gameObject.AddComponent<NativeLocomotionAgent>();steering.animator=actor.animator;root.GetComponent<UnityEngine.AI.NavMeshAgent>().updateRotation=false;}
            const string folder="Assets/UngaBunga45001/Generated/NativeCastV2";
            foreach(var actor in campaign.bindings.characters)
            {
                string appearance=Path.GetFileNameWithoutExtension(PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(actor.meshyActor));
                foreach(var renderer in actor.meshyActor.GetComponentsInChildren<Renderer>(true))
                {
                    if(renderer.name.StartsWith("MeshyHead"))
                    {
                        string facePath=folder+"/"+appearance+"-Face-final.mat";var face=AssetDatabase.LoadAssetAtPath<Material>(facePath);if(face==null){face=new Material(Shader.Find("HDRP/Lit"));AssetDatabase.CreateAsset(face,facePath);}face.SetColor("_BaseColor",Color.white);face.SetTexture("_BaseColorMap",AssetDatabase.LoadAssetAtPath<Texture2D>(PrehistoricCastV2.Root+"/"+appearance+"/"+appearance+"-HeadPalette.png"));face.SetFloat("_Smoothness",.08f);HDShaderUtils.ResetMaterialKeywords(face);renderer.sharedMaterial=face;EditorUtility.SetDirty(face);
                    }
                    if(renderer.name.StartsWith("Dylan low poly hair"))
                    {
                        string hairPath=folder+"/Dylan-Hair-final.mat";var hair=AssetDatabase.LoadAssetAtPath<Material>(hairPath);if(hair==null){hair=new Material(Shader.Find("HDRP/Lit"));AssetDatabase.CreateAsset(hair,hairPath);}hair.SetColor("_BaseColor",new Color(.03f,.02f,.015f));hair.SetFloat("_Smoothness",.05f);HDShaderUtils.ResetMaterialKeywords(hair);renderer.sharedMaterial=hair;
                    }
                }
            }
            string path=folder+"/Water-footstep-ring.asset";var mesh=AssetDatabase.LoadAssetAtPath<Mesh>(path);
            if(mesh==null)
            {
                mesh=new Mesh{name="Low poly water footstep ring"};var vertices=new Vector3[48];var indices=new int[144];
                for(int i=0;i<24;i++){float angle=i*Mathf.PI*2/24;var dir=new Vector3(Mathf.Cos(angle),0,Mathf.Sin(angle));vertices[i*2]=dir*.24f;vertices[i*2+1]=dir*.22f;int next=(i+1)%24;int j=i*6;indices[j]=i*2;indices[j+1]=i*2+1;indices[j+2]=next*2;indices[j+3]=next*2;indices[j+4]=i*2+1;indices[j+5]=next*2+1;}
                mesh.vertices=vertices;mesh.triangles=indices;mesh.RecalculateNormals();AssetDatabase.CreateAsset(mesh,path);
            }
            string matPath=folder+"/Water-footstep-ring.mat";var material=AssetDatabase.LoadAssetAtPath<Material>(matPath);if(material==null){material=new Material(Shader.Find("HDRP/Unlit"));AssetDatabase.CreateAsset(material,matPath);}
            material.SetFloat("_SurfaceType",1);material.SetFloat("_BlendMode",0);material.SetFloat("_DoubleSidedEnable",1);material.SetColor("_UnlitColor",new Color(.4f,.71f,.7f,.35f));HDShaderUtils.ResetMaterialKeywords(material);EditorUtility.SetDirty(material);
            var environment=campaign.GetComponent<EnvironmentInteraction>();environment.rippleMesh=mesh;environment.rippleMaterial=material;
            foreach(var water in UnityEngine.Object.FindObjectsByType<WaterSurface>(FindObjectsSortMode.None)){water.refractionColor=new Color(.13f,.38f,.37f);water.scatteringColor=new Color(.12f,.32f,.30f);water.absorptionDistance=5;water.largeWindSpeed=3;water.ripplesWindSpeed=2;}
            var waterStep=AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/AudioClip/sfx_player_footstep_walk_water_01.wav");
            foreach(var actor in campaign.bindings.characters)actor.animator.GetComponent<NativeAnimationAudio>().waterStep=waterStep;
            var ambience=campaign.GetComponent<AudioSource>();if(ambience==null)ambience=campaign.gameObject.AddComponent<AudioSource>();ambience.clip=AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/AudioClip/amb_nature_deciduous-forest_day_loop_01.ogg");ambience.loop=true;ambience.playOnAwake=true;ambience.volume=.16f;ambience.spatialBlend=0;
            var axe=AssetDatabase.LoadAssetAtPath<Mesh>("Assets/Mesh/stone-axe-primeval.asset");var atlas=AssetDatabase.LoadAssetAtPath<Material>(folder+"/Native-body-atlas.mat");int tools=0;
            foreach(var actor in campaign.bindings.characters.Where(a=>new[]{"georges","brok","tarek","uma"}.Contains(a.id)))
            {
                var hand=actor.animator.GetBoneTransform(HumanBodyBones.RightHand);if(hand==null)throw new InvalidOperationException("No native right hand: "+actor.id);var existing=hand.Find("Outil natif de travail");var go=existing!=null?existing.gameObject:new GameObject("Outil natif de travail");go.transform.SetParent(hand,false);
                var scale=hand.lossyScale;var inverse=new Vector3(1/Mathf.Abs(scale.x),1/Mathf.Abs(scale.y),1/Mathf.Abs(scale.z));go.transform.localScale=inverse;go.transform.localPosition=Vector3.Scale(new Vector3(0,.02f,.025f),inverse);go.transform.localRotation=Quaternion.Euler(0,0,90);
                var filter=go.GetComponent<MeshFilter>();if(filter==null)filter=go.AddComponent<MeshFilter>();filter.sharedMesh=axe;var renderer=go.GetComponent<MeshRenderer>();if(renderer==null)renderer=go.AddComponent<MeshRenderer>();renderer.sharedMaterial=atlas;var visibility=go.GetComponent<HeldWorkTool>();if(visibility==null)visibility=go.AddComponent<HeldWorkTool>();visibility.animator=actor.animator;visibility.target=renderer;if(renderer.bounds.size.magnitude>1.2f)throw new InvalidOperationException("Tool units still invalid: "+actor.id);tools++;
            }
            var hunt=campaign.bindings.Find("chasse_clairiere");var hp=new Vector3(378.92f,0,271.88f);hp.y=VillageLife.Ground(hp);hunt.position=hp;
            var stage=campaign.GetComponent<CinematicStage>();if(stage.mammoth==null)throw new InvalidOperationException("Native mammoth missing");var mp=hp+new Vector3(6,0,2);mp.y=VillageLife.Ground(mp);stage.mammoth.position=mp;stage.mammoth.gameObject.SetActive(true);foreach(var r in stage.mammoth.GetComponentsInChildren<Renderer>(true)){r.gameObject.SetActive(true);r.enabled=true;r.forceRenderingOff=false;}
            foreach(var surface in UnityEngine.Object.FindObjectsByType<Unity.AI.Navigation.NavMeshSurface>(FindObjectsSortMode.None))surface.AddData();
            foreach(var pair in new[]{("eliott",new Vector3(-5,0,-4)),("kora",new Vector3(-2,0,-5)),("varg",new Vector3(2,0,-4))})
            {
                var root=campaign.bindings.Find(pair.Item1);var p=hp+pair.Item2;p.y=VillageLife.Ground(p);if(UnityEngine.AI.NavMesh.SamplePosition(p,out var hit,3,UnityEngine.AI.NavMesh.AllAreas))p=hit.position;root.position=p;foreach(var routine in campaign.GetComponent<VillageLife>().routines)if(routine.id==pair.Item1){routine.workplace=p;routine.rest=p+Vector3.back*2;}
            }
            AssetDatabase.SaveAssets();EditorSceneManager.SaveScene(scene);File.WriteAllText("E:/UNGA-BUNGA-45001/Revision2/final-presentation.txt","Circular mesh ripples replace opaque square particles. Native forest ambience and water/grass footsteps. Native right-hand work tools="+tools+". True camera obstruction selection and uninterrupted native animation transitions.");
            File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision2/staging-units.txt",campaign.bindings.characters.SelectMany(a=>a.meshyActor.GetComponentsInChildren<MeshRenderer>(true)).Where(r=>r.name=="Outil natif de travail").Select(r=>r.name+" world size="+r.bounds.size).Concat(stage.mammoth.GetComponentsInChildren<Renderer>(true).Select(r=>"Mammoth "+r.name+" bounds="+r.bounds+" active="+r.gameObject.activeInHierarchy)));
            RecoveredWindowsBuild.Build();
        }
    }
}
