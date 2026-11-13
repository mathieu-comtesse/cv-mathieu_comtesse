// Page Gains : la tirelire des gains annuels et son explicatif « Effet cascade » (code d'origine du site, js/home.js).
import './footer.js';
import './navfx.js';
import './tabview.js?v=gains-20261023';

import { initGainsDashboard } from '../js/gains-dashboard.js?v=fall26-int2';
import { initGainsTable } from '../js/gains-table.js?v=ind-20261101';
initGainsDashboard();
initGainsTable();
