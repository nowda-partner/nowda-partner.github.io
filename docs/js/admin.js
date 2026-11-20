// 관리자 화면
import { html, useState, useEffect, useRef, CONFIG, IS_MOCK, api, go, getSession, setSession, clearSession, seed, warmUp, fmtDate, fmtSize, compressImage, fileToBase64, nowStr, toInputDate, imageUrl, cls } from './lib.js?v=202611210730';
import { useLoad, useApi, Load, Loading, Empty, NoticeBadges, StatusBadge, Thumb, Modal, toast, MockBanner, Pager, Field, Badge, Select } from './ui.js?v=202611210730';
import { InquiryView, Attachments } from './partner.js?v=202611210730';
import { renderBlocks } from './render.js?v=202611210730';
import { IgFrame, igEmbedUrl } from './instagram.js?v=202611210730';

/* ───────── 로그인 ───────── */
export function AdminLogin() {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => warmUp(), []);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await api(null, 'adminLogin', { id, password: pw });
      setSession('a', { token: r.token, admin: r.admin }, false);
      if (r.dashboard) seed('a', 'adminDashboard', {}, r.dashboard); // 대시보드를 다시 요청하지 않음
      go('/admin');
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  };
  return html`
    <${MockBanner} />
    <div class="login-page admin">
      <form class="login-card" onSubmit=${submit}>
        <div class="brand big"><span class="logo">N</span><span>관리자</span></div>
        <p class="muted">${CONFIG.SITE_NAME} 관리 화면입니다.</p>
        <${Field} label="아이디"><input value=${id} onInput=${(e) => setId(e.target.value)} autocomplete="username" required /></${Field}>
        <${Field} label="비밀번호"><input type="password" value=${pw} onInput=${(e) => setPw(e.target.value)} autocomplete="current-password" required /></${Field}>
        ${err && html`<p class="form-error" role="alert">${err}</p>`}
        <button class="btn primary block" disabled=${busy}>${busy ? '확인 중…' : '로그인'}</button>
        ${IS_MOCK && html`<p class="hint center">체험용: admin / admin12345</p>`}
      </form>
    </div>`;
}

/* ───────── 공통 틀 ───────── */
const NAV = [
  ['/admin', '대시보드'],
  ['/admin/notices', '소식 관리'],
  ['/admin/faq', 'FAQ 관리'],
  ['/admin/inquiries', '1:1 문의'],
  ['/admin/partners', '제휴사 관리'],
  ['/admin/instagram', '인스타그램'],
];

export function AdminShell({ path, children }) {
  const s = getSession('a');
  const active = (p) => (p === '/admin' ? path === '/admin' : path === p || path.startsWith(p + '/'));
  return html`
    <${MockBanner} />
    <div class="admin-layout">
      <aside class="admin-side">
        <a class="brand" href="#/admin"><span class="logo">N</span><span class="brand-text">관리자</span></a>
        <nav aria-label="관리 메뉴">${NAV.map(([p, label]) => html`<a href=${'#' + p} class=${active(p) ? 'on' : ''}>${label}</a>`)}</nav>
        <div class="side-foot">
          <span class="muted small">${s?.admin?.name}</span>
          <button class="btn ghost sm" onClick=${() => { clearSession('a'); go('/admin/login'); }}>로그아웃</button>
        </div>
      </aside>
      <main class="admin-main">${children}</main>
    </div>`;
}

/* ───────── 대시보드 ───────── */
export function Dashboard() {
  const st = useApi('a', 'adminDashboard', {}, { cache: 30000 });
  return html`
    <div class="page-head"><h1>대시보드</h1><a class="btn primary" href="#/admin/notices/new">새 소식 쓰기</a></div>
    <${Load} state=${st}>${(d) => html`
      <div class="kpis">
        <a class="kpi warn" href="#/admin/inquiries"><span class="num">${d.counts.openInquiries}</span><span class="lbl">답변 대기 문의</span></a>
        <a class="kpi" href="#/admin/notices"><span class="num">${d.counts.liveNotices}</span><span class="lbl">게시 중인 소식</span></a>
        <a class="kpi" href="#/admin/notices"><span class="num">${d.counts.livePopups}</span><span class="lbl">노출 중인 팝업</span></a>
        <a class="kpi" href="#/admin/notices"><span class="num">${d.counts.scheduled}</span><span class="lbl">예약된 소식</span></a>
        <a class="kpi" href="#/admin/partners"><span class="num">${d.counts.issued}<small> / ${d.counts.partners}</small></span><span class="lbl">접속코드 발급 업체</span></a>
      </div>
      <section class="card">
        <div class="card-head"><h2>최근 문의</h2><a class="more" href="#/admin/inquiries">전체 보기</a></div>
        ${d.recentInquiries.length ? html`<${InquiryTable} list=${d.recentInquiries} />` : html`<${Empty}>문의가 없습니다.</${Empty}>`}
      </section>`}
    </${Load}>`;
}

