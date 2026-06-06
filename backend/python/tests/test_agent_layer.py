from __future__ import annotations

from fastapi.testclient import TestClient

from app.agent.tools import _clear_locations_cache
from app.db.database import reset_db
from app.main import app


def setup_function() -> None:
    reset_db()
    _clear_locations_cache()


def test_family_chat_creates_session_plan_orders_and_share() -> None:
    client = TestClient(app)
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
    assert body["current_step"] == "done"
    assert body["plan"]["scenario"] == "family"
    assert body["plan"]["items"]
    assert any(item["activity_type"] == "dining" for item in body["plan"]["items"])
    assert "搞定了" in body["share_text"]
    assert body["share_url"].startswith("/api/agent/plans/")


def test_friends_chat_uses_friend_scenario() -> None:
    client = TestClient(app)
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
    assert any(word in plan["description"] for word in ["朋友", "好友", "闺蜜", "哥们"])
    assert any(item["location_table_name"] in {"exhibition_hall", "scenic_spot"} for item in plan["items"])


def test_session_history_and_second_turn_context() -> None:
    client = TestClient(app)
    first = client.post(
        "/api/chat",
        json={"message": "今天下午想和老婆孩子出去玩，孩子5岁，老婆减肥，别离家太远"},
    ).json()
    session_id = first["session_id"]

    second = client.post(
        "/api/chat",
        json={"message": "那就别太累，晚餐清淡一点", "session_id": session_id},
    ).json()

    assert second["session_id"] == session_id
    assert second["plan"]["scenario"] == "family"

    detail = client.get(f"/api/agent/sessions/{session_id}").json()
    assert detail["code"] == 0
    assert len(detail["data"]["messages"]) >= 4


def test_session_list_and_delete() -> None:
    client = TestClient(app)
    created = client.post("/api/chat", json={"message": "今天下午和朋友4个人出去玩"}).json()

    sessions = client.get("/api/agent/sessions").json()
    assert sessions["code"] == 0
    assert sessions["data"]["total"] >= 1

    deleted = client.delete(f"/api/agent/sessions/{created['session_id']}").json()
    assert deleted["code"] == 0


def test_share_endpoint_returns_text_and_plan() -> None:
    client = TestClient(app)
    chat = client.post(
        "/api/chat",
        json={"message": "今天下午想和老婆孩子出去玩，孩子5岁，老婆减肥，别离家太远"},
    ).json()
    plan_id = chat["plan"]["id"]

    share = client.get(f"/api/agent/plans/{plan_id}/share").json()
    assert share["code"] == 0
    assert "share_text" in share["data"]
    assert "搞定了" in share["data"]["share_text"]
