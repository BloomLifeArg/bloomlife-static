/* Sección "Testimonios" del home de bloomlife.co.
 *
 * Reemplaza al widget de reseñas de Revie por una sección editorial propia:
 * carrusel de 12 citas curadas sobre #003845, full-bleed.
 *
 * La app de Revie NO se toca: sigue instalada, sigue recolectando reseñas y
 * sigue funcionando en las fichas de producto. Acá solo se le oculta el widget
 * del home (`#revie-tn-widget`) con una regla que este script inyecta.
 *
 * EL COPY NO VIVE ACÁ: vive en data/testimonios-home.json, que se lee fresco en
 * cada carga (cache 5 min). Cambiar una cita, el conteo de reseñas o el título
 * es editar ese JSON y commitear — se ve en el home en <=5 min y NO hace falta
 * tocar el admin de Tienda Nube ni republicar nada. Este archivo sí está
 * pinneado a un hash en custom_seal_code, así que tocarlo a él sí pide publish.
 * Misma división que blog-home.js, capsulas-home.js y trust-home.js.
 *
 * Si el JSON falla, el FALLBACK de abajo mantiene la sección en pie con los
 * mismos 12 testimonios. Peor caso: se ve el copy anterior.
 *
 * El JSON se lee de raw.githubusercontent (CORS *, cache 5 min) y NO de
 * jsDelivr: jsDelivr cachea las rutas de rama hasta 7 días, justo lo contrario
 * de lo que necesita un archivo pensado para cambiar.
 *
 * A diferencia de trust/beneficios/cápsulas, el CSS va inyectado en un <style>
 * en vez de un <link> a un .css del CDN: es una request menos, no hay ventana
 * de FOUC, y no hay un segundo archivo que pre-calentar en cada swap de hash.
 *
 * Ver ESTADO_TESTIMONIOS_HOME.md en el repo del proyecto.
 */
