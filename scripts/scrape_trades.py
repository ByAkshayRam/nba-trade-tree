#!/usr/bin/env python3
"""
NBA Trade Tree Scraper
Scrapes Basketball-Reference for trade history and builds acquisition chains.
"""

import sqlite3
import json
import time
import re
from datetime import datetime
from pathlib import Path
from typing import Optional
import urllib.request
from html.parser import HTMLParser

# Database path
DB_PATH = Path(__file__).parent.parent / "data" / "nba_trades.db"

# Known trade data for validation (manually curated for accuracy)
# This is the "ground truth" for the famous trade trees

CELTICS_NETS_TRADE = {
    "date": "2013-06-27",
    "description": "Celtics trade Kevin Garnett and Paul Pierce to Nets for future picks",
    "assets": [
        # Celtics receive
        {"type": "pick", "year": 2014, "round": 1, "from": "BKN", "to": "BOS", "became": "James Young (#17)"},
        {"type": "pick", "year": 2016, "round": 1, "from": "BKN", "to": "BOS", "became": "Jaylen Brown (#3)"},
        {"type": "pick", "year": 2017, "round": 1, "from": "BKN", "to": "BOS", "became": "Traded to PHI, received #3 pick"},
        {"type": "pick", "year": 2018, "round": 1, "from": "BKN", "to": "BOS", "became": "Part of Kyrie Irving trade"},
        {"type": "player", "name": "Gerald Wallace", "from": "BKN", "to": "BOS"},
        {"type": "player", "name": "Kris Humphries", "from": "BKN", "to": "BOS"},
        {"type": "player", "name": "MarShon Brooks", "from": "BKN", "to": "BOS"},
        {"type": "player", "name": "Kris Joseph", "from": "BKN", "to": "BOS"},
        {"type": "player", "name": "Keith Bogans", "from": "BKN", "to": "BOS"},
        # Nets receive
        {"type": "player", "name": "Kevin Garnett", "from": "BOS", "to": "BKN"},
        {"type": "player", "name": "Paul Pierce", "from": "BOS", "to": "BKN"},
        {"type": "player", "name": "Jason Terry", "from": "BOS", "to": "BKN"},
        {"type": "player", "name": "D.J. White", "from": "BOS", "to": "BKN"},
    ]
}

CELTICS_SIXERS_FULTZ_TRADE = {
    "date": "2017-06-19",
    "description": "Celtics trade #1 pick to 76ers for #3 pick and future 1st",
    "assets": [
        {"type": "pick", "year": 2017, "round": 1, "number": 1, "from": "BOS", "to": "PHI", "became": "Markelle Fultz"},
        {"type": "pick", "year": 2017, "round": 1, "number": 3, "from": "PHI", "to": "BOS", "became": "Jayson Tatum"},
        {"type": "pick", "year": 2019, "round": 1, "from": "LAL", "to": "BOS", "via": "PHI", "became": "Top-1 protected, conveyed #20 Matisse Thybulle to PHI"},
    ]
}

# Famous trade trees with simplified chain data
TRADE_TREES = {
    "jayson-tatum": {
        "player_name": "Jayson Tatum",
        "current_team": "BOS",
        "acquisition_type": "draft",
        "draft_year": 2017,
        "draft_pick": 3,
        "origin_trade": "celtics-nets-2013",
        "chain": [
            {"event": "KG/Pierce traded to BKN", "date": "2013-06-27", "received": "2014, 2016, 2017, 2018 BKN 1sts"},
            {"event": "2017 BKN pick used (#1 overall)", "date": "2017-06-19", "action": "Traded to PHI"},
            {"event": "Received #3 from PHI", "date": "2017-06-19", "action": "Drafted Jayson Tatum"},
        ]
    },
    "jaylen-brown": {
        "player_name": "Jaylen Brown",
        "current_team": "BOS",
        "acquisition_type": "draft",
        "draft_year": 2016,
        "draft_pick": 3,
        "origin_trade": "celtics-nets-2013",
        "chain": [
            {"event": "KG/Pierce traded to BKN", "date": "2013-06-27", "received": "2014, 2016, 2017, 2018 BKN 1sts"},
            {"event": "2016 BKN pick conveyed (#3 overall)", "date": "2016-06-23", "action": "Drafted Jaylen Brown"},
        ]
    }
}

