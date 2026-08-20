/* VARIANTE SEED del menú — SOLO PARA COMPARAR. No está pinneada en el seal.
 *
 * Misma plomería que js/menu-nav.js (guard invertido, guard por geometría, los
 * 4 JSON de raw.githubusercontent, resolver del propio currentScript.src,
 * drawer propio). Lo único que cambia es el RENDER del panel.
 *
 * QUÉ CAMBIA Y POR QUÉ
 * La versión viva usa 3 columnas simultáneas al estilo Dirtea. Con 8 productos
 * reales eso obliga a rellenar: la columna "Por objetivo" son los mismos 8
 * recortados otra vez, que es justo el pecado del menú nativo que salimos a
 * arreglar.
 *
 * Seed lista 7 productos en UNA columna angosta, con miniatura grande, y mete la
 * profundidad como secciones secundarias bajo labels chicos. Nuestro catálogo
 * tiene ese tamaño, no el de Dirtea. Y usa el inventario de fotos que tenemos:
 * packshots, sin personas.
 *
 * Lo único que Seed puede tirar y nosotros no es el eje de beneficio: sus
 * nombres YA son el beneficio ("Sleep + Restore"), los nuestros son ingredientes
 * ("Reishi"). Así que el eje se queda, pero como lista secundaria de texto — que
 * es un patrón de Seed mismo (su bloque "REFERENCE").
 *
 * Los combos van donde Seed pone su "Daily Essentials Duo" con el pill de
 * "Save 25%": en la misma lista que los simples, con badge. Mejor que una
 * columna aparte, porque pone el combo AL LADO del single, que es donde la
 * comparación pasa de verdad.
 */
