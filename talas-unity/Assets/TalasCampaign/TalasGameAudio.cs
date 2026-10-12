using UnityEngine;
public class TalasGameAudio:MonoBehaviour
{
 AudioSource source;AudioClip[] tones;AudioClip music;
 void Awake(){source=gameObject.AddComponent<AudioSource>();source.spatialBlend=0;source.volume=.12f;tones=new AudioClip[3];for(int k=0;k<3;k++){int rate=22050;var data=new float[(int)(rate*.16f)];float freq=440*Mathf.Pow(2,k*4/12f);for(int i=0;i<data.Length;i++){float t=(float)i/rate;data[i]=Mathf.Sin(t*freq*Mathf.PI*2)*Mathf.Sin(Mathf.PI*i/data.Length)*.25f;}tones[k]=AudioClip.Create("Note Talas "+k,data.Length,1,rate,false);tones[k].SetData(data,0);}}
 public void Note(int n){if(source!=null)source.PlayOneShot(tones[Mathf.Abs(n)%3]);}
 public void Rhythm(){if(music==null){int rate=22050;var data=new float[rate*8];int[] notes={0,4,7,4,2,5,9,5,0,4,7,12,7,4,2,7};for(int i=0;i<data.Length;i++){float t=(float)i/rate;int step=(int)(t*2)%notes.Length;float freq=220*Mathf.Pow(2,notes[step]/12f);float envelope=Mathf.Exp(-(t%.5f)*8);data[i]=(Mathf.Sin(t*freq*Mathf.PI*2)*.16f+Mathf.Sin(t*freq*.5f*Mathf.PI*2)*.08f)*envelope;}music=AudioClip.Create("Rythme sécurité Talas",data.Length,1,rate,false);music.SetData(data,0);}source.clip=music;source.loop=true;source.Play();}
 void OnDestroy(){if(music!=null)Destroy(music);if(tones!=null)foreach(var clip in tones)if(clip!=null)Destroy(clip);}
}
