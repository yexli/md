/** URL 上的文档状态：?doc=Agent/Agent%20SOP.md */

export const DOC_PARAM = 'doc';

export function readDocFromUrl(search = window.location.search) {
  return new URLSearchParams(search).get(DOC_PARAM) || '';
}

/** 生成 ?doc=xxx，保留路径中的 / 让链接可读 */
export function docSearch(id) {
  return '?' + DOC_PARAM + '=' + encodeURIComponent(id).replace(/%2F/gi, '/');
}

export function docHref(id) {
  return docSearch(id);
}

export function currentDocUrl(id) {
  const url = new URL(window.location.href);
  url.search = docSearch(id);
  url.hash = '';
  return url;
}
