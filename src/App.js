/**
 * 应用装配：文档索引 -> 菜单 / 搜索 / 阅读区，外加 URL 状态、阅读记忆与移动端抽屉。
 */
import { loadDocuments, buildTree, findDocument, firstDocument } from './utils/documentLoader.js';
import { readDocFromUrl, currentDocUrl } from './utils/wikiUrl.js';
import { createSidebar } from './components/sidebar.js';
import { createViewer } from './components/markdownViewer.js';
import { createSearch } from './components/search.js';
import { copyWithFeedback } from './components/copyButton.js';

const LAST_DOC_KEY = 'wiki:last-doc';
const MOBILE_QUERY = '(max-width: 1023px)';

export function startApp() {
  const docs = loadDocuments();
  const tree = buildTree(docs);

  const sidebarEl = document.getElementById('sidebar');
  const maskEl = document.getElementById('sidebar-mask');
  const menuToggle = document.getElementById('menu-toggle');
  const copyAllBtn = document.getElementById('copy-all');
  const copyAllLabel = copyAllBtn.querySelector('.btn__text');

  const viewer = createViewer({ onOpenDoc: (id) => openDoc(id) });
  const sidebar = createSidebar({ tree, onSelect: (id) => openDoc(id) });
  createSearch({ docs, onSelect: (id) => openDoc(id) });

  let currentId = '';
  const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

  function setDrawer(open) {
    sidebarEl.classList.toggle('is-open', open);
    maskEl.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-locked', open);
  }

  function render(doc, id) {
    currentId = id || '';
    if (doc) {
      viewer.show(doc);
      sidebar.setActive(doc.id);
      try {
        localStorage.setItem(LAST_DOC_KEY, doc.id);
      } catch {
        // 忽略隐私模式下的写入失败
      }
      return;
    }
    sidebar.setActive('');
    if (!docs.length) viewer.showEmptyLibrary();
    else viewer.showMissing(id);
  }

  function openDoc(id, { push = true } = {}) {
    const previousId = currentId;
    render(findDocument(docs, id), id);
    currentId = id || '';
    if (push && id !== previousId) {
      window.history.pushState({ doc: id }, '', currentDocUrl(id));
    }
    if (isMobile()) setDrawer(false);
  }

  menuToggle.addEventListener('click', () => setDrawer(!sidebarEl.classList.contains('is-open')));
  maskEl.addEventListener('click', () => setDrawer(false));

  document.getElementById('brand').addEventListener('click', (event) => {
    const first = firstDocument(tree);
    if (!first) return;
    event.preventDefault();
    openDoc(first.id);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sidebarEl.classList.contains('is-open')) setDrawer(false);
  });

  // 浏览器前进 / 后退
  window.addEventListener('popstate', () => {
    const id = readDocFromUrl();
    if (!id) {
      const first = firstDocument(tree);
      render(first, first ? first.id : '');
      return;
    }
    render(findDocument(docs, id), id);
  });

  copyAllBtn.addEventListener('click', () => {
    copyWithFeedback(viewer.text(), copyAllLabel, '当前文档没有可复制的内容');
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) setDrawer(false);
  });

  // 打开顺序：URL 指定 -> 上次阅读 -> 第一个文档
  const fromUrl = readDocFromUrl();
  if (fromUrl) {
    render(findDocument(docs, fromUrl), fromUrl);
    return;
  }

  let remembered = '';
  try {
    remembered = localStorage.getItem(LAST_DOC_KEY) || '';
  } catch {
    remembered = '';
  }
  const last = findDocument(docs, remembered);
  const initial = last || firstDocument(tree);
  const initialId = initial ? initial.id : '';
  render(initial, initialId);
  if (initial) {
    window.history.replaceState({ doc: initialId }, '', currentDocUrl(initialId));
  }
}
