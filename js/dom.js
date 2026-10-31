/**
 * Safe DOM construction helpers.
 *
 * SECURITY: user-supplied text is only ever inserted with textContent / text
 * nodes. innerHTML, insertAdjacentHTML and string-built markup are forbidden
 * in this codebase (enforced by scripts/lint.mjs; Angular Constitution §10.3).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * el('div', { class: 'x', id: 'y', on: { click: fn }, attrs... }, ...children)
 * Children may be strings (rendered as text), nodes, arrays, null or false.
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  applyProps(node, props);
  appendChildren(node, children);
  return node;
}

export function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
  appendChildren(node, children);
  return node;
}

function applyProps(node, props) {
  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'on') {
      Object.entries(value).forEach(([evt, fn]) => node.addEventListener(evt, fn));
    } else if (key === 'class') {
      node.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
    } else if (key === 'text') {
      node.textContent = String(value);
    } else if (key === 'value') {
      node.value = String(value);
    } else if (key === 'checked' || key === 'disabled' || key === 'selected') {
      node[key] = Boolean(value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }
}

function appendChildren(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  }
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Cheap, collision-safe DOM id from a field key. */
export function domId(key, suffix = '') {
  const base = `dvn-${String(key).replace(/[^A-Za-z0-9_-]/g, '-')}`;
  return suffix ? `${base}--${String(suffix).replace(/[^A-Za-z0-9_-]/g, '-')}` : base;
}
