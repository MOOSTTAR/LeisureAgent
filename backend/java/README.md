# backend/java — 工程化后端（Java + SpringBoot）

## 职责

承载业务逻辑、数据持久化、第三方 API 集成等工程化能力，为 Python Agent 层提供稳定可靠的业务服务。

## 核心模块

| 模块 | 说明 |
|------|------|
| `api/` | REST API，供前端/Python Agent 调用 |
| `service/` | 业务逻辑层（餐厅搜索、预订、配送等） |
| `client/` | 第三方 API 客户端封装（高德地图、大众点评等） |
| `repository/` | 数据持久化层 |
| `model/` | 领域模型 |
| `mock/` | Mock 实现，供本地开发使用 |

## 快速开始

```bash
cd backend/java
# （待补充构建命令）
```

## 依赖

- Java 17
- Spring Boot 3.4.4
- （待补充更多依赖）