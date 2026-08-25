import { writeFileSync } from "node:fs";

const outputPath = new URL("./recreated-innodb-storage.drawio", import.meta.url);

const cells = [];
let nextId = 1;

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function id(prefix) {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

function style(parts) {
  return Object.entries(parts)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .join(";");
}

function vertex(cellId, label, x, y, width, height, cellStyle) {
  cells.push(
    `<mxCell id="${esc(cellId)}" value="${esc(label)}" style="${esc(cellStyle)}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry"/></mxCell>`,
  );
}

function rect(cellId, label, x, y, width, height, fill = "#ffffff", stroke = "#222222", fontSize = 22, extra = {}) {
  vertex(
    cellId,
    label,
    x,
    y,
    width,
    height,
    style({
      rounded: 0,
      whiteSpace: "wrap",
      html: 1,
      fillColor: fill,
      strokeColor: stroke,
      strokeWidth: extra.strokeWidth ?? 2,
      fontSize,
      fontStyle: extra.bold ? 1 : 0,
      fontColor: extra.fontColor ?? "#111111",
      align: extra.align ?? "center",
      verticalAlign: extra.verticalAlign ?? "middle",
      spacing: extra.spacing,
    }),
  );
}

function text(cellId, label, x, y, width, height, fontSize = 28, color = "#111111", bold = false, align = "center") {
  vertex(
    cellId,
    label,
    x,
    y,
    width,
    height,
    style({
      text: 1,
      html: 1,
      strokeColor: "none",
      fillColor: "none",
      fontSize,
      fontStyle: bold ? 1 : 0,
      fontColor: color,
      align,
      verticalAlign: "middle",
      whiteSpace: "wrap",
    }),
  );
}

function line(cellId, x1, y1, x2, y2, opts = {}) {
  const points = opts.points
    ? `<Array as="points">${opts.points.map((p) => `<mxPoint x="${p.x}" y="${p.y}"/>`).join("")}</Array>`
    : "";
  cells.push(
    `<mxCell id="${esc(cellId)}" value="${esc(opts.label ?? "")}" style="${esc(
      style({
        edgeStyle: "none",
        rounded: 0,
        orthogonalLoop: 1,
        jettySize: "auto",
        html: 1,
        dashed: opts.dashed ? 1 : 0,
        strokeColor: opts.color ?? "#333333",
        strokeWidth: opts.width ?? 2,
        endArrow: opts.endArrow ?? "block",
        endFill: opts.endArrow === "none" ? 0 : 1,
        startArrow: opts.startArrow,
        startFill: opts.startArrow ? 1 : undefined,
        fontSize: opts.fontSize ?? 18,
      }),
    )}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${x1}" y="${y1}" as="sourcePoint"/><mxPoint x="${x2}" y="${y2}" as="targetPoint"/>${points}</mxGeometry></mxCell>`,
  );
}

function section(label, x, y, width, height) {
  rect(id("section"), "", x, y, width, height, "#ffffff", "#cfcfcf", 18, { strokeWidth: 2 });
  text(id("section-title"), label, x + 16, y + 10, width - 32, 40, 26, "#555555", true, "left");
}

function table(prefix, x, y, width, rows, rowHeight, fills, labels, fontSize = 18) {
  rows.forEach((_, index) => {
    rect(
      `${prefix}-r${index}`,
      labels[index] ?? "",
      x,
      y + index * rowHeight,
      width,
      rowHeight,
      fills[index] ?? "#ffffff",
      "#333333",
      fontSize,
      { bold: index === 0 },
    );
  });
}

function dottedEllipsis(cellId, x, y, width, height, fill, fontSize = 28) {
  rect(cellId, "...", x, y, width, height, fill, "#333333", fontSize, { bold: true, fontColor: "#ffffff" });
}

function figure1() {
  const y0 = 40;
  section("Reference 1 - Tablespace, Segment, Extent, Page, Row", 30, y0, 1940, 700);
  text("f1-title-tablespace", "Tablespace", 90, y0 + 42, 420, 54, 40, "#c87500", true);
  text("f1-title-segment", "Segment (\"file\")", 860, y0 + 42, 520, 54, 40, "#c87500", true);
  text("f1-title-extent", "Extent", 1580, y0 + 270, 250, 54, 36, "#c87500", true);
  text("f1-title-page", "Page", 980, y0 + 335, 220, 54, 36, "#c87500", true);
  text("f1-title-row", "Row", 300, y0 + 368, 220, 54, 36, "#c87500", true);

  rect("f1-tablespace", "", 70, y0 + 100, 610, 300, "#ffffff", "#000000", 20, { strokeWidth: 4 });
  rect("f1-leaf1", "Leaf node segment", 90, y0 + 120, 570, 90, "#ffffff", "#222222", 26, { bold: true });
  rect("f1-leaf2", "Leaf node segment", 90, y0 + 225, 570, 55, "#ffffff", "#222222", 24, { bold: true });
  rect("f1-nonleaf", "Non-leaf node<br>segment", 90, y0 + 295, 390, 75, "#ffffff", "#222222", 24, { bold: true });
  rect("f1-nlins", "N-l ns", 500, y0 + 295, 150, 75, "#ffffff", "#222222", 24, { bold: true });
  rect("f1-rollback", "Rollback segment", 90, y0 + 385, 570, 55, "#ffffff", "#222222", 24, { bold: true });

  rect("f1-segment", "", 780, y0 + 100, 780, 210, "#ffffff", "#000000", 20, { strokeWidth: 4 });
  for (let r = 0; r < 2; r += 1) {
    for (let c = 0; c < 2; c += 1) {
      rect(`f1-seg-ext-${r}-${c}`, "1M extent", 800 + c * 390, y0 + 120 + r * 85, 350, 60, "#ffffff", "#222222", 24, {
        bold: true,
      });
    }
  }

  rect("f1-rowbox", "", 70, y0 + 455, 640, 160, "#ffffff", "#000000", 20, { strokeWidth: 4 });
  rect("f1-row-tx", "Transaction id 6 B", 90, y0 + 470, 600, 38, "#ffffff", "#222222", 22, { bold: true });
  rect("f1-row-roll", "Roll pointer 7 B", 90, y0 + 515, 600, 38, "#ffffff", "#222222", 22, { bold: true });
  rect("f1-row-fp", "Field pointers n x 1-2 B", 90, y0 + 560, 600, 38, "#ffffff", "#222222", 22, { bold: true });
  rect("f1-field1", "Field 1", 90, y0 + 610, 170, 55, "#ffffff", "#222222", 22, { bold: true });
  rect("f1-field2", "Field 2", 280, y0 + 610, 170, 55, "#ffffff", "#222222", 22, { bold: true });
  rect("f1-fieldn", "Field n", 500, y0 + 610, 170, 55, "#ffffff", "#222222", 22, { bold: true });

  rect("f1-pagebox", "", 780, y0 + 420, 455, 190, "#ffffff", "#000000", 20, { strokeWidth: 4 });
  rect("f1-page-row1", "Row", 800, y0 + 435, 240, 70, "#ffffff", "#222222", 24, { bold: true });
  rect("f1-page-row2", "Row", 1060, y0 + 435, 155, 70, "#ffffff", "#222222", 24, { bold: true });
  rect("f1-page-row3", "Row", 800, y0 + 520, 160, 70, "#ffffff", "#222222", 24, { bold: true });
  rect("f1-page-row4", "Row", 980, y0 + 520, 115, 70, "#ffffff", "#222222", 24, { bold: true });
  rect("f1-page-row5", "Row", 1110, y0 + 520, 105, 70, "#ffffff", "#222222", 24, { bold: true });

  rect("f1-extentbox", "", 1285, y0 + 340, 560, 300, "#ffffff", "#000000", 20, { strokeWidth: 4 });
  for (let r = 0; r < 7; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      rect(`f1-grid-${r}-${c}`, "", 1310 + c * 61, y0 + 360 + r * 43, 45, 35, "#ffffff", "#222222", 12);
    }
  }
  rect("f1-64pages", "64 pages 16 kB each", 1310, y0 + 500, 510, 62, "#ffffff", "#b45f36", 24, { bold: true, strokeWidth: 3 });

  line("f1-dash-a", 680, y0 + 112, 780, y0 + 100, { dashed: true, endArrow: "none" });
  line("f1-dash-b", 680, y0 + 210, 780, y0 + 310, { dashed: true, endArrow: "none" });
  line("f1-dash-c", 1470, y0 + 205, 1845, y0 + 340, { dashed: true, endArrow: "none" });
  line("f1-dash-d", 1190, y0 + 420, 1285, y0 + 430, { dashed: true, endArrow: "none" });
  line("f1-dash-e", 710, y0 + 455, 780, y0 + 420, { dashed: true, endArrow: "none" });
}

