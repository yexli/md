import { defineConfig } from 'vite';
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MD_ROOT = 'md';
const MD_EXT_RE = /\.(md|markdown)$/i;

/**
 * 构建阶段：把 /md/ 目录中除 Markdown 之外的资源（图片等）原样复制到产物目录，
 * 这样 Markdown 里的相对图片路径在 dist 下依然可用。
 * 开发阶段无需处理：Vite 开发服务器直接以项目根为根目录提供静态文件。
 */
function copyMarkdownAssets() {
  let outDir = 'dist';
  return {
    name: 'wiki:copy-md-assets',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      copyAssets(resolve(MD_ROOT), join(outDir, MD_ROOT));
    },
  };
}

function copyAssets(srcDir, destDir) {
  if (!existsSync(srcDir)) return;
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src = join(srcDir, entry.name);
    if (entry.isDirectory()) {
      copyAssets(src, join(destDir, entry.name));
      continue;
    }
    if (entry.isFile() && !MD_EXT_RE.test(entry.name)) {
      mkdirSync(destDir, { recursive: true });
      cpSync(src, join(destDir, entry.name));
    }
  }
}

export default defineConfig({
  plugins: [copyMarkdownAssets()],
  server: { port: 5173, open: false },
  build: { outDir: 'dist', assetsDir: 'assets' },
});