/* ───────── 소식 관리 ───────── */
function noticeState(n) {
  const t = nowStr();
  if (n.hidden) return ['숨김', 'muted'];
  if (n.start && n.start > t) return ['예약', 'doing'];
  if (n.end && n.end < t) return ['종료', 'muted'];
  return ['게시 중', 'done'];
}

export function AdminNotices() {
  const st = useApi('a', 'adminNotices');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const size = 20;
  return html`
    <div class="page-head"><h1>소식 관리</h1><a class="btn primary" href="#/admin/notices/new">새 소식 쓰기</a></div>
    <${Load} state=${st}>${(all) => {
      const kw = q.trim().toLowerCase();
      const list = all.filter((n) => !kw || n.title.toLowerCase().includes(kw));
      return html`
        <div class="toolbar"><input class="search" type="search" placeholder="제목 검색" value=${q} onInput=${(e) => { setQ(e.target.value); setPage(1); }} /></div>
        ${list.length ? html`
          <div class="table-wrap"><table class="data">
            <thead><tr><th>상태</th><th>제목</th><th>분류</th><th>게시일</th><th>게시 종료</th><th class="num">조회</th></tr></thead>
            <tbody>${list.slice((page - 1) * size, page * size).map((n) => {
              const [label, kind] = noticeState(n);
              return html`<tr class="click" onClick=${() => go('/admin/notices/' + n.id)}>
                <td><${Badge} kind=${kind}>${label}</${Badge}></td>
                <td class="title-cell"><${NoticeBadges} n=${n} />${n.popup && html`<${Badge} kind="popup">팝업</${Badge}>`} <a href=${'#/admin/notices/' + n.id}>${n.title}</a></td>
                <td>${n.category}</td>
                <td>${fmtDate(n.date, true)}</td>
                <td>${n.end ? fmtDate(n.end, true) : '-'}</td>
                <td class="num">${n.views}</td>
              </tr>`;
            })}</tbody>
          </table></div>
          <${Pager} page=${page} total=${list.length} size=${size} onPage=${setPage} />`
        : html`<${Empty}>소식이 없습니다. 오른쪽 위 [새 소식 쓰기]를 눌러 시작하세요.</${Empty}>`}`;
    }}</${Load}>`;
}

const EMPTY_NOTICE = { title: '', category: CONFIG.NOTICE_CATEGORIES[0], urgent: false, pinned: false, hidden: false, start: '', end: '', popup: false, popupStart: '', popupEnd: '', popupImage: '', thumb: '', attachments: [], body: { blocks: [] } };

export function NoticeEdit({ id }) {
  const isNew = !id;
  const st = useLoad(() => (isNew ? Promise.resolve({ ...EMPTY_NOTICE }) : api('a', 'adminNotice', { id })), [id]);
  return html`
    <a href="#/admin/notices" class="back">← 소식 관리</a>
    <${Load} state=${st}>${(n) => (st.loading ? html`<${Loading} />` : html`<${NoticeForm} initial=${n} key=${n.id || 'new'} />`)}</${Load}>`;
}

