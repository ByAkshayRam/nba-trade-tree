-- Seed data for Celtics/Nets trade tree (2013)
-- This demonstrates the data model with a famous real-world example

-- Teams
INSERT OR IGNORE INTO teams (id, name, abbreviation, primary_color, secondary_color) VALUES
('BOS', 'Boston Celtics', 'BOS', '#007A33', '#BA9653'),
('BKN', 'Brooklyn Nets', 'BKN', '#000000', '#FFFFFF'),
('PHI', 'Philadelphia 76ers', 'PHI', '#006BB6', '#ED174C');

-- Players involved
INSERT OR IGNORE INTO players (id, name, current_team_id, draft_year, draft_round, draft_pick, draft_team_id, is_active) VALUES
('garnettke01', 'Kevin Garnett', NULL, 1995, 1, 5, 'MIN', 0),
('piercpa01', 'Paul Pierce', NULL, 1998, 1, 10, 'BOS', 0),
('youngja01', 'James Young', NULL, 2014, 1, 17, 'BOS', 0),
('brownja02', 'Jaylen Brown', 'BOS', 2016, 1, 3, 'BOS', 1),
('tatumja01', 'Jayson Tatum', 'BOS', 2017, 1, 3, 'BOS', 1),
('fultzma01', 'Markelle Fultz', 'ORL', 2017, 1, 1, 'PHI', 1);

-- The main trade: KG/Pierce to Nets (June 27, 2013)
INSERT OR IGNORE INTO trades (id, date, description, source_url, created_at) VALUES
('2013-bos-bkn', '2013-06-27', 'Celtics trade Kevin Garnett, Paul Pierce, and Jason Terry to Nets for future draft picks', 'https://www.basketball-reference.com/transactions/', datetime('now'));

-- Draft picks received by Boston
INSERT OR IGNORE INTO draft_picks (id, year, round, pick_number, original_team_id, current_team_id, player_id, is_used) VALUES
('2014-1-BKN', 2014, 1, 17, 'BKN', 'BOS', 'youngja01', 1),
('2016-1-BKN', 2016, 1, 3, 'BKN', 'BOS', 'brownja02', 1),
('2017-1-BKN', 2017, 1, 1, 'BKN', 'BOS', NULL, 1),  -- Traded to PHI
('2018-1-BKN', 2018, 1, 8, 'BKN', 'BOS', NULL, 1);  -- Used in Kyrie trade

-- Trade assets for the main trade
INSERT OR IGNORE INTO trade_assets (id, trade_id, team_from, team_to, asset_type, player_id, pick_id) VALUES
('2013-bos-bkn-kg', '2013-bos-bkn', 'BOS', 'BKN', 'player', 'garnettke01', NULL),
('2013-bos-bkn-pp', '2013-bos-bkn', 'BOS', 'BKN', 'player', 'piercpa01', NULL),
('2013-bos-bkn-pick1', '2013-bos-bkn', 'BKN', 'BOS', 'pick', NULL, '2014-1-BKN'),
('2013-bos-bkn-pick2', '2013-bos-bkn', 'BKN', 'BOS', 'pick', NULL, '2016-1-BKN'),
('2013-bos-bkn-pick3', '2013-bos-bkn', 'BKN', 'BOS', 'pick', NULL, '2017-1-BKN'),
('2013-bos-bkn-pick4', '2013-bos-bkn', 'BKN', 'BOS', 'pick', NULL, '2018-1-BKN');

-- Draft day trade: BOS trades #1 to PHI for #3 (June 22, 2017)
INSERT OR IGNORE INTO trades (id, date, description, source_url, created_at) VALUES
('2017-bos-phi', '2017-06-22', 'Celtics trade #1 pick to 76ers for #3 pick and future first', 'https://www.basketball-reference.com/transactions/', datetime('now'));

INSERT OR IGNORE INTO draft_picks (id, year, round, pick_number, original_team_id, current_team_id, player_id, is_used) VALUES
('2017-1-PHI-3', 2017, 1, 3, 'PHI', 'BOS', 'tatumja01', 1);

INSERT OR IGNORE INTO trade_assets (id, trade_id, team_from, team_to, asset_type, player_id, pick_id) VALUES
('2017-bos-phi-1', '2017-bos-phi', 'BOS', 'PHI', 'pick', NULL, '2017-1-BKN'),
('2017-bos-phi-3', '2017-bos-phi', 'PHI', 'BOS', 'pick', NULL, '2017-1-PHI-3');

-- Acquisitions tracking
INSERT OR IGNORE INTO acquisitions (id, player_id, team_id, type, date, trade_id, pick_id) VALUES
('acq-young', 'youngja01', 'BOS', 'draft', '2014-06-26', NULL, '2014-1-BKN'),
('acq-brown', 'brownja02', 'BOS', 'draft', '2016-06-23', NULL, '2016-1-BKN'),
('acq-tatum', 'tatumja01', 'BOS', 'draft', '2017-06-22', '2017-bos-phi', '2017-1-PHI-3');
