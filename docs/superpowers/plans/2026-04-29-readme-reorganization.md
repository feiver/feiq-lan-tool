# README Reorganization Plan

> **For agentic workers:** This plan records the documentation-only cleanup requested before commit and push.

**Goal:** 重组仓库 README，让项目定位、技术栈、功能地图、近期计划、运行方式、文档索引和 AI 协作说明更容易阅读。

**Scope:** 仅调整文档结构和仓库提交范围，不改变应用运行逻辑。

## Task 1: Rebuild README Structure

- [x] 保留项目定位和 FeiQ / 飞秋参考背景。
- [x] 将技术栈整理为表格。
- [x] 将冗长功能列表改为功能地图，按设备发现、消息联系人、文件传输、设置中心分组。
- [x] 添加近期计划，按 P0 / P1 / P2 标明优先级。
- [x] 保留本地开发、portable 打包、常用验证和 GitHub 仓库信息。
- [x] 保留“本项目使用 AI 协作完成”的说明。

## Task 2: Keep Commit Scope Clean

- [x] 不提交 `.vscode/`。
- [x] 不提交 `package-lock.json`。
- [x] 不提交 `dist/`、`release/`、`node_modules/`、`src-tauri/target*` 和构建日志。
- [x] 保留必要源码、测试、文档、PM 状态、脚本和 `.cargo/config.toml`。

## Verification Plan

- [ ] `npm.cmd run test -- app-shell`
- [ ] `npm.cmd run test`
- [ ] `cargo check`
- [ ] `git status --short` 检查暂存范围
