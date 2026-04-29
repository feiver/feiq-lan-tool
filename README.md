# feiq-lan-tool

参照 FeiQ / 飞秋核心体验设计的跨平台局域网通信工具。项目目标是在同一局域网内提供低配置成本的设备发现、即时消息、文件投递、群组发送、传输进度和网络诊断能力。

本项目由人工提出需求与验收方向，主要实现、计划拆解、测试补充和文档整理由 OpenAI Codex 辅助完成。

## 当前状态

- 阶段：MVP 持续迭代
- 桌面平台：Tauri 2 跨平台桌面应用
- 主界面：联系人 + 会话双栏
- 设置中心：独立窗口
- 最近验证：
  - `npm.cmd run test -- app-shell`：111 passed
  - `npm.cmd run test`：118 passed
  - `cargo check`：通过

## 技术栈

| 层级 | 技术 |
|---|---|
| 桌面容器 | Tauri 2 |
| 后端 | Rust |
| 前端 | React 19 + TypeScript |
| 状态管理 | Zustand |
| 构建 | Vite |
| 测试 | Vitest + Testing Library + jsdom |
| 桌面桥接 | `@tauri-apps/api` |

## 功能地图

### 设备发现与网络

- 局域网设备自动发现
- 手动网段主动探测，参照 FeiQ2013 “其他网段好友”思路
- 在线设备归因
- 网段状态标签：本次新增命中、已有在线设备、当前未命中
- 手动网段 CIDR 校验
- 刷新状态、最近刷新时间、本次新增发现数
- 最近刷新历史本地持久化、失败筛选、展开详情、失败重试
- 刷新失败诊断摘要复制和分类排查建议
- 无在线设备、无有效网段、无命中网段、连续失败等场景的直接提示与操作入口

### 消息与联系人

- 在线联系人列表与选择联动
- 单聊消息发送与接收
- 广播消息发送
- 运行期实时消息上屏
- 联系人未读数字提示
- 联系人待接收文件投递提示
- 联系人单行智能摘要：待接收文件、传输中、未读、最近消息预览
- 应用内横幅提醒：
  - 非当前会话的单聊消息 / 文件投递触发
  - 支持查看、关闭、6 秒自动消失
  - 可在“聊天与通知”设置中关闭

### 文件传输

- 文件投递请求、接收、取消
- 多文件选择
- 目录选择
- 拖拽上传
- 保留目录结构的相对路径重建
- 传输任务状态与进度展示
- 下载目录配置
- 接收完成后打开目录

### 设置中心

当前设置分组：

- 个人与身份：昵称、展示方式、个人状态、设备 ID 只读
- 聊天与通知：Enter 发送消息、广播前确认、应用内横幅提醒开关、收到单聊自动切换到来源会话、收到文件投递自动切换到来源会话
- 文件传输：下载目录、接收前确认、完成后打开目录、保留目录结构
- 网络与发现：发现方式、手动网段、立即刷新、刷新结果、刷新历史、网络诊断
- 显示与通用：托盘显示、关闭窗口行为、托盘菜单显示主窗口 / 退出

## 近期计划

### P0：体验闭环

- 完善群组发送体验：群组创建、在线成员识别、群组内批量投递
- 补齐聊天通知策略：免打扰、提醒粒度、广播提醒边界
- 优化文件投递确认流：接收目录选择、取消回馈、完成后打开目录

### P1：稳定性

- 梳理运行期消息、文件投递、传输任务的持久化边界
- 扩展 SQLite 聊天记录查询与恢复能力
- 增加跨设备异常场景测试：离线、端口不可达、部分文件失败

### P2：发布

- 优化 Windows portable 包
- 补充 macOS / Linux 打包说明
- 建立发布前检查清单：测试、构建、打包、基础手工验收

本次 README 重组计划见：

- [docs/superpowers/plans/2026-04-29-readme-reorganization.md](docs/superpowers/plans/2026-04-29-readme-reorganization.md)

## 本地开发

```bash
npm install
npm run test
npm run build
npm run tauri dev
```

Windows GNU Rust toolchain 下，项目通过 `.cargo/config.toml` 使用 `scripts/gcc-linker-wrapper` 切到 `ld.lld`，避免旧版 GNU `ld` 在当前 Rust 版本下的链接兼容问题。

## Portable 打包

```bash
npm run build
npm run package:portable
```

本地生成：

```text
release/feiq-lan-tool-portable-win64.zip
```

解压后直接运行 `feiq-lan-tool.exe`。压缩包内会带上 `WebView2Loader.dll`。

## 常用验证

```bash
npm.cmd run test -- app-shell
npm.cmd run test
cargo check
```

`cargo check` 在 `src-tauri` 目录下执行。

## 文档索引

- PM 状态：`.codex-orchestrator/status.md`
- 任务表：`.codex-orchestrator/tasks.json`
- Superpowers 规格：`docs/superpowers/specs/`
- Superpowers 实现计划：`docs/superpowers/plans/`

## Git 仓库

- GitHub: [feiver/feiq-lan-tool](https://github.com/feiver/feiq-lan-tool)

## AI 协作说明

本项目明确使用 AI 协作完成。OpenAI Codex 参与了需求分析、FeiQ/飞秋行为拆解、技术选型、任务规划、代码实现、测试补充、验证执行和 README 整理。人工负责方向确认、交互验收、取舍决策和最终发布判断。
