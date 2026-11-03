"""Allégories : pour chaque figure du livre, le texte qui décrit le projet professionnel qu'elle illustre."""
CONFIG = {}

CONFIG['04'] = r"""
A.title('Autoclave de laboratoire · allégorie du Point financier');
A.rep([['Température de consigne','Dépenses engagées du périmètre'],['Puissance de chauffe','Rythme des dépenses']]);
A.dyn('[data-c04="purge"]', () => 'Exclure les lignes KO');
A.set('.c04-hint','Survol : ↔ dépenses, ↕ rythme ; clic : exclure les lignes KO');
const pct = (t) => Math.round(100 * Math.exp(13.7 - 5120 / (t + 273.15)) / 2.03);
A.dyn('[data-c04-out="t"]', () => pct(+A.$('#c04-t').value) + ' % du budget');
A.dyn('[data-c04-out="pw"]', (raw) => '× ' + A.fr(A.nums(raw)[0], 1) + ' (lignes par jour)');
A.dyn('[data-readout]', () => { const p = pct(+A.$('#c04-t').value); return 'Dépenses ' + p + ' % du seuil · ' + (p > 100 ? 'alerte envoyée par mail' : 'sous le seuil'); });
A.key(1,"Manomètre : le niveau de dépenses d'un périmètre (CS, Locatif, MEC, PPTM) face au seuil paramétré dans Excel");
A.key(2,"Voile gris et points dans l'espace vapeur : les lignes KO, exclues du contrôle");
A.key(3,"Teinte de l'eau et de la vapeur : du pâle (peu de dépenses) à l'orangé (budget atteint)");
A.key(4,'Résistance : rougit quand le rythme des dépenses monte');
A.key(5,"Panaches blancs : une alerte envoyée par mail, plus nombreux et plus denses quand le seuil est dépassé");
A.caption("Allégorie du Point financier : chaque cuve est un périmètre de suivi. Plus les dépenses montent, plus la pression monte ; au seuil paramétré dans Excel, l'alerte part par mail, et une de plus si les dépenses dépassent les fonds. Le bouton exclut les lignes KO, comme les flux Power Automate. Avant, le pointage prenait 5 minutes par périmètre et par jour ; maintenant le contrôle est automatique.");
"""

CONFIG['06'] = r"""
A.title('Tube chauffé en soufflerie · allégorie du Studio d’extracteurs PDF');
A.rep([["Vitesse de l'air",'Cadence des PDF exemples'],['Puissance de chauffe','Champs à extraire'],['Diamètre du tube','Famille de documents']]);
A.set('[data-corner="hint"]','↔ cadence · ↕ champs · clic : changer de famille');
A.dyn('[data-c6-out="v"]', (raw) => Math.round(A.nums(raw)[0] * 10) + ' PDF par minute');
A.dyn('[data-c6-out="p"]', (raw) => Math.round(A.nums(raw)[0]) + ' champs');
A.dyn('[data-c6-out="d"]', () => ['CERFA','Plans de prévention','Rapports de contrôle','Autre famille'][+A.$('#c6-d').value] || 'Famille');
A.dyn('[data-readout]', (raw) => { const ts = A.nums(raw).pop(); const q = Math.round(A.clamp((172 - ts) / 152, 0, 1) * 100); return 'Extraction : ' + q + ' % des champs justes · essai en local'; });
A.dyn('[data-c6-out="etat"]', () => "Essai entièrement local : aucun PDF ne quitte le poste. Le tube reste terne quand l'extracteur lit juste, il chauffe quand des champs sont manqués.");
A.key(1,"Tube chauffé : l'extracteur en cours d'essai ; plus il chauffe, plus il se trompe");
A.key(2,"Panache et fils de laine : les champs qui sortent du PDF ; la nappe derrière le tube montre ce qui n'a pas été lu juste");
A.key(3,"Teinte du tube : du terne (extraction juste) au vif (champs manqués)");
A.key(4,"Traînées des traceurs : les PDF qui défilent, plus longues quand la cadence monte");
A.caption("Allégorie du Studio d'extracteurs PDF : l'air qui passe est le flux de PDF d'une famille de documents, le tube chauffé est l'extracteur à l'essai. On règle la cadence, le nombre de champs et la famille, on regarde si l'extracteur tient, puis on livre le fichier ou l'exécutable autonome. Le tout en local : un extracteur en 4 h au lieu de 5 à 10 jours de code.");
"""

