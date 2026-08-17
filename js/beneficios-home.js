/* Sección "Elegí por beneficio" del home de bloomlife.co.
 *
 * Reemplaza a la franja nativa de "Banners de categorías" por una fila de 5
 * cards que van directo a las internas de producto. La franja nativa NO se
 * borra del admin: este script la oculta.
 *
 * Cada card es foto en ventana (3:4, con el grade de marca ya horneado en el
 * JPG) + filete del color del producto + texto debajo sobre el fondo arena.
 * El color llega por la custom property --bl-ben-c. Ver beneficios-section.css.
 *
 * ⚠️ OJO: reemplaza a esa franja pero NO va en su lugar. La franja estaba
 * arriba de todo (bajo el hero); la sección va más abajo, después de
 * "Adaptógenos también en formato cápsulas". Son dos anclas distintas y es a
 * propósito — ver ANCLA (guard + lo que se oculta) e INSERT_* (dónde entra).
 *
 * ⚠️ CAMBIO DE DESTINO respecto de la franja nativa: la nativa tenía 4 ítems
 * (Concentración / Energía / Dormir mejor / Piel) que llevaban a las
 * categorías /tu-objetivo/…; esta tiene 5 (suma Calma) y lleva a la interna
 * del producto. Si algún día se quiere volver a las categorías, alcanza con
 * cambiar los href del JSON.
 *
 * EL COPY NO VIVE ACÁ: vive en data/beneficios-home.json, que se lee fresco en
 * cada carga (cache 5 min). Cambiar un título, un tagline o un link es editar
 * ese JSON y commitear — se ve en el home en <=5 min y NO hace falta tocar el
 * admin de Tienda Nube ni republicar nada. Este archivo sí está pinneado a un
 * hash en custom_seal_code, así que tocarlo a él sí pide publish.
 *
 * Si el JSON falla se dibuja igual con el FALLBACK de abajo: quedarse sin la
 * sección sería una regresión (la nativa ya está oculta para entonces). Peor
 * caso: se ve el copy viejo.
 *
 * El JSON se lee de raw.githubusercontent (CORS *, cache 5 min) y NO de
 * jsDelivr: jsDelivr cachea las rutas de rama hasta 7 días, justo lo contrario
 * de lo que necesita un archivo pensado para cambiar.
 *
 * Ver ESTADO_BENEFICIOS_HOME.md en el repo del proyecto.
 */
