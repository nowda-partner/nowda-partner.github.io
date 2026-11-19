// 체험 모드: 서버(앱스 스크립트) 없이 화면을 확인하기 위한 가짜 서버.
// 데이터는 이 브라우저에만 저장됩니다. config.js에 API_URL을 넣으면 사용되지 않습니다.
import { nowStr } from './lib.js?v=202611200029';

const DB_KEY = 'np_mock_db_v1';
const STATUS = { open: '접수', doing: '처리중', done: '답변완료' };

function seed() {
  const t = nowStr();
  const d = (days) => {
    const x = new Date(Date.now() + 9 * 3600e3 + days * 86400e3);
    return x.toISOString().slice(0, 16).replace('T', ' ');
  };
  const para = (text) => ({ type: 'paragraph', data: { text } });
  return {
    partners: [
      { id: 'G001', name: '제주목관아', type: '공영', category: '관광지', active: true, code: '12345678', issuedAt: d(-10), lastLogin: '' },
      { id: 'M001', name: '한라 카페', type: '민영', category: '식음료', active: true, code: '87654321', issuedAt: d(-10), lastLogin: '' },
      { id: 'M002', name: '오름 체험농장', type: '민영', category: '체험', active: true, code: '', issuedAt: '', lastLogin: '' },
    ],
    admins: [{ id: 'admin', name: '나우다 운영팀', password: 'admin12345' }],
    instagram: [
      { id: '1', url: 'https://www.instagram.com/p/Df6gV-jlFh-/', memo: '미션챌린지 기간 연장', order: 1, hidden: false, createdAt: t },
      { id: '2', url: 'https://www.instagram.com/p/Df40_xhnb-l/', memo: '', order: 2, hidden: false, createdAt: t },
      { id: '3', url: 'https://www.instagram.com/p/DaO5RSLP9i1/', memo: '', order: 3, hidden: false, createdAt: t },
    ],
    notices: [
      {
        id: '1', title: '[긴급] 11월 20일 시스템 점검 안내', category: '시스템', urgent: true, pinned: false, hidden: false,
        start: d(-1), end: '', popup: true, popupStart: d(-1), popupEnd: d(7), popupImage: '', thumb: '', attachments: [],
        author: '나우다 운영팀', createdAt: d(-1), updatedAt: d(-1), views: 12,
        body: { blocks: [
          { type: 'header', data: { text: '점검 일정', level: 2 } },
          para('<b>2026년 11월 20일(금) 02:00 ~ 05:00</b> 동안 QR 인증 서버 점검이 있습니다.'),
          { type: 'list', data: { style: 'unordered', items: [{ content: '점검 중에는 QR 인증이 일시 중단됩니다.', items: [] }, { content: '점검 후 별도 조치는 필요 없습니다.', items: [] }] } },
          para('문의는 1:1 문의 게시판을 이용해 주세요. 자세한 내용: https://example.com'),
        ] },
      },
      {
        id: '2', title: '나우다 제휴사 안내 페이지를 열었습니다', category: '일반', urgent: false, pinned: true, hidden: false,
        start: d(-5), end: '', popup: false, popupStart: '', popupEnd: '', popupImage: '', thumb: '', attachments: [],
        author: '나우다 운영팀', createdAt: d(-5), updatedAt: d(-5), views: 40,
        body: { blocks: [
          para('제휴사 여러분, 안녕하세요. 앞으로 이곳에서 <mark class="cdx-marker">나우다 소식</mark>과 FAQ를 확인하고, 요청 사항은 1:1 문의로 남겨 주세요.'),
          { type: 'quote', data: { text: '접속코드는 다른 사람과 공유하지 말아 주세요.', caption: '나우다 운영팀' } },
        ] },
      },
      {
        id: '3', title: '10월 정산 일정 안내', category: '정산', urgent: false, pinned: false, hidden: false,
        start: d(-20), end: '', popup: false, popupStart: '', popupEnd: '', popupImage: '', thumb: '', attachments: [],
        author: '나우다 운영팀', createdAt: d(-20), updatedAt: d(-20), views: 33,
        body: { blocks: [para('10월 정산은 11월 둘째 주에 진행됩니다.')] },
      },
      {
        id: '4', title: '(예약) 12월 이벤트 안내', category: '이벤트', urgent: false, pinned: false, hidden: false,
        start: d(10), end: '', popup: false, popupStart: '', popupEnd: '', popupImage: '', thumb: '', attachments: [],
        author: '나우다 운영팀', createdAt: t, updatedAt: t, views: 0, body: { blocks: [para('예약 게시 예시입니다. 게시 시작일 전에는 제휴사에게 보이지 않습니다.')] },
      },
    ],
    faqs: [
      { id: '1', category: '이용 방법', question: '접속코드를 잃어버렸어요.', answer: '1:1 문의 또는 나우다 운영팀에 연락 주시면 새 접속코드를 발급해 드립니다.\n기존 코드는 더 이상 쓸 수 없게 됩니다.', order: 1, hidden: false, updatedAt: t },
      { id: '2', category: 'QR·인증', question: 'QR 코드가 인식되지 않아요.', answer: 'QR 코드가 훼손되었는지 확인해 주세요. 새 QR 코드가 필요하면 1:1 문의에서 "정보 수정 요청"을 선택해 남겨 주세요.', order: 2, hidden: false, updatedAt: t },
      { id: '3', category: '정산', question: '정산은 언제 이루어지나요?', answer: '매월 둘째 주에 전월분을 정산합니다. 자세한 일정은 소식 게시판의 정산 공지를 확인해 주세요.', order: 3, hidden: false, updatedAt: t },
    ],
    inquiries: [
      { id: '1', partnerId: 'G001', partnerName: '제주목관아', type: '정보 수정 요청', title: '운영 시간 변경 요청', content: '12월부터 운영 시간이 09:00~18:00으로 바뀝니다.\n앱 정보 수정 부탁드립니다.', attachments: [], status: STATUS.done, answer: '수정했습니다. 앱에는 내일부터 반영됩니다.', answeredBy: '나우다 운영팀', createdAt: d(-3), answeredAt: d(-2) },
      { id: '2', partnerId: 'G001', partnerName: '제주목관아', type: '시스템 문의', title: 'QR 인증 건수 확인', content: '어제 인증 건수가 평소보다 적은 것 같습니다. 확인 부탁드립니다.', attachments: [], status: STATUS.open, answer: '', answeredBy: '', createdAt: d(0), answeredAt: '' },
    ],
    files: {},
  };
}

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* 무시 */ }
  const db = seed();
  save(db);
  return db;
}

