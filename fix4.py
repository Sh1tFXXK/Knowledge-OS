with open("src/core/ExplanationIndexView.tsx","r",encoding="utf-8") as f:
    c = f.read()

# Fix 1: buildExplanationIndex call
c = c.replace(
    "() => (node ? buildExplanationIndex(node.card, node.tags ?? []) : null),",
    "() => (node ? buildExplanationIndex(node.card) : null),"
)

# Fix 2: Replace selectedIndexNode.tags with node?.tags ?? []
c = c.replace(
    "{selectedIndexNode.tags.length > 0 && (",
    "{(node?.tags ?? []).length > 0 && ("
)
c = c.replace(
    "{selectedIndexNode.tags.map((tag) => (",
    "{(node?.tags ?? []).map((tag) => ("
)
c = c.replace(
    "setIndexTags(currentSelection, [...selectedIndexNode.tags, tag]);",
    "setIndexTags(currentSelection, [...(node?.tags ?? []), tag]);"
)
c = c.replace(
    "selectedIndexNode.tags.filter((item) => item !== tag)",
    "(node?.tags ?? []).filter((item) => item !== tag)"
)

with open("src/core/ExplanationIndexView.tsx","w",encoding="utf-8") as f:
    f.write(c)

print("ok")
