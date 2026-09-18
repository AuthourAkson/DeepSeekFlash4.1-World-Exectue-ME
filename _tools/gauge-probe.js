/* _tools/gauge-probe.js — 注入到 gender-gauge.html 副本里的探针（修正版设计） */
var NL = String.fromCharCode(10), TAB = String.fromCharCode(9);
function rotOf(e) { var t = e.getAttribute('transform') || '', k = t.indexOf('rotate('); return k < 0 ? NaN : parseFloat(t.slice(k + 7)); }
function txOf(e) { var t = e.getAttribute('transform') || '', k = t.indexOf('translate('); return k < 0 ? NaN : parseFloat(t.slice(k + 10)); }
function op(e) { if (!e) return NaN; var v = parseFloat(e.style.opacity); return isFinite(v) ? v : parseFloat(e.getAttribute('opacity')); }
function fillOf(e) { var c = e.querySelector('circle'); return c ? parseFloat(c.getAttribute('fill-opacity') || 0) : 0; }

window.addEventListener('load', function () {
  setTimeout(function () {
    var out = [];
    try {
      var times = [88.70, 89.10, 90.30, 90.55, 90.70, 90.80, 91.20, 91.70, 92.30, 92.60, 94.20, 94.80, 95.10, 95.50, 97.90, 98.40, 98.90, 99.40];
      times.forEach(function (t) {
        var st = GAUGE.setLyricTime(t * 1000), d = document, r = [];
        r.push(t.toFixed(3));
        r.push('phase=' + st.phase);
        r.push('badge=' + op(d.getElementById('config-badge')).toFixed(2));
        r.push('title=' + op(d.getElementById('title-text')).toFixed(2));
        r.push('symL=' + txOf(d.getElementById('symbol-left')).toFixed(0));
        r.push('leftF=' + (d.getElementById('symbol-left').innerHTML.indexOf('M -41,41') >= 0 ? 1 : 0));
        r.push('rightM=' + (d.getElementById('symbol-right').innerHTML.indexOf('M 41,-41') >= 0 ? 1 : 0));
        r.push('needleRot=' + rotOf(d.getElementById('combined-symbol')).toFixed(0));
        r.push('ripple0=' + op(d.querySelector('#ripple-rings circle')).toFixed(2));
        r.push('imgF=' + op(d.getElementById('gauge-img-froms')).toFixed(2));
        r.push('imgM=' + op(d.getElementById('gauge-img-tom')).toFixed(2));
        out.push(r.join(TAB));
      });
      document.getElementById('probeout').textContent = 'PROBE_OK' + NL + out.join(NL);
    } catch (e) {
      document.getElementById('probeout').textContent = 'PROBE_FAIL ' + (e && e.message ? e.message : e);
    }
  }, 400);
});
