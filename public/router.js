/* Seyedesign in-site navigation: swaps pages without a full reload so the music keeps playing.
   Real URLs, Back/Forward and direct links all keep working; any failure falls back to a normal page load. */
(function () {
  'use strict';
  if (!window.history || !history.pushState || !window.fetch || !window.DOMParser) return;
  window.__sdRouter = true;
  var ROUTES = ['/', '/say-it-daily', '/lila', '/jackwestin', '/homay', '/top-dogs', '/weframe', '/rubikamp'];
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  function norm(p) { p = (p || '/').replace(/\/index(\.html)?$/, '/').replace(/\.html$/, ''); if (p.length > 1 && p.charAt(p.length - 1) === '/') p = p.slice(0, -1); return p || '/'; }
  function internal(a) {
    if (a.target && a.target !== '_self') return null;
    if (a.hasAttribute('download')) return null;
    var u; try { u = new URL(a.getAttribute('href'), location.href); } catch (e) { return null; }
    if (u.origin !== location.origin) return null;
    return ROUTES.indexOf(norm(u.pathname)) > -1 ? u : null;
  }
  function remember() { try { history.replaceState({ sd: 1, y: window.scrollY }, '', location.href); } catch (e) {} }
  function marks(head) {
    var a = head.querySelector('meta[name="sd-head-start"]'), b = head.querySelector('meta[name="sd-head-end"]'), out = [];
    if (!a || !b) return null;
    for (var n = a.nextSibling; n && n !== b; n = n.nextSibling) out.push(n);
    return { start: a, end: b, nodes: out };
  }
  function swapHead(d) {
    var cur = marks(document.head), nxt = marks(d.head);
    if (!cur || !nxt) throw new Error('markers');
    cur.nodes.forEach(function (n) { n.parentNode.removeChild(n); });
    nxt.nodes.forEach(function (n) { document.head.insertBefore(document.importNode(n, true), cur.end); });
    document.title = d.title;
    ['meta[name="description"]', 'link[rel="canonical"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:url"]'].forEach(function (q) {
      var o = document.head.querySelector(q), n = d.head.querySelector(q);
      if (o && n) { if (o.hasAttribute('content')) o.setAttribute('content', n.getAttribute('content')); if (o.hasAttribute('href')) o.setAttribute('href', n.getAttribute('href')); }
    });
  }
  var seq = 0, here = norm(location.pathname);
  function go(url, push, y) {
    var my = ++seq, root = document.documentElement;
    root.setAttribute('aria-busy', 'true');
    return fetch(url, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (html) {
      if (my !== seq) return;
      var d = new DOMParser().parseFromString(html, 'text/html');
      var tplN = d.getElementById('tpl'), sc = d.querySelector('script[data-sd-page]');
      if (!tplN || !sc) throw new Error('page');
      swapHead(d);
      if (push) history.pushState({ sd: 1, y: 0 }, '', url);
      here = norm(new URL(url, location.href).pathname);
      document.getElementById('tpl').innerHTML = tplN.innerHTML;
      var old = document.querySelector('script[data-sd-page]'); if (old) old.parentNode.removeChild(old);
      var s = document.createElement('script'); s.setAttribute('data-sd-page', ''); s.text = sc.textContent; document.body.appendChild(s);
      root.removeAttribute('aria-busy');
      var hash = new URL(url, location.href).hash;
      requestAnimationFrame(function () {
        var el = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
        if (el) el.scrollIntoView(); else window.scrollTo(0, y || 0);
        var h1 = document.querySelector('#root h1');
        if (push && h1) { if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1'); try { h1.focus({ preventScroll: true }); } catch (e) {} }
      });
    }).catch(function () { location.href = url; });
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null; if (!a) return;
    var u = internal(a); if (!u) return;
    if (norm(u.pathname) === norm(location.pathname) && u.hash) return; /* same-page anchor: let the browser scroll */
    e.preventDefault(); remember();
    go(u.pathname + u.search + u.hash, true, 0);
  });
  window.addEventListener('popstate', function (e) {
    var st = e.state || {};
    if (norm(location.pathname) === here) { var el = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; if (el) el.scrollIntoView(); else window.scrollTo(0, st.y || 0); return; }
    go(location.pathname + location.search + location.hash, false, st.y || 0);
  });
  window.__sdGo = function (url) { remember(); return go(url, true, 0); };
})();

/* "Thinking Out Loud" card: play the LinkedIn video in a modal; loads on open, removed (stops) on close */
(function () {
  if (window.__sdTol) return; window.__sdTol = 1;
  var open = null, last = null;
  function close() {
    if (!open) return; var m = open; open = null;
    document.removeEventListener('keydown', onKey, true);
    document.documentElement.style.overflow = '';
    m.remove();
    if (last && last.focus) try { last.focus(); } catch (e) {}
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab' && open) {
      var f = open.querySelectorAll('button, a[href], iframe'); if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }
  document.addEventListener('click', function (e) {
    var c = e.target && e.target.closest ? e.target.closest('a[data-tol]') : null;
    if (!c || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); last = c;
    var urn = c.getAttribute('data-tol'), href = c.getAttribute('href');
    var m = document.createElement('div');
    m.className = 'tol-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Video: AI Slop Is Everywhere.');
    m.innerHTML = '<div class="tol-box">' +
      '<button type="button" class="tol-x" aria-label="Close video"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>' +
      '<div class="tol-frame"><iframe src="https://www.linkedin.com/embed/feed/update/' + urn + '?compact=1" title="Embedded LinkedIn video: AI Slop Is Everywhere." allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen loading="eager"></iframe></div>' +
      '<div class="tol-bar"><span class="tol-bar-t">AI Slop Is Everywhere.</span><a class="tol-li" href="' + href + '" target="_blank" rel="noopener">View on LinkedIn<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"></path></svg><span class="vh"> (opens in a new tab)</span></a></div>' +
      '</div>';
    m.addEventListener('click', function (ev) { if (ev.target === m || (ev.target.closest && ev.target.closest('.tol-x'))) close(); });
    document.body.appendChild(m); open = m;
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(function () { m.classList.add('is-open'); });
    m.querySelector('.tol-x').focus();
  }, true);
  window.addEventListener('popstate', close);
})();
