# backend/python — Python 后端（FastAPI + LangGraph）

## 技术栈

### 后端
| 切面 | 技术组件 | 推荐版本 | 核心作用 |
|------|----------|----------|----------|
| 语言 | Python | 3.12 | AI 编程首选语言，生态最成熟 |
| Web 框架 | FastAPI | 0.136.1 | 异步高性能 Web 框架，自动生成 Swagger 文档 |
| 数据校验 | Pydantic | 2.9.0 | 用于 Agent 输入输出的严格数据格式校验 |
| 测试框架 | Pytest | 9.0.3 | 用于接口测试 |

### Agent
| 切面 | 技术组件 | 推荐版本 | 核心作用 |
|------|----------|----------|----------|
| 编排框架 | LangGraph | 最新版 | 构建带状态循环、复杂规划逻辑的 Agent |
| LLM 封装 | LangChain | 最新版 | 统一多 Provider 调用接口 |
| TF-IDF | scikit-learn | 最新版 | char n-gram 语义相似度匹配 |

### 存储
| 切面 | 技术组件 | 推荐版本 | 核心作用 |
|------|----------|----------|----------|
| 数据库 | SQLite | Python 内置 | 零配置轻量级数据库，持久化 Mock 数据和订单状态 |

## 职责

基于 LangGraph 编排 Agent 逻辑，完成自然语言理解 → 规划 → 工具调用的完整链路。

## 核心模块

| 模块 | 说明 |
|------|------|
| `app/agent/graph.py` | LangGraph 编排（18 节点、条件路由、ReAct 自愈循环） |
| `app/agent/state.py` | Agent State 定义（TypedDict） |
| `app/agent/nodes/` | 节点实现（classify/compose/search/execute 等 11 个文件） |
| `app/agent/tools/` | Agent 工具（搜索/预约/地点查询/工具函数） |
| `app/agent/semantic.py` | TF-IDF 语义匹配器（模糊意图识别） |
| `app/agent/input_guard.py` | 用户输入安全过滤（中英文 prompt injection 检测） |
| `app/agent/metrics.py` | 可观测性（LLM 追踪/安全网计数，持久化到 SQLite） |
| `app/agent/memory.py` | 会话持久化与短期记忆 |
| `app/llm/` | LLM 调用层（provider/prompts/structured/schemas） |
| `app/config/` | 配置管理（LLM 配置 + 启动校验） |
| `app/api/` | 业务 API 路由（restaurant/mall/park 等 CRUD） |
| `app/service/` | 业务服务层 |
| `app/repository/` | 数据访问层 |
| `app/db/` | SQLite 连接管理（单连接 + 写锁，WAL 模式） |
| `app/models/` | Pydantic 请求/响应模型 |
| `app/mock/` | Mock 种子数据 |

## 通信方式

- **前端 → Python 后端**：SSE（Server-Sent Events）
- **事件类型**：`token` / `plan` / `inquiry` / `exceptions` / `stage` / `execute_result` / `done` / `error`

## Agent 特性

- **ReAct + Plan&Execute** 混合模式
- **LLM → 规则降级**：classify 和 compose 节点失败时自动回退
- **结构化输出 + JSON 修复**：原始文本 → 提取 → 清洗 → 校验，最多 3 次重试
- **并发预约安全**：原子 `UPDATE WHERE current < max` + `BEGIN IMMEDIATE`
- **多 Provider**：OpenAI / Anthropic / Ollama / DeepSeek / OpenAI-Compatible

## 快速开始

```bash
cd backend/python
pip install -r requirements.txt
uvicorn app.main:app --host localhost --port 8000
```

## 测试

```bash
# 全部测试
pytest tests/ -v

# 仅集成测试（需要 LLM API key）
pytest tests/test_agent_layer.py -v

# 跳过慢速测试
pytest tests/ -v -k "not test_agent_layer"
```

## 数据库查询

```bash
sqlite3 leisure_agent.db ".tables"
sqlite3 leisure_agent.db "SELECT * FROM restaurant LIMIT 3;"
```

## 依赖

- Python 3.12
- FastAPI 0.136.1
- Pydantic 2.9.0
- LangGraph / LangChain
- scikit-learn
- Uvicorn
- Pytest 9.0.3
- SQLite（Python 内置）
