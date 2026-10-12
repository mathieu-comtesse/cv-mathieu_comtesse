using System;
using UnityEngine;
[Serializable] public class TalasEntry { public string text,info,clause,subtitle,hazard; public string[] options; public int level; }
[Serializable] public class TalasFlagSet {public string[] names;public bool[] values;}
[Serializable] public class TalasQuestion { public string text,feedback; public string[] options,feedbacks; public int correct,chapter; public int[] deltas;public TalasFlagSet[] sets; }
[Serializable] public class TalasBank
{
 public TalasEntry[] docs,postes,feast,causes,chapters,stages;
 public TalasQuestion[] combat,doc,review,reviewUnprepared,jetski,dialogue;
 public string[] song1,song2;
 public static TalasBank Load()=>JsonUtility.FromJson<TalasBank>(Resources.Load<TextAsset>("TalasBank").text);
}
