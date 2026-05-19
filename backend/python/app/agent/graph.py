"""LangGraph 图编排：定义节点、边和条件分支。"""

from __future__ import annotations

from langgraph.graph import END, StateGraph

from app.agent.planner import create_plan, parse_intent
from app.agent.state import AgentState
from app.models.schemas import BookingRequest, SearchParams
from app.tools.booking import create_booking
from app.tools.delivery import order_delivery
from app.tools.search import search_activities, search_places


# ── 节点函数 ──


def analyze_input_node(state: AgentState) -> dict:
    """解析用户输入 → 结构化意图"""
    return parse_intent(state)


def search_node(state: AgentState) -> dict:
    """根据意图搜索餐厅和活动"""
    intent = state.get("intent")
    if not intent:
        return {"error": "无法理解您的需求，请重新描述"}

    results = []

    places = search_places(SearchParams(query=intent.raw_input))
    results.extend(places)

    acts = search_activities(SearchParams(query=intent.raw_input))
    results.extend(acts)

    return {
        "execution_results": results,
        "current_step": "plan",
        "messages": [{"role": "assistant", "content": f"找到了 {len(results)} 个可选地点"}],
    }


def plan_node(state: AgentState) -> dict:
    """编排活动计划"""
    return create_plan(state)


def booking_node(state: AgentState) -> dict:
    """执行预订操作"""
    plan = state.get("plan")
    if not plan or not plan.steps:
        return {"error": "没有可预订的计划"}

    bookings = []
    for step in plan.steps:
        req = BookingRequest(
            item_id=step.name,
            item_name=step.name,
            time="",
        )
        result = create_booking(req)
        bookings.append(result)

    return {
        "execution_results": bookings,
        "current_step": "done",
        "messages": [{"role": "assistant", "content": "已为您完成预订！"}],
    }


def delivery_node(state: AgentState) -> dict:
    """处理配送/外卖下单"""
    plan = state.get("plan")
    if not plan or not plan.steps:
        return {"error": "没有可下单的商品"}

    orders = []
    for step in plan.steps:
        req = BookingRequest(
            item_id=step.name,
            item_name=step.name,
            time="立即配送",
        )
        result = order_delivery(req)
        orders.append(result)

    return {
        "execution_results": orders,
        "current_step": "done",
        "messages": [{"role": "assistant", "content": "已为您下单！"}],
    }


def finalize_node(state: AgentState) -> dict:
    """结束流程，生成总结"""
    plan = state.get("plan")
    summary = plan.summary if plan else "计划已完成"
    return {
        "current_step": "done",
        "messages": [
            {"role": "assistant", "content": f"方案已就绪：{summary}"}
        ],
    }


# ── 条件路由 ──


def route_after_confirm(state: AgentState) -> str:
    """用户确认后决定下一步"""
    if state.get("plan_confirmed"):
        return "book"
    return "edit"


def route_after_search(state: AgentState) -> str:
    """搜索结果为空时回退"""
    if state.get("error"):
        return END
    return "create_plan"


# ── 构建图 ──


def build_graph() -> StateGraph:
    """构建并返回编译后的 LangGraph"""
    workflow = StateGraph(AgentState)

    # 注册节点
    workflow.add_node("analyze", analyze_input_node)
    workflow.add_node("search", search_node)
    workflow.add_node("create_plan", plan_node)
    workflow.add_node("book", booking_node)
    workflow.add_node("deliver", delivery_node)
    workflow.add_node("finalize", finalize_node)

    # 设置入口
    workflow.set_entry_point("analyze")

    # 添加边
    workflow.add_edge("analyze", "search")
    workflow.add_conditional_edges("search", route_after_search)
    workflow.add_edge("create_plan", "book")
    workflow.add_edge("book", "finalize")
    workflow.add_edge("deliver", "finalize")
    workflow.add_edge("finalize", END)

    return workflow.compile()


# 全局共享图实例
graph = build_graph()