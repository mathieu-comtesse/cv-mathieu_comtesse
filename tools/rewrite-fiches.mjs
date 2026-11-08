// Réécrit, dans les fiches projet-*.html, le texte de présentation des machines : idée de l'objet, légende, « Comment ça marche »
// (cinq étapes lisibles + processus détaillé repliable) et boutons d'action. Les chiffres de gains, périmètres et délais ne sont pas touchés.
// Les cartes de l'accueil se régénèrent ensuite avec : node tools/build-parcours-projets.mjs
// Usage : node tools/rewrite-fiches.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url);
const D = {
  moteur44: {
    action: 'Une machine à écrire de bureau qui range chaque rapport à sa place. Le rapport passe sous une voûte de lecture, son numéro d’OT est composé au clavier, puis un chariot de huit fiches glisse jusqu’à la fiche de cet OT. La tête frappe les informations ; si le rapport porte un Q18, un poinçon distinct le marque en rouge. Un palpeur contrôle enfin la ligne. Sans elle, on cherchait la bonne ligne du classeur et on recopiait les données depuis SharePoint, 15 min par rapport. Avec elle, le rapport se pose seul à la bonne ligne.',
    legend: [['Voûte de lecture', 'le rapport SharePoint, lu avant d’être reporté'], ['Clavier et tambours', 'le numéro d’OT, composé chiffre par chiffre'], ['Chariot de fiches', 'les lignes du classeur Excel ; il glisse jusqu’à la fiche de l’OT'], ['Tête de frappe', 'l’écriture des informations dans la ligne'], ['Poinçon rouge', 'le marquage Q18, seulement si le rapport en porte un'], ['Palpeur et voyant', 'la vérification de la ligne : vert si elle est correcte, rouge si le rapport n’a pas de ligne'], ['Bande perforée', 'la visibilité côté Power BI, d’un cran par rapport']],
    note: 'Trois cas sont rejouables : avec Q18, sans Q18, rapport non apparié. La machine est une simulation pédagogique : OT, dates et statuts sont fictifs.',
    steps: [['Lire le rapport', 'Le rapport arrive de SharePoint et passe sous la voûte de lecture.'], ['Composer l’OT', 'Le numéro d’OT est tapé au clavier : quatre tambours affichent les chiffres.'], ['Trouver la ligne', 'Le chariot de fiches glisse jusqu’à la fiche de cet OT et ralentit à l’approche.'], ['Écrire et marquer', 'La tête frappe les informations ; le poinçon marque le Q18 si le rapport en porte un.'], ['Vérifier et publier', 'Le palpeur contrôle la ligne, puis la bande avance d’un cran pour Power BI.']]
  },
  studio: {
    action: 'Un atelier qui fabrique un extracteur sur mesure. Un exemple de PDF est posé sur une table lumineuse ; un portique y place trois cadres de détection ; une tête de découpe taille un gabarit à la même position ; une presse à levier forme une cartouche de configuration. Un lecteur reçoit cette cartouche et compare un nouveau document aux valeurs attendues. Sans elle, créer un extracteur demandait 5 à 10 jours de code. Avec elle, un document passe du PDF à l’extracteur prêt à livrer en 4 h.',
    legend: [['Table lumineuse', 'l’exemple de PDF à lire'], ['Cadres du portique', 'les zones à extraire ; ils se déplacent à la main et la machine en tient compte'], ['Tête de découpe', 'le gabarit, taillé à la position des cadres'], ['Presse à levier', 'la cartouche de configuration : l’extracteur prêt à livrer'], ['Lecteur d’essai', 'un nouveau document, comparé aux valeurs attendues']],
    note: 'Dans le scénario « Mon cadrage », vous placez vous-même les cadres avant de lancer l’essai. Documents et valeurs sont fictifs.',
    steps: [['Poser le PDF', 'Un exemple de document est posé sur la table lumineuse.'], ['Placer les cadres', 'Le portique place trois cadres sur les champs à extraire.'], ['Tailler le gabarit', 'La tête de découpe taille un gabarit à la position des cadres.'], ['Presser la cartouche', 'La presse à levier forme la cartouche de configuration.'], ['Essayer', 'Le lecteur reçoit la cartouche et compare un nouveau document aux valeurs attendues.']]
  },
  gares: {
    action: 'Un tableau à tambours, comme les anciens panneaux d’affichage des gares. Huit tambours octogonaux, un par rang, portent chacun les huit gares. Quand on tourne la couronne de critère, un calculateur à cames détermine le nouvel ordre et chaque tambour avance du nombre de faces nécessaire ; trois cadrans par rangée suivent les indicateurs de la gare affichée. Sans lui, chaque consultation prenait 10 à 15 min : il fallait croiser plusieurs sources à la main. Avec lui, les sources se croisent seules et le classement sort tout fait.',
    legend: [['Tambours octogonaux', 'une rangée par rang du classement, chaque face porte une gare'], ['Couronne de critère', 'le critère de priorité choisi'], ['Calculateur à cames', 'le nouvel ordre, calculé à chaque changement de critère'], ['Cadrans', 'les indicateurs de la gare affichée'], ['Tiroir de fiche', 'le détail de la gare sélectionnée']],
    note: 'Trois scénarios : changer de critère, ouvrir une fiche, ou « Mon choix » pour choisir vous-même le critère et la gare. Données fictives.',
    steps: [['Choisir un critère', 'La couronne de critère tourne sur la priorité demandée.'], ['Calculer l’ordre', 'Le calculateur à cames détermine le nouvel ordre des huit gares.'], ['Faire tourner le tableau', 'Chaque tambour avance du nombre de faces nécessaire.'], ['Lire les indicateurs', 'Les cadrans de chaque rangée suivent la gare affichée.'], ['Ouvrir une fiche', 'Une gare est sélectionnée et son tiroir s’ouvre.']]
  },
  cerfa: {
    action: 'Une trieuse optique de bureau. Un lot de dix feuilles est séparé une à une, lu dans une chambre optique, contrôlé par un module F-Gas, puis rangé dans l’un des cinq bacs par le poussoir de ce bac, pendant qu’un registre affiche la table structurée qui se constitue. Sans elle, 300 fiches CERFA et attestations demandaient 20 à 25 h de relecture. Avec elle, tout le lot est traité en 1 min 20 s.',
    legend: [['Séparateur', 'une feuille à la fois, sans mélange'], ['Chambre optique', 'la lecture des champs de la feuille'], ['Module F-Gas', 'le contrôle de l’échéance et du fluide des attestations'], ['Cinq bacs et poussoirs', 'la destination : complète, incomplète, doublon, F-Gas à revoir, format non reconnu'], ['Registre', 'la table structurée qui se remplit au fil du lot']],
    note: 'Le scénario « Ma feuille » permet de choisir un document, de voir ses champs et la raison de son classement. Feuilles fictives.',
    steps: [['Séparer le lot', 'Les feuilles du lot sont prises une à une.'], ['Lire la feuille', 'La chambre optique lit les champs : OT, date, fluide, signature…'], ['Contrôler', 'Le module F-Gas vérifie l’échéance et le fluide des attestations.'], ['Trier', 'Le poussoir du bon bac range la feuille : complète, incomplète, doublon, à revoir ou non reconnue.'], ['Tenir le registre', 'Le registre affiche la table structurée qui se constitue.']]
  },
  finance: {
    action: 'Un réservoir surveillé par un flotteur. Le niveau représente la consommation rapportée aux fonds disponibles ; l’aiguille l’affiche, et deux déclencheurs, un seuil préventif réglable et le dépassement à 100 %, font sonner une cloche, sortir un courrier et tomber un loquet qui mémorise l’alerte pour ne pas la répéter. Sans lui, le pointage prenait 5 min par périmètre et par jour. Avec lui, le niveau suit les dépenses et l’alerte part seule au seuil.',
    legend: [['Niveau du réservoir', 'la consommation rapportée aux fonds disponibles'], ['Flotteur et aiguille', 'la lecture du niveau'], ['Repère de seuil', 'le seuil préventif, réglable'], ['Cloche et courrier', 'l’alerte envoyée au seuil, puis au dépassement'], ['Loquet', 'la mémoire de l’alerte : elle n’est pas répétée']],
    note: 'Le réservoir est une image de surveillance : aucune dépense n’est bloquée. Dans « Mon réservoir », vous réglez périmètre, consommation, seuil et lignes KO. Chiffres de démonstration fictifs.',
    steps: [['Mesurer le niveau', 'Le niveau du réservoir monte avec la consommation des fonds.'], ['Lire l’aiguille', 'Le flotteur transmet le niveau à l’aiguille.'], ['Franchir le seuil', 'Au seuil préventif, la cloche sonne et un courrier sort.'], ['Mémoriser', 'Le loquet tombe : l’alerte est retenue et ne se répète pas.'], ['Signaler le dépassement', 'À 100 %, un second courrier signale des dépenses supérieures aux fonds.']]
  },
  vmvre: {
    action: 'Un centre de tri postal miniature. Un rapport PDF, une enveloppe, entre sur un convoyeur ; une demande est imprimée dans une file physique ; la relève de la VM la libère ; le lecteur vérifie le code R004 et l’OT ; une pince range le lien dans le bon casier Excel, ou la voie des doublons ou le rejet l’écarte. À 17 h, un distributeur imprime un récapitulatif. Sans lui, deux machines pouvaient inscrire le même rapport. Avec lui, une seule VM traite à la fois.',
    legend: [['Enveloppes', 'les rapports PDF de la file'], ['Imprimante de demandes', 'la file d’attente physique, une demande à la fois'], ['Lecteur', 'le contrôle du code R004 et de l’OT'], ['Pince et casiers', 'l’inscription du lien dans le bon casier Excel'], ['Voie des doublons et rejet', 'ce qui est écarté plutôt qu’inscrit deux fois'], ['Distributeur de 17 h', 'le récapitulatif imprimé en fin de journée']],
    note: 'La machine est une simulation pédagogique : rapports et casiers sont fictifs.',
    steps: [['Recevoir le rapport', 'Une enveloppe entre sur le convoyeur : c’est un rapport PDF.'], ['Faire la queue', 'Une demande est imprimée ; la relève de la VM la libère, une à la fois.'], ['Contrôler', 'Le lecteur vérifie le code R004 et l’OT.'], ['Inscrire ou écarter', 'La pince range le lien dans le bon casier Excel ; un doublon ou un rejet part sur sa voie.'], ['Récapituler', 'À 17 h, le distributeur imprime le récapitulatif.']]
  },
  pa: {
    action: 'Une grande horloge-calendrier d’archivage. Un plan de prévention arrive ; ses informations sont lues, et une pince le range dans le tiroir de sa catégorie. Le calendrier de l’horloge avance : un témoin s’allume à l’approche de l’échéance, puis une cloche sonne et une languette de relance sort. Un dossier échu est ensuite sorti de son tiroir et déposé aux archives. Sans elle, contrôler et saisir chaque plan de prévention prenait 10 min. Avec elle, l’échéance se surveille seule et la relance part à temps.',
    legend: [['Lecteur et pince', 'la lecture du plan, puis son rangement dans le tiroir de sa catégorie'], ['Calendrier de l’horloge', 'le temps qui avance vers l’échéance'], ['Témoin lumineux', 'l’échéance approche'], ['Cloche et languette', 'la relance, envoyée à l’échéance'], ['Archives', 'le dossier échu, sorti de son tiroir']],
    note: 'Dans « Mon classement », vous choisissez un dossier, avancez la date et observez la relance puis l’archivage. Dossiers fictifs.',
    steps: [['Recevoir le plan', 'Un plan de prévention arrive et ses informations sont lues.'], ['Ranger', 'Une pince le dépose dans le tiroir de sa catégorie.'], ['Avancer le calendrier', 'L’horloge avance ; un témoin s’allume à l’approche de l’échéance.'], ['Relancer', 'La cloche sonne et une languette de relance sort.'], ['Archiver', 'Le dossier échu est sorti du tiroir et déposé aux archives.']]
  },
  powerbi: {
    action: 'Un paternoster d’archives : deux chaînes en boucle portent huit casiers qui restent toujours à l’horizontale. La boucle amène le casier demandé devant la fenêtre latérale, un bras à ventouse sort le dossier sur le comptoir, et le lecteur de référence allume le portail de visualisation PP & MOSO, qui affiche l’échéance et les données du marché. Sans lui, un plan de prévention bien rangé ne servait que si on le retrouvait en quelques secondes. Avec lui, le dossier demandé vient à la fenêtre.',
    legend: [['Casiers en boucle', 'les plans de prévention et les marchés MOSO'], ['Fenêtre latérale', 'l’endroit où vient le casier demandé'], ['Bras à ventouse', 'la sortie du dossier sur le comptoir'], ['Lecteur de référence', 'l’identification du dossier consulté'], ['Portail lumineux', 'la visualisation PP & MOSO : échéance et données du marché']],
    note: 'Dans « Ma consultation », vous choisissez un document, puis comparez deux états simulés du même plan. Documents fictifs.',
    steps: [['Demander un dossier', 'Un plan de prévention ou un marché est demandé.'], ['Faire tourner la boucle', 'Les chaînes amènent le bon casier devant la fenêtre, toujours à l’horizontale.'], ['Sortir le dossier', 'Le bras à ventouse dépose le dossier sur le comptoir.'], ['Lire la référence', 'Le lecteur identifie le dossier et allume le portail.'], ['Consulter', 'Le portail affiche l’échéance et les données du marché.']]
  },
  vre: {
    action: 'Un boulier mécanique de comptage. Une feuille de rapport est lue ligne à ligne ; chaque équipement reconnu fait pivoter un aiguillage vers sa famille, un tambour libère une bille qui roule dans une gouttière puis tombe dans la colonne de cette famille, et le compteur mécanique avance d’une unité. Sans lui, compter à la main les équipements d’un rapport électrique, c’est relire chaque ligne en tenant quatre totaux de tête. Avec lui, chaque rapport se répartit seul dans ses quatre familles (BT31, BT33, BT21, BT11), puis rejoint le classeur Excel et la GMAO.',
    legend: [['Feuille de rapport', 'lue ligne à ligne'], ['Aiguillage', 'l’orientation de chaque équipement vers sa famille'], ['Bille et gouttière', 'une unité comptée, qui roule jusqu’à sa colonne'], ['Quatre colonnes', 'les familles BT31, BT33, BT21 et BT11'], ['Compteur mécanique', 'le total, qui avance d’une unité à chaque bille']],
    note: 'Dans « Mon rapport », vous composez vous-même le rapport à compter. Rapports fictifs.',
    steps: [['Lire une ligne', 'La feuille de rapport est lue ligne à ligne.'], ['Reconnaître', 'Chaque équipement reconnu fait pivoter l’aiguillage vers sa famille.'], ['Compter', 'Un tambour libère une bille ; le compteur mécanique avance d’une unité.'], ['Répartir', 'La bille tombe dans la colonne BT31, BT33, BT21 ou BT11.'], ['Transmettre', 'Les totaux rejoignent le classeur Excel puis la GMAO.']]
  },
  suivi: {
    action: 'Un standard téléphonique électromécanique. On choisit une demande (OT, équipement ou bâtiment) au clavier et au cadran ; des relais identifient les systèmes concernés ; deux fiches à cordon sont branchées, l’une dans la prise de la demande, l’autre dans la prise du système ; un écran central affiche les accès retrouvés. Sans lui, une recherche passait d’un outil à l’autre, jusqu’à près d’une heure. Avec lui, l’information arrive directement à la personne.',
    legend: [['Clavier et cadran', 'la demande : un OT, un équipement ou un bâtiment'], ['Relais', 'l’identification des systèmes concernés'], ['Fiches à cordon', 'le lien établi entre la demande et le système'], ['Écran central', 'les accès retrouvés']],
    note: 'Dans « Ma demande », vous saisissez vous-même la demande. Demandes fictives.',
    steps: [['Poser la demande', 'La demande est choisie au clavier et au cadran.'], ['Identifier', 'Les relais s’enclenchent pour les systèmes concernés.'], ['Brancher', 'Deux fiches à cordon relient la prise de la demande et celle du système.'], ['Retrouver', 'L’écran central affiche les accès retrouvés.'], ['Consulter', 'La personne accède directement à l’information.']]
  },
  'lecteur-vre': {
    steps: [['Lire la page', 'Un chargeur amène la page ; trois tambours en série la lisent, l’interprètent et la classent.'], ['Imprimer la fiche', 'Une imprimerie inversée émet une fiche par page ; la trieuse la dirige vers l’un de ses cinq bacs ou vers la chambre.'], ['Décider', 'Dans la chambre de validation, la main touche la fiche : appui net pour valider, geste le long de la zone pour corriger, appui lourd pour rejeter.'], ['Mémoriser', 'Les fiches validées ou corrigées s’archivent dans la mémoire partagée. Une simple correction ne change pas le modèle.'], ['Reconfigurer', 'Seul un réentraînement explicite prépare un modèle candidat : il est évalué, accepté, puis activé, l’ancien restant restaurable.']]
  }
};
const slugOf = { moteur44: 'moteur44', studio: 'studio', gares: 'gares', cerfa: 'cerfa', finance: 'finance', vmvre: 'vmvre', pa: 'pa', powerbi: 'powerbi', vre: 'vre', suivi: 'suivi', 'lecteur-vre': 'lecteur-vre' };
const esc = (s) => s.replace(/&(?!amp;|#)/g, '&amp;');
const how = (steps, detail) => `<div class="rf-marche" data-how=""><ol class="rf-marche-steps">${steps.map(([t, p], i) => `<li data-at="${(i / steps.length).toFixed(3)}"><span class="rf-marche-n" aria-hidden="true">${i + 1}</span><h3>${t}</h3><p>${p}</p></li>`).join('')}</ol>${detail ? `<details class="rf-marche-more"><summary>Voir le processus détaillé</summary><ol class="rf-marche-detail">${detail}</ol></details>` : ''}</div>`;
let n = 0;
for (const [key, d] of Object.entries(D)) {
  const f = `projet-${slugOf[key]}.html`; let s = readFileSync(new URL(f, ROOT), 'utf8');
  if (s.includes('class="rf-marche"')) { console.log('déjà fait :', f); continue; }
  if (d.action) {
    const a = s.indexOf('<h2>L’objet en action</h2>'), b = s.indexOf('<h2>Le projet</h2>');
    if (a < 0 || b < 0) throw new Error('structure : ' + f);
    s = s.slice(0, a) + `<h2>L’objet en action</h2><p>${d.action}</p><ul class="rf-legend">${d.legend.map(([t, p]) => `<li><b>${t}</b>${p}</li>`).join('')}</ul><p class="rf-legend-note">${d.note}</p>` + s.slice(b);
  }
  const fa = s.search(/<div class="rf-flow"/);
  let detail = '';
  if (fa >= 0) {
    const fe = s.indexOf('</ol></div>', fa) + '</ol></div>'.length, blk = s.slice(fa, fe);
    detail = [...blk.matchAll(/<li class="rf-flow-step[^>]*>(?:<p class="rf-flow-tech">[^<]*<\/p>)?<h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/li>/g)].map((m) => `<li><b>${m[1]}</b> ${m[2]}</li>`).join('');
    s = s.slice(0, fa) + how(d.steps, detail) + s.slice(fe);
  } else {
    const c = s.indexOf('<h2>Construction</h2>'), end = c >= 0 ? c : s.indexOf('</div>\n    <nav class="rf-post-pn"');
    if (end < 0) throw new Error('pas de point d’insertion : ' + f);
    s = s.slice(0, end) + '<h2>Comment ça marche</h2>' + how(d.steps, '') + s.slice(end);
  }
  s = s.replace(/<div class="rf-post-meta">([\s\S]*?)<\/div><\/header>/, (m) => m.replace('</header>', '<p class="rf-post-act"><button type="button" class="rf-cta" data-demo="play">Voir la démonstration</button><button type="button" class="rf-cta rf-cta--quiet" data-demo="explore">Explorer la machine</button></p></header>'));
  s = s.replace(/<link rel="modulepreload" href="refonte\/flow\.js">\n?/g, '');
  writeFileSync(new URL(f, ROOT), s); n++; console.log('ok', f, !!detail);
}
console.log(n + ' fiches réécrites');
