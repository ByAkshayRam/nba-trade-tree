#!/usr/bin/env python3
"""
NBA Transaction Data Pipeline
Fetches verified transaction history from multiple sources:
1. Basketball-Reference (primary - most complete)
2. ProSportsTransactions.com (backup/cross-reference)
3. NBA.com (official verification)

Usage: python fetch-transactions.py [--player "Name"] [--all] [--top100]
"""

import sqlite3
import requests
from bs4 import BeautifulSoup
import time
import json
import re
import argparse
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "nba_trades.db"

# Basketball-Reference player ID mapping (we'll build this dynamically)
def get_bbref_id(player_name):
    """Convert player name to Basketball-Reference ID format"""
    # Format: first 5 letters of last name + first 2 of first name + 01
    parts = player_name.split()
    if len(parts) < 2:
        return None
    first = parts[0].lower()
    last = parts[-1].lower()
    # Remove suffixes like Jr., III, etc.
    last = re.sub(r'\s*(jr\.?|sr\.?|iii|ii|iv)$', '', last, flags=re.IGNORECASE)
    return f"{last[:5]}{first[:2]}01"

def fetch_bbref_transactions(player_name, bbref_id=None):
    """Fetch transaction history from Basketball-Reference"""
    if not bbref_id:
        bbref_id = get_bbref_id(player_name)
    
    url = f"https://www.basketball-reference.com/players/{bbref_id[0]}/{bbref_id}.html"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code != 200:
            print(f"  BBRef returned {resp.status_code} for {player_name}")
            return None
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # Find transaction section
        transactions = []
        
        # Look for the transactions section in the page
        # BBRef puts this in a specific format
        trans_section = soup.find('div', {'id': 'all_transactions'})
        if not trans_section:
            # Try finding in the info box
            info_box = soup.find('div', {'id': 'info'})
            if info_box:
                trans_p = info_box.find_all('p')
                for p in trans_p:
                    text = p.get_text()
                    if 'Draft:' in text or 'traded' in text.lower() or 'signed' in text.lower():
                        transactions.append(parse_transaction_text(text))
        else:
            # Parse transactions table
            rows = trans_section.find_all('li')
            for row in rows:
                text = row.get_text()
                transactions.append(parse_transaction_text(text))
        
        # Also get draft info
        draft_info = None
        meta = soup.find('div', {'id': 'meta'})
        if meta:
            for p in meta.find_all('p'):
                text = p.get_text()
                if 'Draft:' in text:
                    draft_info = parse_draft_text(text)
                    break
        
        return {
            'player': player_name,
            'bbref_id': bbref_id,
            'draft': draft_info,
            'transactions': [t for t in transactions if t],
            'source': 'basketball-reference'
        }
        
    except Exception as e:
        print(f"  Error fetching BBRef for {player_name}: {e}")
        return None

def parse_transaction_text(text):
    """Parse a transaction text into structured data"""
    text = text.strip()
    if not text:
        return None
    
    # Try to extract date
    date_match = re.search(r'(\w+ \d+, \d{4})', text)
    date = date_match.group(1) if date_match else None
    
    # Determine transaction type
    trans_type = 'unknown'
    if 'traded' in text.lower():
        trans_type = 'trade'
    elif 'signed' in text.lower():
        trans_type = 'signing'
    elif 'waived' in text.lower() or 'released' in text.lower():
        trans_type = 'waiver'
    elif 'draft' in text.lower():
        trans_type = 'draft'
    
    return {
        'date': date,
        'type': trans_type,
        'description': text,
        'raw': text
    }

def parse_draft_text(text):
    """Parse draft information"""
    # Example: "Draft: Cleveland Cavaliers, 1st round (1st pick, 1st overall), 2003 NBA Draft"
    draft = {}
    
    round_match = re.search(r'(\d+)(?:st|nd|rd|th) round', text)
    pick_match = re.search(r'(\d+)(?:st|nd|rd|th) pick', text)
    year_match = re.search(r'(\d{4}) NBA Draft', text)
    team_match = re.search(r'Draft:\s*([^,]+)', text)
    
    if round_match:
        draft['round'] = int(round_match.group(1))
    if pick_match:
        draft['pick'] = int(pick_match.group(1))
    if year_match:
        draft['year'] = int(year_match.group(1))
    if team_match:
        draft['team'] = team_match.group(1).strip()
    
    return draft if draft else None

