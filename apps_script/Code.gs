/**
 * 나우다 제휴사 안내 포털 — 서버(API)
 *
 * 화면(GitHub Pages)이 이 웹앱에 JSON으로 요청하고, 이 웹앱은 JSON만 돌려준다.
 * HTML 화면을 직접 내보내지 않으므로 "Google Apps Script 사용자가 만든 앱" 안내 줄이 뜨지 않는다.
 *
 * 비밀값(SECRET, SALT)과 폴더 ID는 [프로젝트 설정 → 스크립트 속성]에 저장되며 코드에는 없다.
 * 기존 통계 앱과는 별도 시트·별도 비밀값을 쓴다.
 */

var TZ = 'Asia/Seoul';
var SESSION_HOURS = 12;
var LOCK_FAILS = 5;
var LOCK_MINUTES = 30;
var MAX_FILE_MB = 10;

var TABS = {
  partner: '업체',
  notice: '소식',
  inquiry: '문의',
  faq: 'FAQ',
  admin: '관리자',
  log: '접속기록'
};

var HEADERS = {
  '업체': ['업체ID', '업체명', '구분', '카테고리', '사용', '발급일', '해시', '마지막접속'],
  '소식': ['ID', '제목', '분류', '요약', '썸네일', '본문', '첨부', '긴급', '고정', '숨김',
          '게시시작', '게시종료', '팝업', '팝업시작', '팝업종료', '팝업이미지',
          '작성자', '작성일', '수정일', '조회수'],
  '문의': ['ID', '업체ID', '업체명', '유형', '제목', '내용', '첨부', '상태', '답변', '답변자', '작성일', '답변일'],
  'FAQ': ['ID', '분류', '질문', '답변', '순서', '숨김', '수정일'],
  '관리자': ['아이디', '이름', '해시', '사용'],
  '접속기록': ['시각', '구분', '아이디', '결과']
};

var STATUS = { open: '접수', doing: '처리중', done: '답변완료' };

// 서버 메모리(CacheService)에 기억해 두는 시간(초). 관리자 화면에서 고치면 바로 지우고,
// 시트를 직접 고친 경우에는 이 시간이 지나면 반영된다.
var CACHE_SEC = { content: 600, account: 300 };

/* ───────────────────────── 웹앱 진입점 ───────────────────────── */

