// Runs before the first paint so the page never flashes the wrong theme or text direction.
(function () {
  try {
    var root = document.documentElement;
    var theme = localStorage.getItem('khedmati.theme');
    var lang = localStorage.getItem('khedmati.lang');
    if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
    if (lang === 'fr') {
      root.lang = 'fr';
      root.dir = 'ltr';
    }
  } catch {
    // Storage can be unavailable (private mode); defaults apply.
  }
})();