function save(db) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { throw fail('체험 모드 저장 공간이 가득 찼습니다. 사진을 줄이거나 [체험 데이터 초기화]를 눌러 주세요.'); }
}

export function resetMock() {
  localStorage.removeItem(DB_KEY);
}

function fail(msg, code) {
  const e = new Error(msg);
  e.code = code;
  return e;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function who(token) {
  const m = /^mock:(p|a):(.+)$/.exec(token || '');
  return m ? { r: m[1], id: m[2] } : null;
}

function needPartner(db, token) {
  const s = who(token);
  const p = s && s.r === 'p' && db.partners.find((x) => x.id === s.id);
  if (!p || !p.active || !p.code) throw fail('다시 로그인해 주세요.', 'AUTH');
  return { id: p.id, name: p.name };
}

// 체험용 실적(가짜 숫자). 실제 업체 자료는 넣지 않는다.
function mockStats(me) {
  const plan = { G001: { kind: '공영', cat: '관광지', base: 420 }, M001: { kind: '민영', cat: '식음료', base: 28 } }[me.id];
  if (!plan) return { status: 'none' };
  let seed = me.id.charCodeAt(0) * 31 + Number(me.id.slice(1));
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const today = nowStr().slice(0, 10);
  const [ty, tm] = today.split('-').map(Number);
  const m = {};
  let prev = null;
  for (let i = 14; i >= 0; i--) {
    const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
    const ym = d.toISOString().slice(0, 7);
    const part = i === 0;
    const season = 1 + 0.35 * Math.sin((d.getUTCMonth() + 2) / 12 * Math.PI * 2);
    let u = Math.round(plan.base * season * (0.75 + rnd() * 0.5) * (part ? Number(today.slice(8)) / 30 : 1));
    if (i === 14) u = Math.round(u * 0.1);
    const p = Math.max(0, Math.round(u * (0.88 + rnd() * 0.08)));
    const r = { u, p };
    if (part) { // 진행 중인 달: 지난달 같은 기간과 비교
      r.pu = prev ? Math.round(prev.u * Number(today.slice(8)) / 30) : 0;
      if (r.pu) r.mo = Math.round((u - r.pu) / r.pu * 100);
    } else if (prev && prev.u) r.mo = Math.round((u - prev.u) / prev.u * 100);
    const n = plan.base > 100 ? 18 + Math.round(rnd() * 8) : (i > 10 ? 6 : 30);
    if (n >= 10) {
      const um = Math.round(u * (0.4 + rnd() * 0.9)), pm = Math.round(um * 0.9);
      r.c = { n, um, pm, b: u > um * 1.6 ? '상위 25%' : u < um * 0.6 ? '하위 25%' : '중간' };
    }
    if (p >= 10 && i < 14) r.rv = Math.round(8 + rnd() * 20);
    if (p >= 50) {
      const f = Math.round(85 + rnd() * 10);
      r.d = {
        fg: [['내국인', f], ['외국인', 100 - f]],
        age: [['20대', 22], ['30대', 27], ['40대', 24], ['50대', 15], ['기타', 12]],
        gender: [['여성', 57], ['남성', 43]],
        region: [['제주', 18], ['서울', 27], ['경기', 24], ['부산', 7], ['기타', 24]],
      };
    }
    m[ym] = r;
    prev = r;
  }
  const last = Object.keys(m).sort().pop();
  return { status: 'ok', data: { id: me.id, name: me.name, kind: plan.kind, cat: plan.cat, upd: today, last, thru: today, pt: Number(today.slice(8)) < 28, m } };
}

function needAdmin(db, token) {
  const s = who(token);
  const a = s && s.r === 'a' && db.admins.find((x) => x.id === s.id);
  if (!a) throw fail('관리자 로그인이 필요합니다.', 'AUTH');
  return a;
}

const visible = (n, t) => !n.hidden && (!n.start || n.start <= t) && (!n.end || n.end >= t);
const popupLive = (n, t) => n.popup && (!n.popupStart || n.popupStart <= t) && (!n.popupEnd || n.popupEnd >= t);
const dateOf = (n) => n.start || n.createdAt || '';
const summary = (n) => { const { body, ...rest } = n; return { ...rest, summary: n.summary || summaryOf(body || {}), date: dateOf(n) }; };
const byDateDesc = (a, b) => ((a.date || a.createdAt) < (b.date || b.createdAt) ? 1 : (a.date || a.createdAt) > (b.date || b.createdAt) ? -1 : Number(b.id) - Number(a.id));
// 예전 체험 데이터에는 인스타그램 목록이 없을 수 있다
const igList = (db) => (db.instagram ||= []).sort((a, b) => a.order - b.order || Number(a.id) - Number(b.id));
const nextId = (list) => String(list.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1);
const qSummary = (q) => ({ id: q.id, partnerId: q.partnerId, partnerName: q.partnerName, type: q.type, title: q.title, status: q.status, createdAt: q.createdAt, answeredAt: q.answeredAt, files: q.attachments.length });

function visibleNotices(db) {
  const t = nowStr();
  return db.notices.filter((n) => visible(n, t)).sort((a, b) => {
    const pa = a.pinned || a.urgent ? 1 : 0, pb = b.pinned || b.urgent ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return dateOf(b) < dateOf(a) ? -1 : dateOf(b) > dateOf(a) ? 1 : 0;
  });
}

function summaryOf(body) {
  let out = '';
  for (const b of body.blocks || []) {
    const d = b.data || {};
    const t = d.text || (d.items || []).map((i) => (typeof i === 'string' ? i : i.content || '')).join(' ');
    out += ' ' + String(t || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
    if (out.length > 160) break;
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, 160);
}

function storeFile(db, f) {
  const id = 'f' + Date.now() + Math.random().toString(36).slice(2, 7);
  db.files[id] = { name: f.name, mime: f.mime, data: f.data };
  return { id, name: f.name, mime: f.mime, size: Math.round((f.data.length * 3) / 4) };
}

const handlers = {
  login(db, p) {
    const id = String(p.id || '').trim().toUpperCase();
    const code = String(p.code || '').replace(/\D/g, '');
    const x = db.partners.find((y) => y.id === id);
    if (!x || !x.active || !x.code || x.code !== code) throw fail('업체ID 또는 접속코드가 맞지 않습니다. (체험: G001 / 12345678)');
    x.lastLogin = nowStr();
    const token = `mock:p:${id}`;
    return { token, partner: { id, name: x.name }, home: handlers.home(db, {}, token) };
  },
  adminLogin(db, p) {
    const a = db.admins.find((x) => x.id === String(p.id || '').trim());
    if (!a || a.password !== p.password) throw fail('아이디 또는 비밀번호가 맞지 않습니다. (체험: admin / admin12345)');
    const token = `mock:a:${a.id}`;
    return { token, admin: { id: a.id, name: a.name }, dashboard: handlers.adminDashboard(db, {}, token) };
  },
  home(db, p, t) {
    const me = needPartner(db, t);
    const now = nowStr();
    const vis = visibleNotices(db);
    const mine = db.inquiries.filter((q) => q.partnerId === me.id).map(qSummary).sort(byDateDesc);
    return {
      me,
      popups: vis.filter((n) => popupLive(n, now)).map(summary),
      urgent: vis.filter((n) => n.urgent).map(summary),
      recent: vis.slice(0, 6).map(summary),
      inquiries: mine.slice(0, 5),
      instagram: igList(db).filter((g) => !g.hidden).slice(0, 5).map((g) => ({ id: g.id, url: g.url })),
      inquiryCounts: { open: mine.filter((q) => q.status !== STATUS.done).length, done: mine.filter((q) => q.status === STATUS.done).length },
    };
  },
  notices(db, p, t) { needPartner(db, t); return visibleNotices(db).map(summary); },
  notice(db, p, t) {
    needPartner(db, t);
    const n = visibleNotices(db).find((x) => x.id === String(p.id));
    if (!n) throw fail('게시 기간이 지났거나 없는 글입니다.');
    n.views += 1;
    return { ...summary(n), body: n.body };
  },
  faqs(db, p, t) { needPartner(db, t); return db.faqs.filter((f) => !f.hidden).sort((a, b) => a.order - b.order); },
  myStats(db, p, t) { return mockStats(needPartner(db, t)); },
  events(db, p, t) {
    needPartner(db, t);
    const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
    const page = 'https://www.visitjeju.net/kr/nowda/event';
    return { page, list: [
      { title: '체험 이벤트 — 마감이 가까운 이벤트', start: day(-12), end: day(5), url: page, img: '', state: 'on', soon: true },
      { title: '체험 이벤트 — 진행 중인 미션 챌린지', start: day(-3), end: day(25), url: page, img: '', state: 'on', soon: false },
      { title: '체험 이벤트 — 오래 하는 혜택', start: day(-30), end: day(400), url: page, img: '', state: 'on', soon: false },
      { title: '체험 이벤트 — 다음 달 시작', start: day(20), end: day(50), url: page, img: '', state: 'plan', soon: false },
      { title: '체험 이벤트 — 다섯 번째', start: day(-1), end: day(60), url: page, img: '', state: 'on', soon: false },
    ] };
  },
  myInquiries(db, p, t) { const me = needPartner(db, t); return db.inquiries.filter((q) => q.partnerId === me.id).map(qSummary).sort(byDateDesc); },
  inquiry(db, p, t) {
    const me = needPartner(db, t);
    const q = db.inquiries.find((x) => x.id === String(p.id));
    if (!q || q.partnerId !== me.id) throw fail('볼 수 없는 문의입니다.');
    return q;
  },
  createInquiry(db, p, t) {
    const me = needPartner(db, t);
    if (!String(p.title || '').trim() || !String(p.content || '').trim()) throw fail('제목과 내용을 입력해 주세요.');
    const id = nextId(db.inquiries);
    const attachments = (p.files || []).slice(0, 5).map((f) => storeFile(db, f));
    db.inquiries.push({ id, partnerId: me.id, partnerName: me.name, type: p.type || '기타', title: p.title.trim(), content: p.content.trim(), attachments, status: STATUS.open, answer: '', answeredBy: '', createdAt: nowStr(), answeredAt: '' });
    return { id };
  },
  file(db, p, t) {
    const s = who(t);
    if (!s) throw fail('다시 로그인해 주세요.', 'AUTH');
    const q = db.inquiries.find((x) => x.id === String(p.inquiryId));
    if (!q) throw fail('문의를 찾을 수 없습니다.');
    if (s.r === 'p' && needPartner(db, t).id !== q.partnerId) throw fail('볼 수 없는 파일입니다.');
    if (s.r === 'a') needAdmin(db, t);
    const f = db.files[p.fileId];
    if (!f) throw fail('파일을 찾을 수 없습니다.');
    return f;
  },

  adminDashboard(db, p, t) {
    needAdmin(db, t);
    const now = nowStr();
    const live = db.notices.filter((n) => visible(n, now));
    return {
      counts: {
        openInquiries: db.inquiries.filter((q) => q.status !== STATUS.done).length,
        liveNotices: live.length,
        livePopups: live.filter((n) => popupLive(n, now)).length,
        scheduled: db.notices.filter((n) => !n.hidden && n.start && n.start > now).length,
        partners: db.partners.length,
        issued: db.partners.filter((x) => x.code).length,
      },
      recentInquiries: db.inquiries.map(qSummary).sort(byDateDesc).slice(0, 8),
    };
  },
  adminNotices(db, p, t) { needAdmin(db, t); return db.notices.map(summary).sort(byDateDesc); },
  adminNotice(db, p, t) {
    needAdmin(db, t);
    const n = db.notices.find((x) => x.id === String(p.id));
    if (!n) throw fail('소식을 찾을 수 없습니다.');
    return { ...summary(n), body: n.body };
  },
  saveNotice(db, p, t) {
    const a = needAdmin(db, t);
    if (!String(p.title || '').trim()) throw fail('제목을 입력해 주세요.');
    const body = p.body?.blocks ? p.body : { blocks: [] };
    const firstImg = body.blocks.find((b) => b.type === 'image')?.data?.file?.url || '';
    const fix = (v) => String(v || '').replace('T', ' ');
    const values = {
      title: p.title.trim(), category: p.category || '일반', summary: summaryOf(body), thumb: p.thumb || firstImg, body,
      attachments: p.attachments || [], urgent: !!p.urgent, pinned: !!p.pinned, hidden: !!p.hidden,
      start: fix(p.start), end: fix(p.end), popup: !!p.popup, popupStart: fix(p.popupStart), popupEnd: fix(p.popupEnd),
      popupImage: p.popupImage || '', updatedAt: nowStr(),
    };
    if (p.id) {
      const n = db.notices.find((x) => x.id === String(p.id));
      if (!n) throw fail('소식을 찾을 수 없습니다.');
      Object.assign(n, values);
      return { id: n.id };
    }
    const id = nextId(db.notices);
    db.notices.push({ id, ...values, author: a.name, createdAt: nowStr(), views: 0 });
    return { id };
  },
  deleteNotice(db, p, t) { needAdmin(db, t); db.notices = db.notices.filter((x) => x.id !== String(p.id)); return { id: p.id }; },
  uploadImage(db, p, t) {
    needAdmin(db, t);
    const url = `data:${p.mime};base64,${p.data}`;
    return { id: 'img' + Date.now(), name: p.name, url, download: url, size: Math.round((p.data.length * 3) / 4), mime: p.mime };
  },
  uploadNoticeFile(db, p, t) { return handlers.uploadImage(db, p, t); },
  adminFaqs(db, p, t) { needAdmin(db, t); return [...db.faqs].sort((a, b) => a.order - b.order); },
  saveFaq(db, p, t) {
    needAdmin(db, t);
    if (!String(p.question || '').trim()) throw fail('질문을 입력해 주세요.');
    const values = { category: p.category || '일반', question: p.question.trim(), answer: p.answer || '', order: Number(p.order || 0), hidden: !!p.hidden, updatedAt: nowStr() };
    if (p.id) { Object.assign(db.faqs.find((x) => x.id === String(p.id)), values); return { id: p.id }; }
    const id = nextId(db.faqs);
    db.faqs.push({ id, ...values });
    return { id };
  },
  adminInstagram(db, p, t) { needAdmin(db, t); return igList(db); },
  saveInstagram(db, p, t) {
    needAdmin(db, t);
    const list = igList(db);
    const cur = list.find((g) => g.id === String(p.id || ''));
    const hidden = p.hidden === undefined && cur ? cur.hidden : !!p.hidden;
    if (!hidden && list.filter((g) => !g.hidden && g.id !== String(p.id || '')).length >= 5) throw fail('홈에 보이는 게시물은 5개까지입니다. 하나를 숨기거나 지운 뒤 다시 해 주세요.');
    if (cur) { cur.hidden = hidden; if (p.memo !== undefined) cur.memo = p.memo; return { id: cur.id }; }
    const m = String(p.url || '').match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]+)/i);
    if (!m) throw fail('인스타그램 게시물 주소가 아닙니다.');
    const url = `https://www.instagram.com/${m[1].toLowerCase() === 'reel' ? 'reel' : 'p'}/${m[2]}/`;
    if (list.some((g) => g.url === url)) throw fail('이미 등록한 게시물입니다.');
    const id = nextId(db.instagram);
    db.instagram.push({ id, url, memo: p.memo || '', order: list.reduce((x, g) => Math.max(x, g.order), 0) + 1, hidden, createdAt: nowStr() });
    return { id };
  },
  deleteInstagram(db, p, t) { needAdmin(db, t); db.instagram = igList(db).filter((g) => g.id !== String(p.id)); return { id: p.id }; },
  orderInstagram(db, p, t) { needAdmin(db, t); (p.ids || []).forEach((id, i) => { const g = igList(db).find((x) => x.id === String(id)); if (g) g.order = i + 1; }); return { ok: true }; },
  deleteFaq(db, p, t) { needAdmin(db, t); db.faqs = db.faqs.filter((x) => x.id !== String(p.id)); return { id: p.id }; },
  adminInquiries(db, p, t) { needAdmin(db, t); return db.inquiries.map(qSummary).sort(byDateDesc); },
  adminInquiry(db, p, t) {
    needAdmin(db, t);
    const q = db.inquiries.find((x) => x.id === String(p.id));
    if (!q) throw fail('문의를 찾을 수 없습니다.');
    return q;
  },
  answerInquiry(db, p, t) {
    const a = needAdmin(db, t);
    const q = db.inquiries.find((x) => x.id === String(p.id));
    q.status = Object.values(STATUS).includes(p.status) ? p.status : STATUS.done;
    q.answer = p.answer || '';
    if (q.answer.trim()) { q.answeredBy = a.name; q.answeredAt = nowStr(); }
    return { id: q.id };
  },
  adminPartners(db, p, t) {
    needAdmin(db, t);
    return db.partners.map((x) => ({ id: x.id, name: x.name, type: x.type, category: x.category, active: x.active, issued: !!x.code, issuedAt: x.issuedAt, lastLogin: x.lastLogin }));
  },
  savePartner(db, p, t) {
    needAdmin(db, t);
    const id = String(p.id || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,20}$/.test(id)) throw fail('업체ID는 영문·숫자로 입력해 주세요. (예: G001, M023)');
    if (!String(p.name || '').trim()) throw fail('업체명을 입력해 주세요.');
    const x = db.partners.find((y) => y.id === id);
    const values = { name: p.name.trim(), type: p.type || '', category: p.category || '' };
    if (x) Object.assign(x, values);
    else db.partners.push({ id, ...values, active: true, code: '', issuedAt: '', lastLogin: '' });
    return { id };
  },
  setPartnerActive(db, p, t) {
    needAdmin(db, t);
    const x = db.partners.find((y) => y.id === p.id);
    x.active = !!p.active;
    return { id: x.id, active: x.active };
  },
  issueCodes(db, p, t) {
    needAdmin(db, t);
    const ids = new Set((p.ids || []).map((x) => String(x).toUpperCase()));
    if (!ids.size) throw fail('발급할 업체를 선택해 주세요.');
    const issued = [];
    for (const x of db.partners) {
      if (!ids.has(x.id)) continue;
      let code = '';
      for (let i = 0; i < 8; i++) code += Math.floor(Math.random() * 10);
      if (code[0] === '0') code = '1' + code.slice(1);
      x.code = code;
      x.issuedAt = nowStr();
      issued.push({ id: x.id, name: x.name, code });
      ids.delete(x.id);
    }
    return { issued, missing: [...ids] };
  },
};

export async function handle(action, payload, token) {
  await wait(150);
  const db = load();
  const fn = handlers[action];
  if (!fn) return { ok: false, error: '알 수 없는 요청입니다: ' + action };
  try {
    const data = fn(db, JSON.parse(JSON.stringify(payload || {})), token);
    save(db);
    return { ok: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (e) {
    return { ok: false, error: e.message, code: e.code || '' };
  }
}
