// ============================================================================
// Global graph modal
// ----------------------------------------------------------------------------
// Opened from the "Graph" row in the dock's account panel, or with Ctrl/⌘ + G.
// The <dialog> lives in nav.html, outside .singlePage, so SPA navigation never
// replaces it. d3 + graph.js are loaded on first open by drawModalGraph()
// (defined in head.html), which reuses the link/content data fetched for the page.
// ============================================================================
(function () {
  var dialog, body, simulation, opener, token = 0, resizeTimer;

  function stop() {
    if (simulation && simulation.stop) simulation.stop();
    simulation = null;
  }

  function draw() {
    var mine = ++token;
    stop();
    body.textContent = "";
    if (typeof drawModalGraph !== "function") return;
    drawModalGraph(body, { onNavigate: close })
      .then(function (sim) {
        // Closed (or redrawn) while d3 / the data were still loading: discard.
        if (mine !== token || !dialog.open) {
          if (sim && sim.stop) sim.stop();
          return;
        }
        simulation = sim;
      })
      .catch(function () {});
  }

  function open() {
    if (!dialog || dialog.open) return;
    opener = document.activeElement;
    window.dispatchEvent(new Event("dock:close")); // fold the dock menu away first
    dialog.showModal();
    draw();
  }

  function close() {
    if (!dialog || !dialog.open) return;
    dialog.close();
  }

  // Runs for every way of closing: button, Esc, backdrop, node click, navigation.
  function onClosed() {
    token++;
    stop();
    body.textContent = "";
    // The opener may be a row inside a collapsed panel; hand focus to its trigger instead.
    var target = opener;
    if (target && target.closest) {
      var drop = target.closest(".dropup");
      if (drop) target = drop.querySelector(".dropup-btn");
    }
    if (target && document.contains(target) && target.focus) target.focus();
    opener = null;
  }

  function setup() {
    dialog = document.getElementById("graph-modal");
    body = document.getElementById("graph-modal-container");
    if (!dialog || !body || typeof dialog.showModal !== "function") return;

    dialog.addEventListener("close", onClosed);

    // Backdrop click: the dialog element itself is the target only outside its box.
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog || (e.target.closest && e.target.closest("[data-graph-close]"))) close();
    });

    var btn = document.getElementById("graph-btn");
    if (btn) btn.addEventListener("click", open);

    // Capture phase: util.js calls preventDefault() on every Escape, which would
    // otherwise stop the dialog's own Esc-to-close.
    document.addEventListener(
      "keydown",
      function (e) {
        if (e.key === "Escape" && dialog.open) {
          e.preventDefault();
          close();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === "g" || e.key === "G" || e.code === "KeyG")) {
          e.preventDefault(); // also suppresses the browser's "find next"
          if (dialog.open) close();
          else open();
        }
      },
      true
    );

    window.addEventListener("million:navigate", close);
    window.addEventListener("popstate", close);

    // Keep the graph sized to the dialog on rotate / resize.
    window.addEventListener("resize", function () {
      if (!dialog.open) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(draw, 250);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
