/**
 * 搜索：文档标题 + 正文，纯前端字符串匹配，不引入任何搜索依赖。
 */
import { docSearch } from '../utils/wikiUrl.js';

const MAX_RESULTS = 40;

export function createSearch({ docs, onSelect }) {
  const input = document.getElementById('search-input');
  const panel = document.getElementById('search-results');
  const clearBtn = document.getElementById('search-clear');

  let results = [];
  let activeIndex = -1;

  function close() {
    panel.hidden = true;
    panel.textContent = '';
    input.setAttribute('aria-expanded', 'false');
    results = [];
    activeIndex = -1;
  }

  function draw() {
    panel.textContent = '';
    const keyword = input.value.trim();

    if (!results.length) {
      const none = document.createElement('p');
      none.className = 'search-result search-result--empty';
      none.textContent = keyword ? '没有匹配的文档' : '';
      if (keyword) panel.appendChild(none);
      panel.hidden = !keyword;
      input.setAttribute('aria-expanded', String(Boolean(keyword)));
      return;
    }

    results.forEach((result, index) => {
      const link = document.createElement('a');
      link.className = 'search-result' + (index === activeIndex ? ' is-active' : '');
      link.href = docSearch(result.doc.id);
      link.setAttribute('role', 'option');
      link.innerHTML = '<span class="search-result__title">' + highlight(result.doc.title, keyword) + '</span>'
        + '<span class="search-result__path">' + highlight(result.doc.id, keyword) + '</span>'
        + (result.snippet ? '<span class="search-result__snippet">' + highlight(result.snippet, keyword) + '</span>' : '');
      link.addEventListener('click', (event) => {
        event.preventDefault();
        pick(result.doc.id);
      });
      panel.appendChild(link);
    });

    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function pick(id) {
    close();
    input.blur();
    onSelect(id);
  }

  function run() {
    const keyword = input.value.trim();
    clearBtn.hidden = !keyword;
    results = keyword ? searchDocuments(docs, keyword) : [];
    activeIndex = -1;
    draw();
  }

  function move(delta) {
    if (!results.length) return;
    let next = activeIndex + delta;
    if (next < -1) next = results.length - 1;
    if (next > results.length - 1) next = -1;
    activeIndex = next;

    const links = panel.querySelectorAll('.search-result');
    links.forEach((link, index) => {
      link.classList.toggle('is-active', index === activeIndex);
      if (index === activeIndex) link.scrollIntoView({ block: 'nearest' });
    });
  }

  input.addEventListener('input', run);
  input.addEventListener('focus', () => { if (results.length) draw(); });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Enter' && results.length) {
      event.preventDefault();
      pick((results[activeIndex] || results[0]).doc.id);
    } else if (event.key === 'Escape') {
      input.value = '';
      clearBtn.hidden = true;
      close();
    }
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.hidden = true;
    close();
    input.focus();
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('#search')) close();
  });

  // 按 / 直接聚焦搜索框（和多数文档站一致）
  window.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (document.activeElement === input || isTyping(event.target)) return;
    event.preventDefault();
    input.focus();
    input.select();
  });

  return { close };
}

/** 标题命中优先，其次是正文命中 */
export function searchDocuments(docs, keyword) {
  const needle = keyword.toLowerCase();
  const byTitle = [];
  const byBody = [];

  for (const doc of docs) {
    if (doc.title.toLowerCase().includes(needle) || doc.id.toLowerCase().includes(needle)) {
      byTitle.push({ doc, snippet: '' });
      continue;
    }
    const index = doc.content.toLowerCase().indexOf(needle);
    if (index >= 0) byBody.push({ doc, snippet: makeSnippet(doc.content, index, needle.length) });
  }

  return [...byTitle, ...byBody].slice(0, MAX_RESULTS);
}

function makeSnippet(content, index, length) {
  const start = Math.max(0, index - 24);
  const end = Math.min(content.length, index + length + 60);
  const text = content.slice(start, end).replace(/\s+/g, ' ').trim();
  return (start > 0 ? '…' : '') + text + (end < content.length ? '…' : '');
}

function highlight(text, keyword) {
  const escaped = escapeText(text);
  if (!keyword) return escaped;
  const pattern = new RegExp('(' + escapeRegExp(escapeText(keyword)) + ')', 'gi');
  return escaped.replace(pattern, '<mark>$1</mark>');
}

function isTyping(target) {
  return target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

function escapeText(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
