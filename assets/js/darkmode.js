const userPref = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
// localStorage throws when storage is blocked; without a guard the whole script died and
// the theme switch stopped working.
const readTheme = () => { try { return localStorage.getItem('theme') } catch (e) { return null } }
const currentTheme = readTheme() ?? userPref
/* The light syntax theme is inlined in <head>; the dark theme is injected only
   when dark mode is active, instead of shipping a second render-blocking
   stylesheet for every visitor. */
{{ $darkSyntax := resources.Get "styles/_dark_syntax.scss" | css.Sass (dict "outputStyle" "compressed") | resources.Minify }}
const darkSyntaxCss = {{ $darkSyntax.Content | jsonify }};

const applySyntaxTheme = (theme) => {
  const id = "syntax-dark";
  const existing = document.getElementById(id);
  if (theme === "dark") {
    if (!existing) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = darkSyntaxCss;
      document.head.appendChild(style);
    }
  } else if (existing) {
    existing.remove();
  }
};

if (currentTheme) {
  document.documentElement.setAttribute('saved-theme', currentTheme);
  applySyntaxTheme(currentTheme);
}

const applyTheme = (theme) => {
  document.documentElement.setAttribute('saved-theme', theme);
  try { localStorage.setItem('theme', theme) } catch (e) {}
  applySyntaxTheme(theme);

  // Sync the new switch toggle (nav bar)
  const switchEl = document.querySelector('#theme-toggle');
  if (switchEl) {
    switchEl.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
  }
}

const switchTheme = (e) => {
  // Support both old checkbox (#darkmode-toggle) and new switch (#theme-toggle)
  const isDark = e.target.checked || e.target.getAttribute('aria-checked') === 'true';
  applyTheme(isDark ? 'dark' : 'light');
}

const toggleSwitchTheme = () => {
  const current = document.documentElement.getAttribute('saved-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

window.addEventListener('DOMContentLoaded', () => {
  // Legacy darkmode toggle (checkbox)
  const toggleSwitch = document.querySelector('#darkmode-toggle')
  if (toggleSwitch) {
    toggleSwitch.addEventListener('change', switchTheme, false)
    if (currentTheme === 'dark') {
      toggleSwitch.checked = true
    }
  }

  // New nav bar switch toggle
  const navSwitch = document.querySelector('#theme-toggle');
  if (navSwitch) {
    navSwitch.setAttribute('aria-checked', currentTheme === 'dark' ? 'true' : 'false');
    navSwitch.addEventListener('click', () => {
      const isDark = navSwitch.getAttribute('aria-checked') === 'true';
      applyTheme(isDark ? 'light' : 'dark');
    });
  }
})
