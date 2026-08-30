# -*- coding: utf-8 -*-
"""
OCR pipeline for scanned PDF (Redis 设计与实现).

Usage:
  python ocr-redis-pdf.py [--start N] [--end M] [--zoom 2.5]

Renders each PDF page with PyMuPDF, runs RapidOCR (Chinese),
writes one text file per page into ocr-output/page-XXX.txt.
Supports resume: pages with existing non-empty output are skipped.
"""
import argparse
import os
import sys
import time

import fitz  # PyMuPDF
import numpy as np
from rapidocr_onnxruntime import RapidOCR

PDF_PATH = r"D:/BaiduNetdiskDownload/Redis设计与实现.pdf"
OUT_DIR = r"E:/project/Knowledge-OS/ocr-output"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=1, help="first page (1-based)")
    parser.add_argument("--end", type=int, default=0, help="last page (1-based, 0=all)")
    parser.add_argument("--zoom", type=float, default=2.5, help="render zoom (72dpi * zoom)")
    args = parser.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    doc = fitz.open(PDF_PATH)
    total = doc.page_count
    start = max(1, args.start)
    end = total if args.end <= 0 else min(args.end, total)
    print(f"PDF pages: {total}, OCR range: {start}..{end}, zoom={args.zoom}", flush=True)

    engine = RapidOCR()
    matrix = fitz.Matrix(args.zoom, args.zoom)

    t0 = time.time()
    done = 0
    for pno in range(start, end + 1):
        out_path = os.path.join(OUT_DIR, f"page-{pno:03d}.txt")
        if os.path.exists(out_path) and os.path.getsize(out_path) > 10:
            done += 1
            continue
        page = doc.load_page(pno - 1)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        result, _ = engine(img)
        lines = [item[1] for item in result] if result else []
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        done += 1
        if done % 10 == 0:
            elapsed = time.time() - t0
            speed = done / elapsed if elapsed else 0
            remain = (end - start + 1 - done) / speed if speed else 0
            print(f"[{pno}/{end}] {speed:.2f} pages/s, ETA {remain/60:.1f} min", flush=True)

    print(f"DONE. {done} pages in {(time.time()-t0)/60:.1f} min", flush=True)


if __name__ == "__main__":
    sys.exit(main())
