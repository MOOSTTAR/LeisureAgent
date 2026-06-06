from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, field_validator


class Location(str, Enum):
    """活动区域"""
    NEARBY = "nearby"       # 离家近
    DOWNTOWN = "downtown"   # 市区
    SUBURB = "suburb"       # 郊区
    ANY = "any"


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
    session_id: int = Field(default=0)
    auto_execute: bool = Field(default=False, description="是否自动执行预约/购票动作")


class SearchParams(BaseModel):
    """搜索参数"""
    query: str
    location: str = Field(default="")
    limit: int = Field(default=5, ge=1, le=20)


class BookingRequest(BaseModel):
    """预订请求"""
    item_id: str
    item_name: str
    time: str
    party_size: int = Field(default=1, ge=1, le=20)
    contact_name: str = Field(default="")
    contact_phone: str = Field(default="")


class AgentPlanItem(BaseModel):
    """Agent 生成的单个行程步骤"""
    step_order: int
    day_num: int = Field(default=1, ge=1)
    day_label: str = Field(default="")
    activity_type: str
    location_table_name: str
    location_id: int
    location_name: str
    address: str = ""
    arrive_time: str
    leave_time: str
    stay_minute: int
    remark: str = ""
    estimated_cost: float = 0
    travel_mode: str | None = None  # walking | biking | driving | subway | null(首项)
    location_x: int = 0
    location_y: int = 0


class AgentPlan(BaseModel):
    """Agent 返回给前端的完整方案"""
    id: int | None = None
    title: str
    description: str
    scenario: str
    travel_type: str
    total_cost: float
    items: list[AgentPlanItem] = Field(default_factory=list)
    share_text: str = ""
    share_url: str = ""


class TravelPlanItemCreate(BaseModel):
    """创建方案明细请求体"""
    plan_id: int
    location_table_name: str
    location_id: int
    day_num: int = Field(default=1, ge=1)
    arrive_time: str = Field(default="", pattern=r"^\d{1,2}:\d{2}$")
    leave_time: str = Field(default="", pattern=r"^\d{1,2}:\d{2}$")
    stay_minute: int = Field(default=0, ge=0)
    travel_mode: str | None = Field(default=None)
    remark: str = Field(default="")
    is_need_booking: int = Field(default=0, ge=0, le=1)
    is_had_booking: int = Field(default=0, ge=0, le=1)

    @field_validator("arrive_time", "leave_time", mode="before")
    @classmethod
    def normalize_time(cls, v: str) -> str:
        """将 '8:06' 统一转为 '08:06' 以确保服务层字符串比较正确"""
        if v and ":" in v:
            parts = v.split(":")
            return f"{int(parts[0]):02d}:{parts[1]}"
        return v
