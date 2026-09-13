/* Mi cuenta — /account/* (.bac)
 *
 * Reviste los templates nativos de Morelia sin tocar los <form> (login, registro,
 * reset, nueva contraseña, datos, direcciones: todos post del tema con reCAPTCHA y
 * validación propia). Hace tres cosas:
 *  1. Marca el body: .bac + la vista (.bac-login, .bac-register, .bac-orders…) y
 *     .bac-form (vistas de formulario público) o .bac-sesion (con sesión).
 *  2. Cabecera: bajada por vista debajo del h1; en login/registro/reset suma el
 *     panel lateral petróleo (qué ganás con la cuenta + puerta a /mi-suscripcion/,
 *     que no pide login). Con sesión, la navegación en pastillas.
 *  3. Destapa: html.bl-ok (el css_code esconde .account-page/.page-header hasta
 *     que llega la hoja) y quita #bac-guard del seal.
 * La vista sale de body.template-account-<vista>; si el tema no la trae, del path.
 */
(function () {
  var d = document;
  var yo = d.currentScript;
  var base = (yo && yo.src) ? yo.src.replace(/\/js\/cuenta\.js.*$/, '')
    : 'https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@main';

  var VISTAS = {
    login:     { sub: 'Entrá para ver tus pedidos, tus direcciones y llevar el control de tu rutina.', form: true },
    register:  { sub: 'Con la cuenta seguís tus pedidos y comprás más rápido la próxima vez.', form: true },
    reset:     { sub: 'Te mandamos un mail con el link para elegir una contraseña nueva.', form: true },
    newpass:   { sub: 'Elegí una contraseña nueva. Después entrás con ella como siempre.', form: true },
    orders:    { sub: 'Tus pedidos, tus datos y tus direcciones. Lo de la suscripción se gestiona aparte.' },
    order:     { sub: 'El detalle del pedido tal como lo procesamos. Si algo no coincide, escribinos.' },
    addresses: { sub: 'Las direcciones guardadas para tus próximas compras.' },
    address:   { sub: 'Con código postal y alguna referencia si el timbre no tiene nombre.' },
    info:      { sub: 'Nombre, mail y teléfono con los que te contactamos por tus pedidos.' }
  };
  var NAV = [
    { t: 'Mis pedidos', h: '/account/', v: ['orders', 'order'] },
    { t: 'Mis datos', h: '/account/info/', v: ['info'] },
    { t: 'Mis direcciones', h: '/account/addresses/', v: ['addresses', 'address'] },
    { t: 'Mi suscripción', h: 'https://www.bloomlife.co/mi-suscripcion/', v: [] }
  ];

  function el(tag, cls, html) { var e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function vista() {
    var m = /template-account-([a-z]+)/.exec(d.body.className);
    if (m && VISTAS[m[1]]) return m[1];
    var p = location.pathname;
    if (/\/account\/login/.test(p)) return 'login';
    if (/\/account\/register/.test(p)) return 'register';
    if (/\/account\/reset/.test(p)) return 'reset';
    if (/\/account\/(newpass|new-password|password)/.test(p)) return 'newpass';
    if (/\/account\/orders?\/\d+/.test(p)) return 'order';
    if (/\/account\/addresses/.test(p)) return 'addresses';
    if (/\/account\/address/.test(p)) return 'address';
    if (/\/account\/info/.test(p)) return 'info';
    return 'orders';
  }

  function css(cb) {
    if (d.querySelector('link[data-bac]')) { cb(); return; }
    var l = d.createElement('link'); l.rel = 'stylesheet'; l.href = base + '/css/cuenta.css';
    l.setAttribute('data-bac', ''); l.onload = l.onerror = cb; d.head.appendChild(l);
  }

  function destapar() {
    if (d.documentElement.className.indexOf('bl-ok') < 0) d.documentElement.className += ' bl-ok';
    var g = d.getElementById('bac-guard'); if (g) g.remove();
  }

  function cabecera(v) {
    var ph = d.querySelector('.page-header[data-store="page-title"]') || d.querySelector('.page-header');
    if (!ph || ph.querySelector('.bac-sub')) return;
    var h1 = ph.querySelector('h1');
    if (h1 && VISTAS[v].sub) h1.insertAdjacentElement('afterend', el('p', 'bac-sub', VISTAS[v].sub));
  }

  function aside(v) {
    var row = d.querySelector('.account-page .row.justify-content-center');
    if (!row || row.querySelector('.bac-aside')) return;
    var a = el('aside', 'bac-aside');
    a.appendChild(el('div', 'bac-aside__k', 'Tu cuenta Bloom'));
    a.appendChild(el('h2', 'bac-aside__t', v === 'register' ? 'Una cuenta, toda tu rutina a mano.' : 'Todo lo tuyo, en un solo lugar.'));
    var ul = el('ul', 'bac-aside__l');
    [['<b>Tus pedidos</b>, con el estado del pago y del envío.', ''],
     ['<b>Tus direcciones</b> guardadas para comprar en dos toques.', ''],
     ['<b>Tus datos</b> siempre actualizados para que te encontremos rápido.', '']
    ].forEach(function (x) { ul.appendChild(el('li', null, x[0])); });
    a.appendChild(ul);
    var cta = el('a', 'bac-aside__cta', v === 'register' ? 'Cómo funciona la suscripción' : 'Encontrá tu suplemento');
    cta.href = v === 'register' ? 'https://www.bloomlife.co/suscripciones/' : 'https://www.bloomlife.co/que-suplemento-es-para-vos/';
    a.appendChild(cta);
    a.appendChild(el('p', 'bac-aside__nota', '¿Querés cambiar algo de tu suscripción? No hace falta entrar: <a href="https://www.bloomlife.co/mi-suscripcion/">pedilo desde Mi suscripción</a> con tu número de pedido.'));
    row.appendChild(a);
  }

  function nav(v) {
    var cont = d.querySelector('.account-page .container');
    if (!cont || cont.querySelector('.bac-nav')) return;
    var n = el('nav', 'bac-nav'); n.setAttribute('aria-label', 'Secciones de la cuenta');
    NAV.forEach(function (i) {
      var a = el('a', null, i.t); a.href = i.h;
      if (i.v.indexOf(v) > -1) { a.className = 'is-active'; a.setAttribute('aria-current', 'page'); }
      n.appendChild(a);
    });
    var s = el('a', 'bac-nav__salir', 'Cerrar sesión');
    var nativo = d.querySelector('.account-page a[href*="logout"]');   // el botón gris del tema, que el CSS oculta
    s.href = nativo ? nativo.getAttribute('href') : '/account/logout/';
    n.appendChild(s);
    cont.insertBefore(n, cont.firstChild);
  }

  function init() {
    if (!d.body || d.body.className.indexOf('bac') > -1) return;
    var v = vista();
    d.body.className += ' bac bac-' + v + (VISTAS[v].form ? ' bac-form' : ' bac-sesion');
    try {
      cabecera(v);
      if (VISTAS[v].form && v !== 'newpass') aside(v);
      if (!VISTAS[v].form) nav(v);
    } catch (e) {}
    css(destapar);
    setTimeout(destapar, 3000);
  }
  if (d.readyState !== 'loading' && d.querySelector('.account-page')) init();
  else d.addEventListener('DOMContentLoaded', init);
})();
