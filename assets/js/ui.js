// ============================================================================
// Sidebar / dock UI
// ----------------------------------------------------------------------------
// Reader mode, TOC collapse and TOC scroll spy. Every entry point is
// re-runnable because the content lives inside the SPA container and is
// replaced on navigation. (The dock nav itself sits outside that container and
// is wired up by js/nav.js.)
// ============================================================================

const initReaderMode = () => {
  const root = document.documentElement
  const buttons = document.querySelectorAll(".readermode")

  const reflect = () => {
    const on = root.getAttribute("reader-mode") === "on"
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", on ? "true" : "false")
      button.classList.toggle("is-active", on)
    })
  }

  try {
    if (localStorage.getItem("reader-mode") === "on") {
      root.setAttribute("reader-mode", "on")
    } else {
      root.removeAttribute("reader-mode")
    }
  } catch (err) {
    /* localStorage unavailable */
  }

  buttons.forEach((button) => {
    if (button.dataset.bound) return
    button.dataset.bound = "true"
    button.addEventListener("click", () => {
      const on = root.getAttribute("reader-mode") === "on"
      if (on) {
        root.removeAttribute("reader-mode")
      } else {
        root.setAttribute("reader-mode", "on")
      }
      try {
        localStorage.setItem("reader-mode", on ? "off" : "on")
      } catch (err) {
        /* ignore */
      }
      reflect()
      // Reader mode adds/removes the sidebar from the layout, which changes the
      // graph container's width — redraw it so the SVG matches.
      if (typeof window.renderGraph === "function") window.renderGraph()
    })
  })

  reflect()
}

const initTocCollapse = () => {
  const header = document.querySelector(".toc .toc-header")
  const content = document.querySelector(".toc .toc-content")
  if (!header || !content || header.dataset.bound) return
  header.dataset.bound = "true"
  header.addEventListener("click", () => {
    const collapsed = header.classList.toggle("collapsed")
    content.classList.toggle("collapsed", collapsed)
    header.setAttribute("aria-expanded", collapsed ? "false" : "true")
  })
}

const initTocScrollSpy = () => {
  const links = Array.from(document.querySelectorAll("ul.toc-content a[data-for]"))
  if (links.length === 0) return

  const headings = links
    .map((link) => document.getElementById(link.dataset.for))
    .filter(Boolean)

  const mark = () => {
    let current = headings.length > 0 ? headings[0].id : null
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= 120) {
        current = heading.id
      }
    }
    links.forEach((link) => {
      link.classList.toggle("in-view", link.dataset.for === current)
    })
  }

  mark()
  window.removeEventListener("scroll", window.__quartzTocSpy)
  window.__quartzTocSpy = mark
  window.addEventListener("scroll", mark, { passive: true })
}

// Single entry point called on first load and after every SPA navigation.
const initUI = () => {
  initReaderMode()
  initTocCollapse()
  initTocScrollSpy()
  if (typeof window.bindDarkmode === "function") window.bindDarkmode()
}
