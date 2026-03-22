#!/usr/bin/env python3
"""
RosterDNA Acquisition Tree Validator — Hard Gate Script

Pre-commit quality gate. Returns exit code 0 = pass, 1 = fail.
Run on specific files or entire directory.

Usage:
  python3 validate-trees.py                          # validate all
  python3 validate-trees.py okc-shai-*.json          # specific files
  python3 validate-trees.py --team OKC               # one team
  python3 validate-trees.py --strict                 # warnings also fail
  python3 validate-trees.py --fix                    # auto-fix what's fixable
  python3 validate-trees.py --json                   # machine-readable output

Exit codes: 0 = clean, 1 = critical errors found, 2 = warnings (strict mode)
"""

import json
import glob
import sys
import os
import re
import argparse
from collections import defaultdict
from typing import Any

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "data", "acquisition-trees")

VALID_TEAMS = {
    'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
    'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
    'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS',
    # Historical
    'NJN', 'NOH', 'NOK', 'SEA', 'VAN', 'CHH'
}

VALID_TYPES = {'player', 'pick', 'other'}
VALID_ACQ_TYPES = {
    'player': {'draft', 'trade', 'free-agent', 'draft-night-trade', 'sign-and-trade', 'undrafted', 'two-way', 'waivers'},
    'pick': {'own', 'trade'},
    'other': {'other'},
}
DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
PICK_NAME_RE = re.compile(r'^\d{4}\s+(1st|2nd)\s+Round\s+Pick')


class ValidationResult:
    def __init__(self):
        self.errors = []    # Critical — must fix
        self.warnings = []  # Should fix
        self.info = []      # FYI
        self.fixes = []     # Auto-fixed items
        self.files_checked = 0
        self.nodes_checked = 0

    @property
    def passed(self):
        return len(self.errors) == 0

    def error(self, file, path, code, msg):
        self.errors.append({"file": file, "path": path, "code": code, "msg": msg})

    def warn(self, file, path, code, msg):
        self.warnings.append({"file": file, "path": path, "code": code, "msg": msg})

    def fixed(self, file, path, code, msg):
        self.fixes.append({"file": file, "path": path, "code": code, "msg": msg})


