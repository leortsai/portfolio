/* 前後對照滑桿（第 7 節第 17 項）
   把手是 role="slider" 的按鈕，aria-valuenow 跟著位置走，
   方向鍵 ±2（Shift ±10）、Home / End 到兩端，指標可拖曳也可點。
   位置只改 CSS 變數 --compare-pos，由 clip-path 吃掉，不碰版面。 */
(function () {
  'use strict';

  var frames = Array.prototype.slice.call(document.querySelectorAll('[data-compare]'));
  if (!frames.length) return;

  frames.forEach(function (frame) {
    var handle = frame.querySelector('.compare-handle');
    if (!handle) return;

    var pos = Number(handle.getAttribute('aria-valuenow'));
    if (!isFinite(pos)) pos = 50;

    function set(v) {
      pos = Math.min(100, Math.max(0, v));
      frame.style.setProperty('--compare-pos', String(pos));
      handle.setAttribute('aria-valuenow', String(Math.round(pos)));
      handle.setAttribute('aria-valuetext', '顯示修正後 ' + Math.round(pos) + '%');
    }

    function fromClientX(x) {
      var r = frame.getBoundingClientRect();
      if (!r.width) return;
      set(((x - r.left) / r.width) * 100);
    }

    set(pos);

    /* ---------- 指標 ---------- */
    var dragging = false;

    frame.addEventListener('pointerdown', function (e) {
      /* 讓放大按鈕之類的子元素自己處理 */
      if (e.target.closest && e.target.closest('button:not(.compare-handle)')) return;
      dragging = true;
      frame.setPointerCapture(e.pointerId);
      fromClientX(e.clientX);
      handle.focus();
      e.preventDefault();
    });

    frame.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      fromClientX(e.clientX);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      if (frame.hasPointerCapture && frame.hasPointerCapture(e.pointerId)) {
        frame.releasePointerCapture(e.pointerId);
      }
    }
    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);

    /* ---------- 鍵盤 ---------- */
    handle.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 2;
      var next = null;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = pos - step;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = pos + step;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = 100;
      else if (e.key === 'PageDown') next = pos - 10;
      else if (e.key === 'PageUp') next = pos + 10;
      if (next === null) return;
      e.preventDefault();
      set(next);
    });
  });
})();
