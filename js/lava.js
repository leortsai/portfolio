import * as THREE from "three";

/* ══════════════════════════════════════════════════════════════════
   Originkit「Lava Lamp」原始碼。
   相對原版只做了三件事：拿掉 TypeScript 型別、拿掉 React 外殼、
   pixelRatio 上限改成建構參數。GLSL 一個字都沒動。
   下方 END PORT 之後才是本站自己的掛載程式。
   ══════════════════════════════════════════════════════════════════ */

const MAX_BLOBS = 20

const CAM_Z = 2.4
const RAY_FOCAL = 1.4

const DEFAULTS = {
    top: "#FFFE00",
    bottom: "#13BB00",
    sheen: "#FFF400",
    blobs: 20,
    scale: 5,
    viscosity: 5,
    speed: 20,
    glow: 20,
    gloss: 20,
    wander: 10,
    magnet: 20,
    sizePercent: 75,
}

function clamp(v, lo, hi, fallback) {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg) {
    return {
        blobs: Math.round(clamp(cfg.blobs, 1, MAX_BLOBS, DEFAULTS.blobs)),
        scale: 0.12 + clamp(cfg.scale, 1, 20, DEFAULTS.scale) * 0.022,
        viscosity: 0.05 + clamp(cfg.viscosity, 1, 20, DEFAULTS.viscosity) * 0.035,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.075,
        glow: 0.3 + clamp(cfg.glow, 0, 20, DEFAULTS.glow) * 0.06,
        gloss: 8 + clamp(cfg.gloss, 1, 20, DEFAULTS.gloss) * 5,
        wander: clamp(cfg.wander, 0, 20, DEFAULTS.wander) * 0.035,
        magnet: clamp(cfg.magnet, 0, 20, DEFAULTS.magnet) * 0.028,
        zoom: 100 / clamp(cfg.sizePercent, 20, 200, 100),
    }
}

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        // Already in clip space; no camera is involved.
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

const LAVA_FRAGMENT = /* glsl */ `
    precision highp float;

    #define MAX_BLOBS ${MAX_BLOBS}

    uniform vec2 uResolution;
    uniform vec3 uTop;
    uniform vec3 uBottom;
    uniform vec3 uSheen;
    uniform float uTime;
    uniform float uCount;
    uniform float uScale;
    uniform float uViscosity;
    uniform float uGlow;
    uniform float uGloss;
    uniform float uWander;
    uniform float uZoom;
    uniform vec2 uPointer;
    uniform float uMagnet;

    varying vec2 vUv;

    float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
    }

    vec4 blob(int i) {
        float f = float(i);
        float rate = 0.5 + fract(f * 0.37) * 0.6;
        float phase = f * 2.399;
        float y = sin(uTime * rate + phase) * 0.62;
        float x = sin(uTime * rate * 0.61 + phase * 1.7) * uWander;
        float z = cos(uTime * rate * 0.43 + phase * 2.3) * uWander;
        float r = uScale * (0.75 + fract(f * 0.71) * 0.6);

        vec2 toPointer = uPointer - vec2(x, y);
        float grip = exp(-dot(toPointer, toPointer) * 2.2);
        float give = uMagnet * grip * (1.3 - r * 1.4);
        vec2 pulled = vec2(x, y) + toPointer * give;

        return vec4(pulled, z, r);
    }

    float map(vec3 p) {
        float d = 1e9;
        for (int i = 0; i < MAX_BLOBS; i++) {
            if (float(i) < uCount) {
                vec4 b = blob(i);
                float squash = 1.0 + 0.22 * sin(uTime * (0.5 + fract(float(i) * 0.37) * 0.6) + float(i) * 2.399);
                vec3 q = p - b.xyz;
                q.y /= squash;
                d = smin(d, length(q) - b.w, uViscosity);
            }
        }
        return d;
    }

    vec3 normalAt(vec3 p) {
        vec2 e = vec2(0.0015, 0.0);
        return normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
    }

    void main() {
        vec2 uv = (vUv - 0.5) * uZoom;
        uv.x *= uResolution.x / max(1.0, uResolution.y);

        vec3 ro = vec3(0.0, 0.0, ${CAM_Z.toFixed(3)});
        vec3 rd = normalize(vec3(uv, -${RAY_FOCAL.toFixed(3)}));

        float t = 0.0;
        float hit = 0.0;
        for (int i = 0; i < 72; i++) {
            vec3 p = ro + rd * t;
            float d = map(p);
            if (d < 0.001) { hit = 1.0; break; }
            t += d * 0.9;
            if (t > 5.0) break;
        }

        if (hit < 0.5) discard;

        vec3 p = ro + rd * t;
        vec3 n = normalAt(p);
        vec3 v = -rd;

        float h = clamp(p.y * 0.9 + 0.5, 0.0, 1.0);
        vec3 col = mix(uBottom, uTop, h);

        vec3 L = normalize(vec3(-0.4, 0.7, 0.8));
        float diff = max(dot(n, L), 0.0);
        float wrap = 0.5 + 0.5 * dot(n, L);
        col *= 0.35 + diff * 0.6 + wrap * 0.25;

        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        col += mix(uBottom, uTop, h) * fres * uGlow;

        vec3 hv = normalize(L + v);
        col += uSheen * pow(max(dot(n, hv), 0.0), uGloss) * 0.6;

        gl_FragColor = vec4(col, 1.0);
    }
`

class LavaScene {
    scene = new THREE.Scene()
    camera = new THREE.Camera()
    geometry = new THREE.PlaneGeometry(2, 2)

    pointer = new THREE.Vector2(0, 0)
    pointerTarget = new THREE.Vector2(0, 0)
    grip = 0
    gripTarget = 0
    time = 0
    frameId = 0
    lastT = 0
    disposed = false
    unbind = () => {}