function NoticeForm({ initial }) {
  const [f, setF] = useState(() => ({ ...initial, start: toInputDate(initial.start), end: toInputDate(initial.end), popupStart: toInputDate(initial.popupStart), popupEnd: toInputDate(initial.popupEnd) }));
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState(null);
  const holder = useRef();
  const editor = useRef(null);
  const [editorState, setEditorState] = useState('loading');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  useEffect(() => {
    let alive = true;
    import('./editor.js?v=202611210730')
      .then((m) => m.createEditor(holder.current, initial.body))
      .then((ed) => { if (alive) { editor.current = ed; setEditorState('ready'); } else ed.destroy?.(); })
      .catch((e) => { console.error(e); alive && setEditorState('error'); });
    return () => { alive = false; editor.current?.destroy?.(); };
  }, []);

  const uploadTo = (key) => async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(key);
    try {
      const r = await api('a', 'uploadImage', await compressImage(file));
      setF((x) => ({ ...x, [key]: r.url }));
    } catch (e2) { toast(e2.message, 'err'); } finally { setBusy(''); }
  };

  const addAttachment = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    setBusy('attach');
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) throw new Error(file.name + ': 10MB 이하만 올릴 수 있습니다.');
        const r = await api('a', 'uploadNoticeFile', { name: file.name, mime: file.type || 'application/octet-stream', data: await fileToBase64(file) });
        setF((x) => ({ ...x, attachments: [...(x.attachments || []), { id: r.id, name: r.name, size: r.size, url: r.url, download: r.download }] }));
      }
    } catch (e2) { toast(e2.message, 'err'); } finally { setBusy(''); }
  };

  const getBody = async () => (editor.current ? editor.current.save() : initial.body);

  const save = async (e) => {
    e?.preventDefault();
    if (!f.title.trim()) return setErr('제목을 입력해 주세요.');
    if (f.start && f.end && f.end <= f.start) return setErr('게시 종료는 게시 시작보다 뒤여야 합니다.');
    if (f.popup && f.popupStart && f.popupEnd && f.popupEnd <= f.popupStart) return setErr('팝업 종료는 팝업 시작보다 뒤여야 합니다.');
    setBusy('save'); setErr('');
    try {
      const body = await getBody();
      const r = await api('a', 'saveNotice', { ...f, body });
      toast('저장했습니다.');
      if (!f.id) go('/admin/notices/' + r.id);
      else setF((x) => ({ ...x }));
    } catch (e2) { setErr(e2.message); } finally { setBusy(''); }
  };

  const remove = async () => {
    if (!confirm('이 소식을 삭제할까요? 되돌릴 수 없습니다.')) return;
    setBusy('delete');
    try {
      await api('a', 'deleteNotice', { id: f.id });
      toast('삭제했습니다.');
      go('/admin/notices');
    } catch (e2) { toast(e2.message, 'err'); setBusy(''); }
  };

  const showPreview = async () => setPreview(await getBody());

  return html`
    <form class="notice-form" onSubmit=${save}>
      <div class="page-head">
        <h1>${f.id ? '소식 수정' : '새 소식'}</h1>
        <div class="actions">
          <button type="button" class="btn" onClick=${showPreview}>미리보기</button>
          ${f.id && html`<button type="button" class="btn danger" onClick=${remove} disabled=${!!busy}>삭제</button>`}
          <button class="btn primary" disabled=${!!busy}>${busy === 'save' ? '저장 중…' : '저장'}</button>
        </div>
      </div>
      ${err && html`<p class="form-error" role="alert">${err}</p>`}
      <div class="edit-grid">
        <div class="edit-main">
          <input class="title-input" placeholder="제목" value=${f.title} onInput=${set('title')} maxlength="200" />
          <div class="editor-box">
            ${editorState === 'loading' && html`<${Loading} text="편집기를 불러오는 중…" />`}
            ${editorState === 'error' && html`<p class="form-error">편집기를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.</p>`}
            <div ref=${holder} class="editor-holder"></div>
          </div>
          <p class="hint">팁: 빈 줄에서 <b>/</b>를 누르면 블록 메뉴가 열립니다. 유튜브 주소를 붙여 넣으면 동영상으로, 일반 주소는 링크로 표시됩니다. 사진은 끌어다 놓아도 됩니다.</p>
        </div>
        <aside class="edit-side">
          <section class="card">
            <h3>게시 설정</h3>
            <${Field} label="분류"><${Select} value=${f.category} onChange=${(v) => setF((x) => ({ ...x, category: v }))} options=${[...new Set([...CONFIG.NOTICE_CATEGORIES, f.category].filter(Boolean))]} /></${Field}>
            <label class="switch"><input type="checkbox" checked=${f.urgent} onChange=${set('urgent')} /><span>긴급 <small>목록 맨 위·홈 띠배너·빨간 표시</small></span></label>
            <label class="switch"><input type="checkbox" checked=${f.pinned} onChange=${set('pinned')} /><span>상단 고정</span></label>
            <label class="switch"><input type="checkbox" checked=${f.hidden} onChange=${set('hidden')} /><span>숨김 <small>제휴사에게 보이지 않음</small></span></label>
            <${Field} label="게시 시작" hint="비우면 저장 즉시 게시. 미래로 정하면 예약 게시."><input type="datetime-local" value=${f.start} onInput=${set('start')} /></${Field}>
            <${Field} label="게시 종료" hint="비우면 계속 게시"><input type="datetime-local" value=${f.end} onInput=${set('end')} /></${Field}>
          </section>
          <section class="card">
            <h3>팝업</h3>
            <label class="switch"><input type="checkbox" checked=${f.popup} onChange=${set('popup')} /><span>홈 화면 팝업으로 띄우기</span></label>
            ${f.popup && html`
              <${Field} label="팝업 시작"><input type="datetime-local" value=${f.popupStart} onInput=${set('popupStart')} /></${Field}>
              <${Field} label="팝업 종료"><input type="datetime-local" value=${f.popupEnd} onInput=${set('popupEnd')} /></${Field}>
              <div class="field"><span class="label">팝업 이미지 <small class="muted">(없으면 제목·요약 표시)</small></span>
                ${f.popupImage && html`<div class="img-prev"><img src=${imageUrl(f.popupImage, 600)} alt="" /><button type="button" class="text-btn" onClick=${() => setF((x) => ({ ...x, popupImage: '' }))}>삭제</button></div>`}
                <label class="file-pick"><input type="file" accept="image/*" onChange=${uploadTo('popupImage')} /> ${busy === 'popupImage' ? '올리는 중…' : '이미지 선택'}</label>
              </div>`}
          </section>
          <section class="card">
            <h3>썸네일</h3>
            <p class="hint">카드 보기에 쓰입니다. 비우면 본문의 첫 이미지를 씁니다.</p>
            ${f.thumb && html`<div class="img-prev"><img src=${imageUrl(f.thumb, 600)} alt="" /><button type="button" class="text-btn" onClick=${() => setF((x) => ({ ...x, thumb: '' }))}>삭제</button></div>`}
            <label class="file-pick"><input type="file" accept="image/*" onChange=${uploadTo('thumb')} /> ${busy === 'thumb' ? '올리는 중…' : '이미지 선택'}</label>
          </section>
          <section class="card">
            <h3>첨부파일</h3>
            ${(f.attachments || []).length > 0 && html`<ul class="file-list">${f.attachments.map((a, i) => html`
              <li>${a.name} <span class="muted small">${fmtSize(a.size)}</span>
              <button type="button" class="text-btn" onClick=${() => setF((x) => ({ ...x, attachments: x.attachments.filter((_, j) => j !== i) }))}>삭제</button></li>`)}</ul>`}
            <label class="file-pick"><input type="file" multiple onChange=${addAttachment} /> ${busy === 'attach' ? '올리는 중…' : '파일 추가'}</label>
          </section>
          ${f.id && html`<p class="muted small">작성: ${f.author} · ${fmtDate(f.createdAt, true)}<br />수정: ${fmtDate(f.updatedAt, true)} · 조회 ${f.views}</p>`}
        </aside>
      </div>
    </form>
    ${preview && html`<${Modal} title="미리보기 (제휴사 화면)" wide onClose=${() => setPreview(null)}>
      <article class="article">
        <header class="article-head">
          <div class="meta-line"><span class="cat">${f.category}</span><${NoticeBadges} n=${{ ...f, date: f.start || nowStr() }} /></div>
          <h1>${f.title || '(제목 없음)'}</h1>
        </header>
        <div class="prose" dangerouslySetInnerHTML=${{ __html: renderBlocks(preview) }}></div>
        <${Attachments} files=${f.attachments} />
      </article>
    </${Modal}>`}`;
}

