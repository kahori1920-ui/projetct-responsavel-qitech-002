#!/usr/bin/env python3
"""Inject hero animation overlay into the user's HTML file."""

with open('/app/frontend/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

ANIM_CSS = """
<style id="qi-hero-anim">
  /* Hero animation overlay - cycles 3 brand themes (Do seu jeito / Sua Empresa / Sua Marca aqui) */
  .qi-hero-anim-wrap{
    position:absolute;
    right:6%;
    top:14%;
    width:min(34%, 360px);
    height:auto;
    pointer-events:none;
    z-index:5;
    display:flex;
    flex-direction:column;
    gap:14px;
  }
  .qi-card{
    display:flex;
    align-items:center;
    gap:10px;
    background:#ffffff;
    border:1px solid #E6EEF8;
    border-radius:14px;
    padding:10px 14px;
    box-shadow:0 18px 40px -22px rgba(10,32,81,.28), 0 4px 10px -6px rgba(10,32,81,.12);
    font-family:'Plus Jakarta Sans','Inter',system-ui,sans-serif;
    font-weight:700;
    font-size:14px;
    color:#0A2051;
    opacity:.55;
    transform:translateX(6px) scale(.97);
    transition:opacity .5s ease, transform .5s ease, box-shadow .5s ease, border-color .5s ease;
  }
  .qi-card .qi-ic{
    width:30px;height:30px;border-radius:50%;
    display:inline-flex;align-items:center;justify-content:center;
    color:#fff;flex-shrink:0;
    transition:background .5s ease, transform .5s ease;
  }
  .qi-card.t-1 .qi-ic{background:#4FCCED;}
  .qi-card.t-2 .qi-ic{background:#1C49AD;}
  .qi-card.t-3 .qi-ic{background:#FF2F86;}

  .qi-card.qi-active{
    opacity:1;
    transform:translateX(0) scale(1.03);
    border-color:transparent;
    box-shadow:0 24px 50px -22px rgba(28,73,173,.45), 0 8px 18px -8px rgba(28,73,173,.25);
  }
  .qi-card.qi-active .qi-ic{ transform:scale(1.08); }

  /* Phone tint pulse overlay placed over the static hero illustration */
  .qi-phone-tint{
    position:absolute;
    left:46%;
    top:18%;
    width:18%;
    aspect-ratio: 9 / 19;
    border-radius:28px;
    pointer-events:none;
    z-index:4;
    mix-blend-mode:multiply;
    opacity:0;
    transition:background-color 1.1s ease, opacity 1.1s ease;
  }
  .qi-phone-tint.t-1{ background-color:rgba(79,204,237,.18); opacity:1; }
  .qi-phone-tint.t-2{ background-color:rgba(28,73,173,.16); opacity:1; }
  .qi-phone-tint.t-3{ background-color:rgba(255,47,134,.14); opacity:1; }

  /* Soft glow under the active theme */
  .qi-glow{
    position:absolute;
    left:42%;
    top:24%;
    width:26%;
    height:55%;
    border-radius:50%;
    filter:blur(60px);
    opacity:.55;
    pointer-events:none;
    z-index:3;
    transition:background-color 1.1s ease;
  }
  .qi-glow.t-1{ background:#9CE0F2; }
  .qi-glow.t-2{ background:#1C49AD; }
  .qi-glow.t-3{ background:#FF2F86; }

  @media (max-width: 900px){
    .qi-hero-anim-wrap{ right:4%; top:auto; bottom:8%; width:200px; }
    .qi-phone-tint, .qi-glow{ display:none; }
    .qi-card{ font-size:12px; padding:8px 10px; }
    .qi-card .qi-ic{ width:24px; height:24px; }
  }

  @media (prefers-reduced-motion: reduce){
    .qi-card,.qi-phone-tint,.qi-glow{ transition:none !important; }
  }
</style>
"""

OVERLAY_HTML = """
<div class="qi-hero-anim-wrap" aria-hidden="true">
  <div class="qi-card t-1 qi-active" data-theme="1">
    <span class="qi-ic">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/></svg>
    </span>
    <span>Do seu jeito</span>
  </div>
  <div class="qi-card t-2" data-theme="2">
    <span class="qi-ic">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V10M19 21V10M3 10l9-6 9 6"/></svg>
    </span>
    <span>Sua Empresa</span>
  </div>
  <div class="qi-card t-3" data-theme="3">
    <span class="qi-ic">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v17M4 4l12 3-3 5 3 5-12-3"/></svg>
    </span>
    <span>Sua Marca aqui</span>
  </div>
</div>
<div class="qi-glow t-1" aria-hidden="true"></div>
<div class="qi-phone-tint t-1" aria-hidden="true"></div>
"""

ANIM_JS = """
<script id="qi-hero-anim-js">
(function(){
  function start(){
    var section = document.querySelector('section.sc-f8646dbb-0');
    if(!section) return;
    if(getComputedStyle(section).position === 'static'){ section.style.position = 'relative'; }
    if(section.querySelector('.qi-hero-anim-wrap')) return;
    var tpl = document.createElement('div');
    tpl.innerHTML = `__OVERLAY__`;
    while(tpl.firstChild){ section.appendChild(tpl.firstChild); }

    var cards = section.querySelectorAll('.qi-card');
    var tint  = section.querySelector('.qi-phone-tint');
    var glow  = section.querySelector('.qi-glow');
    var i = 0;
    function tick(){
      i = (i + 1) % cards.length;
      cards.forEach(function(c, idx){
        c.classList.toggle('qi-active', idx === i);
      });
      var t = (i + 1);
      if(tint){ tint.className = 'qi-phone-tint t-' + t; }
      if(glow){ glow.className = 'qi-glow t-' + t; }
    }
    setInterval(tick, 2600);
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
</script>
""".replace('__OVERLAY__', OVERLAY_HTML.replace('`', '\\`'))

# Avoid duplicate injection
if 'qi-hero-anim' in html:
    print('Already injected - skipping')
else:
    html = html.replace('</head>', ANIM_CSS + '</head>', 1)
    html = html.replace('</body>', ANIM_JS + '</body>', 1)
    with open('/app/frontend/public/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print('Injected hero animation overlay successfully')