/** 로그인 화면이 열릴 때 화면이 먼저 불러 서버를 깨운다. 자주 쓰는 자료도 미리 서버 메모리에 올려 둔다. */
function doGet() {
  try { partnerIndex_(); allNotices_(); } catch (e) { /* 미리 데우기 실패는 무시 */ }
  return json_({ ok: true, service: 'nowda-partner-api', time: now_() });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: '요청 형식이 올바르지 않습니다.' });
  }
  try {
    var fn = ACTIONS[req.action];
    if (!fn) throw new UserError('알 수 없는 요청입니다: ' + req.action);
    var data = fn(req.payload || {}, req.token || '');
    return json_({ ok: true, data: data });
  } catch (err) {
    if (err instanceof UserError) return json_({ ok: false, error: err.message, code: err.code || '' });
    console.error(err && err.stack || err);
    return json_({ ok: false, error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
  }
}

function UserError(message, code) {
  this.message = message;
  this.code = code;
}
UserError.prototype = Object.create(Error.prototype);

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ───────────────────────── 요청 목록 ───────────────────────── */

var ACTIONS = {
  /* 로그인 */
  login: function (p) { return partnerLogin_(p.id, p.code); },
  adminLogin: function (p) { return adminLogin_(p.id, p.password); },

  /* 제휴사 */
  home: function (p, t) { var me = needPartner_(t); return partnerHome_(me); },
  notices: function (p, t) { needPartner_(t); return visibleNotices_().map(noticeSummary_); },
  notice: function (p, t) { needPartner_(t); return partnerNotice_(p.id); },
  faqs: function (p, t) { needPartner_(t); return faqList_(false); },
  myInquiries: function (p, t) { var me = needPartner_(t); return myInquiries_(me); },
  inquiry: function (p, t) { var me = needPartner_(t); return inquiryForPartner_(me, p.id); },
  createInquiry: function (p, t) { var me = needPartner_(t); return createInquiry_(me, p); },
  myStats: function (p, t) { var me = needPartner_(t); return statsFor_(me.id); },
  file: function (p, t) { return downloadFile_(t, p.inquiryId, p.fileId); },

  /* 관리자 */
  adminDashboard: function (p, t) { needAdmin_(t); return adminDashboard_(); },
  adminNotices: function (p, t) { needAdmin_(t); return readRows_(TABS.notice).map(noticeFromRow_).map(noticeSummary_).sort(byDateDesc_); },
  adminNotice: function (p, t) { needAdmin_(t); return noticeDetail_(findById_(TABS.notice, p.id, '소식')); },
  saveNotice: function (p, t) { var a = needAdmin_(t); return saveNotice_(a, p); },
  deleteNotice: function (p, t) { needAdmin_(t); return deleteNotice_(p.id); },
  uploadImage: function (p, t) { needAdmin_(t); return uploadPublic_(p); },
  uploadNoticeFile: function (p, t) { needAdmin_(t); return uploadPublic_(p); },
  adminFaqs: function (p, t) { needAdmin_(t); return faqList_(true); },
  saveFaq: function (p, t) { needAdmin_(t); return saveFaq_(p); },
  deleteFaq: function (p, t) { needAdmin_(t); var r = deleteRowById_(TABS.faq, p.id, 'FAQ'); uncache_('faqs'); return r; },
  adminInquiries: function (p, t) { needAdmin_(t); return readRows_(TABS.inquiry).map(inquiryFromRow_).map(inquirySummary_).sort(byDateDesc_); },
  adminInquiry: function (p, t) { needAdmin_(t); return inquiryFromRow_(findById_(TABS.inquiry, p.id, '문의')); },
  answerInquiry: function (p, t) { var a = needAdmin_(t); return answerInquiry_(a, p); },
  adminPartners: function (p, t) { needAdmin_(t); return partnerList_(); },
  savePartner: function (p, t) { needAdmin_(t); return savePartner_(p); },
  setPartnerActive: function (p, t) { needAdmin_(t); return setPartnerActive_(p.id, p.active); },
  issueCodes: function (p, t) { needAdmin_(t); return issueCodes_(p.ids || []); }
};

/* ───────────────────────── 로그인 · 세션 ───────────────────────── */

function partnerLogin_(id, code) {
  id = normId_(id);
  code = String(code || '').replace(/\D/g, '');
  if (!id || !code) throw new UserError('업체ID와 접속코드를 입력해 주세요.');
  var fails = checkLock_('p:' + id);
  var idx = partnerIndex_();
  var row = idx.map[id];
  var ok = row && row['사용'] !== 'N' && row['해시'] && hash_('p|' + id + '|' + code) === row['해시'];
  log_('제휴사', id, ok ? '성공' : '실패');
  if (!ok) {
    var left = addFail_('p:' + id);
    throw new UserError(left > 0
      ? '업체ID 또는 접속코드가 맞지 않습니다. (' + left + '번 더 틀리면 ' + LOCK_MINUTES + '분 동안 잠깁니다)'
      : '여러 번 틀려서 ' + LOCK_MINUTES + '분 동안 잠겼습니다. 잠시 후 다시 시도해 주세요.');
  }
  if (fails) clearFail_('p:' + id);
  touchPartner_(idx, id);
  var me = { id: id, name: row['업체명'] };
  return {
    token: sign_({ r: 'p', id: id, v: String(row['해시']).slice(0, 10), exp: Date.now() + SESSION_HOURS * 3600e3 }),
    partner: me,
    home: partnerHome_(me) // 로그인 직후 홈을 다시 요청하지 않도록 같이 보낸다
  };
}

function adminLogin_(id, password) {
  id = String(id || '').trim();
  if (!id || !password) throw new UserError('아이디와 비밀번호를 입력해 주세요.');
  var fails = checkLock_('a:' + id);
  var row = adminMap_()[id];
  var ok = row && row['사용'] !== 'N' && row['해시'] && hash_('a|' + id + '|' + password) === row['해시'];
  log_('관리자', id, ok ? '성공' : '실패');
  if (!ok) {
    var left = addFail_('a:' + id);
    throw new UserError(left > 0 ? '아이디 또는 비밀번호가 맞지 않습니다.' : '여러 번 틀려서 ' + LOCK_MINUTES + '분 동안 잠겼습니다.');
  }
  if (fails) clearFail_('a:' + id);
  return {
    token: sign_({ r: 'a', id: id, name: row['이름'], v: String(row['해시']).slice(0, 10), exp: Date.now() + SESSION_HOURS * 3600e3 }),
    admin: { id: id, name: row['이름'] },
    dashboard: adminDashboard_()
  };
}

function needPartner_(token) {
  var s = verify_(token);
  if (!s || s.r !== 'p') throw new UserError('다시 로그인해 주세요.', 'AUTH');
  var row = partnerMap_()[s.id];
  if (!row || row['사용'] === 'N' || String(row['해시']).slice(0, 10) !== s.v) {
    throw new UserError('접속코드가 바뀌었거나 접속이 중지되었습니다. 다시 로그인해 주세요.', 'AUTH');
  }
  return { id: s.id, name: row['업체명'] };
}

function needAdmin_(token) {
  var s = verify_(token);
  if (!s || s.r !== 'a') throw new UserError('관리자 로그인이 필요합니다.', 'AUTH');
  var row = adminMap_()[s.id];
  if (!row || row['사용'] === 'N' || String(row['해시']).slice(0, 10) !== s.v) {
    throw new UserError('관리자 정보가 바뀌었습니다. 다시 로그인해 주세요.', 'AUTH');
  }
  return { id: s.id, name: row['이름'] || s.id };
}

function sign_(payload) {
  var body = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  return body + '.' + hmac_(body);
}

function verify_(token) {
  if (!token || token.indexOf('.') < 0) return null;
  var parts = token.split('.');
  if (parts.length !== 2 || hmac_(parts[0]) !== parts[1]) return null;
  try {
    var s = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    return s.exp > Date.now() ? s : null;
  } catch (e) {
    return null;
  }
}

function hmac_(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, prop_('SECRET')));
}

function hash_(text) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, prop_('SALT') + '|' + text, Utilities.Charset.UTF_8);
  return b.map(function (x) { return ('0' + (x & 0xff).toString(16)).slice(-2); }).join('');
}

/** 잠겼으면 막고, 아니면 지금까지 틀린 횟수를 돌려준다. */
function checkLock_(key) {
  var n = Number(CacheService.getScriptCache().get('fail:' + key) || 0);
  if (n >= LOCK_FAILS) throw new UserError('여러 번 틀려서 잠겼습니다. ' + LOCK_MINUTES + '분 뒤에 다시 시도해 주세요.');
  return n;
}

function addFail_(key) {
  var c = CacheService.getScriptCache();
  var n = Number(c.get('fail:' + key) || 0) + 1;
  c.put('fail:' + key, String(n), LOCK_MINUTES * 60);
  return LOCK_FAILS - n;
}

function clearFail_(key) {
  CacheService.getScriptCache().remove('fail:' + key);
}

function newCode_() {
  var s = '';
  for (var i = 0; i < 8; i++) s += Math.floor(Math.random() * 10);
  return s.charAt(0) === '0' ? '1' + s.slice(1) : s;
}

function normId_(id) {
  return String(id || '').trim().toUpperCase();
}

