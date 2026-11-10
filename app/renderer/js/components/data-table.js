/**
 * Generic data table component.
 * @param {HTMLElement} container
 * @param {Array<{key:string, label:string, format?:function}>} columns
 * @param {Array<Object>} data
 * @param {Object} options
 * @param {number} options.pageSize
 * @param {function(Object): void} options.onRowClick
 * @param {function(Object): void} options.onDelete
 * @param {function(Object): void} options.onEdit
 */

import { createElement, escapeHtml, clearElement } from '../core/dom.js';

export function renderDataTable(container, columns, data, options = {}) {
  const pageSize = options.pageSize || 50;
  let currentPage = 1;

  function render() {
    clearElement(container);

    const table = createElement('table', { class: 'data-table' });
    const thead = createElement('thead');
    const headerRow = createElement('tr');
    columns.forEach((col) => {
      headerRow.appendChild(createElement('th', { textContent: col.label }));
    });
    if (options.onEdit || options.onDelete) {
      headerRow.appendChild(createElement('th', { textContent: 'Actions' }));
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = createElement('tbody');
    const start = (currentPage - 1) * pageSize;
    const pageData = data.slice(start, start + pageSize);

    pageData.forEach((row) => {
      const tr = createElement('tr');
      if (options.onRowClick) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => options.onRowClick(row));
      }
      columns.forEach((col) => {
        const val = row[col.key];
        const text = col.format ? col.format(val, row) : escapeHtml(val);
        const td = createElement('td');
        if (col.format) td.innerHTML = text; // only allowed when format returns safe HTML
        else td.textContent = text ?? '';
        tr.appendChild(td);
      });

      if (options.onEdit || options.onDelete) {
        const actionsTd = createElement('td');
        if (options.onEdit) {
          const btn = createElement('button', { textContent: 'Edit', class: 'btn-edit' });
          btn.addEventListener('click', (e) => { e.stopPropagation(); options.onEdit(row); });
          actionsTd.appendChild(btn);
        }
        if (options.onDelete) {
          const btn = createElement('button', { textContent: 'Delete', class: 'btn-delete' });
          btn.addEventListener('click', (e) => { e.stopPropagation(); options.onDelete(row); });
          actionsTd.appendChild(btn);
        }
        tr.appendChild(actionsTd);
      }
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
    renderPagination();
  }

  function renderPagination() {
    const totalPages = Math.ceil(data.length / pageSize) || 1;
    const wrapper = createElement('div', { class: 'pagination' });
    const prev = createElement('button', { textContent: '← Prev', disabled: currentPage === 1 });
    prev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; render(); } });
    const next = createElement('button', { textContent: 'Next →', disabled: currentPage === totalPages });
    next.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; render(); } });
    const info = createElement('span', { textContent: `Page ${currentPage} of ${totalPages}` });
    wrapper.appendChild(prev);
    wrapper.appendChild(info);
    wrapper.appendChild(next);
    container.appendChild(wrapper);
  }

  render();
  return {
    refresh(newData) {
      data = newData;
      currentPage = 1;
      render();
    }
  };
}
