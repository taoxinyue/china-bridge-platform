#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
GEN = DATA / "generated"

CATALOG_COLS = ["省份", "行政区", "名称", "朝代"]


def _read_table(path: Path) -> pd.DataFrame:
    for enc in ("utf-8-sig", "utf-8", "gbk"):
        try:
            return pd.read_csv(path, encoding=enc)
        except UnicodeDecodeError:
            continue
    return pd.read_csv(path)


def clean_catalog(df: pd.DataFrame) -> pd.DataFrame:
    missing = [c for c in CATALOG_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"桥梁列表缺少列: {missing}，当前列: {list(df.columns)}")
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


def main() -> int:
    src_path = DATA / "桥梁列表.csv"
    if not src_path.exists():
        print(f"未找到桥梁列表: {src_path}", file=sys.stderr)
        return 1

    print(f"使用数据源: {src_path.relative_to(ROOT)}")
    raw_df = _read_table(src_path)
    cat = clean_catalog(raw_df)
    
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
    
    print(f"已写入: {GEN.relative_to(ROOT)}/province_counts.json")
    print(f"已写入: {GEN.relative_to(ROOT)}/dynasty_counts.json")
    print(f"处理完成，共 {len(cat)} 条桥梁记录")

    return 0


if __name__ == "__main__":
    sys.exit(main())
