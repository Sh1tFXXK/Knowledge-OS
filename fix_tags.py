import re

with open("src/core/ExplanationIndexView.tsx", "r", encoding="utf-8") as f:
    c = f.read()

# Remove visibleTags/hiddenTagCount lines
c = c.replace("  const visibleTags = node.tags.slice(0, 2);\n", "")
c = c.replace("  const hiddenTagCount = node.tags.length - visibleTags.length;\n", "")

# Replace nodeTitle with tags version with simple version
old = '  const nodeTitle = node.tags.length > 0\n    ? `' + '${node.label || \x27未命名\x27}\\n${node.tags.map((tag) => `#${tag}`).join(\x27 \x27)}`' + '\n    : node.label || \x27未命名\x27;'
new = "  const nodeTitle = node.label || '未命名';"
c = c.replace(old, new)

# Remove has-tags class
c = c.replace(
    "className={`${hasChildren ? 'explanation-index-parent-title' : 'explanation-index-leaf'}${node.tags.length > 0 ? ' has-tags' : ''}`}",
    "className={`${hasChildren ? 'explanation-index-parent-title' : 'explanation-index-leaf}`}"
)

# Remove tag count badge and cell-tags blocks using regex
c = re.sub(
    r'        \{hasChildren && node\.tags\.length > 0 && \(\n.*?\n\)\}\n',
    '',
    c,
    flags=re.DOTALL,
)

c = re.sub(
    r'        \{!hasChildren && node\.tags\.length > 0 && \(\n.*?\n\)\}\n',
    '',
    c,
    flags=re.DOTALL,
)

with open("src/core/ExplanationIndexView.tsx", "w", encoding="utf-8") as f:
    f.write(c)

print("ok")
