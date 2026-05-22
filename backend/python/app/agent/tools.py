"""Agent tools built on top of existing backend services and SQLite data."""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any

from app.api import calc_distance
from app.db.database import get_connection
from app.models.schemas import AgentOrder, AgentPlan, AgentPlanItem
from app.service import (
    amusement_park_service,
    exhibition_hall_service,
    mall_service,
    restaurant_service,
    scenic_spot_service,
    travel_plan_item_service,
    travel_plan_service,
)


def search_local_candidates(scenario: str, constraints: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    """Search mock local-life data for candidate places."""
    page_size = 9999
    restaurants, _ = restaurant_service.list_all(page=1, page_size=page_size)
    malls, _ = mall_service.list_all(page=1, page_size=page_size)
    amusement_parks, _ = amusement_park_service.list_all(page=1, page_size=page_size)
    scenic_spots, _ = scenic_spot_service.list_all(page=1, page_size=page_size)
    exhibitions, _ = exhibition_hall_service.list_all(page=1, page_size=page_size)

    max_distance = constraints.get("max_distance", 2000)
    pools = {
        "restaurant": [_with_distance(item) for item in restaurants],
        "mall": [_with_distance(item) for item in malls],
        "amusement_park": [_with_distance(item) for item in amusement_parks],
        "scenic_spot": [_with_distance(item) for item in scenic_spots],
        "exhibition_hall": [_with_distance(item) for item in exhibitions],
    }

    for key, items in pools.items():
        pools[key] = [item for item in items if item["distance"] <= max_distance]
        pools[key].sort(key=lambda item: item["distance"])

    if scenario == "family":
        pools["restaurant"].sort(key=lambda item: _family_restaurant_score(item), reverse=True)
        pools["amusement_park"].sort(key=lambda item: _family_activity_score(item), reverse=True)
        pools["mall"].sort(key=lambda item: (item.get("supermarket_has", 0), -item["distance"]), reverse=True)
    elif scenario == "friends":
        pools["restaurant"].sort(key=lambda item: _friends_restaurant_score(item), reverse=True)
        pools["exhibition_hall"].sort(key=lambda item: _friends_exhibition_score(item), reverse=True)
        pools["mall"].sort(key=lambda item: (item.get("cinema_has", 0), -item["distance"]), reverse=True)

    return pools


def persist_agent_plan(session_id: str, plan: AgentPlan) -> AgentPlan:
    plan_id = travel_plan_service.create(
        {
            "plan_title": plan.title,
            "plan_desc": plan.description,
            "travel_days": 1,
            "travel_type": plan.travel_type,
            "travel_date": datetime.now().strftime("%Y-%m-%d"),
            "total_cost": plan.total_cost,
        }
    )

    persisted_items = []
    for item in plan.items:
        item_id = travel_plan_item_service.create(
            {
                "plan_id": plan_id,
                "location_table_name": item.location_table_name,
                "location_id": item.location_id,
                "day_num": 1,
                "arrive_time": item.arrive_time,
                "leave_time": item.leave_time,
                "stay_minute": item.stay_minute,
                "remark": item.remark,
            }
        )
        persisted_items.append(item.model_copy(update={"step_order": item.step_order}))

    return plan.model_copy(update={"id": plan_id, "items": persisted_items})


def execute_plan_actions(session_id: str, plan: AgentPlan) -> list[AgentOrder]:
    if not plan.id:
        return []

    plan_items, _ = travel_plan_item_service.list_all(plan_id=plan.id, page=1, page_size=100)
    orders: list[AgentOrder] = []

    for item in plan.items:
        persisted_item = _match_persisted_item(plan_items, item)
        plan_item_id = persisted_item["id"] if persisted_item else None

        if item.location_table_name == "restaurant":
            restaurant = restaurant_service.get_by_id(item.location_id)
            if not restaurant:
                continue
            if _can_book(restaurant):
                orders.append(
                    create_agent_order(
                        session_id=session_id,
                        plan_id=plan.id,
                        plan_item_id=plan_item_id,
                        order_type="restaurant_reservation",
                        target_table="restaurant",
                        target_id=item.location_id,
                        target_name=item.location_name,
                        details={
                            "time": item.arrive_time,
                            "party_size": _infer_party_size(plan.scenario),
                            "remark": item.remark,
                        },
                    )
                )
            elif restaurant.get("queue_time", -1) and restaurant.get("queue_time", -1) > 0:
                orders.append(
                    create_agent_order(
                        session_id=session_id,
                        plan_id=plan.id,
                        plan_item_id=plan_item_id,
                        order_type="queue_taking",
                        target_table="restaurant",
                        target_id=item.location_id,
                        target_name=item.location_name,
                        details={
                            "time": item.arrive_time,
                            "party_size": _infer_party_size(plan.scenario),
                            "queue_time": restaurant.get("queue_time"),
                        },
                    )
                )

        if item.location_table_name in {"amusement_park", "exhibition_hall", "scenic_spot"}:
            location = get_location(item.location_table_name, item.location_id)
            if location and _can_book(location):
                orders.append(
                    create_agent_order(
                        session_id=session_id,
                        plan_id=plan.id,
                        plan_item_id=plan_item_id,
                        order_type="ticket_booking",
                        target_table=item.location_table_name,
                        target_id=item.location_id,
                        target_name=item.location_name,
                        details={
                            "time": item.arrive_time,
                            "quantity": _infer_party_size(plan.scenario),
                            "ticket_price": location.get("ticket_price", 0),
                        },
                    )
                )

    return orders


def create_agent_order(
    *,
    session_id: str,
    plan_id: int,
    plan_item_id: int | None,
    order_type: str,
    target_table: str,
    target_id: int,
    target_name: str,
    details: dict[str, Any],
) -> AgentOrder:
    conn = get_connection()
    cur = conn.execute(
        """
        INSERT INTO agent_order (
            session_id, plan_id, plan_item_id, order_type, target_table, target_id,
            target_name, order_details, status, external_reference
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'success', '')
        """,
        (
            session_id,
            plan_id,
            plan_item_id,
            order_type,
            target_table,
            target_id,
            target_name,
            json.dumps(details, ensure_ascii=False),
        ),
    )
    order_id = int(cur.lastrowid)
    external_reference = _external_reference(order_type, order_id)
    conn.execute(
        "UPDATE agent_order SET external_reference=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        (external_reference, order_id),
    )
    conn.commit()
    return AgentOrder(
        id=order_id,
        order_type=order_type,
        target_table=target_table,
        target_id=target_id,
        target_name=target_name,
        order_details=details,
        status="success",
        external_reference=external_reference,
    )


def get_agent_orders(plan_id: int) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM agent_order WHERE plan_id=? ORDER BY id",
        (plan_id,),
    ).fetchall()
    orders = []
    for row in rows:
        item = dict(row)
        try:
            item["order_details"] = json.loads(item.get("order_details") or "{}")
        except json.JSONDecodeError:
            item["order_details"] = {}
        orders.append(item)
    return orders


