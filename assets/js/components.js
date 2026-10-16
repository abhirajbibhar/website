/*
  Behaviour for the carousel and form components.

  Everything is event-delegated on `document` and bound once. The SPA router morphs the DOM
  on navigation (it patches nodes in place rather than reloading), so per-element listeners
  or JS-injected markup would be lost or doubled. The markup the shortcodes render is
  complete on its own; this file only wires it up, and `initCarousels()` (called from
  head.html's render() after every page load / navigation) refreshes its state.
*/

(() => {
  // Guard: if this file is ever evaluated twice, don't bind the listeners twice.
  if (window.__uiComponents) return
  window.__uiComponents = true

  // ── Carousel ───────────────────────────────────────────────
  const carouselReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  // Reads the current geometry of a carousel: which slide is at the start edge, how many fit in
  // view, and whether the track is at either end. Using bounding boxes (not scrollLeft maths)
  // keeps it correct in RTL, where scrollLeft is negative.
  function carouselState(root) {
    const track = root.querySelector(".carousel-track")
    const slides = Array.from(track.querySelectorAll(":scope > [data-carousel-slide]"))
    const n = slides.length
    if (!n) return null

    const rtl = getComputedStyle(track).direction === "rtl"
    const edge = rtl ? "right" : "left"
    const t = track.getBoundingClientRect()
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0
    const slideWidth = slides[0].getBoundingClientRect().width || 1
    const perView = Math.max(1, Math.floor((t.width + gap + 1) / (slideWidth + gap)))
    const pages = Math.max(1, n - perView + 1)

    let active = 0
    let best = Infinity
    slides.forEach((s, i) => {
      const d = Math.abs(s.getBoundingClientRect()[edge] - t[edge])
      if (d < best - 0.5) {
        best = d
        active = i
      }
    })

    const maxScroll = track.scrollWidth - track.clientWidth
    const atStart = Math.abs(track.scrollLeft) < 2
    const atEnd = Math.abs(track.scrollLeft) >= maxScroll - 2
    if (atStart) active = 0
    if (atEnd) active = pages - 1
    active = Math.min(active, pages - 1)

    return { track, slides, n, edge, t, perView, pages, active, atStart, atEnd }
  }

  function updateCarousel(root) {
    const s = carouselState(root)
    if (!s) return
    const controls = root.querySelector(".carousel-controls")
    if (controls) controls.hidden = s.pages <= 1 // nothing to scroll: no controls
    const prev = root.querySelector("[data-carousel-prev]")
    const next = root.querySelector("[data-carousel-next]")
    if (prev) prev.disabled = s.atStart
    if (next) next.disabled = s.atEnd
    root.querySelectorAll("[data-carousel-goto]").forEach((dot) => {
      const i = Number(dot.getAttribute("data-carousel-goto"))
      // With 2 or 3 slides in view the last dots could never become the start slide.
      dot.hidden = i >= s.pages
      if (i === s.active) dot.setAttribute("aria-current", "true")
      else dot.removeAttribute("aria-current")
    })
  }

  function carouselGoTo(root, index) {
    const s = carouselState(root)
    if (!s) return
    const i = Math.max(0, Math.min(index, s.pages - 1))
    // Remember where we're headed while the smooth scroll is in flight, so quick repeated
    // clicks accumulate instead of each one re-reading a half-scrolled position.
    root.__carouselTarget = i
    clearTimeout(root.__carouselTimer)
    root.__carouselTimer = setTimeout(() => (root.__carouselTarget = undefined), 700)
    const delta = s.slides[i].getBoundingClientRect()[s.edge] - s.t[s.edge]
    s.track.scrollBy({ left: delta, behavior: carouselReducedMotion() ? "auto" : "smooth" })
  }

  function initCarousels() {
    document.querySelectorAll("[data-carousel]").forEach(updateCarousel)
  }
  window.initCarousels = initCarousels

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-carousel-prev], [data-carousel-next], [data-carousel-goto]")
    const root = el && el.closest("[data-carousel]")
    if (!root) return
    const s = carouselState(root)
    if (!s) return
    if (el.hasAttribute("data-carousel-prev")) carouselGoTo(root, (root.__carouselTarget ?? s.active) - 1)
    else if (el.hasAttribute("data-carousel-next")) carouselGoTo(root, (root.__carouselTarget ?? s.active) + 1)
    else carouselGoTo(root, Number(el.getAttribute("data-carousel-goto")))
  })

  // Arrow keys / Home / End while the track itself has focus (it is tabindex=0 so keyboard
  // users can scroll it even without the buttons).
  document.addEventListener("keydown", (e) => {
    const track = e.target.closest && e.target.closest(".carousel-track")
    if (!track || e.target !== track || e.altKey || e.ctrlKey || e.metaKey) return
    const root = track.closest("[data-carousel]")
    const s = carouselState(root)
    if (!s) return
    const rtl = s.edge === "right"
    const forward = rtl ? "ArrowLeft" : "ArrowRight"
    const back = rtl ? "ArrowRight" : "ArrowLeft"
    let target = null
    if (e.key === forward) target = (root.__carouselTarget ?? s.active) + 1
    else if (e.key === back) target = (root.__carouselTarget ?? s.active) - 1
    else if (e.key === "Home") target = 0
    else if (e.key === "End") target = s.pages - 1
    if (target === null) return
    e.preventDefault()
    carouselGoTo(root, target)
  })

  // `scroll` doesn't bubble, but it can be caught in the capture phase.
  let carouselFrame = 0
  const pendingCarousels = new Set()
  document.addEventListener(
    "scroll",
    (e) => {
      const track = e.target.nodeType === 1 && e.target.closest(".carousel-track")
      const root = track && track.closest("[data-carousel]")
      if (!root) return
      pendingCarousels.add(root)
      if (carouselFrame) return
      carouselFrame = requestAnimationFrame(() => {
        carouselFrame = 0
        pendingCarousels.forEach(updateCarousel)
        pendingCarousels.clear()
      })
    },
    true,
  )

  let carouselResize = 0
  window.addEventListener("resize", () => {
    cancelAnimationFrame(carouselResize)
    carouselResize = requestAnimationFrame(initCarousels)
  })

  // ── Form ───────────────────────────────────────────────────
  // Submits in place to the endpoint and reports the result in the form's status line. Falls
  // back to the browser's normal POST when JS is off or data-ajax="false".
  document.addEventListener("submit", async (e) => {
    const form = e.target
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute("data-form")) return
    // The SPA router listens for `submit` on window and hijacks every form: it cancels the
    // event and re-sends the data itself as a navigation, which would double-post ours (and
    // break native POSTs). Stop the event here, before it bubbles up to window.
    e.stopPropagation()
    if (form.getAttribute("data-ajax") !== "true" || !form.action) return // native submit
    e.preventDefault()

    const status = form.querySelector("[data-form-status]")
    const button = form.querySelector('[type="submit"]')
    const label = button && button.querySelector("span")
    const original = label ? label.textContent : ""
    const say = (state, text) => {
      if (!status) return
      status.textContent = text
      status.setAttribute("data-state", state)
    }

    // The honeypot is invisible to people; if it has a value a bot filled it. Pretend it worked.
    const trap = form.querySelector('[name="_gotcha"]')
    if (trap && trap.value) {
      say("success", form.dataset.msgSuccess)
      form.reset()
      return
    }

    say("", "")
    form.setAttribute("aria-busy", "true")
    if (button) button.disabled = true
    if (label) label.textContent = form.dataset.msgSending

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(form.action, {
        method: (form.method || "post").toUpperCase(),
        body: new FormData(form),
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
      if (res.ok) {
        say("success", form.dataset.msgSuccess)
        form.reset()
      } else {
        let message = form.dataset.msgError
        try {
          const data = await res.json()
          if (data && data.errors && data.errors[0] && data.errors[0].message) {
            message = data.errors[0].message
          }
        } catch (_) {
          /* not JSON: keep the generic message */
        }
        say("error", message)
      }
    } catch (_) {
      say("error", form.dataset.msgError)
    } finally {
      clearTimeout(timeout)
      form.removeAttribute("aria-busy")
      if (button) button.disabled = false
      if (label) label.textContent = original
    }
  })
})()
