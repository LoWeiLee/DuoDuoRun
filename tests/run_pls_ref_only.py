#!/usr/bin/env python3
"""
只重跑 generate_reference.py 的 PLS 區塊（W1/W3/W4），把結果合併進既有
tests/fixtures/reference.json，不動其他方法的基準值。

為什麼存在：Cowork 沙盒單次指令有 45 秒上限，完整跑 generate_reference.py
（含 semopy/pingouin 等）會超時；PLS 區塊本身在時限內可完成。
本檔不複製任何統計程式碼——直接從 generate_reference.py 抽出
「# --- PLS-SEM」起到 json dump 前的原始碼執行，單一事實來源仍是
generate_reference.py（Kevin 本機或 CI 可整支重跑，結果一致）。
"""
import json
import math
import os
import sys

import numpy as np
import pandas as pd
from scipy import stats as sps

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, "fixtures")

# 資料集：與 generate_reference.py 相同（datasets.json 是它寫出的固定種子資料）
D = json.load(open(os.path.join(FIX, "datasets.json")))
main = pd.DataFrame(D["main"])
mainc = main.copy()
N = len(main)
# W6 起 exec 範圍含 NCA / cIPMA 區塊，它們以 datasets["nca"] / datasets["cipma"]
# 取固定資料與排列 → 以 datasets.json 內容作別名（單一事實來源不變）
datasets = D

REF = json.load(open(os.path.join(FIX, "reference.json")))


def put(method, source, **values):
    if isinstance(source, str) and "FAILED" in source:
        print(f"!! {method}: {source}", file=sys.stderr)
        REF[method] = {"source": source, "values": {}}
        return
    REF[method] = {"source": source, "values": values}
    print(f"ok {method} ({len(values)} 值)")


# 抽出 generate_reference.py 的 PLS 區塊原始碼（單一事實來源）
src = open(os.path.join(HERE, "generate_reference.py"), encoding="utf-8").read()
start = src.index("# --- PLS-SEM")  # W1 區塊起點
# 2026-07-13：切片終點原為 json dump，會連帶執行 PLS 之後新增的
# 集群/LDA/EFA/CFA 區塊——它們依賴 PLS 區塊外的變數與 semopy、
# 且 CFA 段包在 try/except 內，缺套件時會把既有基準覆寫成 FAILED。
# 改為在集群區塊前收斂，回歸「只重跑 PLS 系列」的原始用途。
end = src.index("# --- 集群分析")
code = src[start:end]

exec(compile(code, "generate_reference.py[PLS-blocks]", "exec"))

with open(os.path.join(FIX, "reference.json"), "w") as f:
    json.dump(REF, f, indent=1)
print(f"merged → reference.json（共 {len(REF)} 方法）")
