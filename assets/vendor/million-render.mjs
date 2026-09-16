const DOM_REF_FIELD = "__m_dom_ref";
const OLD_VNODE_FIELD = "__m_old_vnode";
const NODE_OBJECT_POOL_FIELD = "__m_node_object_pool";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const XML_NS = "http://www.w3.org/2000/xmlns/";
const X_CHAR = 120;
var HookTypes = /* @__PURE__ */ ((HookTypes2) => {
  HookTypes2["CREATE"] = "create";
  HookTypes2["REMOVE"] = "remove";
  HookTypes2["UPDATE"] = "update";
  HookTypes2["DIFF"] = "diff";
  return HookTypes2;
})(HookTypes || {});
var Flags = /* @__PURE__ */ ((Flags2) => {
  Flags2[Flags2["ELEMENT"] = 0] = "ELEMENT";
  Flags2[Flags2["ELEMENT_IGNORE"] = 1] = "ELEMENT_IGNORE";
  Flags2[Flags2["ELEMENT_FORCE_UPDATE"] = 2] = "ELEMENT_FORCE_UPDATE";
  Flags2[Flags2["ELEMENT_SKIP_DRIVERS"] = 3] = "ELEMENT_SKIP_DRIVERS";
  Flags2[Flags2["ELEMENT_NO_CHILDREN"] = 4] = "ELEMENT_NO_CHILDREN";
  Flags2[Flags2["ELEMENT_TEXT_CHILDREN"] = 5] = "ELEMENT_TEXT_CHILDREN";
  Flags2[Flags2["ELEMENT_KEYED_CHILDREN"] = 6] = "ELEMENT_KEYED_CHILDREN";
  Flags2[Flags2["ELEMENT_THUNK"] = 7] = "ELEMENT_THUNK";
  return Flags2;
})(Flags || {});
var EffectTypes = /* @__PURE__ */ ((EffectTypes2) => {
  EffectTypes2[EffectTypes2["CREATE"] = 0] = "CREATE";
  EffectTypes2[EffectTypes2["REMOVE"] = 1] = "REMOVE";
  EffectTypes2[EffectTypes2["REPLACE"] = 2] = "REPLACE";
  EffectTypes2[EffectTypes2["UPDATE"] = 3] = "UPDATE";
  EffectTypes2[EffectTypes2["SET_PROP"] = 4] = "SET_PROP";
  EffectTypes2[EffectTypes2["REMOVE_PROP"] = 5] = "REMOVE_PROP";
  return EffectTypes2;
})(EffectTypes || {});
var DeltaTypes = /* @__PURE__ */ ((DeltaTypes2) => {
  DeltaTypes2[DeltaTypes2["CREATE"] = 0] = "CREATE";
  DeltaTypes2[DeltaTypes2["UPDATE"] = 1] = "UPDATE";
  DeltaTypes2[DeltaTypes2["REMOVE"] = 2] = "REMOVE";
  return DeltaTypes2;
})(DeltaTypes || {});

const createElement = (vnode, attachField = true) => {
  if (vnode === void 0 || vnode === null)
    return document.createComment("");
  if (typeof vnode === "string")
    return document.createTextNode(vnode);
  const el = vnode.props?.ns ? document.createElementNS(vnode.props?.ns, vnode.tag) : document.createElement(vnode.tag);
  if (vnode.props?.ns)
    delete vnode.props.ns;
  if (vnode.props) {
    for (const propName in vnode.props) {
      const propValue = vnode.props[propName];
      if (propName.startsWith("on")) {
        const eventPropName = propName.slice(2).toLowerCase();
        el.addEventListener(eventPropName, propValue);
      } else if (propName.charCodeAt(0) === X_CHAR) {
        if (propName.startsWith("xmlns")) {
          el.setAttributeNS(XML_NS, propName, String(propValue));
        } else if (propName.startsWith("xlink")) {
          el.setAttributeNS(XLINK_NS, "href", String(propValue));
        }
      } else if (propValue !== void 0 && propValue !== null) {
        if (el[propName] !== void 0 && el[propName] !== null && !Reflect.has(el.style, propName) && !(el instanceof SVGElement) && propName in el) {
          el[propName] = propValue;
        } else {
          el.setAttribute(propName, String(propValue));
        }
      }
    }
  }
  if (vnode.children) {
    if (vnode.flag === Flags.ELEMENT_TEXT_CHILDREN) {
      el.textContent = Array.isArray(vnode.children) ? vnode.children?.join("") : vnode.children;
    } else {
      for (let i = 0; i < vnode.children.length; ++i) {
        el.appendChild(createElement(vnode.children[i], false));
      }
    }
  }
  if (vnode.ref)
    vnode.ref.current = el;
  if (attachField)
    el[OLD_VNODE_FIELD] = vnode;
  return el;
};

const effect = (el, effects) => {
  return (type, flush) => {
    effects.push({ el, type, flush });
  };
};
const hook$1 = (el, newVNode, oldVNode) => {
  return (hookName, vnode) => {
    if (!vnode)
      vnode = newVNode;
    if (typeof vnode === "object" && vnode?.hook && vnode.hook[hookName]) {
      if (vnode.hook[hookName](el, newVNode, oldVNode))
        return true;
    }
    return true;
  };
};