function figure2() {
  const y0 = 780;
  const oy = 55;
  section("Reference 2 - InnoDB Page Internal Layout", 30, y0, 1940, 900);
  const x = 70;
  const w = 1370;
  const band = (name, label, yy, h, fill, size = 17) => rect(name, label, x, y0 + oy + yy, w, h, fill, "#9a9a9a", size);
  band("f2-header", "File Header / Page Header fields", 20, 80, "#f3d9df");
  band("f2-pagehdr", "Page Header: heap top, free list, garbage, last insert, direction, directory slots", 100, 120, "#dceec7", 16);
  band("f2-infimum", "Infimum record / Supremum record", 220, 70, "#d6f3f6", 18);
  band("f2-user1", "Record 1: record extra bytes + record data", 290, 70, "#d7cde8", 18);
  band("f2-user2", "Record 2: deleted / next-record metadata", 360, 70, "#d7cde8", 18);
  band("f2-purge", "Record 3: purge / rollback visible area", 430, 60, "#a7a7a7", 18);
  band("f2-usern", "Record N: record extra bytes + user data", 490, 95, "#d7cde8", 18);
  band("f2-free", "", 585, 210, "#4d7ed2", 38);
  rect("f2-slots", "Slot N | Slot 5 | Slot 2 | Slot 1: Infimum | Page Checksum | Trailer", x, y0 + oy + 795, w, 48, "#ededed", "#9a9a9a", 16);
  for (let i = 0; i < 8; i += 1) {
    line(`f2-column-${i}`, x + i * (w / 8), y0 + oy + 20, x + i * (w / 8), y0 + oy + 843, {
      color: "#cccccc",
      endArrow: "none",
      width: 1,
    });
  }
  text("f2-free-note", "Free Space Not Allocated", x + 60, y0 + oy + 640, 760, 70, 42, "#111111", false, "left");
  text("f2-offset-top", "0 / 20 / 40 / 60 / 80 / 100 / ...", x - 60, y0 + oy + 20, 55, 180, 14, "#555555", false, "right");

  const lx = 1500;
  const legend = [
    ["Page Header", "#f3d9df"],
    ["Page Header Info", "#dceec7"],
    ["Infimum/Supremum", "#d6f3f6"],
    ["User Records", "#d7cde8"],
    ["Purge Records", "#a7a7a7"],
    ["Free Space", "#4d7ed2"],
  ];
  legend.forEach(([label, fill], i) => rect(`f2-legend-${i}`, label, lx, y0 + oy + 30 + i * 82, 360, 44, fill, "#ffffff", 19));
}

