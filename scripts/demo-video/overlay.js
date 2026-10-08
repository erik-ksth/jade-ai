// Runs inside the page (injected with evaluateOnNewDocument). Draws everything the
// video needs on top of the app: a cursor, click ripples, captions, a fast-forward
// badge, zoom, and the end card. Must stay self-contained: it is serialized as-is.
export function installOverlay() {
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const CSS = `
    #demo-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none;
      filter: drop-shadow(0 2px 3px rgba(0,0,0,.45)); will-change: transform; transition: opacity .2s; }
    #demo-cursor svg { display: block; width: 26px; height: 26px; transform-origin: 4px 3px; transition: transform .12s ease-out; }
    #demo-cursor.pressed svg { transform: scale(.82); }
    #demo-cursor.hidden { opacity: 0; }
    .demo-ripple { position: fixed; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
      background: rgba(94,188,123,.28); border: 2px solid rgba(94,188,123,.85); pointer-events: none;
      z-index: 2147483646; animation: demo-ripple .55s cubic-bezier(.22,1,.36,1) forwards; }
    @keyframes demo-ripple { from { transform: scale(.25); opacity: 1 } to { transform: scale(1.2); opacity: 0 } }
    #demo-caption { position: fixed; bottom: 34px; transform: translate(-50%, 10px); padding: 13px 24px;
      border-radius: 14px; background: rgba(255,255,255,.96); color: #121a16; border: 1px solid rgba(0,0,0,.08);
      font: 600 26px/1.3 var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif; letter-spacing: -.01em;
      white-space: nowrap; box-shadow: 0 12px 36px rgba(0,0,0,.45); opacity: 0; pointer-events: none;
      z-index: 2147483645; transition: opacity .28s ease-out, transform .4s cubic-bezier(.22,1,.36,1); }
    #demo-caption.show { opacity: 1; transform: translate(-50%, 0); }
    #demo-badge { position: fixed; top: 60px; left: 50%; transform: translate(-50%, -6px); display: flex;
      align-items: center; gap: 7px; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,.96);
      color: #33403a; border: 1px solid rgba(0,0,0,.08); box-shadow: 0 6px 20px rgba(0,0,0,.35); font: 500 14px/1 var(--font-geist-sans), system-ui, sans-serif;
      opacity: 0; pointer-events: none; z-index: 2147483645; transition: opacity .25s, transform .3s; }
    #demo-badge.show { opacity: 1; transform: translate(-50%, 0); }
    #demo-badge svg { width: 14px; height: 14px; }
    #demo-endcard { position: fixed; inset: 0; z-index: 2147483644; display: flex; flex-direction: column;
      align-items: center; justify-content: center; text-align: center; color: #f1f4f2;
      background: rgba(9,11,10,.8); backdrop-filter: blur(8px); opacity: 0; transition: opacity .7s ease-out;
      font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif; }
    #demo-endcard.show { opacity: 1; }
    #demo-endcard .row { display: flex; align-items: center; gap: 16px; }
    #demo-endcard img { height: 58px; width: auto; }
    #demo-endcard h1 { margin: 0; font-size: 64px; font-weight: 650; letter-spacing: -.03em; }
    #demo-endcard p { margin: 0; }
    #demo-endcard .tagline { margin-top: 14px; font-size: 26px; color: #b9c2bd; }
    #demo-endcard .stack { margin-top: 30px; font-size: 18px; color: #8f9893; letter-spacing: .01em; }
    #demo-endcard .url { margin-top: 10px; font-size: 20px; font-weight: 600; color: #5ebc7b; }
  `;

  const CURSOR_SVG = `<svg viewBox="0 0 26 26"><path d="M4 2.5v18.2l4.6-4.4 3 6.9 3.2-1.4-3-6.8h6.4z"
    fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
  const FF_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6v12l8.5-6zM12.5 6v12L21 12z"/></svg>`;

  const api = {
    x: -100,
    y: -100,
    zoomState: { tx: 0, ty: 0, s: 1 },

    init() {
      if (document.getElementById("demo-cursor")) return;
      const style = document.createElement("style");
      style.textContent = CSS;
      document.head.appendChild(style);

      const cursor = document.createElement("div");
      cursor.id = "demo-cursor";
      cursor.innerHTML = CURSOR_SVG;
      const caption = document.createElement("div");
      caption.id = "demo-caption";
      const badge = document.createElement("div");
      badge.id = "demo-badge";
      badge.innerHTML = `${FF_SVG}<span>Fast-forward</span>`;
      document.body.append(cursor, caption, badge);
      api.setCaptionCenter("50%");
      api.setPos(api.x, api.y);
    },

    root() {
      return document.querySelector("body > div.h-dvh");
    },

    setPos(x, y) {
      api.x = x;
      api.y = y;
      const el = document.getElementById("demo-cursor");
      if (el) el.style.transform = `translate(${x - 4}px, ${y - 3}px)`;
    },

    moveTo(x, y, ms) {
      const sx = api.x, sy = api.y;
      const start = performance.now();
      return new Promise((resolve) => {
        const step = (now) => {
          const t = Math.min(1, (now - start) / ms);
          const k = ease(t);
          api.setPos(sx + (x - sx) * k, sy + (y - sy) * k);
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    },

    press(down) {
      document.getElementById("demo-cursor")?.classList.toggle("pressed", down);
    },

    ripple(x, y) {
      const r = document.createElement("div");
      r.className = "demo-ripple";
      r.style.left = `${x}px`;
      r.style.top = `${y}px`;
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 700);
    },

    hideCursor(hidden) {
      document.getElementById("demo-cursor")?.classList.toggle("hidden", hidden);
    },

    setCaptionCenter(left) {
      const el = document.getElementById("demo-caption");
      if (el) el.style.left = left;
    },

    async caption(text) {
      const el = document.getElementById("demo-caption");
      if (!el || el.textContent === text && el.classList.contains("show")) return;
      if (el.classList.contains("show")) {
        el.classList.remove("show");
        await wait(260);
      }
      el.textContent = text;
      void el.offsetWidth;
      el.classList.add("show");
      await wait(300);
    },

    async hideCaption() {
      document.getElementById("demo-caption")?.classList.remove("show");
      await wait(280);
    },

    badge(on) {
      document.getElementById("demo-badge")?.classList.toggle("show", on);
    },

    // Scale the app so `rect` (viewport px) sits as close to the center as the edges allow
    async zoom(rect, scale, ms) {
      const root = api.root();
      if (!root) return;
      const W = window.innerWidth, H = window.innerHeight;
      // rect is measured on screen; undo any current zoom to get layout coordinates
      const { tx, ty, s } = api.zoomState;
      const cx = (rect.x + rect.width / 2 - tx) / s;
      const cy = (rect.y + rect.height / 2 - ty) / s;
      const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
      const nx = clamp(W / 2 - scale * cx, W - scale * W, 0);
      const ny = clamp(H / 2 - scale * cy, H - scale * H, 0);
      root.style.transformOrigin = "0 0";
      root.style.transition = `transform ${ms}ms cubic-bezier(.65,0,.35,1)`;
      root.style.transform = `translate(${nx}px, ${ny}px) scale(${scale})`;
      api.zoomState = { tx: nx, ty: ny, s: scale };
      await wait(ms + 30);
    },

    async unzoom(ms) {
      const root = api.root();
      if (!root) return;
      root.style.transition = `transform ${ms}ms cubic-bezier(.65,0,.35,1)`;
      root.style.transform = "translate(0px, 0px) scale(1)";
      api.zoomState = { tx: 0, ty: 0, s: 1 };
      await wait(ms + 30);
    },

    async endCard({ icon, title, tagline, stack, url }) {
      const card = document.createElement("div");
      card.id = "demo-endcard";
      card.innerHTML = `
        <div class="row"><img src="${icon}" alt=""><h1>${title}</h1></div>
        <p class="tagline">${tagline}</p>
        <p class="stack">${stack}</p>
        <p class="url">${url}</p>`;
      document.body.appendChild(card);
      await card.querySelector("img").decode().catch(() => {});
      void card.offsetWidth;
      card.classList.add("show");
      await wait(750);
    },
  };

  window.__demo = api;
}