def validate_node(node: dict, file: str, path: str, result: ValidationResult,
                  seen_keys: set, depth: int = 0, auto_fix: bool = False) -> dict:
    """Validate a single node recursively. Returns the (possibly fixed) node."""
    result.nodes_checked += 1
    name = node.get("name", "")
    ntype = node.get("type", "")
    acq = node.get("acquisitionType", "")
    date = node.get("date", "")
    node_path = f"{path}/{name}" if path else name

    # ── Auto-fixable acquisitionType aliases ──
    ACQ_ALIASES = {
        'freeAgent': 'free-agent', 'free_agent': 'free-agent', 'fa': 'free-agent',
        'signAndTrade': 'sign-and-trade', 'sign_and_trade': 'sign-and-trade',
        'draftNightTrade': 'draft-night-trade', 'draft_night_trade': 'draft-night-trade',
        'original': 'own',
    }
    # Context-aware fixes: pick nodes with "draft" → "own", other nodes with "trade"/"free-agent" → "other"
    if ntype == 'pick' and acq == 'draft':
        ACQ_ALIASES['draft'] = 'own'
    if ntype == 'other' and acq in ('trade', 'free-agent'):
        ACQ_ALIASES[acq] = 'other'
    if acq in ACQ_ALIASES:
        if auto_fix:
            old_acq = acq
            acq = ACQ_ALIASES[acq]
            node["acquisitionType"] = acq
            result.fixed(file, node_path, "ACQ_TYPE_ALIAS", f"'{old_acq}' → '{acq}'")
        else:
            result.error(file, node_path, "INVALID_ACQ_TYPE",
                         f"acquisitionType='{acq}' — did you mean '{ACQ_ALIASES[acq]}'?")

    # ── Required fields ──
    if not name:
        result.error(file, node_path, "MISSING_NAME", "Node has no name")
    if not ntype:
        result.error(file, node_path, "MISSING_TYPE", "Node has no type")
    elif ntype not in VALID_TYPES:
        result.error(file, node_path, "INVALID_TYPE", f"type='{ntype}' not in {VALID_TYPES}")
    if not acq:
        result.error(file, node_path, "MISSING_ACQ_TYPE", "Node has no acquisitionType")
    elif ntype in VALID_ACQ_TYPES and acq not in VALID_ACQ_TYPES.get(ntype, set()):
        result.error(file, node_path, "INVALID_ACQ_TYPE",
                     f"acquisitionType='{acq}' invalid for type='{ntype}'. "
                     f"Expected one of {VALID_ACQ_TYPES.get(ntype, set())}")
    if not date:
        result.error(file, node_path, "MISSING_DATE", "Node has no date")
    elif not DATE_RE.match(date):
        result.error(file, node_path, "INVALID_DATE", f"date='{date}' doesn't match YYYY-MM-DD")

    # ── Trade nodes must have tradePartner ──
    if acq in ('trade', 'draft-night-trade', 'sign-and-trade'):
        if not node.get("tradePartner"):
            result.error(file, node_path, "MISSING_TRADE_PARTNER",
                         f"acquisitionType='{acq}' but no tradePartner")
        elif node.get("tradePartner") not in VALID_TEAMS:
            result.warn(file, node_path, "UNKNOWN_TRADE_PARTNER",
                        f"tradePartner='{node.get('tradePartner')}' not a known team")

    # ── isOrigin consistency ──
    has_children = bool(node.get("assetsGivenUp"))
    is_origin = node.get("isOrigin", False)

    if is_origin and has_children:
        if auto_fix:
            del node["isOrigin"]
            result.fixed(file, node_path, "ORIGIN_WITH_CHILDREN", "Removed isOrigin from non-leaf node")
        else:
            result.error(file, node_path, "ORIGIN_WITH_CHILDREN",
                         "isOrigin=true but node has assetsGivenUp children")

    if not has_children and not is_origin:
        # Leaf nodes should be origins (FA, own draft, etc.)
        if acq in ('free-agent', 'undrafted', 'two-way', 'waivers'):
            if auto_fix:
                node["isOrigin"] = True
                result.fixed(file, node_path, "LEAF_MISSING_ORIGIN",
                             f"Added isOrigin=true to leaf {acq} node")
            else:
                result.warn(file, node_path, "LEAF_MISSING_ORIGIN",
                            f"Leaf node with acquisitionType='{acq}' should have isOrigin=true")
        elif ntype == 'other':
            if auto_fix:
                node["isOrigin"] = True
                result.fixed(file, node_path, "LEAF_MISSING_ORIGIN",
                             "Added isOrigin=true to leaf 'other' node")
            else:
                result.warn(file, node_path, "LEAF_MISSING_ORIGIN",
                            "Leaf 'other' node should have isOrigin=true")

    # ── Pick node naming ──
    if ntype == 'pick':
        if not PICK_NAME_RE.match(name):
            result.warn(file, node_path, "PICK_NAME_FORMAT",
                        f"Pick name '{name}' doesn't match 'YYYY Xst/2nd Round Pick' format")
        # Player names shouldn't be in pick node names
        if node.get("becamePlayer") and node["becamePlayer"] in name:
            result.warn(file, node_path, "PLAYER_IN_PICK_NAME",
                        f"Pick name contains player name '{node['becamePlayer']}' — use becamePlayer field only")

    # ── Duplicate detection (name::date) ──
    if name and date:
        dedup_key = f"{name}::{date}"
        if dedup_key in seen_keys:
            result.error(file, node_path, "DUPLICATE_NODE",
                         f"Duplicate name::date key '{dedup_key}'")
        seen_keys.add(dedup_key)

    # ── Trade nodes need tradeDescription ──
    if acq in ('trade', 'draft-night-trade', 'sign-and-trade') and not node.get("tradeDescription"):
        result.warn(file, node_path, "MISSING_TRADE_DESC",
                    "Trade node has no tradeDescription")

    # ── FA node should NOT have assetsGivenUp ──
    if acq == 'free-agent' and has_children:
        result.error(file, node_path, "FA_WITH_ASSETS",
                     "Free agent node has assetsGivenUp — FAs don't cost assets")

    # ── Depth sanity ──
    if depth > 15:
        result.warn(file, node_path, "DEEP_TREE", f"Node at depth {depth} — unusually deep chain")

    # ── Recurse into children ──
    for i, child in enumerate(node.get("assetsGivenUp", [])):
        validate_node(child, file, f"{node_path}[{i}]", result, seen_keys, depth + 1, auto_fix)

    return node