function figure3() {
  const y0 = 1720;
  section("Reference 3 - XDES, FSP Header, INODE Structures", 30, y0, 1940, 760);
  text("f3-left-title", "Tablespace structure", 105, y0 + 195, 320, 32, 20, "#333333", true);
  const leftLabels = [
    "extent0 (1MB)",
    "extent1 (1MB)",
    "extent2 (1MB)",
    "...",
    "extent255 (1MB)",
    "extent256 (1MB)",
    "extent257 (1MB)",
    "extent258 (1MB)",
    "...",
    "extent511 (1MB)",
    "extent512 (1MB)",
    "extent513 (1MB)",
    "...",
  ];
  const leftFills = leftLabels.map((_, i) => (i < 5 ? "#00f020" : i < 10 ? "#00e4e8" : "#ee4eea"));
  table("f3-tspace", 90, y0 + 235, 360, leftLabels, 32, leftFills, leftLabels, 14);
  text("f3-extent-note1", "first 256<br>extents", 20, y0 + 255, 70, 120, 14, "#555555");
  text("f3-extent-note2", "second 256<br>extents", 20, y0 + 430, 70, 120, 14, "#555555");

  text("f3-xdes-title", "XDES Entry structure", 665, y0 + 40, 360, 30, 20, "#333333", true);
  table(
    "f3-xdes-entry",
    650,
    y0 + 75,
    380,
    ["a", "b", "c", "d"],
    38,
    ["#ffb26b", "#fbfb80", "#85f995", "#87eeee"],
    ["Segment ID (8 bytes)", "List Node (12 bytes)", "State (4 bytes)", "Page State Bitmap (16 bytes)"],
    14,
  );

  text("f3-list-title", "List Node structure", 1230, y0 + 40, 360, 30, 20, "#333333", true);
  table(
    "f3-list-node",
    1220,
    y0 + 75,
    390,
    ["a", "b", "c", "d"],
    36,
    ["#85f995", "#85f995", "#87eeee", "#87eeee"],
    ["Prev Node Page Number (4 bytes)", "Prev Node Offset (2 bytes)", "Next Node Page Number (4 bytes)", "Next Node Offset (2 bytes)"],
    13,
  );

  const midTables = [
    ["extent0 pages", 650, y0 + 350, ["FSP_HDR (16KB)", "IBUF_BITMAP (16KB)", "INODE (16KB)", "..."]],
    ["extent256 pages", 650, y0 + 500, ["XDES (16KB)", "IBUF_BITMAP (16KB)", "..."]],
    ["extent512 pages", 650, y0 + 620, ["XDES (16KB)", "IBUF_BITMAP (16KB)", "..."]],
  ];
  midTables.forEach(([title, tx, ty, labels], i) => {
    text(`f3-mid-title-${i}`, title, tx, ty - 34, 360, 28, 18, "#333333", true);
    table(`f3-mid-${i}`, tx, ty, 390, labels, 32, labels.map(() => "#ffb25d"), labels, 13);
  });

  text("f3-fsp-title", "FSP_HDR page structure", 1465, y0 + 250, 410, 30, 20, "#333333", true);
  table(
    "f3-fsp",
    1450,
    y0 + 285,
    430,
    ["a", "b", "c", "d", "e", "f", "g", "h"],
    28,
    ["#85f995", "#87eeee", "#90c5f5", "#90c5f5", "#90c5f5", "#90c5f5", "#ff78e8", "#ffb25d"],
    ["File Header (38 bytes)", "File Space Header (112 bytes)", "XDES Entry0 (40 bytes)", "XDES Entry1 (40 bytes)", "XDES Entry2 (40 bytes)", "XDES Entry255 (40 bytes)", "Empty Space (5986 bytes)", "File Trailer (8 bytes)"],
    12,
  );
  text("f3-inode-title", "INODE page structure", 1465, y0 + 535, 410, 30, 20, "#333333", true);
  table(
    "f3-inode",
    1450,
    y0 + 570,
    430,
    ["a", "b", "c", "d", "e", "f", "g"],
    28,
    ["#85f995", "#87eeee", "#90c5f5", "#90c5f5", "#90c5f5", "#ff78e8", "#ffb25d"],
    ["File Header (38 bytes)", "List Node for INODE Page List (12 bytes)", "INODE Entry0 (192 bytes)", "INODE Entry1 (192 bytes)", "INODE Entry84 (192 bytes)", "Empty Space (6 bytes)", "File Trailer (8 bytes)"],
    12,
  );

  text("f3-inode-entry-title", "INODE Entry structure", 1210, y0 + 600, 220, 30, 18, "#333333", true);
  table(
    "f3-inode-entry",
    1180,
    y0 + 635,
    250,
    ["a", "b", "c", "d", "e", "f"],
    25,
    ["#85f995", "#87eeee", "#fbfb80", "#fbfb80", "#ff7777", "#5bb3ef"],
    ["Segment ID (8 bytes)", "NOT_FULL_N_USED (4 bytes)", "List Base Node for FREE List", "List Base Node for FULL List", "Magic Number (4 bytes)", "Fragment Array Entries"],
    11,
  );

  line("f3-arrow-1", 450, y0 + 260, 650, y0 + 365, { points: [{ x: 560, y: y0 + 260 }] });
  line("f3-arrow-2", 450, y0 + 435, 650, y0 + 505, {});
  line("f3-arrow-3", 450, y0 + 595, 650, y0 + 625, {});
  line("f3-arrow-4", 1030, y0 + 95, 1220, y0 + 95, { startArrow: "block", endArrow: "block" });
  line("f3-arrow-5", 1040, y0 + 365, 1450, y0 + 310, { points: [{ x: 1160, y: y0 + 365 }, { x: 1160, y: y0 + 310 }] });
  line("f3-arrow-6", 1040, y0 + 520, 1450, y0 + 590, { points: [{ x: 1160, y: y0 + 520 }, { x: 1160, y: y0 + 590 }] });
  line("f3-arrow-7", 1450, y0 + 665, 1430, y0 + 665, { endArrow: "block" });
}

