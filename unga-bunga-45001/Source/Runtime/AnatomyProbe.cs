using System;
using System.IO;
using System.Linq;
using UnityEngine;
namespace UngaBunga45001
{
    public static class AnatomyProbe
    {
        public static string Measure(CharacterBinding actor)
        {
            var renderer=actor.meshyActor.GetComponentsInChildren<SkinnedMeshRenderer>().FirstOrDefault(r=>r.name.StartsWith("PrehistoricBody"));if(renderer==null)renderer=actor.meshyActor.GetComponentsInChildren<SkinnedMeshRenderer>().First(r=>r.bones.Length>20);
            bool nativeCoordinates=!renderer.name.StartsWith("PrehistoricBody");float ForwardCoordinate(Vector3 v)=>nativeCoordinates?-v.z:v.y;
            var mesh=renderer.sharedMesh;if(!mesh.isReadable)throw new InvalidOperationException("Native anatomy validation requires a readable working mesh: "+mesh.name);var head=actor.animator.GetBoneTransform(HumanBodyBones.Head);int headIndex=Array.IndexOf(renderer.bones,head);
            var weights=mesh.boneWeights;var vertices=mesh.vertices;int nose=-1;float closest=float.MaxValue;
            // FBX mesh-local -Y is the original native +Z face direction. Bone frames are deliberately not used as proof of visible anatomy.
            for(int i=0;i<vertices.Length;i++)
            {
                var w=weights[i];float influence=(w.boneIndex0==headIndex?w.weight0:0)+(w.boneIndex1==headIndex?w.weight1:0)+(w.boneIndex2==headIndex?w.weight2:0)+(w.boneIndex3==headIndex?w.weight3:0);
                if(influence>.7f&&ForwardCoordinate(vertices[i])<closest){closest=ForwardCoordinate(vertices[i]);nose=i;}
            }
            if(nose<0)throw new InvalidOperationException("No native head landmark found: "+actor.id);var baked=new Mesh();renderer.BakeMesh(baked);var deformed=baked.vertices;var front=renderer.transform.TransformPoint(deformed[nose])-head.position;front.y=0;
            var feet=actor.animator.GetBoneTransform(HumanBodyBones.LeftToes).position-actor.animator.GetBoneTransform(HumanBodyBones.LeftFoot).position+actor.animator.GetBoneTransform(HumanBodyBones.RightToes).position-actor.animator.GetBoneTransform(HumanBodyBones.RightFoot).position;feet.y=0;
            Vector3 SurfaceDirection(params HumanBodyBones[] bones)
            {
                var allowed=bones.Select(b=>Array.IndexOf(renderer.bones,actor.animator.GetBoneTransform(b))).Where(i=>i>=0).ToArray();int near=-1,far=-1;float low=float.MaxValue,high=float.MinValue;
                for(int i=0;i<weights.Length;i++){var w=weights[i];float influence=(allowed.Contains(w.boneIndex0)?w.weight0:0)+(allowed.Contains(w.boneIndex1)?w.weight1:0)+(allowed.Contains(w.boneIndex2)?w.weight2:0)+(allowed.Contains(w.boneIndex3)?w.weight3:0);if(influence<.7f)continue;float f=ForwardCoordinate(vertices[i]);if(f<low){low=f;near=i;}if(f>high){high=f;far=i;}}
                if(near<0||far<0)return Vector3.zero;var d=renderer.transform.TransformPoint(deformed[near])-renderer.transform.TransformPoint(deformed[far]);d.y=0;return d.normalized;
            }
            var visibleFeet=(SurfaceDirection(HumanBodyBones.LeftFoot,HumanBodyBones.LeftToes)+SurfaceDirection(HumanBodyBones.RightFoot,HumanBodyBones.RightToes)).normalized;
            var chest=SurfaceDirection(HumanBodyBones.Spine,HumanBodyBones.Chest,HumanBodyBones.UpperChest);float dot=Vector3.Dot(front.normalized,visibleFeet);UnityEngine.Object.Destroy(baked);
            return actor.id+" visibleFace="+front.normalized+" visibleFeet="+visibleFeet+" jointFeet="+feet.normalized+" visibleFaceDotFeet="+dot.ToString("F4",System.Globalization.CultureInfo.InvariantCulture)+" chestDotFeet="+Vector3.Dot(chest,visibleFeet).ToString("F4",System.Globalization.CultureInfo.InvariantCulture)+" boneHeadForward="+head.forward+" landmark="+nose;
        }
    }
}
