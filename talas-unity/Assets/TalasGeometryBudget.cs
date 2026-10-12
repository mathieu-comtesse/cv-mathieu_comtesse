using UnityEngine;

[CreateAssetMenu(menuName = "Talas/Budget géométrique")]
public class TalasGeometryBudget : ScriptableObject
{
    [Header("Plafonds par vue : géométrie, hors passes d'ombres")]
    [Min(1)] public int windowsTriangles = 1000000;
    [Min(1)] public int windowsVertices = 1000000;
    [Min(1)] public int browserTriangles = 300000;
    [Min(1)] public int browserVertices = 500000;
    [Header("Objectifs à vérifier dans les builds")]
    [Min(1)] public int windowsFramesPerSecond = 60;
    [Min(1)] public int browserFramesPerSecond = 30;
    [TextArea(3, 7)] public string productionRule =
        "Budget de production, sans subdivision automatique. Ajouter des segments aux silhouettes, " +
        "courbes et déformations utiles. Le profil navigateur exige des LOD et une validation en build. " +
        "Les passes d'ombres, particules, transparences et effets demandent un profilage séparé.";
}
