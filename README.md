# feiq-lan-tool

一个参照 FeiQ 核心体验设计的跨平台局域网通信工具，目标是在同一局域网内提供稳定、直接、低配置成本的在线发现、即时消息和文件传输能力。

## 项目定位

- 面向局域网场景的跨平台桌面工具
- 优先实现 FeiQ 的核心替代能力，而不是界面复刻
- 首版聚焦 MVP，先把发现、通信、传输三条主链路跑通

## 技术栈

- 桌面容器：Tauri 2
- 后端能力：Rust
- 前端界面：React 19 + TypeScript
- 构建工具：Vite
- 前端测试：Vitest + Testing Library + jsdom
- 桌面桥接：`@tauri-apps/api`

## MVP 功能点

- 局域网设备自动发现
- 在线联系人列表
- 单聊消息发送与接收
- 广播消息发送
- 单文件传输
- 传输进度展示
- 本地昵称与下载目录配置

## 当前进度

- 已完成 Tauri + React + TypeScript 项目脚手架初始化
- 已完成前端测试运行基线接入
- 已开始局域网协议基础模型与协议编解码实现

## 本地开发

```bash
npm install
npm run test
npm run build
npm run tauri dev
```

## Git 仓库

- GitHub: [feiver/feiq-lan-tool](https://github.com/feiver/feiq-lan-tool)

## AI 协作说明

本项目在 AI 协作模式下完成，主要由 OpenAI Codex 与人工共同推进，包括需求分析、技术选型、实现计划拆解、代码编写、验证与迭代。
