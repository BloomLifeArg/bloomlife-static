/* Footer nativo de Morelia con otro vuelo — corre en TODAS las páginas.
 *
 * Loader en el seal (custom_seal_code):
 *   <script>(function(){var s=document.createElement("script");
 *   s.src="https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@HASH/js/footer.js";
 *   document.head.appendChild(s);})();</script>
 *
 * Qué hace: engancha css/footer.css (del MISMO commit, el hash sale de la URL
 * de este archivo), pone `blf` en el <footer data-store="footer"> y hace
 * retoques de DOM mínimos e idempotentes:
 *   - clases de grupo en los bloques del .container (.blf-social, .blf-nav,
 *     .blf-news, .blf-contact, .blf-logos, .blf-seal, .blf-powered)
 *   - eyebrow "Seguinos" antes de los íconos de RRSS
 *   - título editorial antes del .js-newsletter (FUERA del <form>)
 *   - en cada .contact-link: ícono (símbolos <use> del propio tema) + label,
 *     y el número de WhatsApp formateado en un span visible; el texto crudo
 *     queda en un span oculto. El nodo del mail (Cloudflare email-protection)
 *     sólo se mueve dentro del mismo <a>: no se lee ni se reescribe.
 *   - copyright + legales envueltos en .blf-bottom
 * Ni el <form> del newsletter, ni sus inputs/names/action, ni ningún href se
 * tocan. Si la estructura no es la esperada, no toca nada.
 *
 * Kill-switch: localStorage.setItem('blf-off','1').
 * Anti-flash: el footer queda visibility:hidden hasta que llega la hoja
 * (o 2,5 s, lo que pase primero). Está bajo el pliegue: casi nunca se nota.
 */
