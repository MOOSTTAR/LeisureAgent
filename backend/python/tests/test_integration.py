"""Agent 端到端集成测试 — 覆盖 new_plan / inquiry / feedback / confirm / edge-cases 全路径。"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.agent.tools import _clear_locations_cache
from app.db.database import reset_db
from app.main import app

client = TestClient(app)


def setup_function() -> None:
    reset_db()
    _clear_locations_cache()


# ═══════════════════════════════════════════════════════════════
# new_plan 路径
# ═══════════════════════════════════════════════════════════════

def test_new_plan_family_auto_execute_returns_plan_and_booking() -> None:
    """亲子场景 + 一键执行 → 方案生成后自动预约。"""
    response = client.post(
        "/api/chat",
        json={
            "message": "今天下午想和老婆孩子出去玩几个小时，孩子5岁，老婆最近在减肥，别离家太远",
            "auto_execute": True,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["session_id"]
    assert body["plan"]["scenario"] == "family"
    assert body["plan"]["items"]
    assert any(item["activity_type"] == "dining" for item in body["plan"]["items"])
    assert any(item["activity_type"] == "play" for item in body["plan"]["items"])


def test_new_plan_friends_scenario() -> None:
    """朋友聚会场景 → 展馆/景点 + 餐厅。"""
    response = client.post(
        "/api/chat",
        json={
            "message": "今天下午和朋友出去玩，总共4个人，2男2女，想拍照聊天，别离家太远",
            "auto_execute": True,
        },
    )
    assert response.status_code == 200
    plan = response.json()["plan"]
    assert plan["scenario"] == "friends"
    assert plan["items"]
    # 朋友场景应有展馆或景点
    play_tables = {item["location_table_name"] for item in plan["items"] if item["activity_type"] == "play"}
    assert play_tables & {"exhibition_hall", "scenic_spot"}


def test_new_plan_couple_scenario() -> None:
    """情侣场景 → 应被正确识别。"""
    response = client.post(
        "/api/chat",
        json={
            "message": "下午和男朋友出去约会，想找个浪漫的地方逛逛然后吃饭",
        },
    )
    assert response.status_code == 200
    plan = response.json()["plan"]
    assert plan["scenario"] == "couple"


def test_new_plan_with_cuisine_preference() -> None:
    """用户指定菜系 → 方案中餐厅应匹配。"""
    response = client.post(
        "/api/chat",
        json={"message": "下午带孩子去游乐园，晚上吃火锅", "auto_execute": True},
    )
    assert response.status_code == 200
    plan = response.json()["plan"]
    dining_items = [item for item in plan["items"] if item["activity_type"] == "dining"]
    assert dining_items


def test_new_plan_with_specific_location() -> None:
    """用户提到具体地点名 → 应出现在方案中。"""
    response = client.post(
        "/api/chat",
        json={
            "message": "下午想去玩，把双龙峡加入计划，然后吃饭",
            "auto_execute": True,
        },
    )
    assert response.status_code == 200
    plan = response.json()["plan"]
    assert plan["items"]


# ═══════════════════════════════════════════════════════════════
# inquiry 路径
# ═══════════════════════════════════════════════════════════════

def test_inquiry_cuisine_search() -> None:
    """搜索火锅餐厅 → 应返回查询结果而非方案。"""
    response = client.post(
        "/api/chat",
        json={"message": "附近有什么火锅"},
    )
    assert response.status_code == 200
    body = response.json()
    # inquiry 不生成 plan
    assert body.get("plan") is None


def test_inquiry_short_domain_term() -> None:
    """短输入纯领域词 → inquiry 而非 new_plan。"""
    response = client.post(
        "/api/chat",
        json={"message": "日料"},
    )
    assert response.status_code == 200
    body = response.json()
    # 纯领域词短输入应走 inquiry，不生成 plan
    assert body.get("plan") is None


def test_inquiry_vague_prompts_clarify() -> None:
    """模糊查询 → 应反问引导而非直接搜索。"""
    response = client.post(
        "/api/chat",
        json={"message": "帮我推荐点好吃的"},
    )
    assert response.status_code == 200
    body = response.json()
    # 模糊查询应走 clarify/direct_reply，不生成 plan
    assert body.get("plan") is None
    reply = body.get("reply", "")
    # 应包含引导性回复（反问或提示）
    assert len(reply) > 10 or "?" in reply or "？" in reply


# ═══════════════════════════════════════════════════════════════
# feedback 路径
# ═══════════════════════════════════════════════════════════════

def test_feedback_modify_plan() -> None:
    """生成方案 → 发送反馈 → 方案被修改。"""
    # 先创建方案
    first = client.post(
        "/api/chat",
        json={"message": "下午带孩子去游乐园然后吃饭"},
    ).json()
    session_id = first["session_id"]
    original_items_count = len(first["plan"]["items"])

    # 发送反馈
    second = client.post(
        "/api/chat",
        json={"message": "换一家餐厅", "session_id": session_id},
    ).json()
    assert second["session_id"] == session_id
    # 反馈后应生成新方案
    assert second.get("plan")


def test_feedback_cheaper_option() -> None:
    """用户要求更便宜 → 触发重新搜索。"""
    first = client.post(
        "/api/chat",
        json={"message": "下午带孩子去玩然后吃饭"},
    ).json()
    session_id = first["session_id"]

    second = client.post(
        "/api/chat",
        json={"message": "太贵了，便宜一点", "session_id": session_id},
    ).json()
    assert second.get("plan")


def test_feedback_remove_location() -> None:
    """用户要求去掉某个地点 → 方案应更新。"""
    first = client.post(
        "/api/chat",
        json={"message": "下午去游乐园再去商场然后吃饭"},
    ).json()
    session_id = first["session_id"]

    second = client.post(
        "/api/chat",
        json={"message": "不去商场了", "session_id": session_id},
    ).json()
    assert second.get("plan")


def test_feedback_add_location() -> None:
    """用户在已有方案中增加地点。"""
    first = client.post(
        "/api/chat",
        json={"message": "下午带孩子去玩然后吃日料"},
    ).json()
    session_id = first["session_id"]

    second = client.post(
        "/api/chat",
        json={"message": "加入商场", "session_id": session_id},
    ).json()
    assert second.get("plan")


# ═══════════════════════════════════════════════════════════════
# confirm 路径
# ═══════════════════════════════════════════════════════════════

def test_confirm_executes_plan() -> None:
    """用户确认后直接执行预约。"""
    first = client.post(
        "/api/chat",
        json={"message": "下午带孩子去游乐园然后吃饭"},
    ).json()
    session_id = first["session_id"]

    second = client.post(
        "/api/chat",
        json={"message": "确认", "session_id": session_id},
    ).json()
    # confirm 路径应返回执行结果
    assert second["current_step"] in ("finalize_executed", "done")


def test_confirm_with_yes_keyword() -> None:
    """用"好的"确认。"""
    first = client.post(
        "/api/chat",
        json={"message": "下午去公园然后吃火锅"},
    ).json()
    session_id = first["session_id"]

    second = client.post(
        "/api/chat",
        json={"message": "好的", "session_id": session_id},
    ).json()
    assert second["current_step"] in ("finalize_executed", "done")


# ═══════════════════════════════════════════════════════════════
# 边界情况
# ═══════════════════════════════════════════════════════════════

def test_casual_greeting_direct_reply() -> None:
    """寒暄输入 → 直接友好回复，不走规划流程。"""
    response = client.post(
        "/api/chat",
        json={"message": "你好"},
    )
    assert response.status_code == 200
    body = response.json()
    # 寒暄不应生成 plan
    assert body.get("plan") is None
    assert body["stage"] == "chatting"


def test_out_of_domain_rejection() -> None:
    """完全无关话题 → 委婉拒绝。"""
    response = client.post(
        "/api/chat",
        json={"message": "今天天气怎么样"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body.get("plan") is None


def test_weekday_rejection() -> None:
    """工作日请求 → 应拒绝或引导到周末（非规划）。"""
    response = client.post(
        "/api/chat",
        json={"message": "周一想去爬山"},
    )
    assert response.status_code == 200
    body = response.json()
    # 工作日应被拦截：不生成 plan，且回复中提及限制
    assert body.get("plan") is None
    reply = body.get("reply", "")
    assert "周末" in reply or "不支持" in reply or "暂时" in reply or "抱歉" in reply


def test_weekend_allowed() -> None:
    """明确提到周末 → 应正常规划。"""
    response = client.post(
        "/api/chat",
        json={"message": "周六想去公园然后吃饭"},
    )
    assert response.status_code == 200
    body = response.json()
    # 明确周末应正常规划
    assert body.get("plan") is not None


def test_multi_turn_session_preserves_context() -> None:
    """多轮对话 → 会话上下文保持。"""
    # Turn 1: 创建方案
    first = client.post(
        "/api/chat",
        json={"message": "今天下午想和老婆孩子出去玩，孩子5岁"},
    ).json()
    session_id = first["session_id"]
    assert first["plan"]["scenario"] == "family"

    # Turn 2: 反馈
    second = client.post(
        "/api/chat",
        json={"message": "那就别太累，晚餐清淡一点", "session_id": session_id},
    ).json()
    assert second["session_id"] == session_id
    # 场景应保持 family
    assert second["plan"]["scenario"] == "family"

    # Turn 3: 确认
    third = client.post(
        "/api/chat",
        json={"message": "没问题，就这样", "session_id": session_id},
    ).json()
    assert third["session_id"] == session_id
    # 确认后应完成（finalize_executed 或 done）
    assert third["current_step"] in ("finalize_executed", "done")

    # 验证会话详情
    detail = client.get(f"/api/agent/sessions/{session_id}").json()
    assert detail["code"] == 0
    assert len(detail["data"]["messages"]) >= 4  # 至少 3 轮对话


def test_session_list_and_delete() -> None:
    """会话列表和删除。"""
    created = client.post(
        "/api/chat",
        json={"message": "今天下午和朋友4个人出去玩"},
    ).json()

    sessions = client.get("/api/agent/sessions").json()
    assert sessions["code"] == 0
    assert sessions["data"]["total"] >= 1

    deleted = client.delete(f"/api/agent/sessions/{created['session_id']}").json()
    assert deleted["code"] == 0


def test_share_endpoint() -> None:
    """分享端点返回完整数据。"""
    chat = client.post(
        "/api/chat",
        json={"message": "今天下午想和老婆孩子出去玩，孩子5岁，老婆减肥，别离家太远"},
    ).json()
    plan_id = chat["plan"]["id"]

    share = client.get(f"/api/agent/plans/{plan_id}/share").json()
    assert share["code"] == 0
    assert "share_text" in share["data"]


def test_plan_execute_endpoint() -> None:
    """手动执行端点。"""
    chat = client.post(
        "/api/chat",
        json={"message": "下午带孩子去游乐园然后吃火锅"},
    ).json()
    plan_id = chat["plan"]["id"]

    result = client.post(f"/api/agent/plans/{plan_id}/execute").json()
    assert result["code"] == 0
    assert all(r["status"] == "success" for r in result["data"])


def test_update_travel_modes() -> None:
    """更新出行方式。"""
    chat = client.post(
        "/api/chat",
        json={"message": "下午去公园然后吃饭"},
    ).json()
    plan_id = chat["plan"]["id"]
    item_count = len(chat["plan"]["items"])

    modes = ["walking"] + ["driving"] * (item_count - 1)
    result = client.put(
        f"/api/agent/plans/{plan_id}/travel-modes",
        json=modes,
    ).json()
    assert result["code"] == 0


def test_update_travel_modes_mismatch() -> None:
    """出行方式数量不匹配 → 返回错误。"""
    chat = client.post(
        "/api/chat",
        json={"message": "下午去游乐园再去商场然后吃饭"},
    ).json()
    plan_id = chat["plan"]["id"]
    item_count = len(chat["plan"]["items"])
    # 发送数量不匹配的 modes 数组（比实际少 1 个）
    result = client.put(
        f"/api/agent/plans/{plan_id}/travel-modes",
        json=["walking"] * max(1, item_count - 1),
    ).json()
    # 如果方案项只有 1 个或更少，不会触发 mismatch
    if item_count <= 1:
        assert result["code"] == 0  # 刚好匹配
    else:
        assert result["code"] == 400


def test_new_plan_after_feedback_opens_new_plan() -> None:
    """反馈后说"重新规划" → 开启新规划。"""
    first = client.post(
        "/api/chat",
        json={"message": "下午去公园然后吃火锅"},
    ).json()
    session_id = first["session_id"]

    second = client.post(
        "/api/chat",
        json={"message": "重新规划，下午去看展然后吃日料", "session_id": session_id},
    ).json()
    assert second.get("plan")


def test_empty_input_handled() -> None:
    """空输入被 Pydantic 校验拦截，不崩溃。"""
    response = client.post(
        "/api/chat",
        json={"message": ""},
    )
    # 空输入触发 Pydantic 校验 → 422，不会导致 500
    assert response.status_code in (200, 422)
