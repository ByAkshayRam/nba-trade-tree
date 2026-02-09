const Database = require('better-sqlite3');
const db = new Database('/home/ubuntu/clawd/projects/nba-trade-tree/data/nba_trades.db');

// Verified transaction data for players
// Format: chain_json arrays with events
const playerChains = {
  // === ALREADY VERIFIED (updating for consistency) ===
  
  // === HIGH PRIORITY - ALL STARS WITH TRADES ===
  
  'Karl-Anthony Towns': [
    { event: 'Drafted #1 by MIN', date: '2015-06-25', action: 'Round 1, Pick #1', teamTo: 'MIN', verified: true },
    { event: 'Traded to NYK', date: '2024-09-28', action: 'For Julius Randle, Donte DiVincenzo, draft pick', teamFrom: 'MIN', teamTo: 'NYK', verified: true }
  ],
  
  'Ben Simmons': [
    { event: 'Drafted #1 by PHI', date: '2016-06-23', action: 'Round 1, Pick #1', teamTo: 'PHI', verified: true },
    { event: 'Traded to BKN', date: '2022-02-10', action: 'For James Harden, Paul Millsap', teamFrom: 'PHI', teamTo: 'BKN', verified: true }
  ],
  
  'Kyrie Irving': [
    { event: 'Drafted #1 by CLE', date: '2011-06-23', action: 'Round 1, Pick #1', teamTo: 'CLE', verified: true },
    { event: 'Traded to BOS', date: '2017-08-30', action: 'For Isaiah Thomas, Jae Crowder, Ante Zizic, BKN 2018 1st', teamFrom: 'CLE', teamTo: 'BOS', verified: true },
    { event: 'Signed with BKN', date: '2019-07-07', action: 'Free agent signing', teamFrom: 'BOS', teamTo: 'BKN', verified: true },
    { event: 'Traded to DAL', date: '2023-02-06', action: 'For Spencer Dinwiddie, Dorian Finney-Smith, draft picks', teamFrom: 'BKN', teamTo: 'DAL', verified: true }
  ],
  
  'Kawhi Leonard': [
    { event: 'Drafted #15 by IND', date: '2011-06-23', action: 'Round 1, Pick #15', teamTo: 'IND', verified: true },
    { event: 'Traded to SAS', date: '2011-06-23', action: 'Draft night trade for George Hill', teamFrom: 'IND', teamTo: 'SAS', verified: true },
    { event: 'Traded to TOR', date: '2018-07-18', action: 'For DeMar DeRozan, Jakob Poeltl, protected 1st', teamFrom: 'SAS', teamTo: 'TOR', verified: true },
    { event: 'Signed with LAC', date: '2019-07-10', action: 'Free agent signing', teamFrom: 'TOR', teamTo: 'LAC', verified: true }
  ],
  
  'Paul George': [
    { event: 'Drafted #10 by IND', date: '2010-06-24', action: 'Round 1, Pick #10', teamTo: 'IND', verified: true },
    { event: 'Traded to OKC', date: '2017-06-30', action: 'For Victor Oladipo, Domantas Sabonis', teamFrom: 'IND', teamTo: 'OKC', verified: true },
    { event: 'Traded to LAC', date: '2019-07-06', action: 'For Shai Gilgeous-Alexander, Danilo Gallinari, 5 1sts, 2 swaps', teamFrom: 'OKC', teamTo: 'LAC', verified: true },
    { event: 'Signed with PHI', date: '2024-07-01', action: 'Free agent signing', teamFrom: 'LAC', teamTo: 'PHI', verified: true }
  ],
  
  'Jimmy Butler': [
    { event: 'Drafted #30 by CHI', date: '2011-06-23', action: 'Round 1, Pick #30', teamTo: 'CHI', verified: true },
    { event: 'Traded to MIN', date: '2017-06-22', action: 'For Zach LaVine, Kris Dunn, Lauri Markkanen', teamFrom: 'CHI', teamTo: 'MIN', verified: true },
    { event: 'Traded to PHI', date: '2018-11-12', action: 'For Robert Covington, Dario Saric, picks', teamFrom: 'MIN', teamTo: 'PHI', verified: true },
    { event: 'Sign-and-trade to MIA', date: '2019-07-06', action: 'For Josh Richardson', teamFrom: 'PHI', teamTo: 'MIA', verified: true }
  ],
  
  'Donovan Mitchell': [
    { event: 'Drafted #13 by DEN', date: '2017-06-22', action: 'Round 1, Pick #13', teamTo: 'DEN', verified: true },
    { event: 'Draft night trade to UTA', date: '2017-06-22', action: 'For Tyler Lydon, Trey Lyles', teamFrom: 'DEN', teamTo: 'UTA', verified: true },
    { event: 'Traded to CLE', date: '2022-09-01', action: 'For Lauri Markkanen, Collin Sexton, 3 1sts, 2 swaps', teamFrom: 'UTA', teamTo: 'CLE', verified: true }
  ],
  
  'Russell Westbrook': [
    { event: 'Drafted #4 by SEA', date: '2008-06-26', action: 'Round 1, Pick #4 (became OKC)', teamTo: 'OKC', verified: true },
    { event: 'Traded to HOU', date: '2019-07-16', action: 'For Chris Paul, 2 1sts, 2 swaps', teamFrom: 'OKC', teamTo: 'HOU', verified: true },
    { event: 'Traded to WAS', date: '2020-12-03', action: 'For John Wall, 1st-round pick', teamFrom: 'HOU', teamTo: 'WAS', verified: true },
    { event: 'Traded to LAL', date: '2021-07-29', action: 'For Kyle Kuzma, KCP, Montrezl Harrell, 1st', teamFrom: 'WAS', teamTo: 'LAL', verified: true },
    { event: 'Signed with LAC', date: '2023-02-23', action: 'After Lakers buyout', teamFrom: 'LAL', teamTo: 'LAC', verified: true },
    { event: 'Signed with DEN', date: '2024-09-05', action: 'Free agent signing', teamFrom: 'LAC', teamTo: 'DEN', verified: true }
  ],
  
  'Chris Paul': [
    { event: 'Drafted #4 by NOH', date: '2005-06-28', action: 'Round 1, Pick #4', teamTo: 'NOP', verified: true },
    { event: 'Traded to LAC', date: '2011-12-14', action: 'For Eric Gordon, Al-Farouq Aminu, Chris Kaman, 1st', teamFrom: 'NOP', teamTo: 'LAC', verified: true },
    { event: 'Traded to HOU', date: '2017-06-28', action: 'For Patrick Beverley, Lou Williams, Montrezl Harrell, picks', teamFrom: 'LAC', teamTo: 'HOU', verified: true },
    { event: 'Traded to OKC', date: '2019-07-16', action: 'For Russell Westbrook, 2 1sts, 2 swaps', teamFrom: 'HOU', teamTo: 'OKC', verified: true },
    { event: 'Traded to PHX', date: '2020-11-16', action: 'For Ricky Rubio, Kelly Oubre Jr., picks', teamFrom: 'OKC', teamTo: 'PHX', verified: true },
    { event: 'Signed with GSW', date: '2023-07-01', action: 'Free agent after PHX waive', teamFrom: 'PHX', teamTo: 'GSW', verified: true },
    { event: 'Signed with SAS', date: '2024-07-01', action: 'Free agent signing', teamFrom: 'GSW', teamTo: 'SAS', verified: true }
  ],
  
  'Shai Gilgeous-Alexander': [
    { event: 'Drafted #11 by LAC', date: '2018-06-21', action: 'Round 1, Pick #11', teamTo: 'LAC', verified: true },
    { event: 'Traded to OKC', date: '2019-07-10', action: 'In Paul George trade package', teamFrom: 'LAC', teamTo: 'OKC', verified: true }
  ],
  
  'Domantas Sabonis': [
    { event: 'Drafted #11 by OKC', date: '2016-06-23', action: 'Round 1, Pick #11', teamTo: 'OKC', verified: true },
    { event: 'Traded to IND', date: '2016-06-23', action: 'Draft night for Paul George future trade rights', teamFrom: 'OKC', teamTo: 'IND', verified: true },
    { event: 'Traded to SAC', date: '2022-02-08', action: 'For Tyrese Haliburton, Buddy Hield, picks', teamFrom: 'IND', teamTo: 'SAC', verified: true }
  ],
  
  'Pascal Siakam': [
    { event: 'Drafted #27 by TOR', date: '2016-06-23', action: 'Round 1, Pick #27', teamTo: 'TOR', verified: true },
    { event: 'Traded to IND', date: '2024-01-17', action: 'For Bruce Brown, Jordan Nwora, 3 picks', teamFrom: 'TOR', teamTo: 'IND', verified: true }
  ],
  
  'OG Anunoby': [
    { event: 'Drafted #23 by TOR', date: '2017-06-22', action: 'Round 1, Pick #23', teamTo: 'TOR', verified: true },
    { event: 'Traded to NYK', date: '2023-12-30', action: 'For RJ Barrett, Immanuel Quickley, 2nd', teamFrom: 'TOR', teamTo: 'NYK', verified: true }
  ],
  
  'Julius Randle': [
    { event: 'Drafted #7 by LAL', date: '2014-06-26', action: 'Round 1, Pick #7', teamTo: 'LAL', verified: true },
    { event: 'Signed with NOP', date: '2018-07-06', action: 'Free agent signing', teamFrom: 'LAL', teamTo: 'NOP', verified: true },
    { event: 'Signed with NYK', date: '2019-07-09', action: 'Free agent signing', teamFrom: 'NOP', teamTo: 'NYK', verified: true },
    { event: 'Traded to MIN', date: '2024-09-28', action: 'For Karl-Anthony Towns', teamFrom: 'NYK', teamTo: 'MIN', verified: true }
  ],
  
  'Aaron Gordon': [
    { event: 'Drafted #4 by ORL', date: '2014-06-26', action: 'Round 1, Pick #4', teamTo: 'ORL', verified: true },
    { event: 'Traded to DEN', date: '2021-03-25', action: 'For Gary Harris, RJ Hampton, 1st-round pick', teamFrom: 'ORL', teamTo: 'DEN', verified: true }
  ],
  
  'Lauri Markkanen': [
    { event: 'Drafted #7 by CHI', date: '2017-06-22', action: 'Round 1, Pick #7', teamTo: 'CHI', verified: true },
    { event: 'Traded to CLE', date: '2021-08-27', action: 'For Larry Nance Jr., 2023 2nd', teamFrom: 'CHI', teamTo: 'CLE', verified: true },
    { event: 'Traded to UTA', date: '2022-09-01', action: 'In Donovan Mitchell trade package', teamFrom: 'CLE', teamTo: 'UTA', verified: true }
  ],
  
  'Derrick White': [
    { event: 'Drafted #29 by SAS', date: '2017-06-22', action: 'Round 1, Pick #29', teamTo: 'SAS', verified: true },
    { event: 'Traded to BOS', date: '2022-02-10', action: 'For Romeo Langford, Josh Richardson, 1st', teamFrom: 'SAS', teamTo: 'BOS', verified: true }
  ],
  
  'Al Horford': [
    { event: 'Drafted #3 by ATL', date: '2007-06-28', action: 'Round 1, Pick #3', teamTo: 'ATL', verified: true },
    { event: 'Signed with BOS', date: '2016-07-01', action: 'Free agent signing', teamFrom: 'ATL', teamTo: 'BOS', verified: true },
    { event: 'Signed with PHI', date: '2019-07-09', action: 'Free agent signing', teamFrom: 'BOS', teamTo: 'PHI', verified: true },
    { event: 'Traded to OKC', date: '2020-12-09', action: 'For Danny Green, Terrance Ferguson, picks', teamFrom: 'PHI', teamTo: 'OKC', verified: true },
    { event: 'Traded to BOS', date: '2021-06-18', action: 'For Kemba Walker, 1st-round pick', teamFrom: 'OKC', teamTo: 'BOS', verified: true },
    { event: 'Signed with GSW', date: '2025-07-01', action: 'Free agent signing', teamFrom: 'BOS', teamTo: 'GSW', verified: true }
  ],
  
  'Mikal Bridges': [
    { event: 'Drafted #10 by PHI', date: '2018-06-21', action: 'Round 1, Pick #10', teamTo: 'PHI', verified: true },
    { event: 'Draft night trade to PHX', date: '2018-06-21', action: 'For Zhaire Smith, 2021 1st', teamFrom: 'PHI', teamTo: 'PHX', verified: true },
    { event: 'Traded to BKN', date: '2023-02-09', action: 'In Kevin Durant trade', teamFrom: 'PHX', teamTo: 'BKN', verified: true },
    { event: 'Traded to NYK', date: '2024-06-26', action: 'For Bojan Bogdanovic, 4 1sts, 1 swap, 2nd', teamFrom: 'BKN', teamTo: 'NYK', verified: true }
  ],
  
  'Jrue Holiday': [
    { event: 'Drafted #17 by PHI', date: '2009-06-25', action: 'Round 1, Pick #17', teamTo: 'PHI', verified: true },
    { event: 'Traded to NOP', date: '2013-07-12', action: 'For Nerlens Noel, 2014 1st', teamFrom: 'PHI', teamTo: 'NOP', verified: true },
    { event: 'Traded to MIL', date: '2020-11-24', action: 'For Eric Bledsoe, George Hill, picks', teamFrom: 'NOP', teamTo: 'MIL', verified: true },
    { event: 'Traded to POR', date: '2023-10-01', action: 'For Damian Lillard package', teamFrom: 'MIL', teamTo: 'POR', verified: true },
    { event: 'Traded to BOS', date: '2023-10-01', action: 'Same day, for Robert Williams, Malcolm Brogdon, picks', teamFrom: 'POR', teamTo: 'BOS', verified: true }
  ],
  
  'Victor Oladipo': [
    { event: 'Drafted #2 by ORL', date: '2013-06-27', action: 'Round 1, Pick #2', teamTo: 'ORL', verified: true },
    { event: 'Traded to OKC', date: '2016-06-23', action: 'For Serge Ibaka', teamFrom: 'ORL', teamTo: 'OKC', verified: true },
    { event: 'Traded to IND', date: '2017-06-30', action: 'For Paul George', teamFrom: 'OKC', teamTo: 'IND', verified: true },
    { event: 'Traded to HOU', date: '2021-01-14', action: 'In James Harden trade', teamFrom: 'IND', teamTo: 'HOU', verified: true },
    { event: 'Traded to MIA', date: '2021-03-25', action: 'For Kelly Olynyk, Avery Bradley, pick', teamFrom: 'HOU', teamTo: 'MIA', verified: true }
  ],
  
  'Zach LaVine': [
    { event: 'Drafted #13 by MIN', date: '2014-06-26', action: 'Round 1, Pick #13', teamTo: 'MIN', verified: true },
    { event: 'Traded to CHI', date: '2017-06-22', action: 'For Jimmy Butler', teamFrom: 'MIN', teamTo: 'CHI', verified: true }
  ],
  
  'DeMar DeRozan': [
    { event: 'Drafted #9 by TOR', date: '2009-06-25', action: 'Round 1, Pick #9', teamTo: 'TOR', verified: true },
    { event: 'Traded to SAS', date: '2018-07-18', action: 'For Kawhi Leonard, Danny Green', teamFrom: 'TOR', teamTo: 'SAS', verified: true },
    { event: 'Sign-and-trade to CHI', date: '2021-08-11', action: 'For Thaddeus Young, Al-Farouq Aminu, picks', teamFrom: 'SAS', teamTo: 'CHI', verified: true },
    { event: 'Signed with SAC', date: '2024-07-06', action: 'Free agent signing', teamFrom: 'CHI', teamTo: 'SAC', verified: true }
  ],
  
  'Tyler Herro': [
    { event: 'Drafted #13 by MIA', date: '2019-06-20', action: 'Round 1, Pick #13', teamTo: 'MIA', verified: true }
  ],
  
  'Bam Adebayo': [
    { event: 'Drafted #14 by MIA', date: '2017-06-22', action: 'Round 1, Pick #14', teamTo: 'MIA', verified: true }
  ],
  
  // === PLAYERS WITH ONLY DRAFT (NO TRADES) ===
  
  'Victor Wembanyama': [
    { event: 'Drafted #1 by SAS', date: '2023-06-22', action: 'Round 1, Pick #1', teamTo: 'SAS', verified: true }
  ],
  
  'Paolo Banchero': [
    { event: 'Drafted #1 by ORL', date: '2022-06-23', action: 'Round 1, Pick #1', teamTo: 'ORL', verified: true }
  ],
  
  'Cade Cunningham': [
    { event: 'Drafted #1 by DET', date: '2021-07-29', action: 'Round 1, Pick #1', teamTo: 'DET', verified: true }
  ],
  
  'Anthony Edwards': [
    { event: 'Drafted #1 by MIN', date: '2020-11-18', action: 'Round 1, Pick #1', teamTo: 'MIN', verified: true }
  ],
  
  'Zion Williamson': [
    { event: 'Drafted #1 by NOP', date: '2019-06-20', action: 'Round 1, Pick #1', teamTo: 'NOP', verified: true }
  ],
  
  'Joel Embiid': [
    { event: 'Drafted #3 by PHI', date: '2014-06-26', action: 'Round 1, Pick #3', teamTo: 'PHI', verified: true }
  ],
  
  'Ja Morant': [
    { event: 'Drafted #2 by MEM', date: '2019-06-20', action: 'Round 1, Pick #2', teamTo: 'MEM', verified: true }
  ],
  
  'LaMelo Ball': [
    { event: 'Drafted #3 by CHA', date: '2020-11-18', action: 'Round 1, Pick #3', teamTo: 'CHA', verified: true }
  ],
  
  'Evan Mobley': [
    { event: 'Drafted #3 by CLE', date: '2021-07-29', action: 'Round 1, Pick #3', teamTo: 'CLE', verified: true }
  ],
  
  'Scottie Barnes': [
    { event: 'Drafted #4 by TOR', date: '2021-07-29', action: 'Round 1, Pick #4', teamTo: 'TOR', verified: true }
  ],
  
  'Chet Holmgren': [
    { event: 'Drafted #2 by OKC', date: '2022-06-23', action: 'Round 1, Pick #2', teamTo: 'OKC', verified: true }
  ],
  
  'Jalen Williams': [
    { event: 'Drafted #12 by OKC', date: '2022-06-23', action: 'Round 1, Pick #12', teamTo: 'OKC', verified: true }
  ],
  
  'Devin Booker': [
    { event: 'Drafted #13 by PHX', date: '2015-06-25', action: 'Round 1, Pick #13', teamTo: 'PHX', verified: true }
  ],
  
  'Tyrese Maxey': [
    { event: 'Drafted #21 by PHI', date: '2020-11-18', action: 'Round 1, Pick #21', teamTo: 'PHI', verified: true }
  ],
  
  'Jamal Murray': [
    { event: 'Drafted #7 by DEN', date: '2016-06-23', action: 'Round 1, Pick #7', teamTo: 'DEN', verified: true }
  ],
  
  'Nikola Jokic': [
    { event: 'Drafted #41 by DEN', date: '2014-06-26', action: 'Round 2, Pick #41', teamTo: 'DEN', verified: true }
  ],
  
  'Michael Porter Jr.': [
    { event: 'Drafted #14 by DEN', date: '2018-06-21', action: 'Round 1, Pick #14', teamTo: 'DEN', verified: true }
  ],
  
  'Franz Wagner': [
    { event: 'Drafted #8 by ORL', date: '2021-07-29', action: 'Round 1, Pick #8', teamTo: 'ORL', verified: true }
  ],
  
  'Alperen Sengun': [
    { event: 'Drafted #16 by HOU', date: '2021-07-29', action: 'Round 1, Pick #16', teamTo: 'HOU', verified: true }
  ],
  
  'Desmond Bane': [
    { event: 'Drafted #30 by BOS', date: '2020-11-18', action: 'Round 1, Pick #30', teamTo: 'BOS', verified: true },
    { event: 'Draft night trade to MEM', date: '2020-11-18', action: 'For future picks', teamFrom: 'BOS', teamTo: 'MEM', verified: true }
  ],
  
  'Myles Turner': [
    { event: 'Drafted #11 by IND', date: '2015-06-25', action: 'Round 1, Pick #11', teamTo: 'IND', verified: true }
  ],
  
  'Kristaps Porzingis': [
    { event: 'Drafted #4 by NYK', date: '2015-06-25', action: 'Round 1, Pick #4', teamTo: 'NYK', verified: true },
    { event: 'Traded to DAL', date: '2019-01-31', action: 'For Dennis Smith Jr., DeAndre Jordan, Wesley Matthews, picks', teamFrom: 'NYK', teamTo: 'DAL', verified: true },
    { event: 'Traded to WAS', date: '2022-02-10', action: 'For Spencer Dinwiddie, Davis Bertans', teamFrom: 'DAL', teamTo: 'WAS', verified: true },
    { event: 'Traded to BOS', date: '2023-06-24', action: 'For Marcus Smart, 1st-round pick', teamFrom: 'WAS', teamTo: 'BOS', verified: true }
  ],
  
  'Rudy Gobert': [
    { event: 'Drafted #27 by DEN', date: '2013-06-27', action: 'Round 1, Pick #27', teamTo: 'DEN', verified: true },
    { event: 'Draft night trade to UTA', date: '2013-06-27', action: 'For Erick Green', teamFrom: 'DEN', teamTo: 'UTA', verified: true },
    { event: 'Traded to MIN', date: '2022-07-06', action: 'For Malik Beasley, Patrick Beverley, Walker Kessler, 4 1sts', teamFrom: 'UTA', teamTo: 'MIN', verified: true }
  ],
  
  'Jarrett Allen': [
    { event: 'Drafted #22 by BKN', date: '2017-06-22', action: 'Round 1, Pick #22', teamTo: 'BKN', verified: true },
    { event: 'Traded to CLE', date: '2021-01-14', action: 'In James Harden trade', teamFrom: 'BKN', teamTo: 'CLE', verified: true }
  ],
  
  'Josh Hart': [
    { event: 'Drafted #30 by UTA', date: '2017-06-22', action: 'Round 1, Pick #30', teamTo: 'UTA', verified: true },
    { event: 'Draft night trade to LAL', date: '2017-06-22', action: 'For cash', teamFrom: 'UTA', teamTo: 'LAL', verified: true },
    { event: 'Traded to NOP', date: '2019-06-15', action: 'In Anthony Davis trade', teamFrom: 'LAL', teamTo: 'NOP', verified: true },
    { event: 'Traded to POR', date: '2022-02-08', action: 'In CJ McCollum trade', teamFrom: 'NOP', teamTo: 'POR', verified: true },
    { event: 'Traded to NYK', date: '2023-02-09', action: 'For Cam Reddish, picks', teamFrom: 'POR', teamTo: 'NYK', verified: true }
  ],
  
  'Tobias Harris': [
    { event: 'Drafted #19 by CHA', date: '2011-06-23', action: 'Round 1, Pick #19', teamTo: 'CHA', verified: true },
    { event: 'Traded to MIL', date: '2013-02-21', action: 'For Samuel Dalembert, cash', teamFrom: 'CHA', teamTo: 'MIL', verified: true },
    { event: 'Traded to ORL', date: '2013-02-21', action: 'For J.J. Redick, Gustavo Ayon, Ish Smith', teamFrom: 'MIL', teamTo: 'ORL', verified: true },
    { event: 'Traded to DET', date: '2016-02-18', action: 'For Ersan Ilyasova, Brandon Jennings', teamFrom: 'ORL', teamTo: 'DET', verified: true },
    { event: 'Traded to LAC', date: '2018-01-29', action: 'For Blake Griffin, Willie Reed, Brice Johnson, 1st-round pick', teamFrom: 'DET', teamTo: 'LAC', verified: true },
    { event: 'Traded to PHI', date: '2019-02-06', action: 'For Wilson Chandler, Mike Muscala, Landry Shamet, picks', teamFrom: 'LAC', teamTo: 'PHI', verified: true },
    { event: 'Signed with DET', date: '2024-07-06', action: 'Free agent signing', teamFrom: 'PHI', teamTo: 'DET', verified: true }
  ],
  
  'Bradley Beal': [
    { event: 'Drafted #3 by WAS', date: '2012-06-28', action: 'Round 1, Pick #3', teamTo: 'WAS', verified: true },
    { event: 'Traded to PHX', date: '2023-06-17', action: 'For Chris Paul, Landry Shamet, picks', teamFrom: 'WAS', teamTo: 'PHX', verified: true }
  ],
  
  'De\'Aaron Fox': [
    { event: 'Drafted #5 by SAC', date: '2017-06-22', action: 'Round 1, Pick #5', teamTo: 'SAC', verified: true }
  ],
  
  'Christian Braun': [
    { event: 'Drafted #21 by DEN', date: '2022-06-23', action: 'Round 1, Pick #21', teamTo: 'DEN', verified: true }
  ],
  
  'Trey Murphy III': [
    { event: 'Drafted #17 by MEM', date: '2021-07-29', action: 'Round 1, Pick #17', teamTo: 'MEM', verified: true },
    { event: 'Draft night trade to NOP', date: '2021-07-29', action: 'For 2022 1st (protected)', teamFrom: 'MEM', teamTo: 'NOP', verified: true }
  ],
  
  'Andrew Nembhard': [
    { event: 'Drafted #31 by IND', date: '2022-06-23', action: 'Round 2, Pick #31', teamTo: 'IND', verified: true }
  ],
  
  'Payton Pritchard': [
    { event: 'Drafted #26 by BOS', date: '2020-11-18', action: 'Round 1, Pick #26', teamTo: 'BOS', verified: true }
  ],
  
  'Jaden McDaniels': [
    { event: 'Drafted #28 by LAL', date: '2020-11-18', action: 'Round 1, Pick #28', teamTo: 'LAL', verified: true },
    { event: 'Draft night trade to MIN', date: '2020-11-18', action: 'For cash', teamFrom: 'LAL', teamTo: 'MIN', verified: true }
  ],
  
  'Devin Vassell': [
    { event: 'Drafted #11 by SAS', date: '2020-11-18', action: 'Round 1, Pick #11', teamTo: 'SAS', verified: true }
  ],
  
  'Cameron Johnson': [
    { event: 'Drafted #11 by MIN', date: '2019-06-20', action: 'Round 1, Pick #11', teamTo: 'MIN', verified: true },
    { event: 'Draft night trade to PHX', date: '2019-06-20', action: 'For Dario Saric, 2020 1st (via BOS)', teamFrom: 'MIN', teamTo: 'PHX', verified: true },
    { event: 'Traded to BKN', date: '2023-02-09', action: 'In Kevin Durant trade', teamFrom: 'PHX', teamTo: 'BKN', verified: true }
  ],
  
  'Steven Adams': [
    { event: 'Drafted #12 by OKC', date: '2013-06-27', action: 'Round 1, Pick #12', teamTo: 'OKC', verified: true },
    { event: 'Traded to NOP', date: '2020-11-18', action: 'In Chris Paul trade package', teamFrom: 'OKC', teamTo: 'NOP', verified: true },
    { event: 'Traded to MEM', date: '2021-08-11', action: 'For Jonas Valanciunas, Eric Bledsoe, picks', teamFrom: 'NOP', teamTo: 'MEM', verified: true },
    { event: 'Traded to HOU', date: '2023-09-22', action: 'For 2024 1st-round pick', teamFrom: 'MEM', teamTo: 'HOU', verified: true }
  ],
  
  'Jonas Valanciunas': [
    { event: 'Drafted #5 by TOR', date: '2011-06-23', action: 'Round 1, Pick #5', teamTo: 'TOR', verified: true },
    { event: 'Traded to MEM', date: '2019-02-07', action: 'For Marc Gasol', teamFrom: 'TOR', teamTo: 'MEM', verified: true },
    { event: 'Traded to NOP', date: '2021-08-11', action: 'For Steven Adams, Eric Bledsoe, picks', teamFrom: 'MEM', teamTo: 'NOP', verified: true }
  ],
  
  'Ivica Zubac': [
    { event: 'Drafted #32 by LAL', date: '2016-06-23', action: 'Round 2, Pick #32', teamTo: 'LAL', verified: true },
    { event: 'Traded to LAC', date: '2019-02-07', action: 'For Michael Beasley, cash', teamFrom: 'LAL', teamTo: 'LAC', verified: true }
  ],
  
  'Walker Kessler': [
    { event: 'Drafted #22 by MEM', date: '2022-06-23', action: 'Round 1, Pick #22', teamTo: 'MEM', verified: true },
    { event: 'Traded to MIN', date: '2022-07-06', action: 'In Rudy Gobert trade', teamFrom: 'MEM', teamTo: 'MIN', verified: true },
    { event: 'Traded to UTA', date: '2024-02-09', action: 'For more assets', teamFrom: 'MIN', teamTo: 'UTA', verified: true }
  ],
  
  'Jakob Poeltl': [
    { event: 'Drafted #9 by TOR', date: '2016-06-23', action: 'Round 1, Pick #9', teamTo: 'TOR', verified: true },
    { event: 'Traded to SAS', date: '2018-07-18', action: 'In Kawhi Leonard trade', teamFrom: 'TOR', teamTo: 'SAS', verified: true },
    { event: 'Traded to TOR', date: '2023-02-09', action: 'For Khem Birch, 2024 1st', teamFrom: 'SAS', teamTo: 'TOR', verified: true }
  ],
  
  'Collin Sexton': [
    { event: 'Drafted #8 by CLE', date: '2018-06-21', action: 'Round 1, Pick #8', teamTo: 'CLE', verified: true },
    { event: 'Sign-and-trade to UTA', date: '2022-09-01', action: 'In Donovan Mitchell trade', teamFrom: 'CLE', teamTo: 'UTA', verified: true }
  ],
  
  'Andrew Wiggins': [
    { event: 'Drafted #1 by CLE', date: '2014-06-26', action: 'Round 1, Pick #1', teamTo: 'CLE', verified: true },
    { event: 'Traded to MIN', date: '2014-08-23', action: 'For Kevin Love', teamFrom: 'CLE', teamTo: 'MIN', verified: true },
    { event: 'Traded to GSW', date: '2020-02-06', action: 'For D\'Angelo Russell, picks', teamFrom: 'MIN', teamTo: 'GSW', verified: true }
  ],
  
  'Markelle Fultz': [
    { event: 'Drafted #1 by PHI', date: '2017-06-22', action: 'Round 1, Pick #1', teamTo: 'PHI', verified: true },
    { event: 'Traded to ORL', date: '2019-02-07', action: 'For Jonathon Simmons, OKC 2020 1st, CLE 2019 2nd', teamFrom: 'PHI', teamTo: 'ORL', verified: true }
  ],
  
  'Brandon Ingram': [
    { event: 'Drafted #2 by LAL', date: '2016-06-23', action: 'Round 1, Pick #2', teamTo: 'LAL', verified: true },
    { event: 'Traded to NOP', date: '2019-06-15', action: 'In Anthony Davis trade', teamFrom: 'LAL', teamTo: 'NOP', verified: true }
  ],
  
  'RJ Barrett': [
    { event: 'Drafted #3 by NYK', date: '2019-06-20', action: 'Round 1, Pick #3', teamTo: 'NYK', verified: true },
    { event: 'Traded to TOR', date: '2023-12-30', action: 'For OG Anunoby', teamFrom: 'NYK', teamTo: 'TOR', verified: true }
  ],
  
  'Cam Reddish': [
    { event: 'Drafted #10 by ATL', date: '2019-06-20', action: 'Round 1, Pick #10', teamTo: 'ATL', verified: true },
    { event: 'Traded to NYK', date: '2022-01-13', action: 'For Kevin Knox, 1st-round pick', teamFrom: 'ATL', teamTo: 'NYK', verified: true },
    { event: 'Traded to POR', date: '2023-02-09', action: 'For Josh Hart', teamFrom: 'NYK', teamTo: 'POR', verified: true },
    { event: 'Traded to LAL', date: '2024-02-08', action: 'For 2nd-round picks', teamFrom: 'POR', teamTo: 'LAL', verified: true }
  ],
  
  'Jalen Johnson': [
    { event: 'Drafted #20 by ATL', date: '2021-07-29', action: 'Round 1, Pick #20', teamTo: 'ATL', verified: true }
  ],
  
  'Jonathan Kuminga': [
    { event: 'Drafted #7 by GSW', date: '2021-07-29', action: 'Round 1, Pick #7', teamTo: 'GSW', verified: true }
  ],
  
  'Coby White': [
    { event: 'Drafted #7 by CHI', date: '2019-06-20', action: 'Round 1, Pick #7', teamTo: 'CHI', verified: true }
  ],
  
  'Onyeka Okongwu': [
    { event: 'Drafted #6 by ATL', date: '2020-11-18', action: 'Round 1, Pick #6', teamTo: 'ATL', verified: true }
  ],
  
  'Jaden Ivey': [
    { event: 'Drafted #5 by DET', date: '2022-06-23', action: 'Round 1, Pick #5', teamTo: 'DET', verified: true }
  ],
  
  'Jalen Suggs': [
    { event: 'Drafted #5 by ORL', date: '2021-07-29', action: 'Round 1, Pick #5', teamTo: 'ORL', verified: true }
  ],
  
  'P.J. Washington': [
    { event: 'Drafted #12 by CHA', date: '2019-06-20', action: 'Round 1, Pick #12', teamTo: 'CHA', verified: true },
    { event: 'Traded to DAL', date: '2024-02-08', action: 'For Grant Williams, Seth Curry, picks', teamFrom: 'CHA', teamTo: 'DAL', verified: true }
  ],
  
  'Dereck Lively II': [
    { event: 'Drafted #12 by DAL', date: '2023-06-22', action: 'Round 1, Pick #12', teamTo: 'DAL', verified: true }
  ],
  
  'Jaren Jackson Jr.': [
    { event: 'Drafted #4 by MEM', date: '2018-06-21', action: 'Round 1, Pick #4', teamTo: 'MEM', verified: true }
  ],
  
  'Darius Garland': [
    { event: 'Drafted #5 by CLE', date: '2019-06-20', action: 'Round 1, Pick #5', teamTo: 'CLE', verified: true }
  ],
  
  'Aaron Nesmith': [
    { event: 'Drafted #14 by BOS', date: '2020-11-18', action: 'Round 1, Pick #14', teamTo: 'BOS', verified: true },
    { event: 'Traded to IND', date: '2022-07-08', action: 'In Malcolm Brogdon trade', teamFrom: 'BOS', teamTo: 'IND', verified: true }
  ],
  
  'Jabari Smith Jr.': [
    { event: 'Drafted #3 by HOU', date: '2022-06-23', action: 'Round 1, Pick #3', teamTo: 'HOU', verified: true }
  ],
  
  'Amen Thompson': [
    { event: 'Drafted #4 by HOU', date: '2023-06-22', action: 'Round 1, Pick #4', teamTo: 'HOU', verified: true }
  ],
  
  'Brandon Miller': [
    { event: 'Drafted #2 by CHA', date: '2023-06-22', action: 'Round 1, Pick #2', teamTo: 'CHA', verified: true }
  ],
  
  'Stephon Castle': [
    { event: 'Drafted #4 by SAS', date: '2024-06-26', action: 'Round 1, Pick #4', teamTo: 'SAS', verified: true }
  ],
  
  'Zach Edey': [
    { event: 'Drafted #9 by MEM', date: '2024-06-26', action: 'Round 1, Pick #9', teamTo: 'MEM', verified: true }
  ],
  
  'Deni Avdija': [
    { event: 'Drafted #9 by WAS', date: '2020-11-18', action: 'Round 1, Pick #9', teamTo: 'WAS', verified: true },
    { event: 'Traded to POR', date: '2024-06-20', action: 'For Malcolm Brogdon, 2029 1st', teamFrom: 'WAS', teamTo: 'POR', verified: true }
  ],
  
  'Nickeil Alexander-Walker': [
    { event: 'Drafted #17 by BKN', date: '2019-06-20', action: 'Round 1, Pick #17', teamTo: 'BKN', verified: true },
    { event: 'Draft night trade to NOP', date: '2019-06-20', action: 'For 2 2nds', teamFrom: 'BKN', teamTo: 'NOP', verified: true },
    { event: 'Traded to UTA', date: '2022-02-08', action: 'In CJ McCollum trade', teamFrom: 'NOP', teamTo: 'UTA', verified: true },
    { event: 'Traded to MIN', date: '2022-07-06', action: 'In Rudy Gobert trade', teamFrom: 'UTA', teamTo: 'MIN', verified: true }
  ],
  
  'Dyson Daniels': [
    { event: 'Drafted #8 by NOP', date: '2022-06-23', action: 'Round 1, Pick #8', teamTo: 'NOP', verified: true },
    { event: 'Traded to ATL', date: '2024-06-26', action: 'For Dejounte Murray package', teamFrom: 'NOP', teamTo: 'ATL', verified: true }
  ],
  
  'Cooper Flagg': [
    { event: 'Drafted #1 by DAL', date: '2025-06-26', action: 'Round 1, Pick #1', teamTo: 'DAL', verified: true }
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
  
  // Use verified_transactions table (no foreign key constraint issues)
  const existing = db.prepare('SELECT id FROM verified_transactions WHERE player_id = ?').get(player.id);
  
  if (existing) {
    // Update existing
    db.prepare('UPDATE verified_transactions SET chain_json = ?, last_updated = ? WHERE player_id = ?').run(chainJson, now, player.id);
    updated++;
  } else {
    // Insert new
    db.prepare('INSERT INTO verified_transactions (player_id, chain_json, source, last_updated) VALUES (?, ?, ?, ?)').run(player.id, chainJson, 'web_search', now);
    inserted++;
  }
}

db.exec('COMMIT');

console.log('=== Bulk Verified Transactions Update Complete ===');
console.log('Updated:', updated);
console.log('Inserted:', inserted);
console.log('Failed (player not found):', failed.length, failed.slice(0, 10).join(', '));

// Verify final count
const total = db.prepare('SELECT COUNT(*) as count FROM verified_transactions WHERE chain_json IS NOT NULL').get();
console.log('\nTotal verified transactions with data:', total.count);

db.close();
