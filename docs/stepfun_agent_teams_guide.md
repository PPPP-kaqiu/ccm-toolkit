# StepFun Agent Teams 使用指南

本指南将帮助您在 Claude Code 中使用 StepFun 模型的 Agent Teams（多智能体协作）功能。

## 前置要求

1. **已安装 Claude Code**

   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **配置 StepFun API Key**

   创建或编辑 `~/.ccm_config` 文件：

   ```bash
   # 创建配置文件
   touch ~/.ccm_config

   # 编辑配置文件（使用你喜欢的编辑器）
   nano ~/.ccm_config
   # 或
   vim ~/.ccm_config
   ```

   添加以下内容：

   ```bash
   export STEPFUN_API_KEY="your-stepfun-api-key-here"
   ```

   保存后，配置会在下次运行 `ccc step` 时自动加载。

   > **获取 API Key：** 访问 [StepFun 官网](https://platform.stepfun.com/) 注册并获取 API Key

3. **克隆本项目**

   ```bash
   git clone <your-repo-url>
   cd claude-code-switch
   ```

   > **注意：** 本项目是纯 shell 脚本和补丁工具，**不需要** `npm install`。只需要确保系统已安装 Node.js（用于运行补丁脚本）。

## 快速开始

### 1. 安装脚本

将 `ccm.sh` 和 `ccc` 添加到系统路径：

```bash
# 方法 1：创建符号链接（推荐）
sudo ln -s $(pwd)/ccm.sh /usr/local/bin/ccm
sudo ln -s $(pwd)/ccc /usr/local/bin/ccc
chmod +x ccm.sh ccc

# 方法 2：添加到 PATH
echo 'export PATH="$PATH:'$(pwd)'"' >> ~/.zshrc
source ~/.zshrc
```

### 2. 应用 StepFun 兼容性补丁

**这是关键步骤！** StepFun 模型需要特殊补丁才能使用 Agent Teams：

```bash
sudo ccc patch-stepfun
```

**预期输出：**

```
Reading /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js...
✓ j9 (JSON parsing) already patched
✓ JT6 type validation already patched
🔄 Upgrading TaskOutput.call to intelligent matching...
✅ Upgraded TaskOutput.call to intelligent matching
✅ Successfully applied 1 patch(es) to ...
```

> **注意：**
>
> - 此补丁会修改 Claude Code 的核心文件 `cli.js`，会自动创建备份 `cli.js.bak`
> - `ccc patch-stepfun` 实际上会调用 `ccm.sh` 中的 `apply_stepfun_patch` 函数，最终执行：
>   ```bash
>   sudo node scripts/patch_claude_cli.js /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js
>   ```
> - 如果 `ccc patch-stepfun` 无法使用，也可以直接运行上述完整命令（需要在项目根目录）

### 3. 切换到 StepFun 模型

```bash
ccc step
```

这会自动：

- 设置 StepFun API 端点
- 配置模型为 `step-3.5-flash`（默认）
- 加载 `~/.ccm_config` 中的 API Key
- 注入 Agent Teams 兼容性提示

> **提示：** 如果想使用其他 StepFun 模型（如 `step-2-16k`），请参考「高级配置」章节

### 4. 启动 Agent Teams

在项目目录中运行 Claude Code：

```bash
cd your-project
claude
```

然后在 Claude Code 中使用 Agent Teams 功能，例如：

```
我想设计一个飞机射击游戏，创建一个 Agent Team 来探索这个项目。
```

## 补丁说明

StepFun 补丁解决了以下兼容性问题：

### 1. JSON 解析增强 (`j9` 补丁)

**问题：** StepFun 有时会在 JSON 外包裹 Markdown 代码块：

````json
```json
{"task_id": "abc123"}
````

````

**解决方案：** 自动去除 ` ```json ` 标记后再解析。

### 2. 类型验证修复 (`JT6` 补丁)
**问题：** StepFun 可能返回 `null`、`undefined` 或其他非法类型。

**解决方案：** 在类型检查前将非法值转换为空对象 `{}`。

### 3. 智能任务匹配 (`TaskOutput` 补丁)
**问题：** StepFun 使用 `agent-name@team-name` 格式而非实际 Task ID。

**解决方案：** 智能提取 agent 名称并匹配到正确的任务：
- 支持 `gameplay-analyst@team-name` 格式
- 支持 `team-name/agent-name` 格式
- 自动查找匹配的 `agentName`、`agentId` 或 task key

## 故障排除

### 问题 1: "API Error: Tool use input must be a string or object"

**原因：** 补丁未应用或已失效。

**解决方案：**
```bash
sudo ccc patch-stepfun
````

### 问题 2: "No task found with ID: agent-name@team-name"

**原因：** `TaskOutput` 智能匹配补丁未应用。

**解决方案：**

```bash
# 重新应用补丁
sudo ccc patch-stepfun

# 验证补丁
grep -o "extractedName=tmpId.split" /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js
```

如果没有输出，说明补丁未成功应用。

### 问题 3: "Sibling tool call errored"

**原因：** 这是由于第一个工具调用失败导致的连锁反应。

**解决方案：** 修复根本原因（通常是问题 1 或 2）后，此错误会自动消失。

### 问题 4: StepFun API 500 错误

**原因：** StepFun 服务端问题，与补丁无关。

**解决方案：** 等待 StepFun 服务恢复，或稍后重试。

## 高级配置

### 自定义 StepFun 模型

编辑 `ccm.sh` 中的 `emit_env_exports` 函数：

```bash
"step")
    echo "$prelude"
    echo "export ANTHROPIC_BASE_URL='https://api.stepfun.com/v1'"
    # 修改这里的模型
    echo "export ANTHROPIC_MODEL='step-3.5-flash'"  # 可选: step-2-16k, step-1-8k 等
    ...
    ;;
