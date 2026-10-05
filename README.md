# Markdown Wiki 阅读器

> 文件即知识库，Markdown 即内容，Wiki 即阅读界面。

读取 `/md/` 目录里的 Markdown 文件，自动生成一个 Wiki 阅读界面。
没有数据库、没有后端接口、没有构建脚本——Markdown 文件本身就是数据源。

部署之后往服务器的 `md/` 目录里丢一个 `.md` 文件，**刷新页面就能看到**（需要服务器开启目录列表，见「部署」一节）。

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

**不需要修改任何代码，也不需要重新构建。**

程序启动时读一次 `/md/` 的目录列表，读到什么就显示什么：

- **服务器支持目录列表**（nginx 开 `autoindex_format json`，见「部署」一节）：往 `md/` 里丢文件立刻生效
- **服务器不支持**（对象存储、GitHub Pages 等）：回退到 `npm run build` 时打包进 JS 的那份文档快照，新增文档需要重新构建
- **本地开发**（`npm run dev`）：开发服务器自带同样的目录列表，行为与线上一致

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
├── vite.config.js               ← 构建配置：复制整个 md/ 目录、本地目录列表中间件
└── src/
    ├── main.js                  ← 入口
    ├── App.js                   ← 装配模块，管理 URL、阅读记忆、移动端抽屉
    ├── components/
    │   ├── sidebar.js           ← 目录树、当前项高亮、折叠
    │   ├── toc.js               ← 右侧大纲：四级嵌套、章节跳转、滚动高亮
    │   ├── search.js            ← 标题 + 正文搜索
    │   ├── markdownViewer.js    ← 正文渲染、代码复制、站内链接跳转
    │   └── copyButton.js        ← 复制与轻提示
    ├── utils/
    │   ├── documentLoader.js    ← 读取 /md/（目录列表或构建快照）、提取标题、构建目录树
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
- 屏幕够宽时（≥1360px）右侧出现**本文大纲**：按 `#` / `##` / `###` / `####` 四级嵌套成目录树，每层带缩进竖线、字号与字重逐级区分；滚动时自动高亮当前章节，点击平滑跳转并把锚点写进地址栏，可以直接分享到某一节

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

外链自动新窗口打开。图片可以放在 `md/` 目录里的任何位置，会被原样发布到 `/md/` 下。

---

## 技术选型

运行时只有三个依赖，各司其职：

| 依赖 | 用途 |
| --- | --- |
| `markdown-it` | Markdown 解析 |
| `highlight.js` | 代码语法高亮 |
| `dompurify` | HTML 白名单过滤 |

构建工具是 Vite，只在开发和构建时用，产物是纯静态文件。文档发现是两级策略：

```js
// 首选：读服务器 /md/ 的目录列表（nginx autoindex_format json，或本地开发服务器的等价中间件）
// 回退：读构建时打包进 JS 的快照
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

### 静态服务器（Nginx / 宝塔面板）

服务器上的 `md/` 是你自己的文档，**更新界面时不该去动它**。所以分两步：

```bash
npm run build
python deploy/pack.py      # 生成不含 md/ 的部署包
```

产物是 `wiki-dist.zip` 和 `wiki-dist.tar.gz`，里面**只有 `index.html` 和 `assets/`**，解压到站点根目录即完成更新，服务器上已有的 `md/` 原封不动。需要连本地文档一起打包时加 `--with-md`。

服务器上不需要 Node。文件名全是 ASCII，任何解压工具都不会出现中文乱码（这曾经是 zip 解压的老问题，现在连碰都碰不到了）。

想让**往服务器 `md/` 目录里丢文件就即时生效**，给 nginx 加两行：

```nginx
location /md/ {
    autoindex on;
    autoindex_format json;
}

# 图片缓存：正则只匹配到文件结尾，别写成 ^/md/images/，那样会把目录请求也截走
location ~* ^/md/.*\.(png|jpe?g|gif|svg|webp|ico)$ {
    expires 7d;
}
```

`autoindex_format json` 需要 nginx 1.7.9 以上（宝塔、各大面板自带的版本都满足）。没配这两行站点也能正常跑，只是新增文档后需要重新构建上传。

### 对象存储

腾讯云 COS、阿里云 OSS 这类没有目录列表能力的托管，直接传 `dist/` 内容即可，新增文档后重新构建上传。

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

### 与 GitHub 保持同步

改造之后，**日常只需要同步 `md/` 目录**——它是运行时读取的，同步完刷新页面就生效，不需要构建，也不需要重启任何服务。界面代码（`index.html` / `assets/`）是构建产物，只在改 `src/` 时才需要重新生成。

在服务器上克隆一份仓库（放在站点目录之外）：

```bash
cd /www/wwwroot
git clone git@github.com:yexli/agent-plan.git agent-plan
```

仓库是私有的，需要在服务器上配一把只读部署密钥：

```bash
ssh-keygen -t ed25519 -f ~/.ssh/wiki_deploy -N "" -C "md.oneyer.cc"
cat ~/.ssh/wiki_deploy.pub
```

把输出的公钥贴到仓库 **Settings → Deploy keys → Add deploy key**（不要勾选 Allow write access），然后在服务器 `~/.ssh/config` 里加：

```text
Host github.com
  IdentityFile ~/.ssh/wiki_deploy
  IdentitiesOnly yes
```

接着把 [deploy/sync-wiki.sh](deploy/sync-wiki.sh) 放到服务器上（例如 `/www/wwwroot/sync-wiki.sh`），给执行权限，然后建一个宝塔计划任务定时跑它：

```bash
chmod +x /www/wwwroot/sync-wiki.sh
/www/wwwroot/sync-wiki.sh
```

宝塔 → **计划任务** → 添加任务 → 类型 `Shell 脚本` → 周期按需要（比如每 5 分钟）→ 内容填 `/www/wwwroot/sync-wiki.sh`。

之后你在本地改完文档，`git push` 一提交，服务器到点自动更新；想立刻生效就在计划任务里点一次「执行」。

**首次部署时** `index.html` 和 `assets/` 还得手动传一次（它们是构建产物，不在仓库里）。如果希望服务器连界面代码也自动重建，在服务器上装 Node（宝塔软件商店 → Node 版本管理器），然后把脚本末尾那几行注释打开。

---
### 加文档之后

| 场景 | 做法 |
| --- | --- |
| nginx 开了 `autoindex`（本项目的推荐配置） | 直接把 `.md` 传进服务器的 `md/` 目录，刷新页面即生效，**不用构建、不用重启** |
| 对象存储 / GitHub Pages / 托管平台 | 内容在构建时打包进 JS，需要重新构建上传，或 push 让平台重新构建 |
| 本地开发 | 新文件即时生效，开发服务器提供同样的目录列表 |

---

## 说明

- 本地改完样式后如果页面没更新，重启一次 `npm run dev`（偶发的样式模块缓存不失效）
- 服务器模式下启动时会把 `/md/` 里所有文档读进内存（菜单标题和全文搜索都需要），几十到几百篇都很轻
- 回退模式下文档内容打包进 JS，产物约 320 KB（gzip 约 124 KB）
- `dist/` 里包含 `md/` 目录的完整副本（含 `.md` 原文），这是运行时读取的前提；纯静态托管用不到它也不受影响
- 部署到子路径时用 `npm run build -- --base=/xxx/`，`base` 会同时作用于文档读取路径和图片
- `/md/` 下的测试文件（`test-*.md`、`sub/`）是自测样例，随时可以删掉
