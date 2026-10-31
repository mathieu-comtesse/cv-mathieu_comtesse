using System;
using UnityEditor;
using UnityEditor.SceneManagement;
namespace UngaBunga45001.Editor
{
    [InitializeOnLoad]public static class QuestReviewV5
    {
        const string Key="UNGA.QuestReviewV5";
        static QuestReviewV5(){if(SessionState.GetBool(Key,false))EditorApplication.update+=Tick;}
        public static void Run(){EditorSceneManager.OpenScene("Assets/UngaBunga45001/Scenes/UngaBunga45001.unity",OpenSceneMode.Single);UnityEngine.Object.FindFirstObjectByType<CampaignRuntime>().resumeOnStart=false;SessionState.SetBool(Key,true);SessionState.SetFloat(Key+"Deadline",(float)EditorApplication.timeSinceStartup+540);EditorApplication.update-=Tick;EditorApplication.update+=Tick;var game=EditorWindow.GetWindow(Type.GetType("UnityEditor.GameView,UnityEditor"));game.Show();game.Focus();EditorApplication.isPlaying=true;}
        static void Tick(){if(!SessionState.GetBool(Key,false))return;if(EditorApplication.timeSinceStartup>SessionState.GetFloat(Key+"Deadline",0)){SessionState.SetBool(Key,false);EditorApplication.Exit(1);return;}EditorApplication.QueuePlayerLoopUpdate();}
    }
}