(function () {
  var d = document;
  try { if (window.localStorage && localStorage.getItem('blf-off') === '1') return; } catch (e) {}

  var yo = d.currentScript;
  var base = (yo && yo.src)
    ? yo.src.replace(/\/js\/footer\.js.*$/, '')
    : 'https://cdn.jsdelivr.net/gh/BloomLifeArg/bloomlife-static@main';

  var SVGNS = 'http://www.w3.org/2000/svg', XLINK = 'http://www.w3.org/1999/xlink';

  function el(tag, cls, txt) {
    var e = d.createElement(tag);
    if (cls) e.className = cls;
    if (txt) e.appendChild(d.createTextNode(txt));
    return e;
  }
  function has(node, sel) { return !!node.querySelector(sel); }
  function addClass(node, c) {
    if ((' ' + node.className + ' ').indexOf(' ' + c + ' ') < 0) node.className += (node.className ? ' ' : '') + c;
  }
  function icono(id) {
    if (!d.getElementById(id)) return null;
    var w = el('span', 'blf-ic');
    var s = d.createElementNS(SVGNS, 'svg');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var u = d.createElementNS(SVGNS, 'use');
    u.setAttributeNS(XLINK, 'xlink:href', '#' + id);
    u.setAttribute('href', '#' + id);
    s.appendChild(u);
    w.appendChild(s);
    return w;
  }
  // 5491124785477 → +54 9 11 2478-5477 (sólo celulares AR con 9; otro formato queda igual)
  function fmtTel(raw) {
    var m = /^549(\d{2,4})(\d{4})(\d{4})$/.exec(raw);
    return m ? '+54 9 ' + m[1] + ' ' + m[2] + '-' + m[3] : null;
  }

  function vestirChip(a, kind) {
    if (has(a, '.blf-txt')) return;
    var lab = { wa: 'WhatsApp', mail: 'Mail', blog: 'Blog' }[kind];
    var ic = icono({ wa: 'whatsapp', mail: 'email', blog: 'comments' }[kind]);
    var txt = el('span', 'blf-txt');
    txt.appendChild(el('span', 'blf-lab', lab));
    var val = el('span', 'blf-val');
    // mover los hijos originales (texto o el <span class="__cf_email__">) sin reescribirlos
    while (a.firstChild) val.appendChild(a.firstChild);
    if (kind === 'wa') {
      var raw = (val.textContent || val.innerText || '').replace(/\s+/g, '');
      var f = fmtTel(raw);
      if (f) {
        var hid = el('span', 'blf-raw');
        hid.setAttribute('aria-hidden', 'true');
        while (val.firstChild) hid.appendChild(val.firstChild);
        val.appendChild(hid);
        val.appendChild(d.createTextNode(f));
      }
    }
    txt.appendChild(val);
    if (ic) a.appendChild(ic);
    a.appendChild(txt);
    addClass(a, 'blf-chip');
  }

  function armar() {
    var f = d.querySelector('footer[data-store="footer"]') || d.querySelector('footer.js-footer');
    if (!f || (' ' + f.className + ' ').indexOf(' blf ') >= 0) return true;
    var cont = f.querySelector('.container');
    if (!cont) return false;
    // estructura mínima esperada
    if (!has(cont, '.footer-menu-link') || !has(cont, '.js-newsletter form') || !has(cont, '.contact-link')) return false;

    var kids = [], i, k;
    for (i = 0; i < cont.children.length; i++) kids.push(cont.children[i]);
    var copy = null, legal = null;

    for (i = 0; i < kids.length; i++) {
      k = kids[i];
      if (has(k, '.social-icon')) {
        addClass(k, 'blf-social');
        if (!has(k, '.blf-eb')) k.insertBefore(el('span', 'blf-eb', 'Seguinos'), k.firstChild);
      } else if (has(k, '.footer-menu-link')) {
        addClass(k, 'blf-nav');
        // "Wellness Blog" sale de la botonera: más abajo el chip "¡Visitá nuestro Blog!" ya
        // lo impulsa (pedido de Sergio 2026-09-12). El ítem sigue existiendo en el menú del
        // admin; se saca acá porque el editor de menús no persiste la eliminación por automatización.
        var links = k.querySelectorAll('.footer-menu-link');
        for (var q = 0; q < links.length; q++) {
          var hrefL = (links[q].getAttribute('href') || '').replace(/^https?:\/\/[^\/]+/, '');
          if (/^\/blog\/?$/.test(hrefL) && /blog/i.test(links[q].textContent)) {
            var li = links[q].closest ? links[q].closest('li') : links[q].parentNode;
            if (li && li.parentNode) li.parentNode.removeChild(li);
          }
        }
      } else if (has(k, '.js-newsletter')) {
        addClass(k, 'blf-news');
        if (!has(k, '.blf-news-t')) {
          k.insertBefore(el('div', 'blf-news-t', 'Ideas para sentirte bien, directo a tu casilla.'), k.firstChild);
        }
      } else if (has(k, '.contact-link')) {
        addClass(k, 'blf-contact');
        var links = k.querySelectorAll('a.contact-link'), j, a, href, kind;
        for (j = 0; j < links.length; j++) {
          a = links[j];
          href = a.getAttribute('href') || '';
          if (/wa\.me|whatsapp/i.test(href)) kind = 'wa';
          else if (/email-protection|^mailto:/i.test(href) || has(a, '.__cf_email__')) kind = 'mail';
          else if (/\/blog/i.test(href)) kind = 'blog';
          else continue;
          vestirChip(a, kind);
        }
      } else if (has(k, '.footer-payments-shipping-logos')) {
        addClass(k, 'blf-logos');
      } else if (has(k, '.custom-seal') || has(k, '.seal-afip')) {
        addClass(k, 'blf-seal');
      } else if (has(k, '.powered-by-logo')) {
        addClass(k, 'blf-powered');
      } else if ((' ' + k.className + ' ').indexOf(' claim-link ') >= 0) {
        legal = k;
      } else if (/copyright|derechos reservados/i.test(k.textContent || '') && k.children.length === 0) {
        copy = k;
      }
    }
    if (copy && legal && !copy.parentNode.className.match(/\bblf-bottom\b/)) {
      var wrap = el('div', 'blf-bottom');
      cont.insertBefore(wrap, copy);
      wrap.appendChild(copy);
      wrap.appendChild(legal);
    }
    addClass(f, 'blf');
    return true;
  }

  // CSS + guard anti-flash (falla a visible)
  var g = el('style'); g.id = 'blf-guard';
  g.appendChild(d.createTextNode('footer[data-store="footer"]{visibility:hidden}'));
  d.head.appendChild(g);
  var listo = false;
  function destapar() {
    if (listo) return; listo = true;
    if (g.parentNode) g.parentNode.removeChild(g);
  }
  var l = d.createElement('link');
  l.rel = 'stylesheet';
  l.href = base + '/css/footer.css';
  l.onload = l.onerror = destapar;
  d.head.appendChild(l);
  setTimeout(destapar, 2500);

  // el seal vive DENTRO del footer: los hermanos de abajo pueden no estar parseados aún
  function go() { if (!armar()) destapar(); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', go);
  else go();
})();
