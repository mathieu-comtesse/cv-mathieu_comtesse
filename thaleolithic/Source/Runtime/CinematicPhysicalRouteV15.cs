using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;
namespace UngaBunga45001
{
 // Bounded fallback for source actors standing outside the baked navigation surface.
 // Every cell and connection is tested against the real body volume and hearth exclusion.
 public static class CinematicPhysicalRouteV15
 {
  public static string LastFailure{get;private set;}
  sealed class Heap
  {
   readonly List<(int node,float cost)> values=new List<(int,float)>();public int Count=>values.Count;
   public void Push(int node,float cost){values.Add((node,cost));int i=values.Count-1;while(i>0){int p=(i-1)/2;if(values[p].cost<=cost)break;values[i]=values[p];i=p;}values[i]=(node,cost);}
   public int Pop(){int result=values[0].node;var last=values[values.Count-1];values.RemoveAt(values.Count-1);if(values.Count==0)return result;int i=0;while(i*2+1<values.Count){int child=i*2+1;if(child+1<values.Count&&values[child+1].cost<values[child].cost)child++;if(values[child].cost>=last.cost)break;values[i]=values[child];i=child;}values[i]=last;return result;}
  }
  public static bool Try(Vector3 start,Vector3 desired,Transform actor,out Vector3[] corners,bool allowNearbyGoal=true)
  {
   corners=Array.Empty<Vector3>();LastFailure="";const float cell=.6f,padding=14;var colliderHits=new Collider[32];var rayHits=new RaycastHit[32];var environment=UnityEngine.Object.FindFirstObjectByType<EnvironmentInteraction>();
   bool Clear(Vector3 p)
   {
    if(!VillageNavigation.HearthSafe(p,.32f)||environment!=null&&environment.SampleDepth(p,out float depth)&&depth>.4f)return false;int count=Physics.OverlapCapsuleNonAlloc(p+Vector3.up*.38f,p+Vector3.up*1.5f,.3f,colliderHits,~0,QueryTriggerInteraction.Ignore);if(count==colliderHits.Length)return false;
    for(int i=0;i<count;i++){var col=colliderHits[i];if(!(col is TerrainCollider)&&!(col is CharacterController)&&col.GetComponentInParent<NavMeshAgent>()==null&&!col.transform.IsChildOf(actor))return false;}return true;
   }
   bool Connect(Vector3 a,Vector3 b)
   {
    if(Mathf.Abs(a.y-b.y)>.44f)return false;var d=b-a;int count=Physics.CapsuleCastNonAlloc(a+Vector3.up*.38f,a+Vector3.up*1.5f,.3f,d.normalized,rayHits,d.magnitude,~0,QueryTriggerInteraction.Ignore);
    for(int i=0;i<count;i++){var h=rayHits[i];if(h.distance>.025f&&!(h.collider is TerrainCollider)&&!(h.collider is CharacterController)&&h.collider.GetComponentInParent<NavMeshAgent>()==null&&!h.transform.IsChildOf(actor))return false;}return count<rayHits.Length;
   }
   desired.y=HutCollapse.TerrainFloor(desired);bool goal=false;
   for(float radius=0;radius<=5&&!goal;radius+=.6f)for(int angle=0;angle<(radius==0?1:16);angle++){var p=desired+Quaternion.Euler(0,angle*22.5f,0)*Vector3.forward*radius;p.y=HutCollapse.TerrainFloor(p);if(Clear(p)){desired=p;goal=true;break;}}
   if(!goal||!Clear(start)){LastFailure=!goal?"No clear goal":"Start occupied";return false;}
   var origin=new Vector3(Mathf.Min(start.x,desired.x)-padding,0,Mathf.Min(start.z,desired.z)-padding);int width=Mathf.CeilToInt((Mathf.Abs(start.x-desired.x)+padding*2)/cell)+1,height=Mathf.CeilToInt((Mathf.Abs(start.z-desired.z)+padding*2)/cell)+1;if(width>180||height>180){LastFailure="Outside bounded route area";return false;}
   int size=width*height;var positions=new Vector3[size];var tested=new byte[size];var closed=new bool[size];var costs=new float[size];var parents=new int[size];for(int i=0;i<size;i++){costs[i]=float.PositiveInfinity;parents[i]=-1;}
   int Index(Vector3 p)=>Mathf.Clamp(Mathf.RoundToInt((p.z-origin.z)/cell),0,height-1)*width+Mathf.Clamp(Mathf.RoundToInt((p.x-origin.x)/cell),0,width-1);
   int first=Index(start),last=Index(desired);
   Vector3 Position(int n){if(tested[n]==0){var p=n==first?start:n==last?desired:origin+new Vector3(n%width*cell,0,n/width*cell);p.y=HutCollapse.TerrainFloor(p);positions[n]=p;tested[n]=(byte)(Clear(p)?1:2);}return positions[n];}
   Position(first);Position(last);if(tested[first]!=1||tested[last]!=1){LastFailure="Endpoint occupied";return false;}var goals=new HashSet<int>{last};int expanded=0;
   for(int attempt=0;attempt<(allowNearbyGoal?2:1);attempt++)
   {
   if(attempt==1){goals.Clear();for(float radius=.6f;radius<=5;radius+=.6f)for(int angle=0;angle<16;angle++){var p=desired+Quaternion.Euler(0,angle*22.5f,0)*Vector3.forward*radius;int n=Index(p);Position(n);if(tested[n]==1)goals.Add(n);}Array.Clear(closed,0,closed.Length);for(int i=0;i<size;i++){costs[i]=float.PositiveInfinity;parents[i]=-1;}}
   costs[first]=0;var heap=new Heap();heap.Push(first,Vector3.Distance(start,desired));expanded=0;
   while(heap.Count>0&&expanded++<7000)
   {
    int current=heap.Pop();if(closed[current])continue;if(goals.Contains(current))
    {
     var reverse=new List<Vector3>();for(int n=current;n>=0;n=parents[n])reverse.Add(positions[n]);reverse.Reverse();var smooth=new List<Vector3>{reverse[0]};int at=0;while(at<reverse.Count-1){int next=at+1;for(int n=reverse.Count-1;n>next;n--)if(VillageNavigation.SegmentClear(reverse[at],reverse[n],actor)){next=n;break;}smooth.Add(reverse[next]);at=next;}corners=smooth.ToArray();return true;
    }
    closed[current]=true;int x=current%width,z=current/width;var from=Position(current);
    for(int dz=-1;dz<=1;dz++)for(int dx=-1;dx<=1;dx++)
    {
     if(dx==0&&dz==0||x+dx<0||x+dx>=width||z+dz<0||z+dz>=height)continue;int n=(z+dz)*width+x+dx;if(closed[n])continue;var to=Position(n);if(tested[n]!=1||!Connect(from,to))continue;float cost=costs[current]+Vector3.Distance(from,to);if(cost>=costs[n])continue;costs[n]=cost;parents[n]=current;heap.Push(n,cost+Vector3.Distance(to,desired));
    }
   }
   }
   int reachable=0,free=0;for(int i=0;i<size;i++){if(closed[i])reachable++;if(tested[i]==1)free++;}LastFailure="No connected physical path; visited="+reachable+" free="+free+" goal="+desired;return false;
  }
 }
}
