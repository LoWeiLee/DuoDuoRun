#!/usr/bin/env python3
"""
只重跑 generate_reference.py 的 NCA 區塊（含其專屬資料集），把結果合併進既有
tests/fixtures/reference.json，並更新 datasets.json 的 "nca" 鍵。

為什麼存在：Cowork 沙盒單次指令 45 秒上限，完整 generate_reference.py
（含 semopy/pingouin/statsmodels）會超時或缺套件；NCA 僅需 numpy。
本檔不複製統計程式碼——直接從 generate_reference.py 抽出「資料集建構段」與
「NCA 基準區塊」原始碼執行，單一事實來源仍是 generate_reference.py。
"""
import json
import math
import os
import sys

import numpy as np
import pandas as pd  # 資料集建構段需要
from scipy import stats as sps  # noqa: F401（資料集段可能引用）

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, "fixtures")
REF = json.load(open(os.path.join(FIX, "reference.json")))


def put(name, source, **values):
    REF[name] = {"source": source, "values": {
        k: (None if v is None or (isinstance(v, float) and not math.isfinite(v)) else
            float(v) if isinstance(v, (int, float, np.floating, np.integer)) else v)
        for k, v in values.items()}}
    print(f"ok {name} ({len(values)} 值)")


src = open(os.path.join(HERE, "generate_reference.py"), encoding="utf-8").read()

# 段 A：資料集建構（numpy 專屬，含 nca 資料集）→ 重寫 datasets.json
a0 = src.index("rng = np.random.default_rng(42)")
a1 = src.index('json.dump(datasets, f, default=str)')
a1 = src.index("\n", a1) + 1
exec(compile(src[a0:a1], "generate_reference.py[datasets]", "exec"))

# 段 B：NCA 基準區塊（單一事實來源）
b0 = src.index("# --- NCA（必要條件分析）基準區塊 起")
b1 = src.index("# --- NCA 基準區塊 迄")
exec(compile(src[b0:b1], "generate_reference.py[NCA]", "exec"))

with open(os.path.join(FIX, "reference.json"), "w") as f:
    json.dump(REF, f, indent=1)
print(f"merged → reference.json（共 {len(REF)} 方法）; datasets.json 已含 nca")
