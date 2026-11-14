/* 第 7-1 節：捲動動態
   GSAP 3.12.5 + ScrollTrigger，搭配 main.js 已經起好的 Lenis（window.lenis）。
   只動 transform / opacity / clip-path，不攔截捲動、不改捲動速度。

   規則
   - 沒有 JS 或 GSAP 載入失敗時，內容原本就是完整可見的，這支只做加法。
   - prefers-reduced-motion: reduce 直接整支不跑，pin 也不會發生。
   - 手機（< 768px）只留第 1、2、3、5 項，其餘改靜態或原生左右滑動。
   - 時間與曲線用第 7 節的動畫 token（--dur-base 250ms / --dur-slow 400ms，
     ease-out = cubic-bezier(0.2, 0, 0, 1)）。 */
(function () {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  /* Lenis 用的是原生視窗捲動，ScrollTrigger 自己的監聽本來就收得到；
     這一行是讓兩邊在同一幀更新，避免 pin 的區塊晚一格。 */
  if (window.lenis && window.lenis.on) {
    window.lenis.on('scroll', ScrollTrigger.update);
  }

  var DESK = window.matchMedia('(min-width: 769px)').matches;
  var EASE = 'power3.out';
  var q = function (s, r) { return (r || document).querySelector(s); };
  var all = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* main.js 的 .reveal 會把元素壓成 opacity:0。gsap.from() 讀的是「現在的值」，
     元素還是 0 的時候 from 等於 0 → 0，動畫看起來像沒跑、而且永遠不顯示。
     只加 .visible 不夠：.reveal 帶 0.7s transition，加上 class 之後
     getComputedStyle 當下讀到的還是 0。要把 transition 關掉並直接寫上終值，
     GSAP 才讀得到 1。 */
  function own(el) {
    if (!el || !el.classList) return el;
    if (el.classList.contains('reveal')) {
      el.style.transition = 'none';
      el.classList.add('visible');
      el.style.opacity = '1';
      el.style.transform = 'none';
    }
    return el;
  }

  /* ============================================================
     1 Hero 展開（case study）
     圖一開始左右內縮、圓角 24px，往下捲展開成滿版、圓角歸零；
     左欄標題同時微微上移淡出。
     ============================================================ */
  (function heroExpand() {
    var media = q('.case-hero-right');
    var hero = q('.case-hero');
    if (!media || !hero) return;

    var panel = q('.case-hero-left');
    var st = { trigger: hero, start: 'top top', end: '+=420', scrub: true };

    /* 左右各自往內縮，展開後在中線接起來，看起來是同一塊整體打開。
       內縮量用 px 不用 %：左欄的 padding 是 60px，9% 在 1440 寬會變成 65px，
       會切到「Acer 官網」的字；40px 固定值不管視窗多寬都在 padding 裡面。 */
    var inL = DESK ? 'inset(48px 0px 48px 40px round 24px)' : 'inset(20px 16px round 16px)';
    var inR = DESK ? 'inset(48px 40px 48px 0px round 24px)' : 'inset(20px 16px round 16px)';

    gsap.fromTo(media,
      { clipPath: inR },
      { clipPath: 'inset(0px 0px 0px 0px round 0px)', ease: 'none', scrollTrigger: Object.assign({}, st) });

    if (panel) {
      gsap.fromTo(panel,
        { clipPath: inL },
        { clipPath: 'inset(0px 0px 0px 0px round 0px)', ease: 'none', scrollTrigger: Object.assign({}, st) });
    }

    var left = all('.case-hero-left > *');
    if (left.length) {
      gsap.to(left, { y: -40, opacity: 0.25, ease: 'none', scrollTrigger: Object.assign({}, st) });
    }
  })();

  /* ============================================================
     2 段落編號翻動（case study）
     左欄 .case-section-label 本來就是 sticky，這裡只補編號的上下翻動。
     ============================================================ */
  (function numRoll() {
    all('.case-section-num').forEach(function (n) {
      if (n.querySelector('.num-roll')) return;
      var txt = n.textContent.trim();
      var roll = document.createElement('span');
      roll.className = 'num-roll';
      roll.textContent = txt;
      n.textContent = '';
      n.appendChild(roll);

      gsap.from(roll, {
        yPercent: 115, duration: 0.5, ease: EASE,
        scrollTrigger: {
          trigger: n.closest('.case-section'),
          start: 'top 70%',
          toggleActions: 'play none none reverse'
        }
      });
    });
  })();

  /* ============================================================
     3 圖片出場（case study + Visual Work）
     由下往上以 clip-path 揭開，同時從 1.08 縮到 1；圖說晚 100ms 淡入。
     clip-path 會把 box-shadow 一起切掉，所以結束時用 clearProps 還原。
     ============================================================ */
  (function imageReveal() {
    var items = all('.case-content .zoom-btn').concat(all('.vw-content .vw-main'))
      /* 橫向展示裡的圖由第 4 項負責，不要再各自揭開一次 */
      .filter(function (el) { return !el.closest('.htrack'); });
    if (!items.length) return;

    items.forEach(function (el) {
      var img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (!img) return;

      var sib = el.nextElementSibling;
      var cap = sib && (sib.classList.contains('case-img-caption') ||
                        sib.classList.contains('vw-cap')) ? sib : null;

      var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%' } });
      tl.fromTo(el,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power3.inOut', clearProps: 'clipPath' })
        .from(img, { scale: 1.08, duration: 1.1, ease: EASE, clearProps: 'transform' }, 0);
      if (cap) tl.from(cap, { opacity: 0, y: 8, duration: 0.4 }, 0.1);
    });
  })();

  /* ============================================================
     13 Visual Work：細節圖依序進場，間隔 80ms
     ============================================================ */
  (function vwStagger() {
    all('.vw-grid, .vw-pair').forEach(function (g) {
      gsap.from(g.children, {
        y: 28, opacity: 0, duration: 0.6, ease: EASE, stagger: 0.08,
        scrollTrigger: { trigger: g, start: 'top 85%' }
      });
    });
  })();

  /* ============================================================
     5 數字跑動（III Awards 第 8 段）
     數字層是 aria-hidden，旁邊另有一份 .sr-only 的完整文字，
     螢幕閱讀器讀到的一直都是最終數值。
     ============================================================ */
  (function counters() {
    all('.cnt[data-to]').forEach(function (el) {
      var to = Number(el.dataset.to);
      if (!isFinite(to)) return;
      var v = { n: 0 };
      el.textContent = '0';
      gsap.to(v, {
        n: to, duration: 1, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%' },
        onUpdate: function () { el.textContent = String(Math.round(v.n)); },
        onComplete: function () { el.textContent = String(to); }
      });
    });
  })();

  /* 以下只在桌機跑 */
  if (!DESK) return;

  /* ============================================================
     9 首頁作品卡：圖片視差 ±40px，卡片依序進場間隔 80ms
     ============================================================ */
  (function homeCards() {
    var grid = q('.work-grid');
    if (!grid) return;

    var cards = Array.prototype.slice.call(grid.children).map(own);
    gsap.from(cards, {
      y: 40, opacity: 0, duration: 0.6, ease: EASE, stagger: 0.08,
      scrollTrigger: { trigger: grid, start: 'top 82%' }
    });

    all('.work-card-media img').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -5 }, {
        yPercent: 5, ease: 'none',
        scrollTrigger: { trigger: img.closest('.work-card'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  })();

  /* ============================================================
     10 首頁「Open to opportunities」與大標：以行為單位由下往上
     ============================================================ */
  (function homeHero() {
    var hero = q('.hero-inner');
    if (!hero) return;

    /* 大標是 Fuyu<br>Tsai.，先把兩行各自包成一個 span 才能逐行動 */
    var name = q('.hero-name', hero);
    var nameLines = [];
    if (name && !name.querySelector('.ln-rise')) {
      own(name);
      var parts = name.innerHTML.split(/<br\s*\/?>/i);
      name.innerHTML = parts.map(function (p) {
        return '<span class="ln-rise"><span class="ln-inner">' + p + '</span></span>';
      }).join('');
      nameLines = all('.ln-inner', name);
    }

    var seq = [];
    var eyebrow = q('.hero-eyebrow', hero);
    if (eyebrow) seq.push(own(eyebrow));
    seq = seq.concat(nameLines);

    var bottom = q('.hero-bottom', hero);
    if (bottom) { own(bottom); seq = seq.concat(all('.hero-desc .ln', bottom)); }

    var meta = all('.hero-meta > span');
    seq = seq.concat(meta);

    if (!seq.length) return;
    gsap.from(seq, {
      yPercent: 60, opacity: 0, duration: 0.8, ease: EASE, stagger: 0.08, delay: 0.2,
      /* 遮罩只在動畫期間需要，留著會把「Fuyu」的 y 下伸部永久切掉 */
      onComplete: function () {
        all('.ln-rise', hero).forEach(function (e) { e.classList.add('is-done'); });
      }
    });
  })();

  /* ============================================================
     7 段落底色轉換（無障礙段落）
     進入時頁面底色過渡到淺灰，離開時恢復。
     body.alt 的文字色在 CSS 裡另外壓過，兩種底色對比都 ≥ 4.5:1。
     ============================================================ */
  (function altZone() {
    var zone = q('.alt-zone');
    if (!zone) return;
    ScrollTrigger.create({
      trigger: zone, start: 'top 55%', end: 'bottom 45%',
      onToggle: function (st) { document.body.classList.toggle('alt', st.isActive); }
    });
  })();

  /* ============================================================
     6 前後對照：進入畫面時自動從 Before 滑到中間一次
     setter 由 compare.js 掛在 .compare-frame 上。
     ============================================================ */
  (function compareIntro() {
    all('[data-compare]').forEach(function (frame) {
      var set = frame._setCompare;
      if (typeof set !== 'function') return;
      ScrollTrigger.create({
        trigger: frame, start: 'top 72%', once: true,
        onEnter: function () {
          var o = { p: 88 };
          set(88);
          var tw = gsap.to(o, {
            p: 50, duration: 1.4, ease: 'power2.inOut',
            onUpdate: function () { set(o.p); }
          });
          /* 示範途中使用者就拖或按方向鍵，compare.js 會叫這個把動畫停掉 */
          frame._stopIntro = function () { tw.kill(); frame._stopIntro = null; };
        }
      });
    });
  })();

  /* ============================================================
     4 畫面橫向展示（固定區塊，每頁最多一個）
     標了 data-htrack 的圖組在桌機變成固定區塊，往下捲時橫向移動；
     手機不走這裡，改用 CSS 的 scroll-snap 原生左右滑。
     ============================================================ */
  (function hTrack() {
    var wrap = q('[data-htrack]');
    if (!wrap) return;
    var track = wrap.querySelector('.htrack');
    var counter = wrap.querySelector('.htrack-count');
    if (!track) return;

    var items = track.children.length;
    if (items < 2) return;

    function dist() { return Math.max(0, track.scrollWidth - wrap.clientWidth); }
    if (dist() <= 0) return;

    gsap.to(track, {
      x: function () { return -dist(); },
      ease: 'none',
      scrollTrigger: {
        trigger: wrap,
        start: 'top top+=100',
        end: function () { return '+=' + dist(); },
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: function (st) {
          if (!counter) return;
          var i = Math.min(items, Math.round(st.progress * (items - 1)) + 1);
          counter.textContent = String(i).padStart(2, '0') + ' / ' + String(items).padStart(2, '0');
        }
      }
    });
  })();

  /* ============================================================
     8 下一個專案：標題逐字出現。點擊才換頁，不自動跳頁。
     （封面圖放大已拿掉——這一區維持左邊專案名稱、右邊箭頭的單排版面。）
     ============================================================ */
  (function nextProject() {
    var next = q('.next-project');
    if (!next) return;

    var title = next.querySelector('.next-project-title');
    if (title && !title.querySelector('.ch')) {
      var text = title.textContent;
      title.textContent = '';
      Array.prototype.forEach.call(text, function (c) {
        var s = document.createElement('span');
        s.className = 'ch';
        s.textContent = c === ' ' ? ' ' : c;
        s.setAttribute('aria-hidden', 'true');
        title.appendChild(s);
      });
      var sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      title.appendChild(sr);

      gsap.from(title.querySelectorAll('.ch'), {
        yPercent: 115, duration: 0.5, ease: EASE, stagger: 0.025,
        scrollTrigger: { trigger: next, start: 'top 80%' }
      });
    }
  })();

  /* ============================================================
     12 About 經歷大事紀：左側直線隨捲動往下延伸，經過的年份點亮起
     ============================================================ */
  (function timeline() {
    var track = q('.about-track');
    if (!track) return;
    var items = all('.track-item', track);
    if (items.length < 2) return;

    var line = track.querySelector('.track-rail');
    if (line) {
      gsap.fromTo(line, { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: track, start: 'top 70%', end: 'bottom 80%', scrub: true }
      });
    }

    items.forEach(function (it) {
      ScrollTrigger.create({
        trigger: it, start: 'top 72%',
        onEnter: function () { it.classList.add('is-on'); },
        onLeaveBack: function () { it.classList.remove('is-on'); }
      });
    });
  })();

  /* 圖片是 lazy 的，載入後高度才定下來，不 refresh 的話 pin 的距離會算錯 */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
