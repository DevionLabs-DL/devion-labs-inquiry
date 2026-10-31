/**
 * Accessible form field renderers.
 *
 * Conventions (WCAG 2.2 AA target):
 * - Every control has a programmatic label; groups use fieldset/legend.
 * - Help and error text are linked with aria-describedby.
 * - Errors set aria-invalid and are announced via the step's error summary.
 * - Required fields carry `required` plus a visible marker.
 */
import { el, domId } from './dom.js';
import { STRINGS } from './strings.js';
import { toggleInArray } from './questionnaire.js';

function marker(required) {
  return required
    ? el('span', { class: 'dvn-req', 'aria-hidden': 'true', title: STRINGS.required }, '*')
    : el('span', { class: 'dvn-opt' }, ` (${STRINGS.optional.toLowerCase()})`);
}

function describedBy(key, help) {
  return [help ? domId(key, 'help') : null, domId(key, 'error')].filter(Boolean).join(' ');
}

function helpText(key, help) {
  return help ? el('p', { class: 'dvn-help', id: domId(key, 'help') }, help) : null;
}

function errorSlot(key) {
  return el('p', { class: 'dvn-error', id: domId(key, 'error'), hidden: true });
}

/** Radio or checkbox group. */
export function renderChoiceGroup({ key, type, label, required, help, options, value, onChange, layout = 'list', extra = null }) {
  const selected = type === 'checkbox' ? (Array.isArray(value) ? value : []) : value;
  const items = options.map((o) => {
    const inputId = domId(key, o.id);
    const isChecked = type === 'checkbox' ? selected.includes(o.id) : selected === o.id;
    const input = el('input', {
      type,
      id: inputId,
      name: domId(key),
      value: o.id,
      checked: isChecked,
      class: 'dvn-choice__input',
      on: {
        change: (e) => {
          if (type === 'checkbox') {
            // Read the live DOM state (in option order) instead of the value
            // captured at render time, so rapid toggles never go stale.
            const group = e.target.closest('.dvn-choices');
            const values = group
              ? Array.from(group.querySelectorAll('input[type="checkbox"]:checked'), (i) => i.value)
              : toggleInArray(selected, o.id, e.target.checked);
            onChange(values);
          } else onChange(o.id);
        },
      },
    });
    return el(
      'label',
      { class: 'dvn-choice', for: inputId },
      input,
      el('span', { class: 'dvn-choice__mark', 'aria-hidden': 'true' }),
      el('span', { class: 'dvn-choice__text' }, o.label, o.hint ? el('span', { class: 'dvn-choice__hint' }, o.hint) : null),
    );
  });

  return el(
    'fieldset',
    {
      class: ['dvn-field', 'dvn-fieldset'],
      id: domId(key, 'field'),
      'data-field': key,
      'aria-describedby': describedBy(key, help),
      'aria-required': required && type === 'radio' ? 'true' : undefined,
    },
    el('legend', { class: 'dvn-label' }, label, marker(required)),
    helpText(key, help),
    el('div', { class: ['dvn-choices', layout === 'grid' ? 'dvn-choices--grid' : null] }, items),
    extra,
    errorSlot(key),
  );
}

export function renderSelect({ key, label, required, help, options, value, onChange }) {
  const id = domId(key);
  const select = el(
    'select',
    {
      id,
      class: 'dvn-input dvn-select',
      required,
      'aria-describedby': describedBy(key, help),
      on: { change: (e) => onChange(e.target.value) },
    },
    el('option', { value: '', selected: !value }, STRINGS.selectPlaceholder),
    options.map((o) => el('option', { value: o.id, selected: value === o.id }, o.label)),
  );
  return el(
    'div',
    { class: 'dvn-field', id: domId(key, 'field'), 'data-field': key },
    el('label', { class: 'dvn-label', for: id }, label, marker(required)),
    helpText(key, help),
    select,
    errorSlot(key),
  );
}

