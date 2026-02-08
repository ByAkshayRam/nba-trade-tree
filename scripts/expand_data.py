#!/usr/bin/env python3
"""
Expand NBA Trade Tree data using nba_api.
Adds more players and trade chains.
"""

import sqlite3
import json
import time
from pathlib import Path

# Activate virtual environment
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / ".venv/lib/python3.12/site-packages"))

try:
    from nba_api.stats.static import players as nba_players
    from nba_api.stats.static import teams as nba_teams
    from nba_api.stats.endpoints import commonplayerinfo
    HAS_NBA_API = True
except ImportError:
    HAS_NBA_API = False
    print("⚠️  nba_api not available, using static data only")

# Database path
DB_PATH = Path(__file__).parent.parent / "data" / "nba_trades.db"

# More comprehensive trade chain data
# Famous trade trees that shaped the modern NBA

TRADE_CHAINS = [
    # ===== CELTICS/NETS TRADE TREE =====
    {
        "slug": "kg-pierce-trade",
        "trade_date": "2013-06-27",
        "description": "Celtics trade Kevin Garnett and Paul Pierce to Nets for multiple 1st round picks",
        "teams": ["BOS", "BKN"],
        "players_sent": ["Kevin Garnett", "Paul Pierce", "Jason Terry", "D.J. White"],
        "picks_sent": [],
        "picks_received": ["2014 BKN 1st", "2016 BKN 1st", "2017 BKN 1st", "2018 BKN 1st"],
        "players_received": ["Gerald Wallace", "Kris Humphries", "MarShon Brooks", "Kris Joseph", "Keith Bogans"],
        "resulting_players": [
            {
                "name": "James Young",
                "draft_year": 2014,
                "draft_pick": 17,
                "via": "2014 BKN pick",
                "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/203923.png",
            },
            {
                "name": "Jaylen Brown",
                "draft_year": 2016,
                "draft_pick": 3,
                "via": "2016 BKN pick",
                "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1627759.png",
            },
            {
                "name": "Jayson Tatum",
                "draft_year": 2017,
                "draft_pick": 3,
                "via": "2017 BKN pick → traded to PHI for #3",
                "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1628369.png",
            },
        ],
    },
    
    # ===== JAMES HARDEN TRADE TREE (OKC → HOU) =====
    {
        "slug": "harden-okc-trade",
        "trade_date": "2012-10-27",
        "description": "Thunder trade James Harden to Rockets for Kevin Martin, picks",
        "teams": ["OKC", "HOU"],
        "players_sent": ["James Harden"],
        "picks_sent": [],
        "picks_received": ["2013 TOR 1st (via HOU)", "2013 DAL 1st (via HOU)"],
        "players_received": ["Kevin Martin", "Jeremy Lamb"],
        "resulting_players": [
            {
                "name": "Steven Adams",
                "draft_year": 2013,
                "draft_pick": 12,
                "via": "2013 TOR pick (via Harden trade)",
                "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/203500.png",
            },
        ],
    },
    
    # ===== KAWHI LEONARD TRADE (SAS → TOR) =====
    {
        "slug": "kawhi-spurs-trade",
        "trade_date": "2018-07-18",
        "description": "Spurs trade Kawhi Leonard to Raptors for DeMar DeRozan",
        "teams": ["SAS", "TOR"],
        "players_sent": ["Kawhi Leonard", "Danny Green"],
        "picks_sent": [],
        "picks_received": ["2019 TOR 1st"],
        "players_received": ["DeMar DeRozan", "Jakob Poeltl"],
        "resulting_players": [
            {
                "name": "Keldon Johnson",
                "draft_year": 2019,
                "draft_pick": 29,
                "via": "2019 TOR pick (via Kawhi trade)",
                "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1629640.png",
            },
        ],
    },
    
    # ===== PAUL GEORGE TRADE (IND → OKC → LAC) =====
    {
        "slug": "paul-george-okc-trade",
        "trade_date": "2017-06-30",
        "description": "Pacers trade Paul George to Thunder for Victor Oladipo, Sabonis",
        "teams": ["IND", "OKC"],
        "players_sent": ["Paul George"],
        "picks_sent": [],
        "picks_received": [],
        "players_received": ["Victor Oladipo", "Domantas Sabonis"],
        "resulting_players": [],
    },
    
    # ===== ANTHONY DAVIS TRADE (NOP → LAL) =====
    {
        "slug": "anthony-davis-trade",
        "trade_date": "2019-06-15",
        "description": "Pelicans trade Anthony Davis to Lakers for Lonzo Ball, Ingram, Hart, picks",
        "teams": ["NOP", "LAL"],
        "players_sent": ["Anthony Davis"],
        "picks_sent": [],
        "picks_received": ["2019 LAL 4th pick", "2021 LAL 1st", "2024 LAL 1st swap", "2025 LAL 1st"],
        "players_received": ["Lonzo Ball", "Brandon Ingram", "Josh Hart"],
        "resulting_players": [
            {
                "name": "Zion Williamson",
                "draft_year": 2019,
                "draft_pick": 1,
                "via": "2019 #1 pick (own pick)",
                "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1629627.png",
            },
        ],
    },
    
    # ===== LUKA DONCIC DRAFT TRADE =====
    {
        "slug": "luka-doncic-trade",
        "trade_date": "2018-06-21",
        "description": "Hawks trade #3 pick (Luka Doncic) to Mavericks for #5 pick (Trae Young) and future 1st",
        "teams": ["ATL", "DAL"],
        "players_sent": [],
        "picks_sent": ["2018 #3 pick"],
        "picks_received": ["2018 #5 pick", "2019 DAL 1st (protected)"],
        "players_received": [],
        "resulting_players": [
            {
                "name": "Trae Young",
                "draft_year": 2018,
                "draft_pick": 5,
                "via": "2018 #5 pick (via Luka trade)",
                "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1629027.png",
            },
            {
                "name": "Cam Reddish",
                "draft_year": 2019,
                "draft_pick": 10,
                "via": "2019 DAL 1st (via Luka trade)",
                "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1629629.png",
            },
        ],
    },
    
    # ===== KEVIN DURANT TO NETS =====
    {
        "slug": "kevin-durant-nets",
        "trade_date": "2019-06-30",
        "description": "Kevin Durant signs with Brooklyn Nets as free agent",
        "teams": ["GSW", "BKN"],
        "players_sent": [],
        "picks_sent": [],
        "picks_received": [],
        "players_received": [],
        "is_signing": True,
        "resulting_players": [],
    },

    # ===== RUDY GOBERT TRADE (UTA → MIN) =====
    {
        "slug": "gobert-trade",
        "trade_date": "2022-07-06",
        "description": "Jazz trade Rudy Gobert to Timberwolves for 5 first round picks and players",
        "teams": ["UTA", "MIN"],
        "players_sent": ["Rudy Gobert"],
        "picks_sent": [],
        "picks_received": ["2023 MIN 1st", "2025 MIN 1st", "2027 MIN 1st", "2029 MIN 1st (top-5 protected)"],
        "players_received": ["Malik Beasley", "Patrick Beverley", "Jarred Vanderbilt", "Leandro Bolmaro", "Walker Kessler"],
        "resulting_players": [
            {
                "name": "Taylor Hendricks",
                "draft_year": 2023,
                "draft_pick": 9,
                "via": "2023 MIN 1st (via Gobert trade)",
                "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1641724.png",
            },
        ],
    },
]

