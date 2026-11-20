// 공통 도구: 화면 라이브러리, 세션, API 호출, 날짜·파일 도우미
export { html, render, useState, useEffect, useRef, useMemo, useCallback } from 'https://cdn.jsdelivr.net/npm/htm@3.1.1/preact/standalone.module.js';
import { CONFIG } from '../config.js?v=202611210716';

export { CONFIG };
export const IS_MOCK = !CONFIG.API_URL;

/* ── 세션 ─────────────────────────────────────── */
const KEY = { p: 'np_partner', a: 'np_admin' };

export function getSession(role) {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(KEY[role]);
      if (!raw) continue;
      const s = JSON.parse(raw);
      if (s.exp > Date.now()) return s;
      store.removeItem(KEY[role]);
    } catch { /* 저장소 사용 불가 */ }
  }
  return null;
}

export function setSession(role, data, keep) {
  const s = { ...data, exp: Date.now() + 12 * 3600e3 };
  clearSession(role);
  try { (keep ? localStorage : sessionStorage).setItem(KEY[role], JSON.stringify(s)); } catch { /* 무시 */ }
  return s;
}

export function clearSession(role) {
  try { sessionStorage.removeItem(KEY[role]); localStorage.removeItem(KEY[role]); } catch { /* 무시 */ }
  memo.clear();
  clearStash(role);
}

/* ── 받아 둔 결과 보관 ─────────────────────────
   마지막으로 받은 화면 내용을 로그인 정보와 같은 저장소에 보관해 두었다가,
   다시 들어오면 먼저 보여 주고 최신 내용은 뒤에서 받는다. 로그아웃하면 지운다. */
const STASH_KEY = { p: 'np_cache_partner', a: 'np_cache_admin' };
const STASH_MAX = 40; // 보관할 화면 수(오래된 것부터 버림)

function sessionStore(role) {
  for (const store of [sessionStorage, localStorage]) {
    try { if (store.getItem(KEY[role])) return store; } catch { /* 저장소 사용 불가 */ }
  }
  return null;
}

function readStash(role) {
  try {
    const store = sessionStore(role);
    return store ? JSON.parse(store.getItem(STASH_KEY[role]) || '{}') : {};
  } catch { return {}; }
}

function writeStash(role, key, v) {
  const store = sessionStore(role);
  if (!store) return;
  const all = readStash(role);
  all[key] = { t: Date.now(), v };
  Object.keys(all).sort((a, b) => all[b].t - all[a].t).slice(STASH_MAX).forEach((k) => delete all[k]);
  try { store.setItem(STASH_KEY[role], JSON.stringify(all)); } catch { try { store.removeItem(STASH_KEY[role]); } catch { /* 무시 */ } }
}

function clearStash(role) {
  try { sessionStorage.removeItem(STASH_KEY[role]); localStorage.removeItem(STASH_KEY[role]); } catch { /* 무시 */ }
}

/* ── API ──────────────────────────────────────── */
let mockModule = null;

async function send(action, payload, token) {
  if (IS_MOCK) {
    mockModule ||= await import('./mock.js?v=202611210716');
    return mockModule.handle(action, payload, token);
  }
  let res;
  try {
    res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload, token }),
      redirect: 'follow',
    });
  } catch {
    return { ok: false, error: '서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.' };
  }
  try { return await res.json(); } catch { return { ok: false, error: '서버 응답을 읽지 못했습니다.' }; }
}

// 요청 결과를 기억해 같은 화면을 다시 열 때 빠르게 보여 줌
const memo = new Map();

// 읽기만 하는 요청. 이 밖의 요청(저장·수정·삭제·로그인)이 성공하면 기억한 결과를 모두 지운다.
const READS = new Set([
  'home', 'notices', 'notice', 'faqs', 'myInquiries', 'inquiry', 'myStats', 'myBenefit', 'file', 'uploadImage', 'uploadNoticeFile',
  'adminDashboard', 'adminNotices', 'adminNotice', 'adminFaqs', 'adminInquiries', 'adminInquiry', 'adminPartners',
  'adminInstagram',
]);
// 결과를 보관해 두었다가 다시 들어올 때 먼저 보여 줄 요청
const STASHED = new Set([
  'home', 'notices', 'notice', 'faqs', 'myInquiries', 'inquiry', 'myStats', 'myBenefit',
  'adminDashboard', 'adminNotices', 'adminFaqs', 'adminInquiries', 'adminPartners', 'adminInstagram',
]);

