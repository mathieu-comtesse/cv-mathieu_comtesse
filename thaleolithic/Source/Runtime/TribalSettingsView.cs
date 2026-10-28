using System;
using TMPro;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed partial class TribalInterface
    {
        string settingsSection="Affichage";
        void DrawSettings()
        {
            var tabs=new[]{"Affichage","Commandes","Mobile"};float tw=Mathf.Min(210,W/3);for(int i=0;i<tabs.Length;i++){string section=tabs[i];ActionButton(Content,section.ToUpperInvariant(),i*(tw+4),0,tw-5,44,()=>{settingsSection=section;owner.Render();},settingsSection==section);}
            var p=settings.preferences;var list=TribalStyle.Scroll(Content,"Préférences persistantes",0,58,W,H-58);
            void Option(string id,Func<string> value,Action toggle)
            {var row=TribalStyle.Row(list,id,Small?55:62);var button=TribalStyle.Button(row,font,value(),()=>{toggle();settings.Save();});button.GetComponentInChildren<TMP_Text>().fontSize=FontSize;var text=button.GetComponentInChildren<TMP_Text>();live.Add(()=>{if(text!=null)text.text=value();});}
            if(settingsSection=="Commandes")
            {
                foreach(var definition in new[]{("inventory","Inventaire"),("craft","Fabrication"),("map","Carte"),("journal","Quêtes"),("interact","Interagir"),("commands","Peuple"),("tree","Technologie"),("forward","Avancer"),("back","Reculer"),("left","Gauche"),("right","Droite"),("run","Courir"),("jump","Sauter"),("crouch","S’accroupir")})
                {string action=definition.Item1,label=definition.Item2;Option(action,()=>settings.Rebinding==action?label+" · APPUIE SUR UNE TOUCHE (Échap : annuler)":label+" : "+settings.Binding(action),()=>settings.Rebind(action));}return;
            }
            if(settingsSection=="Mobile")
            {
                Option("Mode de commande",()=>"Commandes : "+new[]{"automatiques","tactiles","clavier / souris"}[Mathf.Clamp(p.inputMode,0,2)],()=>p.inputMode=(p.inputMode+1)%3);
                Option("Qualité",()=>"Qualité : "+new[]{"basse","moyenne","haute","automatique"}[Mathf.Clamp(p.graphicsProfile,0,3)],()=>p.graphicsProfile=(p.graphicsProfile+1)%4);
                Option("Course tactile",()=>"Course tactile automatique : "+(p.autoRun?"oui":"non"),()=>p.autoRun=!p.autoRun);
                Option("Joystick",()=>"Joystick : "+(p.fixedJoystick?"fixe":"flottant"),()=>p.fixedJoystick=!p.fixedJoystick);
                Option("Sensibilité",()=>"Sensibilité caméra : "+p.touchSensitivity.ToString("0.0"),()=>p.touchSensitivity=p.touchSensitivity>=1.8f?.6f:p.touchSensitivity+.2f);
                Option("Caméra verticale",()=>"Axe vertical : "+(p.invertTouchY?"inversé":"normal"),()=>p.invertTouchY=!p.invertTouchY);return;
            }
            Option("Chiffres",()=>"Chiffres des jauges : "+(p.numbers?"toujours":"au survol"),()=>p.numbers=!p.numbers);
            Option("GPS",()=>"GPS : "+new[]{"complet","discret","exploration libre"}[Mathf.Clamp(p.gpsMode,0,2)],()=>p.gpsMode=(p.gpsMode+1)%3);
            Option("Orientation",()=>"Carte : "+(p.headingUp?"direction du joueur":"nord fixe"),()=>p.headingUp=!p.headingUp);
            Option("Coordonnées",()=>"Coordonnées : "+(p.coordinates?"visibles":"masquées"),()=>p.coordinates=!p.coordinates);
            Option("Marqueurs",()=>"Marqueurs du monde : "+(p.worldMarkers?"visibles":"masqués"),()=>p.worldMarkers=!p.worldMarkers);
            Option("Sous-titres",()=>"Sous-titres : "+(p.subtitles?"actifs":"masqués"),()=>p.subtitles=!p.subtitles);
            Option("Contraste",()=>"Contraste du GPS : "+(p.highContrast?"renforcé":"doré"),()=>p.highContrast=!p.highContrast);
            Option("Taille du HUD",()=>"Échelle HUD : "+p.hudScale.ToString("0.00"),()=>p.hudScale=p.hudScale>=1.15f?.85f:Mathf.Min(1.15f,p.hudScale+.1f));
            Option("Accidents",()=>"Accidents : "+new[]{"gore complet","gore modéré","cartoon atténué"}[Mathf.Clamp(p.goreLevel,0,2)],()=>p.goreLevel=(p.goreLevel+1)%3);
            Option("Conseils",()=>"Conseils de commandes : "+(settings.ControlsVisible?"visibles":"masqués"),()=>{p.controls=!settings.ControlsVisible;if(p.controls)p.learnedControls=0;});
            Option("Animations",()=>"Animations des fenêtres : "+(p.reducedMotion?"réduites":"actives"),()=>p.reducedMotion=!p.reducedMotion);
        }
    }
}
