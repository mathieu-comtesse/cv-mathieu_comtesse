using System;
using UnityEngine;
using UnityEngine.InputSystem;
namespace UngaBunga45001
{
    [Serializable]public sealed class AdventurePreferences
    {
        public float hudScale=1,opacity=.86f,iconScale=1;public bool numbers,controls=true,coordinates=true,headingUp,subtitles=true,highContrast,worldMarkers=true;
        public int gpsMode,learnedControls,goreLevel;public bool autoHints=true,reducedMotion;
        public int inputMode,graphicsProfile=3;public bool autoRun=true,invertTouchY,fixedJoystick=true;public float touchSensitivity=1;
        public string inventory="Tab",craft="V",map="M",journal="J",interact="E",commands="F",tree="T",forward="W",back="S",left="A",right="D",run="LeftShift",jump="Space",crouch="C";
    }
    public sealed class UISettingsController:MonoBehaviour
    {
        public AdventurePreferences preferences=new AdventurePreferences();public event Action Changed;
        public int ConsumedEscapeFrame=-1;public string Rebinding{get;private set;}
        void Awake(){preferences??=new AdventurePreferences();string json=PlayerPrefs.GetString("UNGA.AdventureUI.v4","");if(!string.IsNullOrEmpty(json))try{JsonUtility.FromJsonOverwrite(json,preferences);}catch{} }
        public bool ControlsVisible=>preferences.controls&&(!preferences.autoHints||(preferences.learnedControls&31)!=31);
        public void Learn(int flag){if((preferences.learnedControls&flag)==flag)return;preferences.learnedControls|=flag;Save();}
        public void Save(){PlayerPrefs.SetString("UNGA.AdventureUI.v4",JsonUtility.ToJson(preferences));PlayerPrefs.Save();Changed?.Invoke();}
        static readonly string[] actions={"inventory","craft","map","journal","interact","commands","tree","forward","back","left","right","run","jump","crouch"};
        public string Binding(string action){preferences??=new AdventurePreferences();return action switch{"inventory"=>preferences.inventory,"craft"=>preferences.craft,"map"=>preferences.map,"journal"=>preferences.journal,"interact"=>preferences.interact,"commands"=>preferences.commands,"tree"=>preferences.tree,"forward"=>preferences.forward,"back"=>preferences.back,"left"=>preferences.left,"right"=>preferences.right,"run"=>preferences.run,"jump"=>preferences.jump,"crouch"=>preferences.crouch,_=>"None"};}
        void SetBinding(string action,string value){switch(action){case "inventory":preferences.inventory=value;break;case "craft":preferences.craft=value;break;case "map":preferences.map=value;break;case "journal":preferences.journal=value;break;case "interact":preferences.interact=value;break;case "commands":preferences.commands=value;break;case "tree":preferences.tree=value;break;case "forward":preferences.forward=value;break;case "back":preferences.back=value;break;case "left":preferences.left=value;break;case "right":preferences.right=value;break;case "run":preferences.run=value;break;case "jump":preferences.jump=value;break;case "crouch":preferences.crouch=value;break;}}
        public Key KeyFor(string action)=>Enum.TryParse(Binding(action),out Key key)?key:Key.None;
        public bool Pressed(string action)=>Rebinding==null&&Keyboard.current!=null&&KeyFor(action)!=Key.None&&Keyboard.current[KeyFor(action)].wasPressedThisFrame;
        public bool Held(string action)=>Rebinding==null&&Keyboard.current!=null&&KeyFor(action)!=Key.None&&Keyboard.current[KeyFor(action)].isPressed;
        public void Rebind(string action){Rebinding=action;}
        void Update()
        {
            if(Rebinding==null||Keyboard.current==null)return;
            foreach(var key in Keyboard.current.allKeys)if(key.wasPressedThisFrame)
            {
                if(key.keyCode==Key.Escape){ConsumedEscapeFrame=Time.frameCount;Rebinding=null;return;}
                string old=Binding(Rebinding);foreach(string action in actions)if(Binding(action)==key.keyCode.ToString())SetBinding(action,old);
                SetBinding(Rebinding,key.keyCode.ToString());Rebinding=null;Save();return;
            }
        }
    }
}
