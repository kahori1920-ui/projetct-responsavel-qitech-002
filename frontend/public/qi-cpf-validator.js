(function(){
  if (location.pathname.indexOf('/donaspainel') === 0) return;

  function digitsOnly(v){ return (v||'').replace(/\D+/g, ''); }
  function formatCpf(d){
    d = d.slice(0, 11);
    if (d.length > 9) return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9);
    if (d.length > 6) return d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6);
    if (d.length > 3) return d.slice(0,3)+'.'+d.slice(3);
    return d;
  }
  function isValidCpf(d){
    if (!d || d.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(d)) return false;
    var sum = 0;
    for (var i = 0; i < 9; i++) sum += parseInt(d[i],10) * (10 - i);
    var r = (sum * 10) % 11;
    if (r === 10) r = 0;
    if (r !== parseInt(d[9],10)) return false;
    sum = 0;
    for (var j = 0; j < 10; j++) sum += parseInt(d[j],10) * (11 - j);
    r = (sum * 10) % 11;
    if (r === 10) r = 0;
    return r === parseInt(d[10],10);
  }

  function looksLikeCpfField(input){
    if (!input) return false;
    if (input.type === 'password' || input.type === 'email') return false;
    var bag = ((input.id||'')+' '+(input.name||'')+' '+(input.placeholder||'')+' '+(input.getAttribute('aria-label')||'')).toLowerCase();
    if (/cpf/.test(bag)) return true;
    // Keycloak form: name=username + type=text often is CPF on QI Tech
    if ((input.name === 'username' || input.name === 'login' || input.name === 'cpf') && input.type !== 'email'){
      // Look at the label of this input
      var lbl = '';
      if (input.id){
        var l = document.querySelector('label[for="'+CSS.escape(input.id)+'"]');
        if (l) lbl = (l.textContent || '').toLowerCase();
      }
      if (/cpf/.test(lbl)) return true;
      // Fallback heuristic: page text mentions CPF prominently
      var body = (document.body.textContent || '').slice(0, 2000).toLowerCase();
      if (/cpf/.test(body)) return true;
    }
    return false;
  }

  function ensureErrorEl(input){
    if (input.__qiErrEl && document.body.contains(input.__qiErrEl)) return input.__qiErrEl;
    var el = document.createElement('div');
    el.className = 'qi-cpf-err';
    el.style.cssText = 'display:none;color:#DC2626;font-size:12.5px;line-height:1.3;margin:6px 2px 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;align-items:center;gap:6px;';
    el.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.4" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>CPF inválido</span>';
    // Insert right after the input (sibling) or right after its wrapping parent if needed
    var anchor = input.parentNode.classList && input.parentNode.classList.contains('input-group')
      ? input.parentNode
      : input;
    if (anchor.nextSibling) anchor.parentNode.insertBefore(el, anchor.nextSibling);
    else anchor.parentNode.appendChild(el);
    input.__qiErrEl = el;
    return el;
  }

  function setError(input, msg){
    var el = ensureErrorEl(input);
    if (msg){
      el.querySelector('span').textContent = msg;
      el.style.display = 'flex';
      input.style.borderColor = '#DC2626';
      input.setAttribute('aria-invalid','true');
    } else {
      el.style.display = 'none';
      input.style.borderColor = '';
      input.removeAttribute('aria-invalid');
    }
  }

  function attach(input){
    if (input.__qiCpfBound) return;
    input.__qiCpfBound = true;
    input.setAttribute('inputmode','numeric');
    input.setAttribute('maxlength','14');
    input.setAttribute('autocomplete','off');

    input.addEventListener('input', function(){
      var d = digitsOnly(input.value);
      input.value = formatCpf(d);
      if (d.length === 0){ setError(input, ''); return; }
      if (d.length < 11){ setError(input, ''); return; }
      if (!isValidCpf(d)) setError(input, 'CPF inválido');
      else setError(input, '');
    });
    input.addEventListener('blur', function(){
      var d = digitsOnly(input.value);
      if (d.length > 0 && d.length < 11) setError(input, 'CPF incompleto');
      else if (d.length === 11 && !isValidCpf(d)) setError(input, 'CPF inválido');
      else setError(input, '');
    });
    // Block paste of non-numeric junk
    input.addEventListener('paste', function(e){
      try{
        e.preventDefault();
        var pasted = (e.clipboardData || window.clipboardData).getData('text');
        var d = digitsOnly((input.value||'') + pasted);
        input.value = formatCpf(d);
        input.dispatchEvent(new Event('input', {bubbles:true}));
      }catch(_){}
    });
    // On submit of the parent form, block if invalid
    var form = input.form || input.closest('form');
    if (form && !form.__qiCpfGuard){
      form.__qiCpfGuard = true;
      form.addEventListener('submit', function(ev){
        var d = digitsOnly(input.value);
        if (d.length !== 11 || !isValidCpf(d)){
          ev.preventDefault(); ev.stopImmediatePropagation();
          setError(input, d.length === 0 ? 'Informe seu CPF' : 'CPF inválido');
          input.focus();
          return false;
        }
      }, true);
    }
  }

  function scan(){
    document.querySelectorAll('input[type="text"], input:not([type])').forEach(function(inp){
      if (looksLikeCpfField(inp)) attach(inp);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
  setInterval(scan, 1500);
})();
