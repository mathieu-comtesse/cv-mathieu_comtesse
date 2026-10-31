using System.Collections;
using System.Collections.Generic;
using UnityEngine;
namespace UngaBunga45001
{
 public sealed class CinematicScoreV15:MonoBehaviour
 {
  static readonly Dictionary<string,AudioClip> cache=new Dictionary<string,AudioClip>();
  static readonly float[] sine=MakeSine();AudioSource source;CampaignRuntime c;float target;bool paused;
  static float[] MakeSine(){var result=new float[2048];for(int i=0;i<result.Length;i++)result[i]=Mathf.Sin(i*Mathf.PI*2/result.Length);return result;}
  static float Osc(float phase)=>sine[((int)(phase*2048))&2047];
  void Ensure(){if(source!=null)return;c=GetComponent<CampaignRuntime>();var go=new GameObject("Musique de réalisation");go.transform.SetParent(transform,false);source=go.AddComponent<AudioSource>();source.playOnAwake=false;source.spatialBlend=0;source.loop=true;source.volume=0;}
  public IEnumerator Prepare(string mood)
  {
   Ensure();if(cache.ContainsKey(mood))yield break;
   int[] notes;float tempo;
   switch(mood)
   {
    case "construction":notes=new[]{48,55,60,64,67};tempo=96;break;
    case "tension":notes=new[]{45,46,52,57,58};tempo=86;break;
    case "accident":notes=new[]{38,45,50,53,57};tempo=64;break;
    case "consultation":notes=new[]{50,55,57,60,65};tempo=82;break;
    case "leadership":notes=new[]{43,50,55,58,62};tempo=112;break;
    case "ritual":notes=new[]{40,47,52,55,59};tempo=66;break;
    case "weather":notes=new[]{50,57,60,62,69};tempo=74;break;
    case "hunt":notes=new[]{38,45,48,50,57};tempo=70;break;
    case "audit":notes=new[]{48,50,55,58,60};tempo=68;break;
    case "success":notes=new[]{48,52,55,60,64};tempo=94;break;
    case "reflection":notes=new[]{45,52,55,57,64};tempo=60;break;
    case "failure":notes=new[]{43,48,50,53,55};tempo=64;break;
    case "emergency":notes=new[]{40,41,47,52,53};tempo=108;break;
    default:notes=new[]{50,53,57,60,62};tempo=78;break;
   }
   const int rate=22050;float beat=60/tempo;int count=Mathf.CeilToInt(16*beat*rate);var samples=new float[count];var frequencies=new float[notes.Length];for(int n=0;n<notes.Length;n++)frequencies[n]=440*Mathf.Pow(2,(notes[n]-69)/12f);
   int[] melody=mood=="failure"?new[]{4,3,2,1,3,2,1,0}:mood=="success"?new[]{0,2,1,3,2,4,3,4}:new[]{0,2,1,3,4,2,1,0};uint noise=18731;float air=0;
   for(int offset=0;offset<count;offset+=16000)
   {
    int end=Mathf.Min(count,offset+16000);
    for(int i=offset;i<end;i++)
    {
     float t=(float)i/rate;int b=(int)(t/beat);float u=(t/beat)-b;int note=melody[(b/2)%melody.Length];float f=frequencies[note];float local=(t%(beat*2));float envelope=Mathf.Min(1,local/.06f)*Mathf.Exp(-local*2.2f);
     float flute=(Osc(f*t)+.18f*Osc(f*t*2)+.06f*Osc(f*t*3))*envelope*.23f;
     if(mood=="accident"||mood=="hunt"||mood=="tension")flute*=.35f;
     float drum=Osc((55-23*u)*t)*Mathf.Exp(-u*15)*((b%4==0)?.35f:.13f);noise^=noise<<13;noise^=noise>>17;noise^=noise<<5;air=air*.94f+((noise&65535)/32768f-1)*.06f;
     float wood=air*Mathf.Exp(-u*36)*((b%2==0)?.12f:.05f);float wind=air*(mood=="weather"?.22f:.025f);
     float edge=Mathf.Min(1,Mathf.Min(t,16*beat-t)/.08f);samples[i]=Mathf.Clamp((flute+drum+wood+wind)*edge,-.85f,.85f);
    }
    yield return null;
   }
   var clip=AudioClip.Create("THALEOLITHIC · "+mood,count,1,rate,false);clip.SetData(samples,0);cache[mood]=clip;
  }
  public void Begin(string mood){Ensure();if(!cache.TryGetValue(mood,out var clip))return;if(source.clip!=clip){source.clip=clip;source.Play();}else if(!source.isPlaying)source.Play();target=.18f;}
  public void End(){target=0;}
  void Update(){if(source==null)return;bool pause=c!=null&&c.UserPaused;if(pause!=paused){paused=pause;if(paused)source.Pause();else source.UnPause();}source.volume=Mathf.MoveTowards(source.volume,target,Time.unscaledDeltaTime*.4f);if(target==0&&source.volume<=0&&source.isPlaying)source.Stop();}
  void OnDisable(){if(source!=null)source.Stop();}
 }
}