/* ───────────────────────── 실적 ─────────────────────────
 * 실적 자료는 기존 실적 시트(nowda-data 실적 웹앱이 쓰는 시트)의 [실적] 탭을 읽기만 한다.
 * CSV는 지금처럼 그 시트에만 올리면 되고, 이 포털은 그 시트에 아무것도 쓰지 않는다.
 * 시트 ID는 스크립트 속성 STATS_SHEET_ID에 있다(시트 메뉴 [나우다 포털 → 실적 시트 연결]).
 * [실적] 탭: A 업체ID · B 업체명 · C 공영/민영 · D 카테고리 · E 기준월 · F 데이터(JSON)
 */
var STATS_TAB = '실적';
var STATS_VER_SEC = 60; // 실적 시트가 바뀌었는지 이 간격으로 확인한다(CSV를 올리면 1분 안에 반영)

/** 로그인한 업체의 실적 하나만 돌려준다. 다른 업체 행은 읽어도 내보내지 않는다. */
function statsFor_(id) {
  var sheetId = prop_('STATS_SHEET_ID', true);
  if (!sheetId) return { status: 'off' };
  try {
    var ver = cached_('statsVer', function () {
      return { t: DriveApp.getFileById(sheetId).getLastUpdated().getTime() };
    }, STATS_VER_SEC).t;
    return cached_('stats:' + id + ':' + ver, function () {
      var data = findStatsRow_(sheetId, id);
      return data ? { status: 'ok', data: data } : { status: 'none' };
    }, CACHE_SEC.content);
  } catch (e) {
    console.error(e && e.stack || e);
    throw new UserError('실적 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
}

function findStatsRow_(sheetId, id) {
  var sh = SpreadsheetApp.openById(sheetId).getSheetByName(STATS_TAB);
  if (!sh || sh.getLastRow() < 2) return null;
  var hit = sh.getRange(2, 1, sh.getLastRow() - 1, 1).createTextFinder(id).matchCase(true).matchEntireCell(true).findNext();
  if (!hit) return null;
  var v = sh.getRange(hit.getRow(), 1, 1, 6).getValues()[0];
  if (normId_(v[0]) !== id) return null;
  var d = parseJson_(String(v[5]), null);
  if (!d || !d.m || (d.id && normId_(d.id) !== id)) return null; // 다른 업체 자료가 섞이지 않게 한 번 더 확인
  return d;
}

/* ───────────────────────── 제휴사 화면 ───────────────────────── */

function partnerHome_(me) {
  var vis = visibleNotices_();
  var t = now_();
  var popups = vis.filter(function (n) {
    return n.popup && (!n.popupStart || n.popupStart <= t) && (!n.popupEnd || n.popupEnd >= t);
  }).map(function (n) {
    var s = noticeSummary_(n);
    s.popupImage = n.popupImage;
    return s;
  });
  var mine = myInquiries_(me);
  return {
    me: me,
    popups: popups,
    urgent: vis.filter(function (n) { return n.urgent; }).map(noticeSummary_),
    recent: vis.slice(0, 6).map(noticeSummary_),
    inquiries: mine.slice(0, 5),
    inquiryCounts: {
      open: mine.filter(function (q) { return q.status !== STATUS.done; }).length,
      done: mine.filter(function (q) { return q.status === STATUS.done; }).length
    }
  };
}

/** 소식 전체(본문 제외). 서버 메모리에 기억해 두고, 소식을 저장·삭제하면 지운다. 조회수는 늦게 반영될 수 있다. */
function allNotices_() {
  return cached_('notices', function () { return readRows_(TABS.notice).map(noticeFromRow_); }, CACHE_SEC.content);
}

function isLive_(n, t) {
  return !n.hidden && (!n.start || n.start <= t) && (!n.end || n.end >= t);
}

function visibleNotices_() {
  var t = now_();
  return allNotices_().filter(function (n) { return isLive_(n, t); }).sort(function (a, b) {
    var pa = (a.pinned || a.urgent) ? 1 : 0;
    var pb = (b.pinned || b.urgent) ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return displayDate_(b) < displayDate_(a) ? -1 : displayDate_(b) > displayDate_(a) ? 1 : 0;
  });
}

function displayDate_(n) {
  return n.start || n.createdAt || '';
}

function partnerNotice_(id) {
  var table = readTable_(TABS.notice);
  var row = table.rows.filter(function (r) { return String(r['ID']) === String(id); })[0];
  if (!row || !isLive_(noticeFromRow_(row), now_())) throw new UserError('게시 기간이 지났거나 없는 글입니다.');
  row['조회수'] = String(Number(row['조회수'] || 0) + 1);
  setCell_(table, row._row, '조회수', row['조회수']);
  return noticeDetail_(row);
}

/* ───────────────────────── 소식 ───────────────────────── */

function noticeFromRow_(r) {
  return {
    _row: r._row,
    id: String(r['ID']),
    title: r['제목'],
    category: r['분류'],
    summary: r['요약'],
    thumb: r['썸네일'],
    attachments: parseJson_(r['첨부'], []),
    urgent: r['긴급'] === 'Y',
    pinned: r['고정'] === 'Y',
    hidden: r['숨김'] === 'Y',
    start: r['게시시작'],
    end: r['게시종료'],
    popup: r['팝업'] === 'Y',
    popupStart: r['팝업시작'],
    popupEnd: r['팝업종료'],
    popupImage: r['팝업이미지'],
    author: r['작성자'],
    createdAt: r['작성일'],
    updatedAt: r['수정일'],
    views: Number(r['조회수'] || 0)
  };
}

function noticeSummary_(n) {
  var o = {};
  for (var k in n) if (k !== '_row') o[k] = n[k];
  o.date = displayDate_(n);
  return o;
}

function noticeDetail_(row) {
  var n = noticeSummary_(noticeFromRow_(row));
  n.body = parseJson_(readBody_(row['본문']), { blocks: [] });
  return n;
}

function saveNotice_(admin, p) {
  var title = String(p.title || '').trim();
  if (!title) throw new UserError('제목을 입력해 주세요.');
  var body = p.body && p.body.blocks ? p.body : { blocks: [] };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var existing = p.id ? findById_(TABS.notice, p.id, '소식') : null;
    var values = {
      '제목': title,
      '분류': String(p.category || '일반'),
      '요약': String(p.summary || summaryOf_(body)).slice(0, 160),
      '썸네일': String(p.thumb || firstImage_(body) || ''),
      '본문': writeBody_(JSON.stringify(body), existing && existing['본문']),
      '첨부': JSON.stringify(p.attachments || []),
      '긴급': p.urgent ? 'Y' : '',
      '고정': p.pinned ? 'Y' : '',
      '숨김': p.hidden ? 'Y' : '',
      '게시시작': normDate_(p.start),
      '게시종료': normDate_(p.end),
      '팝업': p.popup ? 'Y' : '',
      '팝업시작': normDate_(p.popupStart),
      '팝업종료': normDate_(p.popupEnd),
      '팝업이미지': String(p.popupImage || ''),
      '수정일': now_()
    };
    if (existing) {
      updateCells_(TABS.notice, existing._row, values);
      return { id: String(existing['ID']) };
    }
    values['ID'] = String(nextId_(TABS.notice));
    values['작성자'] = admin.name;
    values['작성일'] = now_();
    values['조회수'] = '0';
    appendObj_(TABS.notice, values);
    return { id: values['ID'] };
  } finally {
    uncache_('notices');
    lock.releaseLock();
  }
}

function deleteNotice_(id) {
  var row = findById_(TABS.notice, id, '소식');
  var ref = String(row['본문'] || '');
  if (ref.indexOf('file:') === 0) {
    try { DriveApp.getFileById(ref.slice(5)).setTrashed(true); } catch (e) { /* 이미 지워진 파일 */ }
  }
  var res = deleteRowById_(TABS.notice, id, '소식');
  uncache_('notices');
  return res;
}

/** 본문이 길면(셀 한도 5만 자) 드라이브 파일로 저장하고 셀에는 file:ID만 남긴다. */
function writeBody_(text, oldRef) {
  oldRef = String(oldRef || '');
  var oldFile = oldRef.indexOf('file:') === 0 ? oldRef.slice(5) : '';
  if (text.length < 45000) {
    if (oldFile) { try { DriveApp.getFileById(oldFile).setTrashed(true); } catch (e) { /* 무시 */ } }
    return text;
  }
  if (oldFile) {
    DriveApp.getFileById(oldFile).setContent(text);
    return oldRef;
  }
  var f = folder_('본문').createFile('notice-' + Date.now() + '.json', text, 'application/json');
  return 'file:' + f.getId();
}

function readBody_(ref) {
  ref = String(ref || '');
  if (ref.indexOf('file:') === 0) return DriveApp.getFileById(ref.slice(5)).getBlob().getDataAsString();
  return ref;
}

function summaryOf_(body) {
  var out = '';
  (body.blocks || []).some(function (b) {
    var d = b.data || {};
    var t = d.text || (d.items && d.items.map(function (i) { return typeof i === 'string' ? i : (i.content || ''); }).join(' ')) || '';
    out += ' ' + String(t).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
    return out.length > 160;
  });
  return out.replace(/\s+/g, ' ').trim();
}

function firstImage_(body) {
  var b = (body.blocks || []).filter(function (x) { return x.type === 'image' && x.data && x.data.file; })[0];
  return b ? b.data.file.url : '';
}

/* ───────────────────────── FAQ ───────────────────────── */

function faqList_(includeHidden) {
  var all = cached_('faqs', function () {
    return readRows_(TABS.faq).map(function (r) {
      return {
        id: String(r['ID']), category: r['분류'], question: r['질문'], answer: r['답변'],
        order: Number(r['순서'] || 0), hidden: r['숨김'] === 'Y', updatedAt: r['수정일']
      };
    }).sort(function (a, b) { return a.order - b.order || Number(a.id) - Number(b.id); });
  }, CACHE_SEC.content);
  return all.filter(function (f) { return includeHidden || !f.hidden; });
}

function saveFaq_(p) {
  var q = String(p.question || '').trim();
  if (!q) throw new UserError('질문을 입력해 주세요.');
  var values = {
    '분류': String(p.category || '일반'), '질문': q, '답변': String(p.answer || ''),
    '순서': String(Number(p.order || 0)), '숨김': p.hidden ? 'Y' : '', '수정일': now_()
  };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (p.id) {
      var row = findById_(TABS.faq, p.id, 'FAQ');
      updateCells_(TABS.faq, row._row, values);
      return { id: String(p.id) };
    }
    values['ID'] = String(nextId_(TABS.faq));
    appendObj_(TABS.faq, values);
    return { id: values['ID'] };
  } finally {
    uncache_('faqs');
    lock.releaseLock();
  }
}

