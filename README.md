# 新数网络调试工具 (NetCommand)

<p align="center">
  <strong>网络工程师必备的交换机配置命令生成工具</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/版本-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/许可证-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/Vue-3.5+-41b883.svg" alt="Vue">
  <img src="https://img.shields.io/badge/Element_Plus-2.13+-409eff.svg" alt="Element Plus">
</p>

---

## 📖 简介

**新数网络调试工具** 是一款基于 **Vue 3 + TypeScript** 开发的跨平台 Web 工具，将繁杂的交换机 CLI 配置转化为直观的表单操作，告别手写命令行！

支持 **华为(Huawei)**、**锐捷(Ruijie)**、**华三(H3C)** 三大主流厂商设备。

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 🎨 图形化配置 | 通过表单、开关、下拉框完成配置，所见即所得 |
| 📋 实时预览与复制 | 右侧代码面板实时生成命令，一键复制单模块或全部 |
| 🔧 丰富模块 | 基础、VLAN、STP/MSTP、DHCP、路由、接口聚合、SSH/Telnet、SNMP、ACL/QoS、NTP |
| 📝 自定义命令 | 手动添加任意 CLI 命令块 |
| 🏷️ 多标签页 | 同时配置多台设备，轻松管理大型项目 |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 📦 技术栈

- **前端框架**: Vue 3 (Composition API)
- **开发语言**: TypeScript
- **构建工具**: Vite
- **UI 组件库**: Element Plus
- **状态管理**: Pinia
- **图标库**: @element-plus/icons-vue
- **路由**: Vue Router 5

## 📁 项目结构

```
src/
├── generator/       # 命令生成引擎（三厂商适配）
├── modules/         # 各配置模块组件
├── store/           # Pinia 状态管理
├── types/           # TypeScript 类型定义
├── views/           # 主视图布局
└── styles/          # 全局样式
```

## 📄 版权信息

```
Copyright (c) 2026 四川新数科技有限公司
All rights reserved.

本项目采用 MIT 许可证发布。
详见 LICENSE 文件。
```
