# 基础语法测试

这一段用来验证最常用的 Markdown 元素。

## 文字样式

**粗体文字**、*斜体文字*、***粗斜体***、~~删除线~~、`行内代码`、普通文字。

## 无序列表

- 第一项
- 第二项
  - 嵌套项 A
  - 嵌套项 B
- 第三项

## 有序列表

1. 第一步
2. 第二步
   1. 子步骤
   2. 子步骤
3. 第三步

## 引用

> 这是一段引用。
>
> 引用里可以有 **粗体**，也可以有列表：
>
> - 引用内的列表项

## 链接

- 外部链接：[Example](https://example.com)
- 站内链接：[回到使用指南](使用指南.md)
- 带锚点链接：[跳到二级标题](#二级标题)

## 分隔线

---

## 二级标题

用于验证锚点跳转。

## 安全 HTML 测试

下面这些是**安全的** HTML，应当正常保留显示：

<details>
<summary>点开看折叠内容</summary>

折叠区域里的文字，支持 **Markdown** 吗？—— 块级 HTML 内部按原样输出。

</details>

按 <kbd>Ctrl</kbd> + <kbd>S</kbd> 保存。水的化学式是 H<sub>2</sub>O，平方写作 x<sup>2</sup>。

下面这些是**危险的**，应当被过滤掉，页面上不应出现任何弹窗或跳转：

<script>alert('XSS-通过 script 标签执行')</script>

<img src="x" onerror="alert('XSS-通过 onerror 执行')">

<a href="javascript:alert('XSS-通过 javascript 协议执行')">这个链接不该能执行脚本</a>

<iframe src="https://example.com"></iframe>

如果页面没有弹窗、上面的 script 标签没有出现在页面源码里，说明过滤生效。
