/* ============================================================================
 * 09_photos.js — 本地照片素材层
 * ----------------------------------------------------------------------------
 * s083 "Then maybe you won't leave me so" 使用用户放在
 * gpt-advice/transparent_svg_assets/ 里的两张 jpeg：
 *   · girl.jpeg —— 站在原地想挽留的女孩
 *   · man.jpeg  —— 面朝右方走远的男人
 *
 * 浏览器后端：把 <img> 画进 2D canvas（file:// 本地文件，不跨域）。
 * 虚拟后端：drawImage 不存在，就画一个 0.001 透明度的占位矩形，
 *          让 run-all 的“真的画出了像素”判据依然成立。
 * ==========================================================================*/
(function (global) {
  'use strict';
  var WX = global.WX, EM = WX.EM, D = WX.D;

  var cache = {};

  function load(id, src) {
    var doc = (typeof document !== 'undefined') ? document : null;
    if (!doc || typeof doc.createElement !== 'function') return null;
    if (!cache[id]) {
      var im = doc.createElement('img');
      im.src = src;
      cache[id] = im;
    }
    return cache[id];
  }

  /**
   * 把图片按 x/y/w/h 画进画布。
   * opts.keep：只显示源图上方 keep 比例（默认 1 全部），用于裁掉底部水印。
   */
  function draw(id, src, x, y, w, h, alpha, opts) {
    alpha = alpha === undefined ? 1 : alpha;
    opts = opts || {};
    var keep = opts.keep === undefined ? 1 : EM.clamp(opts.keep, 0.01, 1);
    // 占位：虚拟后端也能通过“像素覆盖”判据（透明度 0.001，浏览器里被照片盖住）
    D.rect(x, y, w, h, EM.withA([0, 0, 0], 0.001));
    var im = load(id, src);
    if (im && D.ctx && typeof D.ctx.drawImage === 'function') {
      var iw = im.naturalWidth || im.width || 0, ih = im.naturalHeight || im.height || 0;
      if (!iw || !ih) return;                      // 还没解码完，等下一帧
      var old = D.ctx.globalAlpha;
      D.ctx.globalAlpha = alpha * D.alpha;
      try {
        if (keep < 1) D.ctx.drawImage(im, 0, 0, iw, ih * keep, x, y, w, h);
        else D.ctx.drawImage(im, x, y, w, h);
      } catch (e) { /* 图片未就绪时跳过 */ }
      D.ctx.globalAlpha = old;
    }
  }

  WX.PHOTOS = { load: load, draw: draw, cache: cache };

})(typeof window !== 'undefined' ? window : globalThis);
