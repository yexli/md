/**
 * 文档发现。
 *
 * 两种数据来源，优先用第一种：
 *
 * 1. 运行时目录列表 —— 服务器返回 /md/ 的目录 JSON 时直接读取。
 *    这样往服务器 md/ 目录里丢 .md 文件、刷新页面就生效，不需要重新构建。
 *    服务端只需要一行 nginx 配置：autoindex on; autoindex_format json;
 * 2. 构建期快照 —— 没有目录列表（对象存储、GitHub Pages 等纯静态托管）时，
 *    回退到 npm run build 时读进 JS 的那份文档。
 *
 * 两条路都拿不到时，显示「暂无 Markdown 文档」。
 */

const MD_BASE = import.meta.env.BASE_URL + 'md/';
const MD_EXT_RE = /\.(md|markdown)$/i;

/** 同时打开的文档请求数，避免文档多时一次性打满连接 */
const FETCH_CONCURRENCY = 8;

const BUNDLED_DOCS = import.meta.glob('/md/**/*.{md,markdown}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

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

function createDoc(id, content) {
  const slash = id.lastIndexOf('/');
  const fileName = slash === -1 ? id : id.slice(slash + 1);
  return {
    id,
    dir: slash === -1 ? '' : id.slice(0, slash),
    fileName,
    title: extractTitle(content) || stripExtension(fileName),
    content,
  };
}

/** 目录列表里的文件名可能是 URL 编码过的，统一还原成原始名字 */
function decodeName(name) {
  if (typeof name !== 'string' || !name) return '';
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

async function readDirectory(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = JSON.parse(await res.text());
  if (!Array.isArray(data)) throw new Error('返回的不是目录列表');
  return data;
}

/** 递归收集 /md/ 下所有 Markdown 文件的访问地址与相对 id */
async function collectFiles(dirUrl, dirPath, entries, out, warnings) {
  const subDirs = [];

  for (const entry of entries) {
    const name = decodeName(entry.name);
    if (!name) continue;

    if (entry.type === 'directory') {
      subDirs.push({ name, url: dirUrl + encodeURIComponent(name) + '/' });
      continue;
    }
    if (MD_EXT_RE.test(name)) {
      out.push({
        id: dirPath ? dirPath + '/' + name : name,
        url: dirUrl + encodeURIComponent(name),
      });
    }
  }

  // 单个子目录拿不到列表（例如被服务器上别的 location 规则接管）不影响其它目录
  await Promise.all(subDirs.map(async (dir) => {
    const childPath = dirPath ? dirPath + '/' + dir.name : dir.name;
    try {
      await collectFiles(dir.url, childPath, await readDirectory(dir.url), out, warnings);
    } catch (error) {
      warnings.push(dir.name + ' (' + error.message + ')');
    }
  }));
}

/** 并发读取每篇文档的原文，用于生成菜单标题和全文搜索 */
async function fetchContents(files) {
  const docs = [];
  for (let index = 0; index < files.length; index += FETCH_CONCURRENCY) {
    const batch = files.slice(index, index + FETCH_CONCURRENCY);
    const loaded = await Promise.all(batch.map(async (file) => {
      try {
        const res = await fetch(file.url, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return createDoc(file.id, await res.text());
      } catch (error) {
        console.warn('[wiki] 读取文档失败:', file.id, error.message);
        return null;
      }
    }));
    for (const doc of loaded) if (doc) docs.push(doc);
  }
  return docs;
}

/** 目录列表不可用时返回 null，可用时返回文档数组（可能是空数组） */
async function loadFromServer() {
  let rootEntries;
  try {
    rootEntries = await readDirectory(MD_BASE);
  } catch {
    return null;
  }

  const files = [];
  const warnings = [];
  await collectFiles(MD_BASE, '', rootEntries, files, warnings);
  if (warnings.length) {
    console.warn('[wiki] 这些子目录没有返回目录列表，已跳过:', warnings.join('、'));
  }
  return fetchContents(files);
}

function loadFromBundle() {
  return Object.entries(BUNDLED_DOCS).map(([path, content]) => {
    const id = path.startsWith('/md/') ? path.slice('/md/'.length) : path;
    return createDoc(id, typeof content === 'string' ? content : '');
  });
}

/** 顶层文件在前，同级按标题自然序 */
function compareDocs(a, b) {
  const topLevel = (doc) => (doc.dir ? 1 : 0);
  if (topLevel(a) !== topLevel(b)) return topLevel(a) - topLevel(b);
  return collator.compare(a.title, b.title);
}

/**
 * 读取全部文档。
 * @returns {Promise<{docs: Array, source: 'server'|'bundle'}>}
 */
export async function loadDocuments() {
  const fromServer = await loadFromServer();
  const docs = fromServer === null ? loadFromBundle() : fromServer;
  docs.sort(compareDocs);
  return { docs, source: fromServer === null ? 'bundle' : 'server' };
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