CONFIG['07'] = r"""
A.title('Banc de rayonnement · allégorie du Suivi OT, équipement, bâtiment');
A.rep([['Écart entre les plaques','Outils à parcourir'],['Plaque chaude',"Pages liées à l'OT"],['Face chaude',"Accès côté recherche (OT, équipement, bâtiment)"],['Face froide','Accès côté source (outil interne)']]);
A.set('[data-corner="hint"]','Survol ↔ outils à parcourir · ↕ pages liées');
A.options('#r7-f1',{noir:'lien direct vers la page',faible:'lien partiel, à compléter',alu:'aucun lien : recherche manuelle'});
A.options('#r7-f2',{noir:'lien direct vers la page',faible:'lien partiel, à compléter',alu:'aucun lien : recherche manuelle'});
A.dyn('[data-r7-out="gap"]', (raw) => A.plural(Math.round((A.nums(raw)[0] - 20) / 70) + 1, 'outil', 'outils'));
A.dyn('[data-r7-out="t1"]', (raw) => A.plural(Math.round((A.nums(raw)[0] - 40) / 10) + 1, 'page liée', 'pages liées'));
A.dyn('[data-readout]', (raw) => { const phi = A.nums(raw)[1]; return 'Retrouvé en ≈ ' + Math.round(10 + 50 * (1 - A.clamp(phi / 32, 0, 1))) + ' min (≈ 1 h sans lien direct)'; });
A.dyn('[data-r7-out="etat"]', (raw) => "Lien direct : " + Math.round(A.nums(raw)[0]) + " % de l'information arrive sans recopier ni changer d'outil");
A.key(1,"Aiguille du calorimètre : l'information qui arrive jusqu'à la personne, donc le temps gagné");
A.key(2,"Faces interchangeables : lien direct, lien partiel ou aucun lien vers la page concernée");
A.key(3,"Plaque chaude et anneau de garde : du terne (OT simple) au vif (OT riche en pages liées)");
A.key(4,"Voile entre les faces : l'information qui circule, plus dense quand les outils sont proches et les liens directs");
A.caption("Allégorie du Suivi OT, équipement, bâtiment : la plaque chaude est la fiche d'un OT, d'un équipement ou d'un bâtiment ; la plaque froide est la personne qui cherche l'information. Plus il y a d'outils à parcourir entre les deux, moins l'information arrive. Avec les liens directs, elle arrive sans recopier les données : 10 à 15 minutes gagnées par recherche, près d'une heure quand elle passait par d'autres outils.");
"""

CONFIG['08'] = r"""
A.title('Échangeur à plaques · allégorie des Gares prioritaires');
A.set('[data-corner="hint"]','Survol : consultations · clic : sens du croisement');
A.dyn('[data-readout]', (raw) => { const n = A.nums(raw); const sens = /^contre/.test(raw.trim()) ? 'croisement à contre-courant' : 'croisement à co-courant'; const q = n[0], cold = n[1], hot = n[2], eps = n[3]; return sens + ' · ' + Math.round(20 + (q - 0.05) / 0.35 * 10) + ' consultations par jour · criticité ' + A.fr(cold, 1) + ' / ' + A.fr(hot, 1) + ' · efficacité ' + A.fr(eps, 2); });
A.key(1,"Colonnes des deux thermomètres de sortie : le classement de criticité des gares ; plus la colonne monte, plus la gare est à surveiller en premier");
A.key(2,"Plaques : une sur deux porte la conformité de la source normale, l'autre la maintenance préventive ; leur croisement forme le modèle de 19 tables et 159 mesures");
A.caption("Allégorie des Gares prioritaires : l'eau chaude est la conformité de la source normale, l'eau froide la maintenance préventive. Elles circulent dans des canaux séparés et échangent à travers les plaques, sans se mélanger : les sources se croisent sans se confondre. Le débit représente le nombre de consultations par jour, le commutateur inverse le sens du croisement, et les deux thermomètres de sortie donnent le classement de criticité. Avant, chaque consultation prenait 10 à 15 minutes à croiser les sources à la main.");
"""