(function () {
  'use strict';

  var ID = 'bls-menu';
  var ID_DRAWER = 'bls-drawer';
  var COL_NATIVA = '.js-desktop-nav-col';
  var UL_NATIVO = '.js-nav-desktop-list';
  var HEADER = '.js-head-main';
  var FILA = '.js-head-logo-row';
  var BURGER_NATIVO = '.js-head-logo-row .js-utility-col.col-utility';
  var MODAL_NATIVO = '#nav-hamburger';

  var RAW = 'https://raw.githubusercontent.com/BloomLifeArg/bloomlife-static/main/data/';
  var self = document.currentScript;
  function resolver(rel) { try { return new URL(rel, self.src).href; } catch (e) { return null; } }

  var TIMEOUT_MS = 3000;
  var DESKTOP_MIN = 768;
  /* NIVEL 1 de la variante: CUATRO entradas, no tres.
     Al renderizar la primera versión apareció el límite real del modelo Seed: su
     panel angosto entra porque muestran 7 productos y NADA más. Nosotros queríamos
     5 adaptógenos + 3 combos + 5 objetivos + la promo de suscripción: pedía 840px
     contra los 630 de 70vh. Un dropdown de desktop que scrollea es mala UX — el
     mouse se va del panel y se cierra.

     La salida no es recortar: es dividir. Un panel por familia, que es justo lo
     que hace Seed (Shop / Science / Learn, tres paneles). Y de paso resuelve algo
     que ninguna columna resolvía: los combos son el 76% del catálogo y dejan de
     estar subordinados.

     Ojo: "Adaptógenos" y "Combos" NO son dos recortes del mismo catálogo —son
     conjuntos disjuntos—, así que esto no repite el pecado del menú nativo, donde
     los tres ejes eran los mismos 34 productos tres veces.

     La suscripción sale del panel: ya es una entrada del nivel 1, y Seed no mete
     bloques de promo adentro de sus paneles. */
  /* "Tienda" y no "Adaptógenos": decisión de Sergio, y tiene razón — a alguien que
     llega de Instagram sin saber qué es un adaptógeno, "Tienda" le habla y
     "Adaptógenos" no.
     El costo es un agujero lógico: con "Tienda" y "Combos" como pares, se puede
     leer que los combos NO están en la tienda. Se tapa con el label "Los
     adaptógenos" arriba de la lista, así el panel se lee como UNA SECCIÓN de la
     tienda y no como la tienda entera. Es el mismo patrón de labels de Seed. */
  var NIVEL1 = [
    { texto: 'Tienda', panel: 'adaptogenos' },
    { texto: 'Combos', panel: 'combos' },
    { texto: 'Suscripción mensual', href: 'https://www.bloomlife.co/suscripciones/' },
    { texto: 'Blog', panel: 'blog' }
  ];

  var HREFS = {
    melena: 'https://www.bloomlife.co/productos/melena-de-leon-claridad-mental-gummies/',
    ashwagandha: 'https://www.bloomlife.co/productos/ashwagandha-equilibrio-hormonal-gummies/',
    cordyceps: 'https://www.bloomlife.co/productos/cordyceps-energia-sostenida-gummies/',
    reishi: 'https://www.bloomlife.co/productos/reishi-descanso-profundo-gummies-kjqoe/',
    tremella: 'https://www.bloomlife.co/productos/tremella-hongo-de-la-belleza-gummies-1n9ff/'
  };
  var ORDEN = ['melena', 'ashwagandha', 'cordyceps', 'reishi', 'tremella'];

  var datos = null;
  var abierta = null; /* índice del panel abierto, o null */
  var HOVERABLE = !(window.matchMedia && window.matchMedia('(hover: none)').matches);

  var CRITICO =
    '.bls{font-family:Dosis,system-ui,sans-serif}' +
    '.bls__barra{display:flex;align-items:center;gap:26px;margin:0;padding:0;list-style:none}' +
    '.bls__barra>li{position:relative}' +
    '.bls__n1{display:inline-block;padding:7px 0;border:0;background:none;' +
    'font:600 15px/1 Dosis,system-ui,sans-serif;color:#1A1A1A;text-decoration:none;' +
    'cursor:pointer;white-space:nowrap;position:relative}' +
    '.bls__panel,.bls__drawer{visibility:hidden}' +
    '.bls__burger{display:none;width:40px;height:40px;border:0;background:none;padding:10px 8px;cursor:pointer}' +
    '.bls__burger span{display:block;height:1.5px;background:#1A1A1A;border-radius:2px}' +
    '.bls__burger span+span{margin-top:5px}' +
    '@media(max-width:767.98px){.bls{display:none}.bls__burger{display:block}}';

  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }

  function estiloCritico() {
    if (document.getElementById('bls-critico')) return;
    var s = document.createElement('style'); s.id = 'bls-critico'; s.textContent = CRITICO;
    document.head.appendChild(s);
  }
  function cargarCSS() {
    if (document.querySelector('link[data-bls]')) return;
    var h = resolver('../css/menu-nav.css'); if (!h) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h;
    l.setAttribute('data-bls', ''); document.head.appendChild(l);
  }

  function traer(a) {
    var c = typeof AbortController === 'function' ? new AbortController() : null;
    var t = setTimeout(function () { if (c) c.abort(); }, TIMEOUT_MS);
    return fetch(RAW + a, c ? { signal: c.signal } : undefined)
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { clearTimeout(t); return j; })
      .catch(function () { clearTimeout(t); return null; });
  }

  function chico(u) { return u ? u.replace(/-(\d{3,4})-0(\.[a-z]{3,4})(\?.*)?$/i, '-320-0$2$3') : u; }

  /* ── filas ──────────────────────────────────────────────────────────────── */

  function fila(it, badge, sec) {
    var a = el('a', 'bls__item');
    a.href = it.href;
    if (it.img) {
      var f = el('span', 'bls__foto');
      var im = document.createElement('img');
      im.src = it.img; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
      im.width = 80; im.height = 80;
      f.appendChild(im); a.appendChild(f);
    }
    var t = el('span', 'bls__txt');
    if (badge) t.appendChild(el('span', 'bls__badge', badge));
    t.appendChild(el('span', 'bls__nombre', it.nombre));
    if (it.bajada) t.appendChild(el('span', 'bls__bajada', it.bajada));
    a.appendChild(t);
    var li = el('li'); li.appendChild(a); return li;
  }

  function adaptogenos() {
    var d = datos || {};
    var a = d.adaptogenos && d.adaptogenos.items;
    var baj = (d.nav && d.nav.columnas && d.nav.columnas.adaptogenos && d.nav.columnas.adaptogenos.bajadas) || {};
    if (!a) return [];
    return ORDEN.filter(function (k) { return a[k]; }).map(function (k) {
      return { nombre: a[k].nombre, bajada: baj[k] || '', href: HREFS[k] || '#',
               img: resolver('../img/menu/' + a[k].archivo) };
    });
  }

  function combos() {
    var c = datos && datos.combos && datos.combos.items;
    if (!c) return [];
    return c.map(function (i) {
      return { nombre: i.nombre, bajada: i.bajada, href: i.href, img: chico(i.imagen) };
    });
  }

  function objetivos() {
    var b = datos && datos.beneficios && datos.beneficios.cards;
    return b ? b.map(function (i) { return { nombre: i.titulo, href: i.href }; }) : [];
  }

  /* ── panel de Tienda ────────────────────────────────────────────────────── */

  function panelAdaptogenos() {
    var p = el('div', 'bls__panel');
    var meta = (datos && datos.nav && datos.nav.columnas) || {};
    p.appendChild(el('p', 'bls__label bls__label--top', 'Los adaptógenos'));
    var ul = el('ul', 'bls__lista');
    adaptogenos().forEach(function (it) { ul.appendChild(fila(it, null, false)); });
    p.appendChild(ul);

    /* El eje de objetivo se queda —nuestros nombres son ingredientes, no
       beneficios como los de Seed— pero como chips en UNA línea. Cinco filas
       con foto ahí habrían sumado 480px para decir lo que el nombre ya dice. */
    var obj = objetivos();
    if (obj.length) {
      p.appendChild(el('p', 'bls__label', 'Por objetivo'));
      var box = el('div', 'bls__inline');
      obj.forEach(function (o) { var a = el('a', 'bls__chip', o.nombre); a.href = o.href; box.appendChild(a); });
      p.appendChild(box);
    }

    var pie = el('div', 'bls__pie');
    var v1 = el('a', 'bls__vertodo', 'Ver los 8');
    v1.href = ((meta.adaptogenos && meta.adaptogenos.pie && meta.adaptogenos.pie[0]) || {}).href
      || 'https://www.bloomlife.co/elegi-tu-suplemento/';
    var v2 = el('a', 'bls__vertodo', 'También en cápsulas');
    v2.href = ((meta.adaptogenos && meta.adaptogenos.pie && meta.adaptogenos.pie[1]) || {}).href
      || 'https://www.bloomlife.co/tipo-de-adaptogenos/capsulas1/';
    pie.appendChild(v1); pie.appendChild(v2);
    p.appendChild(pie);
    return p;
  }

  function panelCombos() {
    var cs = combos();
    if (!cs.length) return null;
    var p = el('div', 'bls__panel');
    var ul = el('ul', 'bls__lista');
    cs.forEach(function (it) { ul.appendChild(fila(it, null, false)); });
    p.appendChild(ul);
    var pie = el('div', 'bls__pie');
    var v = el('a', 'bls__vertodo', 'Ver los 26 combos');
    var meta = (datos && datos.nav && datos.nav.columnas) || {};
    v.href = ((meta.combos && meta.combos.pie && meta.combos.pie[0]) || {}).href
      || 'https://www.bloomlife.co/elegi-tu-suplemento/combos-bienestar-integral/';
    pie.appendChild(v); p.appendChild(pie);
    return p;
  }

  /* ── panel de Blog: las 3 notas, del JSON que ya se regenera solo ───────── */

  function panelBlog() {
    var posts = (datos && datos.blog && datos.blog.posts) || [];
    if (!posts.length) return null;
    var p = el('div', 'bls__panel');
    p.appendChild(el('p', 'bls__label', 'Últimas notas'));
    var ul = el('ul', 'bls__lista');
    posts.slice(0, 3).forEach(function (n) {
      ul.appendChild(fila({
        nombre: n.title,
        bajada: (n.summary || '').slice(0, 92) + ((n.summary || '').length > 92 ? '…' : ''),
        href: n.url.indexOf('http') === 0 ? n.url : 'https://www.bloomlife.co' + n.url,
        img: n.image
      }, null, false));
    });
    p.appendChild(ul);
    var pie = el('div', 'bls__pie');
    var v = el('a', 'bls__vertodo', 'Ver todo el blog');
    v.href = 'https://www.bloomlife.co/blog/';
    pie.appendChild(v); p.appendChild(pie);
    return p;
  }

  /* ── barra ──────────────────────────────────────────────────────────────── */

  function abrir(i) {
    abierta = i;
    [].forEach.call(document.querySelectorAll('#' + ID + ' .bls__li'), function (li, k) {
      li.classList.toggle('is-open', k === i);
      var b = li.querySelector('.bls__n1[aria-expanded]');
      if (b) b.setAttribute('aria-expanded', k === i ? 'true' : 'false');
    });
  }

  function pintarBarra() {
    var barra = el('ul', 'bls__barra');
    NIVEL1.forEach(function (it, i) {
      var li = el('li', 'bls__li');
      var panel = it.panel === 'adaptogenos' ? panelAdaptogenos()
                : it.panel === 'combos' ? panelCombos()
                : it.panel === 'blog' ? panelBlog() : null;
      var nodo;
      if (panel) {
        nodo = el('button', 'bls__n1', it.texto);
        nodo.type = 'button';
        nodo.setAttribute('aria-expanded', 'false');
        nodo.addEventListener('click', function (e) { e.preventDefault(); abrir(abierta === i ? null : i); });
        if (HOVERABLE) nodo.addEventListener('mouseenter', function () { abrir(i); });
        li.appendChild(nodo);
        li.appendChild(panel);
        if (HOVERABLE) li.addEventListener('mouseleave', function () { if (abierta === i) abrir(null); });
      } else {
        nodo = el('a', 'bls__n1', it.texto);
        nodo.href = it.href;
        if (HOVERABLE) nodo.addEventListener('mouseenter', function () { abrir(null); });
        li.appendChild(nodo);
      }
      barra.appendChild(li);
    });
    return barra;
  }

  /* ── mobile ─────────────────────────────────────────────────────────────── */

  function abrirDrawer(v) {
    var d = document.getElementById(ID_DRAWER); if (!d) return;
    d.classList.toggle('is-open', v);
    d.setAttribute('aria-hidden', v ? 'false' : 'true');
    var velo = document.querySelector('.bls__velo'); if (velo) velo.classList.toggle('is-open', v);
    document.documentElement.style.overflow = v ? 'hidden' : '';
  }

  function contenidoDrawer(d) {
    d.innerHTML = '';
    var c = el('button', 'bls__cerrar'); c.type = 'button';
    c.setAttribute('aria-label', 'Cerrar menú'); c.innerHTML = '&times;';
    c.addEventListener('click', function () { abrirDrawer(false); });
    d.appendChild(c);
    [panelAdaptogenos(), panelCombos()].forEach(function (t) {
      if (!t) return;
      t.className = ''; /* en el drawer no es panel flotante: es el contenido */
      d.appendChild(t);
    });
    /* En el drawer, las entradas que en desktop abren panel de PRODUCTO ya están
       arriba como contenido. Las demás van como links: las que tienen href y
       también el Blog, cuyo panel de 3 notas no se usa acá.
       Sin este último caso el Blog quedaba INALCANZABLE en mobile: el filtro
       descartaba todo lo que tuviera panel. */
    var dir = el('ul', 'bls__dir');
    NIVEL1.forEach(function (i) {
      var href = i.href || (i.panel === 'blog' ? 'https://www.bloomlife.co/blog/' : null);
      if (!href) return;
      var li = el('li'); var a = el('a', null, i.texto); a.href = href;
      li.appendChild(a); dir.appendChild(li);
    });
    d.appendChild(dir);
  }

  /* ── montaje ────────────────────────────────────────────────────────────── */

  function montar() {
    if (document.getElementById(ID)) return;
    var h = document.querySelector(HEADER);
    if (!h || h.offsetParent === null) return;

    var col = document.querySelector(COL_NATIVA);
    if (col && col.parentNode) {
      var raiz = el('nav', 'bls'); raiz.id = ID;
      raiz.setAttribute('aria-label', 'Navegación principal');
      raiz.appendChild(pintarBarra());
      col.parentNode.insertBefore(raiz, col);
      var ul = document.querySelector(UL_NATIVO); if (ul) ul.style.display = 'none';
      col.style.display = 'none';
    }

    var fila0 = document.querySelector(FILA + ' .row');
    if (fila0 && !document.getElementById(ID_DRAWER)) {
      var b = el('button', 'bls__burger'); b.type = 'button';
      b.setAttribute('aria-label', 'Abrir menú');
      b.innerHTML = '<span></span><span></span><span></span>';
      b.addEventListener('click', function () { abrirDrawer(true); });
      fila0.insertBefore(b, fila0.firstChild);

      var velo = el('div', 'bls__velo');
      velo.addEventListener('click', function () { abrirDrawer(false); });
      var dr = el('div', 'bls__drawer'); dr.id = ID_DRAWER; dr.setAttribute('aria-hidden', 'true');
      contenidoDrawer(dr);
      document.body.appendChild(velo); document.body.appendChild(dr);

      var bn = document.querySelector(BURGER_NATIVO); if (bn) bn.style.display = 'none';
      var mn = document.querySelector(MODAL_NATIVO); if (mn) mn.style.display = 'none';
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { abrir(null); abrirDrawer(false); }
    });
    document.addEventListener('click', function (e) {
      var r = document.getElementById(ID);
      if (abierta !== null && r && !r.contains(e.target)) abrir(null);
    });
  }

  function refrescar() {
    var r = document.getElementById(ID);
    if (r) { var v = r.querySelector('.bls__barra'); if (v) r.replaceChild(pintarBarra(), v); }
    var d = document.getElementById(ID_DRAWER); if (d) contenidoDrawer(d);
  }

  function arrancar() {
    estiloCritico(); cargarCSS(); montar();
    Promise.all([traer('menu-nav.json'), traer('menu-adaptogenos.json'),
                 traer('combos-menu.json'), traer('beneficios-home.json'),
                 traer('blog-latest.json')])
      .then(function (r) {
        datos = { nav: r[0], adaptogenos: r[1], combos: r[2], beneficios: r[3], blog: r[4] };
        if (!document.getElementById(ID)) montar(); else refrescar();
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
