# Claude Code 代理团队 (Agent Teams) 协作工具详情

本文档详细介绍了 Claude Code 在启用代理团队 (Agent Teams) 模式时使用的内部协调工具。这些工具会在协作模式开启时自动注入到模型的上下文中。

---

## 1. TeamCreate (创建团队)

**用途**：初始化一个新的代理团队。

### 属性说明

- `teamName` (字符串, 必填)：团队的唯一标识符。
- `members` (数组, 必填)：团队成员配置列表。
  - `agentId` (字符串)：成员 ID (例如 `tech-lead@my-team`)。
  - `role` (字符串)：分配给该成员的角色或人格设定。
  - `model` (字符串)：使用的模型 ID (例如 `claude-3-5-sonnet-20241022`)。
  - `prompt` (字符串)：该成员的专项指令。

---

## 2. TaskCreate (创建任务 / 派生)

**用途**：派发一个子环境任务给特定的团队成员。

### 属性说明

- `agentId` (字符串, 必填)：接收任务的成员 ID (例如 `ux-researcher@my-team`)。
- `task` (字符串, 必填)：给该成员的详细指令或目标。

### 返回值

- `taskId` (字符串)：一个短十六进制 ID (例如 `t7f2a1b`)，用于跟踪该次任务执行。

---

## 3. TaskOutput (获取任务输出)

**用途**：通过任务 ID 获取之前派发任务的执行结果或当前状态。

### 属性说明

- `taskId` (字符串, 必填)：由 `TaskCreate` 返回的那个十六进制 ID。

### StepFun 关键注意点

StepFun 模型经常在这里错误地填入成员名称 (如 "ux-researcher")。**必须**使用派发工具返回的 `taskId` (如 `t7f2a1b`)。

---

## 4. SendMessage (发送消息)

**用途**：在不同代理成员之间发送实时消息或通知。

### 属性说明

- `agentId` (字符串, 必填)：接收者的成员 ID。
- `message` (字符串, 必填)：要发送的消息内容。

---

## 5. TaskList (任务列表)

**用途**：列出当前团队所有已执行或正在执行的任务及其状态。

### 属性说明

- (无参数)

---

## 6. TeamDelete (删除团队)

**用途**：解散团队并清理相关资源。

### 属性说明

- `teamName` (字符串, 必填)：要删除的团队名称。

---

## 格式要求 (严格执行)

为了避免 `API Error: Tool use input must be a string or object` 错误，调用时必须确保：

1.  **合法 JSON**：所有工具调用的 `input` 字段必须是一个对象 `{...}`。
2.  **严禁原始字符串**：不要发送类似 `input: "some string"` 的请求。
3.  **任务 ID 唯一性**：在调用 `TaskOutput` 时，必须使用正确的十六进制 ID。