const useChildren = (drivers = []) => (el, newVNode, oldVNode, commit = (work) => work(), effects = [], driver) => {
  const queueEffect = effect(el, effects);
  const invokeHook = hook$1(el, newVNode, oldVNode);
  const getData = (element) => ({
    el: element,
    newVNode,
    oldVNode,
    effects,
    commit,
    driver
  });
  const finish = (element) => {
    const data = getData(element);
    for (let i = 0; i < drivers.length; ++i) {
      commit(() => {
        drivers[i](el, newVNode, oldVNode, commit, effects, driver);
      }, data);
    }
    return data;
  };
  const oldVNodeChildren = oldVNode?.children ?? [];
  const newVNodeChildren = newVNode.children;
  const delta = newVNode.delta;
  const diff = (el2, newVNode2, oldVNode2) => el2 ? driver(el2, newVNode2, oldVNode2, commit, effects).effects : effects;
  if (delta) {
    for (let i = 0; i < delta.length; ++i) {
      const [deltaType, deltaPosition] = delta[i];
      const child = el.childNodes.item(deltaPosition);
      if (deltaType === DeltaTypes.CREATE) {
        const newVNodeChild = newVNodeChildren[deltaPosition];
        if (!invokeHook(HookTypes.CREATE, newVNodeChild))
          return finish(el);
        queueEffect(EffectTypes.CREATE, () => el.insertBefore(createElement(newVNodeChild, false), child));
      }
      if (deltaType === DeltaTypes.UPDATE) {
        const newVNodeChild = newVNodeChildren[deltaPosition];
        if (!invokeHook(HookTypes.UPDATE, newVNodeChild))
          return finish(el);
        commit(() => {
          effects = diff(child, newVNodeChild, oldVNodeChildren[deltaPosition]);
        }, getData(child));
      }
      if (deltaType === DeltaTypes.REMOVE) {
        if (!invokeHook(HookTypes.REMOVE, oldVNodeChildren[deltaPosition]))
          return finish(el);
        queueEffect(EffectTypes.REMOVE, () => el.removeChild(child));
      }
    }
    return finish(el);
  }
  if (!newVNodeChildren || newVNode.flag === Flags.ELEMENT_NO_CHILDREN) {
    if (!oldVNodeChildren || !invokeHook(HookTypes.UPDATE, oldVNode))
      return finish(el);
    queueEffect(EffectTypes.REMOVE, () => el.textContent = "");
    return finish(el);
  }
  if (!oldVNodeChildren || oldVNodeChildren?.length === 0) {
    for (let i = 0; i < newVNodeChildren.length; ++i) {
      if (!invokeHook(HookTypes.CREATE, newVNodeChildren[i]))
        continue;
      queueEffect(EffectTypes.CREATE, () => el.appendChild(createElement(newVNodeChildren[i], false)));
    }
    return finish(el);
  }
  if (newVNode.flag === Flags.ELEMENT_KEYED_CHILDREN) {
    if (!el[NODE_OBJECT_POOL_FIELD])
      el[NODE_OBJECT_POOL_FIELD] = /* @__PURE__ */ new Map();
    let oldHead = 0;
    let newHead = 0;
    let oldTail = oldVNodeChildren.length - 1;
    let newTail = newVNodeChildren.length - 1;
    while (oldHead <= oldTail && newHead <= newTail) {
      const oldTailVNode = oldVNodeChildren[oldTail];
      const newTailVNode = newVNodeChildren[newTail];
      const oldHeadVNode = oldVNodeChildren[oldHead];
      const newHeadVNode = newVNodeChildren[newHead];
      if (oldTailVNode.key === newTailVNode.key) {
        oldTail--;
        newTail--;
      } else if (oldHeadVNode.key === newHeadVNode.key) {
        oldHead++;
        newHead++;
      } else if (oldHeadVNode.key === newTailVNode.key) {
        const node = el.childNodes.item(oldHead++);
        const tail = newTail--;
        if (!invokeHook(HookTypes.UPDATE, newTailVNode))
          return finish(el);
        queueEffect(EffectTypes.CREATE, () => el.insertBefore(node, el.childNodes.item(tail).nextSibling));
      } else if (oldTailVNode.key === newHeadVNode.key) {
        const node = el.childNodes.item(oldTail--);
        const head = newHead++;
        if (!invokeHook(HookTypes.UPDATE, newHeadVNode))
          return finish(el);
        queueEffect(EffectTypes.CREATE, () => el.insertBefore(node, el.childNodes.item(head)));
      } else
        break;
    }
    if (oldHead > oldTail) {
      while (newHead <= newTail) {
        const head = newHead++;
        const newHeadVNode = newVNodeChildren[head];
        const cachedNode = el[NODE_OBJECT_POOL_FIELD].get(newHeadVNode.key);
        if (!invokeHook(HookTypes.CREATE, newHeadVNode))
          return finish(el);
        queueEffect(EffectTypes.CREATE, () => el.insertBefore(cachedNode ?? createElement(newHeadVNode, false), el.childNodes.item(head)));
      }
    } else if (newHead > newTail) {
      while (oldHead <= oldTail) {
        const head = oldHead++;
        const node = el.childNodes.item(head);
        const oldHeadVNode = oldVNodeChildren[head];
        el[NODE_OBJECT_POOL_FIELD].set(oldHeadVNode.key, node);
        if (!invokeHook(HookTypes.REMOVE, oldHeadVNode))
          return finish(el);
        queueEffect(EffectTypes.REMOVE, () => el.removeChild(node));
      }
    } else {
      const oldKeyMap = /* @__PURE__ */ new Map();
      for (; oldHead <= oldTail; ) {
        oldKeyMap.set(oldVNodeChildren[oldHead].key, oldHead++);
      }
      while (newHead <= newTail) {
        const head = newHead++;
        const newVNodeChild = newVNodeChildren[head];
        const oldIndex = oldKeyMap.get(newVNodeChild.key);
        if (oldIndex !== void 0) {
          const node = el.childNodes.item(oldIndex);
          if (!invokeHook(HookTypes.UPDATE, newVNodeChildren[head]))
            return finish(el);
          queueEffect(EffectTypes.CREATE, () => el.insertBefore(node, el.childNodes.item(head)));
          oldKeyMap.delete(newVNodeChild.key);
        } else {
          const cachedNode = el[NODE_OBJECT_POOL_FIELD].get(newVNodeChild.key);
          if (!invokeHook(HookTypes.CREATE, newVNodeChild))
            return finish(el);
          queueEffect(EffectTypes.CREATE, () => el.insertBefore(cachedNode ?? createElement(newVNodeChild, false), el.childNodes.item(head)));
        }
      }
      for (const [oldVNodeKey, oldVNodeValue] of oldKeyMap) {
        const node = el.childNodes.item(oldVNodeValue);
        el[NODE_OBJECT_POOL_FIELD].set(oldVNodeKey, node);
        if (!invokeHook(HookTypes.REMOVE, oldVNodeChildren[oldVNodeValue]))
          return finish(el);
        queueEffect(EffectTypes.REMOVE, () => el.removeChild(node));
      }
    }
    return finish(el);
  }
  if (newVNode.flag === Flags.ELEMENT_TEXT_CHILDREN) {
    if (!invokeHook(HookTypes.UPDATE, newVNode))
      return finish(el);
    const oldString = Array.isArray(oldVNode?.children) ? oldVNode?.children.join("") : oldVNode?.children;
    const newString = Array.isArray(newVNode?.children) ? newVNode?.children.join("") : newVNode?.children;
    if (oldString !== newString) {
      queueEffect(EffectTypes.REPLACE, () => el.textContent = newString);
    }
    return finish(el);
  }
  if (oldVNodeChildren && newVNodeChildren) {
    const commonLength = Math.min(oldVNodeChildren.length, newVNodeChildren.length);
    for (let i = commonLength - 1; i >= 0; --i) {
      if (!invokeHook(HookTypes.UPDATE, newVNodeChildren[i]))
        return finish(el);
      commit(() => {
        effects = diff(el.childNodes.item(i), newVNodeChildren[i], oldVNodeChildren[i]);
      }, getData(el));
    }
    if (newVNodeChildren.length > oldVNodeChildren.length) {
      for (let i = commonLength; i < newVNodeChildren.length; ++i) {
        if (!invokeHook(HookTypes.CREATE, newVNodeChildren[i]))
          return finish(el);
        const node = createElement(newVNodeChildren[i], false);
        queueEffect(EffectTypes.CREATE, () => el.appendChild(node));
      }
    } else if (newVNodeChildren.length < oldVNodeChildren.length) {
      for (let i = oldVNodeChildren.length - 1; i >= commonLength; --i) {
        if (!invokeHook(HookTypes.REMOVE, oldVNodeChildren[i]))
          return finish(el);
        queueEffect(EffectTypes.REMOVE, () => el.removeChild(el.childNodes.item(i)));
      }
    }
  } else if (newVNodeChildren) {
    for (let i = 0; i < newVNodeChildren.length; ++i) {
      if (!invokeHook(HookTypes.CREATE, newVNodeChildren[i]))
        return finish(el);
      const node = createElement(newVNodeChildren[i], false);
      queueEffect(EffectTypes.CREATE, () => el.appendChild(node));
    }
  }
  return finish(el);
};

