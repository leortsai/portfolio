/* About 人像：進入畫面時由下往上揭開，照片同時從 1.08 沉降到 1。
   只用一個 IntersectionObserver 觸發一次，動畫本身交給 CSS transition，
   不做捲動 scrub——scrub 會讓畫面長時間停在中間狀態，看起來很生硬。 */
(function () {
  'use strict';

  var el = document.querySelector('.about-portrait');
  if (!el) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.classList.add('is-in');
    return;
  }

  if (!('IntersectionObserver' in window)) { el.classList.add('is-in'); return; }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -18% 0px' });

  io.observe(el);
})();
