import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface AcquisitionNode {
  type: "player" | "pick" | "cash";
  name: string;
  acquisitionType: string;
  date: string;
  draftPick?: number;
  draftRound?: number;
  tradePartner?: string;
  tradeDescription?: string;
  becamePlayer?: string;
  currentTeam?: string;
  note?: string;
  isOrigin?: boolean;
  isHomegrown?: boolean;
  assetsGivenUp?: AcquisitionNode[];
  tradeChain?: AcquisitionNode | AcquisitionNode[];
}

interface TreeFile {
  _meta: {
    team: string;
    player: string;
    originYear: number;
    depth: number;
  };
  tree: AcquisitionNode;
}

interface FlowNode {
  id: string;
  type: string;
  data: {
    label: string;
    sublabel?: string;
    date?: string;
    nodeType: "player" | "pick" | "cash" | "trade-action";
    acquisitionType?: string;
    tradePartner?: string;
    note?: string;
    isOrigin?: boolean;
    isTarget?: boolean;
    isRosterPlayer?: boolean;
    isHomegrown?: boolean;
    rosterOrder?: number;
    rosterCategory?: "starter" | "bench" | "two-way";
    draftPick?: number;
    becamePlayer?: string;
  };
}

// Roster organization by team (February 2026 - Post Trade Deadline)
const ROSTER_ORDERS: Record<string, Record<string, { order: number; category: "starter" | "bench" | "two-way" }>> = {
  BOS: {
    "Derrick White": { order: 1, category: "starter" },
    "Jaylen Brown": { order: 2, category: "starter" },
    "Jayson Tatum": { order: 3, category: "starter" },
    "Nikola Vucevic": { order: 4, category: "starter" },
    "Payton Pritchard": { order: 5, category: "starter" },
    "Sam Hauser": { order: 10, category: "bench" },
    "Neemias Queta": { order: 11, category: "bench" },
    "Jordan Walsh": { order: 12, category: "bench" },
    "Baylor Scheierman": { order: 13, category: "bench" },
    "Luka Garza": { order: 14, category: "bench" },
    "Ron Harper Jr.": { order: 15, category: "bench" },
    "Hugo Gonzalez": { order: 17, category: "bench" },
    "Amari Williams": { order: 18, category: "bench" },
    "John Tonje": { order: 20, category: "two-way" },
    "Max Shulga": { order: 21, category: "two-way" },
  },
  NYK: {
    "Jalen Brunson": { order: 1, category: "starter" },
    "Mikal Bridges": { order: 2, category: "starter" },
    "OG Anunoby": { order: 3, category: "starter" },
    "Karl-Anthony Towns": { order: 4, category: "starter" },
    "Josh Hart": { order: 5, category: "starter" },
    "Miles McBride": { order: 10, category: "bench" },
    "Jose Alvarado": { order: 11, category: "bench" },
    "Mitchell Robinson": { order: 12, category: "bench" },
    "Pacome Dadiet": { order: 13, category: "bench" },
    "Tyler Kolek": { order: 15, category: "bench" },
    "Ariel Hukporti": { order: 16, category: "bench" },
    "Jordan Clarkson": { order: 17, category: "bench" },
    "Landry Shamet": { order: 18, category: "bench" },
    "Jeremy Sochan": { order: 19, category: "bench" },
    "Mohamed Diawara": { order: 20, category: "two-way" },
    "Trey Jemison III": { order: 21, category: "two-way" },
    "Kevin McCullar Jr.": { order: 22, category: "two-way" },
    "Dillon Jones": { order: 23, category: "two-way" },
  },
  OKC: {
    "Shai Gilgeous-Alexander": { order: 1, category: "starter" },
    "Jalen Williams": { order: 2, category: "starter" },
    "Chet Holmgren": { order: 3, category: "starter" },
    "Alex Caruso": { order: 4, category: "starter" },
    "Isaiah Hartenstein": { order: 5, category: "starter" },
    "Cason Wallace": { order: 10, category: "bench" },
    "Luguentz Dort": { order: 11, category: "bench" },
    "Isaiah Joe": { order: 13, category: "bench" },
    "Jaylin Williams": { order: 14, category: "bench" },
    "Aaron Wiggins": { order: 15, category: "bench" },
    "Kenrich Williams": { order: 16, category: "bench" },
    "Nikola Topic": { order: 17, category: "bench" },
    "Ajay Mitchell": { order: 18, category: "bench" },
    "Jared McCain": { order: 19, category: "bench" },
    "Branden Carlson": { order: 20, category: "two-way" },
    "Brooks Barnhizer": { order: 21, category: "two-way" },
    "Buddy Boeheim": { order: 22, category: "two-way" },
    "Thomas Sorber": { order: 23, category: "two-way" },
  },
  ATL: {
    "Jalen Johnson": { order: 1, category: "starter" },
    "CJ McCollum": { order: 2, category: "starter" },
    "Jonathan Kuminga": { order: 3, category: "starter" },
    "Onyeka Okongwu": { order: 4, category: "starter" },
    "Dyson Daniels": { order: 5, category: "starter" },
    "Buddy Hield": { order: 10, category: "bench" },
    "Zaccharie Risacher": { order: 11, category: "bench" },
    "Corey Kispert": { order: 12, category: "bench" },
    "Nickeil Alexander-Walker": { order: 13, category: "bench" },
    "Gabe Vincent": { order: 14, category: "bench" },
    "Jock Landale": { order: 15, category: "bench" },
    "Christian Koloko": { order: 16, category: "bench" },
    "Caleb Houstan": { order: 17, category: "bench" },
    "Mouhamed Gueye": { order: 20, category: "two-way" },
    "Nikola Durisic": { order: 21, category: "two-way" },
    "Asa Newell": { order: 22, category: "two-way" },
  },
  BKN: {
    "Michael Porter Jr.": { order: 1, category: "starter" },
    "Nic Claxton": { order: 2, category: "starter" },
    "Ziaire Williams": { order: 3, category: "starter" },
    "Terance Mann": { order: 4, category: "starter" },
    "Egor Demin": { order: 5, category: "starter" },
    "Day'Ron Sharpe": { order: 10, category: "bench" },
    "Noah Clowney": { order: 11, category: "bench" },
    "Jalen Wilson": { order: 12, category: "bench" },
    "Ochai Agbaji": { order: 13, category: "bench" },
    "Nolan Traore": { order: 14, category: "bench" },
    "Danny Wolf": { order: 15, category: "bench" },
    "Drake Powell": { order: 16, category: "bench" },
    "Chaney Johnson": { order: 17, category: "bench" },
    "E.J. Liddell": { order: 18, category: "bench" },
    "Tyson Etienne": { order: 19, category: "bench" },
    "Ben Saraf": { order: 20, category: "two-way" },
    "Josh Minott": { order: 21, category: "two-way" },
  },
  CHA: {
    "LaMelo Ball": { order: 1, category: "starter" },
    "Brandon Miller": { order: 2, category: "starter" },
    "Miles Bridges": { order: 3, category: "starter" },
    "Coby White": { order: 4, category: "starter" },
    "Grant Williams": { order: 5, category: "starter" },
    "Tre Mann": { order: 10, category: "bench" },
    "Josh Green": { order: 11, category: "bench" },
    "Pat Connaughton": { order: 12, category: "bench" },
    "Tidjane Salaun": { order: 13, category: "bench" },
    "Moussa Diabate": { order: 14, category: "bench" },
    "Malaki Branham": { order: 15, category: "bench" },
    "Kon Knueppel": { order: 16, category: "bench" },
    "Xavier Tillman": { order: 17, category: "bench" },
    "PJ Hall": { order: 18, category: "bench" },
    "Liam McNeeley": { order: 20, category: "two-way" },
    "Antonio Reeves": { order: 21, category: "two-way" },
    "Ryan Kalkbrenner": { order: 22, category: "two-way" },
    "Sion James": { order: 23, category: "two-way" },
  },
  CHI: {
    "Anfernee Simons": { order: 1, category: "starter" },
    "Jaden Ivey": { order: 2, category: "starter" },
    "Josh Giddey": { order: 3, category: "starter" },
    "Patrick Williams": { order: 4, category: "starter" },
    "Nick Richards": { order: 5, category: "starter" },
    "Collin Sexton": { order: 10, category: "bench" },
    "Isaac Okoro": { order: 11, category: "bench" },
    "Matas Buzelis": { order: 12, category: "bench" },
    "Jalen Smith": { order: 13, category: "bench" },
    "Rob Dillingham": { order: 14, category: "bench" },
    "Zach Collins": { order: 15, category: "bench" },
    "Tre Jones": { order: 16, category: "bench" },
    "Guerschon Yabusele": { order: 17, category: "bench" },
    "Noa Essengue": { order: 20, category: "two-way" },
    "Leonard Miller": { order: 21, category: "two-way" },
    "Lachlan Olbrich": { order: 22, category: "two-way" },
    "Mac McClung": { order: 18, category: "bench" },
    "Yuki Kawamura": { order: 19, category: "bench" },
  },
  CLE: {
    "Donovan Mitchell": { order: 1, category: "starter" },
    "James Harden": { order: 2, category: "starter" },
    "Evan Mobley": { order: 3, category: "starter" },
    "Jarrett Allen": { order: 4, category: "starter" },
    "Max Strus": { order: 5, category: "starter" },
    "Dennis Schroder": { order: 10, category: "bench" },
    "Dean Wade": { order: 11, category: "bench" },
    "Sam Merrill": { order: 12, category: "bench" },
    "Craig Porter Jr.": { order: 13, category: "bench" },
    "Jaylon Tyson": { order: 14, category: "bench" },
    "Thomas Bryant": { order: 15, category: "bench" },
    "Larry Nance Jr.": { order: 16, category: "bench" },
    "Keon Ellis": { order: 17, category: "bench" },
    "Nae'Qwan Tomlin": { order: 18, category: "bench" },
    "Tyrese Proctor": { order: 20, category: "two-way" },
  },
  DET: {
    "Cade Cunningham": { order: 1, category: "starter" },
    "Ausar Thompson": { order: 2, category: "starter" },
    "Tobias Harris": { order: 3, category: "starter" },
    "Jalen Duren": { order: 4, category: "starter" },
    "Duncan Robinson": { order: 5, category: "starter" },
    "Ron Holland II": { order: 10, category: "bench" },
    "Isaiah Stewart": { order: 11, category: "bench" },
    "Marcus Sasser": { order: 12, category: "bench" },
    "Kevin Huerter": { order: 13, category: "bench" },
    "Caris LeVert": { order: 14, category: "bench" },
    "Paul Reed": { order: 15, category: "bench" },
    "Dario Saric": { order: 16, category: "bench" },
    "Wendell Moore Jr.": { order: 17, category: "bench" },
    "Chaz Lanier": { order: 18, category: "bench" },
    "Javonte Green": { order: 19, category: "bench" },
    "Bobi Klintman": { order: 20, category: "two-way" },
    "Daniss Jenkins": { order: 21, category: "two-way" },
  },
  IND: {
    "Andrew Nembhard": { order: 1, category: "starter" },
    "Aaron Nesmith": { order: 2, category: "starter" },
    "Pascal Siakam": { order: 3, category: "starter" },
    "Jarace Walker": { order: 4, category: "starter" },
    "Ivica Zubac": { order: 5, category: "starter" },
    "Tyrese Haliburton": { order: 10, category: "bench" },
    "Ben Sheppard": { order: 11, category: "bench" },
    "Obi Toppin": { order: 12, category: "bench" },
    "Kam Jones": { order: 13, category: "bench" },
    "Johnny Furphy": { order: 14, category: "bench" },
    "T.J. McConnell": { order: 15, category: "bench" },
    "Jay Huff": { order: 16, category: "bench" },
    "Kobe Brown": { order: 17, category: "bench" },
    "Micah Potter": { order: 18, category: "bench" },
    "Tony Bradley": { order: 19, category: "bench" },
    "Quenton Jackson": { order: 20, category: "two-way" },
    "Taelon Peter": { order: 21, category: "two-way" },
    "Ethan Thompson": { order: 22, category: "two-way" },
  },
  MIA: {
    "Bam Adebayo": { order: 1, category: "starter" },
    "Tyler Herro": { order: 2, category: "starter" },
    "Norman Powell": { order: 3, category: "starter" },
    "Andrew Wiggins": { order: 4, category: "starter" },
    "Davion Mitchell": { order: 5, category: "starter" },
    "Terry Rozier": { order: 10, category: "bench" },
    "Jaime Jaquez Jr.": { order: 11, category: "bench" },
    "Nikola Jovic": { order: 12, category: "bench" },
    "Kel'el Ware": { order: 13, category: "bench" },
    "Kasparas Jakucionis": { order: 14, category: "bench" },
    "Simone Fontecchio": { order: 15, category: "bench" },
    "Keshad Johnson": { order: 16, category: "bench" },
    "Pelle Larsson": { order: 17, category: "bench" },
    "Dru Smith": { order: 18, category: "bench" },
    "Myron Gardner": { order: 20, category: "two-way" },
    "Vladislav Goldin": { order: 21, category: "two-way" },
    "Jahmir Young": { order: 22, category: "two-way" },
  },
  MIL: {
    "Giannis Antetokounmpo": { order: 1, category: "starter" },
    "Cam Thomas": { order: 2, category: "starter" },
    "Kyle Kuzma": { order: 3, category: "starter" },
    "Myles Turner": { order: 4, category: "starter" },
    "Gary Trent Jr.": { order: 5, category: "starter" },
    "Bobby Portis": { order: 10, category: "bench" },
    "Gary Harris": { order: 11, category: "bench" },
    "Andre Jackson Jr.": { order: 12, category: "bench" },
    "Ryan Rollins": { order: 13, category: "bench" },
    "Taurean Prince": { order: 14, category: "bench" },
    "Kevin Porter Jr.": { order: 15, category: "bench" },
    "AJ Green": { order: 16, category: "bench" },
    "Ousmane Dieng": { order: 17, category: "bench" },
    "Jericho Sims": { order: 18, category: "bench" },
    "Thanasis Antetokounmpo": { order: 19, category: "bench" },
    "Pete Nance": { order: 20, category: "two-way" },
    "Alex Antetokounmpo": { order: 21, category: "two-way" },
  },
  ORL: {
    "Paolo Banchero": { order: 1, category: "starter" },
    "Franz Wagner": { order: 2, category: "starter" },
    "Desmond Bane": { order: 3, category: "starter" },
    "Jalen Suggs": { order: 4, category: "starter" },
    "Wendell Carter Jr.": { order: 5, category: "starter" },
    "Anthony Black": { order: 10, category: "bench" },
    "Jett Howard": { order: 11, category: "bench" },
    "Tristan da Silva": { order: 12, category: "bench" },
    "Jonathan Isaac": { order: 13, category: "bench" },
    "Moritz Wagner": { order: 14, category: "bench" },
    "Goga Bitadze": { order: 15, category: "bench" },
    "Jevon Carter": { order: 16, category: "bench" },
    "Jase Richardson": { order: 17, category: "bench" },
    "Noah Penda": { order: 18, category: "bench" },
    "Colin Castleton": { order: 20, category: "two-way" },
    "Orlando Robinson": { order: 21, category: "two-way" },
    "Jamal Cain": { order: 22, category: "two-way" },
  },
  PHI: {
    "Joel Embiid": { order: 1, category: "starter" },
    "Tyrese Maxey": { order: 2, category: "starter" },
    "Paul George": { order: 3, category: "starter" },
    "Kelly Oubre Jr.": { order: 4, category: "starter" },
    "Andre Drummond": { order: 5, category: "starter" },
    "Kyle Lowry": { order: 10, category: "bench" },
    "Quentin Grimes": { order: 11, category: "bench" },
    "Trendon Watford": { order: 12, category: "bench" },
    "Justin Edwards": { order: 15, category: "bench" },
    "Adem Bona": { order: 16, category: "bench" },
    "VJ Edgecombe": { order: 17, category: "bench" },
    "Johni Broome": { order: 18, category: "bench" },
    "Charles Bassey": { order: 19, category: "bench" },
    "Patrick Baldwin Jr.": { order: 20, category: "bench" },
    "Dominick Barlow": { order: 21, category: "bench" },
    "Jabari Walker": { order: 30, category: "two-way" },
    "MarJon Beauchamp": { order: 31, category: "two-way" },
    "Dalen Terry": { order: 32, category: "two-way" },
  },
  TOR: {
    "Scottie Barnes": { order: 1, category: "starter" },
    "RJ Barrett": { order: 2, category: "starter" },
    "Brandon Ingram": { order: 3, category: "starter" },
    "Jakob Poeltl": { order: 4, category: "starter" },
    "Immanuel Quickley": { order: 5, category: "starter" },
    "Gradey Dick": { order: 10, category: "bench" },
    "Ja'Kobe Walter": { order: 11, category: "bench" },
    "Garrett Temple": { order: 12, category: "bench" },
    "Jonathan Mogbo": { order: 13, category: "bench" },
    "Jamal Shead": { order: 14, category: "bench" },
    "Trayce Jackson-Davis": { order: 15, category: "bench" },
    "Collin Murray-Boyles": { order: 16, category: "bench" },
    "Sandro Mamukelashvili": { order: 17, category: "bench" },
    "Chucky Hepburn": { order: 18, category: "bench" },
    "Alijah Martin": { order: 19, category: "bench" },
    "Jamison Battle": { order: 30, category: "two-way" },
    "A.J. Lawson": { order: 31, category: "two-way" },
  },
  WAS: {
    "Trae Young": { order: 1, category: "starter" },
    "Anthony Davis": { order: 2, category: "starter" },
    "Alex Sarr": { order: 3, category: "starter" },
    "Bilal Coulibaly": { order: 4, category: "starter" },
    "Bub Carrington": { order: 5, category: "starter" },
    "Tre Johnson": { order: 10, category: "bench" },
    "D'Angelo Russell": { order: 11, category: "bench" },
    "Jaden Hardy": { order: 12, category: "bench" },
    "Cam Whitmore": { order: 13, category: "bench" },
    "Kyshawn George": { order: 14, category: "bench" },
    "Will Riley": { order: 15, category: "bench" },
    "Justin Champagnie": { order: 16, category: "bench" },
    "Sharife Cooper": { order: 30, category: "two-way" },
    "Anthony Gill": { order: 18, category: "bench" },
    "Skal Labissiere": { order: 19, category: "bench" },
    "Kadary Richmond": { order: 20, category: "bench" },
    "Keshon Gilbert": { order: 21, category: "two-way" },
    "Tristan Vukcevic": { order: 22, category: "two-way" },
    "Jamir Watkins": { order: 23, category: "two-way" },
  },
  // Western Conference
  DAL: {
    "Kyrie Irving": { order: 1, category: "starter" },
    "Cooper Flagg": { order: 2, category: "starter" },
    "P.J. Washington": { order: 3, category: "starter" },
    "Daniel Gafford": { order: 4, category: "starter" },
    "Klay Thompson": { order: 5, category: "starter" },
    "Brandon Williams": { order: 10, category: "bench" },
    "Caleb Martin": { order: 11, category: "bench" },
    "Dereck Lively II": { order: 12, category: "bench" },
    "Dwight Powell": { order: 13, category: "bench" },
    "Khris Middleton": { order: 14, category: "bench" },
    "Marvin Bagley III": { order: 15, category: "bench" },
    "Max Christie": { order: 16, category: "bench" },
    "Naji Marshall": { order: 17, category: "bench" },
    "Ryan Nembhard": { order: 18, category: "bench" },
    "Tyus Jones": { order: 19, category: "bench" },
    "AJ Johnson": { order: 20, category: "two-way" },
    "Miles Kelly": { order: 21, category: "two-way" },
    "Moussa Cisse": { order: 22, category: "two-way" },
  },
  DEN: {
    "Jamal Murray": { order: 1, category: "starter" },
    "Christian Braun": { order: 2, category: "starter" },
    "Cameron Johnson": { order: 3, category: "starter" },
    "Aaron Gordon": { order: 4, category: "starter" },
    "Nikola Jokic": { order: 5, category: "starter" },
    "Bruce Brown": { order: 10, category: "bench" },
    "DaRon Holmes II": { order: 11, category: "bench" },
    "Jalen Pickett": { order: 12, category: "bench" },
    "Jonas Valanciunas": { order: 13, category: "bench" },
    "Julian Strawther": { order: 14, category: "bench" },
    "Peyton Watson": { order: 15, category: "bench" },
    "Spencer Jones": { order: 16, category: "bench" },
    "Tim Hardaway Jr.": { order: 17, category: "bench" },
    "Zeke Nnaji": { order: 18, category: "bench" },
    "Tamar Bates": { order: 20, category: "two-way" },
    "Curtis Jones": { order: 21, category: "two-way" },
  },
  GSW: {
    "Stephen Curry": { order: 1, category: "starter" },
    "Jimmy Butler III": { order: 2, category: "starter" },
    "Draymond Green": { order: 3, category: "starter" },
    "Kristaps Porzingis": { order: 4, category: "starter" },
    "Brandin Podziemski": { order: 5, category: "starter" },
    "Al Horford": { order: 10, category: "bench" },
    "De'Anthony Melton": { order: 11, category: "bench" },
    "Gary Payton II": { order: 12, category: "bench" },
    "Gui Santos": { order: 13, category: "bench" },
    "Moses Moody": { order: 14, category: "bench" },
    "Quinten Post": { order: 15, category: "bench" },
    "Seth Curry": { order: 16, category: "bench" },
    "Will Richard": { order: 17, category: "bench" },
    "L.J. Cryer": { order: 20, category: "two-way" },
    "Malevy Leons": { order: 21, category: "two-way" },
    "Pat Spencer": { order: 22, category: "two-way" },
  },
  HOU: {
    "Fred VanVleet": { order: 1, category: "starter" },
    "Amen Thompson": { order: 2, category: "starter" },
    "Jabari Smith Jr.": { order: 3, category: "starter" },
    "Kevin Durant": { order: 4, category: "starter" },
    "Alperen Sengun": { order: 5, category: "starter" },
    "Aaron Holiday": { order: 10, category: "bench" },
    "Clint Capela": { order: 11, category: "bench" },
    "Dorian Finney-Smith": { order: 12, category: "bench" },
    "Jae'Sean Tate": { order: 13, category: "bench" },
    "Jeff Green": { order: 14, category: "bench" },
    "Josh Okogie": { order: 15, category: "bench" },
    "Reed Sheppard": { order: 16, category: "bench" },
    "Steven Adams": { order: 17, category: "bench" },
    "Tari Eason": { order: 18, category: "bench" },
    "Isaiah Crawford": { order: 20, category: "two-way" },
    "JD Davison": { order: 21, category: "two-way" },
    "Tristen Newton": { order: 22, category: "two-way" },
  },
  LAC: {
    "Darius Garland": { order: 1, category: "starter" },
    "Kawhi Leonard": { order: 2, category: "starter" },
    "Bradley Beal": { order: 3, category: "starter" },
    "John Collins": { order: 4, category: "starter" },
    "Brook Lopez": { order: 5, category: "starter" },
    "Bennedict Mathurin": { order: 10, category: "bench" },
    "Bogdan Bogdanovic": { order: 11, category: "bench" },
    "Dalano Banton": { order: 12, category: "bench" },
    "Derrick Jones Jr.": { order: 13, category: "bench" },
    "Isaiah Jackson": { order: 14, category: "bench" },
    "Jordan Miller": { order: 15, category: "bench" },
    "Kobe Sanders": { order: 16, category: "bench" },
    "Kris Dunn": { order: 17, category: "bench" },
    "Nicolas Batum": { order: 18, category: "bench" },
    "TyTy Washington Jr.": { order: 19, category: "bench" },
    "Cam Christie": { order: 20, category: "two-way" },
    "Yanic Konan Niederhauser": { order: 21, category: "two-way" },
  },
  LAL: {
    "Luka Doncic": { order: 1, category: "starter" },
    "Austin Reaves": { order: 2, category: "starter" },
    "Rui Hachimura": { order: 3, category: "starter" },
    "LeBron James": { order: 4, category: "starter" },
    "Deandre Ayton": { order: 5, category: "starter" },
    "Adou Thiero": { order: 10, category: "bench" },
    "Bronny James": { order: 11, category: "bench" },
    "Dalton Knecht": { order: 12, category: "bench" },
    "Drew Timme": { order: 13, category: "bench" },
    "Jake LaRavia": { order: 14, category: "bench" },
    "Jarred Vanderbilt": { order: 15, category: "bench" },
    "Jaxson Hayes": { order: 16, category: "bench" },
    "Luke Kennard": { order: 17, category: "bench" },
    "Marcus Smart": { order: 18, category: "bench" },
    "Maxi Kleber": { order: 19, category: "bench" },
    "Kobe Bufkin": { order: 20, category: "two-way" },
    "Nick Smith Jr.": { order: 21, category: "two-way" },
    "Chris Manon": { order: 22, category: "two-way" },
  },
  MEM: {
    "Ja Morant": { order: 1, category: "starter" },
    "Jaylen Wells": { order: 2, category: "starter" },
    "GG Jackson": { order: 3, category: "starter" },
    "Zach Edey": { order: 4, category: "starter" },
    "Scotty Pippen Jr.": { order: 5, category: "starter" },
    "Brandon Clarke": { order: 10, category: "bench" },
    "Cam Spencer": { order: 11, category: "bench" },
    "Jahmai Mashack": { order: 12, category: "bench" },
    "Javon Small": { order: 13, category: "bench" },
    "Kentavious Caldwell-Pope": { order: 14, category: "bench" },
    "Kyle Anderson": { order: 15, category: "bench" },
    "Olivier-Maxence Prosper": { order: 16, category: "bench" },
    "Santi Aldama": { order: 17, category: "bench" },
    "Taylor Hendricks": { order: 18, category: "bench" },
    "Ty Jerome": { order: 19, category: "bench" },
    "Cedric Coward": { order: 20, category: "two-way" },
    "Walter Clayton Jr.": { order: 21, category: "two-way" },
    "Lawson Lovering": { order: 22, category: "two-way" },
  },
  MIN: {
    "Anthony Edwards": { order: 1, category: "starter" },
    "Donte DiVincenzo": { order: 2, category: "starter" },
    "Jaden McDaniels": { order: 3, category: "starter" },
    "Julius Randle": { order: 4, category: "starter" },
    "Rudy Gobert": { order: 5, category: "starter" },
    "Ayo Dosunmu": { order: 10, category: "bench" },
    "Bones Hyland": { order: 11, category: "bench" },
    "Joan Beringer": { order: 12, category: "bench" },
    "Joe Ingles": { order: 13, category: "bench" },
    "Johnny Juzang": { order: 14, category: "bench" },
    "Julian Phillips": { order: 15, category: "bench" },
    "Naz Reid": { order: 16, category: "bench" },
    "Rocco Zikarsky": { order: 17, category: "bench" },
    "Terrence Shannon Jr.": { order: 18, category: "bench" },
    "Jaylen Clark": { order: 20, category: "two-way" },
    "Enrique Freeman": { order: 21, category: "two-way" },
  },
  NOP: {
    "Dejounte Murray": { order: 1, category: "starter" },
    "Jordan Poole": { order: 2, category: "starter" },
    "Herbert Jones": { order: 3, category: "starter" },
    "Zion Williamson": { order: 4, category: "starter" },
    "Yves Missi": { order: 5, category: "starter" },
    "DeAndre Jordan": { order: 10, category: "bench" },
    "Derik Queen": { order: 11, category: "bench" },
    "Hunter Dickinson": { order: 12, category: "bench" },
    "Jeremiah Fears": { order: 13, category: "bench" },
    "Jordan Hawkins": { order: 14, category: "bench" },
    "Karlo Matkovic": { order: 15, category: "bench" },
    "Kevon Looney": { order: 16, category: "bench" },
    "Saddiq Bey": { order: 17, category: "bench" },
    "Trey Alexander": { order: 18, category: "bench" },
    "Trey Murphy III": { order: 19, category: "bench" },
    "Bryce McGowens": { order: 20, category: "two-way" },
    "Micah Peavy": { order: 21, category: "two-way" },
  },
  PHX: {
    "Devin Booker": { order: 1, category: "starter" },
    "Jalen Green": { order: 2, category: "starter" },
    "Dillon Brooks": { order: 3, category: "starter" },
    "Mark Williams": { order: 4, category: "starter" },
    "Grayson Allen": { order: 5, category: "starter" },
    "Amir Coffey": { order: 10, category: "bench" },
    "Cole Anthony": { order: 11, category: "bench" },
    "Haywood Highsmith": { order: 12, category: "bench" },
    "Jordan Goodwin": { order: 13, category: "bench" },
    "Khaman Maluach": { order: 14, category: "bench" },
    "Koby Brea": { order: 15, category: "bench" },
    "Oso Ighodaro": { order: 16, category: "bench" },
    "Rasheer Fleming": { order: 17, category: "bench" },
    "Royce O'Neale": { order: 18, category: "bench" },
    "Ryan Dunn": { order: 19, category: "bench" },
    "Jamaree Bouyea": { order: 20, category: "two-way" },
    "Collin Gillespie": { order: 21, category: "two-way" },
    "Isaiah Livers": { order: 22, category: "two-way" },
  },
  POR: {
    "Scoot Henderson": { order: 1, category: "starter" },
    "Shaedon Sharpe": { order: 2, category: "starter" },
    "Deni Avdija": { order: 3, category: "starter" },
    "Jerami Grant": { order: 4, category: "starter" },
    "Donovan Clingan": { order: 5, category: "starter" },
    "Blake Wesley": { order: 10, category: "bench" },
    "Caleb Love": { order: 11, category: "bench" },
    "Damian Lillard": { order: 12, category: "bench" },
    "Jabari Walker": { order: 13, category: "bench" },
    "Kris Murray": { order: 14, category: "bench" },
    "Rayan Rupert": { order: 15, category: "bench" },
    "Robert Williams III": { order: 16, category: "bench" },
    "Toumani Camara": { order: 17, category: "bench" },
    "Vit Krejci": { order: 18, category: "bench" },
    "Javonte Cooke": { order: 20, category: "two-way" },
    "Yang Hansen": { order: 21, category: "two-way" },
    "Sidy Cissoko": { order: 22, category: "two-way" },
  },
  SAC: {
    "DeMar DeRozan": { order: 1, category: "starter" },
    "Keegan Murray": { order: 2, category: "starter" },
    "Domantas Sabonis": { order: 3, category: "starter" },
    "Malik Monk": { order: 4, category: "starter" },
    "Devin Carter": { order: 5, category: "starter" },
    "De'Andre Hunter": { order: 10, category: "bench" },
    "Doug McDermott": { order: 11, category: "bench" },
    "Drew Eubanks": { order: 12, category: "bench" },
    "Isaiah Stevens": { order: 13, category: "bench" },
    "Maxime Raynaud": { order: 14, category: "bench" },
    "Precious Achiuwa": { order: 15, category: "bench" },
    "Russell Westbrook": { order: 16, category: "bench" },
    "Zach LaVine": { order: 17, category: "bench" },
    "Daeqwon Plowden": { order: 20, category: "two-way" },
    "Dylan Cardwell": { order: 21, category: "two-way" },
    "Nique Clifford": { order: 22, category: "two-way" },
  },
  SAS: {
    "De'Aaron Fox": { order: 1, category: "starter" },
    "Devin Vassell": { order: 2, category: "starter" },
    "Harrison Barnes": { order: 3, category: "starter" },
    "Victor Wembanyama": { order: 4, category: "starter" },
    "Stephon Castle": { order: 5, category: "starter" },
    "Bismack Biyombo": { order: 10, category: "bench" },
    "Carter Bryant": { order: 11, category: "bench" },
    "Dylan Harper": { order: 12, category: "bench" },
    "Harrison Ingram": { order: 13, category: "bench" },
    "Julian Champagnie": { order: 14, category: "bench" },
    "Keldon Johnson": { order: 15, category: "bench" },
    "Kelly Olynyk": { order: 16, category: "bench" },
    "Lindy Waters III": { order: 17, category: "bench" },
    "Luke Kornet": { order: 18, category: "bench" },
    "Jordan McLaughlin": { order: 20, category: "two-way" },
    "Stanley Umude": { order: 21, category: "two-way" },
    "David Jones Garcia": { order: 22, category: "two-way" },
  },
  UTA: {
    "Keyonte George": { order: 1, category: "starter" },
    "Lauri Markkanen": { order: 2, category: "starter" },
    "Walker Kessler": { order: 3, category: "starter" },
    "Jaren Jackson Jr.": { order: 4, category: "starter" },
    "Cody Williams": { order: 5, category: "starter" },
    "Ace Bailey": { order: 10, category: "bench" },
    "Brice Sensabaugh": { order: 11, category: "bench" },
    "Isaiah Collier": { order: 12, category: "bench" },
    "John Konchar": { order: 13, category: "bench" },
    "Jusuf Nurkic": { order: 14, category: "bench" },
    "Kevin Love": { order: 15, category: "bench" },
    "Kyle Filipowski": { order: 16, category: "bench" },
    "Svi Mykhailiuk": { order: 17, category: "bench" },
    "Vince Williams Jr.": { order: 18, category: "bench" },
    "Blake Hinson": { order: 20, category: "two-way" },
    "Elijah Harkless": { order: 21, category: "two-way" },
    "Oscar Tshiebwe": { order: 22, category: "two-way" },
  },
};

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  BOS: { primary: "#007A33", secondary: "#BA9653" },
  NYK: { primary: "#F58426", secondary: "#006BB6" },
  OKC: { primary: "#007AC1", secondary: "#EF3B24" },
  WAS: { primary: "#002B5C", secondary: "#E31837" },
  // Eastern Conference
  ATL: { primary: "#E03A3E", secondary: "#C1D32F" },
  BKN: { primary: "#000000", secondary: "#FFFFFF" },
  CHA: { primary: "#00788C", secondary: "#1D1160" },
  CHI: { primary: "#CE1141", secondary: "#000000" },
  CLE: { primary: "#860038", secondary: "#FDBB30" },
  DET: { primary: "#C8102E", secondary: "#1D42BA" },
  IND: { primary: "#002D62", secondary: "#FDBB30" },
  MIA: { primary: "#98002E", secondary: "#F9A01B" },
  MIL: { primary: "#00471B", secondary: "#EEE1C6" },
  ORL: { primary: "#0077C0", secondary: "#C4CED4" },
  PHI: { primary: "#006BB6", secondary: "#ED174C" },
  TOR: { primary: "#CE1141", secondary: "#000000" },
  // Western Conference
  DAL: { primary: "#00538C", secondary: "#002B5E" },
  DEN: { primary: "#0E2240", secondary: "#FEC524" },
  GSW: { primary: "#FFC72C", secondary: "#1D428A" },
  HOU: { primary: "#CE1141", secondary: "#000000" },
  LAC: { primary: "#C8102E", secondary: "#1D428A" },
  LAL: { primary: "#552583", secondary: "#FDB927" },
  MEM: { primary: "#5D76A9", secondary: "#12173F" },
  MIN: { primary: "#0C2340", secondary: "#236192" },
  NOP: { primary: "#B4975A", secondary: "#0C2340" },
  PHX: { primary: "#1D1160", secondary: "#E56020" },
  POR: { primary: "#E03A3E", secondary: "#000000" },
  SAC: { primary: "#5A2D81", secondary: "#63727A" },
  SAS: { primary: "#C4CED4", secondary: "#000000" },
  UTA: { primary: "#3E1175", secondary: "#002B5C" },
};

