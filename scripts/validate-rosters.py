#!/usr/bin/env python3
"""
NBA Trade Tree - Roster Validation Script
Cross-references our data with NBA.com via nba_api

Data Sources:
1. nba_api (Python) - Official NBA.com endpoints (free, no key needed)
2. Basketball-Reference - Historical data 
3. NBA.com Trade Tracker - Manual check for recent trades

Usage:
  python3 validate-rosters.py [--fix]
"""

import json
import sqlite3
import sys
from datetime import datetime

try:
    from nba_api.stats.static import players, teams
    from nba_api.stats.endpoints import commonplayerinfo, commonteamroster
    NBA_API_AVAILABLE = True
except ImportError:
    NBA_API_AVAILABLE = False
    print("⚠ nba_api not installed. Run: pip install nba_api")

DB_PATH = '/home/ubuntu/clawd/projects/nba-trade-tree/data/nba_trades.db'

# Team abbreviation mapping (NBA API uses different codes sometimes)
TEAM_MAP = {
    'NOP': 'NOP', 'NOH': 'NOP', 'NO': 'NOP',
    'PHX': 'PHX', 'PHO': 'PHX',
    'SAS': 'SAS', 'SA': 'SAS',
    'GSW': 'GSW', 'GS': 'GSW',
    'NYK': 'NYK', 'NY': 'NYK',
    'OKC': 'OKC',
    'LAL': 'LAL',
    'LAC': 'LAC',
    'UTA': 'UTA', 'UTH': 'UTA',
    'WAS': 'WAS', 'WSH': 'WAS',
    'BKN': 'BKN', 'BRK': 'BKN', 'NJN': 'BKN',
}

def normalize_team(abbr):
    """Normalize team abbreviation"""
    return TEAM_MAP.get(abbr.upper(), abbr.upper()) if abbr else None

def get_our_players():
    """Get players from our database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.id, p.name, t.abbreviation as team
        FROM players p
        LEFT JOIN teams t ON p.current_team_id = t.id
        WHERE p.is_active = 1
    """)
    result = {row[1]: {'id': row[0], 'team': row[2]} for row in cursor.fetchall()}
    conn.close()
    return result

def get_nba_api_player_team(player_name):
    """Get player's current team from NBA API"""
    if not NBA_API_AVAILABLE:
        return None
    
    try:
        # Find player ID
        nba_players = players.find_players_by_full_name(player_name)
        if not nba_players:
            return None
        
        player_id = nba_players[0]['id']
        
        # Get player info
        info = commonplayerinfo.CommonPlayerInfo(player_id=player_id)
        data = info.get_normalized_dict()
        
        if data and 'CommonPlayerInfo' in data and data['CommonPlayerInfo']:
            team_abbr = data['CommonPlayerInfo'][0].get('TEAM_ABBREVIATION')
            return normalize_team(team_abbr)
    except Exception as e:
        print(f"  API error for {player_name}: {e}")
        return None
    
    return None

def validate_all():
    """Validate all players against NBA API"""
    print("=" * 60)
    print("NBA Trade Tree - Roster Validation")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    
    our_players = get_our_players()
    print(f"\nOur database: {len(our_players)} active players")
    
    if not NBA_API_AVAILABLE:
        print("\n❌ Cannot validate - nba_api not installed")
        return
    
    discrepancies = []
    validated = 0
    
    # Test a sample of key players
    test_players = [
        'LeBron James', 'Stephen Curry', 'Kevin Durant', 'Giannis Antetokounmpo',
        'Nikola Jokic', 'Joel Embiid', 'Jayson Tatum', 'Luka Doncic',
        'Shai Gilgeous-Alexander', 'Anthony Edwards', 'Donovan Mitchell',
        'James Harden', 'Trae Young', 'Anthony Davis', 'Chris Paul'
    ]
    
    print("\nValidating key players against NBA.com...")
    print("-" * 50)
    
    for name in test_players:
        if name not in our_players:
            print(f"  {name}: NOT IN OUR DB")
            continue
        
        our_team = our_players[name]['team']
        nba_team = get_nba_api_player_team(name)
        
        if nba_team is None:
            print(f"  {name}: Could not fetch from API")
            continue
        
        if normalize_team(our_team) != nba_team:
            discrepancies.append({
                'name': name,
                'our_team': our_team,
                'nba_team': nba_team
            })
            print(f"  ❌ {name}: Ours={our_team}, NBA.com={nba_team}")
        else:
            print(f"  ✓ {name}: {our_team}")
            validated += 1
    
    print("\n" + "=" * 60)
    print(f"Results: {validated} validated, {len(discrepancies)} discrepancies")
    
    if discrepancies:
        print("\n⚠ DISCREPANCIES FOUND:")
        for d in discrepancies:
            print(f"  - {d['name']}: {d['our_team']} should be {d['nba_team']}")
    else:
        print("\n✅ All checked players match NBA.com data!")
    
    return discrepancies

if __name__ == '__main__':
    fix_mode = '--fix' in sys.argv
    discrepancies = validate_all()
    
    if fix_mode and discrepancies:
        print("\n🔧 Fix mode enabled - updating database...")
        # Auto-fix logic would go here
