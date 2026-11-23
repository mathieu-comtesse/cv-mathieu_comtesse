const routes = ['Prévention', 'Maintenance', 'Data', 'IA appliquée', 'Référentiels', 'Méthodes'];
const signals = [
  ['Contrôler les risques liés à la coactivité', 0],
  ['Organiser le suivi des vérifications réglementaires', 1],
  ['Construire un tableau de bord Power BI', 2],
  ['Extraire des informations avec un modèle multimodal', 3],
  ['Identifier les exigences d’ISO 45001', 4],
  ['Améliorer un processus avec la démarche Lean Six Sigma', 5],
];

const round = document.querySelector('#round');
const signal = document.querySelector('#signal');
const tracks = document.querySelector('#tracks');
const result = document.querySelector('#result');
const next = document.querySelector('#next');
let order;
let position;
let score;

const buttons = routes.map((route, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = route;
  button.addEventListener('click', () => routeSignal(index));
  tracks.append(button);
  return button;
});

function start() {
  order = signals.slice();
  for (let index = order.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [order[index], order[other]] = [order[other], order[index]];
  }
  position = 0;
  score = 0;
  showSignal();
}

function showSignal() {
  round.textContent = 'Signal ' + (position + 1) + ' sur ' + order.length;
  signal.textContent = order[position][0];
  result.textContent = '';
  for (const button of buttons) {
    button.disabled = false;
    delete button.dataset.correct;
    delete button.dataset.wrong;
  }
  next.hidden = true;
}

function routeSignal(selected) {
  const correct = order[position][1];
  for (const button of buttons) button.disabled = true;
  buttons[correct].dataset.correct = '';
  if (selected === correct) score++;
  else buttons[selected].dataset.wrong = '';
  const finished = position === order.length - 1;
  const feedback = selected === correct ? 'Signal bien aiguillé.' : 'La bonne voie était ' + routes[correct] + '.';
  result.textContent = finished ? feedback + ' Résultat : ' + score + ' sur ' + order.length + '.' : feedback;
  next.textContent = finished ? 'Rejouer' : 'Signal suivant';
  next.hidden = false;
  next.focus();
}

next.addEventListener('click', () => {
  position++;
  if (position === order.length) start();
  else showSignal();
  buttons[0].focus();
});
start();
