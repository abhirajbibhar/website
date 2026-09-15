const userPref = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
const currentTheme = localStorage.getItem('theme') ?? userPref
const syntaxTheme = document.querySelector("#theme-link");

{{ $darkSyntax := resources.Get "styles/_dark_syntax.scss" | css.Sass (dict "outputStyle" "compressed") | resources.Fingerprint "md5" | resources.Minify  }}
{{ $lightSyntax := resources.Get "styles/_light_syntax.scss" | css.Sass (dict "outputStyle" "compressed") | resources.Fingerprint "md5" | resources.Minify  }}

const DARK_SYNTAX = '{{ $darkSyntax.Permalink }}';
const LIGHT_SYNTAX = '{{ $lightSyntax.Permalink }}';

if (currentTheme) {
  document.documentElement.setAttribute('saved-theme', currentTheme);
  if (syntaxTheme) {
    syntaxTheme.href = currentTheme === 'dark' ? DARK_SYNTAX : LIGHT_SYNTAX;
  }
}

const isDark = () => document.documentElement.getAttribute('saved-theme') === 'dark';

// Push the current theme onto every toggle on the page. Called after each SPA
// navigation too, since ui.js re-runs bindDarkmode().
const reflectTheme = () => {
  const toggle = document.querySelector('#theme-toggle');
  if (toggle) toggle.setAttribute('aria-checked', isDark() ? 'true' : 'false');
};

const applyTheme = (theme) => {
  document.documentElement.setAttribute('saved-theme', theme);
  try {
    localStorage.setItem('theme', theme);
  } catch (err) {
    /* localStorage unavailable */
  }
  if (syntaxTheme) {
    syntaxTheme.href = theme === 'dark' ? DARK_SYNTAX : LIGHT_SYNTAX;
  }
  reflectTheme();
};

// Re-runnable: the sidebar widgets are replaced on every SPA navigation, so
// this is called both on first load and from the router's init callback.
window.bindDarkmode = () => {
  // Switch inside the dock nav's account panel.
  const toggle = document.querySelector('#theme-toggle');
  if (toggle && !toggle.dataset.bound) {
    toggle.dataset.bound = 'true';
    toggle.addEventListener('click', () => applyTheme(isDark() ? 'light' : 'dark'));
  }

  reflectTheme();
};

window.addEventListener('DOMContentLoaded', window.bindDarkmode)
