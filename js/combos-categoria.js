/* Bloom Life · Página de categoría de combos
 * Reemplaza la grilla nativa de TN en /elegi-tu-suplemento/combos-bienestar-integral/
 * por una góndola: entrada por objetivo + escalera de tres escalones + card con la
 * fórmula en colores. Todo el copy y los datos viven en data/combos-categoria.json,
 * así que se editan sin republicar el tema.
 *
 * Si el JSON no carga o el DOM del tema cambió, no se toca nada: la grilla nativa
 * sigue en pie. Nunca dejar la página sin productos.
 */
(function () {
  'use strict';
  if (window.__blCombosCat) return;
  window.__blCombosCat = 1;

  var RUTA = /\/combos-bienestar-integral\/?$/;
  if (!RUTA.test(location.pathname)) return;
  // en ?page=2 el pathname no cambia: sin esto se pintaría una copia exacta de la página 1
  if (/[?&]page=/.test(location.search)) return;

  var DATA = 'https://raw.githubusercontent.com/BloomLifeArg/bloomlife-static/main/data/combos-categoria.json';
  var money = function (n) { return '$' + Number(n || 0).toLocaleString('es-AR'); };
  // El JSON se lee de main, donde cualquiera con push escribe. Nada de lo que viene de ahí
  // entra crudo al innerHTML: ni en texto ni —sobre todo— dentro de un atributo.
  // mezcla un hex con blanco: pct 46 = 46 % del color. Se hace acá y no con color-mix() para no
  // depender del soporte del navegador — un fondo que no resuelve deja la escena transparente.
  var mezclar = function (hex, pct) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-f]{6}$/i.test(h)) h = '608B71';
    var f = pct / 100, o = '#';
    for (var i = 0; i < 3; i++) {
      var v = parseInt(h.substr(i * 2, 2), 16);
      var m = Math.round(v * f + 255 * (1 - f));
      o += ('0' + m.toString(16)).slice(-2);
    }
    return o;
  };

  /* El color de cada card es el del ingrediente que ABRE su promesa: una decisión editorial
   * estable, no copy. Vive acá y no en el JSON porque el JSON se lee de main y propaga desigual
   * entre edges — mientras no llega, el color de media página sale mal. Si el JSON trae
   * `principal`, gana el JSON. */
  var PRINCIPAL = {
    270150341: 'cor',     // High Performance
    279852999: 'ash',     // Bye Bye Anxiety
    294585978: 'rsh',     // Deep Sleep
    294591691: 'mln',     // Clarity & Defense
    294593106: 'mln',     // Full Day Stack
    294595560: 'mln',     // Ultimate Balance
    305609431: 'ash',     // Bye Bye Anxiety
    325250064: 'mln',     // All Day Stack
    330540800: 'trm',     // Beauty & Balance
    330540927: 'trm',     // Glory Gummies
    331475056: 'mln',     // All Day Mix
    332298698: 'mln',     // Clear Mind
    339648634: 'trm',     // Glow your Mind
    341180946: 'trm',     // Glow & Go
    341313375: 'mln',     // Fresh Flow
    342427990: 'trm',     // Radiance & Mind
    349316562: 'trm',     // Glow & Regulate
    356749974: 'mln',     // Ultimate Balance Mix
    357970572: 'trm',     // Glow & Energy
    357970722: 'ash',     // Menopause Balance
  };

  var esc = function (v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  /* Los frascos del hero son estructura, no copy: viajan con el JS (pinneado por hash)
   * y no en el JSON. El JSON se lee de main, cuyo CDN propaga desigual entre edges —
   * medido el 2026-08-25: curl recibía 15.021 bytes y el navegador 13.905 del mismo URL,
   * con el caché del cliente deshabilitado. Si el JSON los trae, manda el JSON. */
  var P = 'https://acdn-us.mitiendanube.com/stores/004/969/223/products/';
  var FRASCOS = [
    { img: P + 'glo_frasco_trm_aligned-5c8a6794e8d4bcffeb17852036898521-240-0.png', alt: 'Tremella' },
    { img: P + 'glo_frasco_mlg_aligned-cdf69710d3ae1ba92f17852036974149-240-0.png', alt: 'Melena de León' },
    { img: P + 'glo_frasco_cor_aligned-f687f8835f6b10a31c17852037001289-240-0.png', alt: 'Cordyceps' },
    { img: P + 'glo_frasco_ashg_aligned-81dc67e47c74152bf817852036948664-240-0.png', alt: 'Ashwagandha' },
    { img: P + 'glo_frasco_rsh_aligned-219725eb8c5265ca8017852036922133-240-0.png', alt: 'Reishi' }
  ];
  var PIE = 'Cinco adaptógenos. Todas las combinaciones que necesitás.';


  var CSS = [
    '.bl-cc{--dark:#003845;--gold:#CCA352;--gold-ink:#7E5F2A;--terra:#C4694F;--mid:#608B71;',
    '--sand:#F4F0E8;--card:#fff;--ink:#2A3B40;--muted:#6E736F;--line:rgba(0,56,69,.14);--ok:#4E7C60;',
    "--sans:'Dosis',-apple-system,system-ui,sans-serif;--serif:Georgia,'Times New Roman',serif;",
    'font-family:var(--sans);color:var(--ink);line-height:1.6;text-align:left}',
    '.bl-cc *{box-sizing:border-box}',
    '.bl-cc .in{max-width:1180px;margin:0 auto;padding:0 20px}',
    /* hero */
    '.bl-cc .hero{background:var(--dark);color:#fff;padding:48px 20px 42px;text-align:center;',
'margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);width:100vw}',
    '.bl-cc .hero .k{font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);display:block}',
    '.bl-cc .hero h2{font-family:var(--serif);font-style:italic;font-weight:400;color:#fff;',
    'font-size:clamp(27px,4.4vw,42px);line-height:1.1;margin:12px auto;max-width:17ch;text-wrap:balance}',
    '.bl-cc .hero p{color:rgba(255,255,255,.76);font-family:var(--serif);font-size:15.5px!important;margin:0 auto;max-width:54ch}',
    /* fila de frascos: reemplaza al banner de la categoría */
    '.bl-cc .fila{display:flex;align-items:flex-end;justify-content:center;gap:2px;margin:22px auto 0;max-width:560px}',
    '.bl-cc .fila img{flex:1 1 0;min-width:0;max-width:96px;height:78px;object-fit:contain;object-position:bottom;display:block}',
    '@media(min-width:760px){.bl-cc .fila{gap:6px;max-width:660px}.bl-cc .fila img{max-width:120px;height:104px}}',
    '.bl-cc .hero .pie{font-size:12px!important;letter-spacing:.06em;color:rgba(255,255,255,.6);',
    'margin:12px auto 0;max-width:none;text-align:center}',
    '.bl-cc .goals{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:24px auto 0;max-width:680px}',
    '.bl-cc .goal{font:600 13px var(--sans);color:rgba(255,255,255,.9);background:rgba(255,255,255,.08);',
    'border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:9px 16px;cursor:pointer;',
    'transition:background .16s,border-color .16s,color .16s}',
    '.bl-cc .goal:hover{background:rgba(255,255,255,.16)}',
    '.bl-cc .goal:focus-visible{outline:2px solid var(--gold);outline-offset:2px}',
    '.bl-cc .goal[aria-checked="true"]{background:var(--gold);border-color:var(--gold);color:#003845}',
    '.bl-cc .resumen{font-family:var(--serif);font-style:italic;font-size:21px!important;color:var(--dark);',
    'margin:34px 0 -6px;padding-bottom:14px;border-bottom:1px solid var(--line)}',
    '.bl-cc .resumen[hidden]{display:none}',
    '.bl-cc .aviso{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);',
    'clip-path:inset(50%);white-space:nowrap;margin:0}',
    /* Con filtro, las cuatro grillas se funden en una: si no, cada escalón deja su propia fila
       huérfana. display:contents promueve las cards. El grid se aplica a .escalera y no a .in
       justamente para que la banda de prueba y el cierre queden AFUERA — cuando estaban adentro,
       la banda tomaba una celda de 357px pero se dibujaba a 100vw y tapaba media página. */
    '.bl-cc.filtrado .escalera{display:grid;gap:14px;grid-template-columns:1fr;align-items:start}',
    '@media(min-width:600px){.bl-cc.filtrado .escalera{grid-template-columns:1fr 1fr}}',
    '@media(min-width:960px){.bl-cc.filtrado .escalera{grid-template-columns:repeat(3,1fr)}}',
    '.bl-cc.filtrado .rung,.bl-cc.filtrado .grid{display:contents}',
    '.bl-cc.filtrado .rung[hidden]{display:none}',
    '.bl-cc.filtrado .rh,.bl-cc.filtrado .vacio{display:none}',
    '.bl-cc.filtrado .resumen{grid-column:1/-1}',
    /* escalera */
    '.bl-cc .rung{padding:60px 0 0}',
    '@media(min-width:760px){.bl-cc .rung{padding:88px 0 0}}',
    '.bl-cc .rh{display:flex;align-items:baseline;gap:13px;flex-wrap:wrap;padding-bottom:13px;',
    'border-bottom:1px solid var(--line);margin-bottom:26px}',
    '.bl-cc .rh h3{font-family:var(--serif);font-style:italic;font-weight:400;font-size:25px;line-height:1.15;color:var(--dark);margin:0}',
    '.bl-cc .rh .qty{font-size:11px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--gold-ink);',
    'border:1px solid var(--gold);border-radius:999px;padding:3px 10px;white-space:nowrap}',
    '.bl-cc .rh .nota{font-size:13.5px!important;color:var(--muted);font-variant-numeric:tabular-nums}',
    '@media(min-width:760px){.bl-cc .rh .nota{margin-left:auto;font-size:14px}}',
    '.bl-cc .rung[data-k="top"] .nota{color:var(--gold-ink);font-weight:600}',
    '.bl-cc .grid{display:grid;gap:14px;grid-template-columns:1fr}',
    '@media(min-width:600px){.bl-cc .grid{grid-template-columns:1fr 1fr}}',
    '@media(min-width:960px){.bl-cc .grid{grid-template-columns:repeat(3,1fr)}}',
    /* escena de frascos: los que trae el combo, en abanico */
    /* Un color por card: el del ingrediente que abre su promesa. Antes había una banda por
       ingrediente y con veintitrés cards en pantalla el color se volvía ruido. Las mezclas se
       calculan en JS, así no dependemos de color-mix(). */
    '.bl-cc .escena{position:relative;height:150px;margin:-3px -5px 13px;border-radius:12px;overflow:hidden;',
    'display:flex;align-items:flex-end;justify-content:center;padding:16px 6px 10px;isolation:isolate;',
    'background:var(--tinte)}',
    '.bl-cc .escena img{position:relative;z-index:2;height:auto;width:var(--w);max-height:100%;',
    'object-fit:contain;object-position:bottom;display:block;',
    'filter:drop-shadow(0 9px 14px rgba(0,56,69,.22));',
    'transition:transform .36s cubic-bezier(.22,1.1,.36,1)}',
    '.bl-cc .escena img+img{margin-left:var(--solape)}',
    '@media(min-width:600px){.bl-cc .escena{height:172px}}',
    /* al pasar el cursor, el abanico se abre */
    '.bl-cc .c:hover .escena img{transform:translateY(-4px) translateX(var(--dx))}',
    /* aparición escalonada */
    '.bl-cc .c.pre{opacity:0;transform:translateY(14px)}',
    '.bl-cc .c.dentro{opacity:1;transform:none;transition:opacity .5s ease,transform .5s cubic-bezier(.22,1,.36,1)}',
    '.bl-cc .c.saliendo{opacity:0;transform:scale(.97);transition:opacity .2s ease,transform .2s ease}',
    '.bl-cc .fila img{opacity:0;transform:translateY(10px);animation:blSube .6s cubic-bezier(.22,1,.36,1) forwards}',
    '@keyframes blSube{to{opacity:1;transform:none}}',
    '@media(prefers-reduced-motion:reduce){.bl-cc .c.pre{opacity:1;transform:none}',
    '.bl-cc .fila img{opacity:1;transform:none;animation:none}}',
    /* card */
    '.bl-cc .c{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:17px;',
    'display:flex;flex-direction:column;text-decoration:none;color:inherit;',
    'transition:transform .18s,box-shadow .18s,border-color .18s}',
    '.bl-cc .c:hover{transform:translateY(-3px);box-shadow:0 18px 34px -22px rgba(0,56,69,.42);border-color:var(--mid)}',
    '.bl-cc .c[hidden]{display:none!important}',   /* la card ancha declara display:grid en su media query y con la misma especificidad le ganaba a [hidden]: Glory aparecia en filtros que no le correspondian */
    '.bl-cc .c:focus-visible{outline:3px solid var(--gold);outline-offset:3px}',
    '.bl-cc .ct{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}',
    '@media(max-width:420px){.bl-cc .c h4{font-size:19px}}',
    '.bl-cc .c h4{font-family:var(--serif);font-style:italic;font-weight:400;font-size:21px;',
    'color:var(--dark);margin:0;line-height:1.15}',
    '.bl-cc .fmt{flex:none;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;',
    'border-radius:999px;padding:3px 9px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}',
    '.bl-cc .fmt.mix{border-color:var(--gold);color:var(--gold-ink)}',
    /* la fórmula en colores */
    '.bl-cc .ings{font-size:12.5px!important;color:var(--muted);margin:11px 0 11px;line-height:1.45}',
    '.bl-cc .ings b{color:var(--dark);font-weight:700}',
    '.bl-cc .ings .ing{white-space:nowrap}',
    '.bl-cc .ings i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;',
    'vertical-align:baseline;position:relative;top:0}',
    '.bl-cc .why{font-family:var(--serif);font-size:14.5px!important;color:var(--ink);line-height:1.5;margin:0 0 13px;min-height:44px}',
    '.bl-cc .sold{font-size:11.5px!important;font-weight:700;color:var(--gold-ink);margin:0 0 12px;',
    'display:flex;align-items:flex-start;gap:6px;font-variant-numeric:tabular-nums;line-height:1.4}',
    '.bl-cc .sold:before{content:"";width:5px;height:5px;border-radius:50%;background:var(--gold);flex:none;margin-top:6px}',
    '.bl-cc .cb{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:10px;',
    'padding-top:13px;border-top:1px solid var(--line)}',
    '.bl-cc .amt{font-size:20px;font-weight:700;color:var(--dark);font-variant-numeric:tabular-nums;line-height:1.1;display:block}',
    '.bl-cc .save{display:block;font-size:11.5px;font-weight:600;color:var(--ok);margin-top:3px}',
    '.bl-cc .go{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--sand);',
    'background:var(--dark);border-radius:999px;padding:9px 15px;transition:background .16s;white-space:nowrap}',
    '.bl-cc .c:hover .go{background:var(--mid);color:#fff}',
    '.bl-cc .vacio{grid-column:1/-1;text-align:center;padding:32px 0;color:var(--muted);',
    'font-family:var(--serif);font-style:italic}',
    '.bl-cc .vacio[hidden]{display:none}',
    /* prueba social: rompe el campo arena y es lo único que no dice la marca de sí misma */
    '.bl-cc .prueba{background:var(--dark);color:#fff;margin:88px calc(50% - 50vw) 0;width:100vw;padding:52px 20px 56px}',
    '.bl-cc .prueba .in2{max-width:1180px;margin:0 auto;padding:0 20px}',
    '.bl-cc .prueba .cab{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:28px}',
    '.bl-cc .prueba h3{font-family:var(--serif);font-style:italic;font-weight:400;font-size:27px;',
    'line-height:1.15;color:#fff;margin:0}',
    '.bl-cc .prueba .nota2{font-size:13px!important;color:rgba(255,255,255,.72);margin:0;',
    'font-variant-numeric:tabular-nums}',
    '.bl-cc .prueba .nota2 b{color:var(--gold);font-weight:700}',
    '.bl-cc .citas{display:grid;gap:16px;grid-template-columns:1fr}',
    '@media(min-width:760px){.bl-cc .citas{grid-template-columns:repeat(3,1fr);gap:22px}}',
    '.bl-cc .cita{border-left:2px solid rgba(204,163,82,.5);padding:2px 0 2px 16px}',
    '.bl-cc .cita p{font-family:var(--serif);font-size:15px!important;line-height:1.55;',
    'color:rgba(255,255,255,.92);margin:0 0 10px}',
    '.bl-cc .cita .qui{font-size:11.5px!important;letter-spacing:.05em;color:rgba(255,255,255,.6);margin:0}',
    '.bl-cc .cita .qui b{color:#fff;font-weight:600}',
    '.bl-cc .estrellas{color:var(--gold);font-size:13px;letter-spacing:2px;display:block;margin-bottom:8px}',
    /* El combo de cinco cerraba el escalón solo, con dos huecos al lado, y era el producto
       más caro de la página. Va a lo ancho: llena la fila y le da un cierre a la escalera. */
    '@media(min-width:600px){',
    '.bl-cc .c.ancha{grid-column:1/-1;display:grid;grid-template-columns:1.15fr 1fr;gap:26px;align-items:center;padding:22px}',
    '.bl-cc .c.ancha .escena{margin:0;height:100%;min-height:230px;border-radius:14px}',
    '.bl-cc .c.ancha .cuerpo{display:flex;flex-direction:column;justify-content:center}',
    '.bl-cc .c.ancha h4{font-size:30px}',
    '.bl-cc .c.ancha .why{font-size:16px!important;min-height:0}',
    '.bl-cc .c.ancha .amt{font-size:25px}',
    '}',
    '.bl-cc .c.ancha .cuerpo{min-width:0}',
    /* cierre */
    '.bl-cc .cierre{margin:44px 0 0;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px}',
    '.bl-cc .cierre h3{font-family:var(--serif);font-style:italic;font-weight:400;font-size:22px;line-height:1.15;color:var(--dark);margin:0 0 8px}',
    '.bl-cc .cierre p{font-size:14.5px!important;color:var(--muted);margin:0 0 18px;max-width:62ch}',
    '.bl-cc .x3row{display:grid;gap:10px;grid-template-columns:repeat(2,1fr)}',
    '@media(min-width:700px){.bl-cc .x3row{grid-template-columns:repeat(4,1fr)}}',
    '@media(min-width:1000px){.bl-cc .x3row{grid-template-columns:repeat(7,1fr)}}',
    '.bl-cc .x3{display:flex;flex-direction:column;align-items:center;gap:5px;text-decoration:none;',
    'border:1px solid var(--line);border-radius:12px;padding:12px 8px 13px;background:#fff;',
    'transition:border-color .15s,transform .15s}',
    '.bl-cc .x3:hover{border-color:var(--mid);transform:translateY(-2px)}',
    '.bl-cc .x3 img{width:62px;height:70px;object-fit:contain}',
    '.bl-cc .x3 b{font-size:12.5px;font-weight:600;color:var(--dark);text-align:center;line-height:1.25}',
    '.bl-cc .x3 em{font-size:11px;font-style:normal;color:var(--gold-ink);font-weight:700;font-variant-numeric:tabular-nums}',
    '.bl-cc .x3 span{font-size:10.5px!important;color:#5A5F5B;letter-spacing:.04em;text-transform:uppercase;font-weight:600}',
    '@media(prefers-reduced-motion:reduce){.bl-cc *{transition:none!important}}'
  ].join('');

  function el(t, c, h) {
    var e = document.createElement(t);
    if (c) e.className = c;
    if (h != null) e.innerHTML = h;
    return e;
  }

  function card(c, ING, conVentas, FR) {
    var a = el('a', 'c');
    a.href = '/productos/' + encodeURIComponent(c.handle) + '/';
    a.dataset.goals = (c.objetivos || []).join(' ');
    if (c.ing.length >= 5) a.classList.add('ancha');
    a.setAttribute('aria-label', [c.nombre, String(c.formato || '').toLowerCase(),
      c.ing.length + ' frascos', money(c.precio)].join(', '));
    var caps = c.caps || [];
    var n = c.ing.length;
    // los frascos del combo, abriéndose desde el centro
    // el ancho de cada frasco sale de cuántos son: con 5 y un ancho fijo se cortaban los extremos
    var solape = n >= 4 ? 7 : 11;                       // % que se pisan entre sí
    var ancho = (100 / (n - (n - 1) * solape / 100)).toFixed(2);
    var escena = c.ing.map(function (k, i) {
      var set = (FR || {})[k] || {};
      var src = (caps.indexOf(k) > -1 && set.cap) ? set.cap : set.gom;
      if (!src) return '';
      var medio = (n - 1) / 2;
      var dx = ((i - medio) * (n >= 4 ? 6 : 9)).toFixed(0);
      return '<img src="' + esc(src) + '" alt="" loading="lazy" ' +
             'style="--dx:' + dx + '%">';
    }).join('');
    // el color de la card sale del ingrediente que abre su promesa; si el JSON no lo dice, el primero
    var pri = c.principal || PRINCIPAL[c.id];
    var kPri = (pri && c.ing.indexOf(pri) > -1) ? pri : c.ing[0];
    var base = (ING[kPri] || {}).color || '#608B71';
    var tinte = 'linear-gradient(168deg,' + mezclar(base, 46) + ' 0%,' +
                mezclar(base, 26) + ' 58%,' + mezclar(base, 15) + ' 100%)';

    var nombres = c.ing.map(function (k) {
      var i = ING[k] || {};
      var col = /^#[0-9a-f]{3,8}$/i.test(i.color || '') ? i.color : '#608B71';
      return '<span class="ing"><i style="background:' + col + '"></i>' + esc(i.nombre || k) + '</span>';
    }).join(' · ');
    a.innerHTML =
      (escena ? '<div class="escena" style="--tinte:' + tinte + ';--w:' + ancho + '%;--solape:-' + solape + '%">' + escena + '</div>' : '') +
      '<div class="cuerpo"><div class="ct"><h4>' + esc(c.nombre) + '</h4>' +
      '<span class="fmt' + (c.formato === 'Mixto' ? ' mix' : '') + '">' + esc(c.formato) + '</span></div>' +
      '<p class="ings"><b>' + n + ' frascos</b> &middot; ' + nombres + '</p>' +
      '<p class="why">' + esc(c.why) + '</p>' +
      (conVentas && c.vendidas ? '<p class="sold">' + (parseInt(c.vendidas, 10) || 0) + ' vendidos en 6 meses</p>' : '') +
      '<div class="cb"><span class="amt">' + money(c.precio) + '</span>' +
      '<span class="go">Ver combo</span></div></div>';
    return a;
  }

  function render(cfg, host) {
    var ING = cfg.ingredientes;
    var raiz = el('div', 'bl-cc');

    // hero + chips
    var hero = el('section', 'hero');
    var frascos = (cfg.hero.frascos || FRASCOS).map(function (f) {
      return '<img src="' + esc(f.img) + '" alt="" loading="eager" fetchpriority="high">';
    }).join('');
    hero.innerHTML =
      '<span class="k">' + esc(cfg.hero.kicker) + '</span>' +
      '<h2>' + esc(cfg.hero.titulo) + '</h2>' +
      '<p>' + esc(cfg.hero.bajada) + '</p>' +
      (frascos ? '<div class="fila">' + frascos + '</div>' : '') +
      '<p class="pie">' + esc(cfg.hero.pie || PIE) + '</p>';
    var goals = el('div', 'goals');
    goals.setAttribute('role', 'radiogroup');
    goals.setAttribute('aria-label', 'Filtrar por objetivo');
    cfg.objetivos.forEach(function (o, i) {
      var b = el('button', 'goal', esc(o.t));
      b.type = 'button';
      b.dataset.g = o.k;
      // excluyente, no toggle: uno solo puede estar activo
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
      b.tabIndex = i === 0 ? 0 : -1;      // un solo tab stop, como un radiogroup de verdad
      goals.appendChild(b);
    });
    hero.appendChild(goals);
    raiz.appendChild(hero);

    var wrap = el('div', 'in');
    raiz.appendChild(wrap);
    var escalera = el('div', 'escalera');
    wrap.appendChild(escalera);
    var resumen = el('p', 'resumen');
    resumen.hidden = true;
    escalera.appendChild(resumen);
    var aviso = el('p', 'aviso');            // sólo para lectores de pantalla
    aviso.setAttribute('role', 'status');
    aviso.setAttribute('aria-live', 'polite');
    wrap.appendChild(aviso);

    // los tres más vendidos, en orden
    var top = cfg.combos.filter(function (c) { return c.vendidas > 0; })
                        .sort(function (a, b) { return b.vendidas - a.vendidas; })
                        .slice(0, 3);   // el chip promete tres
    var porEscalon = { '2': [], '3': [], '4': [] };
    cfg.combos.forEach(function (c) {
      if (!c || !c.ing || !c.ing.length) return;        // sin ingredientes no hay card
      var n = c.ing.length;
      var k = n >= 4 ? '4' : (n <= 2 ? '2' : '3');      // un combo de 1 cae en el primer escalón
      porEscalon[k].push(c);
    });

    cfg.bloques.forEach(function (b) {
      var lista = b.k === 'top' ? top : porEscalon[b.k];
      if (!lista || !lista.length) return;
      var sec = el('section', 'rung');
      sec.dataset.k = b.k;
      sec.innerHTML =
        '<div class="rh"><h3>' + esc(b.titulo) + '</h3>' +
        '<span class="qty">' + esc(b.chip) + '</span>' +
        '<span class="nota">' + esc(b.nota) + '</span></div>';
      var g = el('div', 'grid');
      lista.forEach(function (c) {
        // un combo malformado no puede tumbar la página entera: se descarta solo esa card
        try { g.appendChild(card(c, ING, b.k === 'top', cfg.frascos)); } catch (e) {}
      });
      // el destacado no lleva estado vacío: si no hay match, la sección entera se va
      if (b.k !== 'top') g.appendChild(el('p', 'vacio', b.vacio)).hidden = true;
      sec.appendChild(g);
      escalera.appendChild(sec);
    });

    // prueba social: lo único de la página que no dice la marca de sí misma
    if (cfg.prueba && cfg.prueba.citas && cfg.prueba.citas.length) {
      var pr = el('section', 'prueba');
      var citas = cfg.prueba.citas.map(function (q) {
        return '<blockquote class="cita"><span class="estrellas" aria-hidden="true">★★★★★</span>' +
               '<p>“' + esc(q.cita) + '”</p><p class="qui"><b>' + esc(q.nombre) + '</b>' +
               (q.producto ? ' · ' + esc(q.producto) : '') + '</p></blockquote>';
      }).join('');
      pr.innerHTML = '<div class="in2"><div class="cab"><h3>' + esc(cfg.prueba.titulo) + '</h3>' +
        '<p class="nota2"><b>' + esc(cfg.prueba.promedio) + '</b> sobre ' + esc(cfg.prueba.resenas) +
        ' reseñas verificadas</p></div><div class="citas">' + citas + '</div></div>';
      wrap.appendChild(pr);
    }

    // cierre: los packs de 3 meses
    if (cfg.x3 && cfg.x3.length) {
      var ci = el('div', 'cierre');
      ci.innerHTML = '<h3>' + esc(cfg.cierre.titulo) + '</h3><p>' + esc(cfg.cierre.bajada) + '</p>';
      var row = el('div', 'x3row');
      cfg.x3.forEach(function (p) {
        var a = el('a', 'x3');
        a.href = '/productos/' + encodeURIComponent(p.handle) + '/';
        a.innerHTML = '<img src="' + esc(p.img) + '" alt="" loading="lazy">' +
                      '<b>' + esc(p.nombre) + '</b><span>' + esc(p.detalle) + ' · x3</span>' +
                      '<em>' + money(p.precio) + '</em>';
        row.appendChild(a);
      });
      ci.appendChild(row);
      wrap.appendChild(ci);
    }

    host.parentNode.insertBefore(raiz, host);

    // Las cards aparecen al entrar en viewport, escalonadas por fila. Es una mejora, no un
    // requisito: la clase .pre (que las esconde) se pone SOLO si hay IntersectionObserver, y
    // un plazo de seguridad revela todo pase lo que pase. Una card invisible es peor que una
    // card sin animación.
    var cards = [].slice.call(raiz.querySelectorAll('.c'));
    var cols = function () {
      var g = raiz.querySelector('.grid');
      return g ? Math.max(1, Math.round(g.getBoundingClientRect().width /
        (g.firstElementChild ? g.firstElementChild.getBoundingClientRect().width : 1))) : 1;
    };
    var nCols = cols();
    var revelar = function (c, i) {
      c.style.transitionDelay = (nCols > 1 ? (i % nCols) * 70 : 0) + 'ms';
      c.classList.add('dentro');
      c.classList.remove('pre');
    };
    if ('IntersectionObserver' in window) {
      cards.forEach(function (c) { c.classList.add('pre'); });
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) {
          if (!e.isIntersecting) return;
          revelar(e.target, [].indexOf.call(e.target.parentNode.children, e.target));
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px 220px 0px', threshold: 0 });
      cards.forEach(function (c) { io.observe(c); });
      setTimeout(function () {
        cards.forEach(function (c, i) { if (c.classList.contains('pre')) revelar(c, i); });
      }, 2500);
    } else {
      cards.forEach(function (c) { c.classList.add('dentro'); });
    }
    // los frascos del hero entran uno detrás de otro
    [].forEach.call(raiz.querySelectorAll('.fila img'), function (im, i) {
      im.style.animationDelay = (120 + i * 85) + 'ms';
    });

    // filtro por objetivo
    var botones = [].slice.call(raiz.querySelectorAll('.goal'));
    var gen = 0;

    // Al filtrar cambia el largo de la lista y el navegador deja al visitante en un punto
    // arbitrario: puede quedar a mitad de los resultados sin haber visto el primero. Si el
    // arranque quedó por encima de la vista, lo traemos. Si ya se ve, no lo movemos: saltar
    // cuando alguien está mirando los chips es peor que no hacer nada.
    function alInicio(mi) {
      setTimeout(function () {
        if (mi !== gen) return;              // llegó otro click: este ya no manda
        var ancla = raiz.querySelector('.resumen');
        if (!ancla || ancla.hidden) ancla = raiz.querySelector('.escalera') || raiz;
        var techo = 0;                       // lo que tape un header fijo del tema
        [].forEach.call(document.querySelectorAll('header,[class*="header"],[class*="nav"]'), function (h) {
          var pos = getComputedStyle(h).position;
          if (pos !== 'fixed' && pos !== 'sticky') return;
          var r = h.getBoundingClientRect();
          if (r.top <= 1 && r.height > 0 && r.height < 160) techo = Math.max(techo, r.bottom);
        });
        var y = ancla.getBoundingClientRect().top;
        if (y >= techo - 2) return;          // ya está a la vista
        var destino = Math.max(0, (window.pageYOffset || document.documentElement.scrollTop) + y - techo - 12);
        // un smooth de miles de píxeles se hace eterno: de lejos, se salta
        var quieto = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
          || Math.abs(y - techo) > 2500;
        try {
          window.scrollTo({ top: destino, behavior: quieto ? 'auto' : 'smooth' });
        } catch (e) {
          window.scrollTo(0, destino);
        }
      }, 210);                               // después de los 190ms en que salen las cards
    }
    botones.forEach(function (b, i) {
      b.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        var t = botones[(i + d + botones.length) % botones.length];
        t.focus(); t.click();
      });
    });
    botones.forEach(function (b) {
      b.addEventListener('click', function () {
        var mi = ++gen;
        var g = b.dataset.g;
        botones.forEach(function (o) {
          o.setAttribute('aria-checked', String(o === b));
          o.tabIndex = (o === b) ? 0 : -1;
        });

        // qué queda se resuelve sobre los datos, nunca sobre .hidden (que llega 190ms tarde)
        var queda = function (c) {
          return g === 'all' || c.dataset.goals.split(' ').indexOf(g) > -1;
        };
        [].forEach.call(raiz.querySelectorAll('.c'), function (c) {
          if (!queda(c)) {
            if (!c.hidden) {
              c.classList.add('saliendo');
              setTimeout(function () {
                if (mi !== gen) return;            // llegó otro click: este ya no manda
                c.hidden = true;
                c.classList.remove('saliendo');
              }, 190);
            }
          } else {
            c.classList.remove('saliendo');
            if (c.hidden) {
              c.hidden = false;
              c.classList.remove('dentro', 'pre');
              requestAnimationFrame(function () { c.classList.add('dentro'); });
            }
          }
        });

        var total = 0;
        [].forEach.call(raiz.querySelectorAll('.rung'), function (sec) {
          var vivos = [].filter.call(sec.querySelectorAll('.c'), queda).length;
          if (sec.dataset.k !== 'top') total += vivos;
          var v = sec.querySelector('.vacio');
          if (v) v.hidden = true;
          // el destacado no aparece dentro de un filtro: duplicaría cards y el conteo mentiría
          sec.hidden = (vivos === 0) || (g !== 'all' && sec.dataset.k === 'top');
        });

        // Con un objetivo elegido la escalera pierde sentido: es un criterio de navegación, no
        // de resultado. Se colapsan los encabezados y queda una lista, sin filas huérfanas.
        raiz.classList.toggle('filtrado', g !== 'all');
        var etq = (b.textContent || '').toLowerCase();
        var res = raiz.querySelector('.resumen');
        if (res) {
          res.hidden = (g === 'all');
          if (g !== 'all') res.textContent = total + (total === 1 ? ' combo para ' : ' combos para ') + etq;
        }
        var vivo = raiz.querySelector('.aviso');
        if (vivo) vivo.textContent = (g === 'all')
          ? (cards.length + ' combos, todos los objetivos')
          : (total + (total === 1 ? ' combo para ' : ' combos para ') + etq);

        alInicio(mi);
      });
    });
    return raiz;
  }

  function arrancar(cfg) {
    // el contenedor de la grilla nativa; si no está, no tocamos nada
    var host = document.querySelector('.js-product-table, .js-masonry-grid, #product-grid');
    if (!host) {
      var item = document.querySelector('.js-item-product');
      host = item ? item.closest('.row, .grid, [class*="product"]') : null;
    }
    if (!host) return;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    var raiz;
    try {
      raiz = render(cfg, host);
    } catch (e) {
      if (raiz && raiz.parentNode) raiz.parentNode.removeChild(raiz);
      st.remove();
      return; // ante cualquier error, la grilla nativa queda intacta
    }
    // No alcanza con que render() no explote: un JSON válido pero vacío pinta un hero y cero
    // cards, y esconder lo nativo dejaría la categoría sin un solo producto. Se compara contra
    // lo que el tema ya tenía y, si no llegamos, se desarma todo y gana la grilla nativa.
    var pintadas = raiz.querySelectorAll('.c').length;
    var nativas = document.querySelectorAll('.js-item-product').length;
    if (pintadas < Math.max(1, Math.floor(nativas * 0.8))) {
      raiz.parentNode.removeChild(raiz);
      st.remove();
      return;
    }
    // recién ahora se esconde lo nativo
    host.style.display = 'none';
    [].forEach.call(document.querySelectorAll(
      '.js-pagination, .pagination, .js-category-controls, .category-controls, .category-banner'),
      function (n) { n.style.display = 'none'; });
    // la paginación del tema es un div.row sin clase propia: se la reconoce por su texto ("1 / 2")
    var cont = host.parentElement;
    if (cont) {
      [].forEach.call(cont.children, function (n) {
        if (n === host || n.classList.contains('bl-cc')) return;
        var t = (n.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^[\u2190\u2192<>\s]*\d+\s*\/\s*\d+[\u2190\u2192<>\s]*$/.test(t)) n.style.display = 'none';
      });
    }
    // el H1 nativo repetiría lo que ya dice el hero. Se oculta a la vista pero se deja
    // en el DOM: es el H1 de la página y sacarlo del árbol le costaría SEO y lectores.
    [].forEach.call(document.querySelectorAll('h1'), function (h) {
      if (/combos/i.test(h.textContent)) {
        h.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;' +
          'clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap';
      }
    });
  }

  fetch(DATA, { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { arrancar(cfg); });
      } else {
        arrancar(cfg);
      }
    })
    .catch(function () { /* sin datos, la página queda como estaba */ });
})();
