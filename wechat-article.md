# dsh-tui：DeepSeek 原生的 Claude Code 式终端体验，来了

> 备选标题：
> 1. dsh-tui：DeepSeek 原生的 Claude Code 式终端体验，来了
> 2. 把 Claude Code 的爽感搬到 DeepSeek：开源终端助手 dsh-tui
> 3. 一条命令，让 DeepSeek Harness 住进你的终端

## 你是不是也想要这个

用过 Claude Code 或 Codex CLI 的人，大概都会对那种工作方式上瘾：不离开终端，跟模型对话，看着它流式地思考、调工具、改文件，敏感操作弹出审批，Ctrl+O 随手展开细节。写代码的节奏不被打断，一切都发生在你熟悉的那个黑框框里。

但如果你想用的模型是 DeepSeek——或者更进一步，想把模型跑在自己机器上、完全离线地用——这种体验一直没有现成的选择。

DeepSeek 开源的 agent 框架 **DeepSeek Harness（dsh）** 已经把底层能力做齐了：插件化架构，"一切皆插件"，shell 执行、文件系统、子代理、技能、workflow、沙箱审批全是现成插件，npm 上已发布 `@deepseek-ai/dsh` 家族。但它官方目前只有 web 界面（`dsh web`）和一次性无头模式，没有交互式终端界面。

**dsh-tui** 补上了这块拼图。

## dsh-tui 给你什么

装上之后，`dsh --profile tui` 直接进入一个 Claude Code 式的全终端对话界面：

- **流式渲染**：模型输出和思考过程逐字实时渲染，不是等完整回复再刷屏
- **工具调用卡片**：每次工具调用一张卡片，Ctrl+O 三档切换（隐藏/预览/展开），信息密度自己控制
- **diff 渲染**：文件修改以 diff 展示，改了什么一眼看清
- **执行审批**：敏感操作弹出审批对话框，放行还是拒绝由你决定——复用 dsh 自己的沙箱审批机制
- **@ 文件引用**：输入 `@` 自动补全项目文件，直接喂给模型
- **斜杠命令**：`/model` 切换模型、`/resume` 恢复历史会话、`/compact` 压缩上下文
- **todo 与状态栏**：模型的任务规划、token 用量、上下文压力实时可见

## 我们的三个优势

**1. DeepSeek 原生。** dsh-tui 不是把别家 CLI 改个接口凑合用，而是直接作为 DeepSeek Harness 的标准插件构建，对 DeepSeek 模型的思考过程渲染、reasoning 配置开箱即用。

**2. 兼容 DeepSeek Harness 的所有插件。** dsh 的架构是"一切皆插件"，而 dsh-tui 与官方 web 界面共享同一套插件生态——shell、文件系统、子代理、技能、workflow、沙箱审批，官方有的它全有，第三方插件装上就能用。不 fork、不魔改，就是一个标准插件。

**3. 即时跟进上游更新。** DeepSeek Harness 迭代很快，我们承诺紧跟上游版本更新，dsh 出新能力，dsh-tui 第一时间适配。

## 开源，可审计，无恶意代码

dsh-tui 完全开源（github.com/openguardrails/dsh-tui），MIT 协议，每一行代码都可以审计。作为安全公司，OpenGuardrails 对供应链安全格外较真：发布版本已通过 Malware0 恶意代码检测，零检出。你在终端里授权它执行的每一步，都经过 dsh 的沙箱审批机制。

## 怎么用

两条命令：

```sh
# 安装（作为 dsh 插件装进 tui profile）
dsh plugin --profile tui add github:openguardrails/dsh-tui

# 启动
dsh --profile tui
```

想恢复上次的会话：

```sh
dsh --profile tui --resume <session-id>
```

## 用本地模型，完全离线

dsh-tui 不改一行代码就能对接任何 DeepSeek 兼容端点，三种方式任选：

```sh
# 方式一：环境变量
export DEEPSEEK_API_KEY=your-key
export DEEPSEEK_BASE_URL=http://localhost:8000/v1
```

```yaml
# 方式二：$DSH_HOME/settings.yaml（热加载，免重启）
llm-deepseek:
  baseURL: http://localhost:8000/v1
```

方式三：vLLM / SGLang 起的 OpenAI 兼容端点，用 dsh 内置的 llm-pi-ai 声明一个路由即可。

也就是说：一台自己的 GPU 机器 + 本地部署的 DeepSeek + dsh-tui，就是一套**完全离线的 Claude Code 体验**——代码不出内网，账单为零。

## 项目状态

dsh-tui 正在开发中，发布在即。欢迎到 GitHub 关注仓库动态，也欢迎关注 OpenGuardrails，第一时间获取发布消息。

---

*OpenGuardrails：让 AI agent 安全可控。*
