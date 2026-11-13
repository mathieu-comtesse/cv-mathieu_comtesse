/* Les pages éditoriales chargent les styles via leur module d'entrée.
 * L'accueil les déclare dans son en-tête pour éviter un changement de géométrie à l'arrivée. */
if (!document.querySelector('link[data-cv-motion]')) {
  const sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = '/refonte/comtesse-motion.css?v=fall26-2';
  sheet.dataset.cvMotion = '';
  document.head.append(sheet);
}
