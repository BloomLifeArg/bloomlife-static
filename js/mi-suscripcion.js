/* Mi suscripción — /mi-suscripcion/
 *
 * Lo carga js/paginas-beneficio.js junto con css/mi-suscripcion.css, solo en
 * ese path. La página del CMS trae un markup pelado (.blp .blp-misus): hero,
 * cinco tarjetas-acción (<a href="#pedir">), un contenedor .bms-form con el
 * texto de respaldo sin JS, pasos, letra chica, FAQ y cierre.
 *
 * Este archivo hace tres cosas, todas progresivas:
 *  1. Arma el formulario DENTRO de .bms-form con controles reales (la API de
 *     páginas borra <form>/<input>/<button>/<select>, así que nacen acá):
 *     gestión (5 radios como segmentado), número de pedido, mail, el campo
 *     que pide cada gestión, mensaje adicional. Valida en línea y arma el
 *     mensaje: los dos botones son <a> cuyo href se recalcula en cada cambio
 *     (wa.me/…?text=… y mailto:…?subject=…&body=…), así lo que se ve es lo que
 *     viaja y no hay window.open que un bloqueador pueda frenar.
 *  2. Las tarjetas-acción preseleccionan la gestión y llevan el foco al
 *     formulario. #direccion / #saltear / #frecuencia / #producto / #baja en la
 *     URL también (#pausa sigue andando: era el nombre viejo de saltear).
 *
 * QUÉ SE PUEDE PEDIR — verificado 2026-09-13 en el admin de TN (Clientes →
 * Gestionar suscripción): editar producto y cantidad, frecuencia de envío (las
 * que tenga el plan: 30/45), datos de entrega, saltear el próximo pedido (máx.
 * 2 seguidos) y cancelar. NO existe pausar, ni mover la fecha del próximo cobro,
 * ni cambiar el medio de pago: el formulario no los ofrece.
 *  3. Acordeón del FAQ (.bli-q), igual que paginas-institucionales.js, porque
 *     ese archivo no entra en este path.
 *
 * El borrador vive en localStorage (bms-borrador) para no perderlo si la
 * persona se va a buscar el número de pedido. GA4: al enviar,
 * dataLayer.push({event:'suscripcion_gestion', gestion, canal}).
 * Al terminar de armar el DOM avisa por window.blpDone(). Expone window.bms
 * (estado, mensaje, validar) para que assets-mi-suscripcion/verificar.py
 * compare lo que muestra con lo que viaja.
 */