/* ───────────────────────── 1:1 문의 ───────────────────────── */

function inquiryFromRow_(r) {
  return {
    id: String(r['ID']), partnerId: r['업체ID'], partnerName: r['업체명'], type: r['유형'],
    title: r['제목'], content: r['내용'], attachments: parseJson_(r['첨부'], []),
    status: r['상태'] || STATUS.open, answer: r['답변'], answeredBy: r['답변자'],
    createdAt: r['작성일'], answeredAt: r['답변일']
  };
}

function inquirySummary_(q) {
  return {
    id: q.id, partnerId: q.partnerId, partnerName: q.partnerName, type: q.type, title: q.title,
    status: q.status, createdAt: q.createdAt, answeredAt: q.answeredAt, files: q.attachments.length
  };
}

/** 업체별 문의 목록. 서버 메모리에 기억해 두고, 새 문의나 답변이 생기면 그 업체 것만 지운다. */
function myInquiries_(me) {
  return cached_('inq:' + me.id, function () {
    return readRows_(TABS.inquiry).filter(function (r) { return normId_(r['업체ID']) === me.id; })
      .map(inquiryFromRow_).map(inquirySummary_).sort(byDateDesc_);
  }, CACHE_SEC.content);
}

function inquiryForPartner_(me, id) {
  var q = inquiryFromRow_(findById_(TABS.inquiry, id, '문의'));
  if (normId_(q.partnerId) !== me.id) throw new UserError('볼 수 없는 문의입니다.');
  return q;
}