/* ───────── FAQ 관리 ───────── */
export function AdminFaq() {
  const st = useApi('a', 'adminFaqs');
  const [edit, setEdit] = useState(null);
  return html`
    <div class="page-head"><h1>FAQ 관리</h1><button class="btn primary" onClick=${() => setEdit({ category: CONFIG.FAQ_CATEGORIES[0], question: '', answer: '', order: ((st.data || []).reduce((m, f) => Math.max(m, f.order), 0) + 1), hidden: false })}>FAQ 추가</button></div>
    <${Load} state=${st}>${(list) => list.length ? html`
      <div class="table-wrap"><table class="data">
        <thead><tr><th class="num">순서</th><th>분류</th><th>질문</th><th>상태</th><th>수정일</th></tr></thead>
        <tbody>${list.map((f) => html`<tr class="click" onClick=${() => setEdit(f)}>
          <td class="num">${f.order}</td><td>${f.category}</td><td class="title-cell">${f.question}</td>
          <td>${f.hidden ? html`<${Badge} kind="muted">숨김</${Badge}>` : html`<${Badge} kind="done">게시</${Badge}>`}</td>
          <td>${fmtDate(f.updatedAt)}</td></tr>`)}</tbody>
      </table></div>` : html`<${Empty}>FAQ가 없습니다.</${Empty}>`}
    </${Load}>
    ${edit && html`<${FaqModal} item=${edit} onClose=${() => setEdit(null)} onSaved=${() => { setEdit(null); st.reload(); }} />`}`;
}

