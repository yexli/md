/**
 * 把文档的 Markdown 原文下载到本地。
 *
 * 文档内容已经在内存里（菜单标题和全文搜索都要用），所以不需要请求服务器，
 * 服务器端模式和构建快照模式都能用。
 */
export function downloadDocument(doc) {
  const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = doc.fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();

  // 等浏览器把内容读走之后再释放
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
