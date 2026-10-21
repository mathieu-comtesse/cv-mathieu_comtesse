// Page Gains : la tirelire des gains annuels et son explicatif « Effet cascade » (code d'origine du site, js/home.js).
import './footer.js';
import './navfx.js';

import('../js/home.js?v=cv-light-v21').then((m) => m.initAnnualGains()).catch((e) => console.warn('tirelire indisponible', e));
