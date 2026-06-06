"""预约执行与可用性检查工具。"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

from app.db.database import get_connection, safe_commit
from app.models.schemas import AgentPlan
from app.service import travel_plan_item_service, travel_plan_service
from app.agent.tools._utils import _to_int, _safe_str

# 合法的 location_table_name 白名单 — 防止 SQL 注入
_VALID_LOCATION_TABLES: set[str] = {
    "restaurant", "mall", "amusement_park", "scenic_spot", "exhibition_hall",
}


def _can_book(item: dict[str, Any]) -> bool:
    max_booking = _to_int(item.get("max_booking_count", -1), -1)
    current = _to_int(item.get("current_booking_count", 0))
    return bool(
        item.get("booking_hours")
        and item.get("booking_hours") != "不能预约"
        and max_booking != -1
        and current < max_booking
    )


def _check_availability(item: dict[str, Any]) -> bool:
    """检查地点是否可用（未满）。"""
    max_booking = _to_int(item.get("max_booking_count", 0))
    if max_booking <= 0:
        return True
    current = _to_int(item.get("current_booking_count", 0))
    return current < max_booking


def _is_fully_booked(item: dict[str, Any]) -> bool:
    """判断是否预约已满。"""
    max_booking = _to_int(item.get("max_booking_count", 0))
    if max_booking <= 0:
        return False
    return _to_int(item.get("current_booking_count", 0)) >= max_booking


def persist_agent_plan(session_id: int, plan: AgentPlan) -> AgentPlan:
    from app.agent.tools._location import _check_need_booking

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
        is_need = _check_need_booking(item.location_table_name, item.location_id)
        item_id, err_msg = travel_plan_item_service.create(
            {
                "plan_id": plan_id,
                "location_table_name": item.location_table_name,
                "location_id": item.location_id,
                "day_num": item.day_num,
                "is_need_booking": is_need,
                "is_had_booking": 0,
                "arrive_time": item.arrive_time,
                "leave_time": item.leave_time,
                "stay_minute": item.stay_minute,
                "travel_mode": item.travel_mode,
                "remark": item.remark,
            }
        )
        if item_id is not None:
            persisted_items.append(item.model_copy(update={"step_order": item.step_order}))
        else:
            logger.warning(
                "[Persist] item '%s' (table=%s, id=%s, arrive=%s, leave=%s) failed DB validation: %s — keeping in plan",
                item.location_name, item.location_table_name, item.location_id,
                item.arrive_time, item.leave_time, err_msg,
            )
            persisted_items.append(item.model_copy(update={"step_order": item.step_order}))

    return plan.model_copy(update={"id": plan_id, "items": persisted_items})


def execute_plan_actions(plan_id: int) -> list[dict[str, Any]]:
    """执行预约：检查容量并更新 current_booking_count 和 travel_plan_item.is_had_booking。"""
    from app.agent.tools._location import get_location

    plan_items, _ = travel_plan_item_service.list_all(plan_id=plan_id, page=1, page_size=100)
    results: list[dict[str, Any]] = []
    conn = get_connection()

    if not plan_items:
        results.append({
            "location_table_name": "",
            "location_id": 0,
            "location_name": "方案",
            "status": "success",
            "message": "方案已确认（无明细项）",
        })
        return results

    for item in plan_items:
        if item.get("is_had_booking"):
            continue

        table_name = item["location_table_name"]
        # 白名单校验：防止意外或恶意的表名注入
        if table_name not in _VALID_LOCATION_TABLES:
            results.append({
                "location_table_name": table_name,
                "location_id": item["location_id"],
                "location_name": "",
                "status": "failed",
                "message": f"无效的地点类型: {table_name}",
            })
            continue
        location_id = item["location_id"]
        location = get_location(table_name, location_id)

        if not location:
            continue

        if not item.get("is_need_booking"):
            results.append({
                "location_table_name": table_name,
                "location_id": location_id,
                "location_name": location.get("name", ""),
                "status": "success",
                "message": "无需预约",
            })
            continue

        max_count = location.get("max_booking_count", -1)

        if max_count <= 0:
            # 无预约上限，直接标记已预约
            conn.execute(
                "UPDATE travel_plan_item SET is_had_booking=1, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                (item["id"],),
            )
            safe_commit(conn)
            results.append({
                "location_table_name": table_name,
                "location_id": location_id,
                "location_name": location["name"],
                "status": "success",
                "message": "预约成功",
            })
        else:
            # 原子预约：UPDATE ... WHERE current_booking_count < max_booking_count
            # rowcount=0 表示名额已满，杜绝并发竞态
            conn.execute("BEGIN IMMEDIATE")
            cur = conn.execute(
                f"UPDATE {table_name} SET current_booking_count = current_booking_count + 1 "
                f"WHERE id=? AND current_booking_count < max_booking_count",
                (location_id,),
            )
            if cur.rowcount > 0:
                conn.execute(
                    "UPDATE travel_plan_item SET is_had_booking=1, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                    (item["id"],),
                )
                safe_commit(conn)
                results.append({
                    "location_table_name": table_name,
                    "location_id": location_id,
                    "location_name": location["name"],
                    "status": "success",
                    "message": "预约成功",
                })
            else:
                conn.rollback()
                results.append({
                    "location_table_name": table_name,
                    "location_id": location_id,
                    "location_name": location.get("name", ""),
                    "status": "failed",
                    "message": "已约满或不可预约",
                })

    return results
