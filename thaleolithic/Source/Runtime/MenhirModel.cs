using System;
using System.Collections.Generic;
using UnityEngine;
namespace UngaBunga45001
{
 public enum MenhirPhase{Inactive,ChooseMode,Intro,Combat,Question,Resolving,Transition,Finale,Victory,Defeat,Paused}
 public enum DuelFighterState{Idle,Move,Attack,Defend,Impact,Fall,GetUp,Stunned,Victory,Defeat}
 [Serializable]public sealed class MenhirAnswer{public string text,attack,reply;public int quality;}
 [Serializable]public sealed class MenhirQuestion{public string id,clause,title,question,correction,hint;public MenhirAnswer[] answers=Array.Empty<MenhirAnswer>();}
 [Serializable]public sealed class MenhirCatalog{public MenhirQuestion[] questions=Array.Empty<MenhirQuestion>();}
 [Serializable]public sealed class DuelReturnActor{public string id;public Vector3 position;public Quaternion rotation,visualRotation=Quaternion.identity;public bool agentEnabled;}
 [Serializable]public sealed class MenhirProgress
 {
  public bool started,inProgress,completed,replay;public int mode,question,epoch,streak;
  public float dylanLife=100,aurelienLife=100,energy=100,elapsedSeconds;
  public bool[] mastered=new bool[5],cleared=new bool[5];public int[] mistakes=new int[5];
  public string lastFeedback="";public List<string> answerReceipts=new List<string>();public List<DuelReturnActor> returnActors=new List<DuelReturnActor>();
  public Vector3 arena,arenaAxis;public bool arenaSet;
 }
}
