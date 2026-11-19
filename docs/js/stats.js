// 제휴사 실적 화면. 자료는 실적 시트(nowda-data에서 만든 CSV)를 서버가 읽어 그 업체 것만 보내 준다.
// 자료 모양: { name, kind, cat, upd, last, thru, pt, m: { 'YYYY-MM': { u, p, s, rv, mo, pu, c: { n, um, pm, b }, d: { fg, age, gender, region } } } }
// pu: 진행 중인 달만, 지난달 같은 기간 사용 건수
import { html, useState, useEffect, useRef } from './lib.js?v=202611192358';
import { useApi, Load, Empty } from './ui.js?v=202611192358';

const fmt = (n) => Number(n).toLocaleString('ko-KR');
const ymLabel = (ym) => { const [y, m] = ym.split('-'); return `${y}년 ${Number(m)}월`; };
const ymShort = (ym) => { const [y, m] = ym.split('-'); return (m === '01' ? y.slice(2) + '.' : '') + Number(m) + '월'; };
const dayLabel = (s) => { const [y, m, d] = s.split('-'); return `${y}년 ${Number(m)}월 ${Number(d)}일`; };

// 진행 중인 달(자료가 그달 중간까지): D.pt = true, D.thru = 마지막 날짜(YYYY-MM-DD)
const isPart = (D, ym) => !!(D.pt && D.thru && ym === D.last);
const partDays = (D) => { const d = Number(D.thru.slice(8)); return d > 1 ? `1~${d}일` : '1일'; };
const mLabel = (D, ym) => ymLabel(ym) + (isPart(D, ym) ? ` (${partDays(D)})` : '');
const monthsOf = (D) => Object.keys(D.m || {}).sort();

/* ───────── 실적 화면 ───────── */
export function Stats() {
  const st = useApi('p', 'myStats', {}, { cache: 60000 });
  return html`
    <div class="page-head"><h1>내 실적</h1></div>
    <${Load} state=${st}>${(r) => r.status === 'ok'
      ? html`<${StatsView} D=${r.data} />`
      : html`<${Empty}>${r.status === 'off'
          ? '실적 보기는 준비 중입니다.'
          : html`아직 이 업체의 실적 자료가 없습니다.<br />자료가 들어오면 이곳에 표시됩니다. 궁금한 점은 <a href="#/inquiries/new">1:1 문의</a>로 남겨 주세요.`}</${Empty}>`}
    </${Load}>`;
}

function StatsView({ D }) {
  const months = monthsOf(D);
  const [sel, setSel] = useState(months[months.length - 1]);
  if (!months.length) return html`<${Empty}>아직 보여 줄 실적이 없습니다.</${Empty}>`;
  const ym = D.m[sel] ? sel : months[months.length - 1];
  const r = D.m[ym] || {};
  return html`
    <div class="st-top">
      <div class="st-who">
        <strong>${D.name}</strong>
        <span class="badge">${D.kind} · ${D.cat}</span>
      </div>
      <label class="st-month">
        <span>기준 월</span>
        <select value=${ym} onChange=${(e) => setSel(e.target.value)}>
          ${[...months].reverse().map((m) => html`<option value=${m}>${mLabel(D, m)}</option>`)}
        </select>
      </label>
    </div>
    <${Kpis} D=${D} ym=${ym} r=${r} />
    <section class="card st-panel">
      <h2>월별 사용 건수</h2>
      <p class="st-desc">최근 12개월. 회색 점선은 같은 그룹 업체들의 중앙값입니다. 막대를 누르면 그달 지표로 바뀝니다. 테두리가 점선인 막대는 아직 끝나지 않은 달입니다.</p>
      <div class="st-legend"><span><i class="st-sw"></i>우리 업체</span><span><i class="st-sw ln"></i>같은 그룹 중앙값</span></div>
      <${Trend} D=${D} sel=${ym} onSelect=${setSel} />
    </section>
    <${Dist} r=${r} />
    <div class="st-notes">
      <strong>집계 기준</strong>
      <ul>
        <li>사용 건수는 나우다 인증 횟수, 이용자 수는 그달 인증한 회원 수(한 사람은 1명)입니다.</li>
        <li>이용자 개인을 알아볼 수 없도록, 이용자 구성은 그달 이용자 50명 이상일 때만 보여 주고 5명 미만인 항목은 '기타'로 합칩니다.</li>
        <li>재방문 비율은 그달 이용자 중 이전 달까지 우리 업체를 이용한 적이 있는 사람의 비율입니다.</li>
        <li>같은 그룹은 같은 공영/민영·카테고리 업체 중 그달 이용이 있던 곳입니다(우리 업체 제외). 10곳 미만이면 비교하지 않습니다. 위치는 같은 그룹의 사용 건수와 견준 것입니다.</li>
        <li>자료 기준: ${D.thru ? dayLabel(D.thru) : ymLabel(D.last)}까지 (갱신 ${D.upd})${D.pt ? `. ${ymLabel(D.last)}은 ${partDays(D)} 자료라 다른 달보다 적게 보일 수 있습니다.` : ''}</li>
      </ul>
    </div>`;
}

