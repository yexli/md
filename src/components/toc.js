/**
 * 右侧大纲：扫描正文里的一级到四级标题（# / ## / ### / ####），
 * 按层级嵌套成目录树，点击跳转，滚动时高亮当前章节。
 *
 * 标题的 id 由 markdownRenderer 在渲染时生成，这里只负责读取和交互。
 */

/** h5 / h6 在正文里极少出现，且大纲栏宽度有限，收录到四级为止 */
const HEADING_SELECTOR = 'h1[id], h2[id], h3[id], h4[id]';

/** 高亮判定线在顶栏之下再留一点余量 */
const ACTIVE_OFFSET = 24;

function scrollBehavior() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/**
 * 把扁平的标题列表按层级折成目录树。
 * 跳级（比如 ## 直接接 ####）和回退（### 后接 ##）都按栈顶比较处理。
 */
function buildTree(headings) {
  const root = { level: 0, heading: null, children: [] };
  const stack = [root];

  for (const heading of headings) {
    const level = Number(heading.tagName.slice(1)) || 1;
    while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
    const node = { level, heading, children: [] };
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return root.children;
}

export function createToc() {
  const el = document.getElementById('toc');
  const topbarHeight = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--topbar-h'),
  ) || 56;

  let headings = [];
  const links = new Map();
  let activeId = '';
  let frame = 0;

  function clear() {
    el.textContent = '';
    el.hidden = true;
    headings = [];
    links.clear();
    activeId = '';
  }

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    for (const [key, link] of links) link.classList.toggle('is-active', key === id);
    const active = links.get(id);
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function syncActive() {
    if (!headings.length) return;

    // 滚到底部时直接高亮最后一节，否则末尾的短章节永远轮不到
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atEnd) {
      setActive(headings[headings.length - 1].id);
      return;
    }

    const line = window.scrollY + topbarHeight + ACTIVE_OFFSET;
    let current = headings[0].id;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top + window.scrollY <= line) current = heading.id;
      else break;
    }
    setActive(current);
  }

  function onScroll() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      syncActive();
    });
  }

  function jumpTo(heading) {
    heading.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    setActive(heading.id);
    window.history.replaceState(window.history.state, '', '#' + encodeURIComponent(heading.id));
  }

  function renderNodes(nodes, depth) {
    const list = document.createElement('ul');
    list.className = depth === 0 ? 'toc__list' : 'toc__list toc__list--nested';

    for (const node of nodes) {
      const item = document.createElement('li');
      item.className = 'toc__item toc__item--' + node.level;

      const link = document.createElement('a');
      link.className = 'toc__link';
      link.href = '#' + encodeURIComponent(node.heading.id);
      link.textContent = node.heading.textContent;
      link.title = node.heading.textContent;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        jumpTo(node.heading);
      });

      links.set(node.heading.id, link);
      item.appendChild(link);
      if (node.children.length) item.appendChild(renderNodes(node.children, depth + 1));
      list.appendChild(item);
    }
    return list;
  }

  /**
   * 扫描渲染后的正文，重建大纲。标题少于两个、或没有小标题的文档不显示大纲栏。
   * @param {HTMLElement} container 正文容器
   */
  function update(container) {
    clear();
    const found = container ? [...container.querySelectorAll(HEADING_SELECTOR)] : [];
    if (found.length < 2) return;

    headings = found;
    const caption = document.createElement('p');
    caption.className = 'toc__title';
    caption.textContent = '本文目录';

    el.append(caption, renderNodes(buildTree(found), 0));
    el.hidden = false;
    syncActive();
  }

  /** 直接打开带 #锚点 的链接时，渲染完成后跳到对应小节 */
  function restoreHash(container) {
    const raw = decodeURIComponent(window.location.hash.slice(1) || '');
    if (!raw || !container) return;
    const target = container.querySelector('[id="' + CSS.escape(raw) + '"]');
    if (!target) return;
    target.scrollIntoView({ block: 'start' });
    setActive(target.id);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  return { update, clear, restoreHash };
}
