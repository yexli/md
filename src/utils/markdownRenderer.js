/**
 * Markdown -> 安全 HTML。
 *
 * markdown-it 负责解析，highlight.js 负责代码高亮，
 * 最后统一用 DOMPurify 过滤，保证 Markdown 里的危险 HTML / JavaScript 不会被执行。
 */
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/common';
import DOMPurify from 'dompurify';

const MD_BASE = import.meta.env.BASE_URL + 'md/';

const md = new MarkdownIt({
  html: true,        // 允许常见安全 HTML（<details>、<kbd>、<br> 等），随后统一白名单过滤
  linkify: true,
  breaks: false,
});

const escapeHtml = md.utils.escapeHtml;
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

/** 外链、锚点、data: 等无需改写的地址 */
function isSpecialUrl(url) {
  return !url || url.startsWith('#') || url.startsWith('//') || SCHEME_RE.test(url);
}

/** 把相对路径解析成以站点根为基准的绝对路径，基准是当前 Markdown 文件所在目录 */
function resolvePath(url, docDir) {
  if (isSpecialUrl(url)) return url;
  if (url.startsWith('/')) return MD_BASE + url.slice(1);
  const base = MD_BASE + (docDir ? docDir + '/' : '');
  const resolved = new URL(url, new URL(base, window.location.href));
  return resolved.pathname + resolved.search + resolved.hash;
}

/** 相对链接指向另一篇 Markdown 时，换算出它在 /md/ 下的 doc id */
function toDocId(url, docDir) {
  const pathPart = url.split(/[?#]/)[0];
  if (!/\.(md|markdown)$/i.test(pathPart)) return '';
  const stack = [];
  for (const segment of (docDir ? docDir + '/' + pathPart : pathPart).split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') stack.pop();
    else stack.push(segment);
  }
  const id = stack.join('/');
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

// 代码块：顶部信息条（语言 + 复制按钮），下方是高亮后的代码
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const lang = (token.info || '').trim().split(/\s+/)[0].toLowerCase();
  const code = token.content.replace(/\n+$/, '');
  const usable = lang && hljs.getLanguage(lang) ? lang : '';
  const body = usable
    ? hljs.highlight(code, { language: usable, ignoreIllegals: true }).value
    : escapeHtml(code);
  const label = escapeHtml(lang || 'text');
  return '<div class="code-block">'
    + '<div class="code-block__bar"><span class="code-block__lang">' + label + '</span>'
    + '<button class="code-copy" type="button" data-copy-code>复制</button></div>'
    + '<pre class="code-block__pre"><code class="hljs language-' + label + '">' + body + '</code></pre>'
    + '</div>';
};

// 图片：相对路径按 Markdown 所在目录解析
const defaultImage = md.renderer.rules.image;
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const srcIndex = token.attrIndex('src');
  if (srcIndex >= 0) {
    token.attrs[srcIndex][1] = resolvePath(token.attrs[srcIndex][1], env.docDir);
  }
  token.attrSet('loading', 'lazy');
  if (defaultImage) return defaultImage(tokens, idx, options, env, self);
  return self.renderToken(tokens, idx, options);
};

// 链接：站内相对链接改写成正确路径；指向 .md 的链接交给前端做无刷新切换；外链新窗口打开
const defaultLinkOpen = md.renderer.rules.link_open
  || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = token.attrGet('href') || '';
  if (!isSpecialUrl(href)) {
    const docId = toDocId(href, env.docDir);
    token.attrSet('href', resolvePath(href, env.docDir));
    if (docId) token.attrSet('data-doc', docId);
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(href) || href.startsWith('//')) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// 表格：包一层容器，窄屏时允许横向滚动而不是把页面撑破
md.renderer.rules.table_open = () => '<div class="table-wrap"><table>';
md.renderer.rules.table_close = () => '</table></div>';

// 表格对齐：markdown-it 用 style 表达，这里换成 class，
// 这样既能保留左中右对齐，又不必为 style 属性开口子。
for (const ruleName of ['th_open', 'td_open']) {
  md.renderer.rules[ruleName] = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const style = token.attrGet('style');
    if (style) {
      const align = /text-align:\s*(left|center|right)/i.exec(style);
      if (align && align[1].toLowerCase() !== 'left') {
        token.attrSet('class', 'align-' + align[1].toLowerCase());
      }
      token.attrs = token.attrs.filter((attr) => attr[0] !== 'style');
    }
    return self.renderToken(tokens, idx, options);
  };
}

const SANITIZE_OPTIONS = {
  ADD_ATTR: ['target', 'rel', 'data-doc'],
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'link', 'meta', 'base'],
  FORBID_ATTR: ['style', 'formaction', 'xlink:href', 'srcdoc'],
};

/**
 * 渲染一篇文档。
 * @param {string} content Markdown 原文
 * @param {{dir?: string}} doc 文档信息，dir 用于解析相对路径
 * @returns {string} 可安全插入 DOM 的 HTML
 */
export function renderMarkdown(content, doc = {}) {
  const html = md.render(content, { docDir: doc.dir || '' });
  return DOMPurify.sanitize(html, SANITIZE_OPTIONS);
}