(function () {
  'use strict';

  /* Ancla Y guard de página a la vez: section[data-store="home-banner-categories"]
     existe UNA sola vez y SOLO en el home (verificado contra el HTML vivo del
     home, una interna, /best-sellers y una categoría: 1 / 0 / 0 / 0). Ojo que
     el string aparece una segunda vez en todas las páginas, pero dentro del
     <style> de css_code — por eso el selector va por <section> y no por texto.

     No confundir con home-banner-news (.js-banners-news), que es el banner de
     Fundadores: es otra sección y no la toca nadie acá. */
  var ANCLA = 'section[data-store="home-banner-categories"]';
  var ID = 'bl-ben-section';

  /* DÓNDE se inserta (distinto de dónde estaba la franja que reemplaza): justo
     después de "Adaptógenos también en formato cápsulas".

     Esa sección la inyecta otro script nuestro (capsulas-home.js), así que
     anclarse a ella sería una carrera entre dos loaders. Se evita del todo
     mirando los dos lados:

       products-featured → [bl-caps-section] → image-text-module

     Si cápsulas ya está, vamos después de ella. Si todavía no llegó, vamos
     ANTES de image-text-module, que es nativa y siempre está. Las dos ramas dan
     el mismo orden final, porque cápsulas se ancla a products-featured — o sea
     más arriba que nosotros — y entra por encima aunque llegue más tarde.
     Sin MutationObserver, sin timeout, sin carrera. */
  var INSERT_DESPUES = '#bl-caps-section';
  var INSERT_ANTES = 'section[data-store="home-image-text-module"]';

  /* El "Mensaje institucional" que va JUSTO ARRIBA de la franja nativa contiene
     una sola línea — "¿Qué beneficio buscás?" — y era el título de esa franja.
     Con la franja reemplazada queda huérfano y el home dice lo mismo tres veces
     seguidas: "¿Qué beneficio buscás?" / "Elegí por beneficio" /
     "¿Qué necesita tu cuerpo hoy?". Por eso se oculta también.

     Va detrás de un flag del JSON y no hardcodeado porque el módulo es genérico:
     si algún día se usa para un aviso de promo, se pone en false y vuelve a
     verse, sin republicar nada en el admin. */
  var TITULO_NATIVO = 'section[data-store="home-institutional-message"]';

  var DATA_URL =
    'https://raw.githubusercontent.com/BloomLifeArg/bloomlife-static/main/data/beneficios-home.json';
  var TIMEOUT_MS = 2500;

  /* Copia de seguridad del copy. Tiene que quedar en sync con el JSON — si
     divergen, esto es lo que ve el usuario cuando GitHub no responde.
     Las URLs son las canónicas verificadas contra la API (handle real): 4 de
     las 5 NO son las que uno adivinaría por el nombre del producto. */
  var FALLBACK = {
    ocultar_titulo_nativo: true,
    kicker: 'Elegí por beneficio',
    titulo: '¿Qué necesita tu cuerpo hoy?',
    bajada:
      'Todo empieza por cómo te querés sentir. El resto lo hace la naturaleza.',
    cards: [
      {
        titulo: 'Foco',
        color: '#003845',
        tagline: 'Claridad mental sin niebla.',
        imagen: 'beneficio-foco.jpg',
        alt: 'Una gota de rocío sobre una brizna, con el paisaje enfocado dentro de la gota',
        href:
          'https://www.bloomlife.co/productos/melena-de-leon-claridad-mental-gummies/'
      },
      {
        titulo: 'Calma',
        color: '#4A6741',
        tagline: 'Menos ansiedad y estrés.',
        imagen: 'beneficio-calma.jpg',
        alt: 'Un lago en calma al amanecer, con las montañas reflejadas como en un espejo',
        href:
          'https://www.bloomlife.co/productos/ashwagandha-equilibrio-hormonal-gummies/'
      },
      {
        titulo: 'Energía',
        color: '#5B7F94',
        tagline: 'Estable, sin picos ni caídas.',
        imagen: 'beneficio-energia.jpg',
        alt: 'Espigas a contraluz con el sol bajo entre ellas',
        href:
          'https://www.bloomlife.co/productos/cordyceps-energia-sostenida-gummies/'
      },
      {
        titulo: 'Descanso',
        color: '#3D4F5C',
        tagline: 'Recuperate de verdad.',
        imagen: 'beneficio-descanso.jpg',
        alt: 'Un vilano de diente de león entero, suspendido contra la luz del atardecer',
        href:
          'https://www.bloomlife.co/productos/reishi-descanso-profundo-gummies-kjqoe/'
      },
      {
        titulo: 'Piel',
        color: '#7A5C6E',
        tagline: 'Hidratación desde adentro.',
        imagen: 'beneficio-piel.jpg',
        alt: 'Gotas de rocío sostenidas por una gramínea, a contraluz',
        href:
          'https://www.bloomlife.co/productos/tremella-hongo-de-la-belleza-gummies-1n9ff/'
      }
    ]
  };

  /* El script se sirve desde .../js/beneficios-home.js; el CSS y las fotos
     viven al lado, en .../css/ y .../img/beneficios/. Derivarlos del propio
     src mantiene todo pinneado al mismo commit sin repetir el hash — y sin
     tocar css_code, que es un campo más que no hace falta republicar. */
  var self = document.currentScript;

  function resolver(rel) {
    try {
      return new URL(rel, self.src).href;
    } catch (e) {
      return null;
    }
  }

  function cargarCSS() {
    if (document.querySelector('link[data-bl-ben]')) return;
    var href = resolver('../css/beneficios-section.css');
    if (!href) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.setAttribute('data-bl-ben', '1');
    document.head.appendChild(l);
  }

  /* La franja nativa se oculta por CSS inyectado y NO por style.display en el
     elemento: si el tema la re-renderiza (el home la dibuja por JS), un estilo
     inline se perdería y la regla sobrevive.

     Se hace por acá y no por css_code a propósito: así el feature entero vive
     en un solo commit de bloomlife-static y se revierte cambiando el hash, sin
     publicar un segundo campo del admin ni pelear con el minificador de TN. */
  function ocultarNativa(ocultarTitulo) {
    if (document.getElementById('bl-ben-hide')) return;
    var sel = [ANCLA];
    /* Por defecto sí: si el JSON no trae el campo, el comportamiento correcto
       es el de la sección publicada, no el de dejar el título duplicado. */
    if (ocultarTitulo !== false) sel.push(TITULO_NATIVO);
    var st = document.createElement('style');
    st.id = 'bl-ben-hide';
    st.textContent = sel.join(',') + '{display:none!important}';
    document.head.appendChild(st);
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
    if (!txt(d.kicker) || !txt(d.titulo) || !txt(d.bajada)) return false;
    if (!Array.isArray(d.cards)) return false;
    if (d.cards.length < 3 || d.cards.length > 6) return false;
    return d.cards.every(function (c) {
      return c && txt(c.titulo) && txt(c.tagline) && txt(c.imagen) && txt(c.href);
    });
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

  /* En el JSON va solo el nombre del archivo y se resuelve contra el img/ del
     mismo commit. Se acepta también una URL completa por si algún día una foto
     tiene que venir del CDN de Tienda Nube y no del repo. */
  function urlImagen(nombre) {
    if (/^https?:\/\//i.test(nombre)) return nombre;
    return resolver('../img/beneficios/' + nombre) || '';
  }

  /* Solo se acepta un hex de 3 o 6 dígitos: el valor entra en un atributo
     style, así que no puede venir cualquier cosa del JSON. */
  function color(v) {
    return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(v || '').trim())
      ? String(v).trim()
      : '#003845';
  }

  /* Estructura v2: foto en ventana + filete de color + texto debajo, sobre el
     fondo arena de la sección. El texto ya NO va encima de la foto — así se lee
     igual en las cinco, sin depender de si la foto es clara u oscura. */
  function cardHTML(c) {
    return (
      '<a class="bl-ben-card" style="--bl-ben-c:' +
      color(c.color) +
      '" href="' +
      esc(c.href) +
      '">' +
      '<span class="bl-ben-ph">' +
      '<img src="' +
      esc(urlImagen(c.imagen)) +
      '" alt="' +
      esc(txt(c.alt) || '') +
      '" loading="lazy" decoding="async">' +
      '</span>' +
      '<span class="bl-ben-rule"></span>' +
      '<span class="bl-ben-name">' +
      esc(c.titulo) +
      '</span>' +
      '<span class="bl-ben-tag">' +
      esc(c.tagline) +
      '</span>' +
      '</a>'
    );
  }

  function dibujar(d) {
    if (!document.querySelector(ANCLA)) return; // no es el home
    if (document.getElementById(ID)) return; // ya insertada

    /* Ver el comentario de INSERT_DESPUES: las dos ramas dan el mismo orden. */
    var despues = document.querySelector(INSERT_DESPUES);
    var antes = despues ? despues.nextSibling : document.querySelector(INSERT_ANTES);
    var padre = despues
      ? despues.parentNode
      : (antes && antes.parentNode) || null;
    if (!padre) return;

    cargarCSS();

    var sec = document.createElement('section');
    sec.id = ID;
    sec.className = 'bl-ben';
    sec.setAttribute('aria-label', txt(d.titulo) || 'Elegí por beneficio');
    sec.innerHTML =
      '<div class="bl-ben-head">' +
      '<div>' +
      '<span class="bl-ben-kicker">' +
      esc(d.kicker) +
      '</span>' +
      '<h2 class="bl-ben-title">' +
      esc(d.titulo) +
      '</h2>' +
      '</div>' +
      '<div class="bl-ben-sub">' +
      esc(d.bajada) +
      '</div>' +
      '</div>' +
      '<div class="bl-ben-row">' +
      d.cards.map(cardHTML).join('') +
      '</div>';

    padre.insertBefore(sec, antes);
    ocultarNativa(d.ocultar_titulo_nativo);
  }

  function arrancar() {
    // Si no estamos en el home ni siquiera pedimos el JSON.
    if (!document.querySelector(ANCLA)) return;
    traerCopy().then(dibujar).catch(function () {
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