const svg = (vnode) => {
  if (!vnode.props)
    vnode.props = {};
  ns(vnode.tag, vnode.props, vnode.children);
  return vnode;
};
const ns = (tag, props, children) => {
  if (props.className) {
    props.class = props.className;
    props.className = void 0;
  }
  props.ns = "http://www.w3.org/2000/svg";
  if (children && tag !== "foreignObject") {
    for (const child of children) {
      if (typeof child !== "string" && child.props) {
        ns(child.tag, child.props, child.children);
      }
    }
  }
};
const className = (classObject) => Object.keys(classObject).filter((className2) => classObject[className2]).join(" ");
const style = (styleObject) => Object.entries(styleObject).map((style2) => style2.join(":")).join(";");
const kebab = (camelCaseObject) => {
  const kebabCaseObject = {};
  for (const key in camelCaseObject) {
    kebabCaseObject[key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()] = camelCaseObject[key];
  }
  return kebabCaseObject;
};
const Deltas = {
  CREATE: (i = 0) => [DeltaTypes.CREATE, i],
  UPDATE: (i = 0) => [DeltaTypes.UPDATE, i],
  REMOVE: (i = 0) => [DeltaTypes.REMOVE, i]
};
const m = (tag, props, children, flag = Flags.ELEMENT, delta, hook) => {
  let key = void 0;
  let ref = void 0;
  if (props?.key) {
    key = props.key;
    delete props.key;
  }
  if (props?.ref) {
    ref = props.ref;
    delete props.ref;
  }
  if (props?.children) {
    children = props.children;
    delete props.children;
  }
  const velement = {
    tag,
    props,
    children,
    key,
    flag,
    delta,
    hook,
    ref
  };
  return velement.tag.toLowerCase() === "svg" ? svg(velement) : velement;
};
const mergeHooks = (hooksArray) => {
  const mergedHooks = {};
  for (let i = 0; i < hooksArray.length; i++) {
    for (const hook in hooksArray[i]) {
      const oldHook = mergedHooks[hook];
      if (oldHook) {
        mergedHooks[hook] = () => {
          oldHook();
          hooksArray[i][hook]();
        };
      } else {
        mergedHooks[hook] = hooksArray[i][hook];
      }
    }
  }
  return mergedHooks;
};
const thunk = (fn, args) => {
  const vnode = fn(...args);
  if (typeof vnode === "object") {
    vnode.flag = Flags.ELEMENT_THUNK;
    vnode.args = args;
    if (!vnode.hook)
      vnode.hook = {};
    vnode.hook.diff = (_el, newVNode, oldVNode) => {
      if (typeof newVNode === "object" && typeof oldVNode === "object" && newVNode.flag === Flags.ELEMENT_THUNK && oldVNode.flag === Flags.ELEMENT_THUNK) {
        if (oldVNode.args.length === newVNode.args.length) {
          let shouldPatch = false;
          for (let i = 0; i < newVNode.args.length; i++) {
            if (oldVNode.args[i] !== newVNode.args[i])
              shouldPatch = true;
          }
          return shouldPatch;
        }
      }
      return true;
    };
  }
  return vnode;
};

