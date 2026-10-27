#!/usr/bin/env python3
"""Compare core Prisma mappings without opening a database or reading row values.

This is source reconciliation evidence, not certification of a deployed schema.
Module-specific models remain in their separate migration queue.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORE = json.loads((ROOT / "apps/api/scripts/framework-models.json").read_text())


def models(path):
    source = path.read_text()
    result = {}
    for match in re.finditer(r"^model (\w+)\s*\{(.*?)^\}", source, re.M | re.S):
        body = match[2]
        table = re.search(r'@@map\("([^\"]+)"\)', body)
        # Keep relation/index metadata too: changes require review even without a
        # physical column rename. Ignore comments and whitespace-only differences.
        lines = [" ".join(line.split("//", 1)[0].split()) for line in body.splitlines()]
        result[match[1]] = {"table": table[1] if table else match[1],
                            "declarations": sorted(line for line in lines if line)}
    return result


def compare(legacy, current):
    rows = []
    for name in CORE:
        before, after = legacy.get(name), current.get(name)
        status = "unchanged" if before == after and before else "review-required"
        rows.append({"model": name, "status": status,
                     "legacyTable": before and before["table"],
                     "currentTable": after and after["table"],
                     "removedDeclarations": sorted(set((before or {}).get("declarations", [])) - set((after or {}).get("declarations", []))),
                     "addedDeclarations": sorted(set((after or {}).get("declarations", [])) - set((before or {}).get("declarations", [])))})
    return rows


if __name__ == "__main__":
    legacy_path = ROOT / "legacy/express/prisma/schema.prisma"
    current_path = ROOT / "apps/api/prisma/schema.prisma"
    rows = compare(models(legacy_path), models(current_path))
    report = {"scope": "Core source-schema mapping comparison only; no live data or database inspected",
              "legacy": str(legacy_path.relative_to(ROOT)), "current": str(current_path.relative_to(ROOT)),
              "models": rows}
    (ROOT / "docs/framework-schema-reconciliation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(f"Core models: {len(rows)}; unchanged: {sum(row['status'] == 'unchanged' for row in rows)}; review required: {sum(row['status'] != 'unchanged' for row in rows)}")
