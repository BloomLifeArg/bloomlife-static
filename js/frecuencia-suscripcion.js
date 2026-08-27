/* Bloom Life — que la suscripción cobre la frecuencia que el copy promete.
 *
 * EL BUG (2026-08-27). El buy box propio de las internas oculta el bloque nativo de opciones
 * de compra:
 *
 *     #single-product .js-purchase-options-container-private{display:none!important}
 *
 * y replica ahí los radios "compra única / suscripción". Pero el selector de frecuencia vive
 * adentro de ese bloque y nunca se replicó, así que los cuatro `input hidden` que el checkout
 * lee de verdad quedaban en la PRIMERA frecuencia configurada en el admin. En cinco productos
 * ésa es "cada 15 días" mientras el copy promete "cada 30 días": se cobraba al doble de
 * frecuencia de lo prometido, sin que la persona lo viera ni lo pudiera cambiar.
 *
 * POR QUÉ ESTE SCRIPT NO TOCA EL DOM. La primera versión dibujaba un selector dentro del buy
 * box y la ficha se tildaba: el buy box se reconstruye cuando su subárbol cambia, así que
 * insertar el selector lo hacía repintar, el repintado se llevaba el selector, y un
 * MutationObserver lo reponía — 90 montajes y 640 eventos `change` en diez segundos, medido.
 * Un componente ajeno que reacciona a mutaciones no se puede alimentar con mutaciones.
 *
 * Entonces esto hace UNA sola cosa: escribir los hidden. No inserta nodos, no cambia texto y
 * no dispara eventos, así que no puede realimentar a nadie. La posibilidad de ELEGIR la
 * frecuencia es un paso aparte, y tiene que resolverse dentro del buy box mismo (en la
 * descripción del producto), no peleándole desde afuera.
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

  // Cuál frecuencia corresponde: la que el copy del buy box viene prometiendo. Si no se puede
  // leer, la menos frecuente de las configuradas — cobrar de más no puede ser un default.
  function cual(ops, prometidos) {
    var elegida = null;
    if (prometidos) {
      ops.forEach(function (o) {
        if (String(o.dataset.subscriptionOptionFrequencyValue) === String(prometidos)) elegida = o;
      });
    }
    if (elegida) return elegida;
    return ops.slice().sort(function (a, b) {
      return (+b.dataset.subscriptionOptionFrequencyValue || 0) -
             (+a.dataset.subscriptionOptionFrequencyValue || 0);
    })[0];
  }

  // Sólo escribe propiedades `value` de inputs hidden. Eso no genera MutationRecord (el
  // atributo no cambia) y no dispara eventos: es invisible para cualquier observer.
  function alinear() {
    var drop = document.querySelector('.js-subscription-frequencies-private');
    if (!drop) return false;                       // el producto no tiene suscripción
    var ops = [].slice.call(drop.querySelectorAll('.js-subscription-option-private'));
    if (ops.length < 2) return true;               // una sola frecuencia: nada que alinear

    var caja = document.querySelector('.opt.rec');
    var promete = caja ? ((caja.textContent || '').match(/cada\s+(\d+)\s*d[ií]as?/i) || [])[1] : null;
    if (!promete) return false;                    // sin el copy no hay con qué comparar: esperar

    var op = cual(ops, promete);
    if (!op) return true;

    var tocado = false;
    Object.keys(CAMPOS).forEach(function (k) {
      var valor = op.dataset[k];
      if (valor === undefined) return;
      [].forEach.call(document.querySelectorAll('input[name="' + CAMPOS[k] + '"]'), function (i) {
        if (i.value === valor) return;
        i.value = valor;
        tocado = true;
      });
    });
    if (tocado && window.console && console.info) {
      console.info('[bloom] frecuencia de suscripción alineada con el copy: cada ' + promete + ' días');
    }
    return true;
  }

  // El buy box llega tarde y el tema puede reescribir los hidden al tocar variante o cantidad,
  // así que se revisa un rato. Sin observers: un latido corto no puede entrar en bucle con nadie.
  var n = 0;
  (function latir() {
    try { alinear(); } catch (e) { /* nunca romper la ficha del producto por esto */ }
    if (++n > 60) return;                          // ~60 s, de sobra para cualquier carga
    setTimeout(latir, 1000);
  })();
})();
