import { C as fromDomNodeToVNode, G as fromStringToDomNode, p as patch } from './render.mjs';

const cache = /* @__PURE__ */ new Map();
const memo = (node) => {
  const key = typeof node === "string" ? node : node instanceof HTMLElement ? node.outerHTML : node.textContent;
  if (cache.has(key)) {
    return cache.get(key);
  } else {
    const vnode = fromDomNodeToVNode(typeof node === "string" ? fromStringToDomNode(node) : node);
    cache.set(key, vnode);
    return vnode;
  }
};

const morph = (newDOMNode, oldDOMNode) => {
  return patch(oldDOMNode, memo(newDOMNode), memo(oldDOMNode));
};

export { memo as a, morph as m };
