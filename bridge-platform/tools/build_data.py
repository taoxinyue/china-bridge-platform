#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
离线数据构建：从 data/raw/ 下的原始 Excel/CSV 清洗后写入 data/，
前端仍通过 fetch 静态文件加载（无后端）。

用法（在项目根目录「中国古桥可视化交互平台」下执行）：
  pip install -r tools/requirements.txt
  python tools/build_data.py

优先读取（存在即用其一）：
  data/raw/总目录.xlsx
  data/raw/总目录.csv

若 raw 中不存在总目录，则回退读取 data/总目录.csv（便于在已有数据上重算聚合）。

生成/覆盖：
  data/总目录.csv
  data/桥梁列表.csv（与总目录一致，四列）
  data/省份桥梁数量.csv
  data/朝代桥梁数量.csv

可选（仅当 raw 中存在时处理并写入 data/）：
  data/raw/各省推荐.csv 或 .xlsx -> data/各省推荐.csv
  data/raw/推荐.csv 或 .xlsx         -> data/推荐.csv

可选参数 --json：将聚合结果额外写入 data/generated/*.json。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RAW = DATA / "raw"
GEN = DATA / "generated"

CATALOG_COLS = ["省份", "行政区", "名称", "朝代"]
REC_PROV_COLS = ["省份", "行政区", "名称", "朝代", "性质"]
REC_SIMPLE_COLS = ["名称", "性质"]


def _read_table(path: Path) -> pd.DataFrame:
    if path.suffix.lower() in (".xlsx", ".xls"):
        return pd.read_excel(path)
    for enc in ("utf-8-sig", "utf-8", "gbk"):
        try:
            return pd.read_csv(path, encoding=enc)
        except UnicodeDecodeError:
            continue
    return pd.read_csv(path)


def _find_master() -> tuple[Path, pd.DataFrame]:
    candidates = [RAW / "总目录.xlsx", RAW / "总目录.csv", DATA / "总目录.csv"]
    for p in candidates:
        if p.exists():
            df = _read_table(p)
            return p, df
    raise FileNotFoundError(
        "未找到总目录：请将「总目录」放到 data/raw/总目录.csv 或 data/raw/总目录.xlsx，"
        "或保留 data/总目录.csv 作为回退源。"
    )


def clean_catalog(df: pd.DataFrame) -> pd.DataFrame:
    missing = [c for c in CATALOG_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"总目录缺少列: {missing}，当前列: {list(df.columns)}")
    out = df[CATALOG_COLS].copy()
    for c in CATALOG_COLS:
        out[c] = out[c].astype(str).str.strip()
    out = out[out["名称"].str.len() > 0]
    out = out.drop_duplicates(subset=["省份", "行政区", "名称"], keep="first")
    return out


def build_province_counts(df: pd.DataFrame) -> pd.DataFrame:
    g = df.groupby("省份", as_index=False).size()
    g = g.rename(columns={"size": "桥梁数量"})
    g = g.sort_values("省份")
    return g


def build_dynasty_counts(df: pd.DataFrame) -> pd.DataFrame:
    g = df.groupby("朝代", as_index=False).size()
    g = g.rename(columns={"size": "桥梁数量"})
    g = g.sort_values("桥梁数量", ascending=False)
    return g


def clean_optional(df: pd.DataFrame, cols: list[str], name: str) -> pd.DataFrame:
    missing = [c for c in cols if c not in df.columns]
    if missing:
        raise ValueError(f"{name} 缺少列: {missing}")
    out = df[cols].copy()
    for c in cols:
        out[c] = out[c].astype(str).str.strip()
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="从 raw 生成 data 下静态 CSV")
    parser.add_argument(
        "--json",
        action="store_true",
        help="额外写入 data/generated/*.json",
    )
    args = parser.parse_args()

    try:
        src_path, raw_df = _find_master()
    except FileNotFoundError as e:
        print(e, file=sys.stderr)
        return 1

    print(f"使用数据源: {src_path.relative_to(ROOT)}")
    cat = clean_catalog(raw_df)
    DATA.mkdir(parents=True, exist_ok=True)

    cat.to_csv(DATA / "总目录.csv", index=False, encoding="utf-8-sig")
    cat.to_csv(DATA / "桥梁列表.csv", index=False, encoding="utf-8-sig")

    build_province_counts(cat).to_csv(
        DATA / "省份桥梁数量.csv", index=False, encoding="utf-8-sig"
    )
    build_dynasty_counts(cat).to_csv(
        DATA / "朝代桥梁数量.csv", index=False, encoding="utf-8-sig"
    )

    print(
        f"已写入: 总目录.csv（{len(cat)} 行）, 桥梁列表.csv, "
        "省份桥梁数量.csv, 朝代桥梁数量.csv"
    )

    for name, cols, out_name in (
        ("各省推荐", REC_PROV_COLS, "各省推荐.csv"),
        ("推荐", REC_SIMPLE_COLS, "推荐.csv"),
    ):
        found = None
        for ext in (".csv", ".xlsx"):
            p = RAW / f"{name}{ext}"
            if p.exists():
                found = p
                break
        if not found:
            print(f"跳过（无 raw 文件）: {name}")
            continue
        try:
            sub = _read_table(found)
            sub = clean_optional(sub, cols, name)
            sub.to_csv(DATA / out_name, index=False, encoding="utf-8-sig")
            print(f"已写入: {out_name}（来自 {found.name}，{len(sub)} 行）")
        except Exception as ex:
            print(f"警告: 处理 {found} 失败: {ex}", file=sys.stderr)

    if args.json:
        GEN.mkdir(parents=True, exist_ok=True)
        prov = build_province_counts(cat)
        dyn = build_dynasty_counts(cat)
        (GEN / "province_counts.json").write_text(
            json.dumps(prov.to_dict(orient="records"), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        (GEN / "dynasty_counts.json").write_text(
            json.dumps(dyn.to_dict(orient="records"), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        (GEN / "catalog_sample.json").write_text(
            json.dumps(cat.head(20).to_dict(orient="records"), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"已写入: {GEN.relative_to(ROOT)}/province_counts.json 等")

    return 0


if __name__ == "__main__":
    sys.exit(main())
