using System;
using System.IO;
using UnityEditor;

internal sealed class LegacyWebTextureScopeV241 : IDisposable
{
    const string Backup = "Library/ThaleolithicWebTexturesV241";
    static readonly string[] Paths =
    {
        "Assets/Texture2D/Background_CharacterCreation.png",
        "Assets/Texture2D/Background_CharacterCreation_Display.png",
        "Assets/Texture2D/Background_CharacterCreation_Options.png",
        "Assets/Texture2D/Background_NewGame_Slot_Selected.png"
    };

    public static LegacyWebTextureScopeV241 Create()
    {
        Restore();
        Directory.CreateDirectory(Backup);
        var scope = new LegacyWebTextureScopeV241();
        try
        {
            for (int i = 0; i < Paths.Length; i++)
            {
                var importer = AssetImporter.GetAtPath(Paths[i]) as TextureImporter;
                if (importer == null || importer.textureType != TextureImporterType.Sprite)
                    throw new InvalidOperationException("Sprite historique non reconnu : " + Paths[i]);
                var settings = importer.GetPlatformTextureSettings("WebGL");
                if (!settings.overridden || settings.format != TextureImporterFormat.DXT5)
                    throw new InvalidOperationException("Format de départ inattendu : " + Paths[i]);
                File.Copy(Paths[i] + ".meta", Save(i), false);
                settings.format = TextureImporterFormat.ETC2_RGBA8;
                settings.compressionQuality = 100;
                importer.SetPlatformTextureSettings(settings);
                importer.SaveAndReimport();
            }
            return scope;
        }
        catch { scope.Dispose(); throw; }
    }

    public void Dispose() => Restore();

    static void Restore()
    {
        for (int i = 0; i < Paths.Length; i++)
        {
            if (!File.Exists(Save(i))) continue;
            File.Copy(Save(i), Paths[i] + ".meta", true);
            AssetDatabase.ImportAsset(Paths[i], ImportAssetOptions.ForceUpdate | ImportAssetOptions.ForceSynchronousImport);
            File.Delete(Save(i));
        }
        if (Directory.Exists(Backup) && Directory.GetFileSystemEntries(Backup).Length == 0) Directory.Delete(Backup);
    }

    static string Save(int index) => Backup + "/" + index + ".meta.backup";
}