const keyOf = (role, action, payload) => role + ':' + action + ':' + JSON.stringify(payload);

/** 기억하거나 보관해 둔 결과(오래됐을 수 있음). 없으면 undefined */
export function peek(role, action, payload = {}) {
  const key = keyOf(role, action, payload);
  return memo.has(key) ? memo.get(key).v : readStash(role)[key]?.v;
}

/** 서버가 미리 보내 준 결과를 기억해 둔다(예: 로그인 응답에 담긴 홈 내용). */
export function seed(role, action, payload, data) {
  const key = keyOf(role, action, payload);
  memo.set(key, { t: Date.now(), v: data });
  writeStash(role, key, data);
}

/** 로그인 화면이 열리면 서버를 미리 깨운다(오래 쉬었다가 처음 요청하면 느리기 때문). */
let warmed = false;
export function warmUp() {
  if (IS_MOCK || warmed) return;
  warmed = true;
  fetch(CONFIG.API_URL, { mode: 'no-cors' }).catch(() => { warmed = false; });
}

export async function api(role, action, payload = {}, opts = {}) {
  const key = keyOf(role, action, payload);
  if (opts.cache && memo.has(key) && Date.now() - memo.get(key).t < opts.cache) return memo.get(key).v;
  const s = role ? getSession(role) : null;
  const res = await send(action, payload, s?.token || '');
  if (!res.ok) {
    if (res.code === 'AUTH' && role) {
      clearSession(role);
      location.hash = role === 'a' ? '#/admin/login' : '#/login';
    }
    throw new Error(res.error || '요청을 처리하지 못했습니다.');
  }
  if (!READS.has(action)) {
    memo.clear(); // 저장·수정 뒤에는 기억한 결과를 비움
    clearStash('p');
    clearStash('a');
  } else if (role && STASHED.has(action)) {
    memo.set(key, { t: Date.now(), v: res.data });
    writeStash(role, key, res.data);
  }
  return res.data;
}

/* ── 라우터 ───────────────────────────────────── */
export function currentPath() {
  return (location.hash.replace(/^#/, '') || '/').split('?')[0];
}

export function go(path) {
  location.hash = '#' + path;
}

export function match(pattern, path) {
  const a = pattern.split('/'), b = path.split('/');
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

/* ── 날짜 ─────────────────────────────────────── */
export function nowStr() {
  const d = new Date(Date.now() + 9 * 3600e3); // 한국 시간
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

export function fmtDate(s, withTime) {
  if (!s) return '';
  return withTime ? s.replace(/-/g, '.') : s.slice(0, 10).replace(/-/g, '.');
}

export function isNew(s) {
  if (!s) return false;
  const t = new Date(s.replace(' ', 'T') + ':00+09:00').getTime();
  return Date.now() - t < CONFIG.NEW_DAYS * 86400e3;
}

export function toInputDate(s) {
  return s ? s.replace(' ', 'T') : '';
}

/* ── 이미지·파일 ──────────────────────────────── */
export function imageUrl(url, width) {
  if (!url) return '';
  if (url.startsWith('https://lh3.googleusercontent.com/d/')) return url.replace(/=w\d+$/, '') + '=w' + width;
  return url;
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    r.readAsDataURL(file);
  });
}

/** 큰 사진은 올리기 전에 줄여서 용량을 아낀다(긴 변 1920px, JPEG/WebP). GIF·SVG는 그대로. */
export async function compressImage(file, maxSide = 1920) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { name: file.name, mime: file.type, data: await fileToBase64(file) };
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return { name: file.name, mime: file.type, data: await fileToBase64(file) };
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 600 * 1024) return { name: file.name, mime: file.type, data: await fileToBase64(file) };
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const keepAlpha = file.type === 'image/png';
  const mime = keepAlpha ? 'image/webp' : 'image/jpeg';
  const dataUrl = c.toDataURL(mime, 0.85);
  const ext = keepAlpha ? '.webp' : '.jpg';
  return { name: file.name.replace(/\.[^.]+$/, '') + ext, mime, data: dataUrl.split(',')[1] };
}

export function fmtSize(n) {
  if (!n) return '';
  return n > 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB';
}

export function downloadBase64(name, mime, data) {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ── 기타 ─────────────────────────────────────── */
export function cls(...xs) {
  return xs.filter(Boolean).join(' ');
}

export function storeGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
}

export function storeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 무시 */ }
}