def get_location(table_name: str, location_id: int) -> dict[str, Any] | None:
    service_map = {
        "restaurant": restaurant_service,
        "mall": mall_service,
        "amusement_park": amusement_park_service,
        "scenic_spot": scenic_spot_service,
        "exhibition_hall": exhibition_hall_service,
    }
    service = service_map.get(table_name)
    if not service:
        return None
    return service.get_by_id(location_id)


def build_share_text(plan: AgentPlan) -> str:
    lines = [f"搞定了，{plan.items[0].arrive_time if plan.items else '下午'} 出发，{plan.title}："]
    for item in plan.items:
        lines.append(
            f"{item.arrive_time}-{item.leave_time} {item.location_name}，"
            f"{item.stay_minute} 分钟。{item.remark}"
        )
    if plan.orders:
        labels = [_order_label(order) for order in plan.orders]
        lines.append("已完成关键安排：" + "、".join(labels))
    lines.append(f"预计花费约 {int(plan.total_cost)} 元。")
    return "\n".join(lines)


def build_share_payload(plan_id: int) -> dict[str, Any] | None:
    plan = travel_plan_service.get_by_id(plan_id)
    if not plan:
        return None
    items, _ = travel_plan_item_service.list_all(plan_id=plan_id, page=1, page_size=100)
    orders = get_agent_orders(plan_id)
    share_url = f"/api/agent/plans/{plan_id}/share"
    lines = [f"搞定了，方案：{plan['plan_title']}"]
    for item in items:
        location = get_location(item["location_table_name"], item["location_id"])
        name = location["name"] if location else item["location_table_name"]
        lines.append(
            f"{item.get('arrive_time')}-{item.get('leave_time')} {name}，"
            f"{item.get('stay_minute', 0)} 分钟。{item.get('remark') or ''}"
        )
    if orders:
        lines.append("已完成关键安排：" + "、".join(_order_label(AgentOrder(**order)) for order in orders))
    lines.append(f"预计花费约 {int(plan.get('total_cost') or 0)} 元。")
    return {
        "plan": plan,
        "items": items,
        "orders": orders,
        "share_text": "\n".join(lines),
        "share_url": share_url,
    }


