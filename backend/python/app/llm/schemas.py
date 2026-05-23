"""LLM 输出的 Pydantic Schema。"""

from __future__ import annotations

from pydantic import BaseModel, Field


class IntentAnalysisOutput(BaseModel):
    """LLM 意图解析输出。"""

    scenario: str = Field(description="场景类型: family | friends | couple | solo | other")
    companion: str = Field(description="同行人描述，如'老婆和5岁孩子'")
    time_slot: str = Field(description="时间段，如'14:00-20:00'")
    start_time: str = Field(description="开始时间，HH:MM 格式")
    duration_hours: int = Field(description="预计活动时长（小时）")
    location_preference: str = Field(description="位置偏好: nearby | downtown | suburb | any")
    max_distance: int = Field(description="最大接受距离（米）")
    budget_hint: str = Field(description="预算提示")
    special_requirements: list[str] = Field(description="特殊需求列表")
    party_size: int = Field(description="出行人数")
    child_age: int | None = Field(default=None, description="孩子年龄")


class PlanItemOutput(BaseModel):
    """方案中的单个活动项。"""

    step_order: int
    activity_type: str = Field(description="活动类型: play | dining | extra | rest")
    location_table_name: str = Field(
        description="地点表名: restaurant | mall | amusement_park | scenic_spot | exhibition_hall"
    )
    location_id: int = Field(description="地点 ID")
    location_name: str
    address: str = ""
    arrive_time: str = Field(description="到达时间 HH:MM")
    leave_time: str = Field(description="离开时间 HH:MM")
    stay_minute: int
    remark: str = Field(description="推荐理由")
    estimated_cost: float = 0


class PlanOutput(BaseModel):
    """完整方案输出。"""

    title: str = Field(description="方案标题")
    description: str = Field(description="方案整体描述")
    scenario: str
    travel_type: str = Field(description="游玩类型标签")
    total_cost: float
    items: list[PlanItemOutput]
