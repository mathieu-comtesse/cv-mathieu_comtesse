using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering.HighDefinition;
namespace UngaBunga45001.Editor
{
    public static class InterfaceAssetsV4
    {
        public const string Folder="Assets/UngaBunga45001/Generated/InterfaceV4";
        public static void Prepare()
        {
            EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);Directory.CreateDirectory(Folder);AssetDatabase.Refresh();
            var campaign=UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>();T Add<T>()where T:Component=>campaign.GetComponent<T>()??campaign.gameObject.AddComponent<T>();
            Add<UISettingsController>();Add<AdventureMenus>();var inventory=Add<InventoryController>();inventory.campaign=campaign;inventory.axeMesh=AssetDatabase.LoadAssetAtPath<Mesh>("Assets/Mesh/stone-axe-primeval.asset");inventory.axeMaterial=AssetDatabase.LoadAssetAtPath<Material>("Assets/UngaBunga45001/Generated/NativeRepairV3/Native-body-atlas-solid.mat");
            var navigation=Add<QuestNavigationController>();navigation.campaign=campaign;Add<SurvivalInterface>();Add<PlayerSurvival>().campaign=campaign;
            var material=AssetDatabase.LoadAssetAtPath<Material>(Folder+"/Guidage-dore.mat");if(material==null){material=new Material(Shader.Find("HDRP/Unlit"));material.SetColor("_UnlitColor",new Color(1,.65f,.12f));material.SetColor("_EmissiveColor",new Color(1,.4f,.05f)*1.4f);AssetDatabase.CreateAsset(material,Folder+"/Guidage-dore.mat");}navigation.markerMaterial=material;
            var map=campaign.GetComponent<CampaignMap>();var notes=new List<string>{"Unity 6000.2.12f1 / HDRP / uGUI / TextMeshPro","Previous minimap was a height-only baked terrain image, not an orthographic camera. No paths, native water footprint or installations were included.","Single CampaignRuntime / SceneBindings / resources / save kept. Player identity comes from CampaignData.playerCharacterId."};
            GenerateMap(map,notes);GenerateMap(map,notes,true);var portrait=AssetDatabase.LoadAssetAtPath<Texture2D>(Folder+"/Dylan-portrait.png");if(portrait!=null)campaign.GetComponent<CampaignHud>().playerPortrait=portrait;
            foreach(var component in new Component[]{inventory,navigation,campaign.GetComponent<CampaignHud>(),map,campaign.GetComponent<PlayerSurvival>()})EditorUtility.SetDirty(component);
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());AssetDatabase.SaveAssets();File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision4/interface-diagnostic.txt",notes);
        }
        static void GenerateMap(CampaignMap map,List<string> notes,bool detail=false)
        {
            var terrain=UnityEngine.Object.FindFirstObjectByType<Terrain>();var data=terrain.terrainData;int n=detail?1536:1024;var pixels=new Color[n*n];var origin=new Vector2(terrain.transform.position.x,terrain.transform.position.z);var size=new Vector2(data.size.x,data.size.z);if(detail){var player=map.campaign.bindings.player.position;origin=new Vector2(player.x-100,player.z-100);size=new Vector2(200,200);}
            var waters=UnityEngine.Object.FindObjectsByType<WaterSurface>(FindObjectsSortMode.None).Where(w=>w.geometryType==WaterGeometryType.Custom).SelectMany(w=>w.meshRenderers).ToArray();float waterLevel=waters.Length>0?waters[0].bounds.center.y:terrain.transform.position.y;
            for(int y=0;y<n;y++)for(int x=0;x<n;x++)
            {float u=(origin.x-terrain.transform.position.x+x/(float)(n-1)*size.x)/data.size.x,v=(origin.y-terrain.transform.position.z+y/(float)(n-1)*size.y)/data.size.z;var normal=data.GetInterpolatedNormal(u,v);float height=data.GetInterpolatedHeight(u,v)+terrain.transform.position.y;float slope=1-normal.y;var color=Color.Lerp(new Color(.38f,.5f,.28f),new Color(.64f,.52f,.3f),Mathf.Clamp01((height-waterLevel)/18));color=Color.Lerp(color,new Color(.44f,.43f,.4f),Mathf.Clamp01(slope*2.5f));float shade=.73f+.27f*Mathf.Max(0,Vector3.Dot(normal,new Vector3(-.5f,.8f,-.3f).normalized));float contour=Mathf.Repeat(height,2.5f)<.11f?.84f:1;pixels[y*n+x]=color*shade*contour;}
            Vector2 Pixel(Vector3 p)=>new Vector2((p.x-origin.x)/size.x*(n-1),(p.z-origin.y)/size.y*(n-1));
            void Triangle(Vector2 a,Vector2 b,Vector2 c,Color color)
            {
                int x0=Mathf.Clamp(Mathf.FloorToInt(Mathf.Min(a.x,b.x,c.x)),0,n-1),x1=Mathf.Clamp(Mathf.CeilToInt(Mathf.Max(a.x,b.x,c.x)),0,n-1);int y0=Mathf.Clamp(Mathf.FloorToInt(Mathf.Min(a.y,b.y,c.y)),0,n-1),y1=Mathf.Clamp(Mathf.CeilToInt(Mathf.Max(a.y,b.y,c.y)),0,n-1);
                for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++){var p=new Vector2(x+.5f,y+.5f);float ab=(p.x-b.x)*(a.y-b.y)-(a.x-b.x)*(p.y-b.y),bc=(p.x-c.x)*(b.y-c.y)-(b.x-c.x)*(p.y-c.y),ca=(p.x-a.x)*(c.y-a.y)-(c.x-a.x)*(p.y-a.y);if(!((ab<0||bc<0||ca<0)&&(ab>0||bc>0||ca>0)))pixels[y*n+x]=color;}
            }
            void Mesh(MeshFilter filter,Color color){if(filter?.sharedMesh==null)return;var vertices=filter.sharedMesh.vertices;var indices=filter.sharedMesh.triangles;for(int i=0;i<vertices.Length;i++)vertices[i]=filter.transform.TransformPoint(vertices[i]);for(int i=0;i<indices.Length;i+=3)Triangle(Pixel(vertices[indices[i]]),Pixel(vertices[indices[i+1]]),Pixel(vertices[indices[i+2]]),color);}
            foreach(var water in waters)Mesh(water.GetComponent<MeshFilter>(),new Color(.16f,.43f,.59f));int rocks=0,paths=0;
            foreach(var renderer in UnityEngine.Object.FindObjectsByType<MeshRenderer>(FindObjectsSortMode.None))
            {
                if(!renderer.enabled)continue;
                if(renderer.name.StartsWith("rock",StringComparison.OrdinalIgnoreCase)&&renderer.bounds.size.magnitude>2)
                {var b=renderer.bounds;var low=Pixel(b.min);var high=Pixel(b.max);for(int y=Mathf.Max(0,(int)low.y);y<=Mathf.Min(n-1,(int)high.y);y++)for(int x=Mathf.Max(0,(int)low.x);x<=Mathf.Min(n-1,(int)high.x);x++){var d=new Vector2((x-(low.x+high.x)*.5f)/Mathf.Max(1,(high.x-low.x)*.5f),(y-(low.y+high.y)*.5f)/Mathf.Max(1,(high.y-low.y)*.5f));if(d.sqrMagnitude<.8f)pixels[y*n+x]=new Color(.43f,.44f,.4f)*(1-d.y*.12f);}rocks++;}
            }
            foreach(var filter in UnityEngine.Object.FindObjectsByType<MeshFilter>(FindObjectsSortMode.None))if(filter.name.Contains("Sentier")){Mesh(filter,new Color(.48f,.3f,.15f));paths++;}
            var texture=new Texture2D(n,n,TextureFormat.RGB24,false);texture.SetPixels(pixels);texture.Apply();string path=Folder+(detail?"/Topographie-du-village.png":"/Topographie-du-monde.png");File.WriteAllBytes(path,texture.EncodeToPNG());UnityEngine.Object.DestroyImmediate(texture);AssetDatabase.ImportAsset(path,ImportAssetOptions.ForceSynchronousImport);
            var importer=(TextureImporter)AssetImporter.GetAtPath(path);importer.npotScale=TextureImporterNPOTScale.None;importer.wrapMode=TextureWrapMode.Clamp;importer.filterMode=FilterMode.Bilinear;importer.mipmapEnabled=false;importer.textureCompression=TextureImporterCompression.Uncompressed;importer.SaveAndReimport();if(detail){map.villageDetail=AssetDatabase.LoadAssetAtPath<Texture2D>(path);map.detailOrigin=origin;map.detailSize=size;}else{map.terrainMap=AssetDatabase.LoadAssetAtPath<Texture2D>(path);map.worldOrigin=origin;map.worldSize=size;}
            notes.Add("Topographic texture "+n+"x"+n+"; real origin="+origin+" size="+size+" native water meshes="+waters.Length+" approximate rock footprints="+rocks+" actual path meshes="+paths+". Dynamic markers are not baked into the image.");
        }
        public static void UpgradeAndBuild(){Prepare();Build();}
        public static void Build()
        {
            EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);AssetDatabase.ImportAsset(Folder+"/Dylan-portrait.png",ImportAssetOptions.ForceSynchronousImport);
            var hud=UnityEngine.Object.FindFirstObjectByType<CampaignHud>();hud.playerPortrait=AssetDatabase.LoadAssetAtPath<Texture2D>(Folder+"/Dylan-portrait.png");if(hud.playerPortrait==null)throw new InvalidOperationException("Native player portrait missing");EditorUtility.SetDirty(hud);EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());RecoveredWindowsBuild.Build();
        }
    }
}