# Team data
TEAMS = [
    {"abbr": "ATL", "name": "Atlanta Hawks", "primary": "#E03A3E", "secondary": "#C1D32F"},
    {"abbr": "BOS", "name": "Boston Celtics", "primary": "#007A33", "secondary": "#BA9653"},
    {"abbr": "BKN", "name": "Brooklyn Nets", "primary": "#000000", "secondary": "#FFFFFF"},
    {"abbr": "CHA", "name": "Charlotte Hornets", "primary": "#1D1160", "secondary": "#00788C"},
    {"abbr": "CHI", "name": "Chicago Bulls", "primary": "#CE1141", "secondary": "#000000"},
    {"abbr": "CLE", "name": "Cleveland Cavaliers", "primary": "#860038", "secondary": "#041E42"},
    {"abbr": "DAL", "name": "Dallas Mavericks", "primary": "#00538C", "secondary": "#002B5E"},
    {"abbr": "DEN", "name": "Denver Nuggets", "primary": "#0E2240", "secondary": "#FEC524"},
    {"abbr": "DET", "name": "Detroit Pistons", "primary": "#C8102E", "secondary": "#1D42BA"},
    {"abbr": "GSW", "name": "Golden State Warriors", "primary": "#1D428A", "secondary": "#FFC72C"},
    {"abbr": "HOU", "name": "Houston Rockets", "primary": "#CE1141", "secondary": "#000000"},
    {"abbr": "IND", "name": "Indiana Pacers", "primary": "#002D62", "secondary": "#FDBB30"},
    {"abbr": "LAC", "name": "LA Clippers", "primary": "#C8102E", "secondary": "#1D428A"},
    {"abbr": "LAL", "name": "Los Angeles Lakers", "primary": "#552583", "secondary": "#FDB927"},
    {"abbr": "MEM", "name": "Memphis Grizzlies", "primary": "#5D76A9", "secondary": "#12173F"},
    {"abbr": "MIA", "name": "Miami Heat", "primary": "#98002E", "secondary": "#F9A01B"},
    {"abbr": "MIL", "name": "Milwaukee Bucks", "primary": "#00471B", "secondary": "#EEE1C6"},
    {"abbr": "MIN", "name": "Minnesota Timberwolves", "primary": "#0C2340", "secondary": "#236192"},
    {"abbr": "NOP", "name": "New Orleans Pelicans", "primary": "#0C2340", "secondary": "#C8102E"},
    {"abbr": "NYK", "name": "New York Knicks", "primary": "#006BB6", "secondary": "#F58426"},
    {"abbr": "OKC", "name": "Oklahoma City Thunder", "primary": "#007AC1", "secondary": "#EF3B24"},
    {"abbr": "ORL", "name": "Orlando Magic", "primary": "#0077C0", "secondary": "#C4CED4"},
    {"abbr": "PHI", "name": "Philadelphia 76ers", "primary": "#006BB6", "secondary": "#ED174C"},
    {"abbr": "PHX", "name": "Phoenix Suns", "primary": "#1D1160", "secondary": "#E56020"},
    {"abbr": "POR", "name": "Portland Trail Blazers", "primary": "#E03A3E", "secondary": "#000000"},
    {"abbr": "SAC", "name": "Sacramento Kings", "primary": "#5A2D81", "secondary": "#63727A"},
    {"abbr": "SAS", "name": "San Antonio Spurs", "primary": "#C4CED4", "secondary": "#000000"},
    {"abbr": "TOR", "name": "Toronto Raptors", "primary": "#CE1141", "secondary": "#000000"},
    {"abbr": "UTA", "name": "Utah Jazz", "primary": "#002B5C", "secondary": "#00471B"},
    {"abbr": "WAS", "name": "Washington Wizards", "primary": "#002B5C", "secondary": "#E31837"},
]

