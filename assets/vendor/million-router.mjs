import { w as batch, p as patch, c as createElement } from './chunks/render.mjs';
import { m as morph } from './chunks/morph.mjs';

const ANIMATION_DURATION = 300;
let interval;
const createProgressBar = (color) => {
  const style = document.createElement("style");
  style.type = "text/css";
  style.textContent = `.million-progress-bar {
    position: fixed;
    display: block;
    top: 0;
    left: 0;
    height: 2px;
    background: ${color};
    z-index: 2147483647;
    transition:
      width ${ANIMATION_DURATION}ms ease-out,
      opacity ${ANIMATION_DURATION / 2}ms ${ANIMATION_DURATION / 2}ms ease-in;
    transform: translate3d(0, 0, 0);
  }`;
  document.head.insertBefore(style, document.head.firstChild);
  const el = document.createElement("div");
  el.className = "million-progress-bar";
  return el;
};
const startTrickle = (el) => {
  const htmlEl = document.documentElement;
  let value = 0;
  el.style.width = "0";
  el.style.opacity = "1";
  htmlEl.insertBefore(el, document.body);
  interval = window.setInterval(() => {
    requestAnimationFrame(() => {
      value += Math.random() / 100;
      el.style.width = `${10 + value * 90}%`;
    });
  }, ANIMATION_DURATION);
};
const stopTrickle = (el) => {
  const htmlEl = document.documentElement;
  clearInterval(interval);
  interval = void 0;
  el.style.width = "100%";
  el.style.opacity = "0";
  setTimeout(() => {
    if (htmlEl.contains(el)) {
      htmlEl.removeChild(el);
    }
  }, ANIMATION_DURATION * 1.5);
};

const setAttribute = (el, attr, base) => {
  el.setAttribute(attr, new URL(el.getAttribute(attr), base).pathname);
};
const normalizeRelativeURLs = (el, base) => {
  const hrefs = el.querySelectorAll('[href^="./"], [href^="../"]');
  const srcs = el.querySelectorAll('[src^="./"], [src^="../"]');
  for (let i = 0; i < hrefs.length; i++) {
    setAttribute(hrefs[i], "href", base);
  }
  for (let i = 0; i < srcs.length; i++) {
    setAttribute(srcs[i], "src", base);
  }
};
const isLocalURL = (href) => {
  try {
    const url = new URL(href);
    if (window.location.origin === url.origin) {
      if (url.pathname === window.location.pathname) {
        return !url.hash;
      }
      return true;
    }
  } catch (err) {
  }
  return false;
};
const getURL = ({ target }) => {
  const a = target.closest("a");
  if (!a || !isLocalURL(a.href))
    return void 0;
  else
    return new URL(a.href);
};

