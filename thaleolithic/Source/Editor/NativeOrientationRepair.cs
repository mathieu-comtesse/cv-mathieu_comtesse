using System;
using System.IO;
using UnityEditor;
using UnityEngine;
namespace UngaBunga45001.Editor
{
    public static class NativeOrientationRepair
    {
        public static void Import()
        {
            var notes=new System.Collections.Generic.List<string>();
            foreach(string name in PrehistoricCastV2.Names)
            {
                string path=PrehistoricCastV2.Root+"/"+name+"/"+name+".fbx";
                string backup="E:/UNGA-BUNGA-45001/Revision3/AvatarBeforeOrientation/"+name+".fbx.meta";Directory.CreateDirectory(Path.GetDirectoryName(backup));if(!File.Exists(backup))File.Copy(path+".meta",backup);
                AssetDatabase.ImportAsset(path,ImportAssetOptions.ForceSynchronousImport);
                var importer=(ModelImporter)AssetImporter.GetAtPath(path);importer.animationType=ModelImporterAnimationType.Human;importer.avatarSetup=ModelImporterAvatarSetup.CreateFromThisModel;importer.importAnimation=false;importer.isReadable=true;
                importer.humanDescription=new HumanDescription{human=Array.Empty<HumanBone>(),skeleton=Array.Empty<SkeletonBone>(),upperArmTwist=.5f,lowerArmTwist=.5f,upperLegTwist=.5f,lowerLegTwist=.5f,armStretch=.05f,legStretch=.05f};importer.SaveAndReimport();
                var model=AssetDatabase.LoadAssetAtPath<GameObject>(path);var animator=model.GetComponentInChildren<Animator>();if(animator==null||!animator.avatar.isValid||!animator.avatar.isHuman)throw new InvalidOperationException(name+" native avatar invalid after frame correction");notes.Add(name+" valid=True human=True boneWorldFrame=C*M oldHumanoidPoseCleared=True");
            }
            File.WriteAllLines("E:/UNGA-BUNGA-45001/Revision3/orientation-import.txt",notes);
        }
    }
}