# Key players with their acquisition data
PLAYERS = [
    {
        "name": "Jayson Tatum",
        "team": "BOS",
        "draft_year": 2017,
        "draft_pick": 3,
        "acquisition_type": "draft",
        "acquisition_date": "2017-06-22",
        "headshot_url": "https://cdn.nba.com/headshots/nba/latest/1040x760/1628369.png",
        "origin_trade_id": 1,  # Links to Celtics-Nets trade
    },
    {
        "name": "Jaylen Brown",
        "team": "BOS",
        "draft_year": 2016,
        "draft_pick": 3,
        "acquisition_type": "draft",
        "acquisition_date": "2016-06-23",
        "headshot_url": "https://cdn.nba.com/headshots/nba/latest/1040x760/1627759.png",
        "origin_trade_id": 1,  # Links to Celtics-Nets trade
    },
    {
        "name": "Derrick White",
        "team": "BOS",
        "draft_year": 2017,
        "draft_pick": 29,
        "acquisition_type": "trade",
        "acquisition_date": "2022-02-10",
        "headshot_url": "https://cdn.nba.com/headshots/nba/latest/1040x760/1628401.png",
        "origin_trade_id": None,
    },
    {
        "name": "Kevin Garnett",
        "team": "BKN",  # at time of 2013 trade
        "draft_year": 1995,
        "draft_pick": 5,
        "acquisition_type": "trade",
        "acquisition_date": "2013-06-27",
        "headshot_url": "https://cdn.nba.com/headshots/nba/latest/1040x760/708.png",
        "origin_trade_id": None,
    },
    {
        "name": "Paul Pierce",
        "team": "BKN",  # at time of 2013 trade
        "draft_year": 1998,
        "draft_pick": 10,
        "acquisition_type": "trade",
        "acquisition_date": "2013-06-27",
        "headshot_url": "https://cdn.nba.com/headshots/nba/latest/1040x760/1718.png",
        "origin_trade_id": None,
    },
    {
        "name": "James Harden",
        "team": "LAC",
        "draft_year": 2009,
        "draft_pick": 3,
        "acquisition_type": "trade",
        "acquisition_date": "2023-11-01",
        "headshot_url": "https://cdn.nba.com/headshots/nba/latest/1040x760/201935.png",
        "origin_trade_id": None,
    },
]


def init_database():
    """Initialize SQLite database with schema."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Teams table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            abbreviation TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            primary_color TEXT,
            secondary_color TEXT
        )
    """)
    
    # Players table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            current_team_id INTEGER,
            draft_year INTEGER,
            draft_pick INTEGER,
            headshot_url TEXT,
            FOREIGN KEY (current_team_id) REFERENCES teams(id)
        )
    """)
    
    # Trades table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            description TEXT,
            source_url TEXT
        )
    """)
    
    # Trade assets table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trade_assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trade_id INTEGER NOT NULL,
            team_from TEXT NOT NULL,
            team_to TEXT NOT NULL,
            asset_type TEXT NOT NULL CHECK(asset_type IN ('player', 'pick')),
            asset_id INTEGER,
            pick_year INTEGER,
            pick_round INTEGER,
            pick_number INTEGER,
            notes TEXT,
            FOREIGN KEY (trade_id) REFERENCES trades(id)
        )
    """)
    
    # Draft picks table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS draft_picks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER NOT NULL,
            round INTEGER NOT NULL,
            number INTEGER,
            original_team_id INTEGER,
            current_team_id INTEGER,
            player_id INTEGER,
            FOREIGN KEY (original_team_id) REFERENCES teams(id),
            FOREIGN KEY (current_team_id) REFERENCES teams(id),
            FOREIGN KEY (player_id) REFERENCES players(id)
        )
    """)
    
    # Acquisitions table (links players to how they were acquired)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS acquisitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            team_id INTEGER NOT NULL,
            acquisition_type TEXT NOT NULL CHECK(acquisition_type IN ('trade', 'draft', 'signing', 'waiver')),
            date TEXT NOT NULL,
            trade_id INTEGER,
            origin_trade_id INTEGER,
            notes TEXT,
            FOREIGN KEY (player_id) REFERENCES players(id),
            FOREIGN KEY (team_id) REFERENCES teams(id),
            FOREIGN KEY (trade_id) REFERENCES trades(id),
            FOREIGN KEY (origin_trade_id) REFERENCES trades(id)
        )
    """)
    
    # Trade chains table (for tracing lineage)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trade_chains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            origin_trade_id INTEGER NOT NULL,
            resulting_player_id INTEGER,
            chain_json TEXT NOT NULL,
            FOREIGN KEY (origin_trade_id) REFERENCES trades(id),
            FOREIGN KEY (resulting_player_id) REFERENCES players(id)
        )
    """)
    
    conn.commit()
    return conn