/*! (c) Andrea Giammarchi - ISC */
let state = {
  args: null,
  stack: [],
  i: 0,
  length: 0,
  after: []
};
const umap = (_) => ({
  get: (key) => _.get(key),
  set: (key, value) => (_.set(key, value), value)
});
const hook = (fn) => {
  const stack = [];
  return function hook2() {
    const prev = state;
    const after = [];
    state = {
      hook: hook2,
      args: arguments,
      stack,
      i: 0,
      length: stack.length,
      after
    };
    try {
      return fn.apply(null, arguments);
    } finally {
      state = prev;
      for (let i = 0, { length } = after; i < length; i++)
        after[i]();
    }
  };
};
const updates = umap(/* @__PURE__ */ new WeakMap());
const hookdate = (hook2, ctx, args) => {
  hook2.apply(ctx, args);
};
const defaults = { async: false, always: false };
const getValue = (value, f) => typeof f == "function" ? f(value) : f;
const useReducer = (reducer, value, init, options) => {
  const i = state.i++;
  const { hook: hook2, args, stack, length } = state;
  if (i === length)
    state.length = stack.push({});
  const ref = stack[i];
  ref.args = args;
  if (i === length) {
    const fn = typeof init === "function";
    const { async: asy, always } = (fn ? options : init) || options || defaults;
    ref.$ = fn ? init(value) : getValue(void 0, value);
    ref._ = asy ? updates.get(hook2) || updates.set(hook2, batch()) : hookdate;
    ref.f = (value2) => {
      const $value = reducer(ref.$, value2);
      if (always || ref.$ !== $value) {
        ref.$ = $value;
        ref._(hook2, null, ref.args);
      }
    };
  }
  return [ref.$, ref.f];
};
const useState = (value, options) => useReducer(getValue, value, void 0, options);
const hooks = /* @__PURE__ */ new WeakMap();
const invoke = ({ hook: hook2, args }) => {
  hook2.apply(null, args);
};
const createContext = (value) => {
  const context = { value };
  context.Provider = Provider.bind(context);
  context.Consumer = Consumer.bind(context);
  hooks.set(context, []);
  return context;
};
const useContext = (context) => {
  const { hook: hook2, args } = state;
  const stack = hooks.get(context);
  const info = { hook: hook2, args };
  if (!stack.some(update, info))
    stack.push(info);
  return context.value;
};
function Consumer({ children }) {
  return children[0](this.value);
}
function Provider({ children, value }) {
  if (this.value !== value) {
    this.value = value;
    const context = hooks.get(this);
    if (context.length) {
      invoke(context[context.length - 1]);
    }
  }
  return children;
}
function update({ hook: hook2 }) {
  return hook2 === this.hook;
}
const effects = /* @__PURE__ */ new WeakMap();
const fx = umap(effects);
const stop = () => {
};
const createEffect = (asy) => (effect, guards) => {
  const i = state.i++;
  const { hook: hook2, after, stack, length } = state;
  if (i < length) {
    const info = stack[i];
    const { update: update2, values, stop: stop2 } = info;
    if (!guards || guards.some(different, values)) {
      info.values = guards;
      if (asy)
        stop2(asy);
      const { clean } = info;
      if (clean) {
        info.clean = null;
        clean();
      }
      const invoke2 = () => {
        info.clean = effect();
      };
      if (asy)
        update2(invoke2);
      else
        after.push(invoke2);
    }
  } else {
    const update2 = asy ? batch() : stop;
    const info = { clean: null, update: update2, values: guards, stop };
    state.length = stack.push(info);
    (fx.get(hook2) || fx.set(hook2, [])).push(info);
    const invoke2 = () => {
      info.clean = effect();
    };
    if (asy)
      info.stop = update2(invoke2);
    else
      after.push(invoke2);
  }
};
effects.has.bind(effects);
const useEffect = createEffect(true);
const useLayoutEffect = createEffect(false);
const useMemo = (memo, guards) => {
  const i = state.i++;
  const { stack, length } = state;
  if (i === length)
    state.length = stack.push({ $: memo(), _: guards });
  else if (!guards || guards.some(different, stack[i]._))
    stack[i] = { $: memo(), _: guards };
  return stack[i].$;
};
const useCallback = (fn, guards) => useMemo(() => fn, guards);
const useRef = (value) => {
  const i = state.i++;
  const { stack, length } = state;
  if (i === length)
    state.length = stack.push({ current: value });
  return stack[i];
};
const useTransition = () => {
  return [isPending, startTransition];
};
const useId = () => {
  return useState(crypto.randomUUID())[0];
};
const useDebugValue = (value) => {
  console.log(value);
};
const useDeferredValue = (value) => {
  return value;
};
const useSyncExternalStore = (subscribe, getSnapshot) => {
  const state2 = useState(getSnapshot());
  useEffect(() => {
    subscribe(state2);
  });
  subscribe(state2);
  return state2;
};
const useImperativeHandle = (ref, create) => {
  if (ref?.current) {
    const object = create();
    ref.current = { ...ref.current, ...object };
  }
};
function different(value, i) {
  return value !== this[i];
}

