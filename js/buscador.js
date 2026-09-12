/* Bloom Life · Resultados de búsqueda (/search/?q=…)
 *
 * Reemplaza la grilla nativa de Tienda Nube por cards del sistema de las páginas
 * de beneficio (barra de color | frasco | info | CTA), ordena por relevancia
 * client-side y junta las páginas de la paginación nativa en una sola lista.
 *
 * El seal pinta el guard `#bls-guard` (.js-product-table{visibility:hidden}) antes
 * del primer paint y carga este archivo. Acá se engancha la hoja real y se destapa
 * cuando la hoja llegó Y la grilla nueva ya está pintada. Failsafe a los 4 s: si
 * algo no llega, se destapa igual — mejor la grilla nativa que una página vacía.
 *
 * Nunca dejar la página sin productos: todo camino que no pinta tiene que sacar
 * el guard. Interruptor de emergencia: localStorage 'bls-off' = '1'.
 *
 * El hash del CSS y del JSON no está escrito acá: sale de la URL de este mismo
 * archivo, así que los tres viajan siempre del mismo commit.
 *
 * Los <script type="application/ld+json"> que TN pone al lado de cada card se
 * conservan en el DOM (SEO): se mueven a un <div hidden> dentro de la misma grilla.
 *
 * Namespace de clases: .bsq (búsqueda). NO .bls: ese prefijo ya es del megamenú
 * (js/menu-nav.js pinta `.bls{font-family:Dosis}` y `.bls{display:none}` en mobile,
 * y con el mismo prefijo la grilla desaparecía a 390). El id del guard (#bls-guard)
 * y la llave localStorage 'bls-off' son el contrato con el seal y quedan como están.
 */
