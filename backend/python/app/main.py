"""FastAPI 应用入口，注册所有 Router 并启动。"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Agent 层日志配置（INFO 级别，包含时间戳和模块名）
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
# 抑制第三方库 DEBUG 日志噪音
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

from app.agent.api import router as agent_router
from app.api.amusement_park_api import router as amusement_park_router
from app.api.booking import router as booking_router
from app.api.exhibition_hall_api import router as exhibition_hall_router
from app.api.mall_api import router as mall_router
from app.api.restaurant_api import router as restaurant_router
from app.api.scenic_spot_api import router as scenic_spot_router
from app.api.travel_plan_api import router as travel_plan_router
from app.api.travel_plan_item_api import router as travel_plan_item_router
from app.db.database import init_db

app = FastAPI(title="LeisureAgent", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 注册路由 ──
app.include_router(agent_router)
app.include_router(restaurant_router)
app.include_router(mall_router)
app.include_router(amusement_park_router)
app.include_router(scenic_spot_router)
app.include_router(exhibition_hall_router)
app.include_router(travel_plan_router)
app.include_router(travel_plan_item_router)
app.include_router(booking_router)


@app.on_event("startup")
async def startup():
    """应用启动时初始化数据库并校验 LLM 配置。"""
    init_db()
    # 启动时校验 LLM 配置，缺少 API key 时 WARNING 提前暴露
    from app.config.llm_config import validate_config
    validate_config()


@app.get("/health")
async def health():
    return {"status": "ok"}