function createInquiry_(me, p) {
  var title = String(p.title || '').trim();
  var content = String(p.content || '').trim();
  if (!title || !content) throw new UserError('제목과 내용을 입력해 주세요.');
  var files = (p.files || []).slice(0, 5).map(function (f) {
    var blob = toBlob_(f);
    var file = folder_('첨부').createFile(blob);
    return { id: file.getId(), name: f.name, mime: blob.getContentType(), size: blob.getBytes().length };
  });
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var id = String(nextId_(TABS.inquiry));
    appendObj_(TABS.inquiry, {
      'ID': id, '업체ID': me.id, '업체명': me.name, '유형': String(p.type || '기타'),
      '제목': title.slice(0, 200), '내용': content.slice(0, 20000), '첨부': JSON.stringify(files),
      '상태': STATUS.open, '작성일': now_()
    });
    return { id: id };
  } finally {
    uncache_('inq:' + me.id);
    lock.releaseLock();
  }
}

function answerInquiry_(admin, p) {
  var row = findById_(TABS.inquiry, p.id, '문의');
  var status = [STATUS.open, STATUS.doing, STATUS.done].indexOf(p.status) >= 0 ? p.status : STATUS.done;
  var values = { '상태': status, '답변': String(p.answer || '') };
  if (String(p.answer || '').trim()) {
    values['답변자'] = admin.name;
    values['답변일'] = now_();
  }
  updateCells_(TABS.inquiry, row._row, values);
  uncache_('inq:' + normId_(row['업체ID']));
  return { id: String(p.id) };
}

/** 문의 첨부는 공개 링크 없이, 권한을 확인한 뒤 이 API로만 내려준다. */
function downloadFile_(token, inquiryId, fileId) {
  var s = verify_(token);
  if (!s) throw new UserError('다시 로그인해 주세요.', 'AUTH');
  var q = inquiryFromRow_(findById_(TABS.inquiry, inquiryId, '문의'));
  if (s.r === 'p') {
    var me = needPartner_(token);
    if (normId_(q.partnerId) !== me.id) throw new UserError('볼 수 없는 파일입니다.');
  } else {
    needAdmin_(token);
  }
  var meta = q.attachments.filter(function (a) { return a.id === fileId; })[0];
  if (!meta) throw new UserError('파일을 찾을 수 없습니다.');
  var blob = DriveApp.getFileById(fileId).getBlob();
  return { name: meta.name, mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}

/* ───────────────────────── 파일 업로드 ───────────────────────── */

/** 소식 이미지·첨부: "링크가 있는 모든 사용자 보기"로 저장한다. */
function uploadPublic_(p) {
  var blob = toBlob_(p);
  var file = folder_('이미지').createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var id = file.getId();
  return {
    id: id,
    name: p.name,
    size: blob.getBytes().length,
    mime: blob.getContentType(),
    url: 'https://lh3.googleusercontent.com/d/' + id,
    download: 'https://drive.google.com/uc?export=download&id=' + id
  };
}

function toBlob_(f) {
  if (!f || !f.data) throw new UserError('파일이 비어 있습니다.');
  var bytes = Utilities.base64Decode(String(f.data).replace(/^data:[^,]*,/, ''));
  if (bytes.length > MAX_FILE_MB * 1024 * 1024) throw new UserError('파일은 ' + MAX_FILE_MB + 'MB 이하만 올릴 수 있습니다.');
  var name = String(f.name || 'file').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
  return Utilities.newBlob(bytes, f.mime || 'application/octet-stream', name);
}

function folder_(name) {
  var key = 'FOLDER_' + name;
  var id = prop_(key, true);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* 지워졌으면 다시 만든다 */ }
  }
  var parent = DriveApp.getFileById(SpreadsheetApp.getActive().getId()).getParents();
  var root = parent.hasNext() ? parent.next() : DriveApp.getRootFolder();
  var it = root.getFoldersByName(name);
  var f = it.hasNext() ? it.next() : root.createFolder(name);
  PropertiesService.getScriptProperties().setProperty(key, f.getId());
  if (PROPS_) PROPS_[key] = f.getId();
  return f;
}

/* ───────────────────────── 관리자 ───────────────────────── */

function adminDashboard_() {
  var t = now_();
  var notices = allNotices_();
  var live = notices.filter(function (n) { return isLive_(n, t); });
  var inquiries = readRows_(TABS.inquiry).map(inquiryFromRow_);
  var pmap = partnerMap_();
  var partners = Object.keys(pmap).map(function (id) { return { issued: !!pmap[id]['해시'] }; });
  return {
    counts: {
      openInquiries: inquiries.filter(function (q) { return q.status !== STATUS.done; }).length,
      liveNotices: live.length,
      livePopups: live.filter(function (n) { return n.popup && (!n.popupStart || n.popupStart <= t) && (!n.popupEnd || n.popupEnd >= t); }).length,
      scheduled: notices.filter(function (n) { return !n.hidden && n.start && n.start > t; }).length,
      partners: partners.length,
      issued: partners.filter(function (x) { return x.issued; }).length
    },
    recentInquiries: inquiries.map(inquirySummary_).sort(byDateDesc_).slice(0, 8)
  };
}

