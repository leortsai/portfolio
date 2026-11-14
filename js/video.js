/* 影片元件（第 7 節第 18 項）
   <video muted loop playsinline> 加一顆播放／暫停按鈕。
   只有在沒開啟「減少動態」時才自動播放；開啟時停在 poster，由使用者自己按。
   影片捲出畫面就暫停，省電也省頻寬。 */
(function () {
  'use strict';

  var videos = Array.prototype.slice.call(document.querySelectorAll('.case-video video'));
  if (!videos.length) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  videos.forEach(function (v) {
    var wrap = v.closest('.case-video');
    if (!wrap) return;

    /* 按鈕要壓在影片上，不是壓在 figcaption 上，所以另外包一層定位容器 */
    var frame = document.createElement('div');
    frame.className = 'case-video-frame';
    v.parentNode.insertBefore(frame, v);
    frame.appendChild(v);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'video-toggle';
    frame.appendChild(btn);

    function label() {
      var playing = !v.paused && !v.ended;
      btn.innerHTML = playing ? '&#10073;&#10073;' : '&#9654;';
      btn.setAttribute('aria-label', (playing ? '暫停' : '播放') + '：' + (v.dataset.title || '示範影片'));
    }

    btn.addEventListener('click', function () {
      if (v.paused) { v.play().catch(function () {}); }
      else { v.pause(); }
    });

    v.addEventListener('play', label);
    v.addEventListener('pause', label);
    label();

    /* 自動播放：未開啟減少動態，且影片進入畫面時 */
    if (reduce.matches || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          if (v.paused && !v.dataset.userPaused) v.play().catch(function () {});
        } else if (!v.paused) {
          v.pause();
          delete v.dataset.userPaused;   /* 捲出畫面的暫停不算使用者按的 */
        }
      });
    }, { threshold: 0.35 });

    /* 使用者自己按暫停之後，不要再因為捲動又自動播起來 */
    btn.addEventListener('click', function () {
      if (v.paused) v.dataset.userPaused = '1';
      else delete v.dataset.userPaused;
    });

    io.observe(v);
  });
})();