const TEAM_NAMES: Record<string, string> = {
  BOS: "Boston Celtics",
  NYK: "New York Knicks",
  OKC: "Oklahoma City Thunder",
  WAS: "Washington Wizards",
  // Eastern Conference
  ATL: "Atlanta Hawks",
  BKN: "Brooklyn Nets",
  CHA: "Charlotte Hornets",
  CHI: "Chicago Bulls",
  CLE: "Cleveland Cavaliers",
  DET: "Detroit Pistons",
  IND: "Indiana Pacers",
  MIA: "Miami Heat",
  MIL: "Milwaukee Bucks",
  ORL: "Orlando Magic",
  PHI: "Philadelphia 76ers",
  TOR: "Toronto Raptors",
  // Western Conference
  DAL: "Dallas Mavericks",
  DEN: "Denver Nuggets",
  GSW: "Golden State Warriors",
  HOU: "Houston Rockets",
  LAC: "LA Clippers",
  LAL: "Los Angeles Lakers",
  MEM: "Memphis Grizzlies",
  MIN: "Minnesota Timberwolves",
  NOP: "New Orleans Pelicans",
  PHX: "Phoenix Suns",
  POR: "Portland Trail Blazers",
  SAC: "Sacramento Kings",
  SAS: "San Antonio Spurs",
  UTA: "Utah Jazz",
};

