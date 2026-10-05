# 代码块测试

## JavaScript

```javascript
const wiki = {
  name: 'Markdown Wiki',
  docs: [],
  async load(id) {
    const res = await fetch('/md/' + id);
    return res.text();
  },
};

wiki.load('项目介绍.md').then((text) => console.log(text.length));
```

## TypeScript

```typescript
interface Doc {
  id: string;
  title: string;
  content: string;
}

function findDoc(docs: Doc[], id: string): Doc | undefined {
  return docs.find((doc) => doc.id === id);
}
```

## HTML

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

## CSS

```css
.code-block {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
```

## JSON

```json
{
  "title": "架构设计",
  "path": "md/开发指南/架构设计.md",
  "tags": ["wiki", "markdown"]
}
```

## Python

```python
from pathlib import Path


def collect(root: Path) -> list[Path]:
    """收集目录下所有 Markdown 文件。"""
    return sorted(p for p in root.rglob("*") if p.suffix in {".md", ".markdown"})
```

## Java

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Wiki");
    }
}
```

## C#

```csharp
using System;

public class Program
{
    public static void Main() => Console.WriteLine("Hello, Wiki");
}
```

## C++

```cpp
#include <iostream>

int main() {
    std::cout << "Hello, Wiki" << std::endl;
    return 0;
}
```

## Shell

```bash
npm install
npm run build
npm run preview
```

## SQL

```sql
SELECT id, title, path
FROM documents
WHERE title LIKE '%架构%'
ORDER BY updated_at DESC
LIMIT 20;
```

## Markdown（嵌套反引号）

````markdown
```js
console.log('三反引号嵌套在四反引号里');
```
````

## 没有语言标记

```text
纯文本代码块，不做高亮，但依然可以复制。
```