const parser = new DOMParser();
const routeMap = /* @__PURE__ */ new Map();
const controllerMap = /* @__PURE__ */ new Map();
const PROGRESS_BAR_COLOR = getComputedStyle(document.body).getPropertyValue("--million-progress-bar-color");
const progressBar = createProgressBar(PROGRESS_BAR_COLOR || "#0076ff");
let lastUrl;
let applyFunction;
const queueNavigation = batch();
const queuePrefetch = batch();
const setRoute = (path, route) => {
  routeMap.set(path, { ...routeMap.get(path), ...route });
};
const getRoute = (path) => routeMap.get(path);
const createRoute = (vnode, hook = () => true) => ({
  vnode,
  hook
});
const getEl = (el, selector) => {
  return selector ? el.querySelector(selector) : el;
};
const apply = (fn) => {
  applyFunction = fn;
};
const parseContent = (content, url) => {
  const html = parser.parseFromString(content, "text/html");
  normalizeRelativeURLs(html, url);
  if (applyFunction)
    applyFunction(html, url);
  return html;
};
const request = async (url, options) => {
  return fetch(String(url), options).then((res) => res.text()).catch((err) => {
    if (err.name !== "AbortError") {
      window.location.assign(url);
    }
  });
};
const navigate = async (url, selector, opts, goBack = false, scroll = 0) => {
  if (!goBack) {
    history.pushState({}, "", url);
    startTrickle(progressBar);
  }
  lastUrl = url;
  let pendingContent;
  const currentEl = getEl(document.documentElement, selector);
  for (const [path, prefetch2] of controllerMap.entries()) {
    if (path !== url.pathname) {
      prefetch2.controller.abort();
    } else {
      pendingContent = prefetch2.pendingContent;
    }
  }
  controllerMap.clear();
  if (routeMap.has(url.pathname)) {
    const route = routeMap.get(url.pathname);
    if (route.vnode) {
      try {
        patch(currentEl, route.vnode);
      } catch (_err) {
        const el = route.html ? getEl(route.html.documentElement, selector) : createElement(route.vnode);
        currentEl.replaceWith(el);
      }
    } else if (route.html) {
      const newEl = getEl(route.html.documentElement, selector);
      if (selector)
        document.title = route.html.title;
      try {
        morph(newEl, currentEl);
      } catch (_err) {
        currentEl.replaceWith(newEl);
      }
    }
  } else {
    const content = await (pendingContent ?? request(url, opts));
    if (!content)
      return;
    const html = parseContent(content, url);
    setRoute(url.pathname, { html });
    if (selector)
      document.title = html.title;
    const newEl = getEl(html.documentElement, selector);
    try {
      morph(newEl, currentEl);
    } catch (_err) {
      currentEl.replaceWith(newEl);
    }
  }
  const navigateEvent = new CustomEvent("million:navigate", { detail: { url } });
  requestAnimationFrame(() => {
    if (window.location.hash) {
      const anchor = document.querySelector(`[href="${window.location.hash}"]`);
      if (anchor)
        anchor.scrollIntoView();
    } else {
      window.scrollTo({ top: scroll });
    }
    window.dispatchEvent(navigateEvent);
    if (!goBack)
      stopTrickle(progressBar);
  });
};
const router = (selector, routes = {}) => {
  for (const path in routes) {
    setRoute(path, routes[path]);
  }
  if (!routeMap.has(window.location.pathname)) {
    const html = parseContent(document.documentElement.outerHTML, new URL(window.location.href));
    if (applyFunction)
      applyFunction(html, new URL(window.location.href));
    setRoute(window.location.pathname, { html });
  }
  const clickHandler = (event) => {
    const url = getURL(event);
    if (!url)
      return;
    const route = routeMap.get(url.pathname);
    if (route && route.hook && !route.hook(url, route))
      return;
    event.preventDefault();
    try {
      queueNavigation(() => navigate(url, selector));
    } catch (_err) {
      window.location.assign(url);
    }
  };
  const mouseoverHandler = async (event) => {
    const url = getURL(event);
    if (!url)
      return;
    if (routeMap.has(url.pathname))
      return;
    const route = routeMap.get(url.pathname);
    if (route && route.hook && !route.hook(url, route))
      return;
    event.preventDefault();
    queuePrefetch(() => prefetch(url));
  };
  const submitHandler = async (event) => {
    const el = event.target;
    const url = new URL(el.action);
    if (!el.action || !(el instanceof HTMLFormElement))
      return;
    const route = routeMap.get(el.action);
    if (route && route.hook && !route.hook(url, route))
      return;
    event.stopPropagation();
    event.preventDefault();
    const formData = new FormData(el);
    const body = {};
    formData.forEach((value, key) => {
      body[key] = value;
    });
    queueNavigation(() => {
      navigate(url, selector, {
        method: el.method,
        redirect: "follow",
        body: !el.method || el.method.toLowerCase() === "get" ? `?${new URLSearchParams(body)}` : JSON.stringify(body)
      });
    });
  };
  const popstateHandler = () => {
    const url = new URL(window.location.toString());
    if (url.hash && url.pathname === lastUrl?.pathname) {
      lastUrl = url;
      return;
    }
    const route = routeMap.get(url.pathname);
    if (route && route.hook && !route.hook(url, route))
      return;
    try {
      queueNavigation(() => {
        navigate(url, selector, {}, true);
      });
    } catch (_err) {
      window.location.reload();
    }
  };
  window.addEventListener("click", clickHandler);
  window.addEventListener("mouseover", mouseoverHandler);
  window.addEventListener("submit", submitHandler);
  window.addEventListener("popstate", popstateHandler);
  return () => {
    window.removeEventListener("click", clickHandler);
    window.removeEventListener("mouseover", mouseoverHandler);
    window.removeEventListener("submit", submitHandler);
    window.removeEventListener("popstate", popstateHandler);
    routeMap.clear();
    controllerMap.clear();
    lastUrl = void 0;
    stopTrickle(progressBar);
  };
};
const prefetch = async (path) => {
  const url = typeof path === "string" ? new URL(path) : path;
  if (routeMap.has(url.pathname))
    return;
  const controller = new AbortController();
  const pendingContent = request(url, { signal: controller.signal });
  controllerMap.set(url.pathname, { controller, pendingContent });
  const content = await pendingContent;
  controllerMap.delete(url.pathname);
  if (content) {
    const html = parseContent(content, url);
    setRoute(url.pathname, { html });
  }
};

export { apply, createRoute, getEl, getRoute, getURL, isLocalURL, navigate, normalizeRelativeURLs, parseContent, prefetch, queueNavigation, queuePrefetch, request, router, setAttribute, setRoute };
