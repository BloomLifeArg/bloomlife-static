/* Bloom Life — el selector de frecuencia de la suscripción, de vuelta a la vista.
 *
 * EL BUG QUE ARREGLA (2026-08-27). El buy box propio de las internas oculta el bloque nativo
 * de opciones de compra:
 *
 *     #single-product .js-purchase-options-container-private{display:none!important}
 *
 * y replica ahí los radios "compra única / suscripción". Pero el **selector de frecuencia**
 * vive adentro de ese bloque y no se replicó nunca. Consecuencias, las dos malas:
 *
 *   1. Nadie podía elegir cada cuánto recibir, aunque el producto tuviera dos frecuencias.
 *   2. Los cuatro `input hidden` que viajan al checkout quedaban en la PRIMERA frecuencia
 *      configurada en el admin. En cinco productos ésa es "cada 15 días", mientras el copy
 *      del buy box promete "cada 30 días": se cobraba al doble de frecuencia de lo prometido.
 *
 * Lo que hace: si el producto tiene dos o más frecuencias, dibuja un selector dentro del
 * bloque de suscripción del buy box, deja elegida por defecto la que el copy promete, y
 * escribe los hidden que el checkout lee de verdad.
 */
(function () {
  'use strict';
  if (window.__blFreq) return;
  window.__blFreq = 1;
  if (!/\/productos\//.test(location.pathname)) return;

  var CAMPOS = {
    subscriptionOptionFrequencyId: 'subscription_frequency_option_id',
    subscriptionOptionFrequencyType: 'subscription_frequency_type',
    subscriptionOptionFrequencyValue: 'subscription_frequency_value',
    subscriptionOptionFrequencyDiscount: 'subscription_frequency_discount'
  };

  var CSS = [
    '.blfq{display:flex;gap:6px;margin:9px 0 0;flex-wrap:wrap}',
    '.blfq button{flex:1 1 auto;min-width:104px;font:inherit;font-size:11.5px;font-weight:700;',
    'letter-spacing:.02em;color:#4A5350;background:#fff;border:1px solid rgba(0,56,69,.22);',
    'border-radius:999px;padding:7px 10px;cursor:pointer;transition:border-color .15s,color .15s,background .15s}',
    '.blfq button:hover{border-color:#003845;color:#003845}',
    '.blfq button[aria-pressed="true"]{background:#003845;border-color:#003845;color:#fff}',
    '.blfq button:focus-visible{outline:2px solid #CCA352;outline-offset:2px}',
    '.blfq-lbl{display:block;font-size:10px;font-weight:700;letter-spacing:.12em;',
    'text-transform:uppercase;color:#6E736F;margin:11px 0 0}'
  ].join('');

  // Los hidden aparecen repetidos (un juego por cada radio de compra): se escriben todos.
  function escribir(op) {
    Object.keys(CAMPOS).forEach(function (dataKey) {
      var valor = op.dataset[dataKey];
      if (valor === undefined) return;
      var sel = 'input[name="' + CAMPOS[dataKey] + '"]';
      [].forEach.call(document.querySelectorAll(sel), function (i) {
        i.value = valor;
        // el tema escucha `change` en el bloque nativo; si nadie escucha, no molesta
        i.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  // El dropdown nativo sigue en el DOM (oculto): se lo deja coherente para que cualquier
  // script del tema que lo lea vea lo mismo que el checkout.
  function marcarNativo(drop, op) {
    var vis = drop.querySelector('.js-dropdown-selected-option-private');
    if (vis && op.dataset.dropdownOptionText) vis.textContent = op.dataset.dropdownOptionText;
    [].forEach.call(drop.querySelectorAll('.js-subscription-option-private'), function (o) {
      o.classList.toggle('selected', o === op);
    });
  }

  // El buy box afirma la frecuencia en hasta tres lugares distintos según el producto
  // (.osub, .subinfo y un .freq que algunos traen). Los tres tienen que decir lo que se
  // va a cobrar, o el copy vuelve a mentirle a la persona.
  function copy(caja, dias) {
    var cada = 'cada ' + dias + ' días';
    ['.subinfo', '.osub', '.freq'].forEach(function (sel) {
      [].forEach.call(caja.querySelectorAll(sel), function (n) {
        [].forEach.call(n.querySelectorAll('strong,b'), function (f) {
          f.textContent = f.textContent.replace(/cada\s+(\d+\s*d[ií]as?|mes)/i, 'Cada ' + dias + ' días');
        });
        // sólo los nodos de texto: reescribir innerHTML se llevaría el <strong>
        [].forEach.call(n.childNodes, function (t) {
          if (t.nodeType !== 3) return;
          t.nodeValue = t.nodeValue
            .replace(/cada\s+mes/i, cada)
            .replace(/cada\s+\d+\s*d[ií]as?/i, cada);
        });
      });
    });
  }

  var elegidoDias = null;      // lo que eligió la persona, para que un repintado no lo pise

  function montar() {
    var drop = document.querySelector('.js-subscription-frequencies-private');
    if (!drop) return false;                      // el producto no tiene suscripción
    var ops = [].slice.call(drop.querySelectorAll('.js-subscription-option-private'));
    if (ops.length < 2) return true;              // una sola frecuencia: no hay nada que elegir
    var caja = document.querySelector('.opt.rec');
    if (!caja) return false;                      // el buy box propio todavía no se pintó
    if (document.querySelector('.opt.rec .blfq')) return true;

    if (!document.getElementById('blfq-css')) {
      var st = document.createElement('style');
      st.id = 'blfq-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    // Si la persona ya eligió, eso manda sobre cualquier default. Si no, la que el copy
    // venía prometiendo. Y si no se puede leer, la menos frecuente: cobrar de más nunca
    // puede ser el default.
    var promete = elegidoDias || ((caja.textContent || '').match(/cada\s+(\d+)\s*d[ií]as?/i) || [])[1];
    var elegida = null;
    if (promete) {
      ops.forEach(function (o) {
        if (String(o.dataset.subscriptionOptionFrequencyValue) === String(promete)) elegida = o;
      });
    }
    if (!elegida) {
      elegida = ops.slice().sort(function (a, b) {
        return (+b.dataset.subscriptionOptionFrequencyValue || 0) - (+a.dataset.subscriptionOptionFrequencyValue || 0);
      })[0];
    }

    var lbl = document.createElement('span');
    lbl.className = 'blfq-lbl';
    lbl.textContent = 'Cada cuánto lo recibís';
    var fila = document.createElement('div');
    fila.className = 'blfq';
    fila.setAttribute('role', 'group');
    fila.setAttribute('aria-label', 'Frecuencia de la suscripción');

    function elegir(op) {
      elegidoDias = op.dataset.subscriptionOptionFrequencyValue;
      escribir(op);
      marcarNativo(drop, op);
      copy(caja, op.dataset.subscriptionOptionFrequencyValue);
      [].forEach.call(fila.children, function (b) {
        b.setAttribute('aria-pressed', String(b.__op === op));
      });
    }

    ops.forEach(function (op) {
      var b = document.createElement('button');
      b.type = 'button';
      b.__op = op;
      var d = op.dataset.subscriptionOptionFrequencyValue;
      b.textContent = 'Cada ' + d + ' días';
      b.setAttribute('aria-pressed', 'false');
      // el .opt.rec entero es un radio: sin esto, tocar una píldora lo dispara también
      b.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        elegir(op);
      });
      fila.appendChild(b);
    });

    var ancla = caja.querySelector('.subinfo');
    if (ancla) { caja.insertBefore(lbl, ancla); caja.insertBefore(fila, ancla); }
    else { caja.appendChild(lbl); caja.appendChild(fila); }

    elegir(elegida);
    return true;
  }

  // El buy box lo pinta el script de la descripción del producto, así que puede llegar tarde
  // — y además se REPINTA: la primera versión de esto insertaba el selector y el repintado se
  // lo llevaba puesto a los pocos cientos de milisegundos. `montar()` es idempotente, así que
  // se lo llama en cada cambio del DOM y con un latido de respaldo; si el selector sigue ahí,
  // no hace nada.
  var montando = false;
  function montarSeguro() {
    if (montando) return;                         // montar() inserta nodos y eso re-dispara al observer
    montando = true;
    try { montar(); } catch (e) { /* nunca romper la ficha del producto por esto */ }
    montando = false;
  }

  var pendiente = null;
  var obs = new MutationObserver(function () {
    if (pendiente) return;                        // un solo montaje por ráfaga de cambios
    pendiente = setTimeout(function () { pendiente = null; montarSeguro(); }, 120);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  var latidos = 0;
  (function latir() {
    montarSeguro();
    if (++latidos > 120) return;                  // 2 minutos y deja de insistir
    setTimeout(latir, 1000);
  })();
})();