function Kpi({ label, val, unit, na, children }) {
  return html`<div class="st-kpi">
    <div class="l">${label}</div>
    ${val == null ? html`<div class="v na">${na}</div>` : html`<div class="v">${fmt(val)}<span class="unit">${unit}</span></div>`}
    <div class="s">${children}</div>
  </div>`;
}

function Kpis({ D, ym, r }) {
  const c = r.c, mo = r.mo, part = isPart(D, ym);
  return html`<section class="st-kpis">
    <${Kpi} label="사용 건수" val=${r.s ? null : r.u} unit="건" na="5명 미만">
      ${c ? html`같은 그룹 중앙값 ${fmt(c.um)}건<br /><span class=${'st-pill' + (c.b === '상위 25%' ? ' top' : '')}>${c.b}</span>` : '비교 그룹이 10곳 미만이라 비교하지 않음'}
    </${Kpi}>
    <${Kpi} label="이용자 수" val=${r.s ? null : r.p} unit="명" na="5명 미만">
      ${c ? `같은 그룹 중앙값 ${fmt(c.pm)}명` : ''}
    </${Kpi}>
    <${Kpi} label="재방문 비율" val=${r.rv == null ? null : r.rv} unit="%" na=${r.s ? '5명 미만' : r.p === 0 ? '이용 없음' : '비공개'}>
      ${r.rv == null && !r.s && r.p ? '재방문·첫 방문 이용자가 각각 5명 이상일 때 보여 줍니다' : '이전 달까지 이용한 적 있는 이용자 비율'}
    </${Kpi}>
    <div class="st-kpi">
      <div class="l">전월 대비 사용</div>
      ${mo == null
        ? html`<div class="v na">-</div>`
        : html`<div class=${'v ' + (mo > 0 ? 'up' : mo < 0 ? 'down' : '')}>${mo > 0 ? '▲ ' : mo < 0 ? '▼ ' : ''}${fmt(Math.abs(mo))}<span class="unit">%</span></div>`}
      <div class="s">${part
        ? (mo == null ? '지난달 같은 기간 이용이 없어 비교할 수 없음' : `지난달 같은 기간(${partDays(D)})과 비교`)
        : (mo == null ? '지난달 이용이 없어 비교할 수 없음' : '지난달 사용 건수와 비교')}</div>
    </div>
  </section>`;
}

