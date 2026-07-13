#!/usr/bin/env python3
"""
只重跑 generate_reference.py 的 CTA-PLS 區塊（含其專屬資料集），把結果合併進既有
tests/fixtures/reference.json，並更新 datasets.json 的 "cta" 鍵。

為什麼存在：Cowork 沙盒單次指令 45 秒上限，完整 generate_reference.py
（含 semopy/pingouin/statsmodels）會超時或缺套件；CTA 僅需 numpy/scipy。
本檔不複製統計程式碼——直接從 generate_reference.py 抽出「資料集建構段」與
「CTA-PLS 基準區塊」原始碼執行，單一事實來源仍是 generate_reference.py。

安全機制：重寫 datasets.json 前先比對既有鍵（main/small/ties/nca/cipma）逐位元
不變，任何漂移直接中止（沿 validation-report「plspm 版本敏感性」的教訓）。
"""
import json
import math
import os
import sys

import numpy as np
import pandas as pd  # 資料集建構段需要
from scipy import stats as sps

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, "fixtures")
REF = json.load(open(os.path.join(FIX, "reference.json")))
OLD_DS = json.load(open(os.path.join(FIX, "datasets.json")))


def put(name, source, **values):
    REF[name] = {"source": source, "values": {
        k: (None if v is None or (isinstance(v, float) and not math.isfinite(v)) else
            float(v) if isinstance(v, (int, float, np.floating, np.integer)) else v)
        for k, v in values.items()}}
    print(f"ok {name} ({len(values)} 值)")


src = open(os.path.join(HERE, "generate_reference.py"), encoding="utf-8").read()

# 段 A：資料集建構（numpy 專屬，含 cta 資料集）→ 重寫 datasets.json
a0 = src.index("rng = np.random.default_rng(42)")
a1 = src.index('json.dump(datasets, f, default=str)')
a1 = src.index("\n", a1) + 1
exec(compile(src[a0:a1], "generate_reference.py[datasets]", "exec"))

# 既有鍵零漂移檢查
NEW_DS = json.load(open(os.path.join(FIX, "datasets.json")))
for k in OLD_DS:
    if json.dumps(OLD_DS[k], sort_keys=True) != json.dumps(NEW_DS.get(k), sort_keys=True):
        json.dump(OLD_DS, open(os.path.join(FIX, "datasets.json"), "w"), default=str)
        sys.exit(f"!! datasets.json 既有鍵「{k}」發生漂移，已還原並中止")
print(f"datasets.json 既有鍵零漂移（{len(OLD_DS)} 鍵）；新增 cta")

# 段 B：CTA-PLS 基準區塊（單一事實來源）
b0 = src.index("# --- CTA-PLS 基準區塊 起")
b1 = src.index("# --- CTA-PLS 基準區塊 迄")
exec(compile(src[b0:b1], "generate_reference.py[CTA]", "exec"))

with open(os.path.join(FIX, "reference.json"), "w") as f:
    json.dump(REF, f, indent=1)
print(f"merged → reference.json（共 {len(REF)} 方法）")