const rootFragmentStyle = { style: "display: contents;" };
const createComponent = (fn, props, key) => {
  let prevRef;
  let prevVNode;
  let prevKey;
  const component = hook(() => {
    const ret = fn(props, key);
    if (!ret)
      return ret;
    const newVNode = Array.isArray(ret) ? h("_", key ? { key, ...rootFragmentStyle } : rootFragmentStyle, ...ret) : ret;
    if (ret.ref)
      prevRef = ret.ref;
    const ref = prevRef ?? { current: void 0 };
    if (!prevRef && newVNode.ref)
      return newVNode;
    if (ref && ref?.current) {
      if (prevKey && newVNode.key) {
        if (prevKey === newVNode.key)
          patch(ref.current, newVNode, prevVNode);
      } else {
        patch(ref.current, newVNode, prevVNode);
      }
    }
    if (!newVNode.ref) {
      newVNode.ref = ref;
      prevRef = ref;
    }
    prevKey = newVNode.key;
    prevVNode = newVNode;
    return newVNode;
  })();
  return component;
};
const createClass = (klass, props) => {
  let prevRef;
  let prevVNode;
  const componentObject = new klass(props, null);
  const rerender = () => {
    const ret = componentObject.render(props);
    if (!ret)
      return ret;
    const newVNode = Array.isArray(ret) ? h("_", rootFragmentStyle, ...ret) : ret;
    if (ret.ref)
      prevRef = ret.ref;
    const ref = prevRef ?? { current: void 0 };
    if (ref && ref?.current) {
      patch(ref.current, newVNode, prevVNode);
    }
    if (newVNode && typeof newVNode === "object")
      newVNode.ref = ref;
    prevRef = ref;
    prevVNode = newVNode;
    return newVNode;
  };
  componentObject.rerender = rerender;
  return rerender();
};
const compat = (jsxFactoryRaw) => {
  return jsxFactoryRaw.bind({ handleFunction: createComponent, handleClass: createClass });
};

const ReactCompat = {
  __proto__: null,
  createComponent: createComponent,
  createClass: createClass,
  compat: compat
};

function jsxRaw(tag, props, key) {
  let children = [];
  if (props) {
    if (props.children) {
      children = Array.isArray(props.children) ? props.children : [props.children];
    }
    props.children = void 0;
    if (key)
      props.key = key;
  }
  return h(tag, props, ...children);
}
const jsx = compat(jsxRaw);
const Fragment = (props) => props?.children;

const normalize = (rawVNode) => {
  if (Array.isArray(rawVNode)) {
    const normalizedChildren = [];
    for (let i = 0; i < rawVNode.length; i++) {
      const ret = normalize(rawVNode[i]);
      if (Array.isArray(ret)) {
        normalizedChildren.push(...ret);
      } else {
        normalizedChildren.push(ret);
      }
    }
    return normalizedChildren;
  } else if (typeof rawVNode === "string" || typeof rawVNode === "number" || typeof rawVNode === "boolean") {
    return String(rawVNode);
  } else {
    return rawVNode;
  }
};
function h(tag, props, ...children) {
  const propsWithChildren = { ...props, children };
  if (tag === Fragment)
    return normalize(children);
  if (tag.prototype?.render) {
    return this?.handleClass ? this.handleClass(tag, propsWithChildren) : tag.render();
  }
  if (typeof tag === "function") {
    return this?.handleFunction ? this.handleFunction(tag, propsWithChildren) : tag(propsWithChildren);
  }
  let flag = Flags.ELEMENT_NO_CHILDREN;
  let delta;
  let hook;
  const normalizedChildren = [];
  if (props) {
    const rawDelta = props.delta;
    if (rawDelta && rawDelta.length) {
      delta = rawDelta;
      props.delta = void 0;
    }
  }
  if (props) {
    const rawHook = props.hook;
    if (rawHook) {
      if (Array.isArray(rawHook))
        hook = mergeHooks(rawHook);
      else
        hook = rawHook;
      props.hook = void 0;
    }
  }
  if (children) {
    const keysInChildren = /* @__PURE__ */ new Set();
    let hasVElementChildren = false;
    flag = Flags.ELEMENT;
    if (children.every((child) => typeof child === "string")) {
      flag = Flags.ELEMENT_TEXT_CHILDREN;
    }
    let childrenLength = 0;
    for (let i = 0; i < children.length; ++i) {
      if (children[i] !== void 0 && children[i] !== null && children[i] !== false && children[i] !== "") {
        const unwrappedChild = normalize(children[i]);
        const subChildren = Array.isArray(unwrappedChild) ? (childrenLength += unwrappedChild.length, unwrappedChild) : (childrenLength++, [unwrappedChild]);
        for (let i2 = 0; i2 < subChildren.length; i2++) {
          if (subChildren[i2] || subChildren[i2] === "") {
            normalizedChildren.push(subChildren[i2]);
            if (typeof subChildren[i2] === "object") {
              hasVElementChildren = true;
              if (typeof subChildren[i2].key === "string" && subChildren[i2].key !== "") {
                keysInChildren.add(subChildren[i2].key);
              }
            }
          }
        }
      }
    }
    if (keysInChildren.size === childrenLength) {
      flag = Flags.ELEMENT_KEYED_CHILDREN;
    }
    if (!hasVElementChildren) {
      flag = Flags.ELEMENT_TEXT_CHILDREN;
    }
  }
  if (props) {
    if (typeof props.flag === "number") {
      flag = props.flag;
      props.flag = void 0;
    }
    if (typeof props.className === "object") {
      props.className = className(props.className);
    }
    if (typeof props.style === "object") {
      const rawStyle = props.style;
      const normalizedStyle = Object.keys(rawStyle).some((key) => /[-A-Z]/gim.test(key)) ? kebab(rawStyle) : rawStyle;
      props.style = style(normalizedStyle);
    }
  }
  return m(tag, props, normalizedChildren, flag, delta, hook);
}

