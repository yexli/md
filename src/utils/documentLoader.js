/**
 * 文档发现与索引。
 *
 * 数据源永远是项目根目录下的 /md/，不经过数据库、不经过后端接口。
 * 通过 Vite 的 glob 导入在构建（或开发服务器启动）阶段把文件内容读进模块，
 * 因此往 /md/ 里新增一个 .md 文件后刷新页面，它就会自动出现在菜单里。
 */

const RAW_DOCS = import.meta.glob('/md/**/*.{md,markdown}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const MD_PREFIX = '/md/';
const MD_EXT_RE = /\.(md|markdown)$/i;

/** 中文优先的自然排序（文件名里的数字按数值比较） */
const collator = new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' });

export function stripExtension(fileName) {
  return fileName.replace(MD_EXT_RE, '');
}

/**
 * 取正文里第一个一级标题作为文档标题。
 * 跳过围栏代码块，避免把代码注释里的 # 误判成标题。
 * 没有一级标题时返回空串，由调用方回退到文件名。
 */
export function extractTitle(content) {
  let fenceChar = '';
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    const fence = /^(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (!fenceChar) fenceChar = fence[1][0];
      else if (fence[1][0] === fenceChar) fenceChar = '';
      continue;
    }
    if (fenceChar) continue;
    const heading = /^#\s+(.*)$/.exec(line);
    if (heading) return heading[1].replace(/\s+#+$/, '').trim();
  }
  return '';
}

/** '/md/Agent/Agent SOP.md' -> 'Agent/Agent SOP.md'（同时作为 URL 里的 doc 值） */
function toRelativePath(modulePath) {
  return modulePath.startsWith(MD_PREFIX) ? modulePath.slice(MD_PREFIX.length) : modulePath;
}

function createDoc(modulePath, rawContent) {
  const id = toRelativePath(modulePath);
  const slash = id.lastIndexOf('/');
  const fileName = slash === -1 ? id : id.slice(slash + 1);
  return {
    id,
    dir: slash === -1 ? '' : id.slice(0, slash),
    fileName,
    title: extractTitle(rawContent) || stripExtension(fileName),
    content: rawContent,
  };
}

/** 读取 /md/ 下全部 Markdown 文档：顶层文件在前，同级按标题自然序 */
export function loadDocuments() {
  const docs = Object.entries(RAW_DOCS)
    .map(([path, content]) => createDoc(path, typeof content === 'string' ? content : ''));

  docs.sort((a, b) => {
    const topLevel = (doc) => (doc.dir ? 1 : 0);
    if (topLevel(a) !== topLevel(b)) return topLevel(a) - topLevel(b);
    return collator.compare(a.title, b.title);
  });
  return docs;
}

/** 把平铺的文档列表组织成目录树，保留 /md/ 下的子目录层级 */
export function buildTree(docs) {
  const root = { name: '', folders: new Map(), docs: [] };
  for (const doc of docs) {
    let node = root;
    if (doc.dir) {
      for (const part of doc.dir.split('/')) {
        if (!node.folders.has(part)) node.folders.set(part, { name: part, folders: new Map(), docs: [] });
        node = node.folders.get(part);
      }
    }
    node.docs.push(doc);
  }
  return sortNode(root);
}

function sortNode(node) {
  const folders = [...node.folders.values()]
    .sort((a, b) => collator.compare(a.name, b.name))
    .map(sortNode);
  return { name: node.name, folders, docs: node.docs };
}

/** 菜单树的第一个文档，作为默认打开的文档 */
export function firstDocument(tree) {
  if (tree.docs.length) return tree.docs[0];
  for (const folder of tree.folders) {
    const found = firstDocument(folder);
    if (found) return found;
  }
  return null;
}

/** 按 doc id 查找文档，找不到返回 null（用于「文档不存在」提示） */
export function findDocument(docs, id) {
  if (!id) return null;
  const target = String(id).replace(/^\/+/, '');
  return docs.find((doc) => doc.id === target) || null;
}
