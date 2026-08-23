/* Builds a mobile hamburger + slide-in drawer for the QI Tech navbar.
   No-ops on pages that don't have the main navbar (.iTnPBa). */
(function () {
  function init() {
    var bar = document.querySelector('.iTnPBa');
    if (!bar || document.querySelector('.qi-mobile-burger')) return;

    var links = [];
    var submenuBtn = bar.querySelector('nav.cygJie button');
    if (submenuBtn) {
      var label = '';
      for (var i = 0; i < submenuBtn.childNodes.length; i++) {
        if (submenuBtn.childNodes[i].nodeType === 3) label += submenuBtn.childNodes[i].textContent;
      }
      label = label.trim() || 'Produtos';
      links.push({ t: label, h: '#' });
    }
    bar.querySelectorAll('nav.cygJie > a').forEach(function (a) {
      var txt = a.textContent.trim();
      if (txt) links.push({ t: txt, h: a.getAttribute('href') || '#' });
    });

    var fale = null;
    var dsr = bar.querySelector('.dsRaWb a');
    if (dsr) fale = { t: dsr.textContent.trim(), h: dsr.getAttribute('href') || '#' };

    var burger = document.createElement('button');
    burger.className = 'qi-mobile-burger';
    burger.setAttribute('aria-label', 'Abrir menu');
    burger.innerHTML = '<span></span><span></span><span></span>';
    bar.appendChild(burger);

    var backdrop = document.createElement('div');
    backdrop.className = 'qi-mobile-backdrop';

    var drawer = document.createElement('div');
    drawer.className = 'qi-mobile-drawer';

    var html = '<div class="qi-drawer-head"><strong style="font-size:18px;color:#0a2540">Menu</strong>' +
      '<button class="qi-drawer-close" aria-label="Fechar">&times;</button></div>';
    links.forEach(function (l) {
      html += '<a class="qi-drawer-link" href="' + l.h + '">' + l.t + '</a>';
    });
    if (fale) html += '<a class="qi-drawer-cta" href="' + fale.h + '">' + fale.t + '</a>';
    html += '<a class="qi-drawer-login" href="#">Login</a>';
    drawer.innerHTML = html;

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    function open() {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      burger.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      burger.classList.remove('open');
      document.body.style.overflow = '';
    }
    burger.addEventListener('click', function () {
      drawer.classList.contains('open') ? close() : open();
    });
    backdrop.addEventListener('click', close);
    drawer.querySelector('.qi-drawer-close').addEventListener('click', close);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