CONFIG['11'] = r"""
A.title('Mesurer un niveau sonore · allégorie du projet CERFA');
A.text('label[for="c11-r"]','Position dans le lot');A.text('label[for="c11-w"]','Taille du lot');A.text('label[for="c11-a"]','Règles de contrôle');A.text('label[for="c11-n"]','Autres attestations dans le lot');
A.set('[data-corner="hint"]','Survol : position dans le lot · clic : ajouter un autre type d’attestation');
A.dyn('[data-c11-out="r"]', (raw) => 'fiche ' + Math.round(A.nums(raw)[0] / 5 * 300) + ' sur 300');
A.dyn('[data-c11-out="lw"]', (raw) => Math.round((A.nums(raw)[0] - 70) / 30 * 270 + 30) + ' fiches dans le lot');
A.dyn('[data-c11-out="ab"]', () => (+A.$('#c11-a').value) + ' règles de contrôle sur 5');
A.dyn('[data-readout]', (raw) => { const n = A.nums(raw); return 'Fiche ' + Math.round(n[0] / 5 * 300) + ' sur 300 · doublons ' + n[n.length - 1] + ' %'; });
A.key(1,"Barres pleines : les verdicts du contrôle par type (conforme, doublon, non-conformité, retard) ; la hauteur donne le nombre de fiches");
A.key(2,"Barres en contour : les fiches lues au total ; jauge : la part des doublons dans le lot");
A.key(3,"Ondes et tambour de la source : le lot de fiches qui arrive en bloc, plus de cercles quand le lot grossit");
A.key(4,"Voile sur le plateau : les règles de contrôle appliquées, plus dense quand il y en a peu");
A.caption("Allégorie du projet CERFA : la source est le lot de fiches CERFA et d'attestations qui arrive en bloc, le sonomètre est l'extracteur qui lit chaque fiche à mesure qu'il avance dans le lot, et le panneau de bandes affiche les verdicts : conforme, doublon, non-conformité ou retard. Une seconde source représente un autre type d'attestation dans le même lot, contrôlé avec ses propres règles. Avant, 300 fiches demandaient 20 à 25 h de relecture ; maintenant, le lot est traité en 1 min 20 s.");
"""

