/* ============================================
   1. Custom Cursor
   ============================================ */
const cursor = document.querySelector('.cursor');
const ring = document.querySelector('.cursor-ring');
if (cursor && ring) {
  let mx = 0, my = 0, rx = 0, ry = 0, onDark = null;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function anim() {
    rx += (mx - rx) * 0.15;
    ry += (my - ry) * 0.15;
    cursor.style.left = mx + 'px';
    cursor.style.top = my + 'px';
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';

    /*
     * 游標本身是純黑的，壓在深色區塊上會消失。
     * 用 hit test 判斷腳下是不是深色，而不是綁定特定區塊——
     * 之後任何地方加上 .theme-dark 都會自動生效。
     * 游標元素自己是 pointer-events: none，不會打到自己。
     */
    const hit = document.elementFromPoint(mx, my);
    const dark = !!(hit && hit.closest('.theme-dark'));
    if (dark !== onDark) {
      onDark = dark;
      document.body.classList.toggle('on-dark', dark);
    }

    requestAnimationFrame(anim);
  })();
}

/* ============================================
   2. Reveal on Scroll
   ============================================ */
const reveals = document.querySelectorAll('.reveal');
if (reveals.length) {
  /*
   * 延遲以「在同一個容器裡排第幾個」計算，不是整頁的第幾個。
   * 舊做法用全頁索引，case 頁有二十幾個 .reveal，捲到後段時
   * 最後一個要等將近兩秒才浮現——而且那個等待跟捲動位置無關。
   * 依容器分組，等於每個區塊各自從頭開始跑自己的節奏。
   */
  const STEP = 0.07;   // 每階間隔
  const CAP  = 5;      // 最多疊到第 5 階，一組太多時尾端不會等太久

  reveals.forEach(el => {
    const siblings = [...el.parentElement.children].filter(n => n.classList.contains('reveal'));
    const i = siblings.indexOf(el);
    el.style.transitionDelay = (Math.min(i, CAP) * STEP) + 's';
  });

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });

  reveals.forEach(el => obs.observe(el));
}

/* ============================================
   3. ASCII Art 生成 + 波動效果
   ============================================ */
function generateASCII(imgSrc, targetId, opts = {}) {
  const { cols = 120, fontSize = 7, ripple = false } = opts;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ratio = img.height / img.width;
    canvas.width = cols;
    canvas.height = Math.floor(cols * ratio * 0.45);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const chars = '@#S%?*+;:,. ';
    let rows = [];
    for (let y = 0; y < canvas.height; y++) {
      let row = '';
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const brightness = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114) / 255;
        const idx = Math.floor(brightness * (chars.length - 1));
        row += chars[idx];
      }
      rows.push(row);
    }

    const el = document.getElementById(targetId);
    if (!el) return;

    if (!ripple) {
      el.textContent = rows.join('\n');
      return;
    }

    /*
     * 波動版本。
     *
     * 這裡的關鍵是「不要在動畫迴圈裡量位置」。
     * 舊版每一幀對全部 8,214 個 span 各做兩次 getBoundingClientRect()，
     * 而且讀完馬上寫 style——讀寫交錯會強制瀏覽器重算整份 layout，
     * 一幀就是八千多次強制重排，主執行緒直接被鎖死。
     *
     * 字元是等寬字型排成的規則網格，所以位置用「行列 × 格子大小」就能算出來，
     * 量一次就夠。滑鼠只影響半徑內的格子，也就不必掃全部字元。
     */
    el.innerHTML = '';
    const grid = [];
    rows.forEach(row => {
      const line = [];
      for (const ch of row) {
        const span = document.createElement('span');
        span.textContent = ch;
        span.style.display = 'inline-block';
        el.appendChild(span);
        line.push(span);
      }
      grid.push(line);
      el.appendChild(document.createTextNode('\n'));
    });

    const container = el.closest('.ascii-container') || el.parentElement;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const RADIUS = 80;
    const maxRow = grid.length - 1;
    let cellW = 0, cellH = 0, originX = 0, originY = 0;

    // 量一次：等寬字型，每個格子大小都相同
    const measure = () => {
      const cRect = container.getBoundingClientRect();
      const f = grid[0][0].getBoundingClientRect();
      cellW = f.width;
      cellH = f.height;
      originX = f.left - cRect.left + cellW / 2;
      originY = f.top - cRect.top + cellH / 2;
    };
    measure();
    new ResizeObserver(measure).observe(container);

    let mouseX = -9999, mouseY = -9999;
    container.addEventListener('mousemove', e => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    container.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });

    let dirty = [];      // 上一幀被推開的，下一幀要復原
    let frameId = 0;

    function animateRipple() {
      frameId = requestAnimationFrame(animateRipple);

      for (let i = 0; i < dirty.length; i++) {
        dirty[i].style.transform = '';
        dirty[i].style.opacity = '';
      }
      dirty.length = 0;

      if (mouseX < -9000 || !cellW) return;   // 滑鼠不在上面就完全不做事

      // 只掃半徑覆蓋得到的那一塊網格
      const c0 = Math.max(0, Math.floor((mouseX - originX - RADIUS) / cellW));
      const c1 = Math.ceil((mouseX - originX + RADIUS) / cellW);
      const r0 = Math.max(0, Math.floor((mouseY - originY - RADIUS) / cellH));
      const r1 = Math.min(maxRow, Math.ceil((mouseY - originY + RADIUS) / cellH));

      for (let r = r0; r <= r1; r++) {
        const line = grid[r];
        if (!line) continue;
        const sy = originY + r * cellH;
        const dy = sy - mouseY;
        const end = Math.min(c1, line.length - 1);
        for (let c = c0; c <= end; c++) {
          const sx = originX + c * cellW;
          const dx = sx - mouseX;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= RADIUS) continue;
          const force = (1 - dist / RADIUS) * 6;
          const ang = Math.atan2(dy, dx);
          const span = line[c];
          span.style.transform = 'translate(' + (Math.cos(ang) * force).toFixed(2) + 'px,' + (Math.sin(ang) * force).toFixed(2) + 'px)';
          span.style.opacity = (0.4 + (dist / RADIUS) * 0.6).toFixed(2);
          dirty.push(span);
        }
      }
    }

    // 捲出畫面就停，沒必要在看不到的地方燒 CPU
    new IntersectionObserver(([e]) => {
      cancelAnimationFrame(frameId);
      if (e.isIntersecting) animateRipple();
    }, { threshold: 0 }).observe(container);
  };
  img.src = imgSrc;
}

