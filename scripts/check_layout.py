#!/usr/bin/env python3
"""Enforce the active workspace boundary without inspecting private environment files."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors = []
expected = {"api": "@lume/api", "admin": "@lume/admin", "website": "@lume/website"}
for directory, name in expected.items():
    manifest = ROOT / "apps" / directory / "package.json"
    if not manifest.exists() or json.loads(manifest.read_text()).get("name") != name:
        errors.append(f"Missing canonical application {directory} ({name})")
for obsolete in ["backend", "frontend", "server", "nuxt.config.ts", "package-lock.json"]:
    if (ROOT / obsolete).exists():
        errors.append(f"Obsolete root application/tooling: {obsolete}")
for folder in [ROOT / "apps", ROOT / "packages"]:
    for path in folder.rglob("package-lock.json"):
        if not any(part in {"node_modules", ".nuxt", ".output", "dist"} for part in path.parts):
            errors.append(f"Multiple active lockfiles: {path.relative_to(ROOT)}")
for path in (ROOT / "apps/api/src").rglob("*.vue"):
    errors.append(f"Browser component inside API: {path.relative_to(ROOT)}")
for path in (ROOT / "legacy/express/src/modules").glob("*/static"):
    if path.is_symlink() and not path.exists():
        errors.append(f"Broken compatibility link: {path.relative_to(ROOT)}")
workspace = (ROOT / "pnpm-workspace.yaml").read_text()
if "legacy" in workspace or "backend" in workspace or "frontend" in workspace:
    errors.append("Legacy apps must be excluded from the active pnpm workspace")
if errors:
    raise SystemExit("\n".join(errors))
print("Workspace layout passed: apps/api, apps/admin, apps/website; shared packages; isolated legacy.")
