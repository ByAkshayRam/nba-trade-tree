const Database = require('better-sqlite3');
const db = new Database('/home/ubuntu/clawd/projects/nba-trade-tree/data/nba_trades.db');

// Batch 2: More verified transaction data
const playerChains = {
  
  'Marcus Smart': [
    { event: 'Drafted #6 by BOS', date: '2014-06-26', action: 'Round 1, Pick #6', teamTo: 'BOS', verified: true },
    { event: 'Traded to MEM', date: '2023-06-24', action: 'For Kristaps Porzingis package', teamFrom: 'BOS', teamTo: 'MEM', verified: true },
    { event: 'Traded to WAS', date: '2025-02-06', action: 'In 3-team trade', teamFrom: 'MEM', teamTo: 'WAS', verified: true }
  ],
  
  'Damian Lillard': [
    { event: 'Drafted #6 by POR', date: '2012-06-28', action: 'Round 1, Pick #6', teamTo: 'POR', verified: true },
    { event: 'Traded to MIL', date: '2023-09-27', action: 'For Jrue Holiday, Deandre Ayton, picks (3-team deal)', teamFrom: 'POR', teamTo: 'MIL', verified: true }
  ],
  
  'D\'Angelo Russell': [
    { event: 'Drafted #2 by LAL', date: '2015-06-25', action: 'Round 1, Pick #2', teamTo: 'LAL', verified: true },
    { event: 'Traded to BKN', date: '2017-06-22', action: 'For Brook Lopez, 2017 1st', teamFrom: 'LAL', teamTo: 'BKN', verified: true },
    { event: 'Sign-and-trade to GSW', date: '2019-07-01', action: 'In Kevin Durant deal', teamFrom: 'BKN', teamTo: 'GSW', verified: true },
    { event: 'Traded to MIN', date: '2020-02-06', action: 'For Andrew Wiggins, 2021 1st', teamFrom: 'GSW', teamTo: 'MIN', verified: true },
    { event: 'Traded to LAL', date: '2023-02-09', action: 'For Patrick Beverley, Malik Beasley, picks', teamFrom: 'MIN', teamTo: 'LAL', verified: true },
    { event: 'Traded to BKN', date: '2024-12-29', action: 'For Dorian Finney-Smith, Shake Milton', teamFrom: 'LAL', teamTo: 'BKN', verified: true }
  ],
  
  'Dejounte Murray': [
    { event: 'Drafted #29 by SAS', date: '2016-06-23', action: 'Round 1, Pick #29', teamTo: 'SAS', verified: true },
    { event: 'Traded to ATL', date: '2022-06-29', action: 'For 3 1sts, 1 swap', teamFrom: 'SAS', teamTo: 'ATL', verified: true },
    { event: 'Traded to NOP', date: '2024-07-06', action: 'For Dyson Daniels, Larry Nance Jr., 2 1sts', teamFrom: 'ATL', teamTo: 'NOP', verified: true }
  ],
  
  'CJ McCollum': [
    { event: 'Drafted #10 by POR', date: '2013-06-27', action: 'Round 1, Pick #10', teamTo: 'POR', verified: true },
    { event: 'Traded to NOP', date: '2022-02-08', action: 'For Josh Hart, picks', teamFrom: 'POR', teamTo: 'NOP', verified: true }
  ],
  
  'John Wall': [
    { event: 'Drafted #1 by WAS', date: '2010-06-24', action: 'Round 1, Pick #1', teamTo: 'WAS', verified: true },
    { event: 'Traded to HOU', date: '2020-12-03', action: 'For Russell Westbrook, 1st-round pick', teamFrom: 'WAS', teamTo: 'HOU', verified: true },
    { event: 'Signed with LAC', date: '2023-07-07', action: 'After Rockets buyout', teamFrom: 'HOU', teamTo: 'LAC', verified: true }
  ],
  
  'Brook Lopez': [
    { event: 'Drafted #10 by BKN', date: '2008-06-26', action: 'Round 1, Pick #10', teamTo: 'BKN', verified: true },
    { event: 'Traded to LAL', date: '2017-06-22', action: 'For D\'Angelo Russell, Mozgov', teamFrom: 'BKN', teamTo: 'LAL', verified: true },
    { event: 'Signed with MIL', date: '2018-07-02', action: 'Free agent signing', teamFrom: 'LAL', teamTo: 'MIL', verified: true }
  ],
  
  'Malcolm Brogdon': [
    { event: 'Drafted #36 by MIL', date: '2016-06-23', action: 'Round 2, Pick #36', teamTo: 'MIL', verified: true },
    { event: 'Signed with IND', date: '2019-07-01', action: 'Restricted free agent offer sheet matched', teamFrom: 'MIL', teamTo: 'IND', verified: true },
    { event: 'Traded to BOS', date: '2022-07-08', action: 'For Aaron Nesmith, Daniel Theis, 2023 1st', teamFrom: 'IND', teamTo: 'BOS', verified: true },
    { event: 'Traded to POR', date: '2023-10-01', action: 'In Jrue Holiday-Damian Lillard 3-team deal', teamFrom: 'BOS', teamTo: 'POR', verified: true },
    { event: 'Traded to WAS', date: '2024-06-20', action: 'For Deni Avdija, 2029 1st', teamFrom: 'POR', teamTo: 'WAS', verified: true }
  ],
  
  'Dennis Schroder': [
    { event: 'Drafted #17 by ATL', date: '2013-06-27', action: 'Round 1, Pick #17', teamTo: 'ATL', verified: true },
    { event: 'Traded to OKC', date: '2018-07-25', action: 'For Carmelo Anthony', teamFrom: 'ATL', teamTo: 'OKC', verified: true },
    { event: 'Traded to LAL', date: '2020-11-16', action: 'For Danny Green, 2020 1st', teamFrom: 'OKC', teamTo: 'LAL', verified: true },
    { event: 'Signed with BOS', date: '2021-09-10', action: 'Free agent signing', teamFrom: 'LAL', teamTo: 'BOS', verified: true },
    { event: 'Traded to HOU', date: '2022-02-10', action: 'For Daniel Theis', teamFrom: 'BOS', teamTo: 'HOU', verified: true },
    { event: 'Signed with LAL', date: '2022-09-16', action: 'Free agent signing', teamFrom: 'HOU', teamTo: 'LAL', verified: true },
    { event: 'Traded to TOR', date: '2023-02-09', action: 'For picks', teamFrom: 'LAL', teamTo: 'TOR', verified: true },
    { event: 'Signed with BKN', date: '2024-07-06', action: 'Free agent signing', teamFrom: 'TOR', teamTo: 'BKN', verified: true }
  ],
  
  'Spencer Dinwiddie': [
    { event: 'Drafted #38 by DET', date: '2014-06-26', action: 'Round 2, Pick #38', teamTo: 'DET', verified: true },
    { event: 'Signed with BKN', date: '2016-12-08', action: 'Waived by DET, signed with BKN', teamFrom: 'DET', teamTo: 'BKN', verified: true },
    { event: 'Sign-and-trade to WAS', date: '2021-08-11', action: 'For picks', teamFrom: 'BKN', teamTo: 'WAS', verified: true },
    { event: 'Traded to DAL', date: '2022-02-10', action: 'For Kristaps Porzingis package', teamFrom: 'WAS', teamTo: 'DAL', verified: true },
    { event: 'Traded to BKN', date: '2023-02-06', action: 'For Kyrie Irving', teamFrom: 'DAL', teamTo: 'BKN', verified: true },
    { event: 'Traded to TOR', date: '2023-07-06', action: 'For OG Anunoby package', teamFrom: 'BKN', teamTo: 'TOR', verified: true },
    { event: 'Traded to LAL', date: '2024-02-08', action: 'For picks', teamFrom: 'TOR', teamTo: 'LAL', verified: true }
  ],
  
  'Dorian Finney-Smith': [
    { event: 'Undrafted 2016', date: '2016-07-14', action: 'Signed with DAL as UDFA', teamTo: 'DAL', verified: true },
    { event: 'Traded to BKN', date: '2023-02-06', action: 'For Kyrie Irving', teamFrom: 'DAL', teamTo: 'BKN', verified: true },
    { event: 'Traded to LAL', date: '2024-12-29', action: 'For D\'Angelo Russell', teamFrom: 'BKN', teamTo: 'LAL', verified: true }
  ],
  
  'Eric Gordon': [
    { event: 'Drafted #7 by LAC', date: '2008-06-26', action: 'Round 1, Pick #7', teamTo: 'LAC', verified: true },
    { event: 'Traded to NOP', date: '2011-12-14', action: 'In Chris Paul trade', teamFrom: 'LAC', teamTo: 'NOP', verified: true },
    { event: 'Signed with HOU', date: '2016-07-01', action: 'Free agent signing', teamFrom: 'NOP', teamTo: 'HOU', verified: true },
    { event: 'Traded to PHX', date: '2023-09-27', action: 'In Damian Lillard 3-team deal', teamFrom: 'HOU', teamTo: 'PHX', verified: true }
  ],
  
  'Deandre Ayton': [
    { event: 'Drafted #1 by PHX', date: '2018-06-21', action: 'Round 1, Pick #1', teamTo: 'PHX', verified: true },
    { event: 'Sign-and-trade to IND', date: '2022-07-14', action: 'For multiple assets', teamFrom: 'PHX', teamTo: 'IND', verified: true },
    { event: 'Traded to POR', date: '2023-09-27', action: 'In Damian Lillard 3-team deal', teamFrom: 'IND', teamTo: 'POR', verified: true }
  ],
  
  'Terry Rozier': [
    { event: 'Drafted #16 by BOS', date: '2015-06-25', action: 'Round 1, Pick #16', teamTo: 'BOS', verified: true },
    { event: 'Sign-and-trade to CHA', date: '2019-07-09', action: 'For Kemba Walker', teamFrom: 'BOS', teamTo: 'CHA', verified: true },
    { event: 'Traded to MIA', date: '2024-02-08', action: 'For Kyle Lowry, picks', teamFrom: 'CHA', teamTo: 'MIA', verified: true }
  ],
  
  'Kyle Lowry': [
    { event: 'Drafted #24 by MEM', date: '2006-06-28', action: 'Round 1, Pick #24', teamTo: 'MEM', verified: true },
    { event: 'Traded to HOU', date: '2009-07-09', action: 'For future considerations', teamFrom: 'MEM', teamTo: 'HOU', verified: true },
    { event: 'Traded to TOR', date: '2012-07-11', action: 'For Gary Forbes, 2013 1st', teamFrom: 'HOU', teamTo: 'TOR', verified: true },
    { event: 'Sign-and-trade to MIA', date: '2021-08-06', action: 'For Goran Dragic, Precious Achiuwa', teamFrom: 'TOR', teamTo: 'MIA', verified: true },
    { event: 'Traded to CHA', date: '2024-02-08', action: 'For Terry Rozier package', teamFrom: 'MIA', teamTo: 'CHA', verified: true }
  ],
  
  'Clint Capela': [
    { event: 'Drafted #25 by HOU', date: '2014-06-26', action: 'Round 1, Pick #25', teamTo: 'HOU', verified: true },
    { event: 'Traded to ATL', date: '2020-02-05', action: 'In 4-team deal for Robert Covington', teamFrom: 'HOU', teamTo: 'ATL', verified: true }
  ],
  
  'Robert Covington': [
    { event: 'Undrafted 2013', date: '2013-09-02', action: 'Signed with CLE', teamTo: 'CLE', verified: true },
    { event: 'Signed with PHI', date: '2014-11-15', action: 'After D-League stint', teamFrom: 'CLE', teamTo: 'PHI', verified: true },
    { event: 'Traded to MIN', date: '2018-11-12', action: 'For Jimmy Butler', teamFrom: 'PHI', teamTo: 'MIN', verified: true },
    { event: 'Traded to HOU', date: '2020-02-05', action: 'In 4-team deal', teamFrom: 'MIN', teamTo: 'HOU', verified: true },
    { event: 'Traded to POR', date: '2020-11-18', action: 'For Trevor Ariza, picks', teamFrom: 'HOU', teamTo: 'POR', verified: true },
    { event: 'Traded to LAC', date: '2022-02-04', action: 'For Norman Powell, Keon Johnson', teamFrom: 'POR', teamTo: 'LAC', verified: true },
    { event: 'Traded to PHI', date: '2023-10-31', action: 'In James Harden deal', teamFrom: 'LAC', teamTo: 'PHI', verified: true }
  ],
  
  'Montrezl Harrell': [
    { event: 'Drafted #32 by HOU', date: '2015-06-25', action: 'Round 2, Pick #32', teamTo: 'HOU', verified: true },
    { event: 'Traded to LAC', date: '2017-06-28', action: 'In Chris Paul trade', teamFrom: 'HOU', teamTo: 'LAC', verified: true },
    { event: 'Signed with LAL', date: '2020-11-24', action: 'Free agent signing', teamFrom: 'LAC', teamTo: 'LAL', verified: true },
    { event: 'Traded to WAS', date: '2021-07-29', action: 'In Russell Westbrook trade', teamFrom: 'LAL', teamTo: 'WAS', verified: true },
    { event: 'Traded to CHA', date: '2022-02-10', action: 'For Ish Smith, Vernon Carey Jr.', teamFrom: 'WAS', teamTo: 'CHA', verified: true },
    { event: 'Signed with PHI', date: '2022-10-17', action: 'Free agent signing', teamFrom: 'CHA', teamTo: 'PHI', verified: true }
  ],
  
  'Kyle Kuzma': [
    { event: 'Drafted #27 by BKN', date: '2017-06-22', action: 'Round 1, Pick #27', teamTo: 'BKN', verified: true },
    { event: 'Draft night trade to LAL', date: '2017-06-22', action: 'For D\'Angelo Russell package', teamFrom: 'BKN', teamTo: 'LAL', verified: true },
    { event: 'Traded to WAS', date: '2021-07-29', action: 'In Russell Westbrook trade', teamFrom: 'LAL', teamTo: 'WAS', verified: true }
  ],
  
  'Kentavious Caldwell-Pope': [
    { event: 'Drafted #8 by DET', date: '2013-06-27', action: 'Round 1, Pick #8', teamTo: 'DET', verified: true },
    { event: 'Signed with LAL', date: '2017-07-14', action: 'Free agent signing', teamFrom: 'DET', teamTo: 'LAL', verified: true },
    { event: 'Traded to WAS', date: '2021-07-29', action: 'In Russell Westbrook trade', teamFrom: 'LAL', teamTo: 'WAS', verified: true },
    { event: 'Traded to DEN', date: '2023-06-22', action: 'For Monte Morris, Will Barton', teamFrom: 'WAS', teamTo: 'DEN', verified: true },
    { event: 'Signed with ORL', date: '2024-07-03', action: 'Free agent signing', teamFrom: 'DEN', teamTo: 'ORL', verified: true }
  ],
  
  'Tyrese Haliburton': [
    { event: 'Drafted #12 by SAC', date: '2020-11-18', action: 'Round 1, Pick #12', teamTo: 'SAC', verified: true },
    { event: 'Traded to IND', date: '2022-02-08', action: 'For Domantas Sabonis, Buddy Hield', teamFrom: 'SAC', teamTo: 'IND', verified: true }
  ],
  
  'Buddy Hield': [
    { event: 'Drafted #6 by NOP', date: '2016-06-23', action: 'Round 1, Pick #6', teamTo: 'NOP', verified: true },
    { event: 'Traded to SAC', date: '2017-02-20', action: 'For DeMarcus Cousins', teamFrom: 'NOP', teamTo: 'SAC', verified: true },
    { event: 'Traded to IND', date: '2022-02-08', action: 'For Domantas Sabonis, Tyrese Haliburton', teamFrom: 'SAC', teamTo: 'IND', verified: true },
    { event: 'Traded to PHI', date: '2024-02-08', action: 'For Marcus Morris, picks', teamFrom: 'IND', teamTo: 'PHI', verified: true },
    { event: 'Signed with GSW', date: '2024-07-09', action: 'Free agent signing', teamFrom: 'PHI', teamTo: 'GSW', verified: true }
  ],
  
  'Bogdan Bogdanovic': [
    { event: 'Drafted #27 by PHX', date: '2014-06-26', action: 'Round 1, Pick #27', teamTo: 'PHX', verified: true },
    { event: 'Traded to SAC', date: '2016-02-18', action: 'For draft rights', teamFrom: 'PHX', teamTo: 'SAC', verified: true },
    { event: 'Sign-and-trade to ATL', date: '2020-11-25', action: 'For future 2nd', teamFrom: 'SAC', teamTo: 'ATL', verified: true }
  ],
  
  'Robert Williams III': [
    { event: 'Drafted #27 by BOS', date: '2018-06-21', action: 'Round 1, Pick #27', teamTo: 'BOS', verified: true },
    { event: 'Traded to POR', date: '2023-10-01', action: 'In Jrue Holiday 3-team deal', teamFrom: 'BOS', teamTo: 'POR', verified: true }
  ],
  
  'Larry Nance Jr.': [
    { event: 'Drafted #27 by LAL', date: '2015-06-25', action: 'Round 1, Pick #27', teamTo: 'LAL', verified: true },
    { event: 'Traded to CLE', date: '2018-02-08', action: 'For IT, Channing Frye, 1st', teamFrom: 'LAL', teamTo: 'CLE', verified: true },
    { event: 'Traded to POR', date: '2021-03-25', action: 'For 2 future 2nds', teamFrom: 'CLE', teamTo: 'POR', verified: true },
    { event: 'Signed with NOP', date: '2022-07-09', action: 'Free agent signing', teamFrom: 'POR', teamTo: 'NOP', verified: true },
    { event: 'Traded to ATL', date: '2024-07-06', action: 'In Dejounte Murray trade', teamFrom: 'NOP', teamTo: 'ATL', verified: true }
  ],
  
  'Norman Powell': [
    { event: 'Drafted #46 by MIL', date: '2015-06-25', action: 'Round 2, Pick #46', teamTo: 'MIL', verified: true },
    { event: 'Traded to TOR', date: '2015-06-25', action: 'Draft night trade for Greivis Vasquez', teamFrom: 'MIL', teamTo: 'TOR', verified: true },
    { event: 'Traded to POR', date: '2021-03-25', action: 'For Gary Trent Jr., Rodney Hood', teamFrom: 'TOR', teamTo: 'POR', verified: true },
    { event: 'Traded to LAC', date: '2022-02-04', action: 'For Robert Covington, Keon Johnson', teamFrom: 'POR', teamTo: 'LAC', verified: true }
  ],
  
  'Gary Trent Jr.': [
    { event: 'Drafted #37 by SAC', date: '2018-06-21', action: 'Round 2, Pick #37', teamTo: 'SAC', verified: true },
    { event: 'Traded to POR', date: '2018-06-21', action: 'Draft night trade', teamFrom: 'SAC', teamTo: 'POR', verified: true },
    { event: 'Traded to TOR', date: '2021-03-25', action: 'For Norman Powell, Rodney Hood', teamFrom: 'POR', teamTo: 'TOR', verified: true },
    { event: 'Signed with MIL', date: '2024-07-06', action: 'Free agent signing', teamFrom: 'TOR', teamTo: 'MIL', verified: true }
  ],
  
  'Marcus Morris Sr.': [
    { event: 'Drafted #14 by HOU', date: '2011-06-23', action: 'Round 1, Pick #14', teamTo: 'HOU', verified: true },
    { event: 'Traded to PHX', date: '2012-07-12', action: 'For Luis Scola', teamFrom: 'HOU', teamTo: 'PHX', verified: true },
    { event: 'Traded to DET', date: '2015-07-09', action: 'For Reggie Bullock, draft picks', teamFrom: 'PHX', teamTo: 'DET', verified: true },
    { event: 'Signed with BOS', date: '2017-07-01', action: 'Free agent signing', teamFrom: 'DET', teamTo: 'BOS', verified: true },
    { event: 'Traded to NYK', date: '2019-07-11', action: 'For picks', teamFrom: 'BOS', teamTo: 'NYK', verified: true },
    { event: 'Traded to LAC', date: '2020-02-06', action: 'For Moe Harkless, future 1st', teamFrom: 'NYK', teamTo: 'LAC', verified: true },
    { event: 'Traded to PHI', date: '2023-10-31', action: 'In James Harden deal', teamFrom: 'LAC', teamTo: 'PHI', verified: true }
  ],
  
  'Seth Curry': [
    { event: 'Drafted #44 by PHX', date: '2013-06-27', action: 'Round 2, Pick #44 (traded to CLE)', teamTo: 'CLE', verified: true },
    { event: 'Signed with SAC', date: '2015-03-04', action: 'After D-League stints', teamFrom: 'CLE', teamTo: 'SAC', verified: true },
    { event: 'Signed with DAL', date: '2016-07-01', action: 'Free agent signing', teamFrom: 'SAC', teamTo: 'DAL', verified: true },
    { event: 'Traded to POR', date: '2018-07-09', action: 'Sign-and-trade', teamFrom: 'DAL', teamTo: 'POR', verified: true },
    { event: 'Signed with DAL', date: '2019-07-06', action: 'Free agent signing', teamFrom: 'POR', teamTo: 'DAL', verified: true },
    { event: 'Traded to PHI', date: '2020-11-18', action: 'For Josh Richardson', teamFrom: 'DAL', teamTo: 'PHI', verified: true },
    { event: 'Traded to BKN', date: '2022-02-10', action: 'In Ben Simmons trade', teamFrom: 'PHI', teamTo: 'BKN', verified: true },
    { event: 'Traded to DAL', date: '2023-02-06', action: 'For TJ Warren', teamFrom: 'BKN', teamTo: 'DAL', verified: true },
    { event: 'Traded to CHA', date: '2024-02-08', action: 'For PJ Washington package', teamFrom: 'DAL', teamTo: 'CHA', verified: true }
  ],
  
  'Donte DiVincenzo': [
    { event: 'Drafted #17 by MIL', date: '2018-06-21', action: 'Round 1, Pick #17', teamTo: 'MIL', verified: true },
    { event: 'Traded to SAC', date: '2022-07-01', action: 'Sign-and-trade for Davion Mitchell', teamFrom: 'MIL', teamTo: 'SAC', verified: true },
    { event: 'Traded to NYK', date: '2023-02-09', action: 'For 2023 2nd', teamFrom: 'SAC', teamTo: 'NYK', verified: true },
    { event: 'Traded to MIN', date: '2024-09-28', action: 'In Karl-Anthony Towns trade', teamFrom: 'NYK', teamTo: 'MIN', verified: true }
  ],
  
  'Kelly Oubre Jr.': [
    { event: 'Drafted #15 by ATL', date: '2015-06-25', action: 'Round 1, Pick #15', teamTo: 'ATL', verified: true },
    { event: 'Draft night trade to WAS', date: '2015-06-25', action: 'For future pick', teamFrom: 'ATL', teamTo: 'WAS', verified: true },
    { event: 'Traded to PHX', date: '2018-12-17', action: 'For Austin Rivers', teamFrom: 'WAS', teamTo: 'PHX', verified: true },
    { event: 'Traded to OKC', date: '2020-11-16', action: 'In Chris Paul trade', teamFrom: 'PHX', teamTo: 'OKC', verified: true },
    { event: 'Traded to GSW', date: '2020-11-18', action: 'For 2021 1st', teamFrom: 'OKC', teamTo: 'GSW', verified: true },
    { event: 'Signed with CHA', date: '2021-08-06', action: 'Free agent signing', teamFrom: 'GSW', teamTo: 'CHA', verified: true },
    { event: 'Traded to PHI', date: '2024-02-08', action: 'For TJ McConnell, picks', teamFrom: 'CHA', teamTo: 'PHI', verified: true }
  ],
  
  'Nic Claxton': [
    { event: 'Drafted #31 by BKN', date: '2019-06-20', action: 'Round 2, Pick #31', teamTo: 'BKN', verified: true }
  ],
  
  'Anfernee Simons': [
    { event: 'Drafted #24 by POR', date: '2018-06-21', action: 'Round 1, Pick #24', teamTo: 'POR', verified: true }
  ],
  
  'Immanuel Quickley': [
    { event: 'Drafted #25 by OKC', date: '2020-11-18', action: 'Round 1, Pick #25', teamTo: 'OKC', verified: true },
    { event: 'Draft night trade to NYK', date: '2020-11-18', action: 'For future picks', teamFrom: 'OKC', teamTo: 'NYK', verified: true },
    { event: 'Traded to TOR', date: '2023-12-30', action: 'In OG Anunoby trade', teamFrom: 'NYK', teamTo: 'TOR', verified: true }
  ],
  
  'Naz Reid': [
    { event: 'Undrafted 2019', date: '2019-07-12', action: 'Signed with MIN as UDFA', teamTo: 'MIN', verified: true }
  ],
  
  'Mike Conley': [
    { event: 'Drafted #4 by MEM', date: '2007-06-28', action: 'Round 1, Pick #4', teamTo: 'MEM', verified: true },
    { event: 'Traded to UTA', date: '2019-07-06', action: 'For Grayson Allen, Jae Crowder, Kyle Korver, picks', teamFrom: 'MEM', teamTo: 'UTA', verified: true },
    { event: 'Traded to MIN', date: '2023-02-09', action: 'For Leandro Bolmaro, 2025 1st', teamFrom: 'UTA', teamTo: 'MIN', verified: true }
  ],
  
  'Jordan Clarkson': [
    { event: 'Drafted #46 by WAS', date: '2014-06-26', action: 'Round 2, Pick #46', teamTo: 'WAS', verified: true },
    { event: 'Draft night trade to LAL', date: '2014-06-26', action: 'For cash considerations', teamFrom: 'WAS', teamTo: 'LAL', verified: true },
    { event: 'Traded to CLE', date: '2018-02-08', action: 'For IT, Channing Frye, Nance, pick', teamFrom: 'LAL', teamTo: 'CLE', verified: true },
    { event: 'Traded to UTA', date: '2019-12-24', action: 'For Dante Exum, picks', teamFrom: 'CLE', teamTo: 'UTA', verified: true }
  ],
  
  'Kelly Olynyk': [
    { event: 'Drafted #13 by DAL', date: '2013-06-27', action: 'Round 1, Pick #13', teamTo: 'DAL', verified: true },
    { event: 'Draft night trade to BOS', date: '2013-06-27', action: 'For 2014 1st, Jared Cunningham', teamFrom: 'DAL', teamTo: 'BOS', verified: true },
    { event: 'Signed with MIA', date: '2017-07-06', action: 'Free agent signing', teamFrom: 'BOS', teamTo: 'MIA', verified: true },
    { event: 'Traded to HOU', date: '2021-03-25', action: 'For Victor Oladipo', teamFrom: 'MIA', teamTo: 'HOU', verified: true },
    { event: 'Traded to DET', date: '2021-07-30', action: 'For draft pick', teamFrom: 'HOU', teamTo: 'DET', verified: true },
    { event: 'Signed with TOR', date: '2024-07-01', action: 'Free agent signing', teamFrom: 'DET', teamTo: 'TOR', verified: true }
  ],
  
  'Grant Williams': [
    { event: 'Drafted #22 by BOS', date: '2019-06-20', action: 'Round 1, Pick #22', teamTo: 'BOS', verified: true },
    { event: 'Signed with DAL', date: '2023-07-01', action: 'Free agent signing', teamFrom: 'BOS', teamTo: 'DAL', verified: true },
    { event: 'Traded to CHA', date: '2024-02-08', action: 'For PJ Washington package', teamFrom: 'DAL', teamTo: 'CHA', verified: true }
  ],
  
  'Andre Drummond': [
    { event: 'Drafted #9 by DET', date: '2012-06-28', action: 'Round 1, Pick #9', teamTo: 'DET', verified: true },
    { event: 'Traded to CLE', date: '2020-02-06', action: 'For John Henson, Brandon Knight, pick', teamFrom: 'DET', teamTo: 'CLE', verified: true },
    { event: 'Signed with LAL', date: '2021-03-28', action: 'After CLE buyout', teamFrom: 'CLE', teamTo: 'LAL', verified: true },
    { event: 'Signed with PHI', date: '2021-08-16', action: 'Free agent signing', teamFrom: 'LAL', teamTo: 'PHI', verified: true },
    { event: 'Traded to BKN', date: '2022-02-10', action: 'In Ben Simmons trade', teamFrom: 'PHI', teamTo: 'BKN', verified: true },
    { event: 'Signed with CHI', date: '2022-09-01', action: 'Free agent signing', teamFrom: 'BKN', teamTo: 'CHI', verified: true },
    { event: 'Traded to PHI', date: '2024-02-08', action: 'For Mo Bamba', teamFrom: 'CHI', teamTo: 'PHI', verified: true }
  ],
  
  'Josh Richardson': [
    { event: 'Drafted #40 by MIA', date: '2015-06-25', action: 'Round 2, Pick #40', teamTo: 'MIA', verified: true },
    { event: 'Sign-and-trade to PHI', date: '2019-07-06', action: 'For Jimmy Butler', teamFrom: 'MIA', teamTo: 'PHI', verified: true },
    { event: 'Traded to DAL', date: '2020-11-18', action: 'For Seth Curry', teamFrom: 'PHI', teamTo: 'DAL', verified: true },
    { event: 'Traded to BOS', date: '2021-06-18', action: 'For Moses Brown, 2021 2nd', teamFrom: 'DAL', teamTo: 'BOS', verified: true },
    { event: 'Traded to SAS', date: '2022-02-10', action: 'In Derrick White trade', teamFrom: 'BOS', teamTo: 'SAS', verified: true },
    { event: 'Signed with NOP', date: '2023-07-01', action: 'Free agent signing', teamFrom: 'SAS', teamTo: 'NOP', verified: true }
  ],
  
  'Lonzo Ball': [
    { event: 'Drafted #2 by LAL', date: '2017-06-22', action: 'Round 1, Pick #2', teamTo: 'LAL', verified: true },
    { event: 'Traded to NOP', date: '2019-06-15', action: 'In Anthony Davis trade', teamFrom: 'LAL', teamTo: 'NOP', verified: true },
    { event: 'Sign-and-trade to CHI', date: '2021-08-07', action: 'For Garrett Temple, Tomas Satoransky, 2nd', teamFrom: 'NOP', teamTo: 'CHI', verified: true }
  ],
  
  'Tre Jones': [
    { event: 'Drafted #41 by SAS', date: '2020-11-18', action: 'Round 2, Pick #41', teamTo: 'SAS', verified: true }
  ],
  
  'Keldon Johnson': [
    { event: 'Drafted #29 by SAS', date: '2019-06-20', action: 'Round 1, Pick #29', teamTo: 'SAS', verified: true }
  ],
  
  'Trayce Jackson-Davis': [
    { event: 'Drafted #57 by GSW', date: '2023-06-22', action: 'Round 2, Pick #57', teamTo: 'GSW', verified: true }
  ],
  
  'Mark Williams': [
    { event: 'Drafted #15 by CHA', date: '2022-06-23', action: 'Round 1, Pick #15', teamTo: 'CHA', verified: true }
  ],
  
  'Tari Eason': [
    { event: 'Drafted #17 by HOU', date: '2022-06-23', action: 'Round 1, Pick #17', teamTo: 'HOU', verified: true }
  ],
  
  'Keyonte George': [
    { event: 'Drafted #16 by UTA', date: '2023-06-22', action: 'Round 1, Pick #16', teamTo: 'UTA', verified: true }
  ],
  
  'Austin Reaves': [
    { event: 'Undrafted 2021', date: '2021-08-03', action: 'Signed with LAL as UDFA', teamTo: 'LAL', verified: true }
  ],
  
  'Brandin Podziemski': [
    { event: 'Drafted #19 by GSW', date: '2023-06-22', action: 'Round 1, Pick #19', teamTo: 'GSW', verified: true }
  ],
  
  'Cam Thomas': [
    { event: 'Drafted #27 by BKN', date: '2021-07-29', action: 'Round 1, Pick #27', teamTo: 'BKN', verified: true }
  ]
};