// 執行：About 頁 ASCII（110 欄 + 滑鼠波動效果）
if (document.getElementById('ascii-about')) {
  generateASCII('assets/images/photo.jpg', 'ascii-about', { cols: 110, ripple: true });
}

/* ============================================
   4. Active Nav Link
   ============================================ */
const path = window.location.pathname;
const navLinks = [...document.querySelectorAll('.nav-links a')];

// 比對前先去掉 hash：Work 指向 index.html#work，帶著 hash 比會永遠不相等
const pointsHere = a => {
  const file = a.getAttribute('href').split('#')[0];
  if (!file) return true;                       // 純錨點 = 指向本頁
  if (file === 'index.html') return path === '/' || path.endsWith('index.html');
  return path.endsWith(file);
};

const here = navLinks.filter(pointsHere);
/*
 * 同一頁可能被兩個項目指到（About 是 about.html，Contact 是 about.html#contact）。
 * 這時候只有「沒有 hash」的那個才代表整頁，有 hash 的是頁內區塊，不該一起亮。
 * 只有在沒有任何無 hash 的連結時（首頁的 Work 就是這種），才輪到有 hash 的。
 */
const whole = here.filter(a => !a.getAttribute('href').includes('#'));
(whole.length ? whole : here).forEach(a => a.classList.add('active'));

/* ============================================
   5. Stats 數字 counter（滾到才跑）
   ============================================ */
const statNums = document.querySelectorAll('.stat-num');
if (statNums.length) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DURATION = 1400;
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  // 「100+」拆成數字 100 與後綴 "+"，只有數字部分要跑
  const run = el => {
    const m = el.textContent.trim().match(/^(\d+)(.*)$/);
    if (!m) return;
    const target = Number(m[1]), suffix = m[2];
    if (reduced) return;               // 直接留最終值，不做動畫

    el.textContent = '0' + suffix;
    let t0 = null;
    const frame = now => {
      if (t0 === null) t0 = now;
      const p = Math.min((now - t0) / DURATION, 1);
      el.textContent = Math.round(target * easeOut(p)) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); }
    });
  }, { threshold: 0.5 });

  statNums.forEach(el => obs.observe(el));
}


/* ============================================
   6. Lenis 慣性滾動
   CSS 的 scroll-behavior: smooth 已經拿掉——兩者同時存在會打架。
   觸控裝置維持原生捲動（Lenis 預設就不接管 touch），手感比較對。
   ============================================ */
if (window.Lenis && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const lenis = new Lenis({ duration: 1.1 });

  (function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  })();

  /*
   * 站內錨點要交回給 Lenis 處理。
   * Lenis 接管捲動之後，瀏覽器原生的 hash 跳位會變成瞬間位移，
   * 跟整站的慣性手感對不起來。offset 是為了讓目標不被固定的 nav 蓋住。
   */
  /*
   * 除了純錨點，也要接手「指向目前這一頁 + hash」的連結。
   * nav 的 Work 是 index.html#work——在首頁點它，瀏覽器會把整頁重新載入一次
   * （Lava Lamp 重啟、字型重繪），使用者只是想捲到作品區而已。
   */
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('a[href*="#"]').forEach(a => {
    const raw = a.getAttribute('href');
    const [file, hash] = raw.split('#');
    if (!hash) return;
    if (file && file !== here) return;   // 指向別頁，讓瀏覽器正常導航
    a.addEventListener('click', e => {
      const target = document.getElementById(hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80 });
    });
  });
}


/* ============================================
   7. nav 壓在深色 Hero 上時反白
   哪些 Hero 要觸發由 HTML 的 data-invert-nav 決定，不寫死 class 名稱。
   case 頁的 Hero 只有左半邊是深的，nav 橫跨整個寬度，所以那頁不掛這個屬性。
   ============================================ */
const navBar = document.querySelector('nav');
const invertSource = document.querySelector('[data-invert-nav]');

if (navBar && invertSource) {
  // 觀察區域從視窗頂端往下縮一個 nav 的高度：
  // 深色區的底部還在 nav 下方時，就算「壓在深色上」。
  new IntersectionObserver(
    ([e]) => navBar.classList.toggle('theme-dark', e.isIntersecting),
    { rootMargin: '-76px 0px 0px 0px', threshold: 0 }
  ).observe(invertSource);
}
