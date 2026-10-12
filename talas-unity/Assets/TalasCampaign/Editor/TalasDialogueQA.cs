using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEngine;
public static class TalasDialogueQA
{
 [Serializable] class Report {public string font,sample;public bool allWordsPreserved,noSpeakerOverlap,noOverflow;public int pages;public List<string> pageText=new List<string>();}
 public static void Run()
 {
  if(!EditorApplication.isPlaying)throw new InvalidOperationException("Play required");var canvas=TalasUI.Canvas("Lecture QA",99);string sample="Dylan doit préparer les sept chapitres ISO 45001 avant l’audit. Boulon l’accompagne. Douze épreuves, des décisions qui modifient l’audit, un carnet sauvegardé. Q / D ou flèches : marcher. Maj : courir. E : atelier. M : carnet. Les mini-jeux présentent leurs propres commandes avant de commencer. Œuvre, prévention, sécurité et traçabilité.";
  var bar=TalasUI.Dialogue(canvas.transform,"BOULON",sample,"boulon");Canvas.ForceUpdateCanvases();var report=new Report{font=bar.body.font.name,sample=sample,pages=bar.Pages,noSpeakerOverlap=true,noOverflow=true};
  do{bar.body.ForceMeshUpdate();bar.speaker.ForceMeshUpdate();report.pageText.Add(bar.body.text);report.noOverflow&=!bar.body.isTextOverflowing;float top=float.NegativeInfinity,nameBottom=float.PositiveInfinity;for(int i=0;i<bar.body.textInfo.characterCount;i++){var ch=bar.body.textInfo.characterInfo[i];if(ch.isVisible)top=Mathf.Max(top,bar.body.transform.TransformPoint(ch.topRight).y);}for(int i=0;i<bar.speaker.textInfo.characterCount;i++){var ch=bar.speaker.textInfo.characterInfo[i];if(ch.isVisible)nameBottom=Mathf.Min(nameBottom,bar.speaker.transform.TransformPoint(ch.bottomLeft).y);}report.noSpeakerOverlap&=top<nameBottom;}while(bar.NextPage());
  report.allWordsPreserved=Regex.Replace(sample,@"\s+","")==Regex.Replace(string.Join(" ",report.pageText),@"\s+","");System.IO.Directory.CreateDirectory("Reports");System.IO.File.WriteAllText("Reports/DialogueQA.json",JsonUtility.ToJson(report,true));UnityEngine.Object.Destroy(canvas);
 }
}