/*! (c) Jason Miller - Apache */
const MODE_SLASH = 0;
const MODE_TEXT = 1;
const MODE_WHITESPACE = 2;
const MODE_TAGNAME = 3;
const MODE_COMMENT = 4;
const MODE_PROP_SET = 5;
const MODE_PROP_APPEND = 6;
const CHILD_APPEND = 0;
const CHILD_RECURSE = 2;
const TAG_SET = 3;
const PROPS_ASSIGN = 4;
const PROP_SET = MODE_PROP_SET;
const PROP_APPEND = MODE_PROP_APPEND;
const CACHES = /* @__PURE__ */ new Map();
const htm = function(statics) {
  let tmp = CACHES.get(this);
  if (!tmp) {
    tmp = /* @__PURE__ */ new Map();
    CACHES.set(this, tmp);
  }
  tmp = evaluate(this, tmp.get(statics) || (tmp.set(statics, tmp = build(statics)), tmp), arguments, []);
  return tmp.length > 1 ? tmp : tmp[0];
};
const html = htm.bind(h);
const treeify = (built, fields) => {
  const _treeify = (built2) => {
    let tag = "";
    let currentProps = null;
    const props = [];
    const children2 = [];
    for (let i = 1; i < built2.length; i++) {
      const type = built2[i++];
      const value = built2[i] ? fields[built2[i++] - 1] : built2[++i];
      if (type === TAG_SET) {
        tag = value;
      } else if (type === PROPS_ASSIGN) {
        props.push(value);
        currentProps = null;
      } else if (type === PROP_SET) {
        if (!currentProps) {
          currentProps = /* @__PURE__ */ Object.create(null);
          props.push(currentProps);
        }
        currentProps[built2[++i]] = [value];
      } else if (type === PROP_APPEND) {
        currentProps[built2[++i]].push(value);
      } else if (type === CHILD_RECURSE) {
        children2.push(_treeify(value));
      } else if (type === CHILD_APPEND) {
        children2.push(value);
      }
    }
    return { tag, props, children: children2 };
  };
  const { children } = _treeify(built);
  return children.length > 1 ? children : children[0];
};
const evaluate = (h2, built, fields, args) => {
  let tmp;
  built[0] = 0;
  for (let i = 1; i < built.length; i++) {
    const type = built[i++];
    const value = built[i] ? (built[0] |= type ? 1 : 2, fields[built[i++]]) : built[++i];
    if (type === TAG_SET) {
      args[0] = value;
    } else if (type === PROPS_ASSIGN) {
      args[1] = Object.assign(args[1] || {}, value);
    } else if (type === PROP_SET) {
      (args[1] = args[1] || {})[built[++i]] = value;
    } else if (type === PROP_APPEND) {
      args[1][built[++i]] += value + "";
    } else if (type) {
      tmp = h2.apply(value, evaluate(h2, value, fields, ["", null]));
      args.push(tmp);
      if (value[0]) {
        built[0] |= 2;
      } else {
        built[i - 2] = CHILD_APPEND;
        built[i] = tmp;
      }
    } else {
      args.push(value);
    }
  }
  return args;
};
const build = function(statics) {
  let mode = MODE_TEXT;
  let buffer = "";
  let quote = "";
  let current = [0];
  let char, propName;
  const commit = (field) => {
    if (mode === MODE_TEXT && (field || (buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, "")))) {
      current.push(CHILD_APPEND, field, buffer);
    } else if (mode === MODE_TAGNAME && (field || buffer)) {
      current.push(TAG_SET, field, buffer);
      mode = MODE_WHITESPACE;
    } else if (mode === MODE_WHITESPACE && buffer === "..." && field) {
      current.push(PROPS_ASSIGN, field, 0);
    } else if (mode === MODE_WHITESPACE && buffer && !field) {
      current.push(PROP_SET, 0, true, buffer);
    } else if (mode >= MODE_PROP_SET) {
      if (buffer || !field && mode === MODE_PROP_SET) {
        current.push(mode, 0, buffer, propName);
        mode = MODE_PROP_APPEND;
      }
      if (field) {
        current.push(mode, field, 0, propName);
        mode = MODE_PROP_APPEND;
      }
    }
    buffer = "";
  };
  for (let i = 0; i < statics.length; i++) {
    if (i) {
      if (mode === MODE_TEXT) {
        commit();
      }
      commit(i);
    }
    for (let j = 0; j < statics[i].length; j++) {
      char = statics[i][j];
      if (mode === MODE_TEXT) {
        if (char === "<") {
          commit();
          current = [current];
          mode = MODE_TAGNAME;
        } else {
          buffer += char;
        }
      } else if (mode === MODE_COMMENT) {
        if (buffer === "--" && char === ">") {
          mode = MODE_TEXT;
          buffer = "";
        } else {
          buffer = char + buffer[0];
        }
      } else if (quote) {
        if (char === quote) {
          quote = "";
        } else {
          buffer += char;
        }
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === ">") {
        commit();
        mode = MODE_TEXT;
      } else if (!mode) ; else if (char === "=") {
        mode = MODE_PROP_SET;
        propName = buffer;
        buffer = "";
      } else if (char === "/" && (mode < MODE_PROP_SET || statics[i][j + 1] === ">")) {
        commit();
        if (mode === MODE_TAGNAME) {
          current = current[0];
        }
        mode = current;
        (current = current[0]).push(CHILD_RECURSE, 0, mode);
        mode = MODE_SLASH;
      } else if (char === " " || char === "	" || char === "\n" || char === "\r") {
        commit();
        mode = MODE_WHITESPACE;
      } else {
        buffer += char;
      }
      if (mode === MODE_TAGNAME && buffer === "!--") {
        mode = MODE_COMMENT;
        current = current[0];
      }
    }
  }
  commit();
  return current;
};