(function () {
  'use strict';
  var d = document;
  if (window.__blsOn) return;
  window.__blsOn = 1;

  var yo = d.currentScript;   // leerlo YA: más adelante puede ser null
  var base = (yo && yo.src)
    ? yo.src.replace(/\/js\/buscador\.js.*$/, '')
    : 'https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@main';

  function guardOff() {
    var g = d.getElementById('bls-guard');
    if (g && g.parentNode) g.parentNode.removeChild(g);
  }

  try {
    if (window.localStorage && localStorage.getItem('bls-off') === '1') { guardOff(); return; }
  } catch (e) { /* storage bloqueado: seguimos */ }

  if (!/^\/search\//.test(location.pathname)) { guardOff(); return; }

  /* ───────── datos fijos ───────── */
  var ING = {
    trm: { nombre: 'Tremella',       color: '#8A6F9C' },
    mln: { nombre: 'Melena de León', color: '#A85713' },
    ash: { nombre: 'Ashwagandha',    color: '#6E7A2C' },
    cor: { nombre: 'Cordyceps',      color: '#3E7C9C' },
    rsh: { nombre: 'Reishi',         color: '#6E9E88' }
  };
  /* patrones para detectar ingredientes en el nombre nativo (ya normalizado) */
  var DETECTAR = [
    ['mln', /melena/], ['ash', /ashwagandha/], ['cor', /cordyceps/],
    ['rsh', /reishi/], ['trm', /tremella/]
  ];
  /* combos que el JSON de la góndola no cubre */
  var FALLBACK = {
    332298698: { nombre: 'Clear Mind', formato: 'Gummies', ing: ['mln', 'rsh', 'ash'], principal: 'mln', why: '' }
  };
  var STOP = { de: 1, del: 1, la: 1, el: 1, los: 1, las: 1, y: 1, e: 1, o: 1, u: 1, en: 1, para: 1,
    con: 1, un: 1, una: 1, a: 1, por: 1, que: 1, mi: 1, al: 1 };
  var SIN = { combos: 'combo', gomitas: 'gummies', gomita: 'gummies', gummy: 'gummies',
    gummie: 'gummies', capsula: 'capsulas', caps: 'capsulas', ansiedad: 'anxiety',
    dormir: 'descanso', sueno: 'descanso', pack: 'x3', packs: 'x3', meses: 'x3' };
  var MAX_PAGINAS = 3;     // fetches extra como máximo
  var TIMEOUT_FETCH = 3000;

  /* ───────── helpers ───────── */
  var esc = function (v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var norm = function (s) {
    s = String(s == null ? '' : s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').replace(/^ | $/g, '');
  };
  var pesos = function (n) {
    n = Math.round(Number(n) || 0);
    return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  var param = function (k) {
    var m = new RegExp('[?&]' + k + '=([^&#]*)').exec(location.search);
    if (!m) return '';
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return m[1]; }
  };
  var conTimeout = function (p, ms) {
    return new Promise(function (res) {
      var t = setTimeout(function () { res(null); }, ms);
      p.then(function (v) { clearTimeout(t); res(v); }, function () { clearTimeout(t); res(null); });
    });
  };
  var formatoLabel = function (f) {
    f = norm(f);
    if (/mixto|mix/.test(f)) return 'Mixto';
    if (/capsul/.test(f)) return 'Cápsulas';
    if (/gomita|gummi/.test(f)) return 'Gummies';
    return '';
  };
  /* en el orden en que aparecen en el nombre: el primero es el principal (color de la barra) */
  var detectarIng = function (texto) {
    var n = norm(texto), out = [];
    DETECTAR.forEach(function (p) {
      var m = p[1].exec(n);
      if (m) out.push({ k: p[0], i: m.index });
    });
    out.sort(function (a, b) { return a.i - b.i; });
    return out.map(function (x) { return x.k; });
  };
  var codigoPorNombre = function (nombre) {
    var l = detectarIng(nombre);
    return l.length ? l[0] : null;
  };

  /* ───────── 1. leer una card nativa ───────── */
  function elegirImagen(img) {
    if (!img) return '';
    var ss = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
    var cand = {};
    ss.split(',').forEach(function (c) {
      var p = c.replace(/^\s+|\s+$/g, '').split(/\s+/);
      if (p[0]) cand[p[1] || ''] = p[0];
    });
    var u = cand['480w'] || cand['640w'] || cand['320w'] || '';
    if (!u) {
      u = img.getAttribute('src') || img.getAttribute('data-src') || '';
      if (/^data:/.test(u)) u = '';
    }
    if (u && u.indexOf('//') === 0) u = location.protocol + u;
    return u;
  }

  function leerCard(el) {
    var id = el.getAttribute('data-product-id');
    var qs = el.querySelector('.js-quickshop-container[data-variants]');
    var vars = [];
    try { vars = JSON.parse(qs.getAttribute('data-variants')) || []; } catch (e) { vars = []; }
    var v = vars[0] || {};
    var nEl = el.querySelector('.js-item-name');
    var nombre = nEl ? nEl.textContent.replace(/\s+/g, ' ').replace(/^ | $/g, '') : '';
    var a = el.querySelector('a.item-link[href]') || el.querySelector('a[href*="/productos/"]');
    var url = a ? a.getAttribute('href') : '';
    var pEl = el.querySelector('.js-price-display[data-product-price]');
    var cents = pEl ? parseInt(pEl.getAttribute('data-product-price'), 10) : NaN;

    /* data-variants trae unidades (69500); data-product-price, centavos (6950000) */
    var precio = Number(v.price_number);
    if (!precio && cents > 0) precio = cents / 100;
    var lista = Number(v.compare_at_price_number) || 0;
    if (v.has_promotional_price && Number(v.promotional_price_number)) {
      if (!lista) lista = precio;
      precio = Number(v.promotional_price_number);
    }
    var promo = lista > precio;
    var available = false, stock = 0;
    vars.forEach(function (x) {
      if (x && x.available) available = true;
      if (x && typeof x.stock === 'number') stock += x.stock;
    });
    if (!vars.length) available = true;   // sin datos no castigamos al producto

    return {
      id: id, nombre: nombre, url: url,
      imagen: elegirImagen(el.querySelector('img.js-item-image')),
      precio: precio, lista: promo ? lista : 0, promo: promo,
      available: available, stock: stock, sku: v.sku || '', variantes: vars
    };
  }

  /* ───────── 2. enriquecer: JSON de la góndola o parseo del nombre ───────── */
  function parsearNombre(p) {
    var n = p.nombre, out = { tipo: 'suelto', nombreCorto: n, beneficio: '', formato: '', ing: [], principal: null, x3: false };
    if (n.indexOf('|') >= 0) {
      /* "Fresh Flow Combo | Melena de León + Cordyceps + Tremella | Gummies" */
      var seg = n.split('|').map(function (s) { return s.replace(/^\s+|\s+$/g, ''); });
      out.tipo = 'combo';
      out.nombreCorto = seg[0].replace(/\s*combo\s*$/i, '');
      out.ing = detectarIng(seg[1] || '');
      var f = formatoLabel(seg[2] || '');
      if (!f) {
        var mid = norm(seg[1] || ''), todo = norm(n);
        if (/capsul/.test(mid) && /gomita|gummi/.test(todo)) f = 'Mixto';
        else if (/capsul/.test(mid)) f = 'Mixto';
        else if (/gummi|gomita/.test(todo)) f = 'Gummies';
        else f = 'Gummies';
      }
      out.formato = f;
    } else if (n.indexOf('·') >= 0) {
      /* "Melena de León · Foco y Claridad · Gummies x3 meses" */
      var s2 = n.split('·').map(function (s) { return s.replace(/^\s+|\s+$/g, ''); });
      out.nombreCorto = s2[0];
      out.beneficio = s2[1] || '';
      var ult = s2[2] || '';
      out.x3 = /x\s*3/i.test(ult);
      out.tipo = out.x3 ? 'x3' : 'suelto';
      out.formato = formatoLabel(ult) || 'Gummies';
      out.ing = detectarIng(s2[0]);
    } else {
      out.ing = detectarIng(n);
      out.formato = formatoLabel(n);
      out.x3 = /x\s*3/i.test(n);
      if (/combo/i.test(n)) out.tipo = 'combo';
      else if (out.x3) out.tipo = 'x3';
    }
    if (!out.ing.length) out.ing = detectarIng(n);
    out.principal = out.ing[0] || null;
    return out;
  }

  function enriquecer(p, cfg) {
    var meta = parsearNombre(p);
    var id = Number(p.id);
    var c = cfg && cfg.combos ? cfg.combos.filter(function (x) { return Number(x.id) === id; })[0] : null;
    var x3 = cfg && cfg.x3 ? cfg.x3.filter(function (x) { return Number(x.id) === id; })[0] : null;
    var fb = FALLBACK[id];
    if (c) {
      meta.tipo = 'combo';
      meta.nombreCorto = c.nombre || meta.nombreCorto;
      meta.formato = formatoLabel(c.formato) || meta.formato;
      if (c.ing && c.ing.length) meta.ing = c.ing.slice();
      meta.why = c.why || '';
      meta.principal = c.principal || meta.ing[0] || null;
    } else if (x3) {
      meta.tipo = 'x3'; meta.x3 = true;
      meta.nombreCorto = x3.nombre || meta.nombreCorto;
      meta.formato = formatoLabel(x3.detalle) || meta.formato;
      var code = codigoPorNombre(x3.nombre || '');
      if (code) { meta.ing = [code]; meta.principal = code; }
    } else if (fb) {
      meta.tipo = 'combo';
      meta.nombreCorto = fb.nombre;
      meta.formato = fb.formato;
      if (!meta.ing.length) meta.ing = fb.ing.slice();
      meta.principal = fb.principal || meta.ing[0];
      meta.why = fb.why || '';
    }
    if (!meta.why) {
      if (meta.tipo === 'x3' && meta.beneficio) meta.why = meta.beneficio + '. Tres meses en una sola compra.';
      else meta.why = meta.beneficio || '';
    }
    var ingCfg = (cfg && cfg.ingredientes) || {};
    meta.ingNombres = meta.ing.map(function (k) {
      return (ingCfg[k] && ingCfg[k].nombre) || (ING[k] && ING[k].nombre) || k;
    });
    meta.ingColores = meta.ing.map(function (k) {
      return (ingCfg[k] && ingCfg[k].color) || (ING[k] && ING[k].color) || '#608B71';
    });
    var pk = meta.principal;
    meta.color = (ingCfg[pk] && ingCfg[pk].color) || (ING[pk] && ING[pk].color) || '#003845';
    p.meta = meta;
    return p;
  }

  /* ───────── 3. relevancia ───────── */
  function tokens(q) {
    var out = [];
    norm(q).split(' ').forEach(function (t) {
      if (!t || STOP[t]) return;
      if (SIN[t]) t = SIN[t];
      if (t.length < 2 && t !== 'x3') return;
      if (out.indexOf(t) < 0) out.push(t);
    });
    return out;
  }

  function puntuar(p, toks, qn) {
    var m = p.meta;
    var corto = norm(m.nombreCorto), nativo = norm(p.nombre),
      ings = norm(m.ingNombres.join(' ')), why = norm(m.why + ' ' + m.beneficio),
      fmt = norm(m.formato + (m.x3 ? ' x3 tres meses' : '') + (m.tipo === 'combo' ? ' combo' : ''));
    var score = 0, hit = false;
    toks.forEach(function (t) {
      var h = false;
      if (corto.indexOf(t) >= 0) { score += 5; h = true; }
      if (nativo.indexOf(t) >= 0) { score += 3; h = true; }
      if (ings.indexOf(t) >= 0) { score += 4; h = true; }
      if (why.indexOf(t) >= 0) { score += 2; h = true; }
      if (fmt.indexOf(t) >= 0) { score += 2; h = true; }
      if (h) hit = true;
    });
    if (qn && toks.length > 1) {
      if (corto.indexOf(qn) >= 0) score += 8;
      else if (nativo.indexOf(qn) >= 0) score += 4;
    }
    p.score = score; p.hit = hit;
  }

  /* ───────── 4. render ───────── */
  function cardHTML(p, i) {
    var m = p.meta;
    var tags = '';
    if (m.formato) tags += '<span class="bsq-fmt' + (m.formato === 'Mixto' ? ' mix' : '') + '">' + esc(m.formato) + '</span>';
    if (m.tipo === 'x3') tags += '<span class="bsq-tag">x3 meses</span>';
    else if (m.tipo === 'combo') tags += '<span class="bsq-tag">Combo</span>';
    if (!p.available) tags += '<span class="bsq-oos">Sin stock</span>';

    var ings = '';
    if (m.tipo === 'combo' && m.ing.length) {
      ings = '<div class="bsq-ings"><b>' + m.ing.length + ' frascos</b> &middot; ' +
        m.ing.map(function (k, j) {
          return '<span class="ing"><i style="background:' + esc(m.ingColores[j]) + '"></i>' + esc(m.ingNombres[j]) + '</span>';
        }).join(' ') + '</div>';
    }
    var precio = '<div class="bsq-price"><span class="bsq-now">' + pesos(p.precio) + '</span>';
    if (p.promo) {
      precio += '<s class="bsq-was">' + pesos(p.lista) + '</s>' +
        '<span class="bsq-save">Ahorrás ' + pesos(p.lista - p.precio) + '</span>';
    }
    precio += '</div>';

    return '<a class="bsq-c' + (p.available ? '' : ' off') + '" href="' + esc(p.url) + '"' +
      ' style="--pc:' + esc(m.color) + ';--i:' + Math.min(i, 14) + '" data-id="' + esc(p.id) + '">' +
      '<span class="bsq-bar"></span>' +
      '<span class="bsq-thumb">' + (p.imagen ? '<img src="' + esc(p.imagen) + '" alt="" loading="' + (i < 6 ? 'eager' : 'lazy') + '" decoding="async">' : '') + '</span>' +
      '<span class="bsq-info">' +
        (tags ? '<span class="bsq-tags">' + tags + '</span>' : '') +
        '<span class="bsq-name">' + esc(m.nombreCorto) + '</span>' +
        (m.why ? '<span class="bsq-why">' + esc(m.why) + '</span>' : '') +
        ings + precio +
        '<span class="bsq-sub">o 10% OFF con suscripción</span>' +
      '</span>' +
      '<span class="bsq-act"><span class="bsq-go">' + (p.available ? 'Ver producto' : 'Ver detalle') + '</span></span>' +
      '</a>';
  }

  function grillaHTML(lista, offset) {
    return '<div class="bsq-grid">' + lista.map(function (p, i) { return cardHTML(p, offset + i); }).join('') + '</div>';
  }

  function pintar(ctx) {
    var grid = ctx.grid, q = ctx.q, prods = ctx.prods;
    var toks = tokens(q), qn = norm(q);
    prods.forEach(function (p, i) { p.idx = i; puntuar(p, toks, qn); });
    var hits = prods.filter(function (p) { return p.hit; });
    var resto = prods.filter(function (p) { return !p.hit; });
    if (!hits.length) { hits = prods.slice(); resto = []; }
    hits.sort(function (a, b) { return (b.score - a.score) || (a.idx - b.idx); });
    hits = hits.filter(function (p) { return p.available; }).concat(hits.filter(function (p) { return !p.available; }));

    /* los ld+json se conservan: SEO */
    var seo = d.createElement('div');
    seo.hidden = true; seo.setAttribute('data-bsq-seo', '');
    var scripts = grid.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < scripts.length; i++) seo.appendChild(scripts[i]);

    var html = grillaHTML(hits, 0);
    if (resto.length) {
      html += '<h2 class="bsq-sep"><span>También te puede interesar</span></h2>' + grillaHTML(resto, hits.length);
    }
    var root = d.createElement('section');
    root.className = 'bsq';
    root.innerHTML = html;

    while (grid.firstChild) grid.removeChild(grid.firstChild);
    grid.appendChild(root);
    grid.appendChild(seo);

    /* encabezado propio en lugar del título nativo */
    var total = prods.length;
    var cuenta = total + (total === 1 ? ' producto' : ' productos');
    if (!ctx.completo) cuenta += ' en esta página';
    var head = d.createElement('div');
    head.className = 'bsq bsq-head';
    head.innerHTML = '<span class="bsq-eyebrow">Resultados</span>' +
      '<h1 class="bsq-h1">Resultados para <em>“' + esc(q) + '”</em></h1>' +
      '<div class="bsq-count">' + esc(cuenta) + '</div>';
    var titulo = d.querySelector('[data-store="page-title"]');
    var h2s = d.querySelectorAll('h2');
    for (var k = 0; k < h2s.length; k++) {
      if (/Mostrando los resultados/i.test(h2s[k].textContent)) h2s[k].className += ' bsq-native-title';
    }
    if (titulo && titulo.parentNode) titulo.parentNode.insertBefore(head, titulo.nextSibling);
    else grid.parentNode.insertBefore(head, grid);

    if (ctx.pag) {
      if (ctx.completo) ctx.pag.className += ' bsq-native-pag-off';
      else ctx.pag.className += ' bsq-native-pag';
    }
    d.body.className += ' bsq-on';
  }

  /* ───────── 5. arranque ───────── */
  function start() {
    var body = d.body;
    if (!body || !/(^|\s)template-search(\s|$)/.test(body.className)) { guardOff(); return; }
    var grid = d.querySelector('.js-product-table');
    var nativas = grid ? grid.querySelectorAll('.js-item-product[data-product-id]') : [];
    if (!grid || !nativas.length) { guardOff(); return; }   // sin resultados: lo nativo

    var estado = { css: false, listo: false };
    var revelar = function () { if (estado.css && estado.listo) guardOff(); };
    var l = d.createElement('link');
    l.rel = 'stylesheet';
    l.href = base + '/css/buscador.css';
    l.onload = l.onerror = function () { estado.css = true; revelar(); };
    d.head.appendChild(l);
    setTimeout(guardOff, 4000);

    var prods = [], vistos = {};
    var sumar = function (el) {
      var p = leerCard(el);
      if (!p.id || vistos[p.id] || !p.url) return;
      vistos[p.id] = 1; prods.push(p);
    };
    for (var i = 0; i < nativas.length; i++) sumar(nativas[i]);

    /* paginación nativa: el .row sin clase propia que sigue a la grilla */
    var pag = null, sib = grid.nextElementSibling;
    while (sib) {
      if (/(^|\s)row(\s|$)/.test(sib.className) && /justify-content-center/.test(sib.className)) { pag = sib; break; }
      sib = sib.nextElementSibling;
    }
    var links = pag ? pag.querySelectorAll('a[href*="/search/page/"]') : [];
    var actual = (/\/search\/page\/(\d+)/.exec(location.pathname) || [0, 1])[1];
    actual = parseInt(actual, 10) || 1;
    var totalPag = 1;
    if (pag) {
      var spans = pag.querySelectorAll('span');
      var nums = [];
      for (var s = 0; s < spans.length; s++) {
        var t = spans[s].textContent.replace(/\s+/g, '');
        if (/^\d+$/.test(t)) nums.push(parseInt(t, 10));
      }
      if (nums.length >= 2) totalPag = nums[nums.length - 1];
    }
    var urls = [];
    if (links.length && totalPag > 1) {
      var ejemplo = links[0].getAttribute('href');
      for (var n = 1; n <= totalPag && urls.length < MAX_PAGINAS; n++) {
        if (n === actual) continue;
        urls.push(ejemplo.replace(/\/search\/page\/\d+\//, '/search/page/' + n + '/'));
      }
    }

    var puedeFetch = !!(window.fetch && window.Promise && window.DOMParser);
    var pJson = puedeFetch
      ? conTimeout(fetch(base + '/data/combos-categoria.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }), TIMEOUT_FETCH)
      : Promise.resolve(null);
    var pPags = (puedeFetch && urls.length)
      ? Promise.all(urls.map(function (u) {
          return conTimeout(fetch(u, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : null; }), TIMEOUT_FETCH + 1000);
        }))
      : Promise.resolve([]);

    var terminar = function (cfg, htmls) {
      var completo = true;
      (htmls || []).forEach(function (h) {
        if (!h) { completo = false; return; }
        try {
          var doc = new DOMParser().parseFromString(h, 'text/html');
          var cards = doc.querySelectorAll('.js-product-table .js-item-product[data-product-id]');
          for (var i = 0; i < cards.length; i++) sumar(cards[i]);
        } catch (e) { completo = false; }
      });
      if (urls.length > (totalPag - 1)) completo = false;   // nunca pasa, defensivo
      if (totalPag - 1 > MAX_PAGINAS) completo = false;     // quedaron páginas sin traer
      prods.forEach(function (p) { enriquecer(p, cfg); });
      try {
        pintar({ grid: grid, q: param('q'), prods: prods, pag: pag, completo: completo });
      } catch (e) {
        guardOff();
        if (window.console && console.error) console.error('[bsq] render', e);
        return;
      }
      estado.listo = true;
      revelar();
    };

    if (!window.Promise) { terminar(null, []); return; }
    Promise.all([pJson, pPags]).then(function (r) { terminar(r[0], r[1]); }, function () { terminar(null, []); });
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start);
  else start();
})();
