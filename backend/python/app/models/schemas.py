from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ActivityType(str, Enum):
    """活动类型"""
    OUTDOOR = "outdoor"
    INDOOR = "indoor"
    DINING = "dining"
    SHOPPING = "shopping"
    ENTERTAINMENT = "entertainment"


class Location(str, Enum):
    """活动区域"""
    NEARBY = "nearby"       # 离家近
    DOWNTOWN = "downtown"   # 市区
    SUBURB = "suburb"       # 郊区
    ANY = "any"


class PlanStep(BaseModel):
    """计划中的单个活动步骤"""
    type: ActivityType
    name: str = Field(description="活动名称，如'欢乐谷'、'海底捞'")
    address: str = Field(default="", description="地址")
    duration_minutes: int = Field(default=60, ge=30, le=180)
    estimated_cost: float = Field(default=0, ge=0)
    notes: str = Field(default="", description="备注/提示")


class ActivityPlan(BaseModel):
    """完整活动计划"""
    steps: list[PlanStep] = Field(description="按时间排列的活动步骤")
    total_duration_minutes: int = Field(default=0)
    total_estimated_cost: float = Field(default=0)
    summary: str = Field(default="", description="一句话总结")


class UserIntent(BaseModel):
    """从用户输入中解析的意图"""
    raw_input: str
    time_slot: str = Field(default="", description="时间段，如'下午4点到8点'")
    location_preference: Location = Field(default=Location.ANY)
    companion: str = Field(default="", description="同行人，如'老婆孩子'")
    budget_hint: str = Field(default="", description="预算提示")
    special_requirements: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    """聊天请求"""
    message: str = Field(min_length=1, max_length=2000)
    session_id: str = Field(default="")


class ChatEvent(BaseModel):
    """SSE 事件"""
    event: str = Field(description="事件类型: token/plan/tool_call/tool_result/error/done")
    data: str = Field(default="")


class SearchParams(BaseModel):
    """搜索参数"""
    query: str
    location: str = Field(default="")
    limit: int = Field(default=5, ge=1, le=20)


class SearchResult(BaseModel):
    """搜索结果项"""
    id: str
    name: str
    category: str
    address: str
    rating: float = Field(default=0, ge=0, le=5)
    avg_cost: float = Field(default=0, ge=0)
    available: bool = Field(default=True)
    tags: list[str] = Field(default_factory=list)


class BookingRequest(BaseModel):
    """预订请求"""
    item_id: str
    item_name: str
    time: str
    party_size: int = Field(default=1, ge=1, le=20)
    contact_name: str = Field(default="")
    contact_phone: str = Field(default="")


class BookingResult(BaseModel):
    """预订结果"""
    success: bool
    booking_id: str = Field(default="")
    message: str = Field(default="")