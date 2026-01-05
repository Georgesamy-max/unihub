# 共享 UI 组件

这个目录包含了所有插件可以共享的 UI 组件，与主应用保持一致的设计风格。

## 组件列表

### Button (按钮)

- 路径: `ui/button/`
- 使用 `class-variance-authority` 管理样式变体
- 支持多种变体: default, secondary, ghost, outline, destructive, link
- 支持多种尺寸: default, sm, lg, icon, icon-sm, icon-lg

### Input (输入框)

- 路径: `ui/input/`
- 支持 v-model 双向绑定
- 支持 type, placeholder, min, max 等属性

### Label (标签)

- 路径: `ui/label/`
- 简单的标签组件

### Checkbox (复选框)

- 路径: `ui/checkbox/`
- 基于 reka-ui 的 CheckboxRoot
- 支持 v-model:checked 双向绑定

### Sonner (通知提示)

- 路径: `ui/sonner/`
- 基于 vue-sonner
- 包含成功、错误、警告、信息等图标

## 使用方法

### 1. 复制组件到插件

```bash
# 复制所有 UI 组件
cp -r official-plugins/_shared/components/ui official-plugins/your-plugin/src/components/

# 复制工具函数
cp -r official-plugins/_shared/lib official-plugins/your-plugin/src/
```

### 2. 安装依赖

在插件的 `package.json` 中添加以下依赖：

```json
{
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-vue-next": "^0.562.0",
    "reka-ui": "^2.7.0",
    "tailwind-merge": "^3.4.0",
    "vue": "^3.5.13",
    "vue-sonner": "^2.0.9"
  }
}
```

### 3. 在组件中使用

```vue
<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'vue-sonner'

// 使用组件...
</script>

<template>
  <Toaster position="top-center" :duration="3000" rich-colors />

  <Button size="sm" @click="handleClick"> 点击我 </Button>

  <Label>
    <Checkbox v-model:checked="checked" />
    选项
  </Label>

  <Input v-model="value" placeholder="输入内容" />
</template>
```

## 样式配置

确保插件的 `src/style.css` 包含以下内容：

```css
@import 'tailwindcss';
@plugin "tailwindcss-animate";
@import 'tw-animate-css';

@custom-variant dark (&:is(.dark *));

/* 主题变量配置 */
:root {
  --radius: 0.5rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ... 其他变量 */
}

/* 导入 vue-sonner 样式 */
@import 'vue-sonner/style.css';
```

## 注意事项

1. 所有组件都使用 TypeScript
2. 组件样式基于 Tailwind CSS v4
3. 需要配置 `@/` 路径别名指向 `src/` 目录
4. Button 组件使用 reka-ui 的 Primitive 组件
5. Checkbox 组件依赖 reka-ui
6. 通知提示使用 vue-sonner

## 更新组件

当主应用的 UI 组件更新时，需要同步更新这里的共享组件：

```bash
# 从主应用复制最新的组件
cp src/renderer/src/components/ui/button/* official-plugins/_shared/components/ui/button/
cp src/renderer/src/lib/utils.ts official-plugins/_shared/lib/
```