function FaqModal({ item, onClose, onSaved }) {
  const [f, setF] = useState(item);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await api('a', 'saveFaq', f); toast('저장했습니다.'); onSaved(); } catch (e2) { setErr(e2.message); setBusy(false); }
  };
  const remove = async () => {
    if (!confirm('이 FAQ를 삭제할까요?')) return;
    try { await api('a', 'deleteFaq', { id: f.id }); toast('삭제했습니다.'); onSaved(); } catch (e2) { setErr(e2.message); }
  };
  const cats = [...new Set([...CONFIG.FAQ_CATEGORIES, f.category].filter(Boolean))];
  return html`<${Modal} title=${f.id ? 'FAQ 수정' : 'FAQ 추가'} onClose=${onClose}>
    <form class="form" onSubmit=${save}>
      <div class="row2">
        <${Field} label="분류"><${Select} value=${f.category} onChange=${(v) => setF((x) => ({ ...x, category: v }))} options=${cats} /></${Field}>
        <${Field} label="순서" hint="작을수록 위"><input type="number" value=${f.order} onInput=${set('order')} /></${Field}>
      </div>
      <${Field} label="질문"><input value=${f.question} onInput=${set('question')} required /></${Field}>
      <${Field} label="답변" hint="줄바꿈이 그대로 보이고, 주소(URL)는 링크로 바뀝니다."><textarea rows="8" value=${f.answer} onInput=${set('answer')}></textarea></${Field}>
      <label class="switch"><input type="checkbox" checked=${f.hidden} onChange=${set('hidden')} /><span>숨김</span></label>
      ${err && html`<p class="form-error">${err}</p>`}
      <div class="form-actions">
        ${f.id && html`<button type="button" class="btn danger" onClick=${remove}>삭제</button>`}
        <span class="grow"></span>
        <button type="button" class="btn" onClick=${onClose}>취소</button>
        <button class="btn primary" disabled=${busy}>${busy ? '저장 중…' : '저장'}</button>
      </div>
    </form>
  </${Modal}>`;
}

/* ───────── 1:1 문의 관리 ───────── */
function InquiryTable({ list }) {
  return html`<div class="table-wrap"><table class="data">
    <thead><tr><th>상태</th><th>업체</th><th>유형</th><th>제목</th><th>작성일</th></tr></thead>
    <tbody>${list.map((q) => html`<tr class="click" onClick=${() => go('/admin/inquiries/' + q.id)}>
      <td><${StatusBadge} status=${q.status} /></td>
      <td><span class="nowrap">${q.partnerName}</span> <span class="muted small">${q.partnerId}</span></td>
      <td class="nowrap">${q.type}</td>
      <td class="title-cell"><a href=${'#/admin/inquiries/' + q.id}>${q.title}</a>${q.files ? ' 📎' : ''}</td>
      <td class="nowrap">${fmtDate(q.createdAt, true)}</td>
    </tr>`)}</tbody>
  </table></div>`;
}

