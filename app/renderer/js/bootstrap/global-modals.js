import { getAddPartnerModalTemplate } from '../templates/add-partner-modal.js';

const root = document.getElementById('global-modals-root');
if (root) root.innerHTML = getAddPartnerModalTemplate();