// Compelling roster narratives for each team - creator-friendly stories
const ROSTER_NARRATIVES: Record<string, string> = {
  BOS: "The Celtics' championship core is a masterclass in patience. When Danny Ainge traded Kevin Garnett and Paul Pierce to Brooklyn in 2013, the basketball world thought Boston was entering a decade of darkness. Instead, those picks became Jaylen Brown (#3, 2016) and — through a trade with Philadelphia — Jayson Tatum (#3, 2017). One trade, a decade later, produced an NBA championship. Derrick White arrived via the Spurs for another Brooklyn pick. The KG/Pierce trade echoes through this entire roster.",
  NYK: "The Knicks built their contender through aggressive trading. Jalen Brunson chose New York in free agency, then helped recruit. OG Anunoby came from Toronto. Mikal Bridges arrived in a blockbuster with Brooklyn. Karl-Anthony Towns was traded from Minnesota. This isn't the Knicks of old — this is a front office that identified targets and went all-in. The result? A roster constructed for a championship run.",
  OKC: "Sam Presti played chess while everyone else played checkers. When he traded Russell Westbrook and Paul George, critics called it a teardown. Instead, it was a reload. Shai Gilgeous-Alexander — the 'throw-in' from the Clippers deal — became a top-5 player. Chet Holmgren at #2 adds unicorn potential. The Thunder have more draft picks than any team in NBA history, but their best assets are already on the roster.",
  WAS: "The Wizards shocked the league at the 2026 deadline. Trading for both Trae Young AND Anthony Davis — two franchise-altering moves in one week. Alex Sarr at #2 overall was already promising; now he learns from an all-time great. Bilal Coulibaly adds two-way potential. D'Angelo Russell came with AD. This went from rebuild to must-watch overnight.",
  // Eastern Conference - February 2026 Post-Deadline
  ATL: "The post-Trae era begins. After trading Young to Washington at the 2026 deadline, Atlanta received CJ McCollum, Jonathan Kuminga, and Buddy Hield — a complete roster retool. Jalen Johnson emerged as the new franchise cornerstone, breaking out into All-Star consideration. Zaccharie Risacher (#1, 2024) adds lottery upside. It's a new Hawks era built around Johnson's versatility.",
  BKN: "The perpetual rebuild continues. Cam Thomas — their brightest young star — was traded to Milwaukee for picks. Michael Porter Jr. arrived from Denver to be the new face of the rebuild. Nic Claxton anchors the defense. The nets that became Jaylen Brown and Jayson Tatum still haunt this franchise, now accumulating young assets again with Egor Demin and Nolan Traore.",
  CHA: "LaMelo Ball at #3 was the Hornets' swing for the fences — a flashy, creative point guard to build around. Brandon Miller (#2, 2023) adds two-way potential. At the deadline, they acquired Coby White from Chicago to add scoring punch. Miles Bridges provides veteran leadership. This young, athletic roster is searching for chemistry to break through.",
  CHI: "The Bulls hit reset at the 2026 deadline. LaVine and Vucevic are gone. In their place: Anfernee Simons from Portland and Jaden Ivey from Detroit — two explosive young guards building around Josh Giddey. Patrick Williams remains from the previous era. It's a youth movement betting on upside over proven success.",
  CLE: "The Cavs went all-in at the deadline. James Harden arrived from the Clippers, and Darius Garland went out. It's a bold bet: pair an aging superstar scorer with their championship-caliber defense. Donovan Mitchell, Evan Mobley, and Jarrett Allen form the core. Harden adds playoff experience — and controversy. The Eastern Conference got a lot more interesting.",
  DET: "Cade Cunningham at #1 (2021) is the franchise. But Jaden Ivey was traded to Chicago at the deadline. Duncan Robinson arrived from Miami to add shooting. Ausar Thompson and Ron Holland II represent the athletic future. The Pistons bet on Cade and patience — rebuilding without the explosive guard combo everyone expected.",
  IND: "The Pacers acquired Tyrese Haliburton from Sacramento in the 2022 Domantas Sabonis trade, tracing back to the 2017 Paul George deal. Pascal Siakam arrived from Toronto at the 2024 deadline. Ivica Zubac came from the Clippers in February 2026 along with Kobe Brown, costing Bennedict Mathurin and Isaiah Jackson. Haliburton is out for the season with a torn Achilles from the 2025 Finals.",
  MIA: "Heat Culture endured Jimmy Butler's departure. At the deadline, Butler went to Golden State; Andrew Wiggins and Norman Powell came to South Beach. Bam Adebayo runs the show now. Tyler Herro scores in bunches. Jaime Jaquez Jr. (2023 All-Rookie) embodies the culture. It's a new era, but the Miami ethos remains: compete, develop, win.",
  MIL: "Giannis remains, but everything else changed. Damian Lillard was traded at the deadline for Cam Thomas and Myles Turner — a bet on youth and rim protection over the aging superstar backcourt. Kyle Kuzma adds scoring. Bobby Portis is the heart. This is Milwaukee 3.0: built around Giannis, but completely reimagined.",
  ORL: "Paolo Banchero at #1 was just the start. Franz Wagner emerged as a star. Then came the deadline blockbuster: Desmond Bane from Memphis gives them a proven playoff scorer. Jalen Suggs locks down defensively. Wendell Carter Jr. — acquired from Chicago via the Dwight Howard chain — anchors inside. Orlando is no longer rebuilding; they're contending.",
  PHI: "Trust The Process finally produced its star: Joel Embiid, drafted #3 in 2014, is now an MVP. Tyrese Maxey (#21, 2020) became an All-Star. Paul George arrived in free agency. The bench got deeper at the deadline with Quentin Grimes. When healthy, this is the East's most talented starting five.",
  TOR: "The Raptors made their move: Brandon Ingram arrived at the deadline from New Orleans, giving Scottie Barnes a true co-star. RJ Barrett came home via Knicks trade. Immanuel Quickley runs the point. Jakob Poeltl returned from San Antonio. Gradey Dick shoots the lights out. Toronto is building something special — Canadian stars, championship culture.",
  // Western Conference
  DAL: "Post-Luka Dallas is unrecognizable. Cooper Flagg (#1, 2025) is the new franchise cornerstone after the Anthony Davis blockbuster sent Luka to LA. Kyrie Irving remains from the championship core. PJ Washington and Daniel Gafford were acquired via trades. Klay Thompson signed as a free agent. It's a full rebuild around a generational rookie.",
  DEN: "Nikola Jokic at #41 in 2014 is the greatest draft steal in NBA history. Three-time MVP, 2023 champion. Jamal Murray was drafted #7 in 2016. Aaron Gordon was traded from Orlando. Cameron Johnson replaced Michael Porter Jr. The Nuggets' championship window stays open as long as Jokic keeps rewriting what a center can do.",
  GSW: "The dynasty evolves. Stephen Curry (#7, 2009) and Draymond Green (#35, 2012) anchor the core. Jimmy Butler arrived from Miami at the deadline. Kristaps Porzingis came in a 3-team deal. Andrew Wiggins was flipped for star power. The Warriors traded Jonathan Kuminga for Butler — betting on proven playoff performers over potential.",
  HOU: "Houston's rebuild is complete. Jalen Green (#2, 2021), Jabari Smith (#3, 2022), Alperen Sengun (#16, 2021), and Amen Thompson (#4, 2023) form one of the NBA's youngest cores. Fred VanVleet signed as the veteran floor general. Then the blockbuster: Kevin Durant arrived from Phoenix in a historic 7-team trade. Rockets are all-in.",
  LAC: "The Clippers reinvented themselves. James Harden was traded for Darius Garland from Cleveland. Kawhi Leonard is still here but the supporting cast transformed: Ivica Zubac was dealt to Indiana. Bogdan Bogdanovic came from Atlanta. John Collins arrived from Utah. Brook Lopez signed from Milwaukee. It's a new-look Clippers with Garland running the show.",
  LAL: "The Lakers pulled off the unthinkable: trading Anthony Davis for Luka Doncic from Dallas in February 2025. LeBron James and Luka — two of the greatest playmakers ever — on the same team. Austin Reaves emerged as the undrafted gem. Rui Hachimura was traded from Washington. Dalton Knecht adds 2024 draft firepower. Hollywood has its superteam.",
  MEM: "Ja Morant (#2, 2019) is back and the Grizzlies are dangerous again. Jaren Jackson Jr. was traded to Utah, but Desmond Bane and Zach Edey (#9, 2024) form the new frontcourt. Marcus Smart brings championship toughness from the Celtics trade. Memphis reloaded through the draft and smart deals, staying competitive in a loaded West.",
  MIN: "Anthony Edwards (#1, 2020) is the franchise. The Karl-Anthony Towns trade to New York brought back Julius Randle and Donte DiVincenzo. Rudy Gobert anchors the defense — acquired from Utah in a massive package. Jaden McDaniels and Naz Reid are homegrown. Minnesota finally has its star, its identity, and its swagger.",
  NOP: "Zion Williamson (#1, 2019) remains the centerpiece, but the roster around him transformed. Brandon Ingram was traded to Toronto. CJ McCollum went to Washington. In their place: Jordan Poole arrived from the 3-team WAS deal. Dejounte Murray came from Atlanta. Herb Jones and Trey Murphy are homegrown. It's Zion's team now — no more co-stars, just complementary pieces.",
  PHX: "Everything changed. Kevin Durant was traded to Houston in a historic 7-team deal. Bradley Beal was bought out. Only Devin Booker (#13, 2015) remains from the Big 3 era. Jalen Green and Dillon Brooks arrived from the KD trade. Mark Williams came from Charlotte. It's a full reset around Booker — the franchise's one constant through every era.",
  POR: "The post-Dame rebuild is in full swing. Scoot Henderson (#3, 2023) is the point guard of the future. Anfernee Simons was traded to Chicago. Shaedon Sharpe adds athleticism. Donovan Clingan (#7, 2024) anchors the paint. Deni Avdija arrived from Washington. Jerami Grant provides veteran scoring. Portland is young, long, and building toward something.",
  SAC: "De'Aaron Fox was traded to San Antonio, ending an era. DeMar DeRozan arrived via sign-and-trade from Chicago. Domantas Sabonis — acquired from Indiana for Tyrese Haliburton — is the engine. Keegan Murray (#4, 2022) is the homegrown star. Zach LaVine came from Chicago. It's a retooled roster searching for its identity after losing its franchise point guard.",
  SAS: "Victor Wembanyama (#1, 2023) is the future of basketball. Stephon Castle (#4, 2024) adds backcourt talent. Then the blockbuster: De'Aaron Fox arrived from Sacramento, giving Wemby an elite point guard. Harrison Barnes came in the DeRozan deal. Keldon Johnson is the homegrown veteran. San Antonio is building something special — again.",
  UTA: "Full rebuild mode. The Gobert and Mitchell trades netted a war chest of picks and young players. Lauri Markkanen stayed and signed an extension. Walker Kessler came from the Gobert deal. Keyonte George (#16, 2023) runs the point. Then the surprise: Jaren Jackson Jr. arrived from Memphis at the deadline. Ace Bailey (#5, 2025) adds lottery upside. Utah is stockpiling talent for the next era.",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamAbbr: string }> }
) {
  const { teamAbbr } = await params;
  const team = teamAbbr.toUpperCase();
  
  // Support local dev, Vercel, and monorepo layouts
  const candidates = [
    path.join(process.cwd(), "data", "acquisition-trees"),
    path.join(process.cwd(), "app", "data", "acquisition-trees"),
    path.join(process.cwd(), "..", "data", "acquisition-trees"),
    path.join(__dirname, "..", "..", "..", "..", "data", "acquisition-trees"),
  ];
  let dataDir = candidates.find(d => fs.existsSync(d)) || candidates[0];
  console.log('[RosterDNA] cwd:', process.cwd(), 'dataDir:', dataDir, 'exists:', fs.existsSync(dataDir));
  
  // Get all tree files for this team
  const files = fs.readdirSync(dataDir).filter(f => 
    f.startsWith(team.toLowerCase() + "-") && f.endsWith(".json")
  );
  
  if (files.length === 0) {
    return NextResponse.json({ error: "No trees found for team" }, { status: 404 });
  }
  
  // Load all trees
  const trees: TreeFile[] = files.map(file => {
    const content = fs.readFileSync(path.join(dataDir, file), "utf-8");
    return JSON.parse(content);
  });
  
  // Map player names to their tree files (for checking isHomegrown flag)
  const treeMap = new Map<string, TreeFile>();
  for (const t of trees) {
    treeMap.set(t.tree.name, t);
  }

  // Track unique nodes by a key (name + date)
  const nodeMap = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const edgeSet = new Set<string>();
  let nodeCounter = 0;
  
  // Track which nodes are reachable from each roster player (for finding oldest)
  const rosterToNodes = new Map<string, Set<string>>();
  // Track if a roster player's chain includes any trades
  const rosterHasTrades = new Map<string, boolean>();
  
  // Get node key for deduplication
  function getNodeKey(name: string, date?: string): string {
    return `${name}::${date || 'unknown'}`;
  }
  
  // Parse date for comparison
  function parseDate(dateStr?: string): number {
    if (!dateStr) return Infinity;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? Infinity : d.getTime();
  }
  
  // Process a node and its children recursively (first pass - no origin marking)
  function processNode(
    node: AcquisitionNode,
    parentId: string | null,
    isRosterPlayer: boolean = false,
    rosterPlayerId?: string
  ): string {
    const nodeKey = getNodeKey(node.name, node.date);
    
    // Check if we already have this node
    let existingNode = nodeMap.get(nodeKey);
    let nodeId: string;
    
    if (existingNode) {
      nodeId = existingNode.id;
    } else {
      nodeId = `node-${nodeCounter++}`;
      
      let sublabel = "";
      if (node.type === "pick") {
        sublabel = node.becamePlayer ? `→ ${node.becamePlayer}` : "";
      } else if (node.acquisitionType === "draft" || node.acquisitionType === "draft-night-trade") {
        sublabel = `#${node.draftPick} pick (${new Date(node.date).getFullYear()})`;
      } else if (node.acquisitionType === "trade") {
        sublabel = node.tradePartner ? `via ${node.tradePartner}` : "";
      }
      
      const flowNode: FlowNode = {
        id: nodeId,
        type: isRosterPlayer ? "target" : "acquisition", // Will update origins later
        data: {
          label: node.name,
          sublabel,
          date: node.date,
          nodeType: node.type,
          acquisitionType: node.acquisitionType,
          tradePartner: node.tradePartner,
          note: node.note,
          isOrigin: false, // Will be set in second pass
          isTarget: isRosterPlayer,
          isRosterPlayer,
          draftPick: node.draftPick,
          becamePlayer: node.becamePlayer,
        },
      };
      
      nodeMap.set(nodeKey, flowNode);
    }
    
    // Track this node as reachable from the roster player
    const currentRosterId = isRosterPlayer ? nodeId : rosterPlayerId;
    if (currentRosterId) {
      if (!rosterToNodes.has(currentRosterId)) {
        rosterToNodes.set(currentRosterId, new Set());
      }
      rosterToNodes.get(currentRosterId)!.add(nodeKey);
      
      // Track if this chain has any trades
      if (node.acquisitionType === "trade") {
        rosterHasTrades.set(currentRosterId, true);
      }
    }
    
    // Create edge to parent
    if (parentId) {
      const edgeKey = `${nodeId}->${parentId}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          id: `edge-${nodeId}-${parentId}`,
          source: nodeId,
          target: parentId,
          animated: false, // Will update after origin detection
        });
      }
    }
    
    // Process children (assetsGivenUp only — NOT tradeChain)
    // tradeChain tracks a player's career journey, which is not part of the acquisition tree.
    // We only show what assets were traded away at each step.
    if (node.assetsGivenUp) {
      for (const child of node.assetsGivenUp) {
        processNode(child, nodeId, false, currentRosterId);
      }
    }
    
    return nodeId;
  }
  
  // First pass: Process all player trees (build nodes without origin marking)
  for (const treeFile of trees) {
    processNode(treeFile.tree, null, true);
  }
  
  // Second pass: Find the single oldest node across ALL chains for the team
  // This marks only the earliest influence as the origin (e.g., Dwight Howard for ORL)
  const originNodeKeys = new Set<string>();
  
  let globalOldestKey: string | null = null;
  let globalOldestDate = Infinity;
  
  for (const [rosterId, nodeKeys] of rosterToNodes.entries()) {
    for (const nodeKey of nodeKeys) {
      const node = nodeMap.get(nodeKey);
      if (node && node.data.date) {
        const dateMs = parseDate(node.data.date);
        if (dateMs < globalOldestDate) {
          globalOldestDate = dateMs;
          globalOldestKey = nodeKey;
        }
      }
    }
  }
  
  if (globalOldestKey) {
    originNodeKeys.add(globalOldestKey);
  }
  
  // Mark origin nodes
  for (const nodeKey of originNodeKeys) {
    const node = nodeMap.get(nodeKey);
    if (node) {
      node.data.isOrigin = true;
      node.type = "origin";
    }
  }
  
  // Mark homegrown players and set roster order
  for (const [rosterId, nodeKeys] of rosterToNodes.entries()) {
    const rosterNode = Array.from(nodeMap.values()).find(n => n.id === rosterId);
    if (!rosterNode) continue;
    
    const playerName = rosterNode.data.label;
    const hasTrades = rosterHasTrades.get(rosterId) || false;
    
    // Homegrown = drafted by this team OR UDFA whose first NBA team is this team
    // Check acquisitionType from data file, plus explicit isHomegrown flag for UDFAs
    const acqType = rosterNode.data.acquisitionType || "";
    const treeFile = treeMap.get(playerName);
    const fileHomegrown = treeFile?.tree?.isHomegrown === true;
    const fileIsOrigin = treeFile?.tree?.isOrigin === true;
    rosterNode.data.isHomegrown = (acqType === "draft" || acqType === "draft-night-trade" || fileHomegrown || (acqType === "undrafted" && (fileHomegrown || fileIsOrigin)));
    
    // Set roster order and category
    const teamRosterOrder = ROSTER_ORDERS[team] || {};
    const rosterInfo = teamRosterOrder[playerName];
    if (rosterInfo) {
      rosterNode.data.rosterOrder = rosterInfo.order;
      rosterNode.data.rosterCategory = rosterInfo.category;
    } else {
      // Unknown players go at the end
      rosterNode.data.rosterOrder = 99;
      rosterNode.data.rosterCategory = "bench";
    }
  }
  
  // Update edges - animate edges coming from origins
  for (const edge of edges) {
    const sourceNode = Array.from(nodeMap.values()).find(n => n.id === edge.source);
    if (sourceNode?.data.isOrigin) {
      edge.animated = true;
    }
  }
  
  // Convert map to array
  const nodes = Array.from(nodeMap.values());
  
  // Calculate stats
  const rosterPlayers = nodes.filter(n => n.data.isRosterPlayer).length;
  const homegrownPlayers = nodes.filter(n => n.data.isRosterPlayer && n.data.isHomegrown).length;
  const origins = nodes.filter(n => n.data.isOrigin).length;
  const trades = nodes.filter(n => n.data.acquisitionType === "trade").length;
  const earliestYear = Math.min(...trees.map(t => t._meta.originYear));
  
  // Calculate average experience (years since origin)
  const currentYear = new Date().getFullYear();
  const experienceYears = trees.map(t => currentYear - t._meta.originYear);
  const avgExperience = experienceYears.length > 0 
    ? Math.round((experienceYears.reduce((a, b) => a + b, 0) / experienceYears.length) * 10) / 10
    : 0;

  // Calculate experience rank across all 30 teams
  const allTeamAbbs = [...new Set(
    fs.readdirSync(dataDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.split('-')[0].toUpperCase())
  )];
  const allTeamAvgs: { abbr: string; avg: number }[] = allTeamAbbs.map(abbr => {
    const teamFiles = fs.readdirSync(dataDir).filter(f => f.startsWith(abbr.toLowerCase() + '-') && f.endsWith('.json'));
    const origins = teamFiles.map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf-8'))._meta.originYear; } catch { return currentYear; }
    });
    const avg = origins.length > 0 ? origins.reduce((a: number, b: number) => a + (currentYear - b), 0) / origins.length : 0;
    return { abbr, avg };
  });
  allTeamAvgs.sort((a, b) => b.avg - a.avg); // highest experience first
  const experienceRank = allTeamAvgs.findIndex(t => t.abbr === team) + 1;
  
  // Build trade partner map
  const partnerMap = new Map<string, { count: number; players: Set<string> }>();
  for (const t of trees) {
    function walkPartners(node: any) {
      if (node.tradePartner && node.tradePartner !== team) {
        const partner = node.tradePartner;
        if (!partnerMap.has(partner)) partnerMap.set(partner, { count: 0, players: new Set() });
        const entry = partnerMap.get(partner)!;
        entry.count++;
        if (node.name && node.type === 'player') entry.players.add(node.name);
      }
      if (node.assetsGivenUp) node.assetsGivenUp.forEach(walkPartners);
    }
    walkPartners(t.tree);
  }
  const tradePartners = Array.from(partnerMap.entries())
    .map(([abbr, data]) => ({
      abbr,
      name: TEAM_NAMES[abbr] || abbr,
      count: data.count,
      players: Array.from(data.players).slice(0, 3),
      color: TEAM_COLORS[abbr]?.primary || "#666",
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return NextResponse.json({
    team,
    teamName: TEAM_NAMES[team] || team,
    rosterNarrative: ROSTER_NARRATIVES[team] || null,
    rosterCount: rosterPlayers,
    homegrownCount: homegrownPlayers,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    originCount: origins,
    tradeCount: trades,
    earliestOrigin: earliestYear,
    nodes,
    edges,
    avgExperience,
    experienceRank,
    teamColors: TEAM_COLORS[team] || { primary: "#666", secondary: "#333" },
    tradePartners,
  });
}