(function () {
  'use strict';

  /* Ancla e guard de página a la vez: la sección "Tu rutina, asegurada por 3
     meses". Verificado contra el HTML vivo del home, una interna, /best-sellers,
     una categoría y /contacto → 1 / 0 / 0 / 0 / 0.

     Se ancla acá y no al contenedor de Revie por dos motivos:
       1. Revie inyecta su widget client-side y colgado de 'onfirstinteraction',
          o sea que puede no existir nunca (visitante que no interactúa). Anclar
          ahí sería anclar a algo que a veces no llega.
       2. Los dos vecinos naturales del widget —"Referentes de la medicina
          holística" (home-testimonials) y BloomCrew (banner-services)— se apagan
          en el editor junto con este cambio, así que desaparecen del DOM.
     Con las dos apagadas, insertar después de home-products-sale deja la sección
     exactamente donde estaba el bloque de prueba social. */
  var ANCLA = 'section[data-store="home-products-sale"]';
  var ID = 'bl-tst-section';

  var DATA_URL =
    'https://raw.githubusercontent.com/BloomLifeArg/bloomlife-static/main/data/testimonios-home.json';
  var TIMEOUT_MS = 2500;

  /* Copia de seguridad del copy. Tiene que quedar en sync con el JSON — si
     divergen, esto es lo que ve el usuario cuando GitHub no responde. */
  var FALLBACK = {
    promedio: 4.5,
    resenas: '208 reseñas verificadas',
    titulo: 'La excelencia, nuestra obsesión',
    bajada: 'La voz de nuestros clientes',
    testimonios: [
      { cita: 'Amo bloom life. Me da confianza. Sé que consumo algo que me hace bien, que es sano y que ayuda a mi bienestar.', nombre: 'Fany G.', estrellas: 5, producto: 'Melena de León Gummies', url: '/productos/melena-de-leon-claridad-mental-gummies/' },
      { cita: 'Lo consumo hace más de 4 meses y siento que me hace muy bien. Súper fácil de tomar, lo elegí entre otras tantas opciones y no me arrepiento.', nombre: 'Victoria B.', estrellas: 5, producto: 'Combo Brain Health Cápsulas', url: '/productos/combo-brain-health-capsulas-suplementacion-por-3-meses/' },
      { cita: 'A mí me dio resultado a los 15 días de consumirlo. Y eso que me dijeron que tarda 3 meses. Así que lo sigo comprando porque el bienestar no tiene precio.', nombre: 'María Laura V.', estrellas: 5, producto: 'Ashwagandha Cápsulas', url: '/productos/ashwagandha-equilibrio-hormonal-capsulas/' },
      { cita: 'El producto es excelente, me está ayudando mucho a descansar bien. Lo súper recomiendo.', nombre: 'Marina C.', estrellas: 5, producto: 'Ashwagandha Cápsulas', url: '/productos/ashwagandha-equilibrio-hormonal-capsulas/' },
      { cita: 'Excelente producto, ayudaron a mi concentración y descanso.', nombre: 'Claudia V.', estrellas: 5, producto: 'Melena de León Gummies', url: '/productos/melena-de-leon-claridad-mental-gummies/' },
      { cita: 'Excelente producto, noto cambios en mi piel. Fácil de consumir y rico.', nombre: 'Agustina U.', estrellas: 5, producto: 'Tremella', url: '/productos/tremella-hongo-de-la-belleza-gummies-1n9ff/' },
      { cita: 'Lo empecé a consumir hace 30 días… sí noté la piel más luminosa.', nombre: 'Valeria S.', estrellas: 4, producto: 'Tremella', url: '/productos/tremella-hongo-de-la-belleza-gummies-1n9ff/' },
      { cita: 'Me encantó el producto, recomendable siempre que esté acompañado de buenos hábitos alimentarios, movimiento y descanso reparador.', nombre: 'María Paula B.', estrellas: 5, producto: 'Combo Bye Bye Anxiety Gummies', url: '/productos/combo-bye-bye-anxiety-ashwagandha-melena-de-leon-gummies-56w9q/' },
      { cita: 'Excelente producto, es un antes y un después. Lo recomiendo totalmente, mantengan esa excelencia.', nombre: 'Silvia B.', estrellas: 5, producto: 'Combo Clarity & Defense', url: '/productos/comboclarityanddefense/' },
      { cita: 'Excelente atención al cliente vía WhatsApp. Me armaron un combo a pedido y siempre se mostraron súper predispuestos y amables.', nombre: 'Mercedes S.', estrellas: 5, producto: 'Combo Glow & Regulate', url: '/productos/glow-calma-combo-tremella-y-ashwagandha-gummies-3tmb0/' },
      { cita: 'Muy recomendable. Todavía lo estoy testeando. Tendría que hacer refill, ya se me están acabando.', nombre: 'Gabriela C.', estrellas: 5, producto: 'Cordyceps', url: '/productos/cordyceps-energia-sostenida-gummies/' },
      { cita: 'Me encanta el producto, me cambió la vida.', nombre: 'Nanete B.', estrellas: 5, producto: 'Ashwagandha Cápsulas', url: '/productos/ashwagandha-equilibrio-hormonal-capsulas/' }
    ]
  };

  /* Medidas del carrusel. Están acá arriba porque el JS las necesita para
     calcular el paso de las flechas, y el CSS de abajo las repite: si se cambia
     una, hay que cambiar las dos. */
  var CARD_DESK = 340;
  var GAP_DESK = 24;
  var TILE = 15; // ancho de cada estrella de card, en px (ver STAR/@background-size)

  /* Una sola estrella, en un tile de 30x24 para que el repeat-x deje 6px de aire
     entre estrella y estrella. Se repite con background-repeat en vez de dibujar
     N nodos. El color va horneado (#CCA352): currentColor no funciona dentro de
     un SVG cargado por url() en background-image; por eso la opacidad tambien va
     horneada y la funcion recibe el valor. */
  function star(op) {
    return (
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 24'%3E%3Cpath fill='%23CCA352' fill-opacity='" +
      op +
      "' d='M15 1.5l3.09 6.63 7.16.9-5.27 4.96 1.36 7.11L15 17.6l-6.34 3.5 1.36-7.11L4.75 9.03l7.16-.9z'/%3E%3C/svg%3E\")"
    );
  }

  var STAR = star('1');       // estrella llena, para las cards y la capa de relleno
  var STAR_OFF = star('.22'); // estrella apagada, el riel de fondo del promedio

  function chevron(d) {
    return (
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23F4F0E8' stroke-opacity='.75' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' d='" +
      d +
      "'/%3E%3C/svg%3E\")"
    );
  }

  var CSS =
    '#bl-tst-section{background:#003845;padding:64px 0;overflow:hidden;position:relative}' +
    '#bl-tst-section *{box-sizing:border-box}' +
    '.bl-tst-head{text-align:center;padding:0 20px;margin:0 auto 40px;max-width:640px}' +
    /* El promedio se dibuja con DOS capas: un riel de 5 estrellas apagadas y
       encima una capa de estrellas llenas recortada por width (4,5/5 = 90%).
       Asi media estrella es media estrella de verdad, y no 5 llenas diciendo
       que el promedio es 5. El width lo calcula el JS desde el JSON. */
    '.bl-tst-stars{position:relative;width:90px;height:15px;margin:0 auto 14px;background-image:' + STAR_OFF + ';background-repeat:repeat-x;background-size:18px 14.4px;background-position:left center}' +
    '.bl-tst-stars-fill{position:absolute;top:0;left:0;height:100%;background-image:' + STAR + ';background-repeat:repeat-x;background-size:18px 14.4px;background-position:left center}' +
    '.bl-tst-count{font-family:Inter,system-ui,-apple-system,sans-serif;font-style:normal;font-size:11px;font-weight:400;text-transform:uppercase;letter-spacing:.16em;color:rgba(244,240,232,.55);margin:0 0 12px}' +
    '.bl-tst-h{font-family:Georgia,serif;font-style:italic;font-weight:400;font-size:26px;line-height:1.25;color:#F4F0E8;margin:0}' +
    /* Bajada: Inter, no Georgia, para que contraste con el titulo y no compita
       con el. Es <div> y no <p> por el p{font-size:14px!important} global de
       css_code (ver §7.3 del ESTADO). */
    '.bl-tst-sub{font-family:Inter,system-ui,-apple-system,sans-serif;font-style:normal;font-size:15px;font-weight:400;line-height:1.5;color:rgba(244,240,232,.6);margin:12px 0 0}' +
    /* El track es el elemento que scrollea. En mobile el padding-left de 8vw es
       lo que deja la primera card centrada (84vw de card + 8vw a cada lado). El
       aire de la derecha va como margin-right del ultimo card y no como
       padding-right del track: varios motores ignoran el padding-right de un
       contenedor flex que scrollea, y un spacer aparte se suma al gap y deja
       16px de scroll muerto al final. */
    '.bl-tst-track{display:flex;gap:16px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none;padding-left:8vw}' +
    '.bl-tst-track::-webkit-scrollbar{display:none}' +
    /* min-height: piso de altura para que la fila se lea pareja. Los valores
       salen de medir el card mas alto en el sitio vivo (281 mobile / 292
       desktop) + un margen para variantes de fuente: si Georgia no esta y
       cae a otra serif, el texto puede ocupar mas. Por encima de ese piso
       el stretch del flex ya empareja las 12 cards solo. */
    '.bl-tst-card:last-child{margin-right:8vw}' +
    '.bl-tst-card{flex:0 0 84vw;scroll-snap-align:center;min-height:300px;border:1px solid rgba(244,240,232,.18);border-radius:3px;padding:28px 24px;background:transparent;display:flex;flex-direction:column}' +
    '.bl-tst-quote{font-family:Georgia,serif;font-style:italic;font-weight:400;font-size:17px;line-height:1.5;color:#F4F0E8;margin:0}' +
    /* El pie va pegado abajo para que separador, nombre y estrellas queden
       alineados entre cards, que es lo que hace que la fila se lea como fila. */
    '.bl-tst-foot{margin-top:auto}' +
    '.bl-tst-rule{display:block;width:32px;height:1px;background:rgba(244,240,232,.14);border:0;margin:20px 0}' +
    '.bl-tst-name{font-family:Inter,system-ui,-apple-system,sans-serif;font-style:normal;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.14em;color:#CCA352;margin:0}' +
    '.bl-tst-cstars{height:12px;margin:8px 0 0;background-image:' + STAR + ';background-repeat:repeat-x;background-size:15px 12px;background-position:left center}' +
    /* El producto es un chip. Cuando el JSON trae `url` es un <a> y se puede
       clickear: es el camino mas corto entre "me convencio este testimonio" y
       la interna. Cuando no la trae es un <span> con el mismo aspecto pero sin
       link (ver Clarity & Defense, despublicado). El hover es solo un realce:
       ningun estado necesario depende de el, y focus-visible lo acompania. */
    '.bl-tst-prod{display:inline-block;margin:10px 0 0;padding:5px 12px;border:1px solid rgba(244,240,232,.2);border-radius:999px;font-family:Inter,system-ui,-apple-system,sans-serif;font-style:normal;font-size:11px;font-weight:400;line-height:1.3;color:rgba(244,240,232,.62);text-decoration:none}' +
    'a.bl-tst-prod:hover{border-color:rgba(204,163,82,.55);color:#CCA352}' +
    'a.bl-tst-prod:focus-visible{outline:2px solid #CCA352;outline-offset:2px}' +
    /* Indicador de posicion. Solo mobile: ahi no hay flechas y 12 cards sin
       ninguna señal no se leen como carrusel. Mismo formato "01 / 12" que ya
       usa el hero del tema, para no inventar un lenguaje nuevo. */
    '.bl-tst-pos{margin:24px auto 0;text-align:center;font-family:Inter,system-ui,-apple-system,sans-serif;font-size:11px;font-weight:400;letter-spacing:.14em;color:rgba(244,240,232,.45)}' +
    '.bl-tst-pos b{font-weight:600;color:#CCA352}' +
    '.bl-tst-nav{display:none}' +
    /* Desktop: el track mide exactamente 3 cards + 2 gaps (1068px). Con esa
       medida, la posición de reposo (scrollLeft 0) ya es un punto de snap válido
       —la card 2 queda centrada— así que no hay salto inicial, se ven 3 cards
       enteras, y el final del scroll cae justo en la card 11 centrada: sin
       espacio muerto en ninguno de los dos extremos. */
    '@media (min-width:1024px){' +
    '#bl-tst-section{padding:96px 0}' +
    '.bl-tst-head{margin-bottom:56px;max-width:760px}' +
    '.bl-tst-h{font-size:38px}' +
    '.bl-tst-sub{font-size:16px;margin-top:14px}' +
    '.bl-tst-track{gap:24px;padding-left:0;width:' + (CARD_DESK * 3 + GAP_DESK * 2) + 'px;max-width:100%;margin:0 auto}' +
    '.bl-tst-card:last-child{margin-right:0}' +
    '.bl-tst-card{flex:0 0 ' + CARD_DESK + 'px;min-height:320px}' +
    '.bl-tst-quote{font-size:18px;line-height:1.55}' +
    '.bl-tst-pos{display:none}' +
    '.bl-tst-nav{display:flex;justify-content:center;gap:12px;margin-top:32px}' +
    '.bl-tst-arrow{width:40px;height:40px;padding:0;border:1px solid rgba(244,240,232,.25);border-radius:50%;background-color:transparent;background-repeat:no-repeat;background-position:center;background-size:18px 18px;cursor:pointer;transition:opacity .2s ease}' +
    '.bl-tst-prev{background-image:' + chevron('M15 5l-7 7 7 7') + '}' +
    '.bl-tst-next{background-image:' + chevron('M9 5l7 7-7 7') + '}' +
    '.bl-tst-arrow.is-off{opacity:.3;cursor:default}' +
    '}' +
    /* Lo único que se le toca a Revie: el widget del home. La app queda
       instalada y funcionando (fichas de producto incluidas). Esta regla vive
       dentro del <style> que este script inyecta, y el script solo corre en el
       home (ver ANCLA), así que la regla no existe en ninguna otra página. */
    '@media (prefers-reduced-motion:reduce){.bl-tst-track{scroll-behavior:auto}}' +
        '#revie-tn-widget{display:none!important}';

  function inyectarCSS() {
    if (document.getElementById('bl-tst-css')) return;
    var s = document.createElement('style');
    s.id = 'bl-tst-css';
    s.appendChild(document.createTextNode(CSS));
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function txt(v) {
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  }

  /* Valida la forma del JSON antes de usarlo. Un JSON a medias es peor que uno
     ausente: dibujaría la sección rota en producción. Ante la duda, FALLBACK. */
  function valido(d) {
    if (!d || typeof d !== 'object') return false;
    if (!txt(d.resenas) || !txt(d.titulo)) return false;
    /* `bajada` es opcional a proposito: si falta, el encabezado se dibuja sin
       ella en vez de caerse al FALLBACK entero por un campo secundario. */
    if (d.bajada !== undefined && !txt(d.bajada)) return false;
    if (typeof d.promedio !== 'number' || d.promedio < 1 || d.promedio > 5) return false;
    if (!Array.isArray(d.testimonios)) return false;
    if (d.testimonios.length < 1 || d.testimonios.length > 30) return false;
    return d.testimonios.every(function (t) {
      return (
        t &&
        txt(t.cita) &&
        txt(t.nombre) &&
        txt(t.producto) &&
        typeof t.estrellas === 'number' &&
        t.estrellas >= 1 &&
        t.estrellas <= 5 &&
        /* `url` es opcional; si viene, tiene que ser una ruta interna. Se rechaza
           cualquier cosa con esquema o protocolo-relativa para que un JSON tocado
           no pueda mandar el trafico del home a otro dominio. */
        (t.url === undefined || (txt(t.url) && /^\/[^\/]/.test(t.url)))
      );
    });
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  /* 4.5 -> "4,5" (coma decimal, es-AR). Un entero se muestra sin decimal. */
  function numero(n) {
    return (Math.round(n * 10) / 10).toString().replace('.', ',');
  }

  function traerCopy() {
    if (typeof fetch !== 'function') return Promise.resolve(FALLBACK);

    var ctrl = null;
    var t = null;
    try {
      ctrl = new AbortController();
      t = setTimeout(function () {
        ctrl.abort();
      }, TIMEOUT_MS);
    } catch (e) {
      /* sin AbortController seguimos igual, solo sin timeout */
    }

    return fetch(DATA_URL, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        return valido(d) ? d : FALLBACK;
      })
      .catch(function () {
        return FALLBACK;
      })
      .then(function (d) {
        if (t) clearTimeout(t);
        return d;
      });
  }

  /* Con `url` es un <a> clickeable; sin `url`, un <span> con el mismo aspecto.
     No se inventa un destino: es mejor un chip muerto que mandar a la gente a un
     producto que ya no esta en el catalogo. */
  function prodHTML(t) {
    var etiqueta = esc(t.producto);
    if (!txt(t.url)) return '<span class="bl-tst-prod">' + etiqueta + '</span>';
    return (
      '<a class="bl-tst-prod" href="' + esc(t.url) + '">' + etiqueta + '</a>'
    );
  }

  function cardHTML(t) {
    var n = Math.round(t.estrellas);
    return (
      '<article class="bl-tst-card">' +
      '<div class="bl-tst-quote">' + esc(t.cita) + '</div>' +
      '<div class="bl-tst-foot">' +
      '<hr class="bl-tst-rule">' +
      '<div class="bl-tst-name">' + esc(t.nombre) + '</div>' +
      '<div class="bl-tst-cstars" style="width:' + n * TILE + 'px" role="img" aria-label="' +
      n + ' de 5 estrellas"></div>' +
      prodHTML(t) +
      '</div>' +
      '</article>'
    );
  }

  /* Las flechas mueven exactamente una card. No hay ningún estado que dependa de
     hover; el único estado es .is-off en los extremos, que se calcula del
     scrollLeft. En mobile las flechas no se muestran: swipe nativo. */
  function cablearFlechas(sec) {
    var track = sec.querySelector('.bl-tst-track');
    var prev = sec.querySelector('.bl-tst-prev');
    var next = sec.querySelector('.bl-tst-next');
    if (!track || !prev || !next) return;

    function paso() {
      var card = track.querySelector('.bl-tst-card');
      var w = card ? card.getBoundingClientRect().width : CARD_DESK;
      return Math.round(w) + GAP_DESK;
    }

    function mover(dir) {
      try {
        track.scrollBy({ left: dir * paso(), behavior: 'smooth' });
      } catch (e) {
        track.scrollLeft += dir * paso();
      }
    }

    prev.addEventListener('click', function () { mover(-1); });
    next.addEventListener('click', function () { mover(1); });

    var pos = sec.querySelector('.bl-tst-pos b');
    var total = sec.querySelectorAll('.bl-tst-card').length;

    function estado() {
      var max = track.scrollWidth - track.clientWidth;
      prev.classList.toggle('is-off', track.scrollLeft <= 1);
      next.classList.toggle('is-off', track.scrollLeft >= max - 1);
      /* El indicador se calcula del scrollLeft, no de un contador propio: asi el
         swipe nativo y las flechas quedan siempre en sync sin llevar estado. */
      if (pos) {
        var i = Math.round(track.scrollLeft / paso()) + 1;
        pos.textContent = pad(Math.max(1, Math.min(total, i)));
      }
    }
    track.addEventListener('scroll', estado, { passive: true });
    estado();
  }

  function dibujar(d) {
    var ancla = document.querySelector(ANCLA);
    if (!ancla) return; // no es el home
    if (document.getElementById(ID)) return; // ya insertada

    inyectarCSS();

    var sec = document.createElement('section');
    sec.id = ID;
    sec.className = 'bl-tst';
    sec.innerHTML =
      '<div class="bl-tst-head">' +
      '<div class="bl-tst-stars" role="img" aria-label="' + numero(d.promedio) +
      ' de 5 estrellas">' +
      '<div class="bl-tst-stars-fill" style="width:' + (d.promedio / 5) * 100 + '%"></div>' +
      '</div>' +
      '<div class="bl-tst-count">' + numero(d.promedio) + ' · ' + esc(d.resenas) + '</div>' +
      '<h2 class="bl-tst-h">' + esc(d.titulo) + '</h2>' +
      (txt(d.bajada) ? '<div class="bl-tst-sub">' + esc(d.bajada) + '</div>' : '') +
      '</div>' +
      '<div class="bl-tst-track">' +
      d.testimonios.map(cardHTML).join('') +
      '</div>' +
      '<div class="bl-tst-pos" aria-hidden="true"><b>01</b> / ' +
      pad(d.testimonios.length) + '</div>' +
      '<div class="bl-tst-nav">' +
      '<button type="button" class="bl-tst-arrow bl-tst-prev" aria-label="Testimonios anteriores"></button>' +
      '<button type="button" class="bl-tst-arrow bl-tst-next" aria-label="Testimonios siguientes"></button>' +
      '</div>';

    ancla.parentNode.insertBefore(sec, ancla.nextSibling);
    cablearFlechas(sec);
  }

  function arrancar() {
    // Si no estamos en el home ni siquiera pedimos el JSON.
    if (!document.querySelector(ANCLA)) return;
    /* El CSS va antes del fetch a propósito: así la regla que oculta el widget
       de Revie no queda colgada de que el JSON responda. Si GitHub tarda o
       falla, el widget ya está oculto igual. */
    inyectarCSS();
    traerCopy()
      .then(dibujar)
      .catch(function () {
        /* último recurso: nunca romper el home */
        try {
          dibujar(FALLBACK);
        } catch (e) {}
      });
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', arrancar);
    } else {
      arrancar();
    }
  } catch (e) {
    /* nunca romper el home */
  }
})();
