// 화면 연결(라우터)
import { html, render, useState, useEffect, currentPath, match, getSession, go, CONFIG } from './lib.js?v=202611210712';
import { Toaster } from './ui.js?v=202611210712';
import * as P from './partner.js?v=202611210712';
import { Stats } from './stats.js?v=202611210712';
import { Guide } from './guide.js?v=202611210712';

// 관리자 화면 코드는 관리자 주소로 들어왔을 때만 내려받는다.
let A = null;

const PARTNER_ROUTES = [
  ['/', () => html`<${P.Home} />`],
  ['/guide', () => html`<${Guide} />`],
  ['/notices', () => html`<${P.Notices} />`],
  ['/notices/:id', (p) => html`<${P.NoticeDetail} id=${p.id} />`],
  ['/stats', () => html`<${Stats} />`],
  ['/faq', () => html`<${P.Faq} />`],
  ['/inquiries', () => html`<${P.Inquiries} />`],
  ['/inquiries/new', () => html`<${P.InquiryNew} />`],
  ['/inquiries/:id', (p) => html`<${P.InquiryDetail} id=${p.id} />`],
];

const ADMIN_ROUTES = [
  ['/admin', () => html`<${A.Dashboard} />`],
  ['/admin/notices', () => html`<${A.AdminNotices} />`],
  ['/admin/notices/new', () => html`<${A.NoticeEdit} />`],
  ['/admin/notices/:id', (p) => html`<${A.NoticeEdit} id=${p.id} />`],
  ['/admin/faq', () => html`<${A.AdminFaq} />`],
  ['/admin/inquiries', () => html`<${A.AdminInquiries} />`],
  ['/admin/inquiries/:id', (p) => html`<${A.AdminInquiryDetail} id=${p.id} />`],
  ['/admin/partners', () => html`<${A.AdminPartners} />`],
  ['/admin/instagram', () => html`<${A.AdminInstagram} />`],
];

function find(routes, path) {
  for (const [pattern, view] of routes) {
    const params = match(pattern, path);
    if (params) return view(params);
  }
  return null;
}

function NotFound({ home }) {
  return html`<div class="empty"><p>없는 페이지입니다.</p><a class="btn" href=${'#' + home}>처음으로</a></div>`;
}

function App() {
  // 주소(#...)가 바뀔 때마다 다시 그린다. 경로는 매번 주소에서 직접 읽는다.
  const [, setTick] = useState(0);
  useEffect(() => {
    const on = () => { setTick((x) => x + 1); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  // 로그인 여부에 따른 이동은 그리는 도중에 바로 처리한다(이벤트를 기다리지 않음).
  let path = currentPath();
  const redirect = (to) => { history.replaceState(null, '', '#' + to); path = to; };
  if (path.startsWith('/admin')) {
    const s = getSession('a');
    if (!s && path !== '/admin/login') redirect('/admin/login');
    else if (s && path === '/admin/login') redirect('/admin');
  } else {
    const s = getSession('p');
    if (!s && path !== '/login') redirect('/login');
    else if (s && path === '/login') redirect('/');
  }

  useEffect(() => { document.title = path.startsWith('/admin') ? '관리자 · ' + CONFIG.SITE_NAME : CONFIG.SITE_NAME; }, [path]);

  const needAdmin = path.startsWith('/admin') && !A;
  const [loadErr, setLoadErr] = useState(false);
  useEffect(() => {
    if (!needAdmin) return;
    import('./admin.js?v=202611210712').then((m) => { A = m; setTick((x) => x + 1); }, () => setLoadErr(true));
  }, [needAdmin]);
  if (needAdmin) return html`<div class="boot">${loadErr ? '화면을 불러오지 못했습니다. 새로고침해 주세요.' : '불러오는 중…'}</div>`;

  let view;
  if (path === '/admin/login') view = html`<${A.AdminLogin} />`;
  else if (path === '/login') view = html`<${P.PartnerLogin} />`;
  else if (path.startsWith('/admin')) view = html`<${A.AdminShell} path=${path}>${find(ADMIN_ROUTES, path) || html`<${NotFound} home="/admin" />`}</${A.AdminShell}>`;
  else view = html`<${P.PartnerShell} path=${path}>${find(PARTNER_ROUTES, path) || html`<${NotFound} home="/" />`}</${P.PartnerShell}>`;
  return html`${view}<${Toaster} />`;
}

render(html`<${App} />`, document.getElementById('app'));
