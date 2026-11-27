"""Prose des fiches de projets et des introductions de types, au ton des Éditions Shopify Automne 2026 :
titre = bénéfice en groupe nominal, une ou deux phrases au présent, l'outil en sujet, chute courte ; bouton « En savoir plus ».
Chaque phrase reprend un fait déjà présent dans la fiche (L'idée, Le projet, Ce que ça change, Pour l'équipe) : rien n'est ajouté.
Usage : python3 -I tools/prose-projets.py index.html"""
import re, sys, html
P = sys.argv[1]; s = open(P).read()
e = lambda t: html.escape(t, quote=False)
FICHES = {
 'cv-7-0-point-financier-power-automate': ('Des dépassements de budget signalés le matin même',
   'Quatre flux Power Automate contrôlent les lignes du point financier (CS, Locatif, MEC et PPTM), écartent les lignes KO et signalent chaque dépassement de seuil. Les seuils se règlent toujours dans Excel.'),
 'cv-7-1-vre-traitement-par-vm': ('Chaque rapport VRE inscrit une seule fois',
   'Déposez le rapport sur SharePoint : une VM relève la demande toutes les deux minutes, contrôle le code du rapport et le numéro d’OT, inscrit le lien dans le classeur et vérifie l’enregistrement. Un historique écarte les doublons.'),
 'cv-7-2-reporteur-q18': ('Les Q18 visibles, de SharePoint jusqu’à Power BI',
   'Le Reporteur Q18 retrouve la bonne ligne parmi des milliers et remplace le copier-coller depuis SharePoint. Le classeur alimente Power BI, pour les COSI et les clients de l’ABE SUD IdF.'),
 'cv-7-3-power-automate-chaine-des-pp': ('Des plans de prévention rangés, archivés et relancés',
   'La VM extrait les champs de chaque plan de prévention, le range dans SharePoint et l’archive automatiquement. Le portail PP & MOSO affiche ensuite les plans, leurs échéances et les données des marchés.'),
 'cv-7-4-cerfa-v3': ('300 fiches CERFA contrôlées en 1 min 20 s',
   'CERFA v3 reconnaît, lit et contrôle chaque fiche et chaque attestation d’un lot avec ses propres règles. Vous ne dépouillez plus : vous supervisez le lot et repartez avec un Excel déjà filtré et surligné.'),
 'cv-7-5-extracteur-vre': ('Les équipements d’un rapport électrique, comptés pour vous',
   'L’extracteur compte, bâtiment par bâtiment et local par local, les disjoncteurs (BT31), les fusibles (BT33), les blocs d’éclairage de sécurité (BT21) et les candélabres (BT11) du plan annuel de maintenance. Vous gardez la main sur chaque total.'),
 'cv-7-6-lecteur-vre-modele-multimodal': ('Nisaru : un modèle qui lit les rapports, sans boîte noire',
   'Un mini-BERT, des règles métiers et LayoutLMv3 lisent les rapports de vérification électrique. Chaque proposition est vérifiée par un agent, et chaque correction enrichit la mémoire partagée.'),
 'cv-7-7-power-bi-pp-moso': ('Les plans de prévention retrouvés en quelques secondes',
   'Des interfaces Power BI sur mesure, en HTML et CSS dans les mesures DAX, affichent les plans valides ou archivés, leurs échéances et les données des marchés. Un projet récompensé par un prix de l’innovation de SNCF Gares & Connexions.'),
 'cv-7-8-studio-d-extracteurs-pdf': ('Un extracteur PDF en quelques heures, sans coder',
   'Ouvrez le Studio, tracez, testez, distribuez. Il tourne entièrement en local, y compris en exécutable autonome : aucun document ne quitte le poste.'),
 'cv-7-9-retrouver-tout-le-suivi': ('Tout le suivi d’un OT depuis une seule interface',
   'Pour un ordre de travail, un équipement ou un bâtiment, une interface rassemble les accès aux outils internes SNCF et ouvre directement la bonne page.'),
 'cv-7-10-gares-prioritaires': ('Les gares à surveiller, repérées en quelques secondes',
   'Un rapport Power BI classe les gares par criticité et réunit la conformité de la source normale, les équipements sous vigilance, la maintenance préventive et les mises en conformité.'),
}
INTROS = [
 ('Des processus à explorer et à faire fonctionner', 'Chaque projet devient une machine concrète : son fonctionnement est l’explication. Cliquez sur une machine pour voir ce qu’elle fait. Les gains sont valorisés à 104,74 € de l’heure.'),
 ('Des fichiers qui se retrouvent seuls', 'Chaque outil part d’un constat de terrain : un fichier qu’on cherche, qu’on classe ou qu’on relit à la main. Ici, le fichier trouve sa place tout seul.'),
 ('Construire une seule fois', 'Construit une fois, réutilisé partout : le Studio crée un extracteur PDF sans coder, et Power BI rassemble extraction, rangement et archivage pour d’autres rapports, d’autres périmètres, d’autres équipes.'),
 ('Savoir où regarder', 'Retrouvez tout le suivi d’un OT, d’un équipement ou d’un bâtiment, et repérez les gares qui demandent de l’attention avant que cela devienne un retard.'),
]
n = 0
for h, (titre, texte) in FICHES.items():
    i = s.index('<article id="%s"' % h); a0 = s.index('<div class="cv-pframe cv-pf-text"', i); c = s.index('<dl class="cv-pf-cles">', a0)
    ouv = s[a0:s.index('>', a0) + 1]
    s = s[:a0] + ouv + '<h3 class="trim-cap font-sans font-medium global-lg:text-body-lg">%s</h3><p class="cv-pf-lead">%s</p>' % (e(titre), e(texte)) + s[c:]
    n += 1
assert n == 11
s = s.replace('<summary>Voir le détail</summary>', '<summary>En savoir plus</summary>')
for k, (titre, texte) in enumerate(INTROS):
    hid = 'cv-processus' + ('' if k == 0 else '-%d' % k)
    i = s.index('<article id="%s"' % hid); j = s.index('</article>', i)
    seg = s[i:j]
    seg2 = re.sub(r'<div class="pc-notes">.*?</div>', '<div class="pc-notes"><p class="pc-note cv-pf-lead">%s</p></div>' % e(texte), seg, count=1, flags=re.S)
    assert seg2 != seg, hid
    s = s[:i] + seg2 + s[j:]
s = s.replace('.cv-pf-cles{display:flex', '.cv-pf-lead{margin:12px 0 0;max-width:40ch}\n.cv-pf-cles{display:flex', 1)
open(P, 'w').write(s); print('fiches', n, 'introductions', len(INTROS))
