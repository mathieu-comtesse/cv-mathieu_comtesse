const equipes = ['Prévention', 'Maintenance', 'Données'];
const dossiers = [
  { texte: 'Préparer le plan de prévention avant l’intervention de deux entreprises.', equipe: 0 },
  { texte: 'Programmer la visite réglementaire d’un équipement.', equipe: 1 },
  { texte: 'Corriger des doublons dans le référentiel des bâtiments.', equipe: 2 },
  { texte: 'Vérifier les habilitations avant l’accès à une emprise.', equipe: 0 },
  { texte: 'Remettre en service un candélabre en panne.', equipe: 1 },
  { texte: 'Rapprocher deux exports à partir du numéro de bien.', equipe: 2 },
  { texte: 'Analyser les risques liés à la coactivité sur un chantier.', equipe: 0 },
  { texte: 'Organiser le remplacement d’un capteur défaillant.', equipe: 1 },
  { texte: 'Normaliser le format des dates dans un tableau de suivi.', equipe: 2 },
  { texte: 'Définir le balisage d’une zone d’intervention.', equipe: 0 },
  { texte: 'Planifier la levée d’une anomalie détectée lors d’une vérification.', equipe: 1 },
  { texte: 'Contrôler la cohérence des identifiants entre deux bases.', equipe: 2 },
];

function melange() {
  const ordre = [...dossiers];
  for (let i = ordre.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
  }
  return ordre;
}

for (const jeu of document.querySelectorAll('[data-cv-tri]')) {
  const progression = jeu.querySelector('[data-tri-progress]');
  const dossier = jeu.querySelector('[data-tri-dossier]');
  const statut = jeu.querySelector('[data-tri-status]');
  const choix = jeu.querySelector('[data-tri-choix]');
  const boutons = [...choix.querySelectorAll('button')];
  const lancer = jeu.querySelector('[data-tri-demarrer]');
  let ordre = [];
  let rang = 0;
  let score = 0;
  let enCours = false;
  let entree;
  const mouvementReduit = matchMedia('(prefers-reduced-motion: reduce)');

  function afficheDossier() {
    progression.textContent = `Dossier ${rang + 1} sur ${ordre.length} · Score ${score}`;
    dossier.textContent = ordre[rang].texte;
    entree?.cancel();
    if (!mouvementReduit.matches) entree = dossier.animate(
      [{ opacity: .45, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
      { duration: 230, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
  }

  function affecte(equipe) {
    if (!enCours) return;
    const attendu = ordre[rang].equipe;
    const correct = equipe === attendu;
    if (correct) score++;
    const bilan = correct ? `Bien orienté vers ${equipes[attendu]}.` : `Ce dossier relevait de ${equipes[attendu]}.`;
    statut.dataset.resultat = correct ? 'juste' : 'erreur';
    rang++;
    if (rang < ordre.length) {
      afficheDossier();
      statut.textContent = `${bilan} Dossier suivant : ${ordre[rang].texte}`;
      return;
    }
    enCours = false;
    entree?.cancel();
    progression.textContent = 'Partie terminée';
    dossier.textContent = `Score : ${score} dossiers sur ${ordre.length}.`;
    statut.textContent = `${bilan} ${dossier.textContent}`;
    choix.hidden = true;
    lancer.hidden = false;
    lancer.textContent = 'Rejouer';
    lancer.focus({ preventScroll: true });
  }

  lancer.disabled = false;
  lancer.addEventListener('click', () => {
    ordre = melange();
    rang = score = 0;
    enCours = true;
    delete statut.dataset.resultat;
    afficheDossier();
    statut.textContent = dossier.textContent;
    choix.hidden = false;
    lancer.hidden = true;
    boutons[0].focus({ preventScroll: true });
  });
  choix.addEventListener('click', event => {
    const bouton = event.target.closest('[data-tri-equipe]');
    if (bouton) affecte(Number(bouton.dataset.triEquipe));
  });
  jeu.addEventListener('keydown', event => {
    if (!enCours || event.repeat || event.altKey || event.ctrlKey || event.metaKey || !/^[1-3]$/.test(event.key)) return;
    event.preventDefault();
    affecte(Number(event.key) - 1);
  });
}
