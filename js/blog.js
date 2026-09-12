/* Bloom Life · Listado del blog (/blog/ y /blog/?page=N · /blog/page/N/)
 *
 * Reemplaza la grilla nativa de Tienda Nube (.blog-page > .row > .post-item) por
 * un listado con la identidad nueva del sitio: hero compacto en --dark, primera
 * nota destacada en una card ancha, el resto en grilla de 3 columnas y una banda
 * de cierre en --terra hacia el catálogo. Mismo mecanismo que /search/ (buscador.js)
 * y las páginas institucionales.
 *
 * El seal pinta el guard `#bbl-guard` (.blog-page,.page-header{visibility:hidden})
 * antes del primer paint y carga este archivo. Acá se engancha la hoja real
 * (css/blog.css, mismo commit que este JS: el hash sale de la URL propia) y se
 * destapa cuando la hoja llegó Y la vista nueva ya está pintada. Failsafe a los
 * 4 s: si algo no llega, se destapa igual — mejor el listado nativo que una
 * página vacía. Interruptor de emergencia: localStorage 'bbl-off' = '1'.
 *
 * Datos: se leen del DOM nativo (título, URL, portada) y se completan con los
 * <script type="application/ld+json"> BlogPosting que TN pone al lado de cada
 * card (description = meta description, frases completas; datePublished). El
 * extracto del DOM viene cortado a mitad de palabra, por eso el JSON-LD manda.
 * Esos scripts se conservan en el DOM (SEO): van a un <div hidden> dentro de la
 * misma sección.
 *
 * Paginación: TN pagina de a 12 con links `?page=N`. Si hay hasta MAX_PAGINAS
 * páginas más, se traen por fetch y se juntan en una sola lista (la paginación
 * nativa se oculta). Si el fetch falla, hay más páginas que el tope, o se
 * aterriza directo en una página > 1, se pintan pastillas propias.
 *
 * Namespace: .bbl (Bloom blog). ES5, sin dependencias.
 */
