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

  var DATA = 'https://raw.githubusercontent.com/BloomLifeArg/bloomlife-static/main/data/combos-categoria.json';
  var money = function (n) { return '$' + n.toLocaleString('es-AR'); };

  var CSS = [
    '.bl-cc{--dark:#003845;--gold:#CCA352;--gold-ink:#7E5F2A;--terra:#C4694F;--mid:#608B71;',
    '--sand:#F4F0E8;--card:#fff;--ink:#2A3B40;--muted:#6E736F;--line:rgba(0,56,69,.14);--ok:#4E7C60;',
    "--sans:'Dosis',-apple-system,system-ui,sans-serif;--serif:Georgia,'Times New Roman',serif;",
    'font-family:var(--sans);color:var(--ink);line-height:1.6;text-align:left}',
    '.bl-cc *{box-sizing:border-box}',
    '.bl-cc .in{max-width:1180px;margin:0 auto;padding:0 20px}',
    /* hero */
    '.bl-cc .hero{background:var(--dark);color:#fff;padding:44px 20px 38px;text-align:center;margin-bottom:4px}',
    '.bl-cc .hero .k{font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);display:block}',
    '.bl-cc .hero h2{font-family:var(--serif);font-style:italic;font-weight:400;color:#fff;',
    'font-size:clamp(27px,4.4vw,42px);line-height:1.1;margin:12px auto;max-width:17ch;text-wrap:balance}',
    '.bl-cc .hero p{color:rgba(255,255,255,.76);font-family:var(--serif);font-size:15.5px;margin:0 auto;max-width:54ch}',
    '.bl-cc .goals{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:24px auto 0;max-width:680px}',
    '.bl-cc .goal{font:600 13px var(--sans);color:rgba(255,255,255,.9);background:rgba(255,255,255,.08);',
    'border:1px solid rgba(255,255,255,.24);border-radius:999px;padding:9px 16px;cursor:pointer;',
    'transition:background .16s,border-color .16s,color .16s}',
    '.bl-cc .goal:hover{background:rgba(255,255,255,.16)}',
    '.bl-cc .goal:focus-visible{outline:2px solid var(--gold);outline-offset:2px}',
    '.bl-cc .goal[aria-pressed="true"]{background:var(--gold);border-color:var(--gold);color:#003845}',
    /* escalera */
    '.bl-cc .rung{padding:40px 0 0}',
    '.bl-cc .rh{display:flex;align-items:baseline;gap:13px;flex-wrap:wrap;padding-bottom:13px;',
    'border-bottom:1px solid var(--line);margin-bottom:20px}',
    '.bl-cc .rh h3{font-family:var(--serif);font-style:italic;font-weight:400;font-size:25px;color:var(--dark);margin:0}',
    '.bl-cc .rh .qty{font-size:11px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--gold-ink);',
    'border:1px solid var(--gold);border-radius:999px;padding:3px 10px;white-space:nowrap}',
    '.bl-cc .rh .nota{font-size:13.5px;color:var(--muted);font-variant-numeric:tabular-nums}',
    '@media(min-width:760px){.bl-cc .rh .nota{margin-left:auto;font-size:14px}}',
    '.bl-cc .rung[data-k="top"] .nota{color:var(--gold-ink);font-weight:600}',
    '.bl-cc .grid{display:grid;gap:14px;grid-template-columns:1fr}',
    '@media(min-width:600px){.bl-cc .grid{grid-template-columns:1fr 1fr}}',
    '@media(min-width:960px){.bl-cc .grid{grid-template-columns:repeat(3,1fr)}}',
    /* card */
    '.bl-cc .c{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:17px;',
    'display:flex;flex-direction:column;text-decoration:none;color:inherit;',
    'transition:transform .18s,box-shadow .18s,border-color .18s}',
    '.bl-cc .c:hover{transform:translateY(-3px);box-shadow:0 18px 34px -22px rgba(0,56,69,.42);border-color:var(--mid)}',
    '.bl-cc .c[hidden]{display:none}',
    '.bl-cc .ct{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}',
    '.bl-cc .c h4{font-family:var(--serif);font-style:italic;font-weight:400;font-size:21px;',
    'color:var(--dark);margin:0;line-height:1.15}',
    '.bl-cc .fmt{flex:none;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;',
    'border-radius:999px;padding:3px 9px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}',
    '.bl-cc .fmt.mix{border-color:var(--gold);color:var(--gold-ink)}',
    /* la fórmula en colores */
    '.bl-cc .fx{display:flex;align-items:center;margin:15px 0 12px}',
    '.bl-cc .fx i{width:26px;height:26px;border-radius:50%;display:block;flex:none;',
    'border:3px solid var(--card);margin-right:-9px;transition:margin-right .18s cubic-bezier(.3,1.4,.5,1)}',
    '.bl-cc .fx i:last-of-type{margin-right:0}',
    '.bl-cc .c:hover .fx i{margin-right:1px}',
    '.bl-cc .fx .n{margin-left:auto;padding-left:12px;font-size:11px;font-weight:700;',
    'letter-spacing:.1em;text-transform:uppercase;color:var(--muted);white-space:nowrap}',
    '.bl-cc .ings{font-size:12.5px;color:var(--muted);margin:0 0 13px;line-height:1.4}',
    '.bl-cc .why{font-family:var(--serif);font-size:14px;color:var(--muted);line-height:1.5;margin:0 0 13px;min-height:42px}',
    '.bl-cc .sold{font-size:11.5px;font-weight:600;color:var(--gold-ink);margin:0 0 12px;',
    'display:flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums}',
    '.bl-cc .sold:before{content:"";width:5px;height:5px;border-radius:50%;background:var(--gold);flex:none}',
    '.bl-cc .cb{margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between;gap:10px;',
    'padding-top:13px;border-top:1px solid var(--line)}',
    '.bl-cc .amt{font-size:20px;font-weight:700;color:var(--dark);font-variant-numeric:tabular-nums;line-height:1.1;display:block}',
    '.bl-cc .save{display:block;font-size:11.5px;font-weight:600;color:var(--ok);margin-top:3px}',
    '.bl-cc .go{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--sand);',
    'background:var(--dark);border-radius:999px;padding:9px 15px;transition:background .16s;white-space:nowrap}',
    '.bl-cc .c:hover .go{background:var(--terra);color:#fff}',
    '.bl-cc .vacio{grid-column:1/-1;text-align:center;padding:32px 0;color:var(--muted);',
    'font-family:var(--serif);font-style:italic}',
    '.bl-cc .vacio[hidden]{display:none}',
    /* cierre */
    '.bl-cc .cierre{margin:44px 0 0;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px}',
    '.bl-cc .cierre h3{font-family:var(--serif);font-style:italic;font-weight:400;font-size:22px;color:var(--dark);margin:0 0 6px}',
    '.bl-cc .cierre p{font-size:14.5px;color:var(--muted);margin:0 0 16px;max-width:62ch}',
    '.bl-cc .x3row{display:grid;gap:10px;grid-template-columns:repeat(2,1fr)}',
    '@media(min-width:700px){.bl-cc .x3row{grid-template-columns:repeat(4,1fr)}}',
    '@media(min-width:1000px){.bl-cc .x3row{grid-template-columns:repeat(7,1fr)}}',
    '.bl-cc .x3{display:flex;flex-direction:column;align-items:center;gap:5px;text-decoration:none;',
    'border:1px solid var(--line);border-radius:12px;padding:11px 8px 12px;background:var(--sand);',
    'transition:border-color .15s,transform .15s}',
    '.bl-cc .x3:hover{border-color:var(--mid);transform:translateY(-2px)}',
    '.bl-cc .x3 img{width:44px;height:52px;object-fit:contain}',
    '.bl-cc .x3 b{font-size:12px;font-weight:600;color:var(--dark);text-align:center;line-height:1.25}',
    '.bl-cc .x3 span{font-size:10.5px;color:var(--muted);letter-spacing:.04em;text-transform:uppercase;font-weight:600}',
    '@media(prefers-reduced-motion:reduce){.bl-cc *{transition:none!important}}'
  ].join('');

  function el(t, c, h) {
    var e = document.createElement(t);
    if (c) e.className = c;
    if (h != null) e.innerHTML = h;
    return e;
  }

  function card(c, ING, conVentas) {
    var a = el('a', 'c');
    a.href = '/productos/' + c.handle + '/';
    a.dataset.goals = (c.objetivos || []).join(' ');
    var puntos = c.ing.map(function (k) {
      var i = ING[k] || { nombre: k, color: '#999' };
      return '<i style="background:' + i.color + '" title="' + i.nombre + '"></i>';
    }).join('');
    var nombres = c.ing.map(function (k) { return (ING[k] || {}).nombre || k; }).join(' · ');
    var ahorro = c.lista - c.precio;
    a.innerHTML =
      '<div class="ct"><h4>' + c.nombre + '</h4>' +
      '<span class="fmt' + (c.formato === 'Mixto' ? ' mix' : '') + '">' + c.formato + '</span></div>' +
      '<div class="fx">' + puntos + '<span class="n">' + c.ing.length + ' frascos</span></div>' +
      '<p class="ings">' + nombres + '</p>' +
      '<p class="why">' + c.why + '</p>' +
      (conVentas && c.vendidas ? '<p class="sold">' + c.vendidas + ' vendidos en los últimos 6 meses</p>' : '') +
      '<div class="cb"><span><span class="amt">' + money(c.precio) + '</span>' +
      (ahorro > 0 ? '<span class="save">Ahorrás ' + money(ahorro) + '</span>' : '') +
      '</span><span class="go">Ver combo</span></div>';
    return a;
  }

  function render(cfg, host) {
    var ING = cfg.ingredientes;
    var raiz = el('div', 'bl-cc');

    // hero + chips
    var hero = el('section', 'hero');
    hero.innerHTML =
      '<span class="k">' + cfg.hero.kicker + '</span>' +
      '<h2>' + cfg.hero.titulo + '</h2>' +
      '<p>' + cfg.hero.bajada + '</p>';
    var goals = el('div', 'goals');
    goals.setAttribute('role', 'group');
    goals.setAttribute('aria-label', 'Filtrar por objetivo');
    cfg.objetivos.forEach(function (o, i) {
      var b = el('button', 'goal', o.t);
      b.type = 'button';
      b.dataset.g = o.k;
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      goals.appendChild(b);
    });
    hero.appendChild(goals);
    raiz.appendChild(hero);

    var wrap = el('div', 'in');
    raiz.appendChild(wrap);

    // los tres más vendidos, en orden
    var top = cfg.combos.filter(function (c) { return c.vendidas > 0; })
                        .sort(function (a, b) { return b.vendidas - a.vendidas; });
    var porEscalon = { '2': [], '3': [], '4': [] };
    cfg.combos.forEach(function (c) {
      var k = c.ing.length >= 4 ? '4' : String(c.ing.length);
      if (porEscalon[k]) porEscalon[k].push(c);
    });

    cfg.bloques.forEach(function (b) {
      var lista = b.k === 'top' ? top : porEscalon[b.k];
      if (!lista || !lista.length) return;
      var sec = el('section', 'rung');
      sec.dataset.k = b.k;
      sec.innerHTML =
        '<div class="rh"><h3>' + b.titulo + '</h3>' +
        '<span class="qty">' + b.chip + '</span>' +
        '<span class="nota">' + b.nota + '</span></div>';
      var g = el('div', 'grid');
      lista.forEach(function (c) { g.appendChild(card(c, ING, b.k === 'top')); });
      g.appendChild(el('p', 'vacio', b.vacio)).hidden = true;
      sec.appendChild(g);
      wrap.appendChild(sec);
    });

    // cierre: los packs de 3 meses
    if (cfg.x3 && cfg.x3.length) {
      var ci = el('div', 'cierre');
      ci.innerHTML = '<h3>' + cfg.cierre.titulo + '</h3><p>' + cfg.cierre.bajada + '</p>';
      var row = el('div', 'x3row');
      cfg.x3.forEach(function (p) {
        var a = el('a', 'x3');
        a.href = '/productos/' + p.handle + '/';
        a.innerHTML = '<img src="' + p.img + '" alt="' + p.nombre + '" loading="lazy">' +
                      '<b>' + p.nombre + '</b><span>' + p.detalle + '</span>';
        row.appendChild(a);
      });
      ci.appendChild(row);
      wrap.appendChild(ci);
    }

    host.parentNode.insertBefore(raiz, host);

    // filtro por objetivo
    var botones = [].slice.call(raiz.querySelectorAll('.goal'));
    botones.forEach(function (b) {
      b.addEventListener('click', function () {
        var g = b.dataset.g;
        botones.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        [].forEach.call(raiz.querySelectorAll('.c'), function (c) {
          c.hidden = !(g === 'all' || c.dataset.goals.split(' ').indexOf(g) > -1);
        });
        [].forEach.call(raiz.querySelectorAll('.rung'), function (sec) {
          var vivos = [].filter.call(sec.querySelectorAll('.c'), function (c) { return !c.hidden; }).length;
          sec.querySelector('.vacio').hidden = vivos > 0;
        });
      });
    });
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
    try {
      render(cfg, host);
    } catch (e) {
      st.remove();
      return; // ante cualquier error, la grilla nativa queda intacta
    }
    // recién ahora se esconde lo nativo
    host.style.display = 'none';
    [].forEach.call(document.querySelectorAll(
      '.js-pagination, .pagination, .js-category-controls, .category-controls'),
      function (n) { n.style.display = 'none'; });
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
