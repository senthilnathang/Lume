#!/usr/bin/env python3
"""Find literal frontend API calls without a matching Nest controller declaration.

This is a review inventory, not runtime certification: computed URLs, DTOs,
controller registration, authorization, and response shapes need separate checks.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUOTED = re.compile(r"['\"]([^'\"]*)['\"]")


def normalize(path):
    path = re.sub(r'^/api(?:/v2)?(?=/|$)', '', path)
    return '/' + path.strip('/')


routes = []
for file in (ROOT / 'backend/lume-nestjs/src').rglob('*controller.ts'):
    source = file.read_text()
    controller = re.search(r'@Controller\(([^)]*)\)', source)
    if not controller:
        continue
    prefixes = QUOTED.findall(controller[1]) or ['']
    for method, args in re.findall(r'@(Get|Post|Put|Patch|Delete)\(([^)]*)\)', source):
        for suffix in QUOTED.findall(args) or ['']:
            for prefix in prefixes:
                path = normalize(prefix + '/' + suffix)
                pattern = '^' + re.sub(r':[\w]+', '[^/]+', path) + '$'
                routes.append((method.upper(), re.compile(pattern)))

calls = []
sources = [ROOT / 'apps/web-lume/src', ROOT / 'packages/@lume/module-ui/src/modules']
call_pattern = re.compile(r'\b(get|post|put|patch|del|apiFetch)\s*(?:<[^;\n]*?>)?\s*\(\s*([\'"`])(/.*?)\2', re.S)
for directory in sources:
    for file in sorted(directory.rglob('*')):
        if file.suffix not in ('.ts', '.js', '.vue') or ('packages/@lume/module-ui/src/modules' in str(file) and '/static/' not in str(file)):
            continue
        if '__tests__' in file.parts:
            continue
        source = file.read_text()
        # Preserve newlines for review links while excluding documentation examples.
        source = re.sub(r'/\*.*?\*/', lambda match: ''.join('\n' if char == '\n' else ' ' for char in match[0]), source, flags=re.S)
        source = re.sub(r'(?m)^[\t ]*//[^\n]*', '', source)
        for match in call_pattern.finditer(source):
            verb, _, path = match.groups()
            if '\n' in path:
                continue
            path = normalize(re.sub(r'\$\{[^}]+\}', '_parameter_', path).split('?')[0])
            method = 'DELETE' if verb == 'del' else verb.upper()
            if verb == 'apiFetch':
                method = 'UNKNOWN'  # Request options may supply a non-GET method.
            matched = any((method == 'UNKNOWN' or method == declared) and regex.fullmatch(path)
                          for declared, regex in routes)
            if not matched:
                calls.append({'file': str(file.relative_to(ROOT)),
                              'line': source.count('\n', 0, match.start()) + 1,
                              'method': method, 'path': path})

result = {'scope': 'Literal calls in admin and shared static views; declarations only, not runtime or payload validation',
          'controller_route_variants': len(routes), 'unmatched_calls': calls}
target = ROOT / 'docs/frontend-contract-audit.json'
target.write_text(json.dumps(result, indent=2) + '\n')
print(f'{len(calls)} calls need review; inventory: {target.relative_to(ROOT)}')
