/**
 * 右侧阅读区：渲染 Markdown、处理代码块复制与站内文档链接跳转。
 */
import { renderMarkdown } from '../utils/markdownRenderer.js';
import { copyWithFeedback } from './copyButton.js';

export function createViewer({ onOpenDoc }) {
  const el = document.getElementById('doc');
  let hasContent = false;

  el.addEventListener('click', async (event) => {
    const copyBtn = event.target.closest('[data-copy-code]');
    if (copyBtn) {
      const code = copyBtn.closest('.code-block')?.querySelector('code');
      await copyWithFeedback(code ? code.textContent : '', copyBtn, '这个代码块是空的');
      return;
    }

    const link = event.target.closest('a[data-doc]');
    if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
      event.preventDefault();
      onOpenDoc(link.dataset.doc);
    }
  });

  // 图片挂了不留破图，给出可见提示
  el.addEventListener('error', (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    const note = document.createElement('span');
    note.className = 'doc__image-error';
    note.textContent = '图片加载失败：' + (img.getAttribute('alt') || img.getAttribute('src'));
    img.replaceWith(note);
  }, true);

  return {
    show(doc) {
      hasContent = Boolean(doc.content.trim());
      if (!hasContent) {
        paint(el, '<p class="doc__placeholder">该文档暂无内容。</p>');
        return;
      }
      try {
        paint(el, renderMarkdown(doc.content, doc));
      } catch (error) {
        console.error('[wiki] 文档渲染失败:', error);
        paint(el, errorCard('文档加载失败', '请检查文件是否存在或格式是否正确。'));
      }
    },
    /** doc id 在 /md/ 里找不到 */
    showMissing(id) {
      hasContent = false;
      paint(el, errorCard('文档不存在', '该 Markdown 文件可能已经被删除。', id));
    },
    /** /md/ 里一个文档都没有 */
    showEmptyLibrary() {
      hasContent = false;
      paint(el, errorCard('暂无 Markdown 文档', '请将 .md 文件放入 /md/ 目录。'));
    },
    /**
     * 当前文档的纯文本，供「复制全文」使用。
     * 读取期间临时隐藏代码块顶部的语言标签与复制按钮，避免它们混进正文。
     */
    text() {
      if (!hasContent) return '';
      document.body.classList.add('is-copying');
      const text = el.innerText.replace(/\r\n/g, '\n').trim();
      document.body.classList.remove('is-copying');
      return text;
    },
  };
}

function paint(el, html) {
  el.innerHTML = html;
  el.classList.remove('doc--enter');
  void el.offsetWidth; // 强制重排，让入场动画可以重复播放
  el.classList.add('doc--enter');
  window.scrollTo({ top: 0 });
}

function errorCard(title, detail, extra = '') {
  return '<div class="doc__error"><h2>' + title + '</h2><p>' + detail + '</p>'
    + (extra ? '<p class="doc__error-path">' + extra + '</p>' : '')
    + '</div>';
}
