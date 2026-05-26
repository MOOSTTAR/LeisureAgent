"""LLM 输出的 Pydantic Schema。"""

from __future__ import annotations

from typing import Any

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
    cuisine_type: str | None = Field(default=None, description="菜系偏好，如火锅/日料/西餐/粤菜/中餐等，无偏好填null")
    day_count: int = Field(default=1, description="行程天数，默认1。如果用户提到跨天安排（如'周六...周日...'、'明天...后天...'、'两天'等），设为对应天数")


class PlanItemOutput(BaseModel):
    """方案中的单个活动项。"""

    step_order: int
    day_num: int = Field(default=1, description="第几天，从1开始。跨天行程必须正确标注")
    day_label: str = Field(default="", description="该天的显示标签，如'周六'、'周日'、'第一天'。从用户输入中推断，同一天的所有项用相同标签")
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
    travel_mode: str | None = Field(default=None, description="到达方式: walking|biking|driving|subway, 首项null")


class PlanOutput(BaseModel):
    """完整方案输出。"""

    title: str = Field(description="方案标题，必须根据行程内容生成，融入地点/活动/场景，12字以内，禁止泛化标题如'周末活动方案'")
    description: str = Field(description="方案整体描述")
    scenario: str
    travel_type: str = Field(description="游玩类型标签")
    total_cost: float
    items: list[PlanItemOutput]


class GuardOutput(BaseModel):
    """话题相关性判断输出。"""

    is_relevant: bool = Field(description="是否与周末活动规划相关")
    reason: str = Field(default="", description="判断原因")


class ClassifyOutput(BaseModel):
    """用户意图分类 + 直接回复（一站式分类）。"""

    intent_type: str = Field(description="casual | out_of_domain | inquiry | new_plan | feedback | confirm")
    direct_reply: str = Field(
        default="",
        description="当 intent_type 为 casual 或 out_of_domain 时，AI 直接生成的回复消息。其他类型留空。",
    )


class FeedbackAnalysisOutput(BaseModel):
    """用户反馈解析输出（ReAct 观察→再推理）。"""

    change_summary: str = Field(description="用户修改需求的一句话总结")
    replaced_categories: list[str] = Field(default_factory=list, description="需要替换的地点类别")
    needs_new_search: bool = Field(default=False, description="是否需要重新搜索候选")
    additional_constraints: dict[str, Any] = Field(default_factory=dict, description="额外约束条件")
    specific_requirements: list[str] = Field(default_factory=list, description="具体要求列表")
