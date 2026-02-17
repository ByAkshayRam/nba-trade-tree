#!/usr/bin/env bash
# validate-quality.sh — NBA Acquisition Tree quality checker
# Usage: bash scripts/validate-quality.sh [TEAM|all]

set -euo pipefail

DATA_DIR="$(dirname "$0")/../app/data/acquisition-trees"
TEAM="${1:-all}"
ISSUES=0

if [[ "$TEAM" == "all" ]]; then
  FILES=("$DATA_DIR"/*.json)
else
  TEAM_LOWER=$(echo "$TEAM" | tr '[:upper:]' '[:lower:]')
  FILES=("$DATA_DIR"/${TEAM_LOWER}-*.json)
fi

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No files found for team: $TEAM"
  exit 1
fi

report() {
  local file="$1" issue="$2"
  local base=$(basename "$file")
  echo "  $base: $issue"
  ISSUES=$((ISSUES + 1))
}

echo "=== NBA Acquisition Tree Quality Validation ==="
echo "Team: $TEAM | Files: ${#FILES[@]}"
echo ""

# 1. Bundled picks
echo "--- Check 1: Bundled picks ---"
for f in "${FILES[@]}"; do
  while IFS= read -r line; do
    report "$f" "Bundled pick: $line"
  done < <(grep -oP '"name"\s*:\s*"[^"]*"' "$f" | grep -iP '"\d+\s+(future\s+)?(first|second|1st|2nd).[Rr]ound\s+[Pp]icks"' || true)
done

# 2. Inline player names in pick nodes (parenthetical)
echo "--- Check 2: Inline player names in pick nodes ---"
for f in "${FILES[@]}"; do
  while IFS= read -r line; do
    report "$f" "Inline player in pick name: $line"
  done < <(python3 -c "
import json, sys
def check(node, path=''):
    if isinstance(node, dict):
        if node.get('type') == 'pick':
            import re
            name = node.get('name','')
            # Only flag if parens contain a person's name (capitalized words, not team abbrevs or terms like 'protected')
            m = re.search(r'\(([^)]+)\)', name)
            if m:
                inner = m.group(1)
                # Skip known non-player patterns
                skip = ['own','protected','favorable','lesser','swap','#','via']
                if not any(s in inner.lower() for s in skip):
                    print(name)
        for v in node.values():
            check(v, path)
    elif isinstance(node, list):
        for item in node:
            check(item, path)
with open('$f') as fh:
    check(json.load(fh))
" 2>/dev/null || true)
done

# 3. Missing becamePlayer on past picks
echo "--- Check 3: Missing becamePlayer on past draft picks ---"
for f in "${FILES[@]}"; do
  while IFS= read -r line; do
    report "$f" "Past pick missing becamePlayer: $line"
  done < <(python3 -c "
import json, re, sys
def check(node):
    if isinstance(node, dict):
        if node.get('type') == 'pick':
            name = node.get('name','')
            m = re.match(r'(\d{4})\s+', name)
            if m and int(m.group(1)) < 2026 and 'Overall Pick' in name and 'becamePlayer' not in node:
                print(name)
        for v in node.values():
            check(v)
    elif isinstance(node, list):
        for item in node:
            check(item)
with open('$f') as fh:
    check(json.load(fh))
" 2>/dev/null || true)
done

# 4. Editorial notes
echo "--- Check 4: Editorial language in notes ---"
EDITORIAL_WORDS="elite|versatile|solid|best|heist|blockbuster|champion|fan favorite|clutch|rebuild"
for f in "${FILES[@]}"; do
  while IFS= read -r line; do
    report "$f" "Editorial note: $line"
  done < <(grep -oiP "\"note\"\s*:\s*\"[^\"]*($EDITORIAL_WORDS)[^\"]*\"" "$f" || true)
done

# 5. Missing isOrigin on leaf nodes
echo "--- Check 5: Missing isOrigin on leaf nodes ---"
for f in "${FILES[@]}"; do
  while IFS= read -r line; do
    report "$f" "Leaf missing isOrigin: $line"
  done < <(python3 -c "
import json, sys
def check(node):
    if isinstance(node, dict):
        has_assets = bool(node.get('assetsGivenUp'))
        has_pick_origin = bool(node.get('pickOrigin'))
        is_leaf = not has_assets and not has_pick_origin
        if is_leaf and node.get('type') in ('player','pick') and not node.get('isOrigin'):
            # Skip if it's the root tree node (top-level player being acquired)
            print(node.get('name','unknown'))
        if has_assets:
            for a in node['assetsGivenUp']:
                check(a)
        if has_pick_origin:
            check(node['pickOrigin'])
    elif isinstance(node, list):
        for item in node:
            check(item)
# Only check within assetsGivenUp and pickOrigin, not the root player
with open('$f') as fh:
    data = json.load(fh)
    tree = data.get('tree', {})
    for a in tree.get('assetsGivenUp', []):
        check(a)
    if 'pickOrigin' in tree:
        check(tree['pickOrigin'])
" 2>/dev/null || true)
done

# 6. Cash/waivers nodes
echo "--- Check 6: Cash/waivers nodes ---"
for f in "${FILES[@]}"; do
  while IFS= read -r line; do
    report "$f" "Cash/waivers node found: $line"
  done < <(grep -oP '"type"\s*:\s*"(cash|waivers)"' "$f" || true)
done

# 7. Duplicate ESPN IDs within same team
echo "--- Check 7: Duplicate ESPN IDs ---"
if [[ "$TEAM" != "all" ]]; then
  TEAM_LOWER=$(echo "$TEAM" | tr '[:upper:]' '[:lower:]')
  dupes=$(grep -h '"espnId"' "$DATA_DIR"/${TEAM_LOWER}-*.json 2>/dev/null | sort | uniq -d || true)
  if [[ -n "$dupes" ]]; then
    report "team-$TEAM" "Duplicate ESPN IDs: $dupes"
  fi
else
  for prefix in $(ls "$DATA_DIR"/*.json | xargs -I{} basename {} | sed 's/-.*//' | sort -u); do
    dupes=$(grep -h '"espnId"' "$DATA_DIR"/${prefix}-*.json 2>/dev/null | sort | uniq -d || true)
    if [[ -n "$dupes" ]]; then
      report "team-$prefix" "Duplicate ESPN IDs: $dupes"
    fi
  done
fi

# 8. Duplicate player nodes in rendered tree (API dedup check)
echo "--- Check 8: Duplicate player nodes (API) ---"
if [[ "$TEAM" != "all" ]]; then
  TEAMS_TO_CHECK=("$TEAM")
else
  TEAMS_TO_CHECK=($(ls "$DATA_DIR"/*.json | xargs -I{} basename {} | sed 's/-.*//' | sort -u | tr '[:lower:]' '[:upper:]'))
fi
for t in "${TEAMS_TO_CHECK[@]}"; do
  t_upper=$(echo "$t" | tr '[:lower:]' '[:upper:]')
  dupes=$(curl -s "http://localhost:3456/api/acquisition-tree/${t_upper}/team" 2>/dev/null | \
    python3 -c "
import json,sys
try:
  d=json.load(sys.stdin)
  names={}
  for n in d.get('nodes',[]):
    label=n.get('data',{}).get('label','')
    ntype=n.get('data',{}).get('nodeType','')
    if ntype=='player' and label:
      names[label]=names.get(label,0)+1
  for name,count in names.items():
    if count>1:
      print(f'{name} appears {count}x')
except: pass
" 2>/dev/null || true)
  if [[ -n "$dupes" ]]; then
    report "team-${t_upper}" "Duplicate player nodes: $dupes"
  fi
done

echo ""
echo "=== Summary ==="
if [[ $ISSUES -eq 0 ]]; then
  echo "✅ No issues found!"
  exit 0
else
  echo "❌ $ISSUES issue(s) found"
  exit 1
fi