    constructor(container, cfg, drCap = 1.5) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, drCap))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setClearColor(0x000000, 0)
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        container.appendChild(el)

        this.material = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: LAVA_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uTop: { value: new THREE.Color(cfg.top) },
                uBottom: { value: new THREE.Color(cfg.bottom) },
                uSheen: { value: new THREE.Color(cfg.sheen) },
                uTime: { value: 0 },
                uCount: { value: S.blobs },
                uScale: { value: S.scale },
                uViscosity: { value: S.viscosity },
                uGlow: { value: S.glow },
                uGloss: { value: S.gloss },
                uWander: { value: S.wander },
                uZoom: { value: S.zoom },
                uPointer: { value: new THREE.Vector2(0, 0) },
                uMagnet: { value: 0 },
            },
            transparent: true,
            depthTest: false,
            depthWrite: false,
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)
        this.bindEvents()
    }

    toField(e) {
        const el = this.renderer.domElement
        const rect = el.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return null
        const aspect = rect.width / rect.height
        const zoom = settingsFor(this.cfg).zoom
        const vx = (e.clientX - rect.left) / rect.width
        const vy = 1 - (e.clientY - rect.top) / rect.height
        const k = CAM_Z / RAY_FOCAL
        return new THREE.Vector2(
            (vx - 0.5) * zoom * aspect * k,
            (vy - 0.5) * zoom * k
        )
    }

    bindEvents() {
        const el = this.renderer.domElement
        el.style.touchAction = "none"

        const move = (e) => {
            const p = this.toField(e)
            if (!p) return
            this.pointerTarget.copy(p)
            this.gripTarget = 1
        }
        const leave = () => { this.gripTarget = 0 }

        el.addEventListener("pointermove", move)
        el.addEventListener("pointerenter", move)
        el.addEventListener("pointerleave", leave)
        el.addEventListener("pointercancel", leave)
        this.unbind = () => {
            el.removeEventListener("pointermove", move)
            el.removeEventListener("pointerenter", move)
            el.removeEventListener("pointerleave", leave)
            el.removeEventListener("pointercancel", leave)
        }
    }

    start() {
        this.lastT = performance.now()
        const loop = () => {
            this.frameId = requestAnimationFrame(loop)
            this.step()
        }
        loop()
    }

    setSize(width, height) {
        if (this.disposed || width <= 0 || height <= 0) return
        this.renderer.setSize(width, height, false)
        this.material.uniforms.uResolution.value.set(width, height)
    }

    updateConfig(cfg) {
        if (this.disposed) return
        this.cfg = cfg
        const S = settingsFor(cfg)
        const u = this.material.uniforms
        u.uTop.value.set(cfg.top || "#ffffff")
        u.uBottom.value.set(cfg.bottom || "#ffffff")
        u.uSheen.value.set(cfg.sheen || "#ffffff")
        u.uCount.value = S.blobs
        u.uScale.value = S.scale
        u.uViscosity.value = S.viscosity
        u.uGlow.value = S.glow
        u.uGloss.value = S.gloss
        u.uWander.value = S.wander
        u.uZoom.value = S.zoom
    }

    step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        const S = settingsFor(this.cfg)
        this.time += dt * S.speed

        this.grip += (this.gripTarget - this.grip) * (1 - Math.exp(-dt * 4.0))
        this.pointer.lerp(this.pointerTarget, 1 - Math.exp(-dt * 9.0))

        const u = this.material.uniforms
        u.uTime.value = this.time
        u.uPointer.value.copy(this.pointer)
        u.uMagnet.value = S.magnet * this.grip
        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.unbind()
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

/* ══════════════════════════ END PORT ══════════════════════════ */


/* ============================================
   掛載到首頁 Hero
   原始碼沒有「捲出畫面暫停」和「reduced-motion」這兩道保護，
   全螢幕跑一定要補上——每個 pixel 每幀要走 ~858 次距離運算。
   ============================================ */

const CONFIG = {
  top: "#3D8BFF", bottom: "#0A2E7A", sheen: "#CFE2FF",
  blobs: 11, scale: 6, viscosity: 7, speed: 6,
  glow: 14, gloss: 12, wander: 16, magnet: 14, sizePercent: 55,
};

const host = document.getElementById("hero-lava");

if (host) {
  const small   = matchMedia("(max-width: 768px)").matches;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 手機省一點：顆數少三顆、DPR 壓到 1。視覺差異幾乎看不出來。
  const cfg   = small ? { ...CONFIG, blobs: 8 } : CONFIG;
  const drCap = small ? 1 : 1.5;

  let scene = null;
  try {
    scene = new LavaScene(host, cfg, drCap);
  } catch (e) {
    host.style.display = "none";   // 沒有 WebGL：留深色底，不報錯
  }

  if (scene) {
    const fit = () => scene.setSize(host.clientWidth, host.clientHeight);
    fit();
    new ResizeObserver(fit).observe(host);

    if (reduced) {
      // 只畫一幀靜態畫面。時間推進一點，避免拿到 t=0 那個過於對稱的排列。
      scene.time = 3.2;
      scene.step();
    } else {
      /*
       * 暫停 / 續跑不改動 port 過來的類別：
       * frameId 是它自己的公開欄位，從外面取消即可。
       * start() 會另起一條迴圈，所以續跑前一定要先取消，否則會疊成兩條。
       */
      const pause  = () => cancelAnimationFrame(scene.frameId);
      const resume = () => { cancelAnimationFrame(scene.frameId); scene.start(); };

      new IntersectionObserver(
        ([e]) => (e.isIntersecting ? resume() : pause()),
        { threshold: 0 }
      ).observe(host);
    }
  }
}
