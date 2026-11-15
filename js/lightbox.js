/* 圖片放大檢視（第 7 節第 16 項）
   案例頁的元件總表、對比檢查表這類長圖，縮在 780px 的正文欄裡看不清楚。
   每張案例圖包進 <button>，點一下全螢幕開原圖，長圖在面板內自己捲動。
   鍵盤：Enter / Space 開啟，左右鍵切換上下一張，Esc 關閉，
   焦點鎖在面板內，關閉後回到原本那顆按鈕。
   圖說用圖片下方的 .case-img-caption，沒有就用 alt。 */
(function () {
  'use strict';

  var targets = Array.prototype.slice.call(document.querySelectorAll(
    '.case-content .case-img, .case-content .case-img-full, .case-hero-right img'
  ));
  if (!targets.length) return;

  /* ---------- 把每張圖包進 button ---------- */
  var buttons = [];

  targets.forEach(function (img, i) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zoom-btn' + (img.classList.contains('case-img-full') ? ' zoom-btn-full' : '');
    btn.dataset.i = String(i);
    var alt = img.getAttribute('alt') || '圖片';
    btn.setAttribute('aria-label', alt + '（放大檢視）');

    img.parentNode.insertBefore(btn, img);
    btn.appendChild(img);
    /* .zoomable 維持原本的 hover 放大與藍點游標樣式；
       tabindex / role 不再掛在 <img> 上，改由外層 button 負責。 */
    img.classList.add('zoomable');

    btn.addEventListener('click', function () { open(i); });
    buttons.push(btn);
  });

  /* ---------- 面板 ---------- */
  var box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', '圖片放大檢視');
  box.hidden = true;
  box.innerHTML =
    '<p class="lightbox-count" aria-hidden="true"></p>' +
    '<button type="button" class="lightbox-close" aria-label="關閉放大檢視">&#215;</button>' +
    '<button type="button" class="lightbox-prev" aria-label="上一張">&#8249;</button>' +
    '<button type="button" class="lightbox-next" aria-label="下一張">&#8250;</button>' +
    /* data-lenis-prevent：Lenis 會攔下 wheel 事件（連 stop() 之後也一樣），
       沒有這個屬性的話，長圖在面板裡完全捲不動。 */
    '<div class="lightbox-stage" data-lenis-prevent><img alt=""></div>' +
    '<p class="lightbox-caption"></p>';
  document.body.appendChild(box);

  var stage = box.querySelector('.lightbox-stage');
  var bigImg = box.querySelector('.lightbox-stage img');
  var caption = box.querySelector('.lightbox-caption');
  var counter = box.querySelector('.lightbox-count');
  var closeBtn = box.querySelector('.lightbox-close');
  var prevBtn = box.querySelector('.lightbox-prev');
  var nextBtn = box.querySelector('.lightbox-next');

  var current = -1;
  var lastFocused = null;
  var prevOverflow = '';

  /* 圖片下方那行 .case-img-caption；圖在 grid 或 button 裡的話要往上層找 */
  function captionFor(img) {
    var node = img.parentElement && img.parentElement.classList.contains('zoom-btn')
      ? img.parentElement
      : img;
    while (node && node !== document.body) {
      var sib = node.nextElementSibling;
      if (sib && sib.classList.contains('case-img-caption')) return sib.textContent.trim();
      if (node.parentElement && node.parentElement.classList.contains('case-img-grid')) {
        node = node.parentElement;
        continue;
      }
      break;
    }
    return img.getAttribute('alt') || '';
  }

  function show(i) {
    var img = targets[i];
    current = i;
    bigImg.src = img.currentSrc || img.src;
    bigImg.alt = img.getAttribute('alt') || '';
    caption.textContent = captionFor(img);
    counter.textContent = (i + 1) + ' / ' + targets.length;
    stage.scrollTop = 0;
  }

  function open(i) {
    lastFocused = document.activeElement;
    show(i);
    box.hidden = false;
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (window.lenis && window.lenis.stop) window.lenis.stop();
    closeBtn.focus();
  }

  function close() {
    box.hidden = true;
    bigImg.removeAttribute('src');
    document.body.style.overflow = prevOverflow;
    if (window.lenis && window.lenis.start) window.lenis.start();
    /* 焦點回到剛才那張圖的按鈕，不是原本的觸發點 —— 切換過圖之後才正確 */
    var back = (current >= 0 && buttons[current]) ? buttons[current] : lastFocused;
    if (back && typeof back.focus === 'function') back.focus();
    lastFocused = null;
    current = -1;
  }

  function step(d) {
    if (targets.length < 2) return;
    show((current + d + targets.length) % targets.length);
  }

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', function () { step(-1); });
  nextBtn.addEventListener('click', function () { step(1); });

  if (targets.length < 2) {
    prevBtn.hidden = true;
    nextBtn.hidden = true;
    counter.hidden = true;
  }

  /* 點背景關閉，點圖片本身不關 */
  box.addEventListener('click', function (e) {
    if (e.target === box || e.target === stage || e.target === caption) close();
  });

  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); return; }

    /* 長圖要能用鍵盤看完：上下鍵捲動面板，左右鍵才是換圖 */
    var page = Math.max(120, stage.clientHeight * 0.88);
    var dy = null;
    if (e.key === 'ArrowDown') dy = 120;
    else if (e.key === 'ArrowUp') dy = -120;
    else if (e.key === 'PageDown' || e.key === ' ' || e.key === 'Spacebar') dy = page;
    else if (e.key === 'PageUp') dy = -page;
    else if (e.key === 'Home') { e.preventDefault(); stage.scrollTop = 0; return; }
    else if (e.key === 'End') { e.preventDefault(); stage.scrollTop = stage.scrollHeight; return; }
    if (dy !== null) { e.preventDefault(); stage.scrollTop += dy; return; }
    if (e.key !== 'Tab') return;

    /* 焦點鎖在面板內 */
    var list = [closeBtn, prevBtn, nextBtn].filter(function (b) { return !b.hidden; });
    var at = list.indexOf(document.activeElement);
    e.preventDefault();
    if (at === -1) { list[0].focus(); return; }
    list[(at + (e.shiftKey ? -1 : 1) + list.length) % list.length].focus();
  });
})();
