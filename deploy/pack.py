#!/usr/bin/env python3
"""把 dist/ 打包成可以直接解压到站点根目录的部署包。

默认剔除 md/ 目录：云端文档是运行时读取的，服务器上的 md/ 由你自己维护，
部署包只负责更新界面代码，不该去动它。确实需要连文档一起带上时用 --with-md。

用法（在项目根目录执行）：
    python deploy/pack.py
    python deploy/pack.py --with-md
"""
import os
import sys
import tarfile
import zipfile

ROOT = "dist"
ZIP = "wiki-dist.zip"
TGZ = "wiki-dist.tar.gz"
SKIP_TOP = [] if "--with-md" in sys.argv else ["md"]


def keep(arc):
    return arc.split("/")[0] not in SKIP_TOP


def collect():
    files = []
    for dirpath, _, filenames in os.walk(ROOT):
        for name in sorted(filenames):
            full = os.path.join(dirpath, name)
            arc = os.path.relpath(full, ROOT).replace(os.sep, "/")
            if keep(arc):
                files.append((full, arc))
    return files


def main():
    if not os.path.isdir(ROOT):
        sys.exit("找不到 " + ROOT + " 目录，请先运行 npm run build")

    files = collect()
    if not files:
        sys.exit("dist/ 里没有可打包的文件")

    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for full, arc in files:
            z.write(full, arc)

    with tarfile.open(TGZ, "w:gz") as t:
        for full, arc in files:
            t.add(full, arc)

    print("部署包已生成（%d 个文件）" % len(files))
    for _, arc in files:
        print("   " + arc)
    print("zip: %.1f KB   tar.gz: %.1f KB" % (os.path.getsize(ZIP) / 1024, os.path.getsize(TGZ) / 1024))
    if SKIP_TOP:
        print("已剔除: " + ", ".join(SKIP_TOP) + "  —— 服务器上现有的文档不受影响")


main()
