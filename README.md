# UniHub

一个基于 Electron 的现代化工具集应用，支持强大的插件系统。

## 📸 预览

<table>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/main.png" alt="主界面">
      <p align="center"><em>主界面</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/plugins.png" alt="插件管理">
      <p align="center"><em>插件管理</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/marketplace.png" alt="插件市场">
      <p align="center"><em>插件市场</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/settings.png" alt="设置页面">
      <p align="center"><em>设置页面</em></p>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <img src="docs/screenshots/dark-mode.png" alt="深色模式">
      <p align="center"><em>深色模式</em></p>
    </td>
  </tr>
</table>

## 特性

- 🔌 强大的插件系统 - 支持动态加载和管理插件
- 🎨 现代化 UI - 基于 Vue 3 + Tailwind CSS
- 🚀 高性能 - 使用 Vite 构建
- 📦 插件市场 - 内置插件市场，一键安装
- 🔒 权限管理 - 细粒度的插件权限控制
- 🔄 自动更新 - 支持应用自动更新，基于 GitHub Releases

## 💬 交流群

欢迎加入 UniHub 交流群，与其他开发者一起讨论和分享！

<table>
  <tr>
    <td align="center">
      <img src="docs/screenshots/wechat-group-qrcode.png" width="200" alt="微信群">
      <p><strong>微信交流群</strong></p>
    </td>
    <td align="center">
      <img src="docs/screenshots/qq-group-qrcode.png" width="200" alt="QQ群">
      <p><strong>QQ 交流群</strong></p>
    </td>
  </tr>
</table>

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建应用
pnpm build              # 所有平台
pnpm build:mac          # macOS
pnpm build:win          # Windows
pnpm build:linux        # Linux
```

## 插件开发指南

### 1. 插件结构

一个最简单的插件只需要两个文件：

```
my-plugin/
├── package.json        # 插件配置
└── dist/
    └── index.html      # 插件入口
```

### 2. package.json 配置

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "我的插件",
  "author": "你的名字",
  "unihub": {
    "id": "com.yourname.myplugin",
    "name": "我的插件",
    "icon": "🚀",
    "category": "tool",
    "entry": "dist/index.html",
    "permissions": ["clipboard"]
  }
}
```

#### 必填字段

| 字段       | 说明                         | 示例                      |
| ---------- | ---------------------------- | ------------------------- |
| `id`       | 插件唯一标识（反向域名格式） | `"com.yourname.myplugin"` |
| `name`     | 插件显示名称                 | `"我的插件"`              |
| `icon`     | 图标（Emoji 或 URL）         | `"🚀"` 或 `"https://..."` |
| `category` | 分类                         | `"tool"`                  |
| `entry`    | 入口文件路径                 | `"dist/index.html"`       |

#### 可选字段

| 字段          | 说明       | 示例                       |
| ------------- | ---------- | -------------------------- |
| `permissions` | 权限列表   | `["clipboard", "fs"]`      |
| `keywords`    | 搜索关键词 | `["tool", "utility"]`      |
| `homepage`    | 项目主页   | `"https://github.com/..."` |
| `repository`  | 代码仓库   | `"https://github.com/..."` |

#### 分类（category）

- `tool` - 工具
- `formatter` - 格式化
- `encoder` - 编码/解码
- `productivity` - 效率
- `developer` - 开发者工具
- `entertainment` - 娱乐
- `custom` - 自定义

#### 权限（permissions）

- `clipboard` - 剪贴板读写
- `fs` - 文件系统访问
- `http` - HTTP 请求
- `spawn` - 后端进程
- `db` - 数据库存储
- `notification` - 系统通知
- `system` - 系统信息

### 3. 创建插件

#### 方式一：纯 HTML（最简单）

创建 `dist/index.html`：

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>我的插件</title>
    <style>
      body {
        font-family: system-ui;
        padding: 20px;
      }
    </style>
  </head>
  <body>
    <h1>Hello UniHub!</h1>
    <button onclick="copyText()">复制文本</button>

    <script>
      function copyText() {
        // 使用 UniHub API
        if (window.unihub?.clipboard) {
          window.unihub.clipboard.writeText('Hello World!')
        }
      }
    </script>
  </body>
</html>
```

#### 方式二：使用 Vue + Vite（推荐）

参考 `examples/modern-vue-plugin` 示例。

### 4. UniHub API

插件可以通过 `window.unihub` 访问系统功能：

```javascript
// 剪贴板
window.unihub.clipboard.writeText('text')
window.unihub.clipboard.readText()

// 文件系统（需要 fs 权限）
window.unihub.fs.readFile(path)
window.unihub.fs.writeFile(path, content)

// HTTP 请求（需要 http 权限）
window.unihub.http.get(url)
window.unihub.http.post(url, data)

// 数据库（需要 db 权限）
window.unihub.db.get(key)
window.unihub.db.set(key, value)

// 通知（需要 notification 权限）
window.unihub.notification.show(title, body)
```

### 5. 打包插件

```bash
# 创建 plugin.zip
zip -r plugin.zip package.json dist/
```

或使用打包脚本（参考 `examples/` 中的示例）。

### 6. 发布插件

#### 方式一：提交到插件市场

1. 将 `plugin.zip` 上传到 GitHub Release 或 CDN
2. Fork 本项目，编辑 `marketplace/plugins.json`
3. 添加插件信息：

```json
{
  "id": "com.yourname.myplugin",
  "name": "我的插件",
  "version": "1.0.0",
  "description": "插件描述",
  "author": {
    "name": "你的名字",
    "email": "your@email.com"
  },
  "icon": "🚀",
  "category": "tool",
  "keywords": ["tool"],
  "permissions": ["clipboard"],
  "install": {
    "zip": "https://github.com/yourname/plugin/releases/download/v1.0.0/plugin.zip"
  },
  "homepage": "https://github.com/yourname/plugin",
  "repository": "https://github.com/yourname/plugin"
}
```

4. 提交 PR

#### 方式二：本地安装

用户可以直接拖拽 `plugin.zip` 到 UniHub 的插件管理页面安装。

## 示例插件

- `examples/simple-html-plugin` - 纯 HTML 实现的计算器
- `examples/modern-vue-plugin` - Vue 3 + TypeScript 实现的工具集
- `examples/h5-formatter-plugin` - HTML/CSS/JS 格式化工具

查看 `official-plugins/` 目录了解更多官方插件。

## 快捷键

| 功能       | macOS         | Windows/Linux     |
| ---------- | ------------- | ----------------- |
| 全局搜索   | <kbd>⌘K</kbd> | <kbd>Ctrl+K</kbd> |
| 新建标签   | <kbd>⌘N</kbd> | <kbd>Ctrl+N</kbd> |
| 关闭标签   | <kbd>⌘W</kbd> | <kbd>Ctrl+W</kbd> |
| 切换侧边栏 | <kbd>⌘B</kbd> | <kbd>Ctrl+B</kbd> |

## 技术栈

- Electron
- Vue 3
- TypeScript
- Vite
- Tailwind CSS
- reka-ui

## 许可证

MIT
