/* Seyedesign site runtime: renders the page template with in-place DOM patching. */
(function () {
  'use strict';
  var comp, root, tpl, pending = false, inert = document.implementation.createHTMLDocument('');
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (o) {
    var next = typeof o === 'function' ? o(this.state) : o;
    for (var k in next) if (Object.prototype.hasOwnProperty.call(next, k)) this.state[k] = next[k];
    schedule();
  };
  window.DCLogic = DCLogic;
  function schedule() { if (pending) return; pending = true; Promise.resolve().then(function () { pending = false; render(); }); }
  function look(p, scopes) {
    var parts = p.split('.'), v, found = false;
    for (var i = scopes.length - 1; i >= 0; i--) { if (scopes[i] && Object.prototype.hasOwnProperty.call(scopes[i], parts[0])) { v = scopes[i][parts[0]]; found = true; break; } }
    if (!found) { if (parts[0] === 'true') return true; if (parts[0] === 'false') return false; return undefined; }
    for (var k = 1; k < parts.length; k++) { if (v == null) return undefined; v = v[parts[k]]; }
    return v;
  }
  var HOLE = /\{\{([\w.]+)\}\}/g;
  function sub(str, scopes) { return str.replace(HOLE, function (m, p) { var v = look(p, scopes); return v == null ? '' : String(v); }); }
  function whole(str) { var m = /^\{\{([\w.]+)\}\}$/.exec((str || '').trim()); return m ? m[1] : null; }
  function proc(node, scopes) {
    if (node.nodeType === 3) { if (node.nodeValue.indexOf('{{') > -1) node.nodeValue = sub(node.nodeValue, scopes); return; }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      var list = look(whole(node.getAttribute('list')), scopes) || [], as = node.getAttribute('as'), frag = node.ownerDocument.createDocumentFragment();
      list.forEach(function (item) { var s = {}; s[as] = item; Array.prototype.forEach.call(node.childNodes, function (ch) { var c = ch.cloneNode(true); frag.appendChild(c); proc(c, scopes.concat([s])); }); });
      node.parentNode.replaceChild(frag, node); return;
    }
    if (tag === 'sc-if') {
      var v = look(whole(node.getAttribute('value')), scopes);
      if (v && v !== 'false') { var kids = Array.prototype.slice.call(node.childNodes), f2 = node.ownerDocument.createDocumentFragment(); kids.forEach(function (k) { f2.appendChild(k); }); node.parentNode.replaceChild(f2, node); kids.forEach(function (k) { proc(k, scopes); }); }
      else node.parentNode.removeChild(node);
      return;
    }
    Array.prototype.slice.call(node.attributes).forEach(function (a) {
      if (/^on[a-z]+$/.test(a.name) && whole(a.value)) {
        var fn = look(whole(a.value), scopes); node.removeAttribute(a.name);
        if (typeof fn === 'function') { node.__on = node.__on || {}; node.__on[a.name.slice(2)] = fn; }
        return;
      }
      if (a.value.indexOf('{{') > -1) node.setAttribute(a.name, sub(a.value, scopes));
    });
    Array.prototype.slice.call(node.childNodes).forEach(function (ch) { proc(ch, scopes); });
  }
  function bind(el) {
    if (el.nodeType !== 1) return;
    var on = el.__on || {};
    el.__h = on;
    Object.keys(on).forEach(function (t) {
      el.__bound = el.__bound || {};
      if (!el.__bound[t]) { el.__bound[t] = true; el.addEventListener(t, function (e) { if (el.__h && el.__h[t]) el.__h[t](e); }); }
    });
    for (var c = el.firstChild; c; c = c.nextSibling) bind(c);
  }
  function same(a, b) { return a.nodeType === b.nodeType && (a.nodeType !== 1 || a.tagName === b.tagName); }
  function patch(oldP, newP) {
    var o = oldP.firstChild, n = newP.firstChild;
    while (n) {
      var nn = n.nextSibling;
      if (!o) { n = document.adoptNode(n); oldP.appendChild(n); bind(n); n = nn; continue; }
      var on = o.nextSibling;
      if (!same(o, n)) { n = document.adoptNode(n); oldP.replaceChild(n, o); bind(n); }
      else if (o.nodeType === 3 || o.nodeType === 8) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; }
      else {
        var i, a;
        for (i = o.attributes.length - 1; i >= 0; i--) { a = o.attributes[i].name; if (!n.hasAttribute(a)) o.removeAttribute(a); }
        for (i = 0; i < n.attributes.length; i++) { a = n.attributes[i]; if (o.getAttribute(a.name) !== a.value) o.setAttribute(a.name, a.value); }
        o.__on = n.__on || {};
        var h = o.__on; o.__h = h;
        Object.keys(h).forEach(function (t) { o.__bound = o.__bound || {}; if (!o.__bound[t]) { o.__bound[t] = true; (function (el, ty) { el.addEventListener(ty, function (e) { if (el.__h && el.__h[ty]) el.__h[ty](e); }); })(o, t); } });
        patch(o, n);
      }
      o = on; n = nn;
    }
    while (o) { var x = o.nextSibling; oldP.removeChild(o); o = x; }
  }
  function render() {
    var vals = comp.renderVals();
    var wrap = inert.createElement('div');
    wrap.appendChild(inert.importNode(tpl.content, true));
    Array.prototype.slice.call(wrap.childNodes).forEach(function (ch) { proc(ch, [{ accent: '#FF0062' }, vals]); });
    patch(root, wrap);
  }
  window.__dcStart = function (C) {
    if (comp) { try { if (comp.componentWillUnmount) comp.componentWillUnmount(); } catch (e) {} comp = null; }
    var first = !comp;
    root = document.getElementById('root'); tpl = document.getElementById('tpl');
    /* first load: keep the pre-rendered markup and patch it in place (no flash); page swaps start clean */
    if (!(first && root.hasAttribute('data-pre'))) { while (root.firstChild) root.removeChild(root.firstChild); }
    root.removeAttribute('data-pre');
    comp = new C({ accent: '#FF0062' });
    render();
    if (window.__SD_PRERENDER) return;
    if (comp.componentDidMount) comp.componentDidMount();
  };
})();
