import { defineConfig } from 'vite';
import { cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MD_ROOT = 'md';

/**
 * 构建期：把整个 md/ 目录（含 .md 原文和图片）原样复制到产物里。
 * 这样 dist 部署之后，服务器上的 /md/ 就是一份完整、可被目录列表读取的目录，
 * 配合 nginx 的 autoindex 就能做到「丢一个 .md 文件进去，刷新页面即生效」。
 */
function copyMarkdownDir() {
  let outDir = 'dist';
  return {
    name: 'wiki:copy-md-dir',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const src = resolve(MD_ROOT);
      if (!existsSync(src)) return;
      cpSync(src, join(outDir, MD_ROOT), { recursive: true });
    },
  };
}

/**
 * 目录列表中间件：返回与 nginx `autoindex_format json` 完全一致的 JSON。
 * 开发服务器和预览服务器都挂上它，本地调试时走的是和线上同一条读取路径。
 */
function createDirectoryListing(root) {
  return (req, res, next) => {
    let pathname = '';
    try {
      pathname = decodeURI((req.url || '').split('?')[0]);
    } catch {
      return next();
    }
    if (!pathname.startsWith('/' + MD_ROOT + '/') || !pathname.endsWith('/')) return next();

    const dir = resolve(root, pathname.replace(/^\/+/, ''));
    let dirents;
    try {
      if (!statSync(dir).isDirectory()) return next();
      dirents = readdirSync(dir, { withFileTypes: true });
    } catch {
      return next();
    }

    const listing = dirents.map((entry) => {
      const full = join(dir, entry.name);
      const stat = statSync(full);
      const item = {
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        mtime: stat.mtime.toUTCString(),
      };
      if (entry.isFile()) item.size = stat.size;
      return item;
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(listing));
  };
}

function markdownDirectoryListing() {
  return {
    name: 'wiki:md-listing',
    configureServer(server) {
      server.middlewares.use(createDirectoryListing(server.config.root));
    },
    configurePreviewServer(server) {
      // 预览服务的是构建产物目录，不是项目根
      const outDir = resolve(server.config.root, server.config.build.outDir);
      server.middlewares.use(createDirectoryListing(outDir));
    },
  };
}

export default defineConfig({
  plugins: [copyMarkdownDir(), markdownDirectoryListing()],
  server: { port: 5173, open: false },
  build: { outDir: 'dist', assetsDir: 'assets' },
});
