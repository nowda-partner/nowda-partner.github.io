// 화면 연결(라우터)
import { html, render, useState, useEffect, currentPath, match, getSession, go, CONFIG } from './lib.js';
import { Toaster } from './ui.js';
import * as P from './partner.js';
import * as A from './admin.js';

const PARTNER_ROUTES = [
  ['/', () => html`<${P.Home} />`],
  ['/notices', () => html`<${P.Notices} />`],
  ['/notices/:id', (p) => html`<${P.NoticeDetail} id=${p.id} />`],
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
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const on = () => { setPath(currentPath()); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  useEffect(() => { document.title = path.startsWith('/admin') ? '관리자 · ' + CONFIG.SITE_NAME : CONFIG.SITE_NAME; }, [path]);

  let view;
  if (path === '/admin/login') view = html`<${A.AdminLogin} />`;
  else if (path === '/login') view = html`<${P.PartnerLogin} />`;
  else if (path.startsWith('/admin')) {
    if (!getSession('a')) { go('/admin/login'); return null; }
    view = html`<${A.AdminShell} path=${path}>${find(ADMIN_ROUTES, path) || html`<${NotFound} home="/admin" />`}</${A.AdminShell}>`;
  } else {
    if (!getSession('p')) { go('/login'); return null; }
    view = html`<${P.PartnerShell} path=${path}>${find(PARTNER_ROUTES, path) || html`<${NotFound} home="/" />`}</${P.PartnerShell}>`;
  }
  return html`${view}<${Toaster} />`;
}

render(html`<${App} />`, document.getElementById('app'));
