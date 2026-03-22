# Minecraft 生成器项目

[English](./README.en.md)

基于 `Vite + Preact + TypeScript` 的 Minecraft 数据生成与编辑工具站，包含多种生成器页面、结构化 JSON 编辑能力，以及 `Mcdoc + Spyglass` 校验支持。

## 项目状态

- 当前运行路径：仓库根目录
- 已完成从旧子目录方案迁移（旧路径 `dialog-generator/`）

## 主要特性

- 多页面生成器站点（Vite 构建输出）
- 结构化 JSON 编辑与实时预览
- Mcdoc Schema 驱动编辑
- Spyglass 校验与诊断
- 资源与配置集中管理（`src/config.json`）

## 技术栈

- 前端：`Preact`
- 构建：`Vite`
- 语言：`TypeScript`
- 校验：`Mcdoc`、`Spyglass`
- 样式：`PostCSS`、`Tailwind CSS`

## 环境要求

- Node.js 18+
- npm 9+

## 快速开始

在仓库根目录执行：

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:3000
```

## 常用脚本

```bash
npm run dev      # 启动开发服务
npm run build    # TypeScript 检查 + 生产构建
npm run preview  # 预览构建产物
npm run lint     # ESLint 检查
```

## 目录结构

```text
.
├─ src/                 # 业务源码
├─ public/              # 静态资源
├─ package.json         # 依赖与脚本
├─ tsconfig.json        # TypeScript 配置
├─ vite.config.js       # Vite 配置
├─ postcss.config.js    # PostCSS 配置
├─ tailwind.config.js   # Tailwind 配置
└─ spyglass.json        # Spyglass 运行配置
```

## 说明

- 命令：`npm run dev`
- 路径引用：根目录相对路径（如 `src/...`、`public/...`）

建议同时检查 IDE 运行配置与 CI 工作目录，确保已切换到仓库根目录。

## 许可证

[MIT](./LICENSE)