CONFIG['16'] = r"""
A.title('Banc de diffusion · allégorie du Reporteur Q18');
A.text('label[for="c16-te"]','Lignes du classeur Excel');A.text('label[for="c16-phi"]','Rapports à reporter depuis SharePoint');A.text('label[for="c16-vb"]','Reporteur Q18');
A.set('[data-corner="hint"]','Survol ↔ ↕ · clic : activer le reporteur Q18');
A.dyn('[data-c16-out="te"]', (raw) => Math.round(3000 + A.nums(raw)[0] * 200).toLocaleString('fr-FR') + ' lignes');
A.dyn('[data-c16-out="phi"]', (raw) => Math.round(2000 + (A.nums(raw)[0] - 30) * 60).toLocaleString('fr-FR') + ' rapports par an');
A.dyn('[data-c16-out="vb"]', (raw) => /chaud/.test(raw) ? 'côté SharePoint' : /froid/.test(raw) ? 'côté classeur' : 'copier-coller manuel');
A.dyn('[data-readout]', (raw) => { const g = A.nums(raw).pop(); return g > 0.05 ? Math.round(g) + ' rapports à la mauvaise ligne par jour' : 'chaque rapport sur la bonne ligne'; });
A.dyn('[data-c16-out="etat"]', (raw) => /ondensation/.test(raw) ? "Des rapports s'accumulent à la mauvaise ligne, entre SharePoint et le classeur : le copier-coller se trompe" : 'Chaque rapport trouve sa ligne : le Q18 devient visible dans le suivi qui alimente Power BI');
A.key(1,"Fil tendu : le trajet du rapport à travers le classeur, de SharePoint jusqu'à la ligne");
A.key(2,"Courbe : les lignes du classeur ; gouttes là où le fil la touche, c'est-à-dire là où le rapport se pose");
A.key(3,"Teinte : du bleu (SharePoint) à l'orangé (Power BI) ; bande bleue sur la face : les rapports mal placés, plus large quand le volume monte");
A.key(4,"Voile bleu devant SharePoint : les rapports en attente de report, plus dense quand leur nombre monte");
A.key(5,"Éprouvette : les couches du classeur (onglet, tableau, lignes, colonne Q18)");
A.caption("Allégorie du Reporteur Q18 : la chambre chaude est SharePoint, d'où part le rapport ; l'éprouvette en couches est le grand classeur Excel que le rapport traverse ; la chambre froide est Power BI, qui alimente les COSI et les clients de l'ABE SUD IdF. Sans reporteur, le copier-coller laisse des rapports s'accumuler à la mauvaise ligne ; avec lui, chaque rapport se pose à la bonne ligne et le Q18 devient visible dans une colonne du suivi. Avant, 15 minutes par rapport ; maintenant, le report est automatique.");
"""

CONFIG['52'] = r"""
A.title('Halle de piscine en coupe · allégorie de la chaîne des plans de prévention');
A.rep([['Air de la halle','Cadence de la chaîne Power Automate'],['Humidité relative','Plans en attente de relance'],['Occupation des bassins','Plans déposés dans SharePoint'],['Temps dehors',"Délai avant l'échéance"],['Couvrir les bassins (nuit)','Archiver les plans traités (couverture)'],['Soufflage le long du vitrage','Relance automatique des échéances (soufflage)']]);
A.set('[data-corner="hint"]','Survol ↔ plans déposés · ↕ plans en attente');
const STOP = ['échéance dépassée','échéance dans 2 semaines','échéance dans 1 mois','échéance dans 2 mois','échéance dans 3 mois'];
A.dyn('[data-c52-out="ta"]', (raw) => Math.round((A.nums(raw)[0] - 25) / 8 * 100) + ' % de cadence');
A.dyn('[data-c52-out="phi"]', (raw) => (50 + Math.round((A.nums(raw)[0] - 40) / 35 * 450)) + ' plans en attente');
A.dyn('[data-c52-out="u"]', (raw) => { const u = (+A.$('#c52-u').value) / 100; return /couverts/.test(raw) ? 'tout est archivé' : Math.round(u * 450) + ' plans déposés · ' + (u >= 0.7 ? 'dépôt intense' : u > 0 ? 'dépôt calme' : 'rien à traiter'); });
A.dyn('[data-c52-out="stop"]', () => STOP[+A.$('#c52-e').value] || '');
A.dyn('[data-readout]', (raw) => 'Relances à envoyer : ' + Math.round(A.nums(raw)[0] / 137.1 * 20) + ' par jour');
A.dyn('[data-c52-out="etat"]', (raw) => /ondensation/.test(raw) ? "Échéance dépassée pour certains plans : la relance part (la buée apparaît sur la vitre)" : "Marge avant échéance : " + Math.max(1, Math.round(A.nums(raw)[2] * 20)) + " jours · la chaîne traite les plans à mesure qu'ils arrivent");
A.key(1,"Volutes de vapeur : les plans qui approchent de leur échéance, plus denses quand ils sont nombreux ; vaguelettes et baigneurs : les plans déposés, qui s'agitent avec le dépôt");
A.key(2,"Gaine de reprise : l'état de la chaîne Power Automate, du bleu (au calme) à l'orange (chargée)");
A.key(3,"Vitrages et caisse verte : marge avant échéance, vert (large), ambre (nulle), rouge (dépassée, la relance part) ; la buée sur la vitre signale une échéance dépassée");
A.caption("Allégorie de la chaîne des plans de prévention : la halle est le SharePoint où les plans sont déposés ; les baigneurs et les vagues sont les plans qui arrivent, les volutes de vapeur ceux qui approchent de leur échéance. La vitre est la marge avant l'échéance : verte quand il reste du temps, rouge quand elle est dépassée, et la relance part. La centrale d'air et la gaine sont la chaîne Power Automate, qui extrait les champs et range les plans, et la couverture des bassins est l'archivage automatique. Avant, contrôler et saisir chaque plan prenait 10 minutes.");
"""