export function AdminInquiries() {
  const st = useApi('a', 'adminInquiries');
  const [status, setStatus] = useState('대기');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const size = 20;
  return html`
    <div class="page-head"><h1>1:1 문의</h1></div>
    <${Load} state=${st}>${(all) => {
      const kw = q.trim().toLowerCase();
      const list = all.filter((x) => (status === '전체' || (status === '대기' ? x.status !== '답변완료' : x.status === status))
        && (!kw || (x.partnerName + ' ' + x.partnerId + ' ' + x.title).toLowerCase().includes(kw)));
      const count = (s) => all.filter((x) => (s === '대기' ? x.status !== '답변완료' : s === '전체' || x.status === s)).length;
      return html`
        <div class="toolbar">
          <div class="chips">${['대기', '답변완료', '전체'].map((s) => html`<button class=${s === status ? 'chip on' : 'chip'} onClick=${() => { setStatus(s); setPage(1); }}>${s === '대기' ? '답변 대기' : s} <small>${count(s)}</small></button>`)}</div>
          <input class="search" type="search" placeholder="업체명·업체ID·제목 검색" value=${q} onInput=${(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        ${list.length ? html`<${InquiryTable} list=${list.slice((page - 1) * size, page * size)} /><${Pager} page=${page} total=${list.length} size=${size} onPage=${setPage} />`
          : html`<${Empty}>${status === '대기' ? '답변을 기다리는 문의가 없습니다.' : '문의가 없습니다.'}</${Empty}>`}`;
    }}</${Load}>`;
}

export function AdminInquiryDetail({ id }) {
  const st = useLoad(() => api('a', 'adminInquiry', { id }), [id]);
  return html`
    <a href="#/admin/inquiries" class="back">← 1:1 문의</a>
    <${Load} state=${st}>${(q) => html`
      <div class="inq-admin">
        <div><${InquiryView} q=${q} role="a" showPartner=${true} /></div>
        <${AnswerForm} q=${q} onSaved=${st.reload} />
      </div>`}
    </${Load}>`;
}

function AnswerForm({ q, onSaved }) {
  const [answer, setAnswer] = useState(q.answer || '');
  const [status, setStatus] = useState(q.status === '접수' ? '답변완료' : q.status);
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (status === '답변완료' && !answer.trim()) return toast('답변 내용을 입력해 주세요.', 'err');
    setBusy(true);
    try { await api('a', 'answerInquiry', { id: q.id, answer, status }); toast('저장했습니다.'); onSaved(); } catch (e2) { toast(e2.message, 'err'); } finally { setBusy(false); }
  };
  return html`<form class="card form answer-form" onSubmit=${save}>
    <h3>${q.answer ? '답변 수정' : '답변 쓰기'}</h3>
    <${Field} label="상태">
      <${Select} value=${status} onChange=${setStatus} options=${['접수', '처리중', '답변완료']} />
    </${Field}>
    <${Field} label="답변" hint="제휴사 화면에 그대로 보입니다."><textarea rows="10" value=${answer} onInput=${(e) => setAnswer(e.target.value)}></textarea></${Field}>
    <button class="btn primary block" disabled=${busy}>${busy ? '저장 중…' : '저장'}</button>
  </form>`;
}

/* ───────── 제휴사 관리 ───────── */
export function AdminPartners() {
  const st = useApi('a', 'adminPartners');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('전체');
  const [sel, setSel] = useState(new Set());
  const [codes, setCodes] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const size = 50;

  const issue = async (ids, label) => {
    if (!ids.length) return;
    if (!confirm(`${label} ${ids.length}곳의 접속코드를 새로 발급할까요?\n이미 발급된 업체는 기존 코드로 더 이상 접속할 수 없습니다.`)) return;
    setBusy(true);
    try {
      const r = await api('a', 'issueCodes', { ids });
      setCodes(r.issued);
      setSel(new Set());
      st.reload();
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  const toggleActive = async (p) => {
    if (p.active && !confirm(`${p.name}(${p.id})의 접속을 중지할까요? 로그인 중이던 화면도 바로 막힙니다.`)) return;
    try { await api('a', 'setPartnerActive', { id: p.id, active: !p.active }); toast(p.active ? '접속을 중지했습니다.' : '접속을 허용했습니다.'); st.reload(); } catch (e) { toast(e.message, 'err'); }
  };

  return html`
    <div class="page-head"><h1>제휴사 관리</h1><button class="btn" onClick=${() => setEdit({ id: '', name: '', type: '', category: '', isNew: true })}>업체 추가</button></div>
    <p class="muted page-desc">업체를 한꺼번에 등록할 때는 구글 시트 [업체] 탭에 붙여 넣으세요. 접속코드는 이곳에서 발급하며, 발급 직후 한 번만 볼 수 있습니다.</p>
    <${Load} state=${st}>${(all) => {
      const kw = q.trim().toLowerCase();
      const list = all.filter((p) => (filter === '전체' || (filter === '미발급' ? !p.issued : filter === '중지' ? !p.active : p.issued))
        && (!kw || (p.id + ' ' + p.name + ' ' + (p.category || '')).toLowerCase().includes(kw)));
      const shown = list.slice((page - 1) * size, page * size);
      const allSel = shown.length > 0 && shown.every((p) => sel.has(p.id));
      const toggleAll = () => { const s = new Set(sel); shown.forEach((p) => (allSel ? s.delete(p.id) : s.add(p.id))); setSel(s); };
      const toggle = (id) => { const s = new Set(sel); s.has(id) ? s.delete(id) : s.add(id); setSel(s); };
      const notIssued = all.filter((p) => !p.issued && p.active).map((p) => p.id);
      return html`
        <div class="toolbar">
          <div class="chips">${['전체', '발급', '미발급', '중지'].map((s) => html`<button class=${s === filter ? 'chip on' : 'chip'} onClick=${() => { setFilter(s); setPage(1); }}>${s}</button>`)}</div>
          <input class="search" type="search" placeholder="업체ID·업체명 검색" value=${q} onInput=${(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <div class="bulk-bar">
          <span>${all.length}곳 · 발급 ${all.filter((p) => p.issued).length} · 미발급 ${all.filter((p) => !p.issued).length}</span>
          <span class="grow"></span>
          ${sel.size > 0 && html`<button class="btn" disabled=${busy} onClick=${() => issue([...sel], '선택한')}>선택한 ${sel.size}곳 발급</button>`}
          <button class="btn primary" disabled=${busy || !notIssued.length} onClick=${() => issue(notIssued, '미발급 업체')}>미발급 ${notIssued.length}곳 일괄 발급</button>
        </div>
        ${list.length ? html`
          <div class="table-wrap"><table class="data">
            <thead><tr><th class="chk"><input type="checkbox" checked=${allSel} onChange=${toggleAll} aria-label="모두 선택" /></th><th>업체ID</th><th>업체명</th><th>구분</th><th>카테고리</th><th>접속코드</th><th>마지막 접속</th><th></th></tr></thead>
            <tbody>${shown.map((p) => html`<tr class=${!p.active ? 'dim' : ''}>
              <td class="chk"><input type="checkbox" checked=${sel.has(p.id)} onChange=${() => toggle(p.id)} aria-label=${p.id + ' 선택'} /></td>
              <td class="mono">${p.id}</td>
              <td><button class="text-btn" onClick=${() => setEdit(p)}>${p.name}</button></td>
              <td>${p.type}</td><td>${p.category}</td>
              <td>${!p.active ? html`<${Badge} kind="muted">중지</${Badge}>` : p.issued ? html`<${Badge} kind="done">발급 ${fmtDate(p.issuedAt)}</${Badge}>` : html`<${Badge} kind="open">미발급</${Badge}>`}</td>
              <td class="nowrap">${p.lastLogin ? fmtDate(p.lastLogin, true) : '-'}</td>
              <td class="nowrap actions-cell">
                <button class="btn sm" onClick=${() => issue([p.id], p.name)} disabled=${busy}>${p.issued ? '재발급' : '발급'}</button>
                <button class="btn sm ghost" onClick=${() => toggleActive(p)}>${p.active ? '중지' : '허용'}</button>
              </td>
            </tr>`)}</tbody>
          </table></div>
          <${Pager} page=${page} total=${list.length} size=${size} onPage=${setPage} />`
        : html`<${Empty}>${all.length ? '조건에 맞는 업체가 없습니다.' : '등록된 업체가 없습니다. 구글 시트 [업체] 탭에 업체를 붙여 넣거나 [업체 추가]를 누르세요.'}</${Empty}>`}`;
    }}</${Load}>
    ${codes && html`<${CodesModal} codes=${codes} onClose=${() => setCodes(null)} />`}
    ${edit && html`<${PartnerModal} item=${edit} onClose=${() => setEdit(null)} onSaved=${() => { setEdit(null); st.reload(); }} />`}`;
}

function CodesModal({ codes, onClose }) {
  const csv = '﻿업체ID,업체명,접속코드\n' + codes.map((c) => [c.id, `"${String(c.name || '').replace(/"/g, '""')}"`, c.code].join(',')).join('\n');
  const download = () => {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `접속코드_${nowStr().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(codes.map((c) => `${c.id}\t${c.name}\t${c.code}`).join('\n')); toast('복사했습니다.'); } catch { toast('복사하지 못했습니다. CSV로 내려받아 주세요.', 'err'); }
  };
  const close = () => { if (confirm('창을 닫으면 접속코드를 다시 볼 수 없습니다. 내려받거나 복사했나요?')) onClose(); };
  return html`<${Modal} title=${`접속코드 ${codes.length}곳 발급`} onClose=${close}>
    <p class="warn-text">이 창을 닫으면 접속코드를 다시 볼 수 없습니다. 지금 내려받거나 복사해 각 업체에 전달하세요.</p>
    <div class="form-actions left"><button class="btn primary" onClick=${download}>CSV 내려받기</button><button class="btn" onClick=${copy}>복사</button></div>
    <div class="table-wrap codes"><table class="data">
      <thead><tr><th>업체ID</th><th>업체명</th><th>접속코드</th></tr></thead>
      <tbody>${codes.map((c) => html`<tr><td class="mono">${c.id}</td><td>${c.name}</td><td class="mono strong">${c.code.slice(0, 4)} ${c.code.slice(4)}</td></tr>`)}</tbody>
    </table></div>
  </${Modal}>`;
}

function PartnerModal({ item, onClose, onSaved }) {
  const [f, setF] = useState(item);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await api('a', 'savePartner', f); toast('저장했습니다.'); onSaved(); } catch (e2) { setErr(e2.message); setBusy(false); }
  };
  return html`<${Modal} title=${item.isNew ? '업체 추가' : '업체 정보'} onClose=${onClose}>
    <form class="form" onSubmit=${save}>
      <${Field} label="업체ID" hint=${item.isNew ? '공영 G, 민영 M + 숫자 3자리 (예: G001). 한 번 정하면 바꾸지 않습니다.' : '업체ID는 바꿀 수 없습니다.'}>
        <input value=${f.id} onInput=${(e) => setF((x) => ({ ...x, id: e.target.value.toUpperCase() }))} disabled=${!item.isNew} required />
      </${Field}>
      <${Field} label="업체명"><input value=${f.name} onInput=${set('name')} required /></${Field}>
      <div class="row2">
        <${Field} label="구분"><${Select} value=${f.type || ''} onChange=${(v) => setF((x) => ({ ...x, type: v }))} options=${[['', '-'], '공영', '민영']} /></${Field}>
        <${Field} label="카테고리"><input value=${f.category} onInput=${set('category')} placeholder="예: 관광지" /></${Field}>
      </div>
      ${err && html`<p class="form-error">${err}</p>`}
      <div class="form-actions"><button type="button" class="btn" onClick=${onClose}>취소</button><button class="btn primary" disabled=${busy}>${busy ? '저장 중…' : '저장'}</button></div>
    </form>
  </${Modal}>`;
}

/* ───────── 인스타그램 게시물 ─────────
 * 주소만 저장한다. 제휴사 홈 오른쪽에서 숨기지 않은 게시물이 순서대로 한 개씩 돌아간다(최대 5개).
 */
const IG_MAX = 5;

export function AdminInstagram() {
  const st = useApi('a', 'adminInstagram');
  const [url, setUrl] = useState('');
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState('');
  const list = st.data || [];
  const shown = list.filter((g) => !g.hidden).length;
  const valid = !!igEmbedUrl(url);

  const run = async (key, fn, done) => {
    setBusy(key);
    try { await fn(); if (done) toast(done); st.reload(); } catch (e) { toast(e.message, 'err'); } finally { setBusy(''); }
  };
  const add = (e) => {
    e.preventDefault();
    if (!valid) return toast('인스타그램 게시물 주소를 붙여 넣어 주세요.', 'err');
    run('add', async () => { await api('a', 'saveInstagram', { url, memo, hidden: shown >= IG_MAX }); setUrl(''); setMemo(''); },
      shown >= IG_MAX ? '추가했습니다. 홈에는 5개까지만 보여서 숨김으로 넣었습니다.' : '추가했습니다.');
  };
  const move = (i, d) => {
    const ids = list.map((g) => g.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run('order', () => api('a', 'orderInstagram', { ids }));
  };
  const toggle = (g) => run('t' + g.id, () => api('a', 'saveInstagram', { id: g.id, hidden: !g.hidden }));
  const remove = (g) => { if (confirm('이 게시물을 목록에서 지울까요?\n인스타그램 게시물 자체는 지워지지 않습니다.')) run('d' + g.id, () => api('a', 'deleteInstagram', { id: g.id }), '지웠습니다.'); };

  let order = 0;
  return html`
    <div class="page-head"><h1>인스타그램 게시물</h1></div>
    <div class="ia-wrap">
      <div>
        <p class="ia-hint">제휴사 홈 오른쪽에서 <b>한 개씩 3초마다</b> 넘어갑니다. 숨기지 않은 게시물이 위에서부터 <b>최대 ${IG_MAX}개</b> 보입니다.</p>
        <${Load} state=${st}>${() => list.length ? html`
          <ol class="ia-list">${list.map((g, i) => {
            const no = g.hidden ? 0 : ++order;
            return html`<li class=${cls('ia-item', g.hidden && 'off')}>
              <div class="ia-ord">
                <button onClick=${() => move(i, -1)} disabled=${i === 0 || !!busy} aria-label="위로">▲</button>
                <button onClick=${() => move(i, 1)} disabled=${i === list.length - 1 || !!busy} aria-label="아래로">▼</button>
              </div>
              <span class="ia-no" title=${no ? `홈에서 ${no}번째` : '숨김'}>${no || '숨김'}</span>
              <div class="ia-txt">
                <b>${g.memo || '메모 없음'}</b>
                <a class="u" href=${g.url} target="_blank" rel="noopener">${g.url.replace(/^https:\/\/www\./, '')}</a>
                <small>${fmtDate(g.createdAt)} 등록</small>
              </div>
              <div class="acts">
                <button class="btn sm" onClick=${() => toggle(g)} disabled=${!!busy}>${g.hidden ? '보이기' : '숨기기'}</button>
                <button class="btn sm danger" onClick=${() => remove(g)} disabled=${!!busy}>삭제</button>
              </div>
            </li>`;
          })}</ol>` : html`<${Empty}>아직 등록한 게시물이 없습니다. 오른쪽에서 주소를 붙여 넣어 추가해 주세요.</${Empty}>`}
        </${Load}>
      </div>

      <form class="card ia-form" onSubmit=${add}>
        <h2>게시물 추가</h2>
        <div class="ia-count">홈에 보이는 게시물 <b>${shown}</b> / ${IG_MAX}</div>
        <${Field} label="인스타그램 게시물 주소" hint="게시물 오른쪽 위 ⋯ → 링크 복사 → 붙여 넣기. 사진은 인스타그램에서 자동으로 불러옵니다.">
          <input value=${url} onInput=${(e) => setUrl(e.target.value.trim())} placeholder="https://www.instagram.com/p/…" />
        </${Field}>
        <${Field} label="메모" hint="관리용입니다. 제휴사에게는 보이지 않습니다.">
          <input value=${memo} maxlength="40" onInput=${(e) => setMemo(e.target.value)} placeholder="예: 11월 미션챌린지 기간 연장" />
        </${Field}>
        <div class="ia-pv">${valid ? html`<${IgFrame} url=${url} eager title="미리보기" />` : html`<div class="ia-empty">${url ? '인스타그램 게시물 주소가 아닙니다.' : '주소를 넣으면 미리보기가 나옵니다.'}</div>`}</div>
        <button class="btn primary block" disabled=${!valid || !!busy}>${busy === 'add' ? '추가하는 중…' : '추가하기'}</button>
      </form>
    </div>`;
}
