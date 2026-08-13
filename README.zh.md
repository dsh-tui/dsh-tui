# @deepseek-ai/dsh-tui

[English](README.md) | 中文

DeepSeek Harness agent（智能体）的交互式终端入口，基于 [`@earendil-works/pi-tui`](https://www.npmjs.com/package/@earendil-works/pi-tui) 构建。它要求 stdin 和 stdout 均为 TTY；脚本和 Loader pipe 应改用单次执行的 [`@deepseek-ai/dsh-cli-demo`](../../examples/cli-demo/README.md) app。

已实现的 [TUI 功能 Agent Note（agent 决策记录）](../../../.agents/notes/implemented/feature/2026-07-17-dedicated-full-screen-tui-front-door.md)持有终端入口决策；[文件引用自动补全 Agent Note](../../../.agents/notes/implemented/feature/2026-07-23-tui-file-reference-autocomplete.md)持有仅路径的 `@file` 行为；[终端状态快照 Agent Note](../../../.agents/notes/implemented/testing/2026-07-18-tui-terminal-state-snapshots.md)持有其验证策略。

支持 macOS、Linux 和 Windows 上的交互式终端。Windows 使用 pi-tui 原生控制台 VT 输入处理；[Windows 支持 Agent Note](../../../.agents/notes/implemented/feature/2026-07-20-windows-tui-support.md)持有平台决策与 ConPTY 进程验证。

本包（package）只持有交互式终端展示和输入。它注入 `agents`、[`commands`](../commands/README.md)、`llm`、`systemPrompt`、`tokenMeter`、`tools` 和 `userInteraction`，可选读取 `skills` 服务（仅在已挂载时存在），然后驱动由 app 或开发者代码创建或恢复的 agent。Agent 生命周期、持久化与模型侧 [`ask_user_question`](../tool-ask-user/README.md) 工具仍是独立组合项。

终端成功启动后，本包会提供终端本地的 `ctx.tui` 扩展服务。注入该服务的插件可以使用组件工厂和受限布局选项调用 `openOverlay()`；宿主会公开 viewport、语义化主题（包括终端安全的 DeepSeek `brand` 样式）、显示文本转义、重绘、关闭和生命周期信号，但不公开 pi-tui 树、终端、焦点控制器或 overlay 句柄。插件 overlay、模型选择器和用户问题共用一个 FIFO 模态队列。每个请求都是调用方插件 fiber 的 effect，因此卸载会移除排队工作，或在清理结算前关闭可见工作；终端关闭会先卸载依赖项，再停止 pi-tui。Overlay 状态不会记录或回放。组件代码受信任，可以渲染 ANSI 样式，但必须通过 `host.display()` 处理不受信任文本。[交互式扩展 Agent Note](../../../.agents/notes/implemented/architecture/2026-07-22-tui-interactive-extension-service.md)持有该边界和未采用的替代方案。

TUI 从追加来源的会话事件重建已恢复历史，渲染 Markdown 响应与 reasoning，将每个工具的 `presentCall` / `presentResult` 意图应用到终端、diff 或通用卡片，把站立的 `todo/write` 计划保留在编辑器上方（下一个 `turn/start` 时清空），并在 transcript／状态区域与编辑器之间内联展示 `ctx.userInteraction` 问题。问题面板会显示进度、编号选项、换行标签和另行缩进的描述；它同时遵守 `maxQuestionOptions` 和 `questionDialogMaxHeight`，用 `↑ N more`／`↓ N more` 标记隐藏选项，并在保持编辑器可见的同时，通过 Page Up 和 Page Down 先分页浏览过长的问题／详情内容，再分页浏览单个超大的选中块。最新记录的会话标题成为 header 副标题；标题不存在时使用 `welcome`，终端窗口标题则变为 `<session title> — <configured title>`。持久 `llm/retry` 事件会撤回失败步骤的实时 chunk，并在 transcript（文本记录）中渲染计划重试次数、延迟和失败；成功、耗尽与取消随后通过普通会话事件结算。Footer 会对每个已记录模型步骤的用量只计一次，包括失败尝试；对于没有用量 chunk 的日志，以已提交消息的用量回退。其空闲视图会将 token-meter 压力与 `ctx.llm.resolveModelInfo()` 为当前路由返回的上下文容量进行比较；适配器没有容量元数据时显示 `context unknown`，并显示工具卡片模式、当前模型，以及任何显式选择的推理强度。Agent 运行时，这些摘要会替换为已经过工作时间指示器和 `esc interrupt`。表层替换从不重写已渲染的 transcript：被它遮蔽的对话仍可阅读，而已落地的压缩（compaction）检查点会在其日志位置添加一行暗色 `… earlier context was compacted …` 标记，因此终端报告的是模型从何处起不再看到那段历史，而不是把它抹掉。仅供模型使用的替换副本——被裁剪的工具结果、重新生成的 assistant 消息——不渲染任何内容。

如果逻辑工作区标签与会话宿主目录不同，嵌入方可以提供 `TuiRuntime.formatCwd`。该覆盖只改变 footer 标签；工具仍使用会话 `cwd`。

在模型输出、会话事件、工具 presenter、问题、配置或诊断到达 pi-tui 的 ANSI 感知 renderer 或终端标题前，TUI 会把换行之外的 C0 和 C1 控制字符渲染为可见 `\xNN` 文本。这些来源无法添加终端控制序列；终端渲染与样式仍由 TUI 和 pi-tui 持有。

在 token 边界输入 `@` 会搜索会话工作目录下的文件和目录。没有路径的模糊查询使用可复用的有界工作区索引；包含 `/` 的查询直接列出该目录，选择文件夹后会保持补全开启以继续深入。含空白的路径会插入为 `@"path with spaces"`。选择文件只会插入其路径和一个尾随空格：TUI 不会读取文件、附加隐藏上下文，也不会把路径替换为引用对象。注册模型侧 `read` 工具后，TUI 会添加一条固定系统提示词指令，要求模型在需要显式路径内容时读取该路径。

挂载可选的 `ctx.sessionReferences` 后，同一个 `@` 菜单还会提供仅含元数据的会话候选项，插入 `@[label](dsh-session:<payload>)`，并在分派前准备所选快照。会话引用保持结构化，因为模型没有类似文件系统的工具可在稍后检索会话快照。准备期间会禁止重复提交，并在失败时恢复编辑器输入。TUI 会在异步准备后根据状态选择 `agent.steer()` 或 `agent.followup()`，因此空闲 followup 仍会分派 `agent/prompt-submit`，而轮次中的 steering 会在检查点加入且不触发该 hook。

Agent 运行时，普通编辑器提交会调用 `agent.steer()`；其他时候调用 `agent.followup()`。提交行以斜杠开头时会改为进入 `ctx.commands`：已知命令直接执行，未知命令产生警告，两条路径都不会自动到达模型。命令生产方可以显式调度 agent 工作；[`dsh-plan-mode`](../../plan/plan-mode/README.md#model-and-human-surfaces) 使用该契约实现 `/plan [message]`。TUI 将 `/help`、`/model`、`/clear`、`/details`、`/palette`、`/reload`、`/resume`、`/status` 和 `/exit` 注册为 agent 作用域定义；其他所有有效命令都会动态加入自动补全与 `/help`，`/skill:` 补全也相同。编辑器上方的状态行会报告 TUI 从会话事件派生的轮次阶段，包括等待首个 token、思考、响应或执行工具；它显示该阶段已经过时间和运行中的步骤总数，每秒刷新，并以 `Enter sends steering, Esc cancels` 提示结尾。Steering 消息等待到达模型期间，会在提示前插入 `N queued ·` 徽标，每条消息排空后随即清除。在实时独立压缩（compaction）标记对处于开启状态期间，提示词上方会显示固定的 `Context being compacted <elapsed>` 状态行，空闲提示符光标会变成占一个终端字符单元并呈呼吸律动的 `⊙`，终端进度状态则会保持活跃，直至标记对闭合；该状态行和字形共用标记对的同一个刷新定时器。该实时状态绝不会从日志中重建；闭合失败时会向 transcript 添加 `Compaction failed: <error>`，而恢复会话时遇到的陈旧未匹配 start 绝不会激活该指示器（[决策](../../../.agents/notes/implemented/feature/2026-07-30-compaction-progress-visibility.md)）。Ctrl+C 或 Escape 会取消运行中的轮次。工具卡片与注入上下文卡片都把长主体折叠为可配置的头尾预览；Ctrl+O 让工具卡片在折叠预览、完整输出、隐藏三种状态间循环——隐藏阶段把工具卡片从 transcript 中完全去掉，而上下文卡片保持预览，因为注入的指令不属于工具流量。隐藏阶段还会把每个轮次的 assistant 步骤折叠为一条消息：第一个有可见文本或 reasoning 的步骤保留该轮次唯一的 `Assistant` 标题，之后的步骤渲染为无标题的续段，没有可见正文的步骤则不渲染任何内容；离开隐藏阶段会恢复每步各自的标题。注入上下文卡片把消息渲染为文本，并去掉生产方的外层提醒外框，因此折叠与去外框都不依赖载荷的语法。Ctrl+R 切换 reasoning，Ctrl+L 重绘，Ctrl+D 在空闲时退出。`/details` 命名的正是这两个快捷键循环的同一份状态：不带参数时打开一个居中的键盘开关，每个维度一个条目——`Tool cards` 与 `Reasoning`——显示实时值，Tab 循环高亮条目并立即应用变更（对话框背后的 transcript 即是预览），Enter、Esc 或 Ctrl+C 关闭；`/details collapsed|expanded|hidden` 让工具卡片直接跳到该阶段，`/details reasoning [on|off]` 设置——或裸 `reasoning` 切换——reasoning 块显示；参数可在一次调用中组合，未知参数会以用法行报错，组合调用先应用 reasoning，使其 transcript 重建不会丢掉卡片通知。

`/model` 将建议性的 `ctx.llm` catalog 打开为键盘选择器：列表上方设有一个过滤框，按对每行 `provider/model` 标签、模型名称和描述的大小写不敏感子串匹配来缩小行集，并在高亮行仍通过过滤时保持其选中状态；Up/Down 移动，Shift+Tab 按显示顺序循环切换适配器为焦点模型公布的推理强度，Enter 选择模型和推理强度，Escape 会先清除非空过滤内容，再次按下才关闭选择器。适配器未公布默认推理强度时，循环还会包含 `Default`，该项会清除显式选择并保留提供方默认行为；没有可选推理强度元数据的模型会忽略 Shift+Tab。选择器会原样呈现公布的推理强度列表（包括存在时的 `off`），不会合成、自动调整或在模型之间转移推理强度。`/model <model>` 仍可直接选择无歧义的模型 id，`/model <provider>/<model>` 则选择精确目标，并在存在时使用其适配器默认值。已配置目标或最新记录的请求 header 会初始化选择器；由于 catalog 仅提供建议，未列出的当前模型仍会显示。选择仅对本 TUI 会话有效。提示词组装会为一个步骤建立目标快照，替换 `{{provider}}` 和 `{{model}}`，并通过 `agent/request` 应用同一个提供方／模型／推理强度目标；因此组装期间的切换会从后续步骤开始生效。请求 header 会持久记录真正到达模型的目标，未使用的选择则只存在于进程本地。

`/reload`（实验性，仅开发环境）会重新读取所有基于文件的 loader 配置树，并把 diff 应用到运行中 app：它手动调用 HMR（热模块替换）watcher 的配置路径；上下文中必须有 cordis Loader，否则退化为警告。它只在 agent 空闲时运行，并拒绝 reload 进行期间的再次进入。模块源代码热重载仍由 watcher 持有。挂载 `skills` 服务后，`/skill:<name> [instructions]` 会把该 skill 的指令作为一个 user 轮次加载到会话中；自动补全列出用户可调用的 skill，按精确名称调用时也会拒绝用户策略禁用的 skill。

Footer 将会话报告的用量汇总为 `↑<uncached input> ↓<output>`；任何输入计费后，后面会显示 `cache <rate>%`，表示提供方缓存服务的已计费提示词 token 占比（未缓存输入加缓存读写），并四舍五入为百分比。它还会将 token-meter 压力与 `ctx.llm.resolveModelInfo()` 为当前路由返回的上下文容量进行比较（适配器没有容量元数据时省略上下文占比），并显示当前模型和工具卡片模式；footer 过窄时，右侧会优先裁剪。

`/status` 会向 transcript 添加一张时间点诊断卡片，并在 agent 运行时保持可用。它报告会话 id、标题、工作目录、所选提供方／模型、所选推理强度或默认行为、reasoning 块可见性、agent 状态、事件／轮次／步骤／工具调用计数、精确输入／输出／缓存 token bucket、KV-cache 命中率、token-meter 上下文用量与容量、创建时间和最新事件时间。缺失标题、模型、缓存输入或上下文容量时会明确标记，而非推断。该卡片只存在于终端，不会重复紧凑 footer。

`/resume` 会打开全 viewport 键盘选择器，而非居中对话框。选择器在命令执行时立即打开并接管输入焦点，会话扫描仍在进行时显示加载占位符，直到行数据就绪；Escape 取消进行中的扫描，方式与取消已加载列表相同。两个作用域覆盖同一候选项集合：打开时所处的当前工作区，以及按 Tab 切换到的所有工作区。搜索字段下方的作用域行会给出当前作用域的名称以及另一个作用域包含的数量，且在所有工作区作用域中每行还会报告自身所属的工作区。切换会清除搜索与选择，使高亮行始终属于可见列表。

获得焦点的搜索字段紧跟搜索 glyph 开始，并发出 pi-tui 的 cursor marker，使终端 IME 组合保持锚定在字段内。行数据不读取任何完整日志：挂载可选的投影缓存时，标题来自实时投影注册表或持久化 checkpoint 行，冷读取只折叠 checkpoint 之后的日志尾部（并写回，使下次扫描零 I/O，受 `resumeScanConcurrency` 约束）；未挂载缓存的组合回退到一次对日志的有界批量标题读取。候选项按元数据活动时间排序——实时会话取内存中最后一个事件的时间，否则取持久化产物的 mtime，再回退到创建时间——可按标题或会话 id 搜索，在所有工作区作用域中还可按工作区标签搜索；每行报告该时间戳、current/live/persisted 状态和 id。Up/Down 与 Page Up/Page Down 导航，Enter 恢复，Escape 会先清除非空搜索，再次按下才取消，Ctrl+C 则直接取消。当前会话、已在本运行时中活跃的会话、不可读日志，或没有可运行的已记录工作区的会话仍会显示，但不可选择；不同于当前工作区的工作区属于作用域而非禁用原因，因为恢复会进入该目录。

选择时会重复这些检查，完整读取并回放验证所选中的那一份日志，在其日志所记提供方没有当前适配器时拒绝，并要求当前 agent 空闲，随后 flush 当前会话。TUI 接着停止终端 UI，并以所选 id 和在预检时重新读取的工作区调用由宿主持有的可选 `TuiRuntime.handoffResume`：文件系统与 shell 工具解析所依据的是进程 cwd，而非恢复出的会话头部，因此宿主必须进入该目录。存在 `process.execve` 时，发布的 `dsh` 宿主会先 chdir 进入该目录，再对 app 执行 dispose 并替换自身进程，并在终端仍可恢复时拒绝不可达的目录。恢复操作保留相同的 `SessionId`、transcript、标题、todo 和持久目标；目标激活仍保持解除，TUI 会要求用户确认或执行 `/goal resume`。

退出时打印的行由启动器拥有，不可通过配置指定。启动器在启动上下文上提供 `TUI_GOODBYE_MESSAGE_KEY`（对于随附的 `dsh`，即恢复本会话的命令），释放终端后退出会原样打印它；未提供时退出不打印任何内容。只有启动器知道自己是如何被调用的，因此只有它能给出可用的命令。TUI 在渲染前会转义终端控制字符，且绝不执行该文本。若启动器同时提供 `MAIN_SESSION_ID_KEY`，则会固定已挂载应用绑定的会话，因此恢复功能不受配置层修补影响。

启动器可通过在启动上下文上提供 `INITIAL_SKILL_KEY`（skill 名称）来播种全新会话的首轮；聊天就绪后，TUI 会像用户手动键入 `/skill:<name>` 一样自动调用它。随附的 `dsh migrate`/`dsh upgrade` 会设置该键，且仅对全新会话设置，因此恢复的会话绝不会重复调用该 skill；未知名称会以通知形式报告。

## 配置

| 键 | 默认值 | 含义 |
|---|---|---|
| `welcome` | 未设置 | 会话出现已记录标题前使用的 banner 副标题行；未设置时，banner 进入时没有副标题 |
| `sessionId` | `main` | 由终端驱动的精确共享 agent／会话身份 |
| `showReasoning` | `true` | 渲染 reasoning 块 |
| `maxToolOutputLines` | `6` | 折叠工具卡片的头尾预览所保留的输出行数 |
| `maxDiffEditLength` | `1000` | 回退到整侧展示前，精确 diff 最多探索的新增与删除行总数 |
| `maxQuestionOptions` | `8` | 一次最多可见的选项块数；行数边界可能进一步减少可见数量 |
| `maxModelOptions` | `8` | 模型选择器中可见的模型数 |
| `maxResumeOptions` | `8` | 恢复选择器中可见的会话数 |
| `questionDialogWidth` | `200` | 问题面板宽度（列数），以终端宽度为上限 |
| `questionDialogMaxHeight` | `20` | 问题面板最大行数，会进一步受限以保留编辑器 |
| `modelDialogWidth` | `76` | 模型选择器宽度（列数） |
| `modelDialogMaxHeight` | `20` | 模型选择器最大行数 |
| `detailsDialogWidth` | `72` | transcript 细节选择器宽度（列数） |
| `fileSearchMaxResults` | `20` | 一次 `@` 查询显示的最大文件和目录候选数 |
| `fileSearchMaxEntries` | `10000` | 无路径模糊查询使用的有界工作区索引最多保留的路径数 |
| `fileSearchExcludedDirectories` | `['.git', 'node_modules']` | 遍历和直接补全时忽略的目录 basename |
| `showHardwareCursor` | `false` | 在 pi-tui 的 IME marker 处显示硬件 cursor |
| `color` | `true` | 应用内置 ANSI palette（参见[颜色](#color)） |
| `title` | `DeepSeek Harness` | 终端窗口标题的产品后缀。 |

```yaml
- id: terminal
  name: '@deepseek-ai/dsh-tui'
  config:
    welcome: 'Coding agent ready.'
    sessionId: main-session-123
    showReasoning: true
    maxToolOutputLines: 6
    maxDiffEditLength: 1000
    fileSearchExcludedDirectories: ['.git', 'node_modules', 'dist']
```

任一进程流不是 TTY 时，启动会在挂载前失败。组合 app 必须先挂载 TUI，再挂载由配置创建的 agent，使入口能够观察 `agent-loop/config-start-failed`；完全匹配会话的失败会在全屏模式启动前写出并以状态 1 退出，而不是留下空白终端。dispose（资源释放）会停止接收扩展请求，卸载 `ctx.tui` 提供方及其依赖插件，中止运行中的命令，移除 TUI 定义，停止 loader，拒绝待处理问题，排空终端输入，恢复终端状态，注销事件 listener 和用户交互提供方，并且绝不会在 HMR 期间退出替换进程。用户退出会先 dispose 应用根上下文以关闭同级资源，再退出进程；五秒兜底可避免某个卡住的 disposer 困住进程。

## 颜色

TUI 发出的所有通用 SGR 代码都集中在一个表中，即 `components/theme.ts` 内的 `paletteSpec`；`createPalette` 从该表派生包装层，`/palette` 则打印该表，任何组件都不会自行写入转义序列。该表仅包含标准 16 色 ANSI 前景色和 SGR 属性；每个终端都会将它们重新映射到当前配色方案，因此 TUI 在浅色与深色背景下都保持可读。启动 banner 渐变与官方标志使用的精确 `#4D6BFE` 色值是两处有意保留的真彩色品牌例外。正文使用终端默认前景色，而非固定色调。

每种视觉语义只对应一个角色：`dim` 是唯一的弱化色调，`accent` 是唯一的交互强调色，`brand` 是 DeepSeek 标志的标准 ANSI 回退色，`success` 和 `error` 还分别充当 diff 的新增行与删除行。颜色和属性分属不同类型，因此 `bold(accent(x))` 可以通过编译，`accent(error(x))` 则不行——SGR 没有颜色栈；在一种颜色内嵌套另一种颜色时，内层颜色闭合时会静默丢弃外层颜色。各属性占用彼此独立的 SGR 组，可以按任一顺序与任何颜色组合。运行 `/palette` 可查看每个角色在你的终端上的实际渲染效果及其 SGR 码对。

成组区域（用户提示词、assistant 回复、工具卡片）通过以角色色渲染的粗体带下划线角色标题和空行分隔，而非填充背景块或逐行前缀，因此用鼠标框选复制时不会带上任何左侧竖条或缩进；工具卡片的状态（进行中、错误、成功）由其彩色带下划线的标题字形与标题体现。在工具卡片内部，整个正文——presenter 标题、终端 `$` 命令与 cwd，以及工具自身的输出——统一以同一种暗色渲染，因此只有带状态色的表头携带颜色，正文读作一个整体弱化的区块，而不是一串互相竞争的色调；注入上下文卡片的正文与其表头也是同一种色调。当前后两侧文本均可用时，diff 卡片会为精确识别出的新增 `+` 行和删除 `-` 行着色并计数；未变更的上下文保持暗色且不纳入计数。如果精确比较超出 `maxDiffEditLength`，卡片会把旧侧每一行渲染为删除行、把新侧每一行渲染为新增行，将页脚标记为近似结果，并缓存该回退结果供后续重绘使用。当 `oldText` 不可用时（包括待处理写入、回放回退以及文件创建），新侧的每个非空行都会显示并计作新增行；该计数不能证明这些行原先不存在于已有文件中。新内容为空时，不会补出虚构的 `+ ` 行。`[signal …]` 标记仍保留颜色，因为那里的颜色本身就是语义，而非强调。问题面板使用粗体强调色文本突出活跃行，选择器则使用反色。所有效果都只作用于前景色，因此不会与终端背景冲突。设置 `color: false` 可移除所有样式。

## 模型体验

### 交互式提示词输入

#### 模型看到的内容

每次非空普通编辑器提交都会成为一个文本块；目标 agent 空闲时通过 `agent.followup()` 发送，运行时通过 `agent.steer()` 发送。会话 mention 会变为可读的 `@label` 文本，加上由 [`dsh-session-reference`](../../context/session-reference/README.md) 定义的持久不受信任上下文；其完整 JSON 隐藏在紧凑引用卡片之后。斜杠命令和按键绑定仅用于 TUI；命令结果仍是终端通知。命令生产方可以调度单独的 agent 输入，例如 `/plan [message]` 接受的可选消息。

#### Token 影响

提交的文本会按 agent loop 的普通会话历史与压缩规则保留。Header、已记录标题、卡片、Markdown 渲染、状态行、计划和帮助文本不会增加 token。

#### KV Cache 影响

仅追加；新可见内容位于可复用请求前缀之后，不会使现有 KV-cache 条目失效。

### 文件引用自动补全

#### 模型看到的内容

所选文件仍是普通 user 文本，例如 `@src/index.ts` 或 `@"docs/design notes.md"`；自动补全不会添加内容块、持久上下文或特殊引用 payload。注册 `read` 后，此 TUI agent 的每个请求还会包含下方固定系统提示词段落。模型会判断任务是否需要文件内容，并在需要时通过普通工具循环调用 `read`；只有路径不能证明文件已经过检查。

##### 精确系统提示词文本

```markdown
Paths prefixed with @ are files explicitly referenced by the user. Use the read tool when their contents are needed; do not claim to have inspected a file before reading it.
```

#### Token 影响

自动补全本身不增加 token。所选路径只贡献普通 user 文本 token；`read` 可用时，固定指令会贡献系统提示词 token。只有模型选择的 `read` 调用返回文件内容后，这些内容才会占用上下文。

#### KV Cache 影响

固定指令属于稳定系统提示词前缀，可以跨轮次复用。每个所选路径都是仅追加 user 文本；后续 `read` 结果通过普通工具 transcript 追加所请求内容。

### 会话模型选择

#### 模型看到的内容

`/model` 命令文本和键盘选择器输入均不会记录或发送。新步骤会在提示词变量中收到所选提供方／模型路由，并在请求路由中收到所选提供方／模型／推理强度目标。

#### Token 影响

选择器不会添加消息。更改目标可能改变插值后的系统提示词文本，并把后续请求发送给所选模型。

#### KV Cache 影响

更改提供方或模型会进入该目标的缓存域；不假定不同目标间可以复用缓存。

### 手动调用 skill

#### 模型看到的内容

提交 `/skill:<name> [instructions]` 会加载具名 skill，并交付一个文本块：用 `<skill name="…">` 元素包装 skill 指令；提供方公开资源基准时，会先添加一行定位 skill 相对资源；最后附上用户输入的尾随指令。交付遵循普通输入同样的空闲时 followup、运行时 steer 规则。选择 skill 的是命令而非模型：自动补全和按精确名称调用都应用 `invocation.userInvocable`，`invocation.modelInvocable` 不限制这个接口。用户禁用的 skill 不出现在自动补全中，按精确名称调用时也会在加载前被拒绝；为防止策略竞态，加载后的定义还会再次接受检查。自动补全会保留最后一份完整 skill 快照，并在 `skills/change` 后重新获取。观测不完整时保留先前菜单，完整的空观测会将其清空；如果目录在斜杠命令名称草稿打开期间到达，则会立即根据该草稿重新查询。skill 服务是可选 peer；这项策略检查仅使用其类型契约，不引入运行时包依赖。

#### Token 影响

渲染后的 skill 块与尾随指令会作为一个 user 轮次保留，并遵循 agent loop 的普通会话历史和压缩规则；重复调用会再次追加正文。

#### KV Cache 影响

仅追加；新可见内容位于可复用请求前缀之后，不会使现有 KV-cache 条目失效。

### 交互式用户问题回答

#### 模型看到的内容

消费方调用 `ctx.userInteraction.ask()` 时，此提供方会按顺序显示各个问题，并返回选中选项标签、`custom` 文本，或为多选题同时返回两者。切回选项后，待提交的自定义文本仍会保留，并在之后从选项模式提交时与已勾选的标签一同返回。中止、取消或 UI dispose 会变为 `Error: ask_user_question was interrupted before the user answered`；该转换由 `dsh-tool-ask-user` 完成。

#### Token 影响

等待和终端 overlay 不增加 token；已解析回答或错误只会通过调用工具或插件的结果对模型可见。

#### KV Cache 影响

仅追加；新可见内容位于可复用请求前缀之后，不会使现有 KV-cache 条目失效。

## 已知限制与延期工作

- **恢复功能没有跨进程会话锁**：选择器会拒绝本运行时中已知处于活跃状态的会话，但另一个进程可以在 handoff 之前或期间恢复同一持久 id。所有工作区作用域让这一情形一步即可触及，因为另一个宿主正在其他目录驱动的会话现在也可被选中。能够运行并发宿主的部署必须在 TUI 外协调所有权。
- **一个已配置会话持有 transcript 和编辑器**：其他 agent 的问题仍可使用共享 overlay 提供方，但会话渲染与提示词输入仍绑定到 `sessionId`。
- **工具卡片是文本终端展示**：终端、diff 与通用卡片使用工具持有的标题／内容，但会话内容目前没有用于内联图像渲染的图像块。
- **有意不支持非 TTY 运行**：需要自动化的 app bundle 必须组合单次执行或服务器入口（`dsh-cli-demo`、`dsh-acp`），而不能依赖内部回退。
- **手动 `/skill:` 调用总会重新加载完整 skill 正文**：TUI 不会检测会话中是否已存在某项 skill，因此重复调用会再次追加其指令。
- **文件发现只发现宿主工作区**：自动补全读取 TUI 进程的会话 `cwd`，所选文本随后由已配置 `read` 工具解释。挂载远程或虚拟文件系统的部署必须对齐这些 namespace，或提供其他补全接口。
- **文件搜索使用显式目录排除项，而非 ignore 文件**：默认排除 `.git` 和 `node_modules`，部署还可以配置更多 basename，但不会解释 `.gitignore` 和 `.ignore`。目录 symlink 不会遍历。