function partnerList_() {
  return readRows_(TABS.partner).filter(function (r) { return normId_(r['업체ID']); }).map(function (r) {
    return {
      id: normId_(r['업체ID']), name: r['업체명'], type: r['구분'], category: r['카테고리'],
      active: r['사용'] !== 'N', issued: !!r['해시'], issuedAt: r['발급일'], lastLogin: r['마지막접속']
    };
  });
}

function savePartner_(p) {
  var id = normId_(p.id);
  if (!/^[A-Z0-9_-]{2,20}$/.test(id)) throw new UserError('업체ID는 영문·숫자로 입력해 주세요. (예: G001, M023)');
  var name = String(p.name || '').trim();
  if (!name) throw new UserError('업체명을 입력해 주세요.');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var row = findPartnerRow_(id);
    var values = { '업체명': name, '구분': String(p.type || ''), '카테고리': String(p.category || '') };
    if (row) updateCells_(TABS.partner, row._row, values);
    else { values['업체ID'] = id; values['사용'] = 'Y'; appendObj_(TABS.partner, values); }
    invalidatePartners_();
    return { id: id };
  } finally {
    lock.releaseLock();
  }
}

function setPartnerActive_(id, active) {
  var row = findPartnerRow_(normId_(id));
  if (!row) throw new UserError('없는 업체ID입니다.');
  updateCells_(TABS.partner, row._row, { '사용': active ? 'Y' : 'N' });
  invalidatePartners_();
  return { id: normId_(id), active: !!active };
}

/** 접속코드를 새로 만들어 해시만 저장하고, 만든 코드는 이번 한 번만 돌려준다. */
function issueCodes_(ids) {
  if (!ids.length) throw new UserError('발급할 업체를 선택해 주세요.');
  if (ids.length > 400) throw new UserError('한 번에 400곳까지만 발급할 수 있습니다.');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = sheet_(TABS.partner);
    var data = sh.getDataRange().getValues();
    var head = data[0];
    var cId = head.indexOf('업체ID'), cHash = head.indexOf('해시'), cDate = head.indexOf('발급일'), cName = head.indexOf('업체명');
    var want = {};
    ids.forEach(function (x) { want[normId_(x)] = true; });
    var out = [];
    var t = now_();
    for (var i = 1; i < data.length; i++) {
      var id = normId_(data[i][cId]);
      if (!want[id]) continue;
      var code = newCode_();
      data[i][cHash] = hash_('p|' + id + '|' + code);
      data[i][cDate] = t;
      out.push({ id: id, name: data[i][cName], code: code });
      delete want[id];
    }
    sh.getRange(1, 1, data.length, head.length).setValues(data);
    invalidatePartners_();
    return { issued: out, missing: Object.keys(want) };
  } finally {
    lock.releaseLock();
  }
}

/* ───────────────────────── 시트 도우미 ───────────────────────── */

function sheet_(name) {
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new UserError('[' + name + '] 탭이 없습니다. 시트 메뉴 [나우다 포털 → 처음 설정]을 먼저 실행해 주세요.');
  return sh;
}

function readRows_(name) {
  return readTable_(name).rows;
}

/** 시트 전체를 한 번 읽어 머리글과 행을 함께 돌려준다. */
function readTable_(name) {
  var sh = sheet_(name);
  var data = sh.getDataRange().getValues();
  var head = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var empty = true;
    var o = { _row: i + 1 };
    for (var j = 0; j < head.length; j++) {
      var v = data[i][j];
      if (v instanceof Date) v = Utilities.formatDate(v, TZ, 'yyyy-MM-dd HH:mm');
      v = v === null || v === undefined ? '' : String(v);
      if (v !== '') empty = false;
      o[head[j]] = v;
    }
    if (!empty) rows.push(o);
  }
  return { sheet: sh, head: head, rows: rows };
}

/** 칸 하나만 쓴다(readTable_로 읽은 머리글 사용). */
function setCell_(table, rowNum, col, value) {
  var j = table.head.indexOf(col);
  if (j >= 0) table.sheet.getRange(rowNum, j + 1).setValue(value);
}

function findById_(name, id, label) {
  var key = name === TABS.partner ? '업체ID' : 'ID';
  var row = readRows_(name).filter(function (r) { return String(r[key]) === String(id); })[0];
  if (!row) throw new UserError((label || '자료') + '를 찾을 수 없습니다.');
  return row;
}

function deleteRowById_(name, id, label) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var row = findById_(name, id, label);
    sheet_(name).deleteRow(row._row);
    return { id: String(id) };
  } finally {
    lock.releaseLock();
  }
}

function appendObj_(name, obj) {
  var sh = sheet_(name);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var row = head.map(function (h) { return obj[h] === undefined ? '' : obj[h]; });
  var r = sh.getLastRow() + 1;
  var range = sh.getRange(r, 1, 1, head.length);
  range.setNumberFormat('@');
  range.setValues([row]);
}

function updateCells_(name, rowNum, obj) {
  var sh = sheet_(name);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var range = sh.getRange(rowNum, 1, 1, head.length);
  var vals = range.getValues()[0];
  head.forEach(function (h, j) { if (obj[h] !== undefined) vals[j] = obj[h]; });
  range.setNumberFormat('@');
  range.setValues([vals]);
}

function nextId_(name) {
  var max = 0;
  readRows_(name).forEach(function (r) { max = Math.max(max, Number(r['ID']) || 0); });
  return max + 1;
}

function findPartnerRow_(id) {
  return readRows_(TABS.partner).filter(function (r) { return normId_(r['업체ID']) === id; })[0] || null;
}