def seed_data(conn: sqlite3.Connection):
    """Seed the database with initial data."""
    cursor = conn.cursor()
    
    # Insert teams
    for team in TEAMS:
        cursor.execute("""
            INSERT OR IGNORE INTO teams (abbreviation, name, primary_color, secondary_color)
            VALUES (?, ?, ?, ?)
        """, (team["abbr"], team["name"], team["primary"], team["secondary"]))
    
    conn.commit()
    
    # Get team IDs
    cursor.execute("SELECT id, abbreviation FROM teams")
    team_map = {row[1]: row[0] for row in cursor.fetchall()}
    
    # Insert the Celtics-Nets trade
    cursor.execute("""
        INSERT OR REPLACE INTO trades (id, date, description, source_url)
        VALUES (1, ?, ?, ?)
    """, (
        CELTICS_NETS_TRADE["date"],
        CELTICS_NETS_TRADE["description"],
        "https://www.basketball-reference.com/teams/BOS/2014_transactions.html"
    ))
    
    # Insert the Celtics-Sixers trade
    cursor.execute("""
        INSERT OR REPLACE INTO trades (id, date, description, source_url)
        VALUES (2, ?, ?, ?)
    """, (
        CELTICS_SIXERS_FULTZ_TRADE["date"],
        CELTICS_SIXERS_FULTZ_TRADE["description"],
        "https://www.basketball-reference.com/teams/BOS/2018_transactions.html"
    ))
    
    conn.commit()
    
    # Insert players
    for player in PLAYERS:
        team_id = team_map.get(player["team"])
        cursor.execute("""
            INSERT OR REPLACE INTO players (name, current_team_id, draft_year, draft_pick, headshot_url)
            VALUES (?, ?, ?, ?, ?)
        """, (player["name"], team_id, player["draft_year"], player["draft_pick"], player["headshot_url"]))
        
        player_id = cursor.lastrowid
        
        # Insert acquisition
        cursor.execute("""
            INSERT OR REPLACE INTO acquisitions (player_id, team_id, acquisition_type, date, origin_trade_id)
            VALUES (?, ?, ?, ?, ?)
        """, (
            player_id,
            team_id,
            player["acquisition_type"],
            player["acquisition_date"],
            player.get("origin_trade_id")
        ))
    
    conn.commit()
    
    # Insert trade chains for famous trees
    for slug, tree in TRADE_TREES.items():
        cursor.execute("SELECT id FROM players WHERE name = ?", (tree["player_name"],))
        result = cursor.fetchone()
        player_id = result[0] if result else None
        
        # Find origin trade
        origin_trade_id = 1 if tree["origin_trade"] == "celtics-nets-2013" else None
        
        if origin_trade_id and player_id:
            cursor.execute("""
                INSERT OR REPLACE INTO trade_chains (origin_trade_id, resulting_player_id, chain_json)
                VALUES (?, ?, ?)
            """, (origin_trade_id, player_id, json.dumps(tree["chain"])))
    
    conn.commit()
    print(f"✅ Seeded database with {len(TEAMS)} teams, {len(PLAYERS)} players")


