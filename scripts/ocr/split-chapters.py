# -*- coding: utf-8 -*-
"""
Split OCR per-page output (ocr-output/page-XXX.txt) into per-chapter markdown.

- Detects each chapter's first page by a heading-like line "第N章 ..."
  (short line, no TOC dot leaders, not ending with a page number).
- Strips running headers (book title / chapter title lines) and bare
  page-number lines.
- Joins wrapped lines within a page verbatim; blank line between pages.

Output: ocr-output/chapters/chapter-NN.md
"""
import os
import re
import sys

OCR_DIR = r"E:/project/Knowledge-OS/ocr-output"
OUT_DIR = os.path.join(OCR_DIR, "chapters")
BOOK_TITLE = "Redis设计与实现"
TOTAL_PAGES = 406

CHAPTERS = [
    (1, "引言"), (2, "简单动态字符串"), (3, "链表"), (4, "字典"),
    (5, "跳跃表"), (6, "整数集合"), (7, "压缩列表"), (8, "对象"),
    (9, "数据库"), (10, "RDB持久化"), (11, "AOF持久化"), (12, "事件"),
    (13, "客户端"), (14, "服务器"), (15, "复制"), (16, "Sentinel"),
    (17, "集群"), (18, "发布与订阅"), (19, "事务"), (20, "Lua脚本"),
    (21, "排序"), (22, "二进制位数组"), (23, "慢查询日志"), (24, "监视器"),
]

HEAD_RE = re.compile(r"^第\s*(\d{1,2})\s*章")
BARE_NUM_RE = re.compile(r"^\d{1,3}$")
BULLET_FIX_RE = re.compile(r"^[口文○]\s*")


def load_pages():
    pages = {}
    for pno in range(1, TOTAL_PAGES + 1):
        path = os.path.join(OCR_DIR, f"page-{pno:03d}.txt")
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            pages[pno] = [ln.strip() for ln in f.read().splitlines()]
    return pages


def chapter_heading_nums(line):
    """Return chapter numbers whose *heading* appears in this line.

    Strict match to avoid prose references like "第3章将介绍...":
    after removing spaces, line must equal "第N章" or start with
    "第N章<title前2字>".
    """
    norm = line.replace(" ", "")
    nums = set()
    m = re.match(r"^第(\d{1,2})章", norm)
    if not m:
        return nums
    n = int(m.group(1))
    title = dict(CHAPTERS).get(n)
    if title is None:
        return nums
    rest = norm[len(f"第{n}章"):]
    if rest == "" or rest.startswith(title[:2]):
        if len(norm) <= 25 and ".." not in norm and "…" not in norm:
            nums.add(n)
    return nums


def find_chapter_starts(pages):
    # pre-compute heading sets per page (first 10 lines)
    page_heads = {}
    for pno, lines in pages.items():
        heads = set()
        for ln in lines[:10]:
            heads |= chapter_heading_nums(ln)
        page_heads[pno] = heads

    starts = {}
    min_page = 1
    missing = []
    for num, title in CHAPTERS:
        found = None
        for pno in range(min_page, TOTAL_PAGES + 1):
            heads = page_heads.get(pno, set())
            if num not in heads:
                continue
            if len(heads) >= 2:
                continue  # 部分隔页：同时列出多章，跳过
            found = pno
            break
        if found:
            starts[num] = found
            min_page = found
        else:
            missing.append(num)
    return starts, missing


def clean_page_lines(lines, num, title):
    head_norm = f"第{num}章"
    out = []
    for ln in lines:
        if not ln:
            continue
        if BARE_NUM_RE.match(ln):
            continue
        norm = ln.replace(" ", "")
        if norm == BOOK_TITLE:
            continue
        if len(norm) <= 25 and (norm == head_norm or norm.startswith(head_norm + title[:2])):
            continue  # running header / chapter title page heading
        ln = BULLET_FIX_RE.sub("- ", ln)
        out.append(ln)
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    pages = load_pages()
    if not pages:
        print("no page files found")
        return 1

    starts, missing = find_chapter_starts(pages)
    print("chapter starts:", starts)
    if missing:
        print("MISSING chapters:", missing)

    for i, (num, title) in enumerate(CHAPTERS):
        if num not in starts:
            continue
        begin = starts[num]
        nxt = [starts[n] for n, _ in CHAPTERS if n in starts and starts[n] > begin]
        end = (min(nxt) - 1) if nxt else TOTAL_PAGES
        chunks = []
        for pno in range(begin, end + 1):
            lines = clean_page_lines(pages.get(pno, []), num, title)
            if lines:
                chunks.append("".join(lines))
        body = "\n\n".join(chunks)
        md = f"# 第{num}章 {title}\n\n<!-- OCR逐字 pages {begin}-{end} -->\n\n{body}\n"
        out_path = os.path.join(OUT_DIR, f"chapter-{num:02d}.md")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"chapter {num:2d} pages {begin:3d}-{end:3d} chars {len(body)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