const fromStringToVNode = (htmlString) => {
  return html([htmlString]);
};
const fromDomNodeToVNode = (el) => {
  if (el[OLD_VNODE_FIELD])
    return el[OLD_VNODE_FIELD];
  if (el instanceof Text)
    return String(el.nodeValue);
  if (el instanceof Comment)
    return void 0;
  const props = {};
  const children = new Array(el.children.length).fill(0);
  for (let i = 0; i < el.attributes.length; i++) {
    const { nodeName, nodeValue } = el.attributes[i];
    props[nodeName] = nodeName === "million-flag" ? Flags[nodeName] : nodeValue;
  }
  for (let i = 0; i < el.childNodes.length; i++) {
    children[i] = fromDomNodeToVNode(el.childNodes.item(i));
  }
  const vnode = h(el.tagName.toLowerCase(), props, ...children);
  el[OLD_VNODE_FIELD] = vnode;
  return vnode;
};
const fromStringToDomNode = (html2) => {
  const doc = new DOMParser().parseFromString(`<t>${html2.trim()}</t>`, "text/xml");
  const el = doc.firstChild.firstChild;
  return el;
};
const fromVNodeToString = (vnode) => {
  if (typeof vnode === "string")
    return vnode;
  if (vnode === void 0)
    return "<!-- -->";
  let attributes = "";
  let children = "";
  for (const prop in vnode.props) {
    if (!prop.toLowerCase().startsWith("on")) {
      attributes += ` ${prop}="${vnode.props[prop]}"`;
    }
  }
  if (htmlVoidElements.includes(vnode.tag)) {
    return `<${vnode.tag}${attributes} />`;
  }
  for (const child of vnode.children || []) {
    children += fromVNodeToString(child);
  }
  return `<${vnode.tag}${attributes}>${children}</${vnode.tag}>`;
};
const htmlVoidElements = [
  "area",
  "base",
  "basefont",
  "bgsound",
  "br",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "image",
  "img",
  "input",
  "isindex",
  "keygen",
  "link",
  "menuitem",
  "meta",
  "nextid",
  "param",
  "source",
  "track",
  "wbr"
];

const useNode = (drivers) => {
  const nodeDriver = (el, newVNode, oldVNode, commit = (work) => work(), effects = []) => {
    oldVNode = oldVNode ?? el[OLD_VNODE_FIELD] ?? fromDomNodeToVNode(el);
    const queueEffect = effect(el, effects);
    const invokeHook = hook$1(el, newVNode, oldVNode);
    const finish = (element) => {
      return {
        el: element,
        newVNode,
        oldVNode,
        effects
      };
    };
    if (newVNode === void 0 || newVNode === null) {
      if (!invokeHook(HookTypes.REMOVE, oldVNode))
        return finish(el);
      queueEffect(EffectTypes.REMOVE, () => el.remove());
      return finish(el);
    } else {
      const hasString = typeof oldVNode === "string" || typeof newVNode === "string";
      if (hasString && oldVNode !== newVNode) {
        if (!invokeHook(HookTypes.UPDATE, newVNode))
          return finish(el);
        const newEl = createElement(newVNode, false);
        queueEffect(EffectTypes.REPLACE, () => el.replaceWith(newEl));
        return finish(newEl);
      }
      if (!hasString && typeof oldVNode === "object" && typeof newVNode === "object") {
        if (!invokeHook(HookTypes.DIFF, newVNode))
          return finish(el);
        if (newVNode.flag === Flags.ELEMENT_IGNORE || oldVNode.flag === Flags.ELEMENT_IGNORE) {
          return finish(el);
        }
        if (newVNode.flag === Flags.ELEMENT_FORCE_UPDATE || oldVNode.flag === Flags.ELEMENT_FORCE_UPDATE) {
          const newEl = createElement(newVNode);
          el.replaceWith(newEl);
          return finish(el);
        }
        if (oldVNode.key === void 0 && newVNode.key === void 0 || oldVNode.key !== newVNode?.key) {
          if (oldVNode.tag !== newVNode.tag) {
            if (!invokeHook(HookTypes.UPDATE, newVNode))
              return finish(el);
            const newEl = createElement(newVNode, false);
            queueEffect(EffectTypes.REPLACE, () => el.replaceWith(newEl));
            return finish(newEl);
          }
          if (newVNode.flag !== Flags.ELEMENT_SKIP_DRIVERS) {
            for (let i = 0; i < drivers.length; ++i) {
              commit(() => {
                drivers[i](el, newVNode, oldVNode, commit, effects, nodeDriver);
              }, {
                el,
                newVNode,
                oldVNode,
                effects
              });
            }
          }
        }
      }
      return finish(el);
    }
  };
  return nodeDriver;
};