function niceStep(x) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(x, 1)))), n = x / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** 최근 12개월 막대그래프. 화면 폭에 맞춰 다시 그려서 휴대폰에서도 글자가 작아지지 않게 한다. */
function Trend({ D, sel, onSelect }) {
  const box = useRef(null);
  const [W, setW] = useState(760);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    const measure = () => box.current && setW(Math.max(300, Math.round(box.current.clientWidth || 760)));
    measure();
    let t;
    const on = () => { clearTimeout(t); t = setTimeout(measure, 150); };
    addEventListener('resize', on);
    return () => { removeEventListener('resize', on); clearTimeout(t); };
  }, []);

  const all = monthsOf(D);
  const end = all.indexOf(sel);
  const ms = all.slice(Math.max(0, end - 11), end + 1);
  const H = W < 520 ? 200 : 220, L = 44, R = 8, T = 18, B = 26;
  const every = (W - L - R) / ms.length < 40 ? 2 : 1;
  const vals = ms.map((m) => { const r = D.m[m]; return { m, u: r.s ? null : r.u, s: r.s, med: r.c ? r.c.um : null }; });
  const mx = Math.max(1, ...vals.map((v) => Math.max(v.u || 0, v.med || 0)));
  const step = niceStep(mx / 4), top = Math.ceil(mx / step) * step;
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const bw = (W - L - R) / ms.length;

  const grid = [];
  for (let t = 0; t <= top + 1e-9; t += step) grid.push(t);

  // 중앙값 선: 값이 없는 달에서 끊는다
  const lines = [];
  let cur = [];
  vals.forEach((v, i) => {
    if (v.med != null) cur.push([L + i * bw + bw / 2, y(v.med)]);
    else if (cur.length) { lines.push(cur); cur = []; }
  });
  if (cur.length) lines.push(cur);

  const hv = hover && vals.find((v) => v.m === hover);
  const hi = hv ? vals.indexOf(hv) : -1;
  const tipH = hv ? Math.max(hv.u > 0 ? 2 : 0, y(0) - y(hv.u)) : 0;

  return html`<div class="st-chart" ref=${box} onMouseLeave=${() => setHover(null)}>
    <svg viewBox=${`0 0 ${W} ${H}`} role="img" aria-label="월별 사용 건수">
      ${grid.map((t) => html`
        <line x1=${L} x2=${W - R} y1=${y(t)} y2=${y(t)} stroke="var(--line)" />
        <text x=${L - 6} y=${y(t) + 4} text-anchor="end">${fmt(t)}</text>`)}
      ${vals.map((v, i) => {
        const x = L + i * bw + bw * 0.18, w = bw * 0.64, cx = L + i * bw + bw / 2;
        let bar = null;
        if (v.s) {
          bar = html`<rect x=${x} y=${y(0) - 4} width=${w} height="4" rx="1" fill="var(--st-muted)"><title>${ymLabel(v.m)}: 이용자 5명 미만</title></rect>`;
        } else if (v.u != null) {
          const h = Math.max(v.u > 0 ? 2 : 0, y(0) - y(v.u));
          const cl = 'bar' + (v.m === sel ? ' on' : '') + (v.m === hover ? ' hover' : '') + (isPart(D, v.m) ? ' part' : '');
          bar = html`<g class=${cl} onMouseEnter=${() => setHover(v.m)} onClick=${() => v.m !== sel && onSelect(v.m)}>
            <rect class="hit" x=${L + i * bw} y=${T} width=${bw} height=${H - T - B} fill="transparent" />
            <rect class="b" x=${x} y=${y(0) - h} width=${w} height=${h} rx="2" />
            ${v.m === sel && html`<text class="val" x=${cx} y=${y(0) - h - 5} text-anchor="middle">${fmt(v.u)}</text>`}
          </g>`;
        }
        const label = (v.m === sel || (ms.length - 1 - i) % every === 0)
          && html`<text x=${cx} y=${H - 8} text-anchor="middle" class=${v.m === sel ? 'sel' : ''}>${ymShort(v.m)}</text>`;
        return html`${bar}${label}`;
      })}
      ${lines.map((pts) => pts.length === 1
        ? html`<circle cx=${pts[0][0]} cy=${pts[0][1]} r="2.5" fill="var(--muted)" />`
        : html`<polyline points=${pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 3" />`)}
    </svg>
    ${hv && hv.u != null && html`<div class="st-tip" style=${{
      left: `${Math.min(Math.max(((L + hi * bw + bw / 2) / W) * 100, 12), 88)}%`,
      top: `${Math.max(((y(0) - tipH) / H) * 100, 12)}%`,
    }}>
      <b>${mLabel(D, hv.m)}</b> · ${fmt(hv.u)}건
      ${hv.med != null && html`<br /><span>같은 그룹 중앙값 ${fmt(hv.med)}건</span>`}
    </div>`}
  </div>`;
}

const DIMS = [['fg', '내국인 / 외국인'], ['age', '연령대'], ['gender', '성별'], ['region', '거주 지역']];
const COLORS = ['var(--st1)', 'var(--st2)', 'var(--st3)', 'var(--st4)', 'var(--st5)', 'var(--st6)'];
const colorOf = (i, k) => (k === '기타' ? 'var(--st7)' : COLORS[i % COLORS.length]);

function Dist({ r }) {
  const d = r.d || {};
  const show = !r.s && r.p && r.p >= 50;
  return html`<section class="card st-panel">
    <h2>이용자 구성</h2>
    <p class="st-desc">${show ? '그달 이용자 기준 비율(%). 5명 미만인 항목은 기타로 합쳤습니다.' : '그달 이용자가 50명 이상일 때만 보여 줍니다.'}</p>
    ${!show
      ? html`<div class="st-empty">${r.p ? '이번 달은 이용자가 50명 미만이라 구성을 보여 주지 않습니다.' : '이번 달은 보여 줄 이용자 구성이 없습니다.'}</div>`
      : html`<div class="st-dist">${DIMS.map(([key, name]) => {
          const v = d[key];
          return html`<div class="row">
            <div class="name">${name}</div>
            ${!v
              ? html`<div class="st-empty">${key === 'fg' ? '외국인 등 일부 항목이 5명 미만이라 보여 주지 않습니다.' : '항목별 인원이 적어 보여 주지 않습니다.'}</div>`
              : html`
                <div class="stack">${v.map(([k, pct], i) => html`<span style=${{ width: pct + '%', background: colorOf(i, k) }} title=${`${k} ${pct}%`}></span>`)}</div>
                <div class="dl">${v.map(([k, pct], i) => html`<span><i style=${{ background: colorOf(i, k) }}></i>${k} <b>${pct === 0 ? '1% 미만' : pct + '%'}</b></span>`)}</div>`}
          </div>`;
        })}</div>`}
  </section>`;
}

/* ───────── 홈 화면: 함께한 효과 배너 ─────────
 * 좋은 소식 문장(전월 대비·재방문·외국인·같은 그룹)은 끝난 달 기준으로만 만든다(진행 중인 달은 숫자가 덜 차 있음).
 * 아래 흰 줄은 가장 최근 달(진행 중이면 '1~15일'처럼 표기). 비교 기준이 30건 미만이면 %가 아니라 건수로 보여 준다.
 */
const MO_MIN = 30;

// 이름 끝 글자에 받침이 있으면 '을', 없으면 '를'
function objPost(name) {
  const c = String(name || '').trim().slice(-1).charCodeAt(0) - 0xac00;
  if (c < 0 || c > 11171) return '을(를)';
  return c % 28 ? '을' : '를';
}

function prevYm(ym) {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

const mOnly = (ym) => `${Number(ym.slice(5))}월`;

export function ImpactBanner({ name }) {
  const st = useApi('p', 'myStats', {}, { cache: 60000 });
  const r = st.data;
  if (!r || r.status !== 'ok' || !monthsOf(r.data).length) {
    return html`<section class="hello">
      <h1>${name}님, 안녕하세요.</h1>
      <p class="muted">나우다 소식과 자주 묻는 질문을 확인하고, 필요한 내용은 1:1 문의로 남겨 주세요.</p>
    </section>`;
  }
  const D = r.data, months = monthsOf(D);
  const total = months.reduce((s, m) => s + (D.m[m].u || 0), 0);

  // 끝난 달 기준 좋은 소식
  const done = D.pt ? months.filter((m) => m !== D.last).pop() : D.last;
  const R = done ? D.m[done] : null;
  const P = done ? D.m[prevYm(done)] : null;
  const grow = R && P && P.u >= MO_MIN && R.mo > 0 ? R.mo : null;
  const back = R && R.rv >= 10 ? Math.round(R.rv / 10) : null;
  let line;
  if (grow != null && back) line = html`${mOnly(done)}은 ${mOnly(prevYm(done))}보다 <b>${fmt(grow)}%</b> 더 찾았고, 10명 중 ${back}명은 다시 찾아온 손님입니다.`;
  else if (grow != null) line = html`${mOnly(done)}은 ${mOnly(prevYm(done))}보다 <b>${fmt(grow)}%</b> 더 찾았습니다.`;
  else if (back) line = html`${mOnly(done)} 손님 10명 중 ${back}명은 다시 찾아온 손님입니다.`;
  else line = '나우다 회원들이 꾸준히 찾고 있습니다.';
  const chips = [];
  const fg = R?.d?.fg?.find(([k]) => k === '외국인');
  if (fg && fg[1] > 0) chips.push(html`<span>외국인 손님 <b>${fg[1]}%</b> <small>(${mOnly(done)})</small></span>`);
  if (R?.c?.b === '상위 25%') chips.push(html`<span>같은 그룹 <b>상위 25%</b> <small>(${mOnly(done)})</small></span>`);

  return html`<section class="impact">
    <div class="eyebrow">${name}님, 나우다와 함께한 ${months.length}개월</div>
    <h1>나우다 회원이 ${D.name}${objPost(D.name)}<br /><strong>${fmt(total)}번</strong> 찾았습니다.</h1>
    <p class="sub">${line}</p>
    ${chips.length > 0 && html`<div class="impact-chips">${chips}</div>`}
    <${NowStrip} D=${D} />
  </section>`;
}

/** 가장 최근 달 한 줄 요약 + 내 실적 버튼 */
function NowStrip({ D }) {
  const ym = D.last, r = D.m[ym] || {}, part = isPart(D, ym);
  const label = part ? `${mOnly(ym)} ${partDays(D)}` : mLabel(D, ym);
  // 비교 기준 건수: 진행 중인 달은 지난달 같은 기간(pu), 끝난 달은 지난달 전체
  const base = part ? r.pu : D.m[prevYm(ym)]?.u;
  const what = part ? '지난달 같은 기간' : '지난달';
  let cmp = null;
  if (base != null && base < MO_MIN) {
    cmp = html`<span>${what} <b>${fmt(base)}</b>건 → <b>${fmt(r.u || 0)}</b>건</span>`;
  } else if (r.mo != null) {
    const c = r.mo > 0 ? 'up' : r.mo < 0 ? 'down' : '';
    cmp = html`<span>${what}보다 <b class=${c}>${r.mo > 0 ? '▲ ' : r.mo < 0 ? '▼ ' : ''}${fmt(Math.abs(r.mo))}%</b></span>`;
  }
  return html`<div class="now-strip">
    <div class="now-txt"><b>${label}</b><span>사용 <b>${fmt(r.u || 0)}</b>건</span><span>이용자 <b>${fmt(r.p || 0)}</b>명</span>${cmp}</div>
    <a class="now-btn" href="#/stats">내 실적 보기 →</a>
  </div>`;
}
