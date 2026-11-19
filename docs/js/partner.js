// 제휴사 화면
import { html, useState, useEffect, useMemo, CONFIG, IS_MOCK, api, go, getSession, setSession, clearSession, seed, warmUp, fmtDate, fmtSize, compressImage, fileToBase64, downloadBase64, storeGet, storeSet, nowStr, imageUrl, cls } from './lib.js?v=202611200042';
import { useApi, Load, Loading, Empty, NoticeBadges, StatusBadge, Thumb, Modal, toast, MockBanner, Footer, Pager, Field, Select } from './ui.js?v=202611200042';
import { renderBlocks, plain } from './render.js?v=202611200042';
import { ImpactBanner } from './stats.js?v=202611200042';
import { GuideCard } from './guide.js?v=202611200042';
import { InstagramCard } from './instagram.js?v=202611200042';

/* ───────── 로그인 ───────── */
export function PartnerLogin() {
  const [id, setId] = useState('');
  const [code, setCode] = useState('');
  const [keep, setKeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => warmUp(), []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await api(null, 'login', { id, code });
      setSession('p', { token: r.token, partner: r.partner }, keep);
      if (r.home) seed('p', 'home', {}, r.home); // 홈을 다시 요청하지 않음
      go('/');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return html`
    <${MockBanner} />
    <div class="login-page">
      <form class="login-card" onSubmit=${submit}>
        <div class="brand big"><span class="logo">N</span><span>${CONFIG.SITE_NAME}</span></div>
        <p class="muted">공사에서 받은 업체ID와 접속코드를 입력해 주세요.</p>
        <${Field} label="업체ID">
          <input value=${id} onInput=${(e) => setId(e.target.value.toUpperCase())} placeholder="예: G001" autocomplete="username" autocapitalize="characters" required />
        </${Field}>
        <${Field} label="접속코드">
          <input value=${code} onInput=${(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="숫자 8자리" inputmode="numeric" type="password" autocomplete="current-password" required />
        </${Field}>
        <label class="check-line"><input type="checkbox" checked=${keep} onChange=${(e) => setKeep(e.target.checked)} /> 이 기기에서 로그인 유지 (12시간)</label>
        ${err && html`<p class="form-error" role="alert">${err}</p>`}
        <button class="btn primary block" disabled=${busy}>${busy ? '확인 중…' : '로그인'}</button>
        <p class="hint center">접속코드를 잃어버렸다면 나우다 운영팀에 재발급을 요청해 주세요.</p>
        ${IS_MOCK && html`<p class="hint center">체험용: G001 / 12345678</p>`}
      </form>
    </div>`;
}

/* ───────── 공통 틀 ───────── */
const NAV = [
  ['/', '홈'],
  ['/guide', '회원 응대'],
  ['/notices', '소식'],
  ['/stats', '내 실적'],
  ['/faq', 'FAQ'],
  ['/inquiries', '1:1 문의'],
];

export function PartnerShell({ path, children }) {
  const s = getSession('p');
  const active = (p) => (p === '/' ? path === '/' : path === p || path.startsWith(p + '/'));
  const logout = () => { clearSession('p'); go('/login'); };
  return html`
    <${MockBanner} />
    <header class="site-head">
      <div class="wrap head-row">
        <a class="brand" href="#/"><span class="logo">N</span><span class="brand-text">${CONFIG.SITE_SHORT}</span></a>
        <nav class="main-nav" aria-label="주 메뉴">
          ${NAV.map(([p, label]) => html`<a href=${'#' + p} class=${active(p) ? 'on' : ''}>${label}</a>`)}
        </nav>
        <div class="me">
          <span class="me-name" title=${s?.partner?.id}>${s?.partner?.name}</span>
          <button class="btn ghost sm" onClick=${logout}>로그아웃</button>
        </div>
      </div>
    </header>
    <main class="wrap page">${children}</main>
    <${Footer} />`;
}

/* ───────── 팝업 ───────── */
const POPUP_KEY = 'np_popup_hidden';

function Popups({ items }) {
  const today = nowStr().slice(0, 10);
  const hidden = storeGet(POPUP_KEY, {});
  const [list, setList] = useState(() => items.filter((n) => hidden[n.id] !== today));
  const [i, setI] = useState(0);
  if (!list.length) return null;
  const n = list[Math.min(i, list.length - 1)];
  const close = (hideToday) => {
    if (hideToday) storeSet(POPUP_KEY, { ...storeGet(POPUP_KEY, {}), [n.id]: today });
    const rest = list.filter((x) => x.id !== n.id);
    setList(rest);
    setI(0);
  };
  return html`
    <div class="modal-back">
      <div class="popup" role="dialog" aria-modal="true" aria-label=${n.title}>
        ${list.length > 1 && html`<div class="popup-count">${Math.min(i, list.length - 1) + 1} / ${list.length}</div>`}
        <a class="popup-main" href=${'#/notices/' + n.id} onClick=${() => close(false)}>
          ${n.popupImage
            ? html`<img src=${imageUrl(n.popupImage, 1200)} alt=${n.title} />`
            : html`<div class="popup-text">
                <div class="popup-badges"><${NoticeBadges} n=${n} /></div>
                <h3>${n.title}</h3>
                <p>${n.summary}</p>
                <span class="link">자세히 보기 →</span>
              </div>`}
        </a>
        <div class="popup-foot">
          <button class="text-btn" onClick=${() => close(true)}>오늘 하루 보지 않기</button>
          <div>
            ${list.length > 1 && html`<button class="text-btn" onClick=${() => setI((i + 1) % list.length)}>다음</button>`}
            <button class="text-btn strong" onClick=${() => close(false)}>닫기</button>
          </div>
        </div>
      </div>
    </div>`;
}

/* ───────── 홈 ───────── */
export function Home() {
  const st = useApi('p', 'home', {}, { cache: 30000 });
  return html`<${Load} state=${st}>${(d) => html`
    <${Popups} items=${d.popups} />
    ${d.urgent.length > 0 && html`
      <div class="urgent-bar">
        ${d.urgent.map((n) => html`<a href=${'#/notices/' + n.id}><strong>긴급</strong><span>${n.title}</span><span class="arrow">→</span></a>`)}
      </div>`}
    <${ImpactBanner} name=${d.me.name} />
    <${GuideCard} />
    <div class="home-grid">
      <div class="main-col">
      <section class="card">
        <div class="card-head"><h2>최근 소식</h2><a href="#/notices" class="more">전체 보기</a></div>
        ${d.recent.length
          ? html`<ul class="notice-list compact">${d.recent.map((n) => html`<${NoticeRow} n=${n} />`)}</ul>`
          : html`<${Empty}>아직 등록된 소식이 없습니다.</${Empty}>`}
      </section>
      <${EventsCard} />
      </div>
      <div class="side-col">
        <section class="card">
          <div class="card-head"><h2>내 문의</h2><a href="#/inquiries" class="more">전체 보기</a></div>
          <div class="stat-row">
            <div><span class="num">${d.inquiryCounts.open}</span><span class="lbl">답변 대기</span></div>
            <div><span class="num">${d.inquiryCounts.done}</span><span class="lbl">답변 완료</span></div>
          </div>
          ${d.inquiries.length > 0 && html`<ul class="mini-list">${d.inquiries.slice(0, 3).map((q) => html`
            <li><a href=${'#/inquiries/' + q.id}><${StatusBadge} status=${q.status} /><span class="t">${q.title}</span></a></li>`)}</ul>`}
          <a class="btn primary block" href="#/inquiries/new">문의 남기기</a>
          <a class="faq-link" href="#/faq"><span class="q-icon">?</span><span><strong>자주 묻는 질문</strong><small>이용 방법·정산·QR 인증</small></span><span class="go">→</span></a>
        </section>
        <${InstagramCard} posts=${d.instagram} />
      </div>
    </div>
    <${AboutCard} />`}
  </${Load}>`;
}

/* ───────── 홈: 나우다 이벤트 ─────────
 * 서버가 비짓제주 나우다 이벤트 페이지를 읽어 진행 중·예정 이벤트를 보내 준다.
 * 못 읽었거나 진행 중인 이벤트가 없으면 이벤트 페이지 링크만 보여 준다.
 */
const EV_SHOW = 4;
const evDate = (s) => s.replace(/-/g, '.');

function EventsCard() {
  const st = useApi('p', 'events', {}, { cache: 600000 });
  const list = st.data?.list || [];
  const page = st.data?.page || CONFIG.EVENT_PAGE;
  if (!page) return null;
  const more = list.length - EV_SHOW;
  return html`<section class="card">
    <div class="card-head">
      <h2>진행 중인 나우다 이벤트</h2>
      <a href=${page} class="more" target="_blank" rel="noopener">이벤트 페이지 ↗</a>
    </div>
    ${st.loading && !st.data
      ? html`<${Loading} />`
      : list.length
        ? html`<div class="ev-list">${list.slice(0, EV_SHOW).map((e) => html`
            <a class="ev" href=${e.url} target="_blank" rel="noopener">
              <div class="ev-thumb">${e.img ? html`<img src=${e.img} alt="" loading="lazy" referrerpolicy="no-referrer" />` : '🎁'}</div>
              <div class="ev-body">
                <div class="ev-tags">
                  ${e.state === 'on' ? html`<span class="ev-state on">진행 중</span>` : html`<span class="ev-state">예정</span>`}
                  ${e.soon && html`<span class="ev-state soon">마감 임박</span>`}
                </div>
                <strong>${e.title}</strong>
                <small>${evDate(e.start)} ~ ${evDate(e.end)}</small>
              </div>
              <span class="ev-go" aria-hidden="true">↗</span>
            </a>`)}</div>
          ${more > 0 && html`<a class="ev-more" href=${page} target="_blank" rel="noopener">이벤트 ${more}개 더 보기 ↗</a>`}`
        : html`<a class="ev-more" href=${page} target="_blank" rel="noopener">나우다 이벤트 페이지 보기 ↗</a>`}
    <p class="ev-hint">우리 업체 손님에게도 알려 주세요. 매장 안내문·SNS에 이벤트 링크를 함께 걸면 좋습니다.</p>
  </section>`;
}

/* ───────── 홈: 나우다가 함께합니다 (문구는 config.js) ───────── */
function boldText(s) {
  return String(s).split(/\*\*(.+?)\*\*/g).map((x, i) => (i % 2 ? html`<b>${x}</b>` : x));
}

function AboutCard() {
  const about = CONFIG.ABOUT || [];
  if (!about.length) return null;
  return html`<section class="card why band">
    <h2>나우다가 함께합니다</h2>
    <ul>${about.map(([icon, text]) => html`<li><i>${icon}</i><span>${boldText(text)}</span></li>`)}</ul>
  </section>`;
}

function NoticeRow({ n }) {
  return html`<li class=${cls(n.urgent && 'is-urgent')}>
    <a href=${'#/notices/' + n.id}>
      <span class="cat">${n.category}</span>
      <span class="title"><${NoticeBadges} n=${n} /> ${n.title}</span>
      <time>${fmtDate(n.date)}</time>
    </a>
  </li>`;
}

/* ───────── 소식 목록 ───────── */
export function Notices() {
  const st = useApi('p', 'notices', {}, { cache: 30000 });
  const [cat, setCat] = useState('전체');
  const [q, setQ] = useState('');
  const [view, setView] = useState(() => storeGet('np_notice_view', 'list'));
  const [page, setPage] = useState(1);
  const size = view === 'card' ? 12 : 15;

  const changeView = (v) => { setView(v); storeSet('np_notice_view', v); setPage(1); };

  return html`
    <div class="page-head">
      <h1>소식</h1>
      <div class="view-toggle" role="group" aria-label="보기 방식">
        <button class=${view === 'list' ? 'on' : ''} onClick=${() => changeView('list')}>목록</button>
        <button class=${view === 'card' ? 'on' : ''} onClick=${() => changeView('card')}>카드</button>
      </div>
    </div>
    <${Load} state=${st}>${(all) => {
      const cats = ['전체', ...new Set(all.map((n) => n.category).filter(Boolean))];
      const kw = q.trim().toLowerCase();
      const list = all.filter((n) => (cat === '전체' || n.category === cat) && (!kw || (n.title + ' ' + (n.summary || '')).toLowerCase().includes(kw)));
      const shown = list.slice((page - 1) * size, page * size);
      return html`
        <div class="toolbar">
          <div class="chips">${cats.map((c) => html`<button class=${c === cat ? 'chip on' : 'chip'} onClick=${() => { setCat(c); setPage(1); }}>${c}</button>`)}</div>
          <input class="search" type="search" placeholder="제목·내용 검색" value=${q} onInput=${(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        ${!list.length ? html`<${Empty}>${kw || cat !== '전체' ? '조건에 맞는 소식이 없습니다.' : '아직 등록된 소식이 없습니다.'}</${Empty}>`
          : view === 'card'
            ? html`<div class="card-grid">${shown.map((n) => html`
                <a class=${cls('notice-card', n.urgent && 'is-urgent')} href=${'#/notices/' + n.id}>
                  <${Thumb} url=${n.thumb} alt=${n.title} />
                  <div class="nc-body">
                    <div class="nc-meta"><span class="cat">${n.category}</span><${NoticeBadges} n=${n} /></div>
                    <h3>${n.title}</h3>
                    <p>${n.summary}</p>
                    <time>${fmtDate(n.date)}</time>
                  </div>
                </a>`)}</div>`
            : html`<ul class="notice-list">${shown.map((n) => html`<${NoticeRow} n=${n} />`)}</ul>`}
        <${Pager} page=${page} total=${list.length} size=${size} onPage=${setPage} />`;
    }}</${Load}>`;
}

/* ───────── 소식 보기 ───────── */
export function NoticeDetail({ id }) {
  const st = useApi('p', 'notice', { id });
  return html`<${Load} state=${st}>${(n) => html`
    <article class="article">
      <a href="#/notices" class="back">← 소식 목록</a>
      <header class="article-head">
        <div class="meta-line"><span class="cat">${n.category}</span><${NoticeBadges} n=${n} /></div>
        <h1>${n.title}</h1>
        <div class="muted small">${fmtDate(n.date)} · ${n.author} · 조회 ${n.views}</div>
      </header>
      <div class="prose" dangerouslySetInnerHTML=${{ __html: renderBlocks(n.body) }}></div>
      <${Attachments} files=${n.attachments} />
    </article>`}
  </${Load}>`;
}

export function Attachments({ files }) {
  if (!files?.length) return null;
  return html`<div class="attach-box"><h3>첨부파일</h3><ul>${files.map((f) => html`
    <li><a href=${f.download || f.url} target="_blank" rel="noopener" download=${f.name}>📎 ${f.name}</a> <span class="muted small">${fmtSize(f.size)}</span></li>`)}</ul></div>`;
}

/* ───────── FAQ ───────── */
export function Faq() {
  const st = useApi('p', 'faqs', {}, { cache: 60000 });
  const [cat, setCat] = useState('전체');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  return html`
    <div class="page-head"><h1>자주 묻는 질문</h1></div>
    <${Load} state=${st}>${(all) => {
      const cats = ['전체', ...new Set(all.map((f) => f.category).filter(Boolean))];
      const kw = q.trim().toLowerCase();
      const list = all.filter((f) => (cat === '전체' || f.category === cat) && (!kw || (f.question + ' ' + f.answer).toLowerCase().includes(kw)));
      return html`
        <div class="toolbar">
          <div class="chips">${cats.map((c) => html`<button class=${c === cat ? 'chip on' : 'chip'} onClick=${() => setCat(c)}>${c}</button>`)}</div>
          <input class="search" type="search" placeholder="궁금한 내용을 검색하세요" value=${q} onInput=${(e) => setQ(e.target.value)} />
        </div>
        ${list.length ? html`<div class="faq-list">${list.map((f) => html`
          <div class=${cls('faq-item', open === f.id && 'open')}>
            <button class="faq-q" aria-expanded=${open === f.id} onClick=${() => setOpen(open === f.id ? null : f.id)}>
              <span class="qmark">Q</span><span class="qt">${f.question}</span><span class="chev">⌄</span>
            </button>
            ${open === f.id && html`<div class="faq-a"><span class="amark">A</span><div dangerouslySetInnerHTML=${{ __html: plain(f.answer) }}></div></div>`}
          </div>`)}</div>`
          : html`<${Empty}>찾는 내용이 없나요? <a href="#/inquiries/new">1:1 문의</a>로 남겨 주세요.</${Empty}>`}`;
    }}</${Load}>`;
}

/* ───────── 1:1 문의 ───────── */
export function Inquiries() {
  const st = useApi('p', 'myInquiries');
  return html`
    <div class="page-head"><h1>1:1 문의</h1><a class="btn primary" href="#/inquiries/new">문의 남기기</a></div>
    <p class="muted page-desc">정보 수정 요청, 의견, 궁금한 점을 남겨 주시면 나우다 운영팀이 답변해 드립니다. 내가 남긴 문의만 보입니다.</p>
    <${Load} state=${st}>${(list) => list.length
      ? html`<ul class="inq-list">${list.map((q) => html`
          <li><a href=${'#/inquiries/' + q.id}>
            <${StatusBadge} status=${q.status} />
            <span class="type">${q.type}</span>
            <span class="title">${q.title}${q.files ? ' 📎' : ''}</span>
            <time>${fmtDate(q.createdAt)}</time>
          </a></li>`)}</ul>`
      : html`<${Empty}>아직 남긴 문의가 없습니다.</${Empty}>`}
    </${Load}>`;
}

export function InquiryNew() {
  const [type, setType] = useState(CONFIG.INQUIRY_TYPES[0]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const addFiles = (e) => {
    const picked = [...e.target.files];
    e.target.value = '';
    const tooBig = picked.find((f) => f.size > 10 * 1024 * 1024 && !f.type.startsWith('image/'));
    if (tooBig) return setErr(`${tooBig.name}: 파일은 10MB 이하만 올릴 수 있습니다.`);
    setErr('');
    setFiles((cur) => [...cur, ...picked].slice(0, 5));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return setErr('제목과 내용을 입력해 주세요.');
    setBusy(true); setErr('');
    try {
      const payloadFiles = [];
      for (const f of files) {
        payloadFiles.push(f.type.startsWith('image/') ? await compressImage(f) : { name: f.name, mime: f.type || 'application/octet-stream', data: await fileToBase64(f) });
      }
      const r = await api('p', 'createInquiry', { type, title, content, files: payloadFiles });
      toast('문의를 접수했습니다.');
      go('/inquiries/' + r.id);
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  };

  return html`
    <a href="#/inquiries" class="back">← 1:1 문의</a>
    <div class="page-head"><h1>문의 남기기</h1></div>
    <form class="card form" onSubmit=${submit}>
      <${Field} label="유형">
        <${Select} value=${type} onChange=${setType} options=${CONFIG.INQUIRY_TYPES} />
      </${Field}>
      <${Field} label="제목"><input value=${title} onInput=${(e) => setTitle(e.target.value)} maxlength="200" required /></${Field}>
      <${Field} label="내용" hint="개인정보(이름·연락처 등)는 적지 말아 주세요.">
        <textarea rows="10" value=${content} onInput=${(e) => setContent(e.target.value)} required></textarea>
      </${Field}>
      <div class="field">
        <span class="label">첨부파일 <span class="muted small">(최대 5개, 파일당 10MB)</span></span>
        <label class="file-pick"><input type="file" multiple onChange=${addFiles} /> 파일 선택</label>
        ${files.length > 0 && html`<ul class="file-list">${files.map((f, i) => html`
          <li>${f.name} <span class="muted small">${fmtSize(f.size)}</span>
            <button type="button" class="text-btn" onClick=${() => setFiles(files.filter((_, j) => j !== i))}>삭제</button></li>`)}</ul>`}
      </div>
      ${err && html`<p class="form-error" role="alert">${err}</p>`}
      <div class="form-actions">
        <a class="btn" href="#/inquiries">취소</a>
        <button class="btn primary" disabled=${busy}>${busy ? '보내는 중…' : '문의 보내기'}</button>
      </div>
    </form>`;
}

export function InquiryDetail({ id }) {
  const st = useApi('p', 'inquiry', { id });
  return html`
    <a href="#/inquiries" class="back">← 1:1 문의</a>
    <${Load} state=${st}>${(q) => html`<${InquiryView} q=${q} role="p" />`}</${Load}>`;
}

export function InquiryView({ q, role, showPartner }) {
  const [busyFile, setBusyFile] = useState('');
  const download = async (f) => {
    setBusyFile(f.id);
    try {
      const r = await api(role, 'file', { inquiryId: q.id, fileId: f.id });
      downloadBase64(r.name, r.mime, r.data);
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      setBusyFile('');
    }
  };
  return html`
    <article class="card inq-view">
      <div class="meta-line"><${StatusBadge} status=${q.status} /><span class="type">${q.type}</span>${showPartner && html`<span class="muted">${q.partnerName} (${q.partnerId})</span>`}</div>
      <h1>${q.title}</h1>
      <div class="muted small">${fmtDate(q.createdAt, true)}</div>
      <div class="inq-content" dangerouslySetInnerHTML=${{ __html: plain(q.content) }}></div>
      ${q.attachments?.length > 0 && html`<div class="attach-box"><h3>첨부파일</h3><ul>${q.attachments.map((f) => html`
        <li><button class="text-btn" onClick=${() => download(f)} disabled=${busyFile === f.id}>📎 ${f.name}</button> <span class="muted small">${fmtSize(f.size)}${busyFile === f.id ? ' · 내려받는 중…' : ''}</span></li>`)}</ul></div>`}
    </article>
    ${q.answer
      ? html`<section class="card answer">
          <div class="answer-head"><strong>나우다 답변</strong><span class="muted small">${q.answeredBy} · ${fmtDate(q.answeredAt, true)}</span></div>
          <div dangerouslySetInnerHTML=${{ __html: plain(q.answer) }}></div>
        </section>`
      : role === 'p' && html`<div class="empty soft">${q.status === '처리중' ? '나우다 운영팀이 확인하고 있습니다.' : '접수되었습니다. 답변이 등록되면 이곳에 표시됩니다.'}</div>`}`;
}