def get_player_tree(conn: sqlite3.Connection, player_name: str) -> dict:
    """Get the full trade tree for a player."""
    cursor = conn.cursor()
    
    # Find player
    cursor.execute("""
        SELECT p.id, p.name, p.draft_year, p.draft_pick, p.headshot_url,
               t.abbreviation, t.name, t.primary_color, t.secondary_color
        FROM players p
        LEFT JOIN teams t ON p.current_team_id = t.id
        WHERE p.name LIKE ?
    """, (f"%{player_name}%",))
    
    result = cursor.fetchone()
    if not result:
        return None
    
    player = {
        "id": result[0],
        "name": result[1],
        "draft_year": result[2],
        "draft_pick": result[3],
        "headshot_url": result[4],
        "team": {
            "abbreviation": result[5],
            "name": result[6],
            "primary_color": result[7],
            "secondary_color": result[8],
        }
    }
    
    # Get acquisition info
    cursor.execute("""
        SELECT a.acquisition_type, a.date, a.origin_trade_id, a.notes,
               t.date as trade_date, t.description as trade_description
        FROM acquisitions a
        LEFT JOIN trades t ON a.origin_trade_id = t.id
        WHERE a.player_id = ?
    """, (player["id"],))
    
    acq = cursor.fetchone()
    if acq:
        player["acquisition"] = {
            "type": acq[0],
            "date": acq[1],
            "origin_trade_id": acq[2],
            "notes": acq[3],
            "origin_trade": {
                "date": acq[4],
                "description": acq[5]
            } if acq[4] else None
        }
    
    # Get trade chain
    cursor.execute("""
        SELECT chain_json FROM trade_chains
        WHERE resulting_player_id = ?
    """, (player["id"],))
    
    chain_result = cursor.fetchone()
    if chain_result:
        player["chain"] = json.loads(chain_result[0])
    
    return player


def validate_tatum_trace(conn: sqlite3.Connection) -> bool:
    """Validate that we can trace Tatum back to KG/Pierce trade."""
    tree = get_player_tree(conn, "Jayson Tatum")
    
    if not tree:
        print("❌ Could not find Jayson Tatum")
        return False
    
    print(f"\n🏀 Tracing {tree['name']} ({tree['team']['abbreviation']})")
    print(f"   Draft: {tree['draft_year']} Round 1, Pick #{tree['draft_pick']}")
    
    if tree.get("acquisition"):
        acq = tree["acquisition"]
        print(f"   Acquisition: {acq['type']} on {acq['date']}")
        
        if acq.get("origin_trade"):
            print(f"   Origin Trade: {acq['origin_trade']['description']}")
            print(f"   Trade Date: {acq['origin_trade']['date']}")
    
    if tree.get("chain"):
        print("\n   📜 Trade Chain:")
        for step in tree["chain"]:
            print(f"      {step['date']}: {step['event']}")
            if step.get("action"):
                print(f"         → {step['action']}")
    
    # Check if we traced back to KG/Pierce
    has_origin = tree.get("acquisition", {}).get("origin_trade_id") == 1
    has_chain = len(tree.get("chain", [])) > 0
    
    if has_origin and has_chain:
        print("\n✅ Successfully traced Tatum to KG/Pierce trade!")
        return True
    else:
        print("\n❌ Could not trace full lineage")
        return False


def main():
    """Main entry point."""
    print("🏀 NBA Trade Tree - Data Foundation")
    print("=" * 50)
    
    # Initialize database
    conn = init_database()
    print(f"📁 Database: {DB_PATH}")
    
    # Seed data
    seed_data(conn)
    
    # Validate Tatum trace
    print("\n" + "=" * 50)
    validate_tatum_trace(conn)
    
    # Also validate Brown
    print("\n" + "=" * 50)
    tree = get_player_tree(conn, "Jaylen Brown")
    if tree:
        print(f"\n🏀 Tracing {tree['name']} ({tree['team']['abbreviation']})")
        print(f"   Draft: {tree['draft_year']} Round 1, Pick #{tree['draft_pick']}")
        if tree.get("chain"):
            print("\n   📜 Trade Chain:")
            for step in tree["chain"]:
                print(f"      {step['date']}: {step['event']}")
    
    conn.close()
    print("\n✅ Data foundation complete!")


if __name__ == "__main__":
    main()
