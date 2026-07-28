with open("src/core/ExplanationIndexView.tsx", "r", encoding="utf-8") as f:
    c = f.read()

# Insert type="button" and title after the <button line
old = '<button\n        aria-current={isActive ? \x27page\x27 : undefined}\n        className={`${hasChildren ? \x27explanation-index-parent-title\x27 : \x27explanation-index-leaf\x27}`}\n        onClick={() => onSelect(node.selection)}'
new = '<button\n        type="button"\n        aria-current={isActive ? \x27page\x27 : undefined}\n        className={`${hasChildren ? \x27explanation-index-parent-title\x27 : \x27explanation-index-leaf\x27}`}\n        title={nodeTitle}\n        onClick={() => onSelect(node.selection)}'
c = c.replace(old, new)

with open("src/core/ExplanationIndexView.tsx", "w", encoding="utf-8") as f:
    f.write(c)

print("ok")
