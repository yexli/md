/**
 * 左侧文档目录：按 /md/ 的真实目录结构生成层级菜单，
 * 高亮当前文档，目录可折叠（折叠状态记在 localStorage）。
 */
import { docSearch } from '../utils/wikiUrl.js';

const COLLAPSE_KEY = 'wiki:collapsed-folders';

function readCollapsed() {
  try {
    const saved = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

export function createSidebar({ tree, onSelect }) {
  const container = document.getElementById('doc-tree');
  const collapsed = readCollapsed();
  container.textContent = '';

  if (!tree.docs.length && !tree.folders.length) {
    const empty = document.createElement('p');
    empty.className = 'sidebar__empty';
    empty.innerHTML = '暂无 Markdown 文档<br><span>请将 .md 文件放入 /md/ 目录。</span>';
    container.appendChild(empty);
    return { setActive() {} };
  }

  container.appendChild(renderLevel(tree, '', collapsed, onSelect));

  return {
    setActive(id) {
      for (const link of container.querySelectorAll('[data-doc-id]')) {
        const active = link.dataset.docId === id;
        link.classList.toggle('is-active', active);
        if (active) {
          link.setAttribute('aria-current', 'page');
          link.scrollIntoView({ block: 'nearest' });
        } else {
          link.removeAttribute('aria-current');
        }
      }
    },
  };
}

function renderLevel(node, parentPath, collapsed, onSelect) {
  const list = document.createElement('ul');
  list.className = parentPath ? 'tree tree--nested' : 'tree';

  for (const folder of node.folders) {
    const path = parentPath ? parentPath + '/' + folder.name : folder.name;
    const isCollapsed = collapsed.has(path);

    const item = document.createElement('li');
    item.className = 'tree__group' + (isCollapsed ? ' is-collapsed' : '');

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tree__toggle';
    toggle.setAttribute('aria-expanded', String(!isCollapsed));
    toggle.innerHTML = '<svg class="tree__chevron" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">'
      + '<path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      + '<span class="tree__folder">' + escapeText(folder.name) + '</span>';
    toggle.addEventListener('click', () => {
      const next = !item.classList.contains('is-collapsed');
      item.classList.toggle('is-collapsed', next);
      toggle.setAttribute('aria-expanded', String(!next));
      if (next) collapsed.add(path);
      else collapsed.delete(path);
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...collapsed]));
      } catch {
        // 忽略隐私模式下的写入失败
      }
    });

    const children = renderLevel(folder, path, collapsed, onSelect);
    item.append(toggle, children);
    list.appendChild(item);
  }

  for (const doc of node.docs) {
    const item = document.createElement('li');
    item.className = 'tree__item';

    const link = document.createElement('a');
    link.className = 'tree__link';
    link.href = docSearch(doc.id);
    link.dataset.docId = doc.id;
    link.title = doc.id;
    link.innerHTML = '<svg class="tree__icon" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">'
      + '<path d="M4 1.5h5.5L13 5v9.5H4z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>'
      + '<path d="M9.2 1.6V5H12.8" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>'
      + '<span class="tree__label">' + escapeText(doc.title) + '</span>';
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      onSelect(doc.id);
    });

    item.appendChild(link);
    list.appendChild(item);
  }

  return list;
}

function escapeText(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}
