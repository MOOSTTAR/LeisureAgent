"""重置数据库并验证坐标在 ±1500 范围内。"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import close_db, init_db, get_connection

# 关闭已有连接后重新初始化（表已手动删除）
close_db()
init_db()
print("数据库已重置，种子数据已重新生成")

# 验证坐标范围
conn = get_connection()
for table in ["restaurant", "mall", "amusement_park", "scenic_spot", "exhibition_hall"]:
    rows = conn.execute(f"SELECT id, name, x, y FROM {table}").fetchall()
    xs = [r["x"] for r in rows]
    ys = [r["y"] for r in rows]
    ok = max(abs(v) for v in xs + ys) < 1500
    print(f"  {table:20s} count={len(rows):2d}  x:[{min(xs):5d},{max(xs):5d}]  y:[{min(ys):5d},{max(ys):5d}]  {'OK' if ok else 'FAIL'}")