/* Páginas institucionales — /suscripciones/ /preguntas-frecuentes/
 * /politica-de-devolucion/ /contacto/
 *
 * Lo carga js/paginas-beneficio.js (que también trae las dos hojas) solo en
 * esos cuatro paths. Hace tres cosas, todas progresivas: si este archivo no
 * llega, las páginas se ven completas igual (todo abierto, sin buscador).
 *
 *  1. Acordeón del FAQ (.bli-q): pliega las respuestas y las abre al click.
 *  2. Buscador del FAQ: la API de páginas borra <input>, así que el campo se
 *     crea acá dentro de .bli-search y filtra las preguntas sobre el DOM.
 *  3. Contacto: no es una página del CMS sino el template nativo del tema, y
 *     la API igual borraría un <form>. Se construye la página alrededor del
 *     formulario nativo, moviendo el nodo ENTERO (action, honeypot, names)
 *     sin tocarle nada adentro. Si algo falla, queda lo nativo.
 *
 * Al terminar avisa a paginas-beneficio.js (window.blpDone) para que saque el
 * guard anti-FOUC; ese archivo tiene además su propio timeout de 4 s.
 */
(function () {
  var d = document;
  var path = location.pathname.replace(/\/+$/, '') || '/';

  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function el(tag, cls, html) {
    var e = d.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ── 1. acordeón ─────────────────────────────────────────────────────── */
  function acordeon() {
    var root = d.querySelector('.blp');
    var qs = d.querySelectorAll('.bli-q');
    if (!root || !qs.length) return;
    root.classList.add('bli-js');
    Array.prototype.forEach.call(qs, function (q, i) {
      var h = q.querySelector('.bli-qh');
      var a = q.querySelector('.bli-qa');
      if (!h) return;
      // el control es un <button> ADENTRO del h3: el h3 sigue siendo encabezado
      // para el lector de pantalla y el botón es lo que se pliega/despliega
      var b = d.createElement('button');
      b.type = 'button';
      b.className = 'bli-qb';
      b.innerHTML = h.innerHTML;
      h.innerHTML = '';
      h.appendChild(b);
      if (a) {
        if (!a.id) a.id = 'bli-qa-' + (i + 1);
        b.setAttribute('aria-controls', a.id);
      }
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function () {
        var open = q.classList.toggle('open');
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  /* ── 2. buscador del FAQ ─────────────────────────────────────────────── */
  function buscador() {
    var host = d.querySelector('.bli-search');
    if (!host) return;
    var inp = d.createElement('input');
    inp.type = 'search';
    inp.placeholder = 'Buscá una palabra: envío, cuotas, Reishi…';
    inp.setAttribute('aria-label', 'Buscar en las preguntas frecuentes');
    inp.setAttribute('autocomplete', 'off');
    host.appendChild(el('span', 'bli-search-ic'));
    host.appendChild(inp);

    var count = d.querySelector('.bli-count');
    var empty = d.querySelector('.bli-empty');
    var nav = d.querySelector('.bli-nav');
    var secs = Array.prototype.slice.call(d.querySelectorAll('.bli-sec'));
    var items = Array.prototype.map.call(d.querySelectorAll('.bli-q'), function (q) {
      var h = q.querySelector('.bli-qb') || q.querySelector('.bli-qh');
      return { el: q, h: h, txt: norm(q.textContent), orig: h ? h.textContent : '', sec: q.closest('.bli-sec') };
    });
    var previo = null;   // qué estaba abierto antes de empezar a buscar

    function marcar(it, q) {
      if (!it.h) return;
      if (!q) { it.h.textContent = it.orig; return; }
      var t = it.orig, nt = norm(t), i = nt.indexOf(q);
      // norm() no cambia el largo (solo quita diacríticos), así que los índices coinciden
      if (i < 0 || nt.length !== t.length) { it.h.textContent = t; return; }
      it.h.innerHTML = esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
    }

    function run() {
      var q = norm(inp.value.trim());
      if (q.length < 2) q = '';          // con una letra coincide casi todo
      var n = 0, vis = {};
      if (q && previo === null) {
        previo = items.map(function (it) { return it.el.classList.contains('open'); });
      }
      items.forEach(function (it, i) {
        var ok = !q || it.txt.indexOf(q) > -1;
        it.el.classList.toggle('hide', !ok);
        if (q && ok) it.el.classList.add('open');
        if (!q && previo) it.el.classList.toggle('open', !!previo[i]);
        marcar(it, ok ? q : '');
        if (ok) { n++; if (it.sec && it.sec.id) vis[it.sec.id] = 1; }
      });
      if (!q) previo = null;
      secs.forEach(function (s) { s.classList.toggle('hide', !!q && !vis[s.id]); });
      if (empty) empty.classList.toggle('show', !!q && n === 0);
      if (nav) nav.classList.toggle('hide', !!q);
      if (count) {
        count.textContent = !q ? '' : n === 0 ? 'Ninguna pregunta coincide.'
          : n === 1 ? '1 pregunta coincide' : n + ' preguntas coinciden';
      }
    }
    var t;
    inp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 120); });
    inp.addEventListener('search', run);
  }

  /* ── 3. chips: scroll con offset del sticky + estado activo ──────────── */
  function chips() {
    var nav = d.querySelector('.bli-nav');
    if (!nav) return;
    // el header del tema es fijo: el sticky de los chips va debajo de él, y las
    // anclas tienen que descontar las dos alturas
    var head = d.querySelector('.js-head-main') || d.querySelector('header');
    var offHead = function () {
      if (!head) return 0;
      var pos = getComputedStyle(head).position;
      return (pos === 'fixed' || pos === 'sticky') ? head.getBoundingClientRect().height : 0;
    };
    // el header achica al scrollear (el ticker de promos se va), así que el
    // top del sticky se sigue en cada scroll, no se fija una vez
    var ultimo = -1;
    var ajustar = function () {
      var oh = offHead();
      if (head && oh) oh = Math.max(0, Math.round(head.getBoundingClientRect().bottom));
      if (oh === ultimo) return;
      ultimo = oh;
      nav.style.top = oh + 'px';
      Array.prototype.forEach.call(d.querySelectorAll('.bli-sec'), function (s) {
        s.style.scrollMarginTop = (oh + nav.offsetHeight + 16) + 'px';
      });
    };
    ajustar();
    window.addEventListener('resize', ajustar);
    window.addEventListener('scroll', ajustar, { passive: true });
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        var s = d.getElementById(id);
        if (!s) return;
        e.preventDefault();
        var y = s.getBoundingClientRect().top + window.pageYOffset - nav.offsetHeight - (ultimo > 0 ? ultimo : offHead()) - 16;
        window.scrollTo({ top: y, behavior: 'smooth' });
        if (history.replaceState) history.replaceState(null, '', '#' + id);
      });
    });
    if (!('IntersectionObserver' in window)) return;
    var secs = links.map(function (a) { return d.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-20% 0px -50% 0px' });
    secs.forEach(function (s) { io.observe(s); });
    // la última sección es corta y nunca cruza la banda: al llegar al final, es ella
    window.addEventListener('scroll', function () {
      if (window.pageYOffset + window.innerHeight < d.documentElement.scrollHeight - 2) return;
      var last = secs[secs.length - 1];
      if (last) links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + last.id); });
    }, { passive: true });
  }

  /* ── 4. contacto ─────────────────────────────────────────────────────── */
  var WA = 'https://wa.me/5491124785477';
  var MAIL = 'hola@bloomlife.co';
  var IG = 'https://www.instagram.com/bloomlife.arg/';

  function contacto() {
    if (path !== '/contacto') return;
    // el "botón de arrepentimiento" del footer llega acá con esta query y el
    // tema arma un formulario distinto: en ese caso no se toca nada
    if (/order_cancellation/.test(location.search)) return;
    var sec = d.querySelector('section.contact-page');
    var form = sec && sec.querySelector('form#contact-form');
    if (!form || !form.querySelector('[name="message"]')) return;

    var root = el('div', 'blp blp-con');
    root.innerHTML =
      '<div class="blp-band blp-hero bli-hero-compact"><div class="blp-in">' +
        '<div class="blp-rule"></div>' +
        '<div class="blp-kicker">HABLEMOS</div>' +
        '<h1 class="blp-h1">Estamos <span class="blp-em">del otro lado.</span></h1>' +
        '<div class="blp-hero-sub">Una duda antes de comprar, un pedido en camino, una rutina que querés armar. Escribinos por donde te quede más cómodo: respondemos rápido y con cercanía.</div>' +
      '</div></div>' +
      '<div class="blp-band bli-sand"><div class="blp-in"><div class="bli-grid2">' +
        '<div>' +
          '<div class="blp-eyebrow">Tres canales</div>' +
          '<h2 class="blp-h2">Elegí el tuyo.</h2>' +
          '<div class="bli-channels">' +
            '<a class="bli-ch" href="' + WA + '" target="_blank" rel="noopener"><span><span class="bli-ch-k">WhatsApp · el más rápido</span><span class="bli-ch-v" style="display:block">+54 9 11 2478-5477</span><span class="bli-ch-t" style="display:block">Consultas rápidas, pedidos y cambios de dirección.</span></span><span class="bli-ch-a">→</span></a>' +
            '<a class="bli-ch" href="mailto:' + MAIL + '"><span><span class="bli-ch-k">Mail</span><span class="bli-ch-v" style="display:block">' + MAIL + '</span><span class="bli-ch-t" style="display:block">Cambios, devoluciones y consultas más largas.</span></span><span class="bli-ch-a">→</span></a>' +
            '<a class="bli-ch" href="' + IG + '" target="_blank" rel="noopener"><span><span class="bli-ch-k">Instagram</span><span class="bli-ch-v" style="display:block">@bloomlife.arg</span><span class="bli-ch-t" style="display:block">Novedades, contenido y mensajes directos.</span></span><span class="bli-ch-a">→</span></a>' +
          '</div>' +
        '</div>' +
        '<div class="bli-formcard">' +
          '<div class="bli-form-h">Dejanos tu mensaje</div>' +
          '<div class="bli-form-t">Te respondemos por mail. Si es sobre un pedido, incluí el número.</div>' +
          '<div class="bli-formhost"></div>' +
          '<div class="bli-form-note">Tus datos se usan solo para responderte. Nada de listas ni promociones sin tu permiso.</div>' +
        '</div>' +
      '</div></div></div>' +
      '<div class="blp-band bli-white"><div class="blp-in"><div class="bli-2col">' +
        '<div>' +
          '<div class="blp-eyebrow">Quizá ya está respondido</div>' +
          '<h2 class="blp-h2">Lo que más nos preguntan.</h2>' +
          '<div class="bli-sub">Las respuestas cortas están acá; las largas, en las preguntas frecuentes.</div>' +
        '</div>' +
        '<div class="bli-links">' +
          '<a href="https://www.bloomlife.co/preguntas-frecuentes/#envios"><span>¿Cuánto tarda el envío y cómo lo sigo?</span><span>→</span></a>' +
          '<a href="https://www.bloomlife.co/preguntas-frecuentes/#suscripciones"><span>¿Cómo funciona la suscripción con 10% OFF?</span><span>→</span></a>' +
          '<a href="https://www.bloomlife.co/politica-de-devolucion/"><span>Quiero cambiar o devolver un producto</span><span>→</span></a>' +
          '<a href="https://www.bloomlife.co/preguntas-frecuentes/#productos"><span>¿Cuándo tomar cada adaptógeno y se pueden combinar?</span><span>→</span></a>' +
          '<a href="https://www.bloomlife.co/preguntas-frecuentes/#pago"><span>¿Qué medios de pago y cuotas aceptan?</span><span>→</span></a>' +
        '</div>' +
      '</div></div></div>' +
      '<div class="blp-band blp-final"><div class="blp-in">' +
        '<h2 class="blp-h2">Elegí por cómo querés sentirte.</h2>' +
        '<div class="blp-final-sub">Si todavía no sabés cuál es para vos, empezá por el beneficio que buscás.</div>' +
        '<div class="blp-next bli-next5">' +
          '<a href="https://www.bloomlife.co/foco/"><span class="blp-nx-n">Foco<span class="blp-nx-a">→</span></span><span class="blp-nx-t">Claridad mental.</span></a>' +
          '<a href="https://www.bloomlife.co/calma/"><span class="blp-nx-n">Calma<span class="blp-nx-a">→</span></span><span class="blp-nx-t">Menos ansiedad y estrés.</span></a>' +
          '<a href="https://www.bloomlife.co/energia/"><span class="blp-nx-n">Energía<span class="blp-nx-a">→</span></span><span class="blp-nx-t">Estable, sin picos.</span></a>' +
          '<a href="https://www.bloomlife.co/descanso/"><span class="blp-nx-n">Descanso<span class="blp-nx-a">→</span></span><span class="blp-nx-t">Recuperate de verdad.</span></a>' +
          '<a href="https://www.bloomlife.co/piel/"><span class="blp-nx-n">Piel<span class="blp-nx-a">→</span></span><span class="blp-nx-t">Hidratación desde adentro.</span></a>' +
        '</div>' +
      '</div></div>';

    // el h1 nativo de la página ("Contacto") duplicaría el del hero
    var ph = d.querySelector('.page-header[data-store="page-title"]');
    if (ph) ph.style.display = 'none';

    sec.parentNode.insertBefore(root, sec);
    var host = root.querySelector('.bli-formhost');
    // si el tema dejó un aviso de enviado/error en la sección (vuelve del POST
    // con la página recargada), viaja con el formulario para que se vea
    Array.prototype.forEach.call(sec.querySelectorAll('.alert, [class*="form-alert"], [class*="message"]'), function (al) {
      if (!form.contains(al)) host.appendChild(al);
    });
    host.appendChild(form);   // el nodo entero, intacto
    sec.style.display = 'none';
  }

  function init() {
    try { acordeon(); } catch (e) {}
    try { buscador(); } catch (e) {}
    try { chips(); } catch (e) {}
    try { contacto(); } catch (e) {}
    if (typeof window.blpDone === 'function') window.blpDone();
    // deep link (#suscripciones, #envios…): el navegador saltó con todo abierto y
    // después el acordeón plegó; recolocar sobre la sección ya plegada
    try {
      var hs = location.hash && d.querySelector('.bli-sec' + location.hash);
      if (hs) setTimeout(function () { hs.scrollIntoView(); }, 60);
    } catch (e) {}
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init);
  else init();
})();
