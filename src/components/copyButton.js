/** 复制与轻提示：全站共用的两个小工具 */

let toastTimer = 0;

/** 底部轻提示 */
export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => { toast.hidden = true; }, 200);
  }, 1600);
}

/** 复制文本：优先 Clipboard API，非安全上下文回退到 execCommand */
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 落到下面的兜底方案
    }
  }
  return legacyCopy(text);
}

function legacyCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

/** 把按钮文案临时切换成「已复制」，短暂显示后恢复 */
export function flashLabel(element, text = '已复制', duration = 1600) {
  if (!element) return;
  if (element.dataset.restoreTimer) window.clearTimeout(Number(element.dataset.restoreTimer));
  if (element.dataset.originalText === undefined) element.dataset.originalText = element.textContent;
  element.textContent = text;
  element.classList.add('is-copied');
  element.dataset.restoreTimer = String(window.setTimeout(() => {
    element.textContent = element.dataset.originalText;
    element.classList.remove('is-copied');
    delete element.dataset.restoreTimer;
  }, duration));
}

/** 复制全文 / 复制代码共用的入口，成功与失败都给出反馈 */
export async function copyWithFeedback(text, labelElement, emptyMessage = '') {
  if (!text) {
    showToast(emptyMessage || '没有可复制的内容');
    return false;
  }
  if (await copyText(text)) {
    flashLabel(labelElement);
    return true;
  }
  showToast('复制失败，请手动选择文本');
  return false;
}
