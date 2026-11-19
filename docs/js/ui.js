// 공통 화면 조각
import { html, useState, useEffect, useRef, CONFIG, IS_MOCK, cls, isNew, fmtDate, imageUrl, api, peek } from './lib.js?v=202611200015';

/**
 * 데이터를 불러오는 동안·실패했을 때 화면을 대신 그려 주는 도우미.
 * peekFn이 있으면 받아 둔 결과를 먼저 보여 주고, 최신 결과가 오면 바꾼다.
 */
export function useLoad(fn, deps = [], peekFn) {
  const [state, setState] = useState(() => ({ loading: true, error: '', data: peekFn?.() ?? null }));
  const [tick, setTick] = useState(0);
  const depKey = useRef(null);
  useEffect(() => {
    let alive = true;
    const key = JSON.stringify(deps);
    const sameTarget = depKey.current === key; // 같은 대상을 다시 불러올 때만 이전 화면 유지
    depKey.current = key;
    const early = peekFn?.() ?? null;
    setState((s) => ({ loading: true, error: '', data: early ?? (sameTarget ? s.data : null) }));
    fn().then(
      (data) => alive && setState({ loading: false, error: '', data }),
      (e) => {
        if (!alive) return;
        if (early) { // 받아 둔 화면은 그대로 두고 알림만 띄운다
          toast(e.message, 'err');
          setState({ loading: false, error: '', data: early });
        } else {
          setState({ loading: false, error: e.message, data: null });
        }
      },
    );
    return () => { alive = false; };
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((x) => x + 1) };
}

/** 서버 요청 + 받아 둔 결과 먼저 보여 주기 */
export function useApi(role, action, payload = {}, opts = {}) {
  return useLoad(() => api(role, action, payload, opts), [JSON.stringify(payload)], () => peek(role, action, payload));
}

export function Loading({ text = '불러오는 중…' }) {
  return html`<div class="loading"><span class="spinner"></span>${text}</div>`;
}

export function ErrorBox({ error, onRetry }) {
  return html`<div class="error-box"><p>${error}</p>${onRetry && html`<button class="btn" onClick=${onRetry}>다시 시도</button>`}</div>`;
}

export function Empty({ children }) {
  return html`<div class="empty">${children}</div>`;
}

export function Load({ state, children }) {
  if (state.loading && !state.data) return html`<${Loading} />`;
  if (state.error) return html`<${ErrorBox} error=${state.error} onRetry=${state.reload} />`;
  return children(state.data);
}

export function Badge({ kind, children }) {
  return html`<span class=${'badge ' + (kind || '')}>${children}</span>`;
}

export function NoticeBadges({ n }) {
  return html`
    ${n.urgent && html`<${Badge} kind="urgent">긴급</${Badge}>`}
    ${n.pinned && !n.urgent && html`<${Badge} kind="pin">고정</${Badge}>`}
    ${isNew(n.date || n.createdAt) && html`<${Badge} kind="new">N</${Badge}>`}
  `;
}

export function StatusBadge({ status }) {
  const kind = status === '답변완료' ? 'done' : status === '처리중' ? 'doing' : 'open';
  return html`<${Badge} kind=${kind}>${status}</${Badge}>`;
}

export function Thumb({ url, alt }) {
  if (!url) return html`<div class="thumb none" aria-hidden="true"><span>N</span></div>`;
  return html`<div class="thumb"><img src=${imageUrl(url, 480)} alt=${alt || ''} loading="lazy" /></div>`;
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('modal-open'); };
  }, []);
  return html`
    <div class="modal-back" onClick=${(e) => e.target === e.currentTarget && onClose?.()}>
      <div class=${cls('modal', wide && 'wide')} role="dialog" aria-modal="true" aria-label=${title}>
        <div class="modal-head"><h3>${title}</h3>${onClose && html`<button class="icon-btn" onClick=${onClose} aria-label="닫기">✕</button>`}</div>
        <div class="modal-body">${children}</div>
      </div>
    </div>`;
}

let toastSetter = null;
export function toast(msg, kind = 'ok') {
  toastSetter?.({ msg, kind, id: Date.now() });
}

export function Toaster() {
  const [t, setT] = useState(null);
  const timer = useRef();
  toastSetter = (v) => { setT(v); clearTimeout(timer.current); timer.current = setTimeout(() => setT(null), 2600); };
  return t ? html`<div class=${'toast ' + t.kind} role="status">${t.msg}</div>` : null;
}

export function MockBanner() {
  if (!IS_MOCK) return null;
  return html`<div class="mock-banner">체험 모드 — 서버에 연결되지 않았습니다. 입력한 내용은 이 브라우저에만 저장됩니다.</div>`;
}

export function Footer() {
  return html`<footer class="site-foot"><div class="wrap">
    <span>${CONFIG.SITE_NAME}</span>
    ${CONFIG.CONTACT && html`<span>문의: ${CONFIG.CONTACT}</span>`}
  </div></footer>`;
}

export function Pager({ page, total, size, onPage }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  const nums = [];
  const from = Math.max(1, page - 2), to = Math.min(pages, from + 4);
  for (let i = from; i <= to; i++) nums.push(i);
  return html`<nav class="pager" aria-label="페이지">
    <button disabled=${page <= 1} onClick=${() => onPage(page - 1)} aria-label="이전">‹</button>
    ${nums.map((n) => html`<button class=${n === page ? 'on' : ''} onClick=${() => onPage(n)}>${n}</button>`)}
    <button disabled=${page >= pages} onClick=${() => onPage(page + 1)} aria-label="다음">›</button>
  </nav>`;
}

export function DateText({ s, time }) {
  return html`<time>${fmtDate(s, time)}</time>`;
}

/** 선택 상자. options: ['값', ...] 또는 [['값','표시'], ...] — 처음 그릴 때도 값이 맞게 보이도록 selected를 직접 지정 */
export function Select({ value, onChange, options }) {
  return html`<select onChange=${(e) => onChange(e.target.value)}>${options.map((o) => {
    const [v, label] = Array.isArray(o) ? o : [o, o];
    return html`<option value=${v} selected=${v === value}>${label}</option>`;
  })}</select>`;
}

export function Field({ label, hint, children, wide }) {
  return html`<label class=${cls('field', wide && 'wide')}><span class="label">${label}</span>${children}${hint && html`<span class="hint">${hint}</span>`}</label>`;
}
