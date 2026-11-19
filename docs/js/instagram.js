// 나우다 인스타그램 게시물 (홈 오른쪽 카드 + 관리자 미리보기에서 함께 씀)
// 관리자는 게시물 주소만 저장한다. 사진은 인스타그램 공식 퍼가기(embed)로 불러온다.
import { html, useState, useEffect, useRef, CONFIG } from './lib.js?v=202611200029';

const ROLL_MS = 6000; // 다음 게시물로 넘어가는 간격

/** 게시물 주소 → 공식 퍼가기 주소(사진만). 게시물 주소가 아니면 ''. */
export function igEmbedUrl(u) {
  const m = String(u || '').match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]+)/i);
  return m ? `https://www.instagram.com/${m[1].toLowerCase() === 'reel' ? 'reel' : 'p'}/${m[2]}/embed/` : '';
}

/* 퍼가기 창은 자기 높이를 postMessage로 알려 준다. 그 높이에 맞춰 창 크기를 바꾼다. */
const frames = new Set();
let listening = false;
function listen() {
  if (listening) return;
  listening = true;
  addEventListener('message', (e) => {
    let host = '';
    try { host = new URL(e.origin).hostname; } catch { return; }
    if (!/(^|\.)instagram\.com$/.test(host)) return;
    let d;
    try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
    const h = d?.type === 'MEASURE' && Number(d.details?.height);
    if (!h) return;
    for (const f of frames) if (f.contentWindow === e.source) f.style.height = h + 'px';
  });
}

export function IgFrame({ url, title, eager }) {
  const ref = useRef(null);
  useEffect(() => {
    listen();
    const f = ref.current;
    frames.add(f);
    return () => frames.delete(f);
  }, []);
  const src = igEmbedUrl(url);
  if (!src) return null;
  return html`<iframe ref=${ref} class="ig-frame" src=${src} title=${title || '나우다 인스타그램 게시물'}
    loading=${eager ? 'eager' : 'lazy'} scrolling="no" allowtransparency="true"></iframe>`;
}

/* ───────── 홈 오른쪽: 한 게시물씩 돌아가는 카드 ───────── */
export function InstagramCard({ posts }) {
  const list = (posts || []).filter((p) => igEmbedUrl(p.url)).slice(0, 5);
  const [cur, setCur] = useState(0);
  const [pause, setPause] = useState(false);
  const n = list.length;

  useEffect(() => {
    if (n < 2 || pause) return;
    const id = setInterval(() => setCur((i) => (i + 1) % n), ROLL_MS);
    return () => clearInterval(id);
  }, [n, pause, cur]);
  useEffect(() => { if (cur >= n) setCur(0); }, [n]);

  if (!n) return null;
  const ig = CONFIG.INSTAGRAM || {};
  const go = (i) => setCur((i + n) % n);
  return html`<section class="card ig" aria-label="나우다 인스타그램">
    <div class="ig-head">
      <span class="ig-ava" aria-hidden="true"><span></span></span>
      <div><h2>나우다 인스타그램</h2>${ig.handle && html`<small>${ig.handle}</small>`}</div>
      ${ig.url && html`<a class="ig-go" href=${ig.url} target="_blank" rel="noopener">더 보기 ↗</a>`}
    </div>
    <div class="ig-stage" onMouseEnter=${() => setPause(true)} onMouseLeave=${() => setPause(false)}
      onfocusin=${() => setPause(true)} onfocusout=${() => setPause(false)}>
      ${list.map((p, i) => html`<div key=${p.id || p.url} class=${'ig-slide' + (i === cur ? ' on' : '')} aria-hidden=${i !== cur}>
        <${IgFrame} url=${p.url} eager=${i === 0} title=${`나우다 인스타그램 게시물 ${i + 1}`} />
      </div>`)}
    </div>
    ${n > 1 && html`<div class="ig-ctrl">
      <button class="arr" onClick=${() => go(cur - 1)} aria-label="이전 게시물">‹</button>
      <div class="ig-dots">${list.map((_, i) => html`<button class=${i === cur ? 'on' : ''} onClick=${() => go(i)} aria-label=${`${i + 1}번째 게시물`}></button>`)}</div>
      <button class="arr" onClick=${() => go(cur + 1)} aria-label="다음 게시물">›</button>
    </div>`}
  </section>`;
}