/** 업체 목록(로그인·권한 확인용)과 업체 탭 머리글. 서버 메모리에 기억해 둔다. */
function partnerIndex_() {
  return cached_('partners', function () {
    var t = readTable_(TABS.partner);
    var map = {};
    t.rows.forEach(function (r) {
      var id = normId_(r['업체ID']);
      if (id) map[id] = { '업체명': r['업체명'], '사용': r['사용'], '해시': r['해시'], _row: r._row };
    });
    return { head: t.head, map: map };
  }, CACHE_SEC.account);
}

function partnerMap_() {
  return partnerIndex_().map;
}

function invalidatePartners_() {
  uncache_('partners');
}

/** 로그인한 업체의 마지막접속 칸만 쓴다. 기억해 둔 행 번호가 맞는지 먼저 확인한다. */
function touchPartner_(idx, id) {
  try {
    var sh = sheet_(TABS.partner);
    var cId = idx.head.indexOf('업체ID'), cLast = idx.head.indexOf('마지막접속');
    if (cId < 0 || cLast < 0) return;
    var r = idx.map[id]._row;
    if (normId_(sh.getRange(r, cId + 1).getValue()) !== id) {
      invalidatePartners_(); // 시트에서 행을 옮기거나 지운 경우
      var row = findPartnerRow_(id);
      if (!row) return;
      r = row._row;
    }
    sh.getRange(r, cLast + 1).setValue(now_());
  } catch (e) { /* 마지막접속 기록 실패는 로그인에 영향 주지 않음 */ }
}

/** 관리자 목록. 서버 메모리에 기억해 두고, 시트 메뉴에서 관리자를 바꾸면 지운다. */
function adminMap_() {
  return cached_('admins', function () {
    var map = {};
    readRows_(TABS.admin).forEach(function (r) {
      var id = String(r['아이디']).trim();
      if (id) map[id] = { '이름': r['이름'], '사용': r['사용'], '해시': r['해시'] };
    });
    return map;
  }, CACHE_SEC.account);
}

/**
 * 서버 메모리(CacheService)에 JSON으로 기억한다. 값 하나의 한도(100KB)를 넘지 않도록 나눠 저장한다.
 * 기억이 없거나 깨졌으면 build()로 다시 만든다.
 */
var CACHE_PART = 30000; // 글자 수(한글 3바이트 기준 약 90KB)

function cached_(key, build, seconds) {
  var c = CacheService.getScriptCache();
  try {
    var got = c.getAll([key + ':n', key + ':0']);
    var n = Number(got[key + ':n'] || 0);
    if (n && got[key + ':0'] != null) {
      var text = got[key + ':0'];
      if (n > 1) {
        var keys = [];
        for (var i = 1; i < n; i++) keys.push(key + ':' + i);
        var more = c.getAll(keys);
        for (var j = 0; j < keys.length && text !== null; j++) text = more[keys[j]] == null ? null : text + more[keys[j]];
      }
      if (text !== null) return JSON.parse(text);
    }
  } catch (e) { /* 기억이 깨졌으면 다시 만든다 */ }
  var value = build();
  try {
    var s = JSON.stringify(value), parts = {}, k = 0;
    for (var p = 0; p < s.length; p += CACHE_PART) parts[key + ':' + (k++)] = s.slice(p, p + CACHE_PART);
    if (k <= 30) {
      parts[key + ':n'] = String(k);
      c.putAll(parts, seconds);
    }
  } catch (e) { /* 한도를 넘으면 기억하지 않고 매번 시트에서 읽는다 */ }
  return value;
}

function uncache_(key) {
  CacheService.getScriptCache().remove(key + ':n');
}

function log_(kind, id, result) {
  try {
    sheet_(TABS.log).appendRow([now_(), kind, id, result]); // 시각·구분·아이디·결과 순서
  } catch (e) { /* 기록 실패는 로그인에 영향 주지 않음 */ }
}

// 스크립트 속성은 한 번 실행하는 동안 한 번만 읽는다.
var PROPS_ = null;

function prop_(key, optional) {
  if (!PROPS_) PROPS_ = PropertiesService.getScriptProperties().getProperties();
  var v = PROPS_[key];
  if (!v && !optional) throw new UserError('초기 설정이 끝나지 않았습니다. 시트 메뉴 [나우다 포털 → 처음 설정]을 실행해 주세요.');
  return v;
}

function now_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
}

function normDate_(v) {
  v = String(v || '').trim().replace('T', ' ');
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v + ' 00:00';
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v)) throw new UserError('날짜 형식이 올바르지 않습니다: ' + v);
  return v;
}

function parseJson_(text, fallback) {
  try { return text ? JSON.parse(text) : fallback; } catch (e) { return fallback; }
}

function byDateDesc_(a, b) {
  var x = a.date || a.createdAt || '', y = b.date || b.createdAt || '';
  return x < y ? 1 : x > y ? -1 : Number(b.id) - Number(a.id);
}

/* ───────────────────────── 시트 메뉴 (관리용) ───────────────────────── */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('나우다 포털')
    .addItem('처음 설정 (탭·비밀값 만들기)', 'setup')
    .addSeparator()
    .addItem('관리자 추가 / 비밀번호 바꾸기', 'setAdmin')
    .addItem('접속코드 발급 (선택한 업체 행)', 'issueSelected')
    .addSeparator()
    .addItem('실적 시트 연결', 'connectStats')
    .addToUi();
}