// Get team abbreviations
const teams = {};
db.prepare('SELECT id, abbreviation FROM teams').all().forEach(t => teams[t.abbreviation] = t.id);

let updated = 0;
let inserted = 0;
let failed = [];

db.exec('BEGIN TRANSACTION');

for (const [playerName, chainData] of Object.entries(playerChains)) {
  const player = db.prepare('SELECT id FROM players WHERE name = ?').get(playerName);
  if (!player) {
    failed.push(playerName);
    continue;
  }
  
  const chainJson = JSON.stringify(chainData);
  const now = new Date().toISOString();
  
  // Use verified_transactions table
  const existing = db.prepare('SELECT id FROM verified_transactions WHERE player_id = ?').get(player.id);
  
  if (existing) {
    db.prepare('UPDATE verified_transactions SET chain_json = ?, last_updated = ? WHERE player_id = ?').run(chainJson, now, player.id);
    updated++;
  } else {
    db.prepare('INSERT INTO verified_transactions (player_id, chain_json, source, last_updated) VALUES (?, ?, ?, ?)').run(player.id, chainJson, 'web_search', now);
    inserted++;
  }
}

db.exec('COMMIT');

console.log('=== Batch 2 Complete ===');
console.log('Updated:', updated);
console.log('Inserted:', inserted);
console.log('Failed:', failed.length, failed.join(', '));

// Total count
const total = db.prepare('SELECT COUNT(*) as count FROM verified_transactions').get();
console.log('\nTotal verified players:', total.count);

db.close();
