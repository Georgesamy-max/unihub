<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'

const editorRef = ref<HTMLDivElement>()
let vditor: Vditor | null = null

// UniHub API 类型定义
declare global {
  interface Window {
    unihub?: {
      storage?: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: string) => Promise<void>
      }
    }
  }
}

// 从本地存储加载内容
async function loadContent() {
  try {
    if (window.unihub?.storage) {
      const saved = await window.unihub.storage.get('markdown-content')
      return saved || getDefaultContent()
    }
  } catch (error) {
    console.error('加载内容失败:', error)
  }
  return getDefaultContent()
}

// 保存内容到本地存储
async function saveContent(content: string) {
  try {
    if (window.unihub?.storage) {
      await window.unihub.storage.set('markdown-content', content)
    }
  } catch (error) {
    console.error('保存内容失败:', error)
  }
}

// 默认内容
function getDefaultContent() {
  return `# 欢迎使用 Markdown 编辑器 📝

这是一个基于 Vditor 的 Markdown 编辑器，支持实时预览和丰富的语法。

## 功能特性

- ✅ **实时预览** - 即时渲染模式，所见即所得
- ✅ **语法高亮** - 支持代码块语法高亮
- ✅ **数学公式** - 支持 LaTeX 数学公式
- ✅ **图表支持** - 支持 Mermaid 流程图
- ✅ **自动保存** - 内容自动保存到本地

## 代码示例

\`\`\`javascript
function hello() {
  console.log('Hello, Markdown!')
}
\`\`\`

## 数学公式

行内公式：$E = mc^2$

块级公式：

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

## 表格

| 功能 | 支持 | 说明 |
|------|------|------|
| 实时预览 | ✅ | 即时渲染 |
| 代码高亮 | ✅ | 多语言支持 |
| 数学公式 | ✅ | LaTeX 语法 |

## 任务列表

- [x] 创建编辑器
- [x] 添加工具栏
- [ ] 添加更多功能

## 引用

> 这是一段引用文本
> 
> —— 作者

## 链接和图片

[UniHub 项目](https://github.com/t8y2/unihub)

---

开始你的 Markdown 创作之旅吧！ 🚀
`
}

onMounted(async () => {
  const initialContent = await loadContent()
  
  vditor = new Vditor(editorRef.value!, {
    height: '100%',
    theme: 'classic',
    mode: 'ir', // 即时渲染模式
    placeholder: '开始编写 Markdown...',
    toolbarConfig: {
      pin: true,
    },
    cache: {
      enable: false, // 禁用 Vditor 自带的缓存，使用 UniHub storage
    },
    counter: {
      enable: true,
      type: 'markdown',
    },
    preview: {
      markdown: {
        toc: true,
        mark: true,
        footnotes: true,
        autoSpace: true,
      },
      math: {
        engine: 'KaTeX',
      },
    },
    upload: {
      handler: (files) => {
        // 可以在这里处理图片上传
        return null
      },
    },
    after: () => {
      vditor?.setValue(initialContent)
      
      // 自动保存 - 每 3 秒保存一次
      setInterval(() => {
        const content = vditor?.getValue()
        if (content) {
          saveContent(content)
        }
      }, 3000)
    },
  })
})

onBeforeUnmount(() => {
  // 保存最后的内容
  const content = vditor?.getValue()
  if (content) {
    saveContent(content)
  }
  vditor?.destroy()
})
</script>

<template>
  <div class="editor-container">
    <div ref="editorRef" class="editor"></div>
  </div>
</template>

<style scoped>
.editor-container {
  height: 100vh;
  background: #fff;
}

.editor {
  height: 100%;
}

/* Vditor 样式覆盖 */
:deep(.vditor) {
  border: none;
}

:deep(.vditor-toolbar) {
  background: #fafafa;
  border-bottom: 1px solid #e5e5e5;
}

:deep(.vditor-toolbar__item) {
  color: #333;
}

:deep(.vditor-toolbar__item:hover) {
  background: #e5e5e5;
}
</style>
