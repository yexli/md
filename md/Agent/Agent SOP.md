# Agent SOP

面向在本项目里干活的 Agent，按顺序执行。

## 1. 先看目录，别先动代码

```text
md/              ← 唯一的数据源
src/utils/       ← 读取、解析、路径解析
src/components/  ← 界面模块
vite.config.js   ← 构建期复制 md 下的静态资源
```

## 2. 改 Markdown 相关内容时

- 新增文档：只往 `/md/` 里放文件，**不改代码**
- 改菜单结构：改 `documentLoader.js`
- 改渲染效果：改 `markdownRenderer.js` 或 `main.css`

## 3. 提交前必须做的三件事

1. `npm run build` 通过
2. `npm run dev` 打开页面，切换两篇文档、点一次复制
3. 确认 `/md/test-basic.md` 里的脚本没有被执行

## 4. 禁区

> 不要引入数据库、后端服务、状态管理库、UI 组件库。
> 不要为了一个复制按钮装一个框架。

## 5. 命名约定

| 类型 | 约定 | 示例 |
| --- | --- | --- |
| 组件文件 | 小驼峰 | `markdownViewer.js` |
| 工具文件 | 小驼峰 | `documentLoader.js` |
| CSS 类名 | BEM 风格 | `code-block__bar` |
| 文档文件 | 中文可读名 | `架构设计.md` |