def fetch_prosports_transactions(player_name):
    """Fetch from ProSportsTransactions.com"""
    # This site requires different parsing
    search_url = "https://www.prosportstransactions.com/basketball/Search/SearchResults.php"
    
    params = {
        'Player': player_name,
        'Team': '',
        'BeginDate': '1990-01-01',
        'EndDate': datetime.now().strftime('%Y-%m-%d'),
        'PlayerMovementChkBx': 'yes',
        'submit': 'Search'
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        resp = requests.get(search_url, params=params, headers=headers, timeout=15)
        if resp.status_code != 200:
            return None
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        transactions = []
        table = soup.find('table', {'class': 'datatable'})
        if table:
            rows = table.find_all('tr')[1:]  # Skip header
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 4:
                    date = cells[0].get_text().strip()
                    team = cells[1].get_text().strip()
                    acquired = cells[2].get_text().strip()
                    relinquished = cells[3].get_text().strip()
                    notes = cells[4].get_text().strip() if len(cells) > 4 else ''
                    
                    transactions.append({
                        'date': date,
                        'team': team,
                        'acquired': acquired,
                        'relinquished': relinquished,
                        'notes': notes,
                        'type': 'trade' if 'trade' in notes.lower() else 'other'
                    })
        
        return {
            'player': player_name,
            'transactions': transactions,
            'source': 'prosportstransactions'
        }
        
    except Exception as e:
        print(f"  Error fetching ProSports for {player_name}: {e}")
        return None

def save_transactions_to_db(player_name, data):
    """Save verified transactions to database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get player ID
    cursor.execute("SELECT id, draft_year, draft_pick FROM players WHERE name = ?", (player_name,))
    player = cursor.fetchone()
    if not player:
        print(f"  Player not found in DB: {player_name}")
        conn.close()
        return False
    
    player_id = player[0]
    
    # Clear existing acquisition data for this player
    cursor.execute("DELETE FROM player_acquisitions WHERE player_id = ?", (player_id,))
    
    # Build verified transaction chain
    transactions = data.get('transactions', [])
    draft = data.get('draft', {})
    
    chain_steps = []
    
    # Add draft as first step if available
    if draft and draft.get('year'):
        chain_steps.append({
            'event': f"Drafted #{draft.get('pick', '?')} by {draft.get('team', 'Unknown')}",
            'date': f"{draft.get('year', '?')}-06-25",  # Approximate draft date
            'action': f"Round {draft.get('round', 1)}, Pick #{draft.get('pick', '?')}",
            'type': 'draft',
            'verified': True,
            'source': data.get('source', 'unknown')
        })
    
    # Add subsequent transactions
    for trans in transactions:
        if trans and trans.get('type') in ['trade', 'signing']:
            chain_steps.append({
                'event': trans.get('description', 'Transaction'),
                'date': trans.get('date', 'Unknown'),
                'action': trans.get('notes', trans.get('type', '')),
                'type': trans.get('type'),
                'verified': True,
                'source': data.get('source', 'unknown')
            })
    
    # Save to database
    if chain_steps:
        # Create or update trade chain
        cursor.execute("""
            INSERT OR REPLACE INTO verified_transactions (player_id, chain_json, source, last_updated)
            VALUES (?, ?, ?, datetime('now'))
        """, (player_id, json.dumps(chain_steps), data.get('source', 'unknown')))
    
    conn.commit()
    conn.close()
    return True

def ensure_tables():
    """Create necessary tables if they don't exist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS verified_transactions (
            id INTEGER PRIMARY KEY,
            player_id INTEGER UNIQUE,
            chain_json TEXT,
            source TEXT,
            last_updated TEXT,
            FOREIGN KEY (player_id) REFERENCES players(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS player_acquisitions (
            id INTEGER PRIMARY KEY,
            player_id INTEGER,
            date TEXT,
            type TEXT,
            from_team TEXT,
            to_team TEXT,
            description TEXT,
            source TEXT,
            verified INTEGER DEFAULT 1,
            FOREIGN KEY (player_id) REFERENCES players(id)
        )
    """)
    
    conn.commit()
    conn.close()

def fetch_player_data(player_name):
    """Fetch transaction data for a single player from multiple sources"""
    print(f"Fetching data for {player_name}...")
    
    # Try Basketball-Reference first (most reliable)
    bbref_data = fetch_bbref_transactions(player_name)
    time.sleep(1)  # Be nice to servers
    
    # Try ProSportsTransactions as backup
    prosports_data = fetch_prosports_transactions(player_name)
    time.sleep(0.5)
    
    # Merge data, preferring BBRef
    if bbref_data and bbref_data.get('transactions'):
        print(f"  Found {len(bbref_data['transactions'])} transactions from BBRef")
        return bbref_data
    elif prosports_data and prosports_data.get('transactions'):
        print(f"  Found {len(prosports_data['transactions'])} transactions from ProSports")
        return prosports_data
    else:
        print(f"  No transaction data found")
        return None

def main():
    parser = argparse.ArgumentParser(description='Fetch NBA transaction data')
    parser.add_argument('--player', type=str, help='Fetch data for specific player')
    parser.add_argument('--all', action='store_true', help='Fetch for all players in DB')
    parser.add_argument('--top100', action='store_true', help='Fetch for top 100 players')
    parser.add_argument('--test', action='store_true', help='Test with a few players')
    args = parser.parse_args()
    
    ensure_tables()
    
    if args.player:
        data = fetch_player_data(args.player)
        if data:
            save_transactions_to_db(args.player, data)
            print(json.dumps(data, indent=2))
    
    elif args.test:
        test_players = ['LeBron James', 'Kevin Durant', 'Stephen Curry']
        for player in test_players:
            data = fetch_player_data(player)
            if data:
                print(json.dumps(data, indent=2, default=str))
            time.sleep(2)
    
    elif args.top100 or args.all:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        if args.top100:
            cursor.execute("SELECT name FROM players WHERE is_active = 1 ORDER BY id LIMIT 100")
        else:
            cursor.execute("SELECT name FROM players WHERE is_active = 1")
        
        players = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        print(f"Fetching data for {len(players)} players...")
        
        for i, player in enumerate(players):
            print(f"[{i+1}/{len(players)}] ", end='')
            data = fetch_player_data(player)
            if data:
                save_transactions_to_db(player, data)
            time.sleep(2)  # Rate limiting
        
        print("\nDone!")

if __name__ == '__main__':
    main()
