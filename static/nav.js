// ============================================================================
// Drop-up dock navigation
// ----------------------------------------------------------------------------
// Loaded from <head> without `defer`, so binding has to wait for the body.
// The dock is rendered outside the SPA container (#quartz-body), so it is never
// replaced and these listeners only need binding once.
//
// The panels are a disclosure pattern (trigger + panel), not role="menu", so
// focus is never trapped: Tab walks rows normally, the arrow keys are a
// convenience, and Escape closes and hands focus back to the trigger.
// ============================================================================
(function () {
  var ROW_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function rowsOf(panel) {
    return Array.prototype.slice.call(panel.querySelectorAll(ROW_SELECTOR));
  }

  // Shortcut hint on the search row: ⌘K on Apple hardware, Ctrl K elsewhere.
  function labelShortcutHints() {
    var platform =
      (navigator.userAgentData && navigator.userAgentData.platform) ||
      navigator.platform ||
      navigator.userAgent ||
      "";
    var label = /Mac|iPhone|iPad|iPod/i.test(platform) ? "\u2318K" : "Ctrl K";
    Array.prototype.forEach.call(document.querySelectorAll("[data-keyshortcut]"), function (el) {
      el.textContent = label;
    });
  }

  function setup() {
    var dropups = Array.prototype.slice.call(document.querySelectorAll(".dropup"));
    if (!dropups.length) return;

    labelShortcutHints();

    function triggerOf(d) {
      return d.querySelector(".dropup-btn");
    }

    function closePanel(d) {
      var panel = d.querySelector(".dropup-panel");
      // Closing hides the panel from the tab order, which would drop focus on
      // the floor if the user was inside it — hand it back to the trigger.
      var hadFocus = !!(panel && panel.contains(document.activeElement));
      d.setAttribute("data-open", "false");
      var btn = triggerOf(d);
      if (btn) btn.setAttribute("aria-expanded", "false");
      if (hadFocus && btn) btn.focus();
    }

    function closeAll(except) {
      dropups.forEach(function (d) {
        if (d !== except) closePanel(d);
      });
    }

    function openPanel(d) {
      closeAll(d);
      d.setAttribute("data-open", "true");
      var btn = triggerOf(d);
      if (btn) btn.setAttribute("aria-expanded", "true");
    }

    function focusRow(d, atEnd) {
      var panel = d.querySelector(".dropup-panel");
      if (!panel) return;
      var rows = rowsOf(panel);
      if (!rows.length) return;
      (atEnd ? rows[rows.length - 1] : rows[0]).focus();
    }

    dropups.forEach(function (d) {
      var btn = triggerOf(d);
      var panel = d.querySelector(".dropup-panel");
      if (!btn || !panel) return;

      if (!btn.dataset.bound) {
        btn.dataset.bound = "true";

        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (d.getAttribute("data-open") === "true") {
            closePanel(d);
          } else {
            openPanel(d);
          }
        });

        // Arrow keys pull focus into the panel; the click/Enter path leaves it
        // on the trigger, which is the expected disclosure behaviour.
        btn.addEventListener("keydown", function (e) {
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          e.preventDefault();
          openPanel(d);
          focusRow(d, e.key === "ArrowUp");
        });
      }

      // Panel rows move focus among themselves.
      if (!panel.dataset.bound) {
        panel.dataset.bound = "true";

        panel.addEventListener("keydown", function (e) {
          if (["ArrowDown", "ArrowUp", "Home", "End"].indexOf(e.key) === -1) return;
          var rows = rowsOf(panel);
          if (!rows.length) return;
          e.preventDefault();

          var i = rows.indexOf(document.activeElement);
          var next;
          if (e.key === "Home") next = 0;
          else if (e.key === "End") next = rows.length - 1;
          else if (e.key === "ArrowDown") next = i < 0 ? 0 : (i + 1) % rows.length;
          else next = i < 0 ? rows.length - 1 : (i - 1 + rows.length) % rows.length;
          rows[next].focus();
        });

        // Tabbing past the last row should dismiss the panel.
        panel.addEventListener("focusout", function () {
          window.requestAnimationFrame(function () {
            if (!d.contains(document.activeElement)) closePanel(d);
          });
        });
      }

      // Following a menu link swaps the page in place, so the panel has to be
      // dismissed by hand. Everything else in a panel — the theme switch,
      // reader mode, the search trigger — is left open on purpose: those
      // controls don't navigate, and keeping the panel up means the row keeps
      // its focus ring when the search overlay hands focus back.
      Array.prototype.forEach.call(panel.querySelectorAll("a[href]"), function (el) {
        if (el.dataset.closeBound) return;
        el.dataset.closeBound = "true";
        el.addEventListener("click", function () {
          closeAll(null);
        });
      });
    });

    document.addEventListener("click", function (e) {
      // Clicks inside a panel (e.g. the theme switch) shouldn't close the menu.
      if (e.target.closest && e.target.closest(".dropup-panel")) return;
      closeAll(null);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      closeAll(null);
    });

    window.addEventListener("million:navigate", function () {
      closeAll(null);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
