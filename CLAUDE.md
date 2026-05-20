# CLAUDE.md

LeisureAgent - 本地场景短时活动规划与执行 Agent。

**核心场景：** 周末下午 4-6 小时的综合活动规划（去哪玩 → 去哪吃 → 额外活动 → 一键下单/预约）。

## 文档索引

### 命令
- [后端命令](.claude/command/backend.md)
- [前端命令](.claude/command/frontend.md)
- [Docker 命令](.claude/command/docker.md)

### 架构与 API
- [项目架构](docs/architecture.md)
- [API 文档](docs/api.md)

### 规范
- [编码行为准则](.claude/rules/coding-style.md)
- [技术栈](.claude/rules/tech-stack.md)
- [开发规范](.claude/rules/dev-workflow.md)

### Agents
- [`frontend-dev`](.claude/agents/frontend-dev.md) - 前端开发专用 Agent
- [`code-analyzer-fix`](.claude/agents/code-analyzer-fix.md) - 代码分析与修复专用 Agent

### Skills
- [`find-skills`](.claude/skills/find-skills.md) - 技能发现与安装
- [`skill-creator`](.claude/skills/skill-creator/) - 技能创建与优化