# Additional star players with simple acquisition data
STAR_PLAYERS = [
    {"name": "LeBron James", "team": "LAL", "draft_year": 2003, "draft_pick": 1, "acquisition_type": "signing", "acquisition_date": "2018-07-01", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/2544.png"},
    {"name": "Stephen Curry", "team": "GSW", "draft_year": 2009, "draft_pick": 7, "acquisition_type": "draft", "acquisition_date": "2009-06-25", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/201939.png"},
    {"name": "Kevin Durant", "team": "PHX", "draft_year": 2007, "draft_pick": 2, "acquisition_type": "trade", "acquisition_date": "2023-02-09", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/201142.png"},
    {"name": "Giannis Antetokounmpo", "team": "MIL", "draft_year": 2013, "draft_pick": 15, "acquisition_type": "draft", "acquisition_date": "2013-06-27", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/203507.png"},
    {"name": "Luka Doncic", "team": "DAL", "draft_year": 2018, "draft_pick": 3, "acquisition_type": "trade", "acquisition_date": "2018-06-21", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1629029.png"},
    {"name": "Nikola Jokic", "team": "DEN", "draft_year": 2014, "draft_pick": 41, "acquisition_type": "draft", "acquisition_date": "2014-06-26", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/203999.png"},
    {"name": "Joel Embiid", "team": "PHI", "draft_year": 2014, "draft_pick": 3, "acquisition_type": "draft", "acquisition_date": "2014-06-26", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/203954.png"},
    {"name": "Anthony Davis", "team": "LAL", "draft_year": 2012, "draft_pick": 1, "acquisition_type": "trade", "acquisition_date": "2019-06-15", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/203076.png"},
    {"name": "Damian Lillard", "team": "MIL", "draft_year": 2012, "draft_pick": 6, "acquisition_type": "trade", "acquisition_date": "2023-09-27", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/203081.png"},
    {"name": "Devin Booker", "team": "PHX", "draft_year": 2015, "draft_pick": 13, "acquisition_type": "draft", "acquisition_date": "2015-06-25", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1626164.png"},
    {"name": "Jimmy Butler", "team": "MIA", "draft_year": 2011, "draft_pick": 30, "acquisition_type": "signing", "acquisition_date": "2019-07-06", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/202710.png"},
    {"name": "Kawhi Leonard", "team": "LAC", "draft_year": 2011, "draft_pick": 15, "acquisition_type": "signing", "acquisition_date": "2019-07-06", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/202695.png"},
    {"name": "Paul George", "team": "PHI", "draft_year": 2010, "draft_pick": 10, "acquisition_type": "trade", "acquisition_date": "2024-07-01", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/202331.png"},
    {"name": "Trae Young", "team": "ATL", "draft_year": 2018, "draft_pick": 5, "acquisition_type": "trade", "acquisition_date": "2018-06-21", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1629027.png"},
    {"name": "Ja Morant", "team": "MEM", "draft_year": 2019, "draft_pick": 2, "acquisition_type": "draft", "acquisition_date": "2019-06-20", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1629630.png"},
    {"name": "Zion Williamson", "team": "NOP", "draft_year": 2019, "draft_pick": 1, "acquisition_type": "draft", "acquisition_date": "2019-06-20", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1629627.png"},
    {"name": "Anthony Edwards", "team": "MIN", "draft_year": 2020, "draft_pick": 1, "acquisition_type": "draft", "acquisition_date": "2020-11-18", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1630162.png"},
    {"name": "Tyrese Haliburton", "team": "IND", "draft_year": 2020, "draft_pick": 12, "acquisition_type": "trade", "acquisition_date": "2022-02-08", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1630169.png"},
    {"name": "Cade Cunningham", "team": "DET", "draft_year": 2021, "draft_pick": 1, "acquisition_type": "draft", "acquisition_date": "2021-07-29", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1630595.png"},
    {"name": "Paolo Banchero", "team": "ORL", "draft_year": 2022, "draft_pick": 1, "acquisition_type": "draft", "acquisition_date": "2022-06-23", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1631094.png"},
    {"name": "Victor Wembanyama", "team": "SAS", "draft_year": 2023, "draft_pick": 1, "acquisition_type": "draft", "acquisition_date": "2023-06-22", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1641705.png"},
    {"name": "Shai Gilgeous-Alexander", "team": "OKC", "draft_year": 2018, "draft_pick": 11, "acquisition_type": "trade", "acquisition_date": "2019-07-10", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1628983.png"},
    {"name": "Donovan Mitchell", "team": "CLE", "draft_year": 2017, "draft_pick": 13, "acquisition_type": "trade", "acquisition_date": "2022-09-01", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1628378.png"},
    {"name": "Bam Adebayo", "team": "MIA", "draft_year": 2017, "draft_pick": 14, "acquisition_type": "draft", "acquisition_date": "2017-06-22", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1628389.png"},
    {"name": "De'Aaron Fox", "team": "SAC", "draft_year": 2017, "draft_pick": 5, "acquisition_type": "draft", "acquisition_date": "2017-06-22", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1628368.png"},
    {"name": "Domantas Sabonis", "team": "SAC", "draft_year": 2016, "draft_pick": 11, "acquisition_type": "trade", "acquisition_date": "2022-02-08", "headshot": "https://cdn.nba.com/headshots/nba/latest/1040x760/1627734.png"},
]


def get_db_connection():
    """Get database connection."""
    return sqlite3.connect(DB_PATH)


def get_team_id(conn, abbr):
    """Get team ID from abbreviation."""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM teams WHERE abbreviation = ?", (abbr,))
    result = cursor.fetchone()
    return result[0] if result else None


def get_or_create_player(conn, name, team_abbr, draft_year, draft_pick, headshot_url):
    """Get existing player or create new one."""
    cursor = conn.cursor()
    
    # Check if player exists
    cursor.execute("SELECT id FROM players WHERE name = ?", (name,))
    result = cursor.fetchone()
    
    if result:
        # Update existing player
        team_id = get_team_id(conn, team_abbr)
        cursor.execute("""
            UPDATE players SET current_team_id = ?, headshot_url = ?
            WHERE id = ?
        """, (team_id, headshot_url, result[0]))
        conn.commit()
        return result[0]
    
    # Create new player
    team_id = get_team_id(conn, team_abbr)
    cursor.execute("""
        INSERT INTO players (name, current_team_id, draft_year, draft_pick, headshot_url)
        VALUES (?, ?, ?, ?, ?)
    """, (name, team_id, draft_year, draft_pick, headshot_url))
    conn.commit()
    return cursor.lastrowid


def insert_trade_chain(conn, chain_data):
    """Insert a trade and its chain data."""
    cursor = conn.cursor()
    
    # Check if trade exists
    cursor.execute("SELECT id FROM trades WHERE date = ? AND description = ?", 
                   (chain_data["trade_date"], chain_data["description"]))
    existing = cursor.fetchone()
    
    if existing:
        trade_id = existing[0]
        print(f"  ⚡ Trade already exists: {chain_data['slug']}")
    else:
        # Insert trade
        cursor.execute("""
            INSERT INTO trades (date, description, source_url)
            VALUES (?, ?, ?)
        """, (chain_data["trade_date"], chain_data["description"], f"https://www.basketball-reference.com/"))
        trade_id = cursor.lastrowid
        print(f"  ✅ Created trade: {chain_data['slug']}")
    
    # Process resulting players
    for player_data in chain_data.get("resulting_players", []):
        # Get or create player
        # Determine team from the trade
        team_abbr = chain_data["teams"][0]  # First team is the one receiving the pick
        
        player_id = get_or_create_player(
            conn, 
            player_data["name"],
            team_abbr,
            player_data["draft_year"],
            player_data["draft_pick"],
            player_data.get("headshot", "")
        )
        
        team_id = get_team_id(conn, team_abbr)
        
        # Check if acquisition exists
        cursor.execute("SELECT id FROM acquisitions WHERE player_id = ?", (player_id,))
        if not cursor.fetchone():
            # Insert acquisition
            cursor.execute("""
                INSERT INTO acquisitions (player_id, team_id, acquisition_type, date, origin_trade_id, notes)
                VALUES (?, ?, 'draft', ?, ?, ?)
            """, (player_id, team_id, f"{player_data['draft_year']}-06-23", trade_id, player_data.get("via", "")))
        
        # Build chain JSON
        chain_events = [
            {"event": chain_data["description"], "date": chain_data["trade_date"], "action": "Trade completed"},
            {"event": player_data.get("via", f"Pick became #{player_data['draft_pick']}"), "date": f"{player_data['draft_year']}-06-23", "action": f"Drafted {player_data['name']}"},
        ]
        
        # Check if chain exists
        cursor.execute("SELECT id FROM trade_chains WHERE resulting_player_id = ?", (player_id,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO trade_chains (origin_trade_id, resulting_player_id, chain_json)
                VALUES (?, ?, ?)
            """, (trade_id, player_id, json.dumps(chain_events)))
        
        print(f"    📌 Added chain for {player_data['name']}")
    
    conn.commit()
    return trade_id


def insert_star_players(conn):
    """Insert star players with their acquisition data."""
    cursor = conn.cursor()
    
    for player in STAR_PLAYERS:
        # Skip players that might already be in trade chains
        cursor.execute("SELECT id FROM players WHERE name = ?", (player["name"],))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing player
            team_id = get_team_id(conn, player["team"])
            cursor.execute("""
                UPDATE players SET current_team_id = ?, headshot_url = ?
                WHERE id = ?
            """, (team_id, player.get("headshot", ""), existing[0]))
            player_id = existing[0]
            print(f"  ⚡ Updated player: {player['name']}")
        else:
            player_id = get_or_create_player(
                conn,
                player["name"],
                player["team"],
                player["draft_year"],
                player["draft_pick"],
                player.get("headshot", "")
            )
            print(f"  ✅ Created player: {player['name']}")
        
        team_id = get_team_id(conn, player["team"])
        
        # Insert acquisition if not exists
        cursor.execute("SELECT id FROM acquisitions WHERE player_id = ?", (player_id,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO acquisitions (player_id, team_id, acquisition_type, date, notes)
                VALUES (?, ?, ?, ?, ?)
            """, (player_id, team_id, player["acquisition_type"], player["acquisition_date"], ""))
    
    conn.commit()


def main():
    """Main entry point."""
    print("🏀 NBA Trade Tree - Data Expansion")
    print("=" * 50)
    
    conn = get_db_connection()
    
    # Insert trade chains
    print("\n📊 Inserting trade chains...")
    for chain in TRADE_CHAINS:
        insert_trade_chain(conn, chain)
    
    # Insert star players
    print("\n⭐ Inserting star players...")
    insert_star_players(conn)
    
    # Show stats
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM players")
    player_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM trades")
    trade_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM trade_chains")
    chain_count = cursor.fetchone()[0]
    
    print("\n" + "=" * 50)
    print(f"📊 Database stats:")
    print(f"   Players: {player_count}")
    print(f"   Trades: {trade_count}")
    print(f"   Trade chains: {chain_count}")
    
    conn.close()
    print("\n✅ Data expansion complete!")


if __name__ == "__main__":
    main()
