// Référentiel des indicateurs chiffrés : une fiche par indicateur, bâtie sur annual-gains.js (seule source des calculs).
// Les nombres ne sont jamais ressaisis ici : ils viennent de ANNUAL_GAINS, ANNUAL_RATE et BUILD.
// Un champ à null signifie « non renseigné » : il est affiché comme tel, jamais comblé.
import { ANNUAL_GAINS, ANNUAL_RATE, ANNUAL_DAYS } from './annual-gains.js';

// Les quatre natures de résultat. Aucun indicateur ne peut en changer sans que cette liste soit modifiée.
export const NATURES = {
  mesure: { label: 'Résultat mesuré', help: 'Valeur observée sur un périmètre identifié.' },
  estimation: { label: 'Résultat estimé', help: 'Projection calculée à partir d’hypothèses documentées.' },
  capacite: { label: 'Capacité opérationnelle libérée', help: 'Temps de travail économisé ou réaffectable. Ce n’est pas une économie financière.' },
  budget: { label: 'Économie budgétaire réelle', help: 'Montant effectivement évité, réduit ou constaté dans les dépenses.' }
};
export const CONFIDENCE = {
  declare: 'Déclaré par l’auteur à partir de volumes et de durées fournis, non audité par un tiers',
  hypothese: 'Hypothèse de volume ou de fréquence, non mesurée'
};

// Taux horaire utilisé pour toutes les valorisations. Sa composition n'est documentée nulle part dans le dépôt.
export const RATE = { value: ANNUAL_RATE, unit: '€/h', basis: 'Taux horaire de référence fourni par l’auteur', composition: null, status: 'À documenter : salaire chargé, frais généraux et périmètre retenu' };
export const WORKING_DAYS = ANNUAL_DAYS;

// Compléments par ligne de gain : périmètre, source, hypothèses. Les natures découlent du drapeau « estimated » de annual-gains.js.
const META = {
  finance: { project: 'projet-finance', scope: 'Suivi financier ABE Sud Île-de-France, quatre flux Power Automate', source: 'Durée et fréquence indiquées par l’auteur', assumptions: ['Un point financier manuel de 25 minutes par jour travaillé', 'Aucun traitement manuel résiduel déduit'] },
  vmvre: { project: 'projet-vmvre', scope: 'Rapports de vérification électrique (VRE) traités par la machine virtuelle', source: 'Durée et volume indiqués par l’auteur', assumptions: ['30 minutes économisées par rapport', 'Même volume que Reporteur Q18 et Extracteur VRE : les trois outils agissent sur des tâches distinctes d’un même rapport'] },
  moteur44: { project: 'projet-moteur44', scope: 'Report SharePoint vers Excel des mêmes rapports VRE', source: 'Durée et volume indiqués par l’auteur', assumptions: ['15 minutes économisées par rapport', 'Tâche distincte de celle de la machine virtuelle, à confirmer par un chronométrage'] },
  vre: { project: 'projet-vre', scope: 'Comptage complet des équipements des mêmes rapports VRE', source: 'Durée et volume indiqués par l’auteur', assumptions: ['25 minutes de comptage manuel évitées par rapport', 'Capacité théorique : le comptage complet n’était auparavant pas réalisé'] },
  powerbi: { project: 'projet-powerbi', scope: 'Plans de prévention traités par la chaîne PP & MOSO', source: 'Durées et volumes indiqués par l’auteur', assumptions: ['15 à 20 minutes par plan, 400 à 500 plans par an', 'La chaîne des PP n’est pas comptée séparément pour éviter un double comptage'] },
  'pp-consultation': { project: 'projet-powerbi', scope: 'Consultations de plans par les utilisateurs du portail', source: 'Estimation de l’auteur', assumptions: ['40 consultations par jour, 10 minutes gagnées chacune', 'Fréquence supposée, non relevée sur des journaux d’usage'] },
  gares: { project: 'projet-gares', scope: 'Consultations du rapport Gares prioritaires', source: 'Estimation de l’auteur', assumptions: ['20 à 30 consultations par jour, 10 à 15 minutes gagnées chacune', 'Fréquence supposée, non relevée sur des journaux d’usage'] }
};

const PERIOD = 'Année de référence 2026, projection annuelle';
export const INDICATORS = ANNUAL_GAINS.flatMap((r) => {
  const m = META[r.id];
  const common = { project: m.project, gainId: r.id, period: PERIOD, verifiedOn: null, scope: m.scope, source: m.source, assumptions: m.assumptions, confidence: r.estimated ? 'hypothese' : 'declare', method: r.basis };
  return [
    { ...common, id: `${r.id}.heures`, label: 'Temps libéré par an', unit: 'h/an', min: r.minHours, max: r.maxHours, nature: r.estimated ? 'estimation' : 'capacite',
      formula: 'Temps annuel libéré = gain de temps par opération × nombre d’opérations concernées par an' },
    { ...common, id: `${r.id}.valorisation`, label: 'Valorisation du temps libéré', unit: '€/an', min: r.minMoney, max: r.maxMoney, nature: r.estimated ? 'estimation' : 'capacite',
      formula: `Valorisation = temps libéré × ${RATE.value} €/h. Temps valorisé, pas de dépense évitée.`, assumptions: [...m.assumptions, `Taux horaire de ${RATE.value} €/h : ${RATE.status}`] }
  ];
});

// Aucune économie budgétaire n'est constatée dans les données du dépôt : la catégorie reste vide et le dit.
export const BUDGET_SAVINGS = INDICATORS.filter((i) => i.nature === 'budget');
export const byNature = (n) => INDICATORS.filter((i) => i.nature === n);