def validate_file(filepath: str, result: ValidationResult, auto_fix: bool = False) -> dict | None:
    """Validate a single JSON file. Returns data if auto_fix for writeback."""
    filename = os.path.basename(filepath)
    result.files_checked += 1

    # ── Parse JSON ──
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        result.error(filename, "/", "INVALID_JSON", f"JSON parse error: {e}")
        return None

    # ── Top-level structure ──
    if "tree" not in data:
        result.error(filename, "/", "MISSING_TREE", "No 'tree' key in file")
        return None

    tree = data["tree"]

    # ── Filename consistency ──
    parts = filename.replace('.json', '').split('-', 1)
    if len(parts) == 2:
        file_team = parts[0].upper()
        if tree.get("currentTeam") and tree["currentTeam"] != file_team:
            result.warn(filename, tree.get("name", "root"), "TEAM_MISMATCH",
                        f"Filename team '{file_team}' != currentTeam '{tree.get('currentTeam')}'")

    # ── _meta validation ──
    meta = data.get("_meta", {})
    if not meta.get("lastUpdated"):
        result.warn(filename, "_meta", "NO_LAST_UPDATED", "Missing _meta.lastUpdated")

    # ── Validate all nodes ──
    seen_keys = set()
    data["tree"] = validate_node(tree, filename, "", result, seen_keys, auto_fix=auto_fix)

    return data if auto_fix else None


def print_report(result: ValidationResult, as_json: bool = False):
    """Print human or machine-readable report."""
    if as_json:
        print(json.dumps({
            "passed": result.passed,
            "files": result.files_checked,
            "nodes": result.nodes_checked,
            "errors": len(result.errors),
            "warnings": len(result.warnings),
            "fixes": len(result.fixes),
            "details": {
                "errors": result.errors,
                "warnings": result.warnings,
                "fixes": result.fixes,
            }
        }, indent=2))
        return

    print(f"\n{'='*60}")
    print(f"RosterDNA Tree Validation Report")
    print(f"{'='*60}")
    print(f"Files checked:  {result.files_checked}")
    print(f"Nodes checked:  {result.nodes_checked}")
    print()

    if result.fixes:
        print(f"🔧 AUTO-FIXED ({len(result.fixes)}):")
        for f in result.fixes:
            print(f"  ✓ {f['file']} → {f['path']}: [{f['code']}] {f['msg']}")
        print()

    if result.errors:
        print(f"❌ ERRORS ({len(result.errors)}):")
        for e in result.errors:
            print(f"  {e['file']} → {e['path']}: [{e['code']}] {e['msg']}")
        print()

    if result.warnings:
        print(f"⚠️  WARNINGS ({len(result.warnings)}):")
        for w in result.warnings[:50]:  # cap output
            print(f"  {w['file']} → {w['path']}: [{w['code']}] {w['msg']}")
        if len(result.warnings) > 50:
            print(f"  ... and {len(result.warnings) - 50} more")
        print()

    # Summary by error code
    if result.errors or result.warnings:
        codes = defaultdict(int)
        for e in result.errors:
            codes[f"ERR:{e['code']}"] += 1
        for w in result.warnings:
            codes[f"WARN:{w['code']}"] += 1
        print("Summary by code:")
        for code, count in sorted(codes.items(), key=lambda x: -x[1]):
            print(f"  {code}: {count}")
        print()

    if result.passed:
        print("✅ PASSED — no critical errors")
    else:
        print(f"❌ FAILED — {len(result.errors)} critical error(s)")


def main():
    parser = argparse.ArgumentParser(description="RosterDNA tree validation gate")
    parser.add_argument("files", nargs="*", help="Specific JSON files to validate")
    parser.add_argument("--team", help="Validate all files for a team (e.g., OKC)")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures")
    parser.add_argument("--fix", action="store_true", help="Auto-fix what's fixable")
    parser.add_argument("--json", action="store_true", help="JSON output")
    parser.add_argument("--data-dir", default=DATA_DIR, help="Override data directory")
    args = parser.parse_args()

    result = ValidationResult()

    # Determine files to check
    if args.files:
        files = []
        for f in args.files:
            if os.path.isabs(f):
                files.append(f)
            else:
                candidate = os.path.join(args.data_dir, f)
                files.append(candidate if os.path.exists(candidate) else f)
    elif args.team:
        pattern = os.path.join(args.data_dir, f"{args.team.lower()}-*.json")
        files = sorted(glob.glob(pattern))
        if not files:
            print(f"No files found for team {args.team}")
            sys.exit(1)
    else:
        files = sorted(glob.glob(os.path.join(args.data_dir, "*.json")))

    # Validate
    for filepath in files:
        data = validate_file(filepath, result, auto_fix=args.fix)
        if args.fix and data:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write('\n')

    # Report
    print_report(result, as_json=args.json)

    # Exit code
    if result.errors:
        sys.exit(1)
    elif args.strict and result.warnings:
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