CONFIG['69'] = r"""
A.title('Banc de réception de la maison · allégorie du traitement VRE par VM');
A.rep([["Épreuve d'étanchéité",'Relever la demande'],['Rinçage','Contrôler R004 et OT'],['Mise en chauffe','Inscrire le lien'],['Contrôle des débits','Vérifier l’enregistrement'],['Fuite','Doublons dans la file'],['Écart de température','Retard de la relève'],["Température de l'eau",'Rapports dans la file']]);
A.dyn('[data-c69-out="flag"]', () => 'Seconde VM connectée en même temps');
A.set('[data-corner="hint"]','Survol ↔ réglage · ↑↓ étape');
A.dyn('[data-c69-out="leak"]', (raw) => { return A.plural(Math.round(A.nums(raw)[0] / 2), 'doublon', 'doublons'); });
A.dyn('[data-c69-out="dt"]', (raw) => { const v = A.nums(raw)[0]; return (v < 0 ? '−' : '+') + Math.abs(Math.round(v * 2)) + ' min'; });
A.dyn('[data-c69-out="temp"]', (raw) => A.plural(1 + Math.round((A.nums(raw)[0] - 10) / 9), 'rapport', 'rapports'));
A.dyn('[data-readout]', (raw) => 'Rapports R1 à R6 traités un par un · ' + (/décelée/.test(raw) ? 'doublon décelé et écarté' : 'aucun doublon'));
A.dyn('[data-c69-out="key"]', () => 'du bleu (en attente) au rouge (traité)');
const MODES = ["Demande relevée toutes les deux minutes par une seule VM : un rapport présenté deux fois est un doublon, écarté.","Le code final R004 et le numéro d'OT sont contrôlés avant toute inscription : un rapport incohérent est écarté.","Le lien du rapport est inscrit dans le classeur de suivi, sur la ligne de l'OT correspondant.","L'enregistrement est relu et vérifié ; le rapport est rangé dans l'historique, qui écarte les doublons."];
A.dyn('[data-c69-out="detail"]', () => { const i = A.$$('[data-c69-mode]').findIndex((b) => b.getAttribute('aria-pressed') === 'true'); const leak = +A.$('#c69-l').value; return (MODES[Math.max(0, i)] || MODES[0]) + (i <= 0 && leak > 0 ? ' Le doublon est décelé.' : '') + (A.$('[data-c69="flag"]').checked ? " Une seconde VM connectée en même temps masque le doublon : c'est pourquoi une seule machine inscrit à la fois." : ''); });
A.key(1,"Manomètre : le contrôle du code R004 et de l'OT ; l'aiguille suiveuse garde la valeur maximale atteinte");
A.key(2,"Pastilles des radiateurs : l'état de chaque rapport de la file, du bleu (en attente) au rouge (traité)");
A.caption("Allégorie du traitement VRE par VM : avant la remise des clés, une installation passe des essais dans un ordre fixe, puis un procès-verbal. La VM fait de même : elle relève la demande, contrôle le code R004 et l'OT, inscrit le lien dans le classeur, puis vérifie l'enregistrement. Une seule pompe met le circuit en pression, comme une seule VM traite à la fois ; les six radiateurs sont les rapports de la file, la flaque sous R3 est un doublon décelé, et la planchette du PV est le classeur de suivi. Chaque rapport inscrit rend 30 minutes.");
"""