```

### 验证补丁状态

检查 `cli.js` 是否已打补丁：

```bash
# 检查 j9 补丁
grep -o 'A.replace(/\^\\s\\n\]\*\`\`\`json' /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js

# 检查 JT6 补丁
grep -o 'if(!Y.input||typeof Y.input===' /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js

# 检查 TaskOutput 补丁
grep -o 'extractedName=tmpId.split' /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js
```

所有命令都应该有输出，否则说明对应补丁未应用。

### 恢复原始 cli.js

如果需要恢复到未打补丁的状态：

```bash
sudo cp /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js.bak \
        /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js
```

## 使用示例

### 示例 1: 游戏设计探索

```
我想设计一个塔防游戏。创建一个 Agent Team，包括：
- 游戏设计师：分析核心机制
- 技术架构师：评估技术方案
- UI/UX 专家：设计用户界面
```

### 示例 2: 代码审查

```
创建一个代码审查团队来分析这个项目：
- 安全专家：检查安全漏洞
- 性能专家：分析性能瓶颈
- 代码质量专家：评估代码质量
```

### 示例 3: 文档生成

```
创建一个文档团队来生成项目文档：
- API 文档专家：生成 API 文档
- 教程编写者：编写使用教程
- 示例代码专家：创建示例代码
```

## 技术细节

### 补丁脚本位置

- **脚本路径：** `scripts/patch_claude_cli.js`
- **目标文件：** `/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js`
- **备份文件：** `/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js.bak`

### 补丁工作原理

补丁通过正则表达式匹配和替换 `cli.js` 中的特定代码模式：

1. **j9 函数：** 在 `JSON.parse()` 前添加字符串清理逻辑
2. **JT6 函数：** 在类型检查前添加类型转换逻辑
3. **TaskOutput.call：** 添加智能 agent 名称提取和匹配逻辑

### 兼容性

- **macOS：** ✅ 完全支持
- **Linux：** ✅ 支持（路径可能需要调整为 `/usr/local/lib/node_modules/...`）
- **Windows：** ⚠️ 需要修改路径和脚本格式

## 贡献

如果您发现新的兼容性问题或有改进建议，欢迎提交 Issue 或 Pull Request。

## 许可证

本项目遵循 MIT 许可证。

## 支持

如有问题，请查看：

- [Agent Teams 协调工具文档](./agent_teams_coordination_tools.md)
- [项目 README](../README_CN.md)
