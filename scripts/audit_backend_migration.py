#!/usr/bin/env python3
"""Inventory legacy route declarations and unfinished Nest implementation markers.

Source evidence only: mounts, computed routes and reachability need manual review.
Neither an empty array nor a TODO by itself proves a missing implementation.
"""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
legacy = ROOT / 'backend/src'
nest = ROOT / 'backend/lume-nestjs/src'
routes = []
markers = []
route_pattern = re.compile(r'\b(?:router|app)\.(get|post|put|patch|delete|use)\s*\(\s*([\'"`])([^\n]*?)\2')
marker_pattern = re.compile(r'TODO|not implemented|placeholder|\bsimulat\w*\b', re.I)

for file in sorted(legacy.rglob('*')):
    if file.suffix not in ('.js', '.ts') or 'static' in file.parts:
        continue
    for number, line in enumerate(file.read_text().splitlines(), 1):
        match = route_pattern.search(line)
        if match and not line.lstrip().startswith('//'):
            routes.append({'file': str(file.relative_to(ROOT)), 'line': number,
                           'method': match[1].upper(), 'localPath': match[3], 'status': 'needs_review'})

for file in sorted(nest.rglob('*.ts')):
    for number, line in enumerate(file.read_text().splitlines(), 1):
        if marker_pattern.search(line):
            markers.append({'file': str(file.relative_to(ROOT)), 'line': number,
                            'evidence': line.strip(), 'status': 'needs_review'})

def feature(path):
    parts = Path(path).parts
    if 'modules' in parts:
        return parts[parts.index('modules') + 1]
    if 'grids' in parts:
        return 'graphql/' + parts[parts.index('grids') + 1]
    return 'core'

output = {
    'scope': 'Static inventory, not proof of runtime reachability or endpoint equivalence',
    'legacyRouteDeclarations': routes,
    'nestImplementationMarkers': markers,
    'legacyRoutesByFeature': dict(sorted(Counter(feature(row['file']) for row in routes).items())),
    'nestMarkersByFeature': dict(sorted(Counter(feature(row['file']) for row in markers).items())),
}
destination = ROOT / 'docs/backend-migration-inventory.json'
destination.write_text(json.dumps(output, indent=2) + '\n')
print(f'{len(routes)} legacy route/mount declarations; {len(markers)} Nest implementation markers need review')