function figure4() {
  const y0 = 2540;
  section("Reference 4 - System Tablespace Extent Pages", 30, y0, 1940, 650);
  text("f4-left-title", "系统表空间结构", 180, y0 + 105, 330, 40, 30, "#d86f3a", true);
  const left = [
    "extent 0 (1MB)",
    "extent 1 (1MB)",
    "extent 2 (1MB)",
    "...",
    "extent 255 (1MB)",
    "extent 256 (1MB)",
    "extent 257 (1MB)",
    "extent 258 (1MB)",
    "...",
    "extent 511 (1MB)",
  ];
  const f4fills = left.map((_, i) => (i < 5 ? "#86ca86" : "#f6b457"));
  table("f4-left", 110, y0 + 160, 500, left, 44, f4fills, left, 24);
  ["0", "1 MB", "2 MB", "3 MB", "...", "255 MB", "256 MB", "257 MB", "258 MB", "259 MB", "..."].forEach((label, i) => {
    text(`f4-offset-${i}`, label, 20, y0 + 145 + i * 40, 80, 30, 22, "#333333", false, "right");
  });

  text("f4-ext0-title", "extent 0 的各个页", 1190, y0 + 35, 430, 45, 34, "#d86f3a", true);
  const ext0 = [
    "FSP_HDR (16KB)",
    "IBUF_BITMAP (16KB)",
    "INODE (16KB)",
    "SYS: Insert Buffer Header (16KB)",
    "INDEX: Insert Buffer Root (16KB)",
    "TRX_SYS: Transaction System (16KB)",
    "SYS: First Rollback Segment (16KB)",
    "SYS: Data Dictionary Header (16KB)",
    "...",
  ];
  table("f4-ext0", 1100, y0 + 95, 690, ext0, 38, ext0.map(() => "#86ca86"), ext0, 24);
  ["0", "16 KB", "32 KB", "48 KB", "64 KB", "80 KB", "96 KB", "112 KB", "128 KB", "...", "1 MB"].forEach((label, i) => {
    text(`f4-ext0-off-${i}`, label, 990, y0 + 83 + i * 36, 90, 28, 22, "#333333", false, "right");
  });

  text("f4-ext256-title", "extent 256 的各个页", 1190, y0 + 425, 430, 45, 34, "#d86f3a", true);
  table(
    "f4-ext256",
    1100,
    y0 + 485,
    690,
    ["XDES (16KB)", "IBUF_BITMAP (16KB)", "..."],
    42,
    ["#f6b457", "#f6b457", "#f6b457"],
    ["XDES (16KB)", "IBUF_BITMAP (16KB)", "..."],
    24,
  );
  text("f4-off-256", "256 MB<br>256 MB+16KB<br>256 MB+32KB<br>...<br>257 MB", 930, y0 + 475, 150, 150, 22, "#333333", false, "right");
  line("f4-arrow-a", 610, y0 + 182, 1100, y0 + 95, { points: [{ x: 760, y: y0 + 80 }] });
  line("f4-arrow-b", 610, y0 + 310, 1100, y0 + 255, {});
  line("f4-arrow-c", 610, y0 + 382, 1100, y0 + 485, {});
  line("f4-arrow-d", 610, y0 + 425, 1100, y0 + 560, {});
}

figure1();
figure2();
figure3();
figure4();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2026-08-20T00:00:00.000Z" agent="Codex Scientific Illustrator fallback" version="31.1.8" type="device">
  <diagram id="innodb-storage-recreated" name="InnoDB storage structures">
    <mxGraphModel dx="2000" dy="3260" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2000" pageHeight="3260" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;

writeFileSync(outputPath, xml, "utf8");
console.log(`Wrote ${outputPath.pathname}`);
