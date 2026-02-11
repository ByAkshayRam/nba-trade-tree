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
  assetsGivenUp?: AcquisitionNode[];
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
    "Dillon Jones": { order: 14, category: "bench" },
    "Tyler Kolek": { order: 15, category: "bench" },
    "Ariel Hukporti": { order: 16, category: "bench" },
    "Jordan Clarkson": { order: 17, category: "bench" },
    "Landry Shamet": { order: 18, category: "bench" },
    "Mohamed Diawara": { order: 20, category: "two-way" },
    "Trey Jemison III": { order: 21, category: "two-way" },
    "Kevin McCullar Jr.": { order: 22, category: "two-way" },
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
    "Ben Saraf": { order: 20, category: "two-way" },
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
    "Liam McNeeley": { order: 20, category: "two-way" },
    "Antonio Reeves": { order: 21, category: "two-way" },
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
    "Bobi Klintman": { order: 20, category: "two-way" },
    "Daniss Jenkins": { order: 21, category: "two-way" },
  },
  IND: {
    "Tyrese Haliburton": { order: 1, category: "starter" },
    "Andrew Nembhard": { order: 2, category: "starter" },
    "Pascal Siakam": { order: 3, category: "starter" },
    "Ivica Zubac": { order: 4, category: "starter" },
    "Aaron Nesmith": { order: 5, category: "starter" },
    "T.J. McConnell": { order: 10, category: "bench" },
    "Obi Toppin": { order: 11, category: "bench" },
    "Jarace Walker": { order: 12, category: "bench" },
    "Ben Sheppard": { order: 13, category: "bench" },
    "Johnny Furphy": { order: 14, category: "bench" },
    "Kam Jones": { order: 15, category: "bench" },
    "Kobe Brown": { order: 20, category: "two-way" },
  },
  MIA: {
    "Bam Adebayo": { order: 1, category: "starter" },
    "Tyler Herro": { order: 2, category: "starter" },
    "Andrew Wiggins": { order: 3, category: "starter" },
    "Terry Rozier": { order: 4, category: "starter" },
    "Jaime Jaquez Jr.": { order: 5, category: "starter" },
    "Norman Powell": { order: 10, category: "bench" },
    "Nikola Jovic": { order: 11, category: "bench" },
    "Kel'el Ware": { order: 12, category: "bench" },
    "Pelle Larsson": { order: 13, category: "bench" },
    "Davion Mitchell": { order: 14, category: "bench" },
    "Simone Fontecchio": { order: 15, category: "bench" },
    "Kasparas Jakucionis": { order: 16, category: "bench" },
    "Keshad Johnson": { order: 20, category: "two-way" },
    "Dru Smith": { order: 21, category: "two-way" },
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
    "Thanasis Antetokounmpo": { order: 20, category: "two-way" },
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
    "Colin Castleton": { order: 20, category: "two-way" },
  },
  PHI: {
    "Joel Embiid": { order: 1, category: "starter" },
    "Tyrese Maxey": { order: 2, category: "starter" },
    "Paul George": { order: 3, category: "starter" },
    "Kelly Oubre Jr.": { order: 4, category: "starter" },
    "Andre Drummond": { order: 5, category: "starter" },
    "Kyle Lowry": { order: 10, category: "bench" },
    "Quentin Grimes": { order: 11, category: "bench" },
    "Dalen Terry": { order: 12, category: "bench" },
    "Trendon Watford": { order: 13, category: "bench" },
    "MarJon Beauchamp": { order: 14, category: "bench" },
    "Justin Edwards": { order: 15, category: "bench" },
    "Adem Bona": { order: 16, category: "bench" },
    "VJ Edgecombe": { order: 17, category: "bench" },
    "Johni Broome": { order: 18, category: "bench" },
    "Jabari Walker": { order: 19, category: "bench" },
    "Patrick Baldwin Jr.": { order: 20, category: "two-way" },
    "Dominick Barlow": { order: 21, category: "two-way" },
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
    "Jamison Battle": { order: 20, category: "two-way" },
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
    "Sharife Cooper": { order: 17, category: "bench" },
    "Anthony Gill": { order: 18, category: "bench" },
    "Skal Labissiere": { order: 19, category: "bench" },
    "Keshon Gilbert": { order: 20, category: "two-way" },
    "Tristan Vukcevic": { order: 21, category: "two-way" },
    "Jamir Watkins": { order: 22, category: "two-way" },
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
  NYK: { primary: "#006BB6", secondary: "#F58426" },
  OKC: { primary: "#007AC1", secondary: "#EF3B24" },
  WAS: { primary: "#002B5C", secondary: "#E31837" },
  // Eastern Conference
  ATL: { primary: "#E03A3E", secondary: "#C1D32F" },
  BKN: { primary: "#000000", secondary: "#FFFFFF" },
  CHA: { primary: "#1D1160", secondary: "#00788C" },
  CHI: { primary: "#CE1141", secondary: "#000000" },
  CLE: { primary: "#860038", secondary: "#FDBB30" },
  DET: { primary: "#C8102E", secondary: "#1D42BA" },
  IND: { primary: "#002D62", secondary: "#FDBB30" },
  MIA: { primary: "#98002E", secondary: "#F9A01B" },
  MIL: { primary: "#00471B", secondary: "#EEE1C6" },
  ORL: { primary: "#0077C0", secondary: "#C4CED4" },
  PHI: { primary: "#006BB6", secondary: "#ED174C" },
  TOR: { primary: "#CE1141", secondary: "#000000" },
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
  IND: "The Haliburton trade was a heist. Sacramento gave up a future All-Star for Sabonis and picks — and Indiana hasn't looked back. But the roster evolved: Myles Turner went to Milwaukee at the deadline; Ivica Zubac arrived from the Clippers. Pascal Siakam remains the veteran anchor. This team plays fast, fun basketball.",
  MIA: "Heat Culture endured Jimmy Butler's departure. At the deadline, Butler went to Golden State; Andrew Wiggins and Norman Powell came to South Beach. Bam Adebayo runs the show now. Tyler Herro scores in bunches. Jaime Jaquez Jr. (2023 All-Rookie) embodies the culture. It's a new era, but the Miami ethos remains: compete, develop, win.",
  MIL: "Giannis remains, but everything else changed. Damian Lillard was traded at the deadline for Cam Thomas and Myles Turner — a bet on youth and rim protection over the aging superstar backcourt. Kyle Kuzma adds scoring. Bobby Portis is the heart. This is Milwaukee 3.0: built around Giannis, but completely reimagined.",
  ORL: "Paolo Banchero at #1 was just the start. Franz Wagner emerged as a star. Then came the deadline blockbuster: Desmond Bane from Memphis gives them a proven playoff scorer. Jalen Suggs locks down defensively. Wendell Carter Jr. — acquired from Chicago via the Dwight Howard chain — anchors inside. Orlando is no longer rebuilding; they're contending.",
  PHI: "Trust The Process finally produced its star: Joel Embiid, drafted #3 in 2014, is now an MVP. Tyrese Maxey (#21, 2020) became an All-Star. Paul George arrived in free agency. The bench got deeper at the deadline with Quentin Grimes. When healthy, this is the East's most talented starting five.",
  TOR: "The Raptors made their move: Brandon Ingram arrived at the deadline from New Orleans, giving Scottie Barnes a true co-star. RJ Barrett came home via Knicks trade. Immanuel Quickley runs the point. Jakob Poeltl returned from San Antonio. Gradey Dick shoots the lights out. Toronto is building something special — Canadian stars, championship culture.",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamAbbr: string }> }
) {
  const { teamAbbr } = await params;
  const team = teamAbbr.toUpperCase();
  
  // Support both local dev (data outside app/) and Vercel (data inside app/)
  let dataDir = path.join(process.cwd(), "data", "acquisition-trees");
  if (!fs.existsSync(dataDir)) {
    dataDir = path.join(process.cwd(), "..", "data", "acquisition-trees");
  }
  
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
    
    // Process children
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
  
  // Second pass: Find the oldest node in each roster player's chain
  // Only mark origins for chains that include at least one trade
  const originNodeKeys = new Set<string>();
  
  for (const [rosterId, nodeKeys] of rosterToNodes.entries()) {
    // Skip chains that don't have any trades (direct signings, waivers, etc.)
    if (!rosterHasTrades.get(rosterId)) {
      continue;
    }
    
    let oldestKey: string | null = null;
    let oldestDate = Infinity;
    
    for (const nodeKey of nodeKeys) {
      const node = nodeMap.get(nodeKey);
      if (node && node.data.date) {
        const dateMs = parseDate(node.data.date);
        if (dateMs < oldestDate) {
          oldestDate = dateMs;
          oldestKey = nodeKey;
        }
      }
    }
    
    if (oldestKey) {
      originNodeKeys.add(oldestKey);
    }
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
    
    // Homegrown = no trade history (drafted or signed directly)
    rosterNode.data.isHomegrown = !hasTrades;
    
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
    teamColors: TEAM_COLORS[team] || { primary: "#666", secondary: "#333" },
  });
}
