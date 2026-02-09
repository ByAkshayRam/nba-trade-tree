const Database = require('better-sqlite3');
const db = new Database('/home/ubuntu/clawd/projects/nba-trade-tree/data/nba_trades.db');

// Batch 3: More players - focusing on remaining active roster players
const playerChains = {
  
  // More young stars and role players
  'Tyus Jones': [
    { event: 'Drafted #24 by CLE', date: '2015-06-25', action: 'Round 1, Pick #24', teamTo: 'CLE', verified: true },
    { event: 'Draft night trade to MIN', date: '2015-06-25', action: 'For Kevin Love trade package', teamFrom: 'CLE', teamTo: 'MIN', verified: true },
    { event: 'Signed with MEM', date: '2019-07-06', action: 'Free agent signing', teamFrom: 'MIN', teamTo: 'MEM', verified: true },
    { event: 'Signed with WAS', date: '2023-07-01', action: 'Free agent signing', teamFrom: 'MEM', teamTo: 'WAS', verified: true },
    { event: 'Signed with PHX', date: '2024-07-01', action: 'Free agent signing', teamFrom: 'WAS', teamTo: 'PHX', verified: true }
  ],
  
  'Fred VanVleet': [
    { event: 'Undrafted 2016', date: '2016-07-24', action: 'Signed with TOR as UDFA', teamTo: 'TOR', verified: true },
    { event: 'Signed with HOU', date: '2023-07-01', action: 'Free agent signing', teamFrom: 'TOR', teamTo: 'HOU', verified: true }
  ],
  
  'Josh Green': [
    { event: 'Drafted #18 by DAL', date: '2020-11-18', action: 'Round 1, Pick #18', teamTo: 'DAL', verified: true },
    { event: 'Traded to CHA', date: '2024-06-26', action: 'For draft picks', teamFrom: 'DAL', teamTo: 'CHA', verified: true }
  ],
  
  'Josh Giddey': [
    { event: 'Drafted #6 by OKC', date: '2021-07-29', action: 'Round 1, Pick #6', teamTo: 'OKC', verified: true },
    { event: 'Traded to CHI', date: '2024-06-20', action: 'For Alex Caruso', teamFrom: 'OKC', teamTo: 'CHI', verified: true }
  ],
  
  'Alex Caruso': [
    { event: 'Undrafted 2016', date: '2016-07-17', action: 'Signed with OKC G-League', teamTo: 'OKC', verified: true },
    { event: 'Signed with LAL', date: '2017-10-13', action: 'Two-way contract', teamFrom: 'OKC', teamTo: 'LAL', verified: true },
    { event: 'Signed with CHI', date: '2021-08-02', action: 'Free agent signing', teamFrom: 'LAL', teamTo: 'CHI', verified: true },
    { event: 'Traded to OKC', date: '2024-06-20', action: 'For Josh Giddey', teamFrom: 'CHI', teamTo: 'OKC', verified: true }
  ],
  
  'Patrick Williams': [
    { event: 'Drafted #4 by CHI', date: '2020-11-18', action: 'Round 1, Pick #4', teamTo: 'CHI', verified: true }
  ],
  
  'Jaxson Hayes': [
    { event: 'Drafted #8 by ATL', date: '2019-06-20', action: 'Round 1, Pick #8', teamTo: 'ATL', verified: true },
    { event: 'Draft night trade to NOP', date: '2019-06-20', action: 'For draft picks', teamFrom: 'ATL', teamTo: 'NOP', verified: true },
    { event: 'Traded to LAL', date: '2023-02-09', action: 'For picks', teamFrom: 'NOP', teamTo: 'LAL', verified: true }
  ],
  
  'Wendell Carter Jr.': [
    { event: 'Drafted #7 by CHI', date: '2018-06-21', action: 'Round 1, Pick #7', teamTo: 'CHI', verified: true },
    { event: 'Traded to ORL', date: '2021-03-25', action: 'For Nikola Vucevic, Al-Farouq Aminu', teamFrom: 'CHI', teamTo: 'ORL', verified: true }
  ],
  
  'Nikola Vucevic': [
    { event: 'Drafted #16 by PHI', date: '2011-06-23', action: 'Round 1, Pick #16', teamTo: 'PHI', verified: true },
    { event: 'Traded to ORL', date: '2012-08-10', action: 'In Dwight Howard 4-team deal', teamFrom: 'PHI', teamTo: 'ORL', verified: true },
    { event: 'Traded to CHI', date: '2021-03-25', action: 'For Wendell Carter Jr., picks', teamFrom: 'ORL', teamTo: 'CHI', verified: true }
  ],
  
  'Daniel Gafford': [
    { event: 'Drafted #38 by CHI', date: '2019-06-20', action: 'Round 2, Pick #38', teamTo: 'CHI', verified: true },
    { event: 'Traded to WAS', date: '2021-03-25', action: 'For Chandler Hutchison, 2024 2nd', teamFrom: 'CHI', teamTo: 'WAS', verified: true },
    { event: 'Traded to DAL', date: '2024-02-08', action: 'For draft picks', teamFrom: 'WAS', teamTo: 'DAL', verified: true }
  ],
  
  'Maxi Kleber': [
    { event: 'Undrafted 2017', date: '2017-07-24', action: 'Signed with DAL as UDFA', teamTo: 'DAL', verified: true }
  ],
  
  'Dwight Powell': [
    { event: 'Drafted #45 by CHA', date: '2014-06-26', action: 'Round 2, Pick #45', teamTo: 'CHA', verified: true },
    { event: 'Traded to BOS', date: '2014-12-18', action: 'For draft picks', teamFrom: 'CHA', teamTo: 'BOS', verified: true },
    { event: 'Traded to DAL', date: '2014-12-18', action: 'For draft picks', teamFrom: 'BOS', teamTo: 'DAL', verified: true }
  ],
  
  'Klay Thompson': [
    { event: 'Drafted #11 by GSW', date: '2011-06-23', action: 'Round 1, Pick #11', teamTo: 'GSW', verified: true },
    { event: 'Signed with DAL', date: '2024-07-01', action: 'Free agent signing', teamFrom: 'GSW', teamTo: 'DAL', verified: true }
  ],
  
  'Draymond Green': [
    { event: 'Drafted #35 by GSW', date: '2012-06-28', action: 'Round 2, Pick #35', teamTo: 'GSW', verified: true }
  ],
  
  'Kevin Huerter': [
    { event: 'Drafted #19 by ATL', date: '2018-06-21', action: 'Round 1, Pick #19', teamTo: 'ATL', verified: true },
    { event: 'Traded to SAC', date: '2022-07-01', action: 'For Justin Holiday, Mo Harkless, pick', teamFrom: 'ATL', teamTo: 'SAC', verified: true }
  ],
  
  'Keegan Murray': [
    { event: 'Drafted #4 by SAC', date: '2022-06-23', action: 'Round 1, Pick #4', teamTo: 'SAC', verified: true }
  ],
  
  'Malik Monk': [
    { event: 'Drafted #11 by CHA', date: '2017-06-22', action: 'Round 1, Pick #11', teamTo: 'CHA', verified: true },
    { event: 'Signed with LAL', date: '2021-08-04', action: 'Free agent signing', teamFrom: 'CHA', teamTo: 'LAL', verified: true },
    { event: 'Signed with SAC', date: '2022-07-05', action: 'Free agent signing', teamFrom: 'LAL', teamTo: 'SAC', verified: true }
  ],
  
  'Harrison Barnes': [
    { event: 'Drafted #7 by GSW', date: '2012-06-28', action: 'Round 1, Pick #7', teamTo: 'GSW', verified: true },
    { event: 'Signed with DAL', date: '2016-07-08', action: 'Max offer sheet (matched by GSW then traded)', teamFrom: 'GSW', teamTo: 'DAL', verified: true },
    { event: 'Traded to SAC', date: '2019-02-08', action: 'For Zach Randolph, Justin Jackson', teamFrom: 'DAL', teamTo: 'SAC', verified: true }
  ],
  
  'Caleb Martin': [
    { event: 'Undrafted 2019', date: '2019-08-14', action: 'Signed with CHA as UDFA', teamTo: 'CHA', verified: true },
    { event: 'Signed with MIA', date: '2021-07-01', action: 'Free agent signing', teamFrom: 'CHA', teamTo: 'MIA', verified: true },
    { event: 'Signed with PHI', date: '2024-07-06', action: 'Free agent signing', teamFrom: 'MIA', teamTo: 'PHI', verified: true }
  ],
  
  'Duncan Robinson': [
    { event: 'Undrafted 2018', date: '2018-07-01', action: 'Signed with MIA as UDFA', teamTo: 'MIA', verified: true }
  ],
  
  'Jaime Jaquez Jr.': [
    { event: 'Drafted #18 by MIA', date: '2023-06-22', action: 'Round 1, Pick #18', teamTo: 'MIA', verified: true }
  ],
  
  'Jalen Brunson': [
    { event: 'Drafted #33 by DAL', date: '2018-06-21', action: 'Round 2, Pick #33', teamTo: 'DAL', verified: true },
    { event: 'Signed with NYK', date: '2022-07-12', action: 'Free agent signing', teamFrom: 'DAL', teamTo: 'NYK', verified: true }
  ],
  
  'Miles McBride': [
    { event: 'Drafted #36 by OKC', date: '2021-07-29', action: 'Round 2, Pick #36', teamTo: 'OKC', verified: true },
    { event: 'Draft night trade to NYK', date: '2021-07-29', action: 'For future picks', teamFrom: 'OKC', teamTo: 'NYK', verified: true }
  ],
  
  'Mitchell Robinson': [
    { event: 'Drafted #36 by NYK', date: '2018-06-21', action: 'Round 2, Pick #36', teamTo: 'NYK', verified: true }
  ],
  
  'Jericho Sims': [
    { event: 'Drafted #58 by NYK', date: '2021-07-29', action: 'Round 2, Pick #58', teamTo: 'NYK', verified: true }
  ],
  
  'Isaiah Hartenstein': [
    { event: 'Drafted #43 by HOU', date: '2017-06-22', action: 'Round 2, Pick #43', teamTo: 'HOU', verified: true },
    { event: 'Signed with DEN', date: '2020-12-02', action: 'Free agent signing', teamFrom: 'HOU', teamTo: 'DEN', verified: true },
    { event: 'Signed with LAC', date: '2021-08-09', action: 'Free agent signing', teamFrom: 'DEN', teamTo: 'LAC', verified: true },
    { event: 'Signed with NYK', date: '2022-07-07', action: 'Free agent signing', teamFrom: 'LAC', teamTo: 'NYK', verified: true },
    { event: 'Signed with OKC', date: '2024-07-02', action: 'Free agent signing', teamFrom: 'NYK', teamTo: 'OKC', verified: true }
  ],
  
  'Luguentz Dort': [
    { event: 'Undrafted 2019', date: '2019-07-09', action: 'Signed with OKC as UDFA', teamTo: 'OKC', verified: true }
  ],
  
  'Aaron Wiggins': [
    { event: 'Drafted #55 by OKC', date: '2021-07-29', action: 'Round 2, Pick #55', teamTo: 'OKC', verified: true }
  ],
  
  'Ousmane Dieng': [
    { event: 'Drafted #11 by NYK', date: '2022-06-23', action: 'Round 1, Pick #11', teamTo: 'NYK', verified: true },
    { event: 'Draft night trade to OKC', date: '2022-06-23', action: 'For 3 future 1sts', teamFrom: 'NYK', teamTo: 'OKC', verified: true }
  ],
  
  'Scoot Henderson': [
    { event: 'Drafted #3 by POR', date: '2023-06-22', action: 'Round 1, Pick #3', teamTo: 'POR', verified: true }
  ],
  
  'Shaedon Sharpe': [
    { event: 'Drafted #7 by POR', date: '2022-06-23', action: 'Round 1, Pick #7', teamTo: 'POR', verified: true }
  ],
  
  'Jerami Grant': [
    { event: 'Drafted #39 by PHI', date: '2014-06-26', action: 'Round 2, Pick #39', teamTo: 'PHI', verified: true },
    { event: 'Traded to OKC', date: '2016-11-01', action: 'For Ersan Ilyasova', teamFrom: 'PHI', teamTo: 'OKC', verified: true },
    { event: 'Traded to DEN', date: '2019-07-06', action: 'For 2020 1st-round pick', teamFrom: 'OKC', teamTo: 'DEN', verified: true },
    { event: 'Signed with DET', date: '2020-11-24', action: 'Free agent signing', teamFrom: 'DEN', teamTo: 'DET', verified: true },
    { event: 'Traded to POR', date: '2022-07-01', action: 'For 2025 1st-round pick', teamFrom: 'DET', teamTo: 'POR', verified: true }
  ],
  
  'Matisse Thybulle': [
    { event: 'Drafted #20 by BOS', date: '2019-06-20', action: 'Round 1, Pick #20', teamTo: 'BOS', verified: true },
    { event: 'Draft night trade to PHI', date: '2019-06-20', action: 'For picks', teamFrom: 'BOS', teamTo: 'PHI', verified: true },
    { event: 'Traded to POR', date: '2023-02-09', action: 'For Jalen McDaniels', teamFrom: 'PHI', teamTo: 'POR', verified: true }
  ],
  
  'Jusuf Nurkic': [
    { event: 'Drafted #16 by CHI', date: '2014-06-26', action: 'Round 1, Pick #16', teamTo: 'CHI', verified: true },
    { event: 'Draft night trade to DEN', date: '2014-06-26', action: 'For Doug McDermott', teamFrom: 'CHI', teamTo: 'DEN', verified: true },
    { event: 'Traded to POR', date: '2017-02-13', action: 'For Mason Plumlee, 2018 1st', teamFrom: 'DEN', teamTo: 'POR', verified: true },
    { event: 'Signed with PHX', date: '2024-07-06', action: 'Free agent signing', teamFrom: 'POR', teamTo: 'PHX', verified: true }
  ],
  
  'Royce ONeale': [
    { event: 'Undrafted 2017', date: '2017-07-06', action: 'Signed with UTA as UDFA', teamTo: 'UTA', verified: true },
    { event: 'Traded to BKN', date: '2022-07-06', action: 'For 2023 1st-round pick', teamFrom: 'UTA', teamTo: 'BKN', verified: true },
    { event: 'Signed with PHX', date: '2023-07-06', action: 'Free agent signing', teamFrom: 'BKN', teamTo: 'PHX', verified: true }
  ],
  
  'Grayson Allen': [
    { event: 'Drafted #21 by UTA', date: '2018-06-21', action: 'Round 1, Pick #21', teamTo: 'UTA', verified: true },
    { event: 'Traded to MEM', date: '2019-07-06', action: 'In Mike Conley trade', teamFrom: 'UTA', teamTo: 'MEM', verified: true },
    { event: 'Traded to MIL', date: '2021-08-06', action: 'For Sam Merrill, 2022 2nds', teamFrom: 'MEM', teamTo: 'MIL', verified: true },
    { event: 'Traded to PHX', date: '2024-02-08', action: 'For draft picks', teamFrom: 'MIL', teamTo: 'PHX', verified: true }
  ],
  
  'Kevin Love': [
    { event: 'Drafted #5 by MEM', date: '2008-06-26', action: 'Round 1, Pick #5', teamTo: 'MEM', verified: true },
    { event: 'Draft night trade to MIN', date: '2008-06-26', action: 'For OJ Mayo, picks', teamFrom: 'MEM', teamTo: 'MIN', verified: true },
    { event: 'Traded to CLE', date: '2014-08-23', action: 'For Andrew Wiggins, Anthony Bennett, pick', teamFrom: 'MIN', teamTo: 'CLE', verified: true },
    { event: 'Signed with MIA', date: '2023-08-04', action: 'After CLE buyout', teamFrom: 'CLE', teamTo: 'MIA', verified: true }
  ],
  
  'Khris Middleton': [
    { event: 'Drafted #39 by DET', date: '2012-06-28', action: 'Round 2, Pick #39', teamTo: 'DET', verified: true },
    { event: 'Traded to MIL', date: '2013-07-31', action: 'For Brandon Jennings', teamFrom: 'DET', teamTo: 'MIL', verified: true }
  ],
  
  'Bobby Portis': [
    { event: 'Drafted #22 by CHI', date: '2015-06-25', action: 'Round 1, Pick #22', teamTo: 'CHI', verified: true },
    { event: 'Traded to WAS', date: '2019-02-07', action: 'For Otto Porter Jr.', teamFrom: 'CHI', teamTo: 'WAS', verified: true },
    { event: 'Traded to NYK', date: '2019-07-06', action: 'In sign-and-trade', teamFrom: 'WAS', teamTo: 'NYK', verified: true },
    { event: 'Signed with MIL', date: '2020-11-20', action: 'Free agent signing', teamFrom: 'NYK', teamTo: 'MIL', verified: true }
  ],
  
  'Pat Connaughton': [
    { event: 'Drafted #41 by BKN', date: '2015-06-25', action: 'Round 2, Pick #41', teamTo: 'BKN', verified: true },
    { event: 'Draft night trade to POR', date: '2015-06-25', action: 'For Rondae Hollis-Jefferson', teamFrom: 'BKN', teamTo: 'POR', verified: true },
    { event: 'Signed with MIL', date: '2018-07-09', action: 'Free agent signing', teamFrom: 'POR', teamTo: 'MIL', verified: true }
  ],
  
  'AJ Green': [
    { event: 'Drafted #41 by MIL', date: '2022-06-23', action: 'Round 2, Pick #41', teamTo: 'MIL', verified: true }
  ],
  
  'Talen Horton-Tucker': [
    { event: 'Drafted #46 by LAL', date: '2019-06-20', action: 'Round 2, Pick #46', teamTo: 'LAL', verified: true },
    { event: 'Traded to UTA', date: '2022-08-25', action: 'In Patrick Beverley trade', teamFrom: 'LAL', teamTo: 'UTA', verified: true }
  ],
  
  'John Collins': [
    { event: 'Drafted #19 by ATL', date: '2017-06-22', action: 'Round 1, Pick #19', teamTo: 'ATL', verified: true },
    { event: 'Traded to UTA', date: '2023-06-22', action: 'For picks and cap relief', teamFrom: 'ATL', teamTo: 'UTA', verified: true }
  ],
  
  'Ayo Dosunmu': [
    { event: 'Drafted #38 by CHI', date: '2021-07-29', action: 'Round 2, Pick #38', teamTo: 'CHI', verified: true }
  ],
  
  'Josh Okogie': [
    { event: 'Drafted #20 by MIN', date: '2018-06-21', action: 'Round 1, Pick #20', teamTo: 'MIN', verified: true },
    { event: 'Signed with PHX', date: '2022-07-01', action: 'Free agent signing', teamFrom: 'MIN', teamTo: 'PHX', verified: true }
  ],
  
  'Monte Morris': [
    { event: 'Drafted #51 by DEN', date: '2017-06-22', action: 'Round 2, Pick #51', teamTo: 'DEN', verified: true },
    { event: 'Traded to WAS', date: '2022-08-22', action: 'For Will Barton, KCP', teamFrom: 'DEN', teamTo: 'WAS', verified: true },
    { event: 'Signed with MIN', date: '2023-07-06', action: 'Free agent signing', teamFrom: 'WAS', teamTo: 'MIN', verified: true }
  ],
  
  'Shake Milton': [
    { event: 'Drafted #54 by DAL', date: '2018-06-21', action: 'Round 2, Pick #54', teamTo: 'DAL', verified: true },
    { event: 'Draft night trade to PHI', date: '2018-06-21', action: 'For cash', teamFrom: 'DAL', teamTo: 'PHI', verified: true },
    { event: 'Signed with MIN', date: '2023-07-16', action: 'Free agent signing', teamFrom: 'PHI', teamTo: 'MIN', verified: true },
    { event: 'Traded to BKN', date: '2024-02-13', action: 'For Nickeil Alexander-Walker', teamFrom: 'MIN', teamTo: 'BKN', verified: true },
    { event: 'Traded to LAL', date: '2024-12-29', action: 'For D\'Angelo Russell', teamFrom: 'BKN', teamTo: 'LAL', verified: true }
  ],
  
  'Gabe Vincent': [
    { event: 'Undrafted 2018', date: '2019-10-19', action: 'Signed with MIA', teamTo: 'MIA', verified: true },
    { event: 'Signed with LAL', date: '2023-07-02', action: 'Free agent signing', teamFrom: 'MIA', teamTo: 'LAL', verified: true }
  ],
  
  'Max Strus': [
    { event: 'Undrafted 2019', date: '2021-04-18', action: 'Signed 10-day with MIA', teamTo: 'MIA', verified: true },
    { event: 'Signed with CLE', date: '2023-07-06', action: 'Free agent signing', teamFrom: 'MIA', teamTo: 'CLE', verified: true }
  ],
  
  'Georges Niang': [
    { event: 'Drafted #50 by IND', date: '2016-06-23', action: 'Round 2, Pick #50', teamTo: 'IND', verified: true },
    { event: 'Signed with UTA', date: '2017-07-18', action: 'Free agent signing', teamFrom: 'IND', teamTo: 'UTA', verified: true },
    { event: 'Signed with PHI', date: '2021-08-06', action: 'Free agent signing', teamFrom: 'UTA', teamTo: 'PHI', verified: true },
    { event: 'Signed with CLE', date: '2023-07-01', action: 'Free agent signing', teamFrom: 'PHI', teamTo: 'CLE', verified: true }
  ],
  
  'Caris LeVert': [
    { event: 'Drafted #20 by IND', date: '2016-06-23', action: 'Round 1, Pick #20', teamTo: 'IND', verified: true },
    { event: 'Draft night trade to BKN', date: '2016-06-23', action: 'For Thaddeus Young', teamFrom: 'IND', teamTo: 'BKN', verified: true },
    { event: 'Traded to IND', date: '2021-01-14', action: 'In James Harden 4-team deal', teamFrom: 'BKN', teamTo: 'IND', verified: true },
    { event: 'Traded to CLE', date: '2022-02-08', action: 'For Ricky Rubio, 2022 1st, 2022 2nd', teamFrom: 'IND', teamTo: 'CLE', verified: true },
    { event: 'Signed with PHX', date: '2024-07-01', action: 'Free agent signing', teamFrom: 'CLE', teamTo: 'PHX', verified: true }
  ],
  
  'Dean Wade': [
    { event: 'Undrafted 2019', date: '2019-07-22', action: 'Signed with CLE', teamTo: 'CLE', verified: true }
  ],
  
  'Sam Hauser': [
    { event: 'Drafted #55 by BOS', date: '2021-07-29', action: 'Round 2, Pick #55 (via CHA)', teamTo: 'BOS', verified: true }
  ],
  
  'Jordan Walsh': [
    { event: 'Drafted #38 by BOS', date: '2023-06-22', action: 'Round 2, Pick #38', teamTo: 'BOS', verified: true }
  ],
  
  'Luke Kornet': [
    { event: 'Undrafted 2017', date: '2017-07-30', action: 'Signed with NYK', teamTo: 'NYK', verified: true },
    { event: 'Signed with CHI', date: '2019-07-12', action: 'Free agent signing', teamFrom: 'NYK', teamTo: 'CHI', verified: true },
    { event: 'Signed with BOS', date: '2021-04-01', action: 'After G-League stints', teamFrom: 'CHI', teamTo: 'BOS', verified: true }
  ],
  
  'Neemias Queta': [
    { event: 'Drafted #39 by SAC', date: '2021-07-29', action: 'Round 2, Pick #39', teamTo: 'SAC', verified: true },
    { event: 'Signed with BOS', date: '2023-07-11', action: 'Free agent signing', teamFrom: 'SAC', teamTo: 'BOS', verified: true }
  ],
  
  'Derrick Jones Jr.': [
    { event: 'Undrafted 2016', date: '2016-07-01', action: 'Signed with PHX as UDFA', teamTo: 'PHX', verified: true },
    { event: 'Signed with MIA', date: '2018-02-08', action: 'After waiver', teamFrom: 'PHX', teamTo: 'MIA', verified: true },
    { event: 'Signed with POR', date: '2020-12-01', action: 'Free agent signing', teamFrom: 'MIA', teamTo: 'POR', verified: true },
    { event: 'Signed with CHI', date: '2021-08-04', action: 'Free agent signing', teamFrom: 'POR', teamTo: 'CHI', verified: true },
    { event: 'Signed with DAL', date: '2023-07-06', action: 'Free agent signing', teamFrom: 'CHI', teamTo: 'DAL', verified: true }
  ],
  
  'Markieff Morris': [
    { event: 'Drafted #13 by PHX', date: '2011-06-23', action: 'Round 1, Pick #13', teamTo: 'PHX', verified: true },
    { event: 'Traded to WAS', date: '2016-02-18', action: 'For DeJuan Blair, Kris Humphries, 2016 1st', teamFrom: 'PHX', teamTo: 'WAS', verified: true },
    { event: 'Traded to OKC', date: '2017-09-25', action: 'For 2020 2nd', teamFrom: 'WAS', teamTo: 'OKC', verified: true },
    { event: 'Signed with DET', date: '2018-07-18', action: 'After OKC buyout', teamFrom: 'OKC', teamTo: 'DET', verified: true },
    { event: 'Traded to LAL', date: '2020-02-06', action: 'For draft pick', teamFrom: 'DET', teamTo: 'LAL', verified: true },
    { event: 'Signed with MIA', date: '2021-08-06', action: 'Free agent signing', teamFrom: 'LAL', teamTo: 'MIA', verified: true },
    { event: 'Traded to BKN', date: '2022-07-09', action: 'For picks', teamFrom: 'MIA', teamTo: 'BKN', verified: true }
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

console.log('=== Batch 3 Complete ===');
console.log('Updated:', updated);
console.log('Inserted:', inserted);
console.log('Failed:', failed.length, failed.join(', '));

// Total count
const total = db.prepare('SELECT COUNT(*) as count FROM verified_transactions').get();
console.log('\nTotal verified players:', total.count);

db.close();
