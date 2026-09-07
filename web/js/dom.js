/** Drobne narzędzia do budowania DOM-u. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Element.append() zamienia null na tekst "null" – ta wersja pomija puste dzieci. */
export const append = (node, ...kids) => {
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) node.append(k);
  return node;
};

export const h = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) n.append(k.nodeType ? k : String(k));
  return n;
};

export const clear = (node) => { node.textContent = ''; return node; };
