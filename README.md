# Markdown Wiki 阅读器

> 文件即知识库，Markdown 即内容，Wiki 即阅读界面。

读取项目根目录下 `/md/` 里的 Markdown 文件，自动生成一个 Wiki 阅读界面。
没有数据库、没有后端接口，Markdown 文件本身就是数据源。

---

## 运行方式

```bash
npm install
npm run dev        # 开发服务器，默认 http://localhost:5173
```

```bash
npm run build      # 构建到 dist/
npm run preview    # 本地预览构建产物
```

构建产物是纯静态文件，丢到 Nginx、GitHub Pages 或任意对象存储都能直接跑。

---

## 添加文档

把 `.md` 或 `.markdown` 文件放进 `/md/`，刷新页面即可。

```text
/md/
├── 项目介绍.md
├── 使用指南.md
├── 开发指南/
│   ├── 架构设计.md
│   └── 前端实现.md
└── images/
    └── architecture.svg
```

**不需要修改任何代码。** 开发模式下新增或删除文件都会立即生效。

| 规则 | 说明 |
| --- | --- |
| 菜单标题 | 优先取正文第一个 `# 一级标题`（会跳过代码块），否则用文件名 |
| 子目录 | 原样保留为菜单层级，可折叠，折叠状态记在浏览器里 |
| 支持扩展名 | `.md`、`.markdown` |
| 编码 | UTF-8，中文文件名 / 目录名 / 内容全部支持 |

---

## 项目结构

```text
wiki阅读器/
├── md/                          ← 唯一的数据源，放 Markdown 的地方
├── index.html                   ← 页面骨架（顶栏 / 侧栏 / 阅读区）
├── vite.config.js               ← 构建配置 + 把 md/ 下的图片复制进产物
└── src/
    ├── main.js                  ← 入口
    ├── App.js                   ← 装配模块，管理 URL、阅读记忆、移动端抽屉
    ├── components/
    │   ├── sidebar.js           ← 目录树、当前项高亮、折叠
    │   ├── search.js            ← 标题 + 正文搜索
    │   ├── markdownViewer.js    ← 正文渲染、代码复制、站内链接跳转
    │   └── copyButton.js        ← 复制与轻提示
    ├── utils/
    │   ├── documentLoader.js    ← 扫描 /md/、提取标题、构建目录树
    │   ├── markdownRenderer.js  ← Markdown → 安全 HTML
    │   └── wikiUrl.js           ← ?doc= 状态的读写
    └── styles/main.css          ← 全部样式
```

---

## 功能

**阅读**

- Markdown 全量常用语法：标题、粗体、斜体、删除线、列表、引用、表格、链接、图片、代码块、分隔线
- 代码语法高亮（JavaScript / TypeScript / HTML / CSS / JSON / Python / Java / C# / C++ / Shell / SQL / Markdown 等常见语言）
- 允许常见安全 HTML（`<details>`、`<kbd>`、`<sub>`、`<sup>` 等），危险的 `<script>`、`onerror=`、`javascript:` 一律过滤

**交互**

- 点击菜单切换文档，不刷新整页
- 当前文档写进地址栏（`?doc=开发指南/架构设计.md`），刷新、前进、后退、复制链接都有效
- 记住上次阅读的文档，下次打开直接回到那里
- 顶栏「📋 复制全文」复制当前文档纯文本；每个代码块右上角「复制」只复制这一段

**搜索**

- 标题和正文一起搜，标题命中排在前面，正文命中带一段上下文
- 键盘：`/` 聚焦，`↑` `↓` 选择，`Enter` 打开，`Esc` 关闭

**响应式**

- 桌面：侧栏常驻，正文最大宽度 920px
- 平板 / 手机：侧栏收进抽屉，左上角 ☰ 展开，选完文档自动收起
- 表格和代码块在窄屏下横向滚动，不会撑破页面

**异常处理**

| 情况 | 表现 |
| --- | --- |
| 文档 id 找不到 | 提示「文档不存在 / 该 Markdown 文件可能已经被删除。」 |
| 渲染出错 | 提示「文档加载失败 / 请检查文件是否存在或格式是否正确。」 |
| `/md/` 里没有文档 | 提示「暂无 Markdown 文档 / 请将 .md 文件放入 /md/ 目录。」 |
| 文档内容为空 | 提示「该文档暂无内容。」 |
| 图片路径写错 | 就地提示图片加载失败，不留破图 |

---

## 路径规则

Markdown 里的相对路径，**以当前文件所在目录为基准**：

```markdown
<!-- 文件位置：md/开发指南/架构设计.md -->
![图](./images/a.png)      <!-- → /md/开发指南/images/a.png -->
![图](../images/b.png)     <!-- → /md/images/b.png -->
![图](/images/c.png)       <!-- 以 / 开头时，以 /md/ 为基准 → /md/images/c.png -->
[架构](../开发指南/架构设计.md)   <!-- 站内链接，点击后无刷新切换 -->
```

外链自动新窗口打开。图片可以放在 `md/` 目录里的任何位置，构建时会被复制到产物中。

---

## 技术选型

运行时只有三个依赖，各司其职：

| 依赖 | 用途 |
| --- | --- |
| `markdown-it` | Markdown 解析 |
| `highlight.js` | 代码语法高亮 |
| `dompurify` | HTML 白名单过滤 |

构建工具是 Vite。文档发现用 Vite 的 glob 导入完成：

```js
import.meta.glob('/md/**/*.{md,markdown}', { query: '?raw', import: 'default', eager: true });
```

目录树、搜索、复制、URL 状态全部手写，没有引入路由库、状态管理库或 UI 组件库。

---

## 部署

构建产物是纯静态文件，`npm run build` 之后把 `dist/` 里的内容发布出去即可，服务器上不需要 Node。

### 托管平台（连仓库，push 自动部署）

Cloudflare Pages、Vercel、Netlify、腾讯云 EdgeOne Pages 都可以，构建配置统一填：

| 配置项 | 值 |
| --- | --- |
| 构建命令 | `npm run build` |
| 输出目录 | `dist` |
| Node 版本 | 由 `.nvmrc` 决定（22） |

### 静态服务器 / 对象存储

本地构建后上传 `dist/` 内容到腾讯云 COS、阿里云 OSS（开启静态网站模式）或 Nginx：

```bash
npm run build
# 把 dist/ 里的 index.html、assets/、md/ 原样传到站点根目录
```

### GitHub Pages

仓库 Settings → Pages → Source 选择 `GitHub Actions`，之后推送到 `main` 即自动部署（见 `.github/workflows/deploy.yml`）。

> 部署到 `https://<用户名>.github.io/<仓库名>/` 属于子路径，构建时必须指定 `base`。
> 工作流已通过 `configure-pages` 自动取到仓库路径，本地构建不受影响。

### 部署到子路径

手工构建时用 `--base` 指定：

```bash
npm run build -- --base=/wiki/
```

图片路径会自动跟着 `base` 变化，不需要改代码。

### 加文档之后

`/md/` 的内容在**构建时**打包进 JS，所以云端加文档必须重新部署一次：
本地改完 push（触发平台重新构建），或重新 `npm run build` 后覆盖上传 `dist/`。

---

## 说明

- 文档内容会在构建时打包进 JS，适合个人到中小团队的文档规模；如果 `/md/` 长到几十 MB，再考虑改成按需加载
- 部署到子路径时，需要相应调整 `vite.config.js` 的 `base`
- `/md/` 下的测试文件（`test-*.md`、`sub/`）是自测样例，随时可以删掉