(function () {
  'use strict';
  var d = document;
  if (window.__bblOn) return;
  window.__bblOn = 1;

  var yo = d.currentScript;   // leerlo YA: más adelante puede ser null
  var base = (yo && yo.src)
    ? yo.src.replace(/\/js\/blog\.js.*$/, '')
    : 'https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@main';

  var MAX_PAGINAS = 2;        // fetches extra como máximo (12 posts por página → hasta 36 juntos)
  var TIMEOUT_FETCH = 3000;   // por debajo del failsafe de 4 s del seal
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var COPY = {
    kicker: 'Wellness Blog',
    h1a: 'Notas para ',
    h1b: 'sentirse bien',
    sub: 'Adaptógenos, hábitos y ciencia, explicados sin exagerar.',
    sep: 'Todas las notas',
    leer: 'Leer nota',
    finalH2: 'De la lectura al hábito.',
    finalSub: 'Los adaptógenos de los que hablamos, en gummies y cápsulas.',
    btn1: 'Ver los suplementos', url1: '/productos/',
    btn2: 'Ver los combos', url2: '/elegi-tu-suplemento/combos-bienestar-integral/'
  };

  function guardOff() {
    var g = d.getElementById('bbl-guard');
    if (g && g.parentNode) g.parentNode.removeChild(g);
  }

  try {
    if (window.localStorage && localStorage.getItem('bbl-off') === '1') { guardOff(); return; }
  } catch (e) { /* storage bloqueado: seguimos */ }

  if (!/^\/blog\/?(page\/\d+\/?)?$/.test(location.pathname)) { guardOff(); return; }

  /* ───────── helpers ───────── */
  var esc = function (v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var trim = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').replace(/^ | $/g, ''); };
  var conTimeout = function (p, ms) {
    return new Promise(function (res) {
      var t = setTimeout(function () { res(null); }, ms);
      p.then(function (v) { clearTimeout(t); res(v); }, function () { clearTimeout(t); res(null); });
    });
  };
  /* "/blog/posts/slug" para comparar URLs con y sin host */
  var pathDe = function (u) {
    u = String(u || '');
    var m = /^(?:https?:)?\/\/[^/]+(\/.*)$/.exec(u);
    return (m ? m[1] : u).replace(/[?#].*$/, '').replace(/\/$/, '');
  };
  var fecha = function (iso) {
    if (!iso) return '';
    var t = new Date(iso);
    if (isNaN(t.getTime())) return '';
    return t.getDate() + ' ' + MESES[t.getMonth()] + ' ' + t.getFullYear();
  };
  /* el extracto nativo viene cortado a mitad de palabra: se recorta a la última entera */
  var extractoLimpio = function (s) {
    s = trim(s);
    if (!s) return '';
    if (/[.!?…]$/.test(s)) return s;
    var i = s.lastIndexOf(' ');
    if (i > 40) s = s.slice(0, i);
    return s.replace(/[,;:\-–—\s]+$/, '') + '…';
  };

  /* ───────── 1. JSON-LD de la página: url → {desc, fecha, img} ───────── */
  function leerLd(root) {
    var out = {};
    var scripts = root.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < scripts.length; i++) {
      var o;
      try { o = JSON.parse(scripts[i].textContent); } catch (e) { continue; }
      var lista = Object.prototype.toString.call(o) === '[object Array]' ? o : [o];
      for (var j = 0; j < lista.length; j++) {
        var n = lista[j];
        if (!n || n['@type'] !== 'BlogPosting') continue;
        var u = typeof n.url === 'string' ? n.url : (n.mainEntityOfPage && n.mainEntityOfPage['@id']);
        if (!u) continue;
        var img = typeof n.image === 'string' ? n.image : (n.image && n.image.url) || '';
        out[pathDe(u)] = { desc: trim(n.description), fecha: n.datePublished || '', img: img };
      }
    }
    return out;
  }

  /* ───────── 2. leer una card nativa ───────── */
  function elegirImagen(img) {
    if (!img) return '';
    /* TN manda el mismo archivo en todos los anchos del srcset: no hay tamaños,
       hay UNA portada. Se toma la primera candidata y listo. */
    var ss = img.getAttribute('data-srcset') || img.getAttribute('srcset') || '';
    var u = '';
    if (ss) u = trim(ss.split(',')[0]).split(/\s+/)[0] || '';
    if (!u) {
      u = img.getAttribute('data-src') || img.getAttribute('src') || '';
      if (/^data:/.test(u)) u = '';
    }
    if (u && u.indexOf('//') === 0) u = location.protocol + u;
    return u;
  }

  function leerCard(el, ld) {
    var a = el.querySelector('a.post-item-link[href]') || el.querySelector('a[href*="/blog/posts/"]');
    var url = a ? a.getAttribute('href') : '';
    var tEl = el.querySelector('.post-item-title');
    var titulo = tEl ? trim(tEl.textContent) : (a ? trim(a.getAttribute('title')) : '');
    var sEl = el.querySelector('.post-item-summary');
    var meta = ld[pathDe(url)] || {};
    var img = elegirImagen(el.querySelector('img.post-item-image') || el.querySelector('img')) || meta.img || '';
    return {
      id: el.getAttribute('data-post-id') || pathDe(url),
      url: url, titulo: titulo, imagen: img,
      extracto: meta.desc || extractoLimpio(sEl ? sEl.textContent : ''),
      fecha: meta.fecha || ''
    };
  }

  /* ───────── 3. render ───────── */
  function cardHTML(p, i, feat) {
    var f = fecha(p.fecha);
    return '<a class="' + (feat ? 'bbl-feat' : 'bbl-c') + '" href="' + esc(p.url) + '" data-id="' + esc(p.id) + '">' +
      '<span class="bbl-img">' + (p.imagen
        ? '<img src="' + esc(p.imagen) + '" alt="" loading="' + (i < 4 ? 'eager' : 'lazy') + '" decoding="async">'
        : '') + '</span>' +
      '<span class="bbl-body">' +
        (f ? '<span class="bbl-date">' + esc(f) + '</span>' : '') +
        '<span class="bbl-t">' + esc(p.titulo) + '</span>' +
        (p.extracto ? '<span class="bbl-x">' + esc(p.extracto) + '</span>' : '') +
        '<span class="bbl-more">' + esc(COPY.leer) + ' <i>&rarr;</i></span>' +
      '</span>' +
      '</a>';
  }

  function pagHTML(actual, total) {
    var link = function (n) { return n > 1 ? '/blog/?page=' + n : '/blog/'; };
    var h = '<nav class="bbl-pag" aria-label="Páginas del blog">';
    h += actual > 1
      ? '<a class="bbl-pg bbl-pg-arrow" href="' + link(actual - 1) + '" aria-label="Página anterior">&larr;</a>'
      : '<span class="bbl-pg bbl-pg-arrow off" aria-hidden="true">&larr;</span>';
    for (var n = 1; n <= total; n++) {
      h += n === actual
        ? '<span class="bbl-pg on" aria-current="page">' + n + '</span>'
        : '<a class="bbl-pg" href="' + link(n) + '">' + n + '</a>';
    }
    h += actual < total
      ? '<a class="bbl-pg bbl-pg-arrow" href="' + link(actual + 1) + '" aria-label="Página siguiente">&rarr;</a>'
      : '<span class="bbl-pg bbl-pg-arrow off" aria-hidden="true">&rarr;</span>';
    return h + '</nav>';
  }

  function pintar(ctx) {
    var sec = ctx.sec, posts = ctx.posts;
    var feat = posts[0], resto = posts.slice(1);

    var html = '<section class="bbl-hero"><div class="bbl-in">' +
      '<div class="bbl-rule"></div>' +
      '<div class="bbl-kicker">' + esc(COPY.kicker) + '</div>' +
      '<h1 class="bbl-h1">' + esc(COPY.h1a) + '<span class="bbl-em">' + esc(COPY.h1b) + '</span></h1>' +
      '<div class="bbl-sub">' + esc(COPY.sub) + '</div>' +
      '</div></section>';

    html += '<section class="bbl-list"><div class="bbl-in">' + cardHTML(feat, 0, true);
    if (resto.length) {
      html += '<h2 class="bbl-sep"><span>' + esc(COPY.sep) + '</span></h2>' +
        '<div class="bbl-grid">' + resto.map(function (p, i) { return cardHTML(p, i + 1, false); }).join('') + '</div>';
    }
    if (ctx.pagPropia) html += pagHTML(ctx.actual, ctx.total);
    html += '</div></section>';

    html += '<section class="bbl-final"><div class="bbl-in">' +
      '<h2 class="bbl-h2">' + esc(COPY.finalH2) + '</h2>' +
      '<div class="bbl-final-sub">' + esc(COPY.finalSub) + '</div>' +
      '<div class="bbl-btns">' +
        '<a class="bbl-btn-g" href="' + COPY.url1 + '">' + esc(COPY.btn1) + '</a>' +
        '<a class="bbl-btn-g" href="' + COPY.url2 + '">' + esc(COPY.btn2) + '</a>' +
      '</div></div></section>';

    /* los ld+json se conservan: SEO */
    var seo = d.createElement('div');
    seo.hidden = true; seo.setAttribute('data-bbl-seo', '');
    var scripts = sec.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < scripts.length; i++) seo.appendChild(scripts[i]);

    var root = d.createElement('div');
    root.className = 'bbl';
    root.innerHTML = html;

    while (sec.firstChild) sec.removeChild(sec.firstChild);
    sec.appendChild(root);
    sec.appendChild(seo);

    /* el wrapper .container del template limita el ancho: las bandas van a sangre */
    var wrap = sec.parentNode;
    if (wrap && wrap.className != null) wrap.className += ' bbl-wrap';
    if (ctx.pag) ctx.pag.className += ' bbl-native-pag';
    d.body.className += ' bbl-on';
  }

  /* ───────── 4. arranque ───────── */
  function start() {
    var body = d.body;
    if (!body || !/(^|\s)template-blog(\s|$)/.test(body.className)) { guardOff(); return; }
    var sec = d.querySelector('.blog-page');
    var nativas = sec ? sec.querySelectorAll('.post-item[data-post-id]') : [];
    if (!sec || !nativas.length) { guardOff(); return; }   // sin posts: lo nativo

    var estado = { css: false, listo: false };
    var revelar = function () { if (estado.css && estado.listo) guardOff(); };
    var l = d.createElement('link');
    l.rel = 'stylesheet';
    l.href = base + '/css/blog.css';
    l.onload = l.onerror = function () { estado.css = true; revelar(); };
    d.head.appendChild(l);
    setTimeout(guardOff, 4000);

    var ld = leerLd(sec);
    var posts = [], vistos = {};
    var sumar = function (el, ldx) {
      var p = leerCard(el, ldx);
      if (!p.url || !p.titulo || vistos[p.id]) return;
      vistos[p.id] = 1; posts.push(p);
    };
    for (var i = 0; i < nativas.length; i++) sumar(nativas[i], ld);

    /* paginación nativa: el .row centrado que sigue a la sección, con links ?page=N */
    var pag = null, sib = sec.nextElementSibling;
    while (sib) {
      if (/(^|\s)row(\s|$)/.test(sib.className) && sib.querySelector('a[href*="page="]')) { pag = sib; break; }
      sib = sib.nextElementSibling;
    }
    var actual = parseInt((/[?&]page=(\d+)/.exec(location.search) || /\/blog\/page\/(\d+)/.exec(location.pathname) || [0, 1])[1], 10) || 1;
    var total = 1;
    if (pag) {
      var spans = pag.querySelectorAll('span'), nums = [];
      for (var s = 0; s < spans.length; s++) {
        var t = trim(spans[s].textContent);
        if (/^\d+$/.test(t)) nums.push(parseInt(t, 10));
      }
      if (nums.length) total = Math.max.apply(null, nums);
      var links = pag.querySelectorAll('a[href*="page="]');
      for (var k = 0; k < links.length; k++) {
        var mm = /page=(\d+)/.exec(links[k].getAttribute('href'));
        if (mm) total = Math.max(total, parseInt(mm[1], 10));
      }
    }
    total = Math.max(total, actual);

    var puedeFetch = !!(window.fetch && window.Promise && window.DOMParser);
    var juntar = puedeFetch && actual === 1 && total > 1 && (total - 1) <= MAX_PAGINAS;
    var urls = [];
    if (juntar) for (var n = 2; n <= total; n++) urls.push('/blog/?page=' + n);

    var terminar = function (htmls) {
      var completo = juntar;
      (htmls || []).forEach(function (h) {
        if (!h) { completo = false; return; }
        try {
          var doc = new DOMParser().parseFromString(h, 'text/html');
          var s2 = doc.querySelector('.blog-page');
          if (!s2) { completo = false; return; }
          var ld2 = leerLd(s2);
          var cards = s2.querySelectorAll('.post-item[data-post-id]');
          for (var i = 0; i < cards.length; i++) sumar(cards[i], ld2);
        } catch (e) { completo = false; }
      });
      try {
        pintar({ sec: sec, posts: posts, pag: pag, actual: actual, total: total,
          pagPropia: total > 1 && !completo });
      } catch (e) {
        guardOff();
        if (window.console && console.error) console.error('[bbl] render', e);
        return;
      }
      estado.listo = true;
      revelar();
    };

    if (!urls.length) { terminar([]); return; }
    Promise.all(urls.map(function (u) {
      return conTimeout(fetch(u, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : null; }), TIMEOUT_FETCH);
    })).then(terminar, function () { terminar([]); });
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start);
  else start();
})();
