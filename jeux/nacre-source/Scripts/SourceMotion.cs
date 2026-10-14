using System;using UnityEngine;
// Original streamed polynomial coefficients, not authored substitute curves.
public static class SourceMotion {
 [Serializable]public class Root{public Clip[] clips;}[Serializable]public class Clip{public string name;public float duration;public Frame[] frames;public Binding[] bindings;}
 [Serializable]public class Frame{public float time;public Key[] keys;}[Serializable]public class Key{public int channel;public float a,b,c,d;}[Serializable]public class Binding{public int channel,count,attribute,type;public uint path;}
 static Root data;
 static float Value(Clip c,int ch,float t){Key found=null;float time=0;foreach(var f in c.frames){if(f.time>t)break;foreach(var k in f.keys)if(k.channel==ch){found=k;time=f.time;}}if(found==null)return 0;float x=t-time;return ((found.a*x+found.b)*x+found.c)*x+found.d;}
 public static bool Apply(Transform tr,string name,float elapsed){if(data==null){var asset=Resources.Load<TextAsset>("Sandcastle/animation-curves");if(!asset)return false;data=JsonUtility.FromJson<Root>(asset.text);}Clip clip=null;foreach(var c in data.clips)if(c.name==name)clip=c;if(clip==null)return false;float t=Mathf.Min(Mathf.Max(0,elapsed),clip.duration);foreach(var b in clip.bindings){if(b.type!=4)continue;var v=new Vector3(Value(clip,b.channel,t),Value(clip,b.channel+1,t),Value(clip,b.channel+2,t));if(b.attribute==1)tr.localPosition=v;if(b.attribute==4)tr.localRotation=Quaternion.Euler(v);}return true;}
}
