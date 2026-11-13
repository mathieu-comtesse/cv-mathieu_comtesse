using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace UngaBunga45001
{
 // Fallback for carved or stale NavMesh edges. Shared bounded work budget across callers.
 public static class PhysicalRouteV19
 {
  struct Entry{public int index;public float cost;}
  sealed class Heap
  {
   readonly List<Entry> a=new List<Entry>();public int Count=>a.Count;
   public void Push(int index,float cost){var e=new Entry{index=index,cost=cost};int i=a.Count;a.Add(e);while(i>0){int p=(i-1)/2;if(a[p].cost<=cost)break;a[i]=a[p];i=p;}a[i]=e;}
   public int Pop(){int answer=a[0].index;var last=a[a.Count-1];a.RemoveAt(a.Count-1);if(a.Count==0)return answer;int i=0;while(i*2+1<a.Count){int c=i*2+1;if(c+1<a.Count&&a[c+1].cost<a[c].cost)c++;if(a[c].cost>=last.cost)break;a[i]=a[c];i=c;}a[i]=last;return answer;}
  }
  static int frame,budget;public static int Expanded{get;private set;}
  public static IEnumerator Plan(Vector3 start,Vector3 target,Transform actor,Action<Vector3[]> done,Func<bool> valid=null,bool avoidPeers=false)
  {
   const float cell=.55f,pad=7;var origin=new Vector3(Mathf.Min(start.x,target.x)-pad,0,Mathf.Min(start.z,target.z)-pad);int w=Mathf.CeilToInt((Mathf.Abs(start.x-target.x)+pad*2)/cell)+1,h=Mathf.CeilToInt((Mathf.Abs(start.z-target.z)+pad*2)/cell)+1;if(w>190||h>190){done(null);yield break;}
   int count=w*h;var positions=new Vector3[count];var free=new byte[count];var closed=new bool[count];var cost=new float[count];var parents=new int[count];for(int i=0;i<count;i++){cost[i]=float.PositiveInfinity;parents[i]=-1;}var colliders=new Collider[32];var hits=new RaycastHit[32];var water=UnityEngine.Object.FindFirstObjectByType<EnvironmentInteraction>();
   var body=actor.GetComponent<CharacterController>();float radius=body!=null?body.radius+.035f:.32f;float bottom=radius+.03f,top=body!=null?Mathf.Max(bottom,body.height-radius+.03f):1.48f;
   float FlatDistance(Vector3 a,Vector3 b){a.y=b.y=0;return Vector3.Distance(a,b);}
   // A player may stand in the extra fire clearance without touching its collider.
   // Permit an outward escape, never entry from outside or motion toward the flame.
   bool HearthClear(Vector3 p)
   {foreach(var fire in NativeFire.ActiveFires)if(fire!=null&&fire.lit){float safe=fire.radius+.5f+radius,d=FlatDistance(p,fire.transform.position),initial=FlatDistance(start,fire.transform.position);if(d<safe&&(initial>=safe||d<initial-.001f))return false;}return true;}
   bool Clear(Vector3 p)
   {if(!HearthClear(p)||water!=null&&water.SampleDepth(p,out float depth)&&depth>.4f)return false;int n=Physics.OverlapCapsuleNonAlloc(p+Vector3.up*bottom,p+Vector3.up*top,radius,colliders,~0,QueryTriggerInteraction.Ignore);if(n>=colliders.Length)return false;for(int i=0;i<n;i++){var c=colliders[i];if(c is TerrainCollider||!avoidPeers&&(c is CharacterController||c.GetComponentInParent<UnityEngine.AI.NavMeshAgent>()!=null)||c.transform.IsChildOf(actor)||c.bounds.max.y<p.y+.2f)continue;return false;}return true;}
   bool Connect(Vector3 a,Vector3 b)
   {if(Mathf.Abs(a.y-b.y)>.35f)return false;var d=b-a;foreach(var fire in NativeFire.ActiveFires)if(fire!=null&&fire.lit){var radial=a-fire.transform.position;radial.y=0;if(radial.magnitude<fire.radius+.5f+radius&&Vector3.Dot(radial,d)<-.0001f)return false;}for(float along=0;along<=d.magnitude;along+=.12f)if(!HearthClear(a+d.normalized*along))return false;int n=Physics.CapsuleCastNonAlloc(a+Vector3.up*bottom,a+Vector3.up*top,radius,d.normalized,hits,d.magnitude,~0,QueryTriggerInteraction.Ignore);for(int i=0;i<n;i++){var c=hits[i].collider;if(c is TerrainCollider||!avoidPeers&&(c is CharacterController||c.GetComponentInParent<UnityEngine.AI.NavMeshAgent>()!=null)||c.transform.IsChildOf(actor)||c.bounds.max.y<VillageLife.Ground(hits[i].point)+.2f)continue;if(hits[i].distance>.025f)return false;}return n<hits.Length;}
   int Index(Vector3 p)=>Mathf.Clamp(Mathf.RoundToInt((p.z-origin.z)/cell),0,h-1)*w+Mathf.Clamp(Mathf.RoundToInt((p.x-origin.x)/cell),0,w-1);
   Vector3 Position(int n){if(free[n]==0){var p=origin+new Vector3(n%w*cell,0,n/w*cell);p.y=VillageLife.Ground(p);positions[n]=p;free[n]=(byte)(Clear(p)?1:2);}return positions[n];}
   int first=Index(start);start.y=VillageLife.Ground(start);positions[first]=start;free[first]=1;var goals=new HashSet<int>();
   for(float r=0;r<=1.1f&&goals.Count==0;r+=.55f)for(int angle=0;angle<(r==0?1:12);angle++){var p=target+Quaternion.Euler(0,angle*30,0)*Vector3.forward*r;p.y=VillageLife.Ground(p);if(Clear(p)){int n=Index(p);positions[n]=p;free[n]=1;goals.Add(n);}}if(goals.Count==0){done(null);yield break;}
   var heap=new Heap();cost[first]=0;heap.Push(first,Vector3.Distance(start,target));int expanded=0;
   while(heap.Count>0&&expanded<9000&&(valid==null||valid()))
   {
    if(frame!=Time.frameCount){frame=Time.frameCount;budget=0;}if(budget>=24){yield return null;continue;}budget++;int current=heap.Pop();if(closed[current])continue;closed[current]=true;expanded++;Expanded++;
    if(goals.Contains(current)){var path=new List<Vector3>();for(int n=current;n>=0;n=parents[n])path.Add(positions[n]);path.Reverse();done(path.ToArray());yield break;}
    int x=current%w,z=current/w;var from=Position(current);
    for(int dz=-1;dz<=1;dz++)for(int dx=-1;dx<=1;dx++){if(dx==0&&dz==0||x+dx<0||x+dx>=w||z+dz<0||z+dz>=h)continue;int n=(z+dz)*w+x+dx;if(closed[n])continue;var to=Position(n);if(free[n]!=1||!Connect(from,to))continue;float candidate=cost[current]+Vector3.Distance(from,to);if(candidate>=cost[n])continue;cost[n]=candidate;parents[n]=current;heap.Push(n,candidate+Mathf.Max(0,Vector3.Distance(to,target)-1.1f));}
   }
   done(null);
  }
 }
}
