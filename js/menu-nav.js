/* Menú de navegación de bloomlife.co — megamenú desktop + drawer mobile propio.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ESTE ARCHIVO CORRE EN TODAS LAS PÁGINAS DEL SITIO. No es una sección del home.
 * Si se rompe, no falta un bloque: se cae la navegación entera. Tratar con más
 * cuidado que cualquier otro script del proyecto.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * QUÉ REEMPLAZA
 * Los tres desplegables nativos "Elegí tu suplemento / beneficio / formato" eran
 * tres recortes del MISMO catálogo (34 productos: 8 monoingrediente + 26 combos)
 * y se excluían entre sí. Acá los tres ejes conviven como columnas simultáneas de
 * un solo panel, como en Dirtea. El nivel 1 pasa de 4 imperativas repetidas a
 * tres destinos distintos.
 *
 * EL GUARD INVERTIDO — la regla dura de esta área
 * El nav nativo lo oculta ESTE script, recién después de tener el nuestro en el
 * DOM. NUNCA por CSS que viaje aparte. Motivo: si jsDelivr falla (ya pasó, 7
 * minutos con dos secciones caídas porque cacheó un 404), el usuario tiene que
 * ver el menú viejo, no un sitio sin navegación en todas las páginas.
 *
 * LA VENTANA DE 800ms
 * El tema deja .js-desktop-nav-col en visibility:hidden y la revela con un
 * setTimeout(250) que en la práctica cae a los ~798ms (medido frame a frame en
 * el sitio vivo). Si montamos antes, el usuario nunca ve el nav viejo: no hay
 * flash que evitar, hay una ventana que aprovechar. Por eso el nivel 1 se dibuja
 * SIN esperar ningún fetch, desde las constantes de abajo. Los datos de las
 * columnas llegan después y no bloquean nada: el panel no se ve hasta que
 * alguien lo abre.
 *
 * OCULTAR, JAMÁS BORRAR
 * El <ul> nativo se oculta con display:none y se queda en el DOM. Sus 26 links
 * de desktop + 36 del drawer son el grafo de linkeo interno que ve el crawler.
 * Borrarlos sería tirar SEO a la basura.
 *
 * LOS HANDLERS DEL TEMA MUEREN SOLOS
 * Morelia ata sus handlers de nav directo al nodo con jQueryNuvem(...).click(),
 * sin delegación desde document. Al ocultar sus nodos y montar los nuestros no
 * hay que neutralizar nada, y el buscador y el drawer del carrito no comparten
 * un solo handler con el nav. Verificado leyendo el bundle inline del tema.
 *
 * DOS MONTAJES, NO UNO
 * El nav mobile del tema NO vive en el header: está en #nav-hamburger, un modal
 * fuera de </header>, dentro del sistema genérico de modales que comparte con el
 * carrito. Por eso armamos drawer propio y botón propio en vez de reusar ese
 * modal: no queremos tocar el sistema de modales del carrito.
 *
 * MOBILE: ACORDEÓN, NO PANEL-REEMPLAZO
 * El drawer del tema tapa cada nivel con el siguiente (js-toggle-menu-back), así
 * que perdés de vista a los hermanos y llegar a un producto son 6 toques. Acá las
 * tres columnas son acordeones: se abren en su lugar y el resto sigue visible.
 *
 * EL COPY Y LOS DATOS NO VIVEN ACÁ
 *   data/menu-nav.json          nivel 1, títulos de columna, destacado
 *   data/menu-adaptogenos.json  las 5 fotos + su filete (build_menu_adaptogenos.py)
 *   data/combos-menu.json       la columna de combos (Action horaria: sigue al home)
 *   data/beneficios-home.json   la columna de objetivos (la misma del home)
 * Los cuatro se leen de raw.githubusercontent (CORS *, cache 5 min) y NO de
 * jsDelivr, que cachea las rutas de rama hasta 7 días — justo lo contrario de lo
 * que necesita un archivo pensado para cambiar.
 *
 * Ver ESTADO_MENU.md en el repo del tema.
 */
