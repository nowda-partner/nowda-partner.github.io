// 편집기(Editor.js)로 쓴 본문을 안전한 HTML로 바꾼다.
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.4.18/dist/purify.es.mjs';
import { imageUrl } from './lib.js?v=202611200015';

const INLINE = { ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'a', 'mark', 'code', 'br', 's'], ALLOWED_ATTR: ['href', 'class'] };

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function escapeHtml(s) {
  return esc(s);
}

/** 인라인 서식만 남기고, 글 속의 주소(URL)는 누를 수 있는 링크로 바꾼다. */
export function inline(text) {
  const clean = DOMPurify.sanitize(String(text ?? ''), INLINE);
  const tpl = document.createElement('template');
  tpl.innerHTML = clean;
  linkify(tpl.content);
  return tpl.innerHTML;
}

const URL_RE = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g;

function linkify(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets = [];
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (n.parentElement?.closest('a')) continue;
    URL_RE.lastIndex = 0;
    if (URL_RE.test(n.nodeValue)) targets.push(n);
  }
  for (const n of targets) {
    const frag = document.createDocumentFragment();
    let last = 0;
    n.nodeValue.replace(URL_RE, (m, idx) => {
      frag.append(n.nodeValue.slice(last, idx));
      const a = document.createElement('a');
      a.href = m;
      a.textContent = m;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      frag.append(a);
      last = idx + m.length;
      return m;
    });
    frag.append(n.nodeValue.slice(last));
    n.replaceWith(frag);
  }
}

/** 일반 텍스트(문의 내용, FAQ 답변 등): 줄바꿈 유지 + 링크 */
export function plain(text) {
  return inline(esc(text).replace(/\n/g, '<br>'));
}

function youtubeId(url) {
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function videoFrame(id) {
  return `<div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}" title="동영상" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
}

function listItems(items, style) {
  return (items || []).map((it) => {
    const content = typeof it === 'string' ? it : it.content;
    const nested = it.items?.length ? renderList(it.items, style) : '';
    if (style === 'checklist') {
      const checked = it.meta?.checked;
      return `<li class="check ${checked ? 'on' : ''}"><span class="box">${checked ? '✓' : ''}</span><span>${inline(content)}</span>${nested}</li>`;
    }
    return `<li>${inline(content)}${nested}</li>`;
  }).join('');
}

function renderList(items, style) {
  const tag = style === 'ordered' ? 'ol' : 'ul';
  return `<${tag} class="${style === 'checklist' ? 'checklist' : ''}">${listItems(items, style)}</${tag}>`;
}

export function renderBlocks(body) {
  const blocks = body?.blocks || [];
  return blocks.map((b) => {
    const d = b.data || {};
    switch (b.type) {
      case 'paragraph': {
        const textOnly = String(d.text || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        const yt = /^https?:\/\/\S+$/.test(textOnly) && youtubeId(textOnly);
        if (yt) return videoFrame(yt);
        return d.text ? `<p>${inline(d.text)}</p>` : '<p class="blank"></p>';
      }
      case 'header': {
        const lv = Math.min(4, Math.max(2, Number(d.level) || 2));
        return `<h${lv}>${inline(d.text)}</h${lv}>`;
      }
      case 'list':
        return renderList(d.items, d.style);
      case 'checklist':
        return renderList((d.items || []).map((i) => ({ content: i.text, meta: { checked: i.checked } })), 'checklist');
      case 'image': {
        const url = d.file?.url;
        if (!url || !/^(https:|data:image\/)/.test(url)) return '';
        const classes = ['img', d.stretched && 'wide', d.withBorder && 'border', d.withBackground && 'bg'].filter(Boolean).join(' ');
        return `<figure class="${classes}"><a href="${esc(imageUrl(url, 2400))}" target="_blank" rel="noopener"><img src="${esc(imageUrl(url, 1600))}" alt="${esc(String(d.caption || '').replace(/<[^>]+>/g, ''))}" loading="lazy"></a>${d.caption ? `<figcaption>${inline(d.caption)}</figcaption>` : ''}</figure>`;
      }
      case 'embed': {
        const yt = youtubeId(d.source || d.embed || '');
        if (yt) return videoFrame(yt) + (d.caption ? `<p class="caption">${inline(d.caption)}</p>` : '');
        return d.source ? `<p><a href="${esc(d.source)}" target="_blank" rel="noopener">${esc(d.source)}</a></p>` : '';
      }
      case 'quote':
        return `<blockquote>${inline(d.text)}${d.caption ? `<cite>${inline(d.caption)}</cite>` : ''}</blockquote>`;
      case 'delimiter':
        return '<hr>';
      case 'table': {
        const rows = d.content || [];
        const head = d.withHeadings && rows.length ? `<thead><tr>${rows[0].map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` : '';
        const bodyRows = (d.withHeadings ? rows.slice(1) : rows).map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
        return `<div class="table-wrap"><table>${head}<tbody>${bodyRows}</tbody></table></div>`;
      }
      default:
        return d.text ? `<p>${inline(d.text)}</p>` : '';
    }
  }).join('\n');
}
