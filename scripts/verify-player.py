#!/usr/bin/env python3
"""
NBA Trade Tree - Player Transaction Verification Pipeline

This script:
1. Web searches for a player's transaction history
2. Parses and extracts verified trade details
3. Stores to our aggregate database
4. Generates test cases for validation

Usage:
    python verify-player.py "Player Name"
    python verify-player.py --batch players.txt
    python verify-player.py --validate "Player Name"
"""

import argparse
import json
import sqlite3
import subprocess
import re
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "data" / "nba_trades.db"
VERIFIED_JSON = Path(__file__).parent.parent / "data" / "verified-transactions.json"

def web_search(query: str) -> dict:
    """Execute web search via OpenClaw CLI"""
    # Use curl to hit a search API or use the openclaw tool
    # For now, we'll output what needs to be searched
    print(f"🔍 Searching: {query}")
    return {"query": query, "results": []}

def load_verified_db() -> dict:
    """Load existing verified transactions"""
    if VERIFIED_JSON.exists():
        with open(VERIFIED_JSON) as f:
            return json.load(f)
    return {"_meta": {"last_updated": None}, "players": {}}

def save_verified_db(data: dict):
    """Save verified transactions"""
    data["_meta"]["last_updated"] = datetime.now().isoformat()
    with open(VERIFIED_JSON, "w") as f:
        json.dump(data, f, indent=2)

def get_player_from_db(name: str) -> dict:
    """Get player info from SQLite"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT p.id, p.name, p.draft_year, p.draft_round, p.draft_pick, 
               t.abbreviation, t.name as team_name
        FROM players p
        LEFT JOIN teams t ON p.current_team_id = t.id
        WHERE p.name = ?
    """, (name,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "id": row[0],
            "name": row[1],
            "draft_year": row[2],
            "draft_round": row[3],
            "draft_pick": row[4],
            "current_team": row[5],
            "current_team_name": row[6]
        }
    return None

def generate_search_queries(player_name: str) -> list:
    """Generate search queries for a player's transactions"""
    return [
        f"{player_name} NBA trade history transactions",
        f"{player_name} traded teams career",
        f"site:basketball-reference.com {player_name} transactions",
        f"site:espn.com {player_name} trade"
    ]

def parse_transaction_from_text(text: str) -> dict:
    """Parse transaction details from search result text"""
    transaction = {
        "date": None,
        "type": None,  # trade, signing, draft
        "from_team": None,
        "to_team": None,
        "details": None,
        "source": None
    }
    
    # Date patterns
    date_patterns = [
        r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}',
        r'\d{4}-\d{2}-\d{2}',
        r'\d{1,2}/\d{1,2}/\d{4}'
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            transaction["date"] = match.group()
            break
    
    # Trade indicators
    if "traded" in text.lower():
        transaction["type"] = "trade"
    elif "signed" in text.lower():
        transaction["type"] = "signing"
    elif "drafted" in text.lower():
        transaction["type"] = "draft"
    
    return transaction

def verify_player(player_name: str, auto_search: bool = False) -> dict:
    """
    Verify a player's transaction history.
    
    Returns a verification report with:
    - Current data in our DB
    - Suggested searches to run
    - Validation status
    """
    report = {
        "player": player_name,
        "timestamp": datetime.now().isoformat(),
        "db_record": None,
        "verified_record": None,
        "searches_needed": [],
        "status": "pending"
    }
    
    # Get current DB record
    db_player = get_player_from_db(player_name)
    report["db_record"] = db_player
    
    # Get verified record if exists
    verified_db = load_verified_db()
    if player_name in verified_db.get("players", {}):
        report["verified_record"] = verified_db["players"][player_name]
        report["status"] = "verified"
    else:
        report["status"] = "needs_verification"
        report["searches_needed"] = generate_search_queries(player_name)
    
    return report

def add_verified_transaction(player_name: str, transaction: dict):
    """Add a verified transaction to the database"""
    verified_db = load_verified_db()
    
    if player_name not in verified_db["players"]:
        verified_db["players"][player_name] = {
            "draft": None,
            "transactions": []
        }
    
    verified_db["players"][player_name]["transactions"].append(transaction)
    save_verified_db(verified_db)
    print(f"✓ Added transaction for {player_name}")

def generate_test_case(player_name: str) -> dict:
    """Generate a test case for a player's transactions"""
    verified_db = load_verified_db()
    player_data = verified_db.get("players", {}).get(player_name)
    
    if not player_data:
        return None
    
    test_case = {
        "player": player_name,
        "expected_transactions": len(player_data.get("transactions", [])) + 1,  # +1 for draft
        "expected_current_team": None,
        "key_trades": []
    }
    
    # Get current team from DB
    db_player = get_player_from_db(player_name)
    if db_player:
        test_case["expected_current_team"] = db_player["current_team"]
    
    # Add key trade validations
    for trans in player_data.get("transactions", []):
        test_case["key_trades"].append({
            "date": trans.get("date"),
            "to_team": trans.get("to"),
            "description_contains": trans.get("details", "")[:50]
        })
    
    return test_case

def list_unverified_players(limit: int = 20) -> list:
    """List players that need verification"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get players with current teams but no verified chain
    cursor.execute("""
        SELECT p.id, p.name, t.abbreviation
        FROM players p
        JOIN teams t ON p.current_team_id = t.id
        LEFT JOIN trade_chains tc ON p.id = tc.resulting_player_id
        WHERE tc.id IS NULL
        ORDER BY p.name
        LIMIT ?
    """, (limit,))
    
    players = [{"id": row[0], "name": row[1], "team": row[2]} for row in cursor.fetchall()]
    conn.close()
    
    return players

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify NBA player transactions")
    parser.add_argument("player", nargs="?", help="Player name to verify")
    parser.add_argument("--list-unverified", "-l", action="store_true", help="List unverified players")
    parser.add_argument("--generate-test", "-t", action="store_true", help="Generate test case")
    parser.add_argument("--batch", "-b", help="Batch file with player names")
    
    args = parser.parse_args()
    
    if args.list_unverified:
        players = list_unverified_players(30)
        print(f"\n📋 Unverified Players ({len(players)}):\n")
        for p in players:
            print(f"  {p['name']} ({p['team']})")
    
    elif args.player:
        report = verify_player(args.player)
        print(f"\n📊 Verification Report: {args.player}\n")
        print(f"Status: {report['status']}")
        
        if report['db_record']:
            print(f"Current Team: {report['db_record']['current_team']}")
            print(f"Draft: {report['db_record']['draft_year']} R{report['db_record']['draft_round']} P{report['db_record']['draft_pick']}")
        
        if report['verified_record']:
            trans_count = len(report['verified_record'].get('transactions', []))
            print(f"Verified Transactions: {trans_count}")
        
        if report['searches_needed']:
            print(f"\n🔍 Searches Needed:")
            for q in report['searches_needed']:
                print(f"  - {q}")
        
        if args.generate_test:
            test = generate_test_case(args.player)
            if test:
                print(f"\n🧪 Test Case:")
                print(json.dumps(test, indent=2))
    
    else:
        parser.print_help()
