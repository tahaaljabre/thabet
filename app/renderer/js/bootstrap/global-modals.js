import { getAddPartnerModalTemplate } from '../templates/add-partner-modal.js';
import { sanitizeTemplate } from '../core/dom.js';

const root = document.getElementById('global-modals-root');
if (root) root.innerHTML = sanitizeTemplate(getAddPartnerModalTemplate());
