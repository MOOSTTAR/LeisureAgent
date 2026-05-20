# API 文档

后端 API 接口定义，目前都是假的。

## 端点概览

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/chat` | POST | 聊天对话，SSE 流式响应 |
| `/api/health` | GET | 健康检查 |

---

## `/api/chat` - 聊天对话

**请求：**

```json
{
  "message": "用户输入的自然语言消息",
  "session_id": "可选 - 会话 ID，用于上下文关联"
}
```

**响应：** SSE (Server-Sent Events) 流式响应

```text
event: message
data: {"type": "text", "content": "AI 回复的文本片段"}

event: message
data: {"type": "plan", "data": {...}}

event: message
data: {"type": "booking", "data": {...}}

event: done
data: {"status": "complete"}
```

---

## `/api/health` - 健康检查

**响应：**

```json
{
  "status": "healthy",
  "timestamp": "2026-05-20T12:00:00Z"
}
```

---

## TODO

- [ ] 补充完整的请求/响应 Schema（Pydantic 模型）
- [ ] 补充 SSE 事件类型定义
- [ ] 补充错误响应格式
- [ ] 补充认证/授权机制（如有）
