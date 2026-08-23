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

    var loginOpts = [];
    bar.querySelectorAll('.eeKvNm a').forEach(function (a) {
      var t = a.querySelector('.gFhZha, .qi-adm-sub-title');
      var s = a.querySelector('.FnAiJ, .qi-adm-sub-sub');
      loginOpts.push({
        h: a.getAttribute('href') || '#',
        t: (t ? t.textContent : a.textContent).replace(/[›»]/g, '').replace(/\s+/g, ' ').trim(),
        s: s ? s.textContent.replace(/\s+/g, ' ').trim() : ''
      });
    });
    if (!loginOpts.length) {
      loginOpts = [
        { h: '/Baas-internet-banking', t: 'BaaS', s: 'Internet Banking' },
        { h: '/Risk-Solutions', t: 'Risk Solutions', s: 'Onboarding e antifraude' },
        { h: '/QI-Sign', t: 'QI Sign', s: 'Assinatura eletrônica' },
        { h: '/area-gestor/', t: 'Área do gestor', s: 'Central de acessos' },
        { h: '/Administracao-e-Custodia', t: 'Área do investidor', s: 'Cadastro e portal' }
      ];
    }

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
    html += '<button class="qi-drawer-login" type="button" aria-expanded="false">Login<span class="qi-login-caret"></span></button>';
    html += '<div class="qi-login-sub">';
    loginOpts.forEach(function (o) {
      html += '<a class="qi-login-opt" href="' + o.h + '">' +
        '<span class="qi-login-opt-t">' + o.t + '</span>' +
        (o.s ? '<span class="qi-login-opt-s">' + o.s + '</span>' : '') +
        '</a>';
    });
    html += '</div>';
    drawer.innerHTML = html;

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    var savedScroll = 0;
    function open() {
      savedScroll = window.scrollY || window.pageYOffset || 0;
      drawer.classList.add('open');
      backdrop.classList.add('open');
      burger.classList.add('open');
      document.body.style.position = 'fixed';
      document.body.style.top = -savedScroll + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    }
    function close() {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      burger.classList.remove('open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, savedScroll);
    }
    burger.addEventListener('click', function () {
      drawer.classList.contains('open') ? close() : open();
    });
    backdrop.addEventListener('click', close);
    drawer.querySelector('.qi-drawer-close').addEventListener('click', close);

    var loginBtn = drawer.querySelector('.qi-drawer-login');
    var loginSub = drawer.querySelector('.qi-login-sub');
    loginBtn.addEventListener('click', function () {
      var isOpen = loginSub.classList.toggle('open');
      loginBtn.classList.toggle('open', isOpen);
      loginBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
