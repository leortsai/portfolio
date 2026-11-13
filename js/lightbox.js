/* 圖片放大檢視
   案例頁的元件總表、對比檢查表這類長圖，縮在 780px 的正文欄裡看不清楚。
   點任何一張案例圖就全螢幕打開原圖，長圖在面板內自己捲動。
   鍵盤：Enter / Space 開啟，Esc 關閉，焦點鎖在面板內，關閉後回到原本那張圖。 */
(function () {
  'use strict';

  var targets = document.querySelectorAll(
    '.case-content .case-img, .case-content .case-img-full, .case-hero-right img'
  );
  if (!targets.length) return;

  var box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', '圖片放大檢視');
  box.hidden = true;
  box.innerHTML =
    '<button type="button" class="lightbox-close" aria-label="關閉放大檢視">&#215;</button>' +
    '<div class="lightbox-stage"><img alt=""></div>' +
    '<p class="lightbox-caption"></p>';
  document.body.appendChild(box);

  var stage = box.querySelector('.lightbox-stage');
  var bigImg = box.querySelector('.lightbox-stage img');
  var caption = box.querySelector('.lightbox-caption');
  var closeBtn = box.querySelector('.lightbox-close');
  var lastFocused = null;
  var prevOverflow = '';

  /* 圖片下方那行 .case-img-caption；圖在 grid 裡的話要往上層找 */
  function captionFor(img) {
    var node = img;
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

  function open(img) {
    lastFocused = document.activeElement;
    bigImg.src = img.currentSrc || img.src;
    bigImg.alt = img.getAttribute('alt') || '';
    caption.textContent = captionFor(img);
    stage.scrollTop = 0;

    box.hidden = false;
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function close() {
    box.hidden = true;
    bigImg.removeAttribute('src');
    document.body.style.overflow = prevOverflow;
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
  }

  Array.prototype.forEach.call(targets, function (img) {
    img.classList.add('zoomable');
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    var alt = img.getAttribute('alt') || '圖片';
    img.setAttribute('aria-label', alt + '（點擊放大檢視）');

    img.addEventListener('click', function () { open(img); });
    img.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        open(img);
      }
    });
  });

  closeBtn.addEventListener('click', close);

  /* 點背景關閉，點圖片本身不關 */
  box.addEventListener('click', function (e) {
    if (e.target === box || e.target === stage || e.target === caption) close();
  });

  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    /* 面板裡只有一個可聚焦元素，Tab 一律留在它身上 */
    if (e.key === 'Tab') {
      e.preventDefault();
      closeBtn.focus();
    }
  });
})();