(function () {
  'use strict';

  var ID = 'bl-menu';
  var ID_DRAWER = 'bl-menu-drawer';
  var COL_NATIVA = '.js-desktop-nav-col';
  var UL_NATIVO = '.js-nav-desktop-list';
  var HEADER = '.js-head-main';
  var FILA = '.js-head-logo-row';
  var BURGER_NATIVO = '.js-head-logo-row .js-utility-col.col-utility';
  var MODAL_NATIVO = '#nav-hamburger';

  var RAW = 'https://raw.githubusercontent.com/BloomLifeArg/bloomlife-static/main/data/';

  /* El CSS y las imágenes viven al lado de este archivo, en ../css/ y ../img/.
     Derivarlos del propio src los mantiene pinneados al MISMO commit sin
     repetir el hash en ninguna parte y sin el huevo-y-gallina de tener que
     conocer el hash del commit que estás por hacer. Mismo patrón que
     beneficios-home.js. */
  var self = document.currentScript;

  function resolver(rel) {
    try { return new URL(rel, self.src).href; } catch (e) { return null; }
  }
  var TIMEOUT_MS = 3000;
  var DESKTOP_MIN = 768; /* mismo umbral que el tema para que no haya un ancho en
                            el que se vean los dos o ninguno. El tema usa
                            innerWidth > 768 (off-by-one propio) pero su CSS
                            muestra la columna desde 768: mandamos sobre el CSS. */

  /* Nivel 1 de emergencia. Si el JSON no llega, el usuario navega igual.
     Tiene que quedar en sync con data/menu-nav.json. */
  var FALLBACK_N1 = [
    { texto: 'Tienda', panel: true },
    { texto: 'Suscripción', href: 'https://www.bloomlife.co/suscripciones/' },
    { texto: 'Blog', href: 'https://www.bloomlife.co/blog/' }
  ];

  var datos = null;
  var abierto = false;
  /* "Fijado" = abierto por click o por teclado, no por hover.
     Sin esta distinción el hover y el click se pelean: pasás el mouse por
     "Tienda" → se abre; hacés click → el toggle lo cierra. El usuario ve que el
     panel se cierra justo cuando lo clickea. Con el flag, el hover abre suelto,
     el click fija, y mouseleave solo cierra lo que no está fijado. */
  var fijado = false;
  var HOVERABLE = !(window.matchMedia && window.matchMedia('(hover: none)').matches);

  /* CSS crítico de la BARRA, inline. El resto (panel, drawer, destacado) va por
     <link> asíncrono, porque nada de eso se ve hasta que el usuario abre algo.
     La barra sí se ve al instante: sin esto habría un flash de nav sin estilo en
     el header de todas las páginas. Son ~700 bytes, no un stylesheet completo. */
  var CRITICO =
    '.bl-menu{font-family:Dosis,system-ui,sans-serif}' +
    '.bl-menu__barra{display:flex;align-items:center;gap:28px;margin:0;padding:0;list-style:none}' +
    '.bl-menu__n1{display:inline-block;padding:6px 0;border:0;background:none;' +
    'font:600 15px/1 Dosis,system-ui,sans-serif;color:#1A1A1A;text-decoration:none;' +
    'cursor:pointer;white-space:nowrap;position:relative}' +
    '.bl-menu__panel,.bl-menu__drawer{visibility:hidden}' +
    '.bl-menu__burger{display:none;width:40px;height:40px;border:0;background:none;padding:10px 8px;cursor:pointer}' +
    '.bl-menu__burger span{display:block;height:1.5px;background:#1A1A1A;border-radius:2px}' +
    '.bl-menu__burger span+span{margin-top:5px}' +
    '@media(max-width:767.98px){.bl-menu{display:none}.bl-menu__burger{display:block}}';

  function estiloCritico() {
    if (document.getElementById('bl-menu-critico')) return;
    var st = document.createElement('style');
    st.id = 'bl-menu-critico';
    st.textContent = CRITICO;
    document.head.appendChild(st);
  }

  function cargarCSS() {
    if (document.querySelector('link[data-bl-menu]')) return;
    var href = resolver('../css/menu-nav.css');
    if (!href) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.setAttribute('data-bl-menu', '');
    document.head.appendChild(l);
  }

  /* ── utilidades ─────────────────────────────────────────────────────────── */

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function traer(archivo) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);
    return fetch(RAW + archivo, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { clearTimeout(t); return j; })
      .catch(function () { clearTimeout(t); return null; });
  }

  function esDesktop() { return window.innerWidth >= DESKTOP_MIN; }

  /* Las fotos de combos salen del og:image de cada producto, que el CDN de TN
     sirve a 640px: 47,5 KB para un thumb de 46px. El mismo archivo a 320 pesa
     15,7 KB — 5 combos pasan de 238 KB a 78 KB. Ojo: TN NO sirve cualquier
     tamaño (-160-0 devuelve 403), así que se usa 320, que es la mitad exacta del
     que viene y está siempre disponible. Si el patrón no matchea, se deja la URL
     original: mejor una foto grande que ninguna. */
  function chico(url) {
    if (!url) return url;
    return url.replace(/-(\d{3,4})-0(\.[a-z]{3,4})(\?.*)?$/i, '-320-0$2$3');
  }

  /* El slug sale del nombre del archivo del JSON de beneficios
     (beneficio-foco.jpg → foco), no del título: el título es copy y puede
     cambiar sin que cambie el archivo. */
  function slugObjetivo(card) {
    var m = /beneficio-([a-z]+)\./.exec(card.imagen || '');
    return m ? m[1] : 'foco';
  }

  /* ── el panel (desktop) y los acordeones (mobile) comparten los datos ───── */

  function filas(col) {
    /* Devuelve [{nombre, bajada, href, img, filete}] para una de las tres
       columnas, o [] si su fuente no llegó. Cada columna tiene su propia forma
       porque cada una la genera un proceso distinto: no unificarlas a la fuerza. */
    var d = datos || {};
    if (col === 'adaptogenos') {
      var a = d.adaptogenos && d.adaptogenos.items;
      var baj = (d.nav && d.nav.columnas && d.nav.columnas.adaptogenos && d.nav.columnas.adaptogenos.bajadas) || {};
      if (!a) return [];
      return ['melena', 'ashwagandha', 'cordyceps', 'reishi', 'tremella']
        .filter(function (k) { return a[k]; })
        .map(function (k) {
          return {
            nombre: a[k].nombre,
            bajada: baj[k] || '',
            href: (d.hrefs && d.hrefs[k]) || '#',
            img: resolver('../img/menu/' + a[k].archivo),
            filete: a[k].filete
          };
        });
    }
    if (col === 'combos') {
      var c = d.combos && d.combos.items;
      if (!c) return [];
      return c.map(function (i) {
        return { nombre: i.nombre, bajada: i.bajada, href: i.href, img: chico(i.imagen), filete: null };
      });
    }
    var b = d.beneficios && d.beneficios.cards;
    if (!b) return [];
    /* Reusa el TRATAMIENTO de las 5 fotos de "Elegí por beneficio" del home,
       pero no los archivos: los del home son JPEG de 800x1066 (333 KB los cinco)
       y acá se ven a 46px. build_menu_adaptogenos.py emite miniaturas WebP
       cuadradas en img/menu/objetivo-<slug>.webp — 333 KB pasan a ~35 KB. Y sí
       importa: el panel está en visibility:hidden, no display:none, así que el
       browser baja las 15 fotos en el header de TODAS las páginas aunque nadie
       abra nada (medido: 15/15 requests sin abrir el panel). */
    return b.map(function (i) {
      return {
        nombre: i.titulo, bajada: i.tagline, href: i.href,
        img: resolver('../img/menu/objetivo-' + slugObjetivo(i) + '.webp'),
        filete: i.color
      };
    });
  }

  function pintarColumna(cont, clave, conFoto) {
    var meta = (datos && datos.nav && datos.nav.columnas && datos.nav.columnas[clave]) || {};
    var box = el('div', 'bl-menu__col');
    box.appendChild(el('p', 'bl-menu__coltitulo', meta.titulo || ''));
    var lista = el('ul', 'bl-menu__lista');
    var items = filas(clave);
    if (!items.length) {
      /* Sin datos todavía (o la fuente falló): la columna no se dibuja vacía,
         se dibuja un link a la categoría para que el camino nunca sea un
         callejón sin salida. */
      var pie0 = (meta.pie && meta.pie[0]) || null;
      if (pie0) {
        var li0 = el('li');
        var a0 = el('a', 'bl-menu__pie', pie0.texto);
        a0.href = pie0.href;
        li0.appendChild(a0);
        lista.appendChild(li0);
      }
      box.appendChild(lista);
      return box;
    }
    items.forEach(function (it) {
      var li = el('li');
      var a = el('a', 'bl-menu__item');
      a.href = it.href;
      if (it.filete) a.style.setProperty('--bl-menu-c', it.filete);
      if (conFoto && it.img) {
        var f = el('span', 'bl-menu__foto');
        var img = document.createElement('img');
        img.src = it.img;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.width = 56; img.height = 56;
        f.appendChild(img);
        a.appendChild(f);
      }
      var t = el('span', 'bl-menu__txt');
      t.appendChild(el('span', 'bl-menu__nombre', it.nombre));
      if (it.bajada) t.appendChild(el('span', 'bl-menu__bajada', it.bajada));
      a.appendChild(t);
      li.appendChild(a);
      lista.appendChild(li);
    });
    box.appendChild(lista);
    (meta.pie || []).forEach(function (p) {
      var a = el('a', 'bl-menu__pie', p.texto);
      a.href = p.href;
      box.appendChild(a);
    });
    return box;
  }

  function pintarDestacado() {
    var d = (datos && datos.nav && datos.nav.destacado) || null;
    if (!d) return null;
    var a = el('a', 'bl-menu__destacado');
    a.href = d.href;
    if (d.imagen) {
      /* La foto va por custom property y no por style.backgroundImage: el CSS
         necesita componer el velo oscuro Y la foto en el mismo background-image,
         y si el JS setea la propiedad directa gana él y se pierde el velo. */
      a.classList.add('bl-menu__destacado--foto');
      a.style.setProperty('--bl-menu-bg', 'url("' + resolver('../img/menu/' + d.imagen) + '")');
    }
    a.appendChild(el('span', 'bl-menu__deskicker', d.kicker));
    a.appendChild(el('span', 'bl-menu__destitulo', d.titulo));
    a.appendChild(el('span', 'bl-menu__desbajada', d.bajada));
    a.appendChild(el('span', 'bl-menu__descta', d.cta));
    return a;
  }

  function contenidoPanel() {
    var wrap = el('div', 'bl-menu__panelinner');
    wrap.appendChild(pintarColumna(wrap, 'adaptogenos', true));
    wrap.appendChild(pintarColumna(wrap, 'combos', true));
    wrap.appendChild(pintarColumna(wrap, 'objetivos', true));
    var des = pintarDestacado();
    if (des) wrap.appendChild(des);
    return wrap;
  }

  function refrescarPanel() {
    var p = document.querySelector('#' + ID + ' .bl-menu__panel');
    if (p) { p.innerHTML = ''; p.appendChild(contenidoPanel()); }
    var acc = document.querySelector('#' + ID_DRAWER + ' .bl-menu__accs');
    if (acc) { acc.innerHTML = ''; pintarAcordeones(acc); }
    /* El destacado del drawer NO se repintaba: al montar, datos todavía es null,
       así que pintarDestacado() devuelve null y nunca se agregó. En desktop no
       pasaba porque ahí se repinta el panel entero, que lo incluye. */
    var dr = document.getElementById(ID_DRAWER);
    if (dr) {
      var viejo = dr.querySelector('.bl-menu__destacado');
      if (viejo) viejo.remove();
      var nuevo = pintarDestacado();
      if (nuevo) dr.appendChild(nuevo);
    }
  }

  /* ── desktop ────────────────────────────────────────────────────────────── */

  function abrir(v) {
    var raiz = document.getElementById(ID);
    if (!raiz) return;
    abierto = v;
    raiz.classList.toggle('is-open', v);
    var b = raiz.querySelector('.bl-menu__n1[data-panel]');
    if (b) b.setAttribute('aria-expanded', v ? 'true' : 'false');
    if (v) altoPanel();
  }

  function altoPanel() {
    /* El tema calcula esto una sola vez al cargar y NO escucha resize; nosotros
       sí. El header es sticky (z-index 1040) y el panel cuelga de él. */
    var h = document.querySelector(HEADER);
    var p = document.querySelector('#' + ID + ' .bl-menu__panel');
    if (!h || !p) return;
    var libre = window.innerHeight - h.getBoundingClientRect().height - 24;
    p.style.maxHeight = Math.max(240, libre) + 'px';
  }

  function montarDesktop() {
    var col = document.querySelector(COL_NATIVA);
    if (!col || !col.parentNode) return false;

    var raiz = el('nav', 'bl-menu');
    raiz.id = ID;
    raiz.setAttribute('aria-label', 'Navegación principal');

    var barra = el('ul', 'bl-menu__barra');
    var n1 = (datos && datos.nav && datos.nav.nivel1) || FALLBACK_N1;
    n1.forEach(function (it) {
      var li = el('li');
      var nodo;
      if (it.panel) {
        nodo = el('button', 'bl-menu__n1', it.texto);
        nodo.type = 'button';
        nodo.setAttribute('data-panel', '');
        nodo.setAttribute('aria-expanded', 'false');
        nodo.addEventListener('click', function (e) {
          e.preventDefault();
          if (abierto && fijado) { fijado = false; abrir(false); }
          else { fijado = true; abrir(true); }
        });
        if (HOVERABLE) {
          nodo.addEventListener('mouseenter', function () { if (esDesktop()) abrir(true); });
        }
      } else {
        nodo = el('a', 'bl-menu__n1', it.texto);
        nodo.href = it.href;
        if (HOVERABLE) {
          nodo.addEventListener('mouseenter', function () { if (!fijado) abrir(false); });
        }
      }
      li.appendChild(nodo);
      barra.appendChild(li);
    });
    raiz.appendChild(barra);

    var panel = el('div', 'bl-menu__panel');
    panel.appendChild(contenidoPanel());
    panel.addEventListener('mouseleave', function () {
      if (esDesktop() && !fijado) abrir(false);
    });
    raiz.appendChild(panel);

    col.parentNode.insertBefore(raiz, col);

    /* ── acá y no antes: el nativo se oculta con el nuestro YA en el DOM ── */
    var ul = document.querySelector(UL_NATIVO);
    if (ul) ul.style.display = 'none';
    col.style.display = 'none';

    return true;
  }

  /* ── mobile ─────────────────────────────────────────────────────────────── */

  function pintarAcordeones(cont) {
    [['adaptogenos', true], ['combos', true], ['objetivos', true]].forEach(function (par) {
      var clave = par[0];
      var meta = (datos && datos.nav && datos.nav.columnas && datos.nav.columnas[clave]) || {};
      var det = el('details', 'bl-menu__acc');
      var sum = el('summary', 'bl-menu__accsum', meta.titulo || '');
      det.appendChild(sum);
      det.appendChild(pintarColumna(null, clave, par[1]));
      cont.appendChild(det);
    });
  }

  function abrirDrawer(v) {
    var d = document.getElementById(ID_DRAWER);
    if (!d) return;
    d.classList.toggle('is-open', v);
    d.setAttribute('aria-hidden', v ? 'false' : 'true');
    var velo = document.querySelector('.bl-menu__velo');
    if (velo) velo.classList.toggle('is-open', v);
    document.documentElement.style.overflow = v ? 'hidden' : '';
    var b = document.querySelector('.bl-menu__burger');
    if (b) b.setAttribute('aria-expanded', v ? 'true' : 'false');
    if (v) { var f = d.querySelector('a,button,summary'); if (f) f.focus(); }
  }

  function montarMobile() {
    var fila = document.querySelector(FILA + ' .row');
    if (!fila) return false;

    var btn = el('button', 'bl-menu__burger');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Abrir menú');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';
    btn.addEventListener('click', function () { abrirDrawer(true); });
    fila.insertBefore(btn, fila.firstChild);

    var d = el('div', 'bl-menu__drawer');
    d.id = ID_DRAWER;
    d.setAttribute('aria-hidden', 'true');
    var cerrar = el('button', 'bl-menu__cerrar');
    cerrar.type = 'button';
    cerrar.setAttribute('aria-label', 'Cerrar menú');
    cerrar.innerHTML = '&times;';
    cerrar.addEventListener('click', function () { abrirDrawer(false); });
    d.appendChild(cerrar);

    var directos = el('ul', 'bl-menu__directos');
    ((datos && datos.nav && datos.nav.nivel1) || FALLBACK_N1)
      .filter(function (i) { return !i.panel; })
      .forEach(function (i) {
        var li = el('li');
        var a = el('a', null, i.texto);
        a.href = i.href;
        li.appendChild(a);
        directos.appendChild(li);
      });

    var accs = el('div', 'bl-menu__accs');
    pintarAcordeones(accs);
    d.appendChild(accs);
    d.appendChild(directos);
    var des = pintarDestacado();
    if (des) d.appendChild(des);

    /* El velo va HERMANO del drawer, no adentro: el drawer se mueve con
       transform, y un position:fixed dentro de un ancestro transformado se
       posiciona contra ese ancestro en vez del viewport — el velo cubriría
       solo el ancho del drawer. */
    var velo = el('div', 'bl-menu__velo');
    velo.addEventListener('click', function () { abrirDrawer(false); });

    document.body.appendChild(velo);
    document.body.appendChild(d);

    /* ── ocultar el nativo, después de tener el nuestro ── */
    var bn = document.querySelector(BURGER_NATIVO);
    if (bn) bn.style.display = 'none';
    var mn = document.querySelector(MODAL_NATIVO);
    if (mn) mn.style.display = 'none';

    return true;
  }

  /* ── arranque ───────────────────────────────────────────────────────────── */

  function montar() {
    if (document.getElementById(ID)) return;

    var h = document.querySelector(HEADER);
    /* Guard por GEOMETRÍA, no por existencia: en /best-sellers el header existe
       en el DOM pero está tapado con display:none (landing 100% pauta), así que
       .js-desktop-nav-col se encuentra igual y montaríamos basura invisible. */
    if (!h || h.offsetParent === null) return;

    montarDesktop();
    montarMobile();

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      fijado = false;
      abrir(false);
      abrirDrawer(false);
      /* Devolver el foco al disparador: si el usuario abrió con teclado y cierra
         con Esc, el foco no puede quedar flotando en un panel invisible. */
      var b = document.querySelector('#' + ID + ' .bl-menu__n1[data-panel]');
      if (b && document.activeElement && document.activeElement.closest &&
          document.activeElement.closest('#' + ID)) b.focus();
    });
    document.addEventListener('click', function (e) {
      var raiz = document.getElementById(ID);
      if (abierto && raiz && !raiz.contains(e.target)) { fijado = false; abrir(false); }
    });
    window.addEventListener('resize', function () {
      if (abierto) altoPanel();
      if (esDesktop()) abrirDrawer(false);
    });
  }

  function arrancar() {
    estiloCritico();
    cargarCSS();
    montar();
    /* Los datos llegan después y NO bloquean el montaje: el panel no se ve hasta
       que alguien lo abre, así que refrescarlo a los 300ms es invisible. */
    Promise.all([
      traer('menu-nav.json'),
      traer('menu-adaptogenos.json'),
      traer('combos-menu.json'),
      traer('beneficios-home.json')
    ]).then(function (r) {
      datos = {
        nav: r[0], adaptogenos: r[1], combos: r[2], beneficios: r[3],
        hrefs: {
          melena: 'https://www.bloomlife.co/productos/melena-de-leon-claridad-mental-gummies/',
          ashwagandha: 'https://www.bloomlife.co/productos/ashwagandha-equilibrio-hormonal-gummies/',
          cordyceps: 'https://www.bloomlife.co/productos/cordyceps-energia-sostenida-gummies/',
          reishi: 'https://www.bloomlife.co/productos/reishi-descanso-profundo-gummies-kjqoe/',
          tremella: 'https://www.bloomlife.co/productos/tremella-hongo-de-la-belleza-gummies-1n9ff/'
        }
      };
      if (!document.getElementById(ID)) montar();
      else refrescarPanel();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();