def _with_distance(item: dict[str, Any]) -> dict[str, Any]:
    row = dict(item)
    row["distance"] = calc_distance(row["x"], row["y"])
    return row


def _can_book(item: dict[str, Any]) -> bool:
    return bool(
        item.get("booking_hours")
        and item.get("booking_hours") != "不能预约"
        and item.get("max_booking_count", -1) != -1
        and item.get("current_booking_count", 0) < item.get("max_booking_count", 0)
    )


def _family_restaurant_score(item: dict[str, Any]) -> float:
    tags = item.get("tags") or []
    score = 0
    if "亲子餐厅" in tags or "适合带娃" in tags:
        score += 8
    if item.get("cuisine_type") in {"日料", "粤菜", "中餐"}:
        score += 3
    if "环境好" in tags or "有包间" in tags:
        score += 2
    if _can_book(item):
        score += 3
    return score - item["distance"] / 100


def _friends_restaurant_score(item: dict[str, Any]) -> float:
    tags = item.get("tags") or []
    score = 0
    if item.get("cuisine_type") in {"火锅", "中餐", "烧烤", "西餐"}:
        score += 5
    if "网红店" in tags or "环境好" in tags:
        score += 3
    if _can_book(item):
        score += 2
    return score - item["distance"] / 100


def _family_activity_score(item: dict[str, Any]) -> float:
    score = 0
    if item.get("park_theme") in {"亲子", "童话", "卡通", "海洋"}:
        score += 8
    if item.get("queue_time", -1) in {-1, 5, 10}:
        score += 2
    return score - item["distance"] / 100


def _friends_exhibition_score(item: dict[str, Any]) -> float:
    score = 0
    if item.get("hall_type") in {"艺术", "综合", "科技"}:
        score += 5
    if item.get("interactive_project") == 1:
        score += 2
    if item.get("crowd_level", 2) <= 2:
        score += 2
    return score - item["distance"] / 100


def _infer_party_size(scenario: str) -> int:
    return 4 if scenario == "friends" else 3 if scenario == "family" else 2


def _match_persisted_item(plan_items: list[dict[str, Any]], item: AgentPlanItem) -> dict[str, Any] | None:
    for candidate in plan_items:
        if (
            candidate["location_table_name"] == item.location_table_name
            and candidate["location_id"] == item.location_id
            and candidate["arrive_time"] == item.arrive_time
        ):
            return candidate
    return None


def _external_reference(order_type: str, order_id: int) -> str:
    prefix = {
        "restaurant_reservation": "RSV",
        "queue_taking": "QUE",
        "ticket_booking": "TKT",
        "delivery": "DLV",
    }.get(order_type, "ORD")
    return f"{prefix}{order_id:06d}"


def _order_label(order: AgentOrder) -> str:
    if order.order_type == "restaurant_reservation":
        return f"{order.target_name}订座"
    if order.order_type == "queue_taking":
        return f"{order.target_name}取号"
    if order.order_type == "ticket_booking":
        return f"{order.target_name}预约"
    return f"{order.target_name}安排"


def add_minutes(time_text: str, minutes: int) -> str:
    dt = datetime.strptime(time_text, "%H:%M") + timedelta(minutes=minutes)
    return dt.strftime("%H:%M")
