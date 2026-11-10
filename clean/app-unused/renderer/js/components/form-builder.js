/**
 * Form builder from field schema.
 */

import { createElement } from '../core/dom.js';

export function buildForm(fields, onSubmit) {
  const form = createElement('form', { class: 'form-builder' });
  fields.forEach((field) => {
    const wrapper = createElement('div', { class: 'form-field' });
    const label = createElement('label', { textContent: field.label });
    label.setAttribute('for', field.name);
    wrapper.appendChild(label);

    let input;
    if (field.type === 'select') {
      input = createElement('select', { name: field.name, id: field.name });
      field.options.forEach((opt) => {
        input.appendChild(createElement('option', { value: opt.value, textContent: opt.label }));
      });
    } else if (field.type === 'textarea') {
      input = createElement('textarea', { name: field.name, id: field.name, rows: field.rows || 3 });
    } else {
      input = createElement('input', { type: field.type || 'text', name: field.name, id: field.name });
    }
    if (field.required) input.required = true;
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.value) input.value = field.value;
    wrapper.appendChild(input);
    form.appendChild(wrapper);
  });

  const submitBtn = createElement('button', { type: 'submit', textContent: 'Save', class: 'btn-primary' });
  form.appendChild(submitBtn);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const values = {};
    formData.forEach((v, k) => values[k] = v);
    onSubmit(values, form);
  });

  return form;
}
