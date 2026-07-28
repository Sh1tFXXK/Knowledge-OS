import re

with open("src/core/ExplanationIndexView.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find lines with duplicate className and fix
new_lines = []
skip_next = False
for i, line in enumerate(lines):
    # Skip the broken className line (missing backticks before $)
    if "className={" in line and "${hasChildren" in line and "className={`" not in line:
        continue
    new_lines.append(line)

with open("src/core/ExplanationIndexView.tsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("ok")
