// Cursor flashlight for the blueprint-grid background (see custom.scss).
// Tiny on purpose: one passive listener, updates batched with rAF, and it does
// nothing on touch devices or when the visitor prefers reduced motion.
(function () {
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!fine || calm) return

  var root = document.documentElement
  var x = 0, y = 0, queued = false

  function paint() {
    root.style.setProperty("--mx", x + "px")
    root.style.setProperty("--my", y + "px")
    queued = false
  }

  window.addEventListener(
    "pointermove",
    function (e) {
      x = e.clientX
      y = e.clientY
      if (!queued) {
        queued = true
        requestAnimationFrame(paint)
      }
      root.setAttribute("data-bg-glow", "on")
    },
    { passive: true }
  )

  document.addEventListener("mouseleave", function () {
    root.removeAttribute("data-bg-glow")
  })
})()