export function renderInput({
  key,
  label,
  required,
  help,
  type = 'text',
  value,
  onInput,
  onBlur,
  maxLength,
  autocomplete,
  attrs = {},
}) {
  const id = domId(key);
  const input = el('input', {
    id,
    type,
    class: 'dvn-input',
    value: value || '',
    required,
    maxlength: maxLength,
    autocomplete: autocomplete || 'off',
    spellcheck: type === 'text' ? undefined : 'false',
    'aria-describedby': describedBy(key, help),
    ...attrs,
    on: {
      input: (e) => onInput(e.target.value),
      ...(type === 'date' ? { change: (e) => onInput(e.target.value) } : {}),
      blur: () => onBlur && onBlur(key),
    },
  });
  return el(
    'div',
    { class: 'dvn-field', id: domId(key, 'field'), 'data-field': key },
    el('label', { class: 'dvn-label', for: id }, label, marker(required)),
    helpText(key, help),
    input,
    errorSlot(key),
  );
}

export function renderTextarea({ key, label, required, help, value, onInput, onBlur, maxLength, rows = 4 }) {
  const id = domId(key);
  const counterId = domId(key, 'count');
  const counter = el('span', { class: 'dvn-counter', id: counterId, 'aria-live': 'off' }, `${(value || '').length} / ${maxLength}`);
  const textarea = el(
    'textarea',
    {
      id,
      class: 'dvn-input dvn-textarea',
      rows,
      required,
      maxlength: maxLength,
      'aria-describedby': [describedBy(key, help), counterId].join(' '),
      on: {
        input: (e) => {
          counter.textContent = `${e.target.value.length} / ${maxLength}`;
          onInput(e.target.value);
        },
        blur: () => onBlur && onBlur(key),
      },
    },
  );
  textarea.value = value || '';
  return el(
    'div',
    { class: 'dvn-field', id: domId(key, 'field'), 'data-field': key },
    el('label', { class: 'dvn-label', for: id }, label, marker(required)),
    helpText(key, help),
    textarea,
    el('div', { class: 'dvn-field__meta' }, counter),
    errorSlot(key),
  );
}

/** Single checkbox (flexibility, privacy acknowledgement). `label` may contain nodes. */
export function renderCheckbox({ key, label, required, checked, onChange }) {
  const id = domId(key);
  return el(
    'div',
    { class: ['dvn-field', 'dvn-field--checkbox'], id: domId(key, 'field'), 'data-field': key },
    el(
      'label',
      { class: 'dvn-choice dvn-choice--single', for: id },
      el('input', {
        type: 'checkbox',
        id,
        class: 'dvn-choice__input',
        checked,
        required,
        'aria-describedby': domId(key, 'error'),
        on: { change: (e) => onChange(e.target.checked) },
      }),
      el('span', { class: 'dvn-choice__mark', 'aria-hidden': 'true' }),
      el('span', { class: 'dvn-choice__text' }, label, required ? marker(true) : null),
    ),
    errorSlot(key),
  );
}

/** Show or clear the error for one field (no re-render, focus is preserved). */
export function setFieldError(root, key, message) {
  const container = root.querySelector(`#${domId(key, 'field')}`);
  if (!container) return;
  const errorEl = container.querySelector(`#${domId(key, 'error')}`);
  const controls = container.querySelectorAll('input, select, textarea');
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    container.classList.add('dvn-field--invalid');
    controls.forEach((c) => c.setAttribute('aria-invalid', 'true'));
  } else {
    errorEl.textContent = '';
    errorEl.hidden = true;
    container.classList.remove('dvn-field--invalid');
    controls.forEach((c) => c.removeAttribute('aria-invalid'));
  }
}

export function focusField(root, key) {
  const container = root.querySelector(`#${domId(key, 'field')}`);
  if (!container) return false;
  const target = container.querySelector('input:not([type="hidden"]), select, textarea');
  if (!target) return false;
  target.focus();
  if (typeof container.scrollIntoView === 'function') container.scrollIntoView({ block: 'center', behavior: 'smooth' });
  return true;
}