(function () {
  var d = document;
  var yo = d.currentScript;
  var base = (yo && yo.src) ? yo.src.replace(/\/js\/mi-suscripcion\.js.*$/, '')
    : 'https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@main';

  var WA = '5491124785477';
  var MAIL = 'hola@bloomlife.co';
  var KEY = 'bms-borrador';
  var ORIGEN = 'bloomlife.co/mi-suscripcion';

  /* ══════════════ 1. TABLAS ══════════════ */
  var G = {
    direccion:  { t: 'Cambiar la dirección',              corto: 'Dirección',   asunto: 'Cambio de dirección' },
    saltear:    { t: 'Saltear el próximo envío',          corto: 'Saltear',     asunto: 'Saltear el próximo envío' },
    frecuencia: { t: 'Cambiar la frecuencia',             corto: 'Frecuencia',  asunto: 'Cambio de frecuencia' },
    producto:   { t: 'Cambiar el producto o la cantidad', corto: 'Producto',    asunto: 'Cambio de producto o cantidad' },
    baja:       { t: 'Dar de baja',                       corto: 'Baja',        asunto: 'Baja de la suscripción' }
  };
  var ORDEN = ['direccion', 'saltear', 'frecuencia', 'producto', 'baja'];
  var ALIAS = { pausa: 'saltear', fecha: 'frecuencia' };   // nombres viejos en el hash de la URL
  // Las frecuencias las define el plan de cada producto en TN (hoy 30 y 45 días). Sin 15.
  var FREC = [
    { v: '30', t: 'Cada 30 días' },
    { v: '45', t: 'Cada 45 días' }
  ];

  /* ══════════════ 2. UTILIDADES ══════════════ */
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
  function trim(s) { return String(s == null ? '' : s).replace(/^\s+|\s+$/g, ''); }
  function reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function ga(ev, params) {
    try {
      if (!window.dataLayer || typeof window.dataLayer.push !== 'function') return;
      var o = { event: ev }, k;
      for (k in params) if (params.hasOwnProperty(k)) o[k] = params[k];
      window.dataLayer.push(o);
    } catch (e) {}
  }
  function foco(e) { try { e.focus({ preventScroll: true }); } catch (x) { try { e.focus(); } catch (z) {} } }
  function offsetHead() {
    var head = d.querySelector('.js-head-main') || d.querySelector('header');
    if (!head) return 0;
    var pos = getComputedStyle(head).position;
    return (pos === 'fixed' || pos === 'sticky') ? Math.max(0, Math.round(head.getBoundingClientRect().bottom)) : 0;
  }

  /* ══════════════ 3. ESTADO + BORRADOR ══════════════ */
  var estado = {
    g: 'direccion', pedido: '', mail: '',
    dir: '',
    saltN: '1',
    frec: '',
    prodTipo: 'cantidad', cant: '', prodNuevo: '',
    motivo: '', msg: ''
  };
  var CAMPOS = ['g', 'pedido', 'mail', 'dir', 'saltN', 'frec', 'prodTipo', 'cant', 'prodNuevo', 'motivo', 'msg'];

  function guardar() {
    try { localStorage.setItem(KEY, JSON.stringify(estado)); } catch (e) {}
  }
  function cargar() {
    try {
      var raw = localStorage.getItem(KEY); if (!raw) return false;
      var o = JSON.parse(raw), i, k, hubo = false;
      for (i = 0; i < CAMPOS.length; i++) {
        k = CAMPOS[i];
        if (typeof o[k] === 'string') { estado[k] = o[k]; if (o[k]) hubo = true; }
      }
      if (ALIAS[estado.g]) estado.g = ALIAS[estado.g];      // borrador guardado con la versión anterior
      if (!G[estado.g]) estado.g = 'direccion';
      if (estado.saltN !== '2') estado.saltN = '1';
      if (estado.prodTipo !== 'producto') estado.prodTipo = 'cantidad';
      return hubo;
    } catch (e) { return false; }
  }
  function borrar() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }
  var tGuardar;
  function cambio() {
    clearTimeout(tGuardar);
    tGuardar = setTimeout(guardar, 250);
    actualizar();
  }

  /* ══════════════ 4. VALIDACIÓN ══════════════ */
  function pedidoNorm(s) { return trim(s).replace(/^#+/, '').replace(/[\s.]/g, ''); }
  function mailOk(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trim(s)); }

  // devuelve {campo: mensaje} sólo con lo que falla; el orden es el del formulario
  function validar(s) {
    var e = {};
    var p = pedidoNorm(s.pedido);
    if (!p) e.pedido = 'Necesitamos el número de pedido para encontrar tu suscripción.';
    else if (!/^\d{1,8}$/.test(p)) e.pedido = 'Son solo números, por ejemplo #3503. Está en el mail de confirmación.';
    if (!trim(s.mail)) e.mail = 'Necesitamos el mail con el que compraste.';
    else if (!mailOk(s.mail)) e.mail = 'Ese mail no parece completo. Revisá que tenga el @ y el dominio.';
    if (s.g === 'direccion' && trim(s.dir).length < 8) e.dir = 'Escribí la dirección completa: calle y número, piso y depto si hay, localidad, código postal y provincia.';
    if (s.g === 'frecuencia' && !s.frec) e.frec = 'Elegí la nueva frecuencia.';
    if (s.g === 'producto') {
      if (s.prodTipo === 'cantidad' && !/^[1-9]$/.test(trim(s.cant))) e.cant = 'Decinos la nueva cantidad por envío, de 1 a 9.';
      if (s.prodTipo === 'producto' && trim(s.prodNuevo).length < 3) e.prodNuevo = 'Decinos a qué producto querés pasar (nombre y formato, por ejemplo Reishi Gummies).';
    }
    return e;
  }

  /* ══════════════ 5. MENSAJE ══════════════ */
  function lineas(s) {
    var L = [];
    L.push('Hola Bloom Life 👋 Quiero pedir un cambio en mi suscripción.');
    L.push('');
    L.push('Gestión: ' + G[s.g].t);
    L.push('Pedido: #' + pedidoNorm(s.pedido));
    L.push('Mail de la compra: ' + trim(s.mail));
    if (s.g === 'direccion') L.push('Nueva dirección: ' + trim(s.dir));
    if (s.g === 'saltear') {
      L.push('Saltear: ' + (s.saltN === '2' ? 'los próximos 2 envíos (el máximo seguido)' : 'el próximo envío (uno solo)'));
    }
    if (s.g === 'frecuencia') {
      var f = null, i;
      for (i = 0; i < FREC.length; i++) if (FREC[i].v === s.frec) f = FREC[i];
      L.push('Nueva frecuencia: ' + (f ? f.t.toLowerCase() : ''));
    }
    if (s.g === 'producto') {
      if (s.prodTipo === 'producto') L.push('Pasar a: ' + trim(s.prodNuevo));
      else L.push('Nueva cantidad por envío: ' + trim(s.cant));
    }
    if (s.g === 'baja') {
      L.push('Motivo: ' + (trim(s.motivo) || 'prefiero no decirlo'));
    }
    if (trim(s.msg)) L.push('Mensaje: ' + trim(s.msg));
    L.push('');
    L.push('Enviado desde ' + ORIGEN);
    return L;
  }
  function mensaje(s) { return lineas(s).join('\n'); }
  function asunto(s) {
    var p = pedidoNorm(s.pedido);
    return 'Mi suscripción · ' + G[s.g].asunto + (p ? ' · Pedido #' + p : '');
  }
  function hrefWA(s) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(mensaje(s)); }
  function hrefMail(s) {
    return 'mailto:' + MAIL + '?subject=' + encodeURIComponent(asunto(s)) + '&body=' + encodeURIComponent(mensaje(s));
  }

  /* ══════════════ 6. RENDER ══════════════ */
  var host, cond, wa, ml, alerta, done, campos = {}, intentado = false, tocado = {};

  function campo(id, label, control, hint, opcional) {
    var w = el('div', 'bms-field');
    var l = el('label', 'bms-label'); l.htmlFor = id;
    l.innerHTML = esc(label) + (opcional ? '<small>opcional</small>' : '');
    w.appendChild(l);
    control.id = id;
    control.className = (control.className ? control.className + ' ' : '') + 'bms-in';
    var ids = [];
    var h = null;
    if (hint) { h = el('div', 'bms-hint', esc(hint)); h.id = id + '-hint'; ids.push(h.id); }
    var e = el('div', 'bms-err'); e.id = id + '-err'; ids.push(e.id);
    control.setAttribute('aria-describedby', ids.join(' '));
    if (!opcional) control.setAttribute('aria-required', 'true');
    w.appendChild(control);
    if (h) w.appendChild(h);
    w.appendChild(e);
    campos[id] = { w: w, c: control, e: e };
    return w;
  }
  function input(type, k, ph, extra) {
    var i = el('input');
    i.type = type;
    i.name = k;
    if (ph) i.placeholder = ph;
    if (extra) { var a; for (a in extra) if (extra.hasOwnProperty(a)) i.setAttribute(a, extra[a]); }
    i.value = estado[k] || '';
    i.addEventListener('input', function () { estado[k] = i.value; if (intentado || tocado[k]) marcar(k); cambio(); });
    i.addEventListener('blur', function () { if (trim(i.value)) { tocado[k] = true; marcar(k); } });
    return i;
  }
  function textarea(k, ph, tall) {
    var t = el('textarea', tall ? 'bms-tall' : null);
    t.name = k; t.rows = 3;
    if (ph) t.placeholder = ph;
    t.value = estado[k] || '';
    t.addEventListener('input', function () { estado[k] = t.value; if (intentado || tocado[k]) marcar(k); cambio(); });
    t.addEventListener('blur', function () { if (trim(t.value)) { tocado[k] = true; marcar(k); } });
    return t;
  }
  function radioLista(name, k, opts, onChange) {
    var fs = el('fieldset', 'bms-radios');
    var lg = el('legend', 'bms-sr', esc(opts.legend));
    fs.appendChild(lg);
    opts.items.forEach(function (o, i) {
      var lab = el('label', 'bms-radio' + (estado[k] === o.v ? ' on' : ''));
      var r = el('input'); r.type = 'radio'; r.name = name; r.value = o.v; r.id = name + '-r-' + o.v;   // '-r-' para no chocar con los ids de los campos
      r.checked = estado[k] === o.v;
      r.addEventListener('change', function () {
        if (!r.checked) return;
        estado[k] = o.v;
        Array.prototype.forEach.call(fs.querySelectorAll('.bms-radio'), function (x) { x.classList.remove('on'); });
        lab.classList.add('on');
        cambio();
        if (onChange) onChange(o.v, r);
      });
      lab.appendChild(r);
      lab.appendChild(el('span', 'bms-radio-dot'));
      var tx = el('span');
      tx.appendChild(el('span', 'bms-radio-h', esc(o.t)));
      if (o.d) tx.appendChild(el('span', 'bms-radio-t', esc(o.d)));
      lab.appendChild(tx);
      fs.appendChild(lab);
    });
    return fs;
  }

  // el campo (o los campos) que pide cada gestión; se rearma al cambiar la gestión
  function pintarCond() {
    cond.innerHTML = '';
    campos.dir = campos.frec = campos.cant = campos.prodNuevo = campos.motivo = null;
    var g = estado.g;
    if (g === 'direccion') {
      cond.appendChild(campo('bms-dir', 'Nueva dirección completa',
        textarea('dir', 'Calle y número, piso y depto, localidad, código postal, provincia', true),
        'Con código postal y alguna referencia si el timbre no tiene nombre.'));
      campos.dir = campos['bms-dir'];
    }
    if (g === 'saltear') {
      var ws = el('div', 'bms-field');
      ws.appendChild(el('div', 'bms-label', 'Cuántos envíos'));
      ws.appendChild(radioLista('bms-salt', 'saltN', {
        legend: 'Cuántos envíos salteamos',
        items: [
          { v: '1', t: 'Solo el próximo', d: 'El siguiente sale como siempre, un ciclo después.' },
          { v: '2', t: 'Los próximos dos', d: 'Es el máximo seguido que permite el sistema. La suscripción sigue activa.' }
        ]
      }));
      cond.appendChild(ws);
    }
    if (g === 'frecuencia') {
      var sel = el('select');
      sel.name = 'frec';
      var o0 = el('option', null, 'Elegí una frecuencia'); o0.value = ''; sel.appendChild(o0);
      FREC.forEach(function (f) {
        var o = el('option', null, esc(f.t)); o.value = f.v; if (estado.frec === f.v) o.selected = true; sel.appendChild(o);
      });
      sel.addEventListener('change', function () { estado.frec = sel.value; marcar('frec'); cambio(); });
      cond.appendChild(campo('bms-frec', 'Nueva frecuencia', sel,
        'Aplica desde el próximo cobro. Las frecuencias las define el plan de tu producto: si la que elegís no está en el tuyo, te lo decimos antes de tocar nada.'));
      campos.frec = campos['bms-frec'];
    }
    if (g === 'producto') {
      var wq = el('div', 'bms-field');
      wq.appendChild(el('div', 'bms-label', 'Qué querés cambiar'));
      var subq = el('div', 'bms-sub-field');
      var pintaSubq = function () {
        subq.innerHTML = '';
        campos.cant = campos.prodNuevo = null;
        if (estado.prodTipo === 'producto') {
          subq.appendChild(campo('bms-prod', 'A qué producto pasás',
            input('text', 'prodNuevo', 'Por ejemplo: Reishi Gummies', { autocomplete: 'off' }),
            'Nombre y formato (gummies o cápsulas). Se mantiene el 10% y el precio nuevo aplica desde el próximo cobro.'));
          campos.prodNuevo = campos['bms-prod'];
        } else {
          subq.appendChild(campo('bms-cant', 'Nueva cantidad por envío',
            input('text', 'cant', '2', { inputmode: 'numeric', autocomplete: 'off', maxlength: '1' }),
            'Frascos por envío. El total se recalcula con el mismo 10%.'));
          campos.cant = campos['bms-cant'];
        }
      };
      wq.appendChild(radioLista('bms-prodtipo', 'prodTipo', {
        legend: 'Qué querés cambiar',
        items: [
          { v: 'cantidad', t: 'La cantidad', d: 'Más o menos frascos del mismo producto en cada envío.' },
          { v: 'producto', t: 'El producto', d: 'Pasás a otro suplemento sin cerrar la suscripción.' }
        ]
      }, function () { pintaSubq(); }));   // sin robar el foco: el campo aparece a continuación en el orden de Tab
      wq.appendChild(subq);
      pintaSubq();
      cond.appendChild(wq);
    }
    if (g === 'baja') {
      cond.appendChild(campo('bms-motivo', 'Motivo',
        textarea('motivo', 'Si querés contarnos por qué, nos ayuda a mejorar. No es obligatorio.'),
        'Recordá que la baja se pide cumplidos los tres envíos de permanencia.', true));
      campos.motivo = campos['bms-motivo'];
    }
    // vuelve a animar la entrada (quitar y volver a poner la clase reinicia la animación)
    cond.className = '';
    void cond.offsetWidth;
    cond.className = 'bms-cond';
  }

  function idDe(k) {
    return { pedido: 'bms-pedido', mail: 'bms-mail', dir: 'bms-dir', frec: 'bms-frec', cant: 'bms-cant', prodNuevo: 'bms-prod' }[k];
  }
  function marcar(k) {
    var c = campos[idDe(k)];
    if (!c || !c.w.parentNode) return;
    var e = validar(estado)[k];
    c.w.classList.toggle('bad', !!e);
    c.e.textContent = e || '';
    if (e) c.c.setAttribute('aria-invalid', 'true'); else c.c.removeAttribute('aria-invalid');
  }
  function marcarTodo() {
    ['pedido', 'mail', 'dir', 'frec', 'cant', 'prodNuevo'].forEach(marcar);
  }

  function actualizar() {
    wa.href = hrefWA(estado);
    ml.href = hrefMail(estado);
    if (done) done.classList.remove('show');
    if (intentado) {
      var e = validar(estado), n = 0, k;
      for (k in e) if (e.hasOwnProperty(k)) n++;
      if (!n) alerta.classList.remove('show');
    }
  }

  // el click en "Enviar por …": si falta algo, no navega y lleva el foco al primer error
  function enviar(canal) {
    return function (ev) {
      intentado = true;
      var e = validar(estado), k, primero = null, n = 0;
      for (k in e) if (e.hasOwnProperty(k)) { n++; if (!primero) primero = k; }
      marcarTodo();
      if (n) {
        ev.preventDefault();
        alerta.textContent = n === 1 ? 'Falta un dato para armar el mensaje.' : 'Faltan ' + n + ' datos para armar el mensaje.';
        alerta.classList.add('show');
        var c = campos[idDe(primero)];
        if (c) foco(c.c);
        return;
      }
      alerta.classList.remove('show');
      ga('suscripcion_gestion', { gestion: estado.g, canal: canal });
      done.innerHTML = canal === 'whatsapp'
        ? '<b>Abrimos WhatsApp con tu pedido armado.</b> Solo te queda tocar Enviar. Te confirmamos por ahí en el día hábil.'
        : '<b>Abrimos tu mail con el pedido armado.</b> Solo te queda enviarlo. Te confirmamos por mail en el día hábil.';
      done.classList.add('show');
    };
  }

  function elegirGestion(g, conFoco) {
    if (!G[g]) return;
    estado.g = g;
    var r = host.querySelector('#bms-g-' + g);
    if (r) r.checked = true;
    Array.prototype.forEach.call(d.querySelectorAll('.bms-act'), function (a) {
      a.classList.toggle('on', a.className.indexOf('bms-g-' + g) > -1);
    });
    pintarCond();
    cambio();
    if (conFoco && r) foco(r);
  }

  function armar() {
    host.innerHTML = '';
    host.appendChild(el('div', 'bms-form-h', 'Armá tu pedido'));
    host.appendChild(el('div', 'bms-form-t', 'Completás esto y el mensaje sale listo por WhatsApp o por mail, con todos los datos que necesitamos.'));

    // gestión
    var fs = el('fieldset', 'bms-seg');
    fs.appendChild(el('legend', 'bms-label', 'Qué querés hacer'));
    ORDEN.forEach(function (g) {
      var w = el('span', 'bms-seg-opt');
      var r = el('input'); r.type = 'radio'; r.name = 'bms-g'; r.value = g; r.id = 'bms-g-' + g; r.checked = estado.g === g;
      r.addEventListener('change', function () { if (r.checked) elegirGestion(g, false); });
      var l = el('label', null, esc(G[g].t)); l.htmlFor = r.id;
      w.appendChild(r); w.appendChild(l);
      fs.appendChild(w);
    });
    host.appendChild(fs);

    host.appendChild(campo('bms-pedido', 'Número de pedido',
      input('text', 'pedido', '#3503', { inputmode: 'numeric', autocomplete: 'off' }),
      'Está en el mail de confirmación, empieza con #.'));
    host.appendChild(campo('bms-mail', 'Mail con el que compraste',
      input('email', 'mail', 'vos@mail.com', { autocomplete: 'email', autocapitalize: 'off', spellcheck: 'false' })));

    cond = el('div', 'bms-cond');
    host.appendChild(cond);
    pintarCond();

    host.appendChild(campo('bms-msg', 'Mensaje adicional',
      textarea('msg', 'Algo más que quieras contarnos.'), null, true));

    var send = el('div', 'bms-send');
    send.appendChild(el('div', 'bms-send-t', 'El mensaje sale por el canal que elijas, ya armado. <b>Lo procesa una persona del equipo y te confirma en el día hábil.</b>'));
    var btns = el('div', 'bms-btns');
    wa = el('a', 'bms-btn bms-btn-wa', 'Enviar por WhatsApp'); wa.target = '_blank'; wa.rel = 'noopener';
    ml = el('a', 'bms-btn bms-btn-ghost bms-btn-mail', 'Enviar por mail');
    wa.addEventListener('click', enviar('whatsapp'));
    ml.addEventListener('click', enviar('mail'));
    btns.appendChild(wa); btns.appendChild(ml);
    send.appendChild(btns);
    alerta = el('div', 'bms-alert'); alerta.setAttribute('role', 'alert');
    send.appendChild(alerta);
    done = el('div', 'bms-done'); done.setAttribute('role', 'status');
    send.appendChild(done);
    var foot = el('div', 'bms-foot');
    foot.appendChild(el('span', null, 'Guardamos el borrador en este navegador hasta que lo envíes.'));
    var clr = el('button', 'bms-clear', 'Limpiar el formulario'); clr.type = 'button';
    clr.addEventListener('click', function () {
      CAMPOS.forEach(function (k) { if (k !== 'g') estado[k] = ''; });
      estado.saltN = '1'; estado.prodTipo = 'cantidad';
      intentado = false; tocado = {};
      borrar();
      armar();
      var p = host.querySelector('#bms-pedido'); if (p) foco(p);
    });
    foot.appendChild(clr);
    send.appendChild(foot);
    host.appendChild(send);
    actualizar();
  }

  /* ══════════════ 7. ACORDEÓN (copiado de paginas-institucionales.js) ══════════════ */
  function acordeon() {
    var root = d.querySelector('.blp-misus');
    var qs = d.querySelectorAll('.blp-misus .bli-q');
    if (!root || !qs.length) return;
    root.classList.add('bli-js');
    Array.prototype.forEach.call(qs, function (q, i) {
      var h = q.querySelector('.bli-qh');
      var a = q.querySelector('.bli-qa');
      if (!h) return;
      var b = d.createElement('button');
      b.type = 'button';
      b.className = 'bli-qb';
      b.innerHTML = h.innerHTML;
      h.innerHTML = '';
      h.appendChild(b);
      if (a) {
        if (!a.id) a.id = 'bms-qa-' + (i + 1);
        b.setAttribute('aria-controls', a.id);
      }
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function () {
        var open = q.classList.toggle('open');
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  /* ══════════════ 8. INIT ══════════════ */
  function asegurarCss() {
    if (d.querySelector('link[href*="/css/mi-suscripcion.css"]')) return;
    var l = d.createElement('link'); l.rel = 'stylesheet'; l.href = base + '/css/mi-suscripcion.css'; d.head.appendChild(l);
  }
  function irAlForm(conFoco, g) {
    var band = d.getElementById('pedir') || host;
    var top = band.getBoundingClientRect().top + window.pageYOffset - offsetHead() - 16;
    if (window.scrollTo) {
      try { window.scrollTo({ top: top, behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, top); }
    }
    if (conFoco) {
      var r = host.querySelector('#bms-g-' + g);
      if (r) setTimeout(function () { foco(r); }, reduced() ? 0 : 350);
    }
  }
  function init() {
    host = d.querySelector('.blp-misus .bms-form');
    if (!host || host.querySelector('.bms-seg')) return;
    asegurarCss();
    try { acordeon(); } catch (e) {}
    cargar();
    // #direccion / #saltear / #frecuencia / #producto / #baja: link directo con la gestión elegida
    var hg = (location.hash || '').replace(/^#/, '');
    if (ALIAS[hg]) hg = ALIAS[hg];
    if (G[hg]) estado.g = hg;
    armar();
    Array.prototype.forEach.call(d.querySelectorAll('.bms-act'), function (a) {
      var m = /bms-g-([a-z]+)/.exec(a.className), g = m && m[1];
      if (!G[g]) return;
      // la card se marca sólo si la persona eligió (hash o click): la gestión por defecto no es una elección
      a.classList.toggle('on', !!G[hg] && estado.g === g);
      a.addEventListener('click', function (e) {
        e.preventDefault();
        elegirGestion(g, false);
        irAlForm(true, g);
        if (history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#' + g);
      });
    });
    if (G[hg]) setTimeout(function () { irAlForm(false, hg); }, 60);
    if (typeof window.blpDone === 'function') window.blpDone();
  }
  window.bms = {
    estado: function () { return estado; },
    mensaje: function () { return mensaje(estado); },
    asunto: function () { return asunto(estado); },
    validar: function () { return validar(estado); },
    elegir: function (g) { elegirGestion(g, false); }
  };
  // El sello corre en el footer: si el nodo objetivo ya está parseado no hace falta esperar al DOMContentLoaded
  if (d.readyState !== 'loading' || d.querySelector('.blp-misus .bms-form')) init();
  else d.addEventListener('DOMContentLoaded', init);
})();