const updateProp = (el, propName, oldPropValue, newPropValue, effects, invokeHook) => {
  if (oldPropValue === newPropValue)
    return;
  if (!invokeHook(HookTypes.UPDATE))
    return;
  const queueEffect = effect(el, effects);
  if (propName.startsWith("on")) {
    const eventPropName = propName.slice(2).toLowerCase();
    queueEffect(EffectTypes.SET_PROP, () => {
      el.removeEventListener(eventPropName, oldPropValue);
      el.addEventListener(eventPropName, newPropValue);
    });
  } else if (propName.charCodeAt(0) === X_CHAR) {
    if (propName.startsWith("xmlns")) {
      queueEffect(EffectTypes.SET_PROP, () => {
        el.setAttributeNS(XML_NS, propName, String(newPropValue));
      });
    } else if (propName.startsWith("xlink")) {
      queueEffect(EffectTypes.SET_PROP, () => {
        el.setAttributeNS(XLINK_NS, "href", String(newPropValue));
      });
    }
  } else if (el[propName] !== void 0 && el[propName] !== null && !Reflect.has(el.style, propName) && !(el instanceof SVGElement) && propName in el) {
    if (newPropValue) {
      queueEffect(EffectTypes.SET_PROP, () => el[propName] = newPropValue);
    } else {
      queueEffect(EffectTypes.REMOVE_PROP, () => {
        el[propName] = "";
        el.removeAttribute(propName);
        delete el[propName];
      });
    }
  } else if (!newPropValue) {
    queueEffect(EffectTypes.REMOVE_PROP, () => el.removeAttribute(propName));
  } else {
    queueEffect(EffectTypes.SET_PROP, () => el.setAttribute(propName, String(newPropValue)));
  }
};
const useProps = (drivers = []) => (el, newVNode, oldVNode, commit = (work) => work(), effects = []) => {
  const oldProps = oldVNode?.props;
  const newProps = newVNode?.props;
  const invokeHook = hook$1(el, newVNode, oldVNode);
  const data = {
    el,
    newVNode,
    oldVNode,
    effects
  };
  if (oldProps !== newProps) {
    if (oldProps === void 0 || newProps === null) {
      for (const propName in newProps) {
        updateProp(el, propName, void 0, newProps[propName], effects, invokeHook);
      }
    } else if (newProps === void 0 || newProps === null) {
      for (const propName in oldProps) {
        updateProp(el, propName, oldProps[propName], void 0, effects, invokeHook);
      }
    } else {
      let matches = 0;
      for (const propName in oldProps) {
        updateProp(el, propName, oldProps[propName], Reflect.has(newProps, propName) ? (matches++, newProps[propName]) : void 0, effects, invokeHook);
      }
      const keys = Object.keys(newProps);
      for (let i = 0; matches < keys.length && i < keys.length; ++i) {
        const propName = keys[i];
        if (!Reflect.has(oldProps, propName)) {
          updateProp(el, propName, void 0, newProps[propName], effects, invokeHook);
          ++matches;
        }
      }
    }
  }
  for (let i = 0; i < drivers.length; ++i) {
    commit(() => {
      drivers[i](el, newVNode, oldVNode, commit, effects);
    }, data);
  }
  return data;
};

const workQueue = [];
let pending = false;
if (typeof window !== "undefined") {
  window.requestIdleCallback || (window.requestIdleCallback = (callback) => callback());
}
const isPending = () => pending;
const startTransition = (work) => {
  workQueue.push(work);
  if (!pending)
    requestIdleCallback(flushQueue);
};
const flushQueue = (deadline = {
  didTimeout: false,
  timeRemaining: () => Number.MAX_VALUE
}) => {
  pending = true;
  while (!navigator?.scheduling?.isInputPending({ includeContinuous: true }) && deadline.timeRemaining() > 0 && workQueue.length > 0) {
    const work = workQueue.shift();
    if (work)
      work();
  }
  if (workQueue.length > 0)
    requestIdleCallback(flushQueue);
  else
    pending = false;
};
const batch = (limit) => {
  let force;
  let timer;
  let callback;
  const invoke = () => {
    reset();
    callback();
  };
  const reset = () => {
    force = limit || Infinity;
    timer = 0;
  };
  const stop = (flush) => {
    const didStop = !!timer;
    if (didStop) {
      cancelAnimationFrame(timer);
      if (flush)
        invoke();
    }
    return didStop;
  };
  reset();
  return (_callback) => {
    callback = _callback;
    if (!timer) {
      timer = requestAnimationFrame(() => {
        force = limit || Infinity;
        timer = 0;
        callback();
      });
    }
    if (--force < 0)
      stop(true);
    return stop;
  };
};

const diff = useNode([useChildren(), useProps()]);
const patch = (el, newVNode, oldVNode, hook = () => true, effects = []) => {
  const queueEffect = effect(el, effects);
  const commit = (work, data2) => {
    if (hook(data2.el, data2.newVNode, data2.oldVNode))
      work();
  };
  const data = diff(el, newVNode, oldVNode, commit, effects);
  queueEffect(EffectTypes.SET_PROP, () => data.el[OLD_VNODE_FIELD] = newVNode);
  for (let i = 0; i < effects.length; i++) {
    requestAnimationFrame(effects[i].flush);
  }
  return data.el;
};
const render = (parentEl, newVNode, oldVNode, hook) => {
  const el = parentEl[DOM_REF_FIELD];
  if (el) {
    return patch(el, newVNode, oldVNode, hook);
  } else {
    const newEl = createElement(newVNode);
    parentEl.textContent = "";
    parentEl.appendChild(newEl);
    parentEl[DOM_REF_FIELD] = newEl;
    return newEl;
  }
};
const hydrate = (el, vnode, intersect = true) => {
  const update = () => el && patch(el, vnode);
  if (intersect) {
    const io = new IntersectionObserver((entries) => {
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          startTransition(update);
          io.disconnect();
          break;
        }
      }
    });
    io.observe(el);
  } else {
    startTransition(update);
  }
};

export { useRef as $, jsxRaw as A, Fragment as B, fromDomNodeToVNode as C, DeltaTypes as D, EffectTypes as E, Flags as F, fromStringToDomNode as G, htm as H, html as I, treeify as J, evaluate as K, build as L, compat as M, hook as N, OLD_VNODE_FIELD as O, createContext as P, useId as Q, useCallback as R, useContext as S, useDebugValue as T, useDeferredValue as U, useEffect as V, useImperativeHandle as W, useLayoutEffect as X, useMemo as Y, useSyncExternalStore as Z, useReducer as _, DOM_REF_FIELD as a, useState as a0, useTransition as a1, ReactCompat as a2, createComponent as a3, createClass as a4, fromStringToVNode as a5, fromVNodeToString as a6, htmlVoidElements as a7, useNode as b, createElement as c, updateProp as d, useProps as e, className as f, style as g, Deltas as h, mergeHooks as i, diff as j, kebab as k, hydrate as l, m, ns as n, isPending as o, patch as p, startTransition as q, render as r, svg as s, thunk as t, useChildren as u, flushQueue as v, batch as w, normalize as x, h as y, jsx as z };
