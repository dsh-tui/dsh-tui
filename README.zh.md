# @openguardrails/dsh-tui

[English](README.md) | 中文

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 智能体的交互式终端（TUI）入口——在终端里获得 Claude Code / Codex 同款的对话体验，以树外（out-of-tree）dsh 插件 bundle 的形式安装。基于 [`@earendil-works/pi-tui`](https://www.npmjs.com/package/@earendil-works/pi-tui) 构建。

它组合在官方 `@deepseek-ai/dsh-base` bundle 之上，与官方 web 界面共享同一套插件生态——shell 与文件系统工具、技能、子代理、工作流、沙箱审批——不 fork、不魔改。

![dsh-tui 会话](docs/tui.png)

## 功能

- 模型输出与思考过程的流式 Markdown 渲染
- 工具调用卡片（terminal / diff / generic 三种渲染意图）；Ctrl+O 三档切换：预览 → 展开 → 隐藏
- 工具审批与 `ask_user_question` 对话框，含 plan 模式评审
- `@文件` 路径自动补全与 `@session` 会话引用卡片
- 斜杠命令：`/model`（含推理力度选择）、`/resume`、`/compact`、`/details`、`/help`，以及其他插件注册的全部命令
- 常驻 todo 面板、token 用量与上下文压力状态栏、会话标题
- 可配置主题；从 `COLORTERM` 自动检测真彩色

## 安装

需要 Node `^22.19 || >=24` 和 `dsh` CLI（`npm i -g @deepseek-ai/dsh@next`）。

```sh
dsh plugin --profile tui add github:openguardrails/dsh-tui
dsh --profile tui                                      # 在当前目录开启会话
dsh --profile tui --resume <session-id>                # 恢复历史会话
```

git 安装的插件在安装时通过 `prepare` 脚本构建，pnpm 默认拦截构建脚本：若首次 `add` 失败，按它打印的键名在 `~/.dsh/profiles/tui/pnpm-workspace.yaml` 里追加 `allowBuilds` 后重跑——

```yaml
allowBuilds:
  "@openguardrails/dsh-tui": true
```

在环境变量（或启动目录 / `$DSH_HOME` 下的 `.env`）里设置 `DEEPSEEK_API_KEY`。

## 本地 / 自部署 DeepSeek 端点

零代码配置，三选一：

1. **环境变量**：`DEEPSEEK_BASE_URL=http://localhost:8000/v1` 搭配 `DEEPSEEK_API_KEY`。
2. **设置文件（热加载）**：`$DSH_HOME/settings.yaml`

   ```yaml
   llm-deepseek:
     baseURL: http://localhost:8000/v1
   ```

3. **OpenAI 兼容网关**（vLLM、SGLang 等）：在 profile 补丁（`$DSH_HOME/profiles/tui/cordis.patch.yml`）里声明一个 `llm-pi-ai` 路由并把默认模型指过去——参见 dsh 的 providers 指南。

## 开发

```sh
pnpm install   # 自动应用 pi-tui 补丁（patches/）
pnpm build     # tsc 类型声明 + tsdown 运行时打包
```

pi-tui 钉在 0.80.7 并带一个 pnpm 补丁（编辑器提示符前缀能力），构建时打包进 `lib/`，因此仓库之外的安装方永远不会拿到未打补丁的副本。

## 状态与已知限制

- 基于 pre-release 的 `@deepseek-ai/dsh` rc 线开发，上游稳定前随时可能 breaking；peer 依赖钉在验证过的 rc 版本。
- 恢复出来的测试套件（`tests/`）先于本次移植，目前尚不可运行。
- 真实模型回合需要可达的 DeepSeek 兼容端点；请求之前的一切（组合、渲染、审批、resume）无需 key 即可工作。

## 来源与许可

MIT。TUI 实现恢复自 DeepSeek Harness 仓库历史（`packages/ui/tui`，上游于 commit `10bb9cbf4a` 移除），并移植到已发布的 rc API；上游版权声明保留在 [LICENSE](LICENSE) 中。
