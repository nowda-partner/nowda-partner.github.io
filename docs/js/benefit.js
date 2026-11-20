// 홈 노란 배너 안 '○○에서 제공하는 혜택' 한 줄.
// 서버가 비짓제주 나우다 혜택 페이지에서 우리 업체 혜택(업체명으로 찾음)을 보내 준다. 못 찾으면 숨긴다.
// 1단계·2단계 문구가 같으면(띄어쓰기 무시) '모든 회원' 한 칸으로 합친다.
import { html, nowStr } from './lib.js?v=202611210716';
import { useApi } from './ui.js?v=202611210716';

const same = (a, b) => String(a || '').replace(/\s+/g, '') === String(b || '').replace(/\s+/g, '');
const dot = (s) => s.replace(/-/g, '.');

export function BenefitStrip({ name }) {
  const st = useApi('p', 'myBenefit', {}, { cache: 600000 });
  const r = st.data;
  if (!r || r.status !== 'ok') return null;
  const b = r.data;
  const rows = b.b1 && b.b2 && same(b.b1, b.b2)
    ? [['모든 회원', b.b1]]
    : [['Level 1', b.b1], ['Level 2 이상', b.b2]].filter(([, t]) => t);
  if (!rows.length) return null;
  const today = nowStr().slice(0, 10);
  const period = b.st && b.st > today ? `${dot(b.st)}부터` : b.fn && b.fn < '2099-01-01' ? `${dot(b.fn)}까지` : '';
  return html`<div class="bn-strip">
    ${b.img && html`<img class="bn-img" src=${b.img} alt="" loading="lazy" referrerpolicy="no-referrer" />`}
    <div class="bn-body">
      <div class="bn-head">${name ? `${name}에서 제공하는 혜택` : '나우다 회원 혜택'}${period && html`<small> · ${period}</small>`}</div>
      <div class="bn-rows">${rows.map(([k, t]) => html`<span><em>${k}</em>${t}</span>`)}</div>
    </div>
    <div class="bn-links">
      <a href=${b.url || r.page} target="_blank" rel="noopener">혜택 페이지 ↗</a>
      <a href="#/inquiries/new" title="실제 혜택과 다르면 알려 주세요">수정 요청</a>
    </div>
  </div>`;
}
