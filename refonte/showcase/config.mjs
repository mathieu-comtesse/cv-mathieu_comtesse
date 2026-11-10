/* Configuration des vitrines « outil réel » des cadres du parcours (une entrée par fiche projet).
   Lue par tools/build-parcours-projets.mjs : une régénération d'index.html conserve donc les vitrines.
   Chaque fenêtre :
     id, kind (navigateur | sharepoint | pdf | excel | app | console), title, step (1 à N : étape où elle apparaît),
     box { x, y, w } en % de la scène, a (rapport largeur / hauteur),
     status : 'authentic' (capture réelle de l'application, fichier présent) | 'missing' (aucun fichier : emplacement documenté) ,
     src (capture réelle, 720 px de large minimum), big (version agrandie, optionnelle), alt, caption (texte déjà présent dans la fiche), need (visuel à fournir),
     anonymize (ce qu'il faut masquer avant publication).
   Une simulation graphique n'est JAMAIS déclarée « authentic ». La console et le résultat sont construits par le générateur
   à partir du texte de la fiche (étapes de « Comment ça marche », résultat) : aucun chiffre ni sortie inventés. */
export const SHOWCASE = {
  /* Cadre de référence : Reporteur Q18. Aucune capture authentique SharePoint, Excel ni du rapport dans le dépôt : trois emplacements documentés. */
  'projet-moteur44': {
    label: 'Le Reporteur Q18 en situation',
    steps: ['Le rapport', 'Le traitement', 'Le suivi', 'Le résultat'],
    layout: 'q18',
    windows: [
      { id: 'sp', kind: 'sharepoint', title: 'SharePoint · rapports de vérification', step: 1, box: { x: 2, y: 5, w: 42 }, a: '16/10', status: 'missing',
        need: 'Capture de la bibliothèque SharePoint où arrivent les rapports (vue liste).', anonymize: 'noms de clients, références de rapports, identifiants, noms de personnes' },
      { id: 'pdf', kind: 'pdf', title: 'Rapport de vérification', step: 1, box: { x: 31, y: 30, w: 24 }, a: '3/4', status: 'missing',
        need: 'Première page d’un rapport de vérification réel.', anonymize: 'client, site, numéro d’OT, signatures' },
      { id: 'xl', kind: 'excel', title: 'Excel · suivi', step: 3, box: { x: 3, y: 52, w: 47 }, a: '16/10', status: 'missing',
        need: 'Classeur de suivi avec la ligne retrouvée et la cellule renseignée.', anonymize: 'références d’équipement, noms de sites, données personnelles' }
    ],
    console: { title: 'Reporteur Q18', step: 2, box: { x: 56, y: 6, w: 41 }, a: '16/11' }
  },
  /* Cadre qui prouve le chemin « captures authentiques » : deux captures réelles de l'outil CERFA (données fictives de démonstration). */
  'projet-cerfa': {
    label: 'L’extracteur CERFA en situation',
    steps: ['Le document', 'Le traitement', 'Le classement', 'Le résultat'],
    layout: 'duo',
    windows: [
      { id: 'a', kind: 'app', title: 'Extracteur CERFA · dépôt', step: 1, box: { x: 2, y: 6, w: 50 }, a: '1280/900', status: 'authentic',
        src: 'assets/media/demo-cerfa-poster.jpg', alt: 'Interface de l’extracteur CERFA : dépôt des fiches, aucun fichier chargé.', caption: 'Écran de dépôt de l’outil (données de démonstration).' },
      { id: 'b', kind: 'app', title: 'Extracteur CERFA · parc extrait', step: 3, box: { x: 42, y: 30, w: 54 }, a: '720/506', status: 'authentic',
        src: 'assets/projets/cerfa.jpg', alt: 'Interface de l’extracteur CERFA : fiches lues, indicateurs et tableau du parc.', caption: 'Résultat de la lecture : indicateurs et tableau du parc (données de démonstration).' }
    ],
    console: { title: 'Extracteur CERFA', step: 2, box: { x: 54, y: 4, w: 43 }, a: '16/10' }
  }
};
