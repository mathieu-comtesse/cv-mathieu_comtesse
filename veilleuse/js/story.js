// Textes du jeu. Voix : la veilleuse parle au porteur, au tutoiement.
export const TITLE='LIMEN';
export const PROLOGUE=[
  'Il pleut depuis avant les noms.',
  'Quinze pierres dressées traversent le pays, de la forêt jusqu’à la mer. Elles étaient allumées, autrefois.',
  'Tu portes la veilleuse. Elle ne contient qu’une braise. C’est assez.'
];
export const REGIONS={
  forest:{title:'Averse',sub:'I',
    enter:['La pluie éteint tout ce qu’elle touche. Cherche les grands arbres, ils retiennent l’eau.','Les foyers rechargent ta flamme. Les stèles la réclament.'],
    gateOpen:'La porte du nord s’ouvre. Quelqu’un a marché ici avant toi.',
    gateLocked:(s,r,n)=>`La porte reste scellée. Stèles allumées : ${s.have}/${s.need}. Souvenirs : ${r}/${n}.`},
  crystal:{title:'Prisme',sub:'II',
    enter:['Ici la flamme ne s’éteint pas. C’est la lumière qu’il faut apprendre à guider.','Allume un prisme, puis tourne les miroirs jusqu’à ce que le faisceau trouve sa stèle.'],
    gateOpen:'Les cristaux se taisent. Le chemin vers la mer est ouvert.',
    gateLocked:(s,r,n)=>`La porte reste scellée. Stèles éveillées : ${s.have}/${s.need}. Souvenirs : ${r}/${n}.`},
  shore:{title:'Étale',sub:'III',
    enter:['La mer respire. Quand elle se retire, l’estran devient un chemin.','L’eau profonde éteint la flamme. Surveille la marée.'],
    gateOpen:'La grande arche s’illumine. Elle t’attend.',
    gateLocked:(s,r,n)=>`L’arche reste sombre. Stèles allumées : ${s.have}/${s.need}. Souvenirs : ${r}/${n}.`}
};
export const FOYER={
  forest:['Un foyer sous la pluie. Ta braise se ravive.','Le feu tient, entre deux averses.','Une pierre noircie par mille veillées. Ta flamme reprend.','Chaleur. Le temps de respirer.','Le dernier foyer avant le marais.','Un foyer au milieu de l’eau. Quelqu’un l’a entretenu.'],
  crystal:['Un foyer de pierre claire. La braise brille un peu plus.','Un feu pour se souvenir du chemin.','Un foyer posé sur la plus haute marche.','La flamme crépite doucement.','Un foyer au bord du vide.'],
  shore:['Un foyer d’épaves. Le sel crépite.','La braise se raccroche au vent marin.','Un foyer qui a vu passer toutes les marées.','Au bout du sable, une dernière chaleur.']
};
export const STELE={
  forest:['Premier feu. Que la pluie apprenne ton nom.','Deuxième feu. Ce qui brûle bas brûle longtemps.','Troisième feu. Les arbres te regardent passer.','Quatrième feu. Plus loin, l’eau ne pardonne pas l’imprudence.','Cinquième feu. Tu as traversé l’orage. Le nord s’ouvre.'],
  crystal:['La lumière cherche toujours un chemin.','Un miroir ne renvoie que ce qu’on lui donne.','Chaque angle est une décision.','Ce qui semblait loin n’était qu’un détour.','Cinquième éveil. Le plateau tout entier s’est mis à briller.'],
  shore:['Sixième feu. La mer l’entend déjà.','Septième feu. L’îlot respire avec la marée.','Huitième feu. Les ruines ne sont pas des tombes.','Neuvième feu. Le sable garde ton passage.','Dixième feu. Il n’en reste qu’un, et c’est toi.']
};
export const RELIC={
  forest:[
    ['Mara, première veilleuse','J’ai compté les gouttes jusqu’à mille, puis j’ai arrêté. La flamme ne s’éteint pas quand on cesse de compter.'],
    ['Le cerf blanc','Il traverse le marais chaque automne. Il ne craint pas la pluie. Il connaît les arbres qui retiennent l’eau.'],
    ['Gravé dans l’écorce','Abritez la flamme, pas vous.'],
    ['Une cabane sans toit','On s’y réchauffait à tour de rôle. Elle n’a pas eu le temps de finir sa phrase.'],
    ['Les pierres dressées','Elles ne tombent pas. Elles attendent qu’on leur rende ce qu’elles ont donné.'],
    ['Message laissé au nord','Si tu lis ceci, tu as déjà marché plus loin que moi. Continue vers le nord, là où l’eau monte aux chevilles.']],
  crystal:[
    ['Miroirs de bonne foi','Les cristaux ne gardent pas la lumière, ils la renvoient. C’est pour cela qu’on leur fait confiance.'],
    ['Tobias','Il a passé trois jours sur un seul prisme. Il disait que la lumière a un chemin, et qu’il suffit de l’écouter tourner.'],
    ['Le silence','Ici le vent n’éteint rien. Le silence, si.'],
    ['La plus haute marche','J’ai laissé ma lanterne là-haut pour voir la plaine entière. Je n’avais jamais vu autant de nuit.'],
    ['Promesse','Chaque faisceau est une promesse qu’on tient à voix basse.'],
    ['Les escaliers','Ils ont été taillés pour des pas plus lents que les nôtres.']],
  shore:[
    ['Juno','Elle comptait les marées au lieu des jours. Elle disait que la mer est une horloge qui ne ment pas.'],
    ['L’empreinte','Le sable garde tes pas une seule marée. Ensuite, il pardonne.'],
    ['Les ruines','On nous a dit que c’étaient des tombes. Ce sont des phares dont on a oublié de parler.'],
    ['Basse mer','J’ai attendu pour traverser. J’ai appris que patienter est aussi une façon d’avancer.'],
    ['Voiles','Au loin, des voiles. Peut-être les nôtres. Peut-être le reflet des cristaux.'],
    ['La dernière pierre','Elle n’est pas la fin. C’est la première d’un autre chemin.']]
};
export const EPILOGUE=[
  'Tu poses la veilleuse au pied de l’arche.',
  'La flamme ne te quitte pas. Elle change de porteur.',
  'Quinze pierres brillent, du premier feu jusqu’à la mer. Quelque chose revient par le large.',
  'Là-bas, sous la pluie, une silhouette cherche la lumière.'
];
export const HINTS={
  move:'Déplace-toi avec ZQSD, WASD ou les flèches. Maj pour courir.',
  cam:'Clique et fais glisser pour tourner la caméra. Molette pour zoomer, R pour pivoter.',
  interact:'E ou Espace pour interagir avec les foyers, les stèles et les miroirs.',
  crouch:'C ou Ctrl : te baisser pour protéger la flamme (plus lent).',
  rain:'La pluie use la flamme. Sous un grand arbre, elle ne bouge plus.',
  tide:'La marée monte et descend. L’eau profonde barre la route et éteint la flamme.',
  mirror:'Interagis avec un miroir pour le tourner. Maj + E pour tourner dans l’autre sens.',
  help:'H : suivre la direction du prochain objectif. M : carte. J : carnet.'
};