/** 실적 시트 주소(또는 ID)를 받아 [실적] 탭을 확인한 뒤 스크립트 속성에 저장한다. 비워 두면 연결을 끊는다. */
function connectStats() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();
  var cur = props.getProperty('STATS_SHEET_ID') || '';
  var r = ui.prompt('실적 시트 연결',
    (cur ? '지금 연결: ' + cur + '\n\n' : '') +
    '실적 웹앱이 쓰는 구글 시트의 주소를 붙여 넣으세요.\n(docs.google.com/spreadsheets/d/… 주소. 비워 두고 확인을 누르면 연결을 끊습니다)',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var text = r.getResponseText().trim();
  if (!text) {
    props.deleteProperty('STATS_SHEET_ID');
    uncache_('statsVer');
    return ui.alert('실적 시트 연결을 끊었습니다. 제휴사 화면의 실적 메뉴에는 "준비 중"이 보입니다.');
  }
  var m = text.match(/\/d\/([A-Za-z0-9_-]{20,})/) || text.match(/^([A-Za-z0-9_-]{20,})$/);
  if (!m) return ui.alert('시트 주소를 알아보지 못했습니다. 주소 전체를 붙여 넣어 주세요.');
  var id = m[1];
  if (id === SpreadsheetApp.getActive().getId()) return ui.alert('이 포털 시트가 아니라 실적 시트의 주소를 넣어 주세요.');
  var ss, sh;
  try {
    ss = SpreadsheetApp.openById(id);
    sh = ss.getSheetByName(STATS_TAB);
  } catch (e) {
    return ui.alert('그 시트를 열 수 없습니다. 이 계정으로 열 수 있는 시트인지 확인해 주세요.');
  }
  if (!sh) return ui.alert('[' + STATS_TAB + '] 탭이 없는 시트입니다: ' + ss.getName());
  var head = sh.getRange(1, 1, 1, 6).getValues()[0].map(String);
  if (head[0] !== '업체ID' || head[5] !== '데이터') return ui.alert('[' + STATS_TAB + '] 탭의 머리글이 예상과 다릅니다(A열 업체ID, F열 데이터).\n지금 머리글: ' + head.join(', '));
  props.setProperty('STATS_SHEET_ID', id);
  uncache_('statsVer');
  ui.alert('실적 시트를 연결했습니다.\n\n' + ss.getName() + '\n업체 ' + Math.max(sh.getLastRow() - 1, 0) + '곳\n\nCSV는 지금처럼 이 실적 시트에만 올리면 1분 안에 포털에도 반영됩니다.');
}

function setup() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);
  Object.keys(HEADERS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var head = HEADERS[name];
    var cur = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    head.forEach(function (h) { if (cur.indexOf(h) < 0) cur.push(h); });
    cur = cur.filter(function (h) { return h !== ''; });
    sh.getRange(1, 1, 1, cur.length).setValues([cur]).setFontWeight('bold').setBackground('#eef2ff');
    sh.getRange(1, 1, sh.getMaxRows(), cur.length).setNumberFormat('@');
    sh.setFrozenRows(1);
  });
  var first = ss.getSheets()[0];
  if (first.getName().match(/^(Sheet1|시트1)$/) && first.getLastRow() === 0) ss.deleteSheet(first);

  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SECRET')) props.setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid());
  if (!props.getProperty('SALT')) props.setProperty('SALT', Utilities.getUuid());
  PROPS_ = null;
  ['이미지', '첨부', '본문'].forEach(function (name) { folder_(name); });

  SpreadsheetApp.getUi().alert(
    '설정을 마쳤습니다.\n\n' +
    '1) [업체] 탭: 업체ID·업체명·구분·카테고리를 붙여 넣고, 사용 열에는 Y를 넣어 주세요.\n' +
    '2) 메뉴 [나우다 포털 → 관리자 추가]로 관리자 계정을 만드세요.\n' +
    '3) 접속코드는 관리자 화면의 [제휴사 관리]에서 한 번에 발급하는 것이 편합니다.'
  );
}

function setAdmin() {
  var ui = SpreadsheetApp.getUi();
  var r1 = ui.prompt('관리자 아이디', '영문·숫자 (예: nowda1)', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var id = r1.getResponseText().trim();
  if (!/^[A-Za-z0-9_.-]{3,30}$/.test(id)) return ui.alert('아이디는 영문·숫자 3자 이상으로 입력해 주세요.');
  var r2 = ui.prompt('관리자 이름', '답변자·작성자로 표시됩니다 (예: 나우다 운영팀)', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var r3 = ui.prompt('비밀번호', '10자 이상. 입력한 글자가 화면에 보이니 주변을 확인하세요.', ui.ButtonSet.OK_CANCEL);
  if (r3.getSelectedButton() !== ui.Button.OK) return;
  var pw = r3.getResponseText();
  if (pw.length < 10) return ui.alert('비밀번호는 10자 이상이어야 합니다.');
  var row = readRows_(TABS.admin).filter(function (r) { return String(r['아이디']).trim() === id; })[0];
  var values = { '이름': r2.getResponseText().trim() || id, '해시': hash_('a|' + id + '|' + pw), '사용': 'Y' };
  if (row) updateCells_(TABS.admin, row._row, values);
  else { values['아이디'] = id; appendObj_(TABS.admin, values); }
  uncache_('admins');
  ui.alert(id + ' 관리자 계정을 저장했습니다.');
}

function issueSelected() {
  var ui = SpreadsheetApp.getUi();
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== TABS.partner) return ui.alert('[업체] 탭에서 업체 행을 선택한 뒤 눌러 주세요.');
  var range = sh.getActiveRange();
  var ids = sh.getRange(range.getRow(), 1, range.getNumRows(), 1).getValues()
    .map(function (r) { return normId_(r[0]); }).filter(function (x) { return x && x !== '업체ID'; });
  if (!ids.length) return ui.alert('업체 행을 선택해 주세요.');
  if (ui.alert(ids.length + '곳의 접속코드를 새로 발급할까요?\n이미 발급된 업체는 기존 코드로 더 이상 접속할 수 없습니다.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var res = issueCodes_(ids);
  var text = res.issued.map(function (x) { return x.id + '\t' + x.name + '\t' + x.code; }).join('\n');
  ui.alert('발급한 접속코드 (이 창을 닫으면 다시 볼 수 없습니다)\n\n' + text);
}
