"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { trackPlayerClick, trackExport } from "@/lib/analytics";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  ConnectionMode,
  Node,
  Edge,
  Handle,
  NodeProps,
  useReactFlow,
  ReactFlowProvider,
  useReactFlow as useFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import { toJpeg } from "html-to-image";

const elk = new ELK();

interface NodeData {
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
  isHighlighted?: boolean;
  isDimmed?: boolean;
  [key: string]: unknown;
}

interface SelectedPlayerInfo {
  id: string;
  name: string;
  isRosterPlayer: boolean;
  acquisitionType?: string;
  pathNodes: Array<{
    id: string;
    name: string;
    type: string;
    date?: string;
    acquisitionType?: string;
    tradePartner?: string;
    isOrigin?: boolean;
  }>;
}

interface TeamAcquisitionTreeProps {
  nodes: Array<{
    id: string;
    type: string;
    data: NodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    animated?: boolean;
  }>;
  teamColors: {
    primary: string;
    secondary: string;
  };
  teamName?: string;
  onPlayerSelect?: (player: SelectedPlayerInfo | null) => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric", 
    year: "numeric",
    timeZone: "UTC"
  });
}

// ESPN Player ID mapping
const NBA_PLAYER_IDS: Record<string, string> = {
  // Boston Celtics
  "Jayson Tatum": "1628369",
  "Jaylen Brown": "1627759",
  "Derrick White": "1628401",
  "Kristaps Porzingis": "204001",
  "Jrue Holiday": "201950",
  "Payton Pritchard": "1630202",
  // Atlanta Hawks
  "Zaccharie Risacher": "1642258",
  "Jalen Johnson": "1630552",
  "Onyeka Okongwu": "1630168",
  "CJ McCollum": "203468",
  "Buddy Hield": "1627741",
  "Dyson Daniels": "1630700",
  "Jonathan Kuminga": "1630228",
  "Nickeil Alexander-Walker": "1629638",
  "Gabe Vincent": "1629216",
  "Danilo Gallinari": "201568",
  "Mouhamed Gueye": "1631243",
  "Nikola Durisic": "1642365",
  "Asa Newell": "1642854",
  "Christian Koloko": "1631132",
  "Caleb Houstan": "1631216",
  "Jock Landale": "1629111",
  // Indiana Pacers
  "Tyrese Haliburton": "1630169",
  "Pascal Siakam": "1627783",
  "Bennedict Mathurin": "1631097",
  // Cleveland Cavaliers
  "Donovan Mitchell": "1628378",
  "Darius Garland": "1629636",
  "Evan Mobley": "1630596",
  "Jarrett Allen": "1628386",
  // Detroit Pistons
  "Cade Cunningham": "1630595",
  "Jalen Duren": "1631105",
  "Tobias Harris": "202699",
  // Miami Heat
  "Bam Adebayo": "1628389",
  "Tyler Herro": "1629639",
  "Terry Rozier": "1626179",
  // Milwaukee Bucks
  "Giannis Antetokounmpo": "203507",
  "Damian Lillard": "203081",
  // New York Knicks
  "Jalen Brunson": "1628973",
  "Karl-Anthony Towns": "1626157",
  "Mikal Bridges": "1628969",
  "OG Anunoby": "1628384",
  "Josh Hart": "1628404",
  // Orlando Magic
  "Paolo Banchero": "1631094",
  "Franz Wagner": "1630532",
  "Jalen Suggs": "1630591",
  "Wendell Carter Jr.": "1628976",
  // Philadelphia 76ers
  "Joel Embiid": "203954",
  "Tyrese Maxey": "1630178",
  "Paul George": "202331",
  "Kelly Oubre Jr.": "1626162",
  "Andre Drummond": "203083",
  "Kyle Lowry": "200768",
  "Quentin Grimes": "1629656",
  "Trendon Watford": "1630570",
  "Dalen Terry": "1631207",
  "Justin Edwards": "1642348",
  "Adem Bona": "1641737",
  "VJ Edgecombe": "1642845",
  "Johni Broome": "1641780",
  "Charles Bassey": "1629646",
  "Patrick Baldwin Jr.": "1631116",
  "Dominick Barlow": "1631230",
  "Jabari Walker": "1631133",
  "MarJon Beauchamp": "1630699",
  "Caleb Martin": "1628997",
  // Toronto Raptors
  "Scottie Barnes": "1630567",
  "RJ Barrett": "1629628",
  "Brandon Ingram": "1627742",
  "Jakob Poeltl": "1627751",
  "Immanuel Quickley": "1630193",
  "Gradey Dick": "1641711",
  "Ja'Kobe Walter": "1642266",
  "Garrett Temple": "202066",
  "Jonathan Mogbo": "1642367",
  "Jamal Shead": "1642347",
  "Trayce Jackson-Davis": "1631218",
  "Collin Murray-Boyles": "1642867",
  "Jamison Battle": "1642419",
  "Sandro Mamukelashvili": "1630572",
  "Chucky Hepburn": "1642935",
  "Alijah Martin": "1642918",
  "A.J. Lawson": "1630639",
  "Bruce Brown": "1628971",
  "Kelly Olynyk": "203482",
  "Jalen McDaniels": "1629667",
  // Washington Wizards
  "Alex Sarr": "1642259",
  "Anthony Davis": "203076",
  "Anthony Gill": "1630264",
  "Bilal Coulibaly": "1641731",
  "Bub Carrington": "1642267",
  "Cam Whitmore": "1641715",
  "D'Angelo Russell": "1626156",
  "Jaden Hardy": "1630702",
  "Jamir Watkins": "1642364",
  "Justin Champagnie": "1630551",
  "Kyshawn George": "1642273",
  "Sharife Cooper": "1630536",
  "Skal Labissiere": "1627746",
  "Trae Young": "1629027",
  "Tre Johnson": "1642848",
  "Tristan Vukcevic": "1641774",
  "Will Riley": "1642860",
  "Kyle Kuzma": "1628398",
  "Russell Westbrook": "201566",
  "John Wall": "202322",
  "Jordan Poole": "1629673",
  "Chris Paul": "101108",
  "Bradley Beal": "203078",
  "Corey Kispert": "1630557",
  "Khris Middleton": "203114",
  "AJ Johnson": "1642358",
  "Saddiq Bey": "1630180",
  "Malaki Branham": "1631103",
  // DAL
  "Brandon Williams": "1630314",
  "Cooper Flagg": "1642843",
  "Daniel Gafford": "1629655",
  "Dereck Lively II": "1641726",
  "Dwight Powell": "203939",
  "Klay Thompson": "202691",
  "Kyrie Irving": "202681",
  "Marvin Bagley III": "1628963",
  "Max Christie": "1631108",
  "Miles Kelly": "1642939",
  "Moussa Cisse": "1630619",
  "Naji Marshall": "1630230",
  "P.J. Washington": "1629023",
  "Ryan Nembhard": "1642948",
  "Tyus Jones": "1626145",
  // DEN
  "Aaron Gordon": "203932",
  "Cameron Johnson": "1629661",
  "Christian Braun": "1631128",
  "Curtis Jones": "1642938",
  "DaRon Holmes II": "1641747",
  "Jalen Pickett": "1629618",
  "Jamal Murray": "1627750",
  "Jonas Valanciunas": "202685",
  "Julian Strawther": "1631124",
  "Nikola Jokic": "203999",
  "Peyton Watson": "1631212",
  "Spencer Jones": "1642461",
  "Tamar Bates": "1642926",
  "Tim Hardaway Jr.": "203501",
  "Zeke Nnaji": "1630192",
  // GSW
  "Al Horford": "201143",
  "Brandin Podziemski": "1641764",
  "De'Anthony Melton": "1629001",
  "Draymond Green": "203110",
  "Gary Payton II": "1627780",
  "Gui Santos": "1630611",
  "Jimmy Butler III": "202710",
  "Malevy Leons": "1642502",
  "Moses Moody": "1630541",
  "Quinten Post": "1642366",
  "Seth Curry": "203552",
  "Stephen Curry": "201939",
  "Pat Spencer": "1630311",
  "Will Richard": "1642954",
  // HOU
  "Aaron Holiday": "1628988",
  "Alperen Sengun": "1630578",
  "Amen Thompson": "1641708",
  "Clint Capela": "203991",
  "Dorian Finney-Smith": "1627827",
  "Fred VanVleet": "1627832",
  "Isaiah Crawford": "1642384",
  "JD Davison": "1631120",
  "Jabari Smith Jr.": "1631095",
  "Jae'Sean Tate": "1630256",
  "Jeff Green": "201145",
  "Josh Okogie": "1629006",
  "Kevin Durant": "201142",
  "Reed Sheppard": "1642263",
  "Steven Adams": "203500",
  "Tari Eason": "1631106",
  "Tristen Newton": "1641803",
  // LAC
  "Bogdan Bogdanovic": "203992",
  "Brook Lopez": "201572",
  "Cam Christie": "1642353",
  "Dalano Banton": "1630625",
  "Derrick Jones Jr.": "1627884",
  "Isaiah Jackson": "1630543",
  "John Collins": "1628381",
  "Jordan Miller": "1641757",
  "Kawhi Leonard": "202695",
  "Kobe Sanders": "1642920",
  "Kris Dunn": "1627739",
  "Nicolas Batum": "201587",
  "TyTy Washington Jr.": "1631102",
  "Yanic Konan Niederhauser": "1642949",
  // LAL
  "Adou Thiero": "1642876",
  "Austin Reaves": "1630559",
  "Bronny James": "1642355",
  "Chris Manon": "1643024",
  "Dalton Knecht": "1642261",
  "Deandre Ayton": "1629028",
  "Drew Timme": "1631166",
  "Jake LaRavia": "1631222",
  "Jarred Vanderbilt": "1629020",
  "Jaxson Hayes": "1629637",
  "Kobe Bufkin": "1641723",
  "LeBron James": "2544",
  "Luka Doncic": "1629029",
  "Luke Kennard": "1628379",
  "Marcus Smart": "203935",
  "Maxi Kleber": "1628467",
  "Nick Smith Jr.": "1641733",
  "Rui Hachimura": "1629060",
  // MEM
  "Brandon Clarke": "1629634",
  "Cam Spencer": "1642285",
  "Cedric Coward": "1642907",
  "GG Jackson": "1641713",
  "Ja Morant": "1629630",
  "Javon Small": "1642914",
  "Jaylen Wells": "1642377",
  "Kentavious Caldwell-Pope": "203484",
  "Kyle Anderson": "203937",
  "Olivier-Maxence Prosper": "1641765",
  "Santi Aldama": "1630583",
  "Scotty Pippen Jr.": "1630590",
  "Taylor Hendricks": "1641707",
  "Ty Jerome": "1629660",
  "Walter Clayton Jr.": "1642383",
  "Zach Edey": "1641744",
  // MIN
  "Anthony Edwards": "1630162",
  "Ayo Dosunmu": "1630245",
  "Bones Hyland": "1630538",
  "Donte DiVincenzo": "1628978",
  "Enrique Freeman": "1642402",
  "Jaden McDaniels": "1630183",
  "Jaylen Clark": "1641740",
  "Joan Beringer": "1642866",
  "Joe Ingles": "204060",
  "Johnny Juzang": "1630548",
  "Julian Phillips": "1641763",
  "Julius Randle": "203944",
  "Naz Reid": "1629675",
  "Rocco Zikarsky": "1642911",
  "Rudy Gobert": "203497",
  "Terrence Shannon Jr.": "1630545",
  // NOP
  "Bryce McGowens": "1631121",
  "DeAndre Jordan": "201599",
  "Dejounte Murray": "1627749",
  "Derik Queen": "1642852",
  "Herbert Jones": "1630529",
  "Hunter Dickinson": "1630621",
  "Jeremiah Fears": "1642847",
  "Jordan Hawkins": "1641722",
  "Karlo Matkovic": "1631255",
  "Kevon Looney": "1626172",
  "Micah Peavy": "1642877",
  "Trey Alexander": "1641725",
  "Trey Murphy III": "1630530",
  "Yves Missi": "1642274",
  "Zion Williamson": "1629627",
  // OKC
  "Aaron Wiggins": "1630598",
  "Ajay Mitchell": "1642349",
  "Alex Caruso": "1627936",
  "Branden Carlson": "1642382",
  "Brooks Barnhizer": "1642964",
  "Buddy Boeheim": "1631205",
  "Cason Wallace": "1641717",
  "Chet Holmgren": "1631096",
  "Isaiah Hartenstein": "1628392",
  "Isaiah Joe": "1630198",
  "Jalen Williams": "1631114",
  "Jared McCain": "1642272",
  "Jaylin Williams": "1631119",
  "Kenrich Williams": "1629026",
  "Luguentz Dort": "1629652",
  "Nikola Topic": "1642260",
  "Shai Gilgeous-Alexander": "1628983",
  "Thomas Sorber": "1642850",
  // PHX
  "Amir Coffey": "1629599",
  "Cole Anthony": "1630175",
  "Collin Gillespie": "1631221",
  "Devin Booker": "1626164",
  "Dillon Brooks": "1628415",
  "Grayson Allen": "1628960",
  "Haywood Highsmith": "1629312",
  "Isaiah Livers": "1630587",
  "Jalen Green": "1630224",
  "Jamaree Bouyea": "1631123",
  "Jordan Goodwin": "1630692",
  "Khaman Maluach": "1642863",
  "Koby Brea": "1642886",
  "Mark Williams": "1631109",
  "Oso Ighodaro": "1642345",
  "Rasheer Fleming": "1642853",
  "Royce O'Neale": "1626220",
  "Ryan Dunn": "1642346",
  // POR
  "Blake Wesley": "1631104",
  "Caleb Love": "1631126",
  "Deni Avdija": "1630166",
  "Donovan Clingan": "1642270",
  "Javonte Cooke": "1631451",
  "Jerami Grant": "203924",
  "Kris Murray": "1631200",
  "Rayan Rupert": "1641712",
  "Robert Williams III": "1629057",
  "Scoot Henderson": "1630703",
  "Shaedon Sharpe": "1631101",
  "Sidy Cissoko": "1631321",
  "Toumani Camara": "1641739",
  "Vit Krejci": "1630249",
  "Yang Hansen": "1642905",
  // SAC
  "Daeqwon Plowden": "1631342",
  "De'Andre Hunter": "1629631",
  "DeMar DeRozan": "201942",
  "Devin Carter": "1642269",
  "Domantas Sabonis": "1627734",
  "Doug McDermott": "203926",
  "Drew Eubanks": "1629234",
  "Dylan Cardwell": "1642928",
  "Isaiah Stevens": "1641815",
  "Keegan Murray": "1631099",
  "Malik Monk": "1628370",
  "Maxime Raynaud": "1642875",
  "Nique Clifford": "1642363",
  "Precious Achiuwa": "1630173",
  "Zach LaVine": "203897",
  // SAS
  "Bismack Biyombo": "202687",
  "Carter Bryant": "1642868",
  "David Jones Garcia": "1642357",
  "De'Aaron Fox": "1628368",
  "Devin Vassell": "1630170",
  "Dylan Harper": "1642844",
  "Harrison Barnes": "203084",
  "Harrison Ingram": "1631127",
  "Jordan McLaughlin": "1629162",
  "Julian Champagnie": "1630577",
  "Keldon Johnson": "1629640",
  "Lindy Waters III": "1630322",
  "Luke Kornet": "1628436",
  "Stanley Umude": "1630649",
  "Stephon Castle": "1642264",
  "Victor Wembanyama": "1641705",
  // UTA
  "Ace Bailey": "1642846",
  "Brice Sensabaugh": "1641729",
  "Cody Williams": "1642262",
  "Elijah Harkless": "1641989",
  "Isaiah Collier": "1642268",
  "Jaren Jackson Jr.": "1628991",
  "John Konchar": "1629723",
  "Jusuf Nurkic": "203994",
  "Kevin Love": "201567",
  "Keyonte George": "1641718",
  "Kyle Filipowski": "1642271",
  "Lauri Markkanen": "1628374",
  "Oscar Tshiebwe": "1631131",
  "Svi Mykhailiuk": "1629004",
  "Vince Williams Jr.": "1631246",
  "Walker Kessler": "1631117",
  // Additional players (auto-added for headshot coverage)
  // Name aliases
  "Cam Johnson": "1629661",
  "Carlton Carrington": "1642267",
  "Jusuf Nurkić": "203994",
  "AJ Green": "1631260",
  "Aaron Nesmith": "1630174",
  "Al Jefferson": "2744",
  "Al-Farouq Aminu": "202329",
  "Alec Burks": "202692",
  "Alex Antetokounmpo": "1630828",
  "Alex Toohey": "1642893",
  "Amari Williams": "1642873",
  "Andre Jackson Jr.": "1641748",
  "Andrew Nembhard": "1629614",
  "Andrew Wiggins": "203952",
  "Anfernee Simons": "1629014",
  "Anthony Black": "1641710",
  "Antoine Walker": "951",
  "Antonio Reeves": "1641810",
  "Ariel Hukporti": "1630574",
  "Ausar Thompson": "1641709",
  "Baron Davis": "1884",
  "Baylor Scheierman": "1631248",
  "Ben Saraf": "1642879",
  "Ben Sheppard": "1641767",
  "Blake Hinson": "1642396",
  "Bobby Portis": "1626171",
  "Bobi Klintman": "1641752",
  "Bojan Bogdanovic": "202711",
  "Brandan Wright": "201148",
  "Brandon Jennings": "201943",
  "Brandon Miller": "1641706",
  "Cam Reddish": "1629629",
  "Cam Thomas": "1630560",
  "Caris LeVert": "1627747",
  "Chaney Johnson": "1643052",
  "Chaz Lanier": "1642404",
  "Chimezie Metu": "1629002",
  "Chris Boucher": "1628449",
  "Chris Duarte": "1630537",
  "Christian Wood": "1626174",
  "Coby White": "1629632",
  "Cody Zeller": "203469",
  "Colby Jones": "1641732",
  "Colin Castleton": "1630658",
  "Collin Sexton": "1629012",
  "Corey Brewer": "201147",
  "Craig Porter Jr.": "1641854",
  "Dahntay Jones": "2561",
  "Damian Jones": "1627745",
  "Daniel Theis": "1628464",
  "Daniss Jenkins": "1642450",
  "Danny Granger": "101122",
  "Danny Green": "201980",
  "Danny Wolf": "1642874",
  "Dante Exum": "203957",
  "Dario Saric": "203967",
  "Darius Bazley": "1629647",
  "Darius Miller": "203121",
  "David Roddy": "1631223",
  "Davion Mitchell": "1630558",
  "Davis Bertans": "202722",
  "Day'Ron Sharpe": "1630549",
  "DeMarcus Cousins": "202326",
  "Dean Wade": "1629731",
  "Delon Wright": "1626153",
  "Dennis Schroder": "203471",
  "Dennis Smith Jr.": "1628372",
  "Desmond Bane": "1630217",
  "Didi Louzada": "1629712",
  "Dillon Jones": "1641794",
  "Drake Powell": "1642962",
  "Dru Smith": "1630696",
  "Duncan Robinson": "1629130",
  "Duop Reath": "1641871",
  "Dwight Howard": "2730",
  "E.J. Liddell": "1630604",
  "Egor Demin": "1642856",
  "Eric Bledsoe": "202339",
  "Ethan Thompson": "1630679",
  "Gabriele Procida": "1630629",
  "Gary Harris": "203914",
  "Gary Trent Jr.": "1629018",
  "George Hill": "201588",
  "Georges Niang": "1627777",
  "Gerald Green": "101123",
  "Goga Bitadze": "1629048",
  "Goran Dragic": "201609",
  "Grant Williams": "1629684",
  "Guerschon Yabusele": "1627824",
  "Hassan Whiteside": "202355",
  "Hugo Gonzalez": "1642864",
  "Isaac Okoro": "1630171",
  "Isaiah Stewart": "1630191",
  "Isaiah Thomas": "202738",
  "Ivica Zubac": "1627826",
  "JaMychal Green": "203210",
  "Jacob Evans": "1628980",
  "Jaden Ivey": "1631093",
  "Jae Crowder": "203109",
  "Jahmai Mashack": "1642942",
  "Jahmir Young": "1642443",
  "Jaime Jaquez Jr.": "1631170",
  "Jalen Hood-Schifino": "1641720",
  "Jalen Lecque": "1629665",
  "Jalen Smith": "1630188",
  "Jalen Wilson": "1630592",
  "Jamal Cain": "1631288",
  "Jameer Nelson": "2749",
  "James Harden": "201935",
  "James Johnson": "201166",
  "James Nnaji": "1641762",
  "James Wiseman": "1630164",
  "Jarace Walker": "1641716",
  "Jared Butler": "1630215",
  "Jarrett Culver": "1629633",
  "Jase Richardson": "1642859",
  "Jason Terry": "1891",
  "Javonte Green": "1629750",
  "Jay Huff": "1630643",
  "Jaylon Tyson": "1642281",
  "Jeremy Lamb": "203087",
  "Jeremy Sochan": "1631110",
  "Jericho Sims": "1630579",
  "Jett Howard": "1641724",
  "Jevon Carter": "1628975",
  "John Tonje": "1642910",
  "Johnny Furphy": "1642277",
  "Jonathan Isaac": "1628371",
  "Jordan Bell": "1628395",
  "Jordan Clarkson": "203903",
  "Jordan Nwora": "1629670",
  "Jordan Walsh": "1641775",
  "Jose Alvarado": "1630631",
  "Josh Giddey": "1630581",
  "Josh Green": "1630182",
  "Josh Minott": "1631169",
  "Josh Richardson": "1626196",
  "Juan Toscano-Anderson": "1629308",
  "Juancho Hernangomez": "1627823",
  "Justin Holiday": "203200",
  "Justin Jackson": "1628382",
  "Justise Winslow": "1626159",
  "Jérôme Moïso": "2040",
  "KJ Martin": "1630231",
  "Kadary Richmond": "1642955",
  "Kam Jones": "1642880",
  "Kasparas Jakucionis": "1642857",
  "Keita Bates-Diop": "1628966",
  "Kel'el Ware": "1642276",
  "Kelenna Azubuike": "2557",
  "Kemba Walker": "202689",
  "Kendrick Nunn": "1629134",
  "Kendrick Perkins": "2570",
  "Keon Ellis": "1631165",
  "Keon Johnson": "1630553",
  "Keshad Johnson": "1642352",
  "Keshon Gilbert": "1642933",
  "Kevin Garnett": "708",
  "Kevin Huerter": "1628989",
  "Kevin Knox": "1628995",
  "Kevin McCullar Jr.": "1641755",
  "Kevin Porter Jr.": "1629645",
  "Khem Birch": "203920",
  "Kira Lewis Jr.": "1630184",
  "Kobe Brown": "1641738",
  "Kon Knueppel": "1642851",
  "Kyle Korver": "2594",
  "L.J. Cryer": "1643018",
  "LaMelo Ball": "1630163",
  "Lachlan Olbrich": "1642950",
  "Landry Shamet": "1629013",
  "Larry Nance Jr.": "1626204",
  "Lawson Lovering": "1643133",
  "Leandro Bolmaro": "1630195",
  "Leonard Miller": "1631159",
  "Liam McNeeley": "1642862",
  "Lonzo Ball": "1628366",
  "Lou Williams": "101150",
  "Luka Garza": "1630568",
  "Mac McClung": "1630644",
  "Malcolm Brogdon": "1627763",
  "Malik Beasley": "1627736",
  "Marc Gasol": "201188",
  "Marcus Morris": "202694",
  "Marcus Sasser": "1631204",
  "Matas Buzelis": "1641824",
  "Maurice Harkless": "203090",
  "Max Shulga": "1642917",
  "Max Strus": "1629622",
  "Micah Potter": "1630695",
  "Michael Porter Jr.": "1629008",
  "Mike Conley": "201144",
  "Mike Muscala": "203488",
  "Miles Bridges": "1628970",
  "Miles McBride": "1630540",
  "Mitchell Robinson": "1629011",
  "Mohamed Diawara": "1642885",
  "Montrezl Harrell": "1626149",
  "Moritz Wagner": "1629021",
  "Moses Brown": "1629650",
  "Moussa Diabate": "1631217",
  "Myles Turner": "1626167",
  "Myron Gardner": "1642066",
  "Nae'Qwan Tomlin": "1641772",
  "Nassir Little": "1629642",
  "Nate Robinson": "101126",
  "Neemias Queta": "1629674",
  "Nerlens Noel": "203457",
  "Nic Claxton": "1629651",
  "Nick Richards": "1630208",
  "Nigel Hayes-Davis": "1628502",
  "Nikola Jovic": "1631107",
  "Nikola Vucevic": "202696",
  "Noa Essengue": "1642855",
  "Noah Clowney": "1641730",
  "Noah Penda": "1642869",
  "Noah Vonleh": "203943",
  "Nolan Traore": "1642849",
  "Norman Powell": "1626181",
  "Obi Toppin": "1630167",
  "Ochai Agbaji": "1630534",
  "Omari Spellman": "1629016",
  "Omri Casspi": "201956",
  "Orlando Robinson": "1631115",
  "Otto Porter Jr.": "203490",
  "Ousmane Dieng": "1631172",
  "PJ Hall": "1641790",
  "PJ Tucker": "200782",
  "Pacome Dadiet": "1642359",
  "Pat Connaughton": "1626192",
  "Patrick Beverley": "201976",
  "Patrick Williams": "1630172",
  "Pau Gasol": "2200",
  "Paul Pierce": "1718",
  "Paul Reed": "1630194",
  "Pelle Larsson": "1641796",
  "Pete Nance": "1631250",
  "Quenton Jackson": "1631245",
  "RJ Hampton": "1630181",
  "RJ Luis": "1642961",
  "Raef LaFrentz": "1046",
  "Richaun Holmes": "1626158",
  "Ricky Rubio": "201937",
  "Rob Dillingham": "1642265",
  "Robert Covington": "203496",
  "Rodney Hood": "203918",
  "Rodney Rogers": "246",
  "Romeo Langford": "1629641",
  "Ron Harper Jr.": "1631199",
  "Ron Holland II": "1641842",
  "Rudy Gay": "200752",
  "Ryan Gomes": "101127",
  "Ryan Kalkbrenner": "1641750",
  "Ryan Rollins": "1631157",
  "Sam Dekker": "1626155",
  "Sam Hauser": "1630573",
  "Sam Merrill": "1630241",
  "Sebastian Telfair": "2560",
  "Serge Ibaka": "201586",
  "Shabazz Napier": "203894",
  "Shareef Abdur-Rahim": "165",
  "Simone Fontecchio": "1631323",
  "Sion James": "1642883",
  "Spencer Dinwiddie": "203915",
  "T.J. McConnell": "204456",
  "Taelon Peter": "1643007",
  "Taurean Prince": "1627752",
  "Terance Mann": "1629611",
  "Thanasis Antetokounmpo": "203648",
  "Theo Ratliff": "680",
  "Thomas Bryant": "1628418",
  "Tidjane Salaun": "1642275",
  "Tomas Satoransky": "203107",
  "Tony Bradley": "1628396",
  "Tony Delk": "916",
  "Tre Jones": "1630200",
  "Tre Mann": "1630544",
  "Trevor Ariza": "2772",
  "Trey Jemison III": "1641998",
  "Tristan Thompson": "202684",
  "Tristan da Silva": "1641783",
  "Troy Bell": "2546",
  "Troy Daniels": "203584",
  "Tyler Kolek": "1642278",
  "Tyrese Proctor": "1642878",
  "Tyson Etienne": "1630623",
  "Ulrich Chomche": "1642279",
  "Vasilije Micić": "203995",
  "Victor Oladipo": "203506",
  "Vladislav Goldin": "1642884",
  "Wendell Moore Jr.": "1631111",
  "Wesley Iwundu": "1628411",
  "Xavier Tillman": "1630214",
  "Yuki Kawamura": "1642530",
  "Yuta Watanabe": "1629139",
  "Zach Collins": "1628380",
  "Zach Randolph": "2216",
  "Ziaire Williams": "1630533",
};

const ESPN_PLAYER_IDS: Record<string, string> = {
  // Boston Celtics
  "Nikola Vucevic": "6478",
  "Jayson Tatum": "4065648",
  "Jaylen Brown": "3917376",
  "Derrick White": "3078576",
  "Payton Pritchard": "4066354",
  "Sam Hauser": "4065804",
  "Neemias Queta": "4397424",
  "Jordan Walsh": "4683689",
  "Baylor Scheierman": "4593841",
  "Luka Garza": "4277951",
  "Ron Harper Jr.": "4397251",
  "Hugo Gonzalez": "5175647",
  "Max Shulga": "4701992",
  "Amari Williams": "4702745",
  "John Tonje": "4593043",
  // New York Knicks
  "Jose Alvarado": "4277869",
  "OG Anunoby": "3934719",
  "Mikal Bridges": "3147657",
  "Jalen Brunson": "3934672",
  "Jordan Clarkson": "2528426",
  "Pacome Dadiet": "5211983",
  "Mohamed Diawara": "5289900",
  "Josh Hart": "3062679",
  "Ariel Hukporti": "4871141",
  "Trey Jemison III": "4395623",
  "Dillon Jones": "4702159",
  "Tyler Kolek": "4433225",
  "Miles McBride": "4431823",
  "Kevin McCullar Jr.": "4411057",
  "Mitchell Robinson": "4351852",
  "Landry Shamet": "3914044",
  "Karl-Anthony Towns": "3136195",
  // Oklahoma City Thunder
  "Brooks Barnhizer": "4684208",
  "Buddy Boeheim": "4395676",
  "Branden Carlson": "4592435",
  "Alex Caruso": "2991350",
  "Luguentz Dort": "4397020",
  "Shai Gilgeous-Alexander": "4278073",
  "Isaiah Hartenstein": "4222252",
  "Chet Holmgren": "4433255",
  "Isaiah Joe": "4395702",
  "Jared McCain": "4683778",
  "Ajay Mitchell": "4900671",
  "Thomas Sorber": "5061603",
  "Nikola Topic": "5159925",
  "Cason Wallace": "4683692",
  "Aaron Wiggins": "4397183",
  "Jalen Williams": "4593803",
  "Jaylin Williams": "4432823",
  "Kenrich Williams": "3133626",
  "Chris Youngblood": "4706557",
  // Washington Wizards
  "Bub Carrington": "4845374",
  "Justin Champagnie": "4432907",
  "Sharife Cooper": "4432173",
  "Bilal Coulibaly": "5104155",
  "Anthony Davis": "6583",
  "Kyshawn George": "5174563",
  "Keshon Gilbert": "4585618",
  "Anthony Gill": "2581184",
  "Jaden Hardy": "4868423",
  "Tre Johnson": "5238230",
  "Skal Labissiere": "3936296",
  "Will Riley": "5144126",
  "D'Angelo Russell": "3136776",
  // Atlanta Hawks (Trae Young already above in WAS)
  "Dejounte Murray": "4351851",
  "De'Andre Hunter": "4395628",
  "Jalen Johnson": "4701230",
  "Clint Capela": "3102530",
  "Bogdan Bogdanovic": "3102531",
  "Onyeka Okongwu": "4431680",
  "Garrison Mathews": "4066259",
  "Kobe Bufkin": "4683027",
  "Zaccharie Risacher": "5211175",
  "David Roddy": "4433163",
  "Vit Krejci": "4433942",
  "Jock Landale": "3146557",
  "Christian Koloko": "4431778",
  "Mouhamed Gueye": "4712863",
  "Nikola Durisic": "5144067",
  "Caleb Houstan": "4433623",
  "Asa Newell": "4873201",
  "Kristaps Porzingis": "3593",
  "Danilo Gallinari": "6580",
  // Brooklyn Nets
  "Cam Thomas": "4432577",
  "Nic Claxton": "4395627",
  "Ben Simmons": "3907387",
  "Dennis Schroder": "2527997",
  "Dorian Finney-Smith": "3059318",
  "Day'Ron Sharpe": "4433246",
  "Trendon Watford": "4432162",
  "Keon Johnson": "4432159",
  "Dariq Whitehead": "4683023",
  "Jalen Wilson": "4433166",
  "Noah Clowney": "4683024",
  "Cameron Johnson": "3914041",
  // Charlotte Hornets
  "LaMelo Ball": "4432166",
  "Brandon Miller": "4683025",
  "Miles Bridges": "4278049",
  "Mark Williams": "4432896",
  "Tre Mann": "4432583",
  "Grant Williams": "4066262",
  "Nick Richards": "4395722",
  "Cody Martin": "4066390",
  "Vasilije Micic": "3102534",
  "Tidjane Salaun": "5185582",
  "Josh Green": "4432170",
  // Chicago Bulls
  "Zach LaVine": "3064514",
  "Coby White": "4395625",
  "Patrick Williams": "4432165",
  "Josh Giddey": "4432811",
  "Ayo Dosunmu": "4397189",
  "Torrey Craig": "2578185",
  "Jalen Smith": "4432164",
  "Jevon Carter": "3064290",
  "Matas Buzelis": "5185583",
  "Julian Phillips": "4683026",
  "Dalen Terry": "4433244",
  // Cleveland Cavaliers
  "Donovan Mitchell": "3908809",
  "Darius Garland": "4395626",
  "Evan Mobley": "4433218",
  "Jarrett Allen": "4066336",
  "Max Strus": "4066358",
  "Caris LeVert": "3064482",
  "Isaac Okoro": "4432163",
  "Georges Niang": "2579260",
  "Sam Merrill": "4066357",
  "Ty Jerome": "4066261",
  "Craig Porter Jr.": "4592438",
  "Jaylon Tyson": "4702162",
  // Detroit Pistons
  "Cade Cunningham": "4432168",
  "Jaden Ivey": "4433249",
  "Ausar Thompson": "4683028",
  "Jalen Duren": "4683011",
  "Tim Hardaway Jr.": "2579337",
  "Tobias Harris": "6440",
  "Malik Beasley": "4066261",
  "Isaiah Stewart": "4432167",
  "Simone Fontecchio": "3914049",
  "Ron Holland II": "5185584",
  "Marcus Sasser": "4432898",
  // Indiana Pacers
  "Tyrese Haliburton": "4432171",
  "Andrew Nembhard": "4433247",
  "Pascal Siakam": "3149673",
  "Myles Turner": "3064560",
  "Bennedict Mathurin": "4683012",
  "T.J. McConnell": "2579209",
  "Aaron Nesmith": "4432169",
  "Obi Toppin": "4065663",
  "Isaiah Jackson": "4432578",
  "Jarace Walker": "4683029",
  "Ben Sheppard": "4592437",
  "James Wiseman": "4432158",
  // Miami Heat
  "Jimmy Butler": "6430",
  "Bam Adebayo": "4066261",
  "Tyler Herro": "4395629",
  "Terry Rozier": "3056379",
  "Jaime Jaquez Jr.": "4433213",
  "Duncan Robinson": "3078436",
  "Nikola Jovic": "4871143",
  "Kevin Love": "3449",
  "Haywood Highsmith": "4065705",
  "Thomas Bryant": "3907498",
  "Kel'el Ware": "5185585",
  "Pelle Larsson": "4683793",
  // Milwaukee Bucks
  "Giannis Antetokounmpo": "3032977",
  "Damian Lillard": "6606",
  "Khris Middleton": "6609",
  "Brook Lopez": "3448",
  "Bobby Portis": "3064514",
  "Pat Connaughton": "2594922",
  "Gary Trent Jr.": "4277956",
  "MarJon Beauchamp": "4432894",
  "AJ Johnson": "5185586",
  "Andre Jackson Jr.": "4592439",
  "Ryan Rollins": "4433248",
  // Orlando Magic
  "Paolo Banchero": "4683013",
  "Franz Wagner": "4433219",
  "Jalen Suggs": "4433220",
  "Wendell Carter Jr.": "4278078",
  "Kentavious Caldwell-Pope": "2531367",
  "Cole Anthony": "4432161",
  "Gary Harris": "3032978",
  "Jonathan Isaac": "4066259",
  "Moritz Wagner": "3064291",
  "Goga Bitadze": "4066262",
  "Anthony Black": "4683030",
  "Jett Howard": "4683031",
  "Tristan da Silva": "4702163",
  // Philadelphia 76ers
  "Joel Embiid": "3059318",
  "Tyrese Maxey": "4432174",
  "Paul George": "4251",
  "Caleb Martin": "4066388",
  "Kelly Oubre Jr.": "3134880",
  "Kyle Lowry": "3012",
  "Andre Drummond": "6580",
  "Eric Gordon": "3213",
  "KJ Martin": "4432175",
  "Adem Bona": "4702164",
  "Ricky Council IV": "4592440",
  // Toronto Raptors
  "Scottie Barnes": "4433221",
  "RJ Barrett": "4395630",
  "Immanuel Quickley": "4395631",
  "Jakob Poeltl": "3102535",
  "Gradey Dick": "4683032",
  "Kelly Olynyk": "2489663",
  "Ochai Agbaji": "4433222",
  "Bruce Brown": "4066262",
  "Chris Boucher": "3074752",
  "Ja'Kobe Walter": "5185587",
  "Garrett Temple": "4257",
  "Jonathan Mogbo": "5185588",
  "Alex Sarr": "5160992",
  "Tristan Vukcevic": "4997537",
  "Jamir Watkins": "4606840",
  "Cam Whitmore": "5105592",
  "Trae Young": "4277905",
  // February 2026 Trade Deadline Additions
  // Atlanta Hawks (new core) - CORRECTED IDs from ESPN
  "CJ McCollum": "2490149",
  "Jonathan Kuminga": "4433247",
  "Buddy Hield": "2990984",
  // Brooklyn Nets
  "Michael Porter Jr.": "4278056",
  "Ziaire Williams": "4432579",
  "Terance Mann": "4066390",
  "Egor Demin": "5211984",
  "Nolan Traore": "5211985",
  "Danny Wolf": "4702165",
  "Drake Powell": "5144127",
  "Ben Saraf": "5238232",
  // Charlotte Hornets additions
  "Moussa Diabate": "4683789",
  "Malaki Branham": "4683790",
  "Kon Knueppel": "5174564",
  "Xavier Tillman": "4397108",
  "Liam McNeeley": "5175649",
  "Antonio Reeves": "4433023",
  // Chicago Bulls (new core)
  "Anfernee Simons": "4351852",
  "Rob Dillingham": "5175650",
  "Zach Collins": "3934673",
  "Tre Jones": "4432580",
  "Guerschon Yabusele": "3102536",
  "Noa Essengue": "5238233",
  "Leonard Miller": "4683791",
  "Collin Sexton": "4277956",
  // Cleveland Cavaliers
  "James Harden": "3992",
  "Dean Wade": "3914050",
  "Larry Nance Jr.": "2990984",
  "Keon Ellis": "4592441",
  "Tyrese Proctor": "5160993",
  // Detroit Pistons additions
  "Kevin Huerter": "3914045",
  "Paul Reed": "4397111",
  "Dario Saric": "3149676",
  "Wendell Moore Jr.": "4433250",
  "Bobi Klintman": "5104156",
  "Daniss Jenkins": "5174565",
  // Indiana Pacers additions
  "Ivica Zubac": "3149677",
  "Johnny Furphy": "5174566",
  "Kam Jones": "4702166",
  "Kobe Brown": "4433251",
  // Miami Heat (new core)
  "Andrew Wiggins": "3059319",
  "Norman Powell": "2596107",
  "Davion Mitchell": "4432581",
  "Kasparas Jakucionis": "5238234",
  "Keshad Johnson": "4702167",
  "Dru Smith": "4397112",
  // Milwaukee Bucks (new core)
  "Kyle Kuzma": "3134908",
  "Taurean Prince": "3149678",
  "Kevin Porter Jr.": "4396907",
  "AJ Green": "4432582",
  "Ousmane Dieng": "4871144",
  "Thanasis Antetokounmpo": "2528692",
  "Alex Antetokounmpo": "5061604",
  "Jericho Sims": "4397113",
  // Orlando Magic additions
  "Desmond Bane": "4432583",
  "Jase Richardson": "5144128",
  "Colin Castleton": "4433024",
  // Philadelphia 76ers additions
  "Quentin Grimes": "4433025",
  "Justin Edwards": "5175651",
  "VJ Edgecombe": "5175652",
  "Johni Broome": "4702168",
  "Jabari Walker": "4683792",
  "Patrick Baldwin Jr.": "4433252",
  "Dominick Barlow": "4683793",
  // Toronto Raptors additions
  "Brandon Ingram": "3913176",
  "Trayce Jackson-Davis": "4433026",
  "Collin Murray-Boyles": "5238235",
  "Jamison Battle": "4702169",
  "Jamal Shead": "4702170",
  // Western Conference (ESPN fallback - no nba_api IDs)
  "L.J. Cryer": "4433149",
  "Jahmai Mashack": "4683934",
  "Lawson Lovering": "4596528",
  "Blake Hinson": "4396963",
  "Pat Spencer": "4278063",
  "Yang Hansen": "5217746",
};

// Helper: get headshot URL — prefers NBA.com, falls back to ESPN
function getHeadshotUrl(playerName: string): string {
  const nbaId = NBA_PLAYER_IDS[playerName];
  if (nbaId) {
    return `https://cdn.nba.com/headshots/nba/latest/1040x760/${nbaId}.png`;
  }
  const espnId = ESPN_PLAYER_IDS[playerName];
  if (espnId) {
    return `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${espnId}.png&w=350&h=254`;
  }
  return "";
}

// Roster player node (green, with headshot)
function RosterNode({ data }: NodeProps) {
  const nodeData = data as NodeData;
  const espnUrl = getHeadshotUrl(nodeData.label);
  
  const isHighlighted = nodeData.isHighlighted;
  const isDimmed = nodeData.isDimmed;
  const isHomegrown = nodeData.isHomegrown;
  const category = nodeData.rosterCategory;
  
  // Category label styling
  const categoryLabel = category === "starter" ? "Starter" : category === "two-way" ? "Two-Way" : "Bench";
  const categoryColor = category === "starter" 
    ? "text-yellow-300" 
    : category === "two-way" 
      ? "text-purple-300" 
      : "text-green-300";
  
  return (
    <div 
      className={`px-3 py-2 rounded-lg shadow-lg min-w-[140px] relative cursor-pointer transition-all duration-300 ${
        isHighlighted 
          ? "bg-green-800 border-2 border-green-300 ring-2 ring-green-400/50 scale-105" 
          : isDimmed 
            ? "bg-green-900/40 border-2 border-green-400/30 opacity-40" 
            : "bg-green-900 border-2 border-green-400 hover:border-green-300"
      }`}
    >
      <Handle type="source" position={Position.Right} className="!bg-green-400 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        {espnUrl && (
          <img 
            src={espnUrl}
            alt={nodeData.label}
            className={`w-10 h-10 rounded-full object-cover bg-green-950 border transition-all duration-300 ${
              isHighlighted ? "border-green-300" : "border-green-400"
            }`}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div>
          <div className={`text-[9px] font-bold uppercase flex items-center gap-1 ${isHighlighted ? "text-green-200" : categoryColor}`}>
            {categoryLabel}
            {isHomegrown && <span title="Homegrown talent">🏠</span>}
          </div>
          <div className="font-bold text-white text-xs">{nodeData.label}</div>
        </div>
      </div>
    </div>
  );
}

// Regular player node
function PlayerNode({ data }: NodeProps) {
  const nodeData = data as NodeData;
  const isHighlighted = nodeData.isHighlighted;
  const isDimmed = nodeData.isDimmed;
  
  return (
    <div 
      className={`px-3 py-2 rounded-lg shadow-lg min-w-[120px] relative cursor-pointer transition-all duration-300 ${
        isHighlighted 
          ? "bg-blue-900 border-l-4 border-l-blue-400 ring-2 ring-blue-400/50 scale-105" 
          : isDimmed 
            ? "bg-zinc-900/40 border-l-4 border-l-blue-500/30 opacity-40" 
            : "bg-zinc-900 border-l-4 border-l-blue-500 hover:border-l-blue-400"
      }`}
    >
      <Handle type="source" position={Position.Left} className="!bg-blue-500 !w-2 !h-2" />
      <Handle type="target" position={Position.Right} className="!bg-blue-500 !w-2 !h-2" />
      <div className={`text-[9px] font-semibold uppercase ${isHighlighted ? "text-blue-300" : "text-blue-400"}`}>
        Player
      </div>
      <div className="font-medium text-white text-xs">{nodeData.label}</div>
      {nodeData.sublabel && <div className="text-[9px] text-zinc-400">{nodeData.sublabel}</div>}
      {nodeData.date && <div className="text-[8px] text-zinc-500">{formatDate(nodeData.date)}</div>}
    </div>
  );
}

// Pick node
function PickNode({ data }: NodeProps) {
  const nodeData = data as NodeData;
  const isHighlighted = nodeData.isHighlighted;
  const isDimmed = nodeData.isDimmed;
  
  return (
    <div className="relative">
      <div 
        className={`px-3 py-2 rounded-lg shadow-lg min-w-[120px] relative cursor-pointer transition-all duration-300 ${
          isHighlighted 
            ? "bg-fuchsia-900 border-l-4 border-l-fuchsia-400 ring-2 ring-fuchsia-400/50 scale-105" 
            : isDimmed 
              ? "bg-zinc-900/40 border-l-4 border-l-fuchsia-500/30 opacity-40" 
              : "bg-zinc-900 border-l-4 border-l-fuchsia-500 hover:border-l-fuchsia-400"
        }`}
      >
        <Handle type="source" position={Position.Left} className="!bg-fuchsia-500 !w-2 !h-2" />
        <Handle type="target" position={Position.Right} className="!bg-fuchsia-500 !w-2 !h-2" />
        <div className={`text-[9px] font-semibold uppercase ${isHighlighted ? "text-fuchsia-300" : "text-fuchsia-400"}`}>
          Pick
        </div>
        <div className="font-medium text-white text-xs">{nodeData.label}</div>
        {nodeData.date && <div className="text-[8px] text-zinc-500">{formatDate(nodeData.date)}</div>}
      </div>
      {nodeData.becamePlayer && (
        <div className={`absolute -bottom-4 right-0 px-1.5 py-0.5 bg-zinc-800 border border-zinc-600 rounded text-[8px] text-zinc-300 whitespace-nowrap transition-opacity duration-300 ${
          isDimmed ? "opacity-40" : ""
        }`}>
          → {nodeData.becamePlayer}
        </div>
      )}
    </div>
  );
}

// Origin node
function OriginNode({ data }: NodeProps) {
  const nodeData = data as NodeData;
  const isHighlighted = nodeData.isHighlighted;
  const isDimmed = nodeData.isDimmed;
  const isRosterPlayer = nodeData.isRosterPlayer;
  const headshotUrl = isRosterPlayer ? getHeadshotUrl(nodeData.label) : "";
  const category = nodeData.rosterCategory;
  const categoryLabel = category === "starter" ? "Starter" : category === "two-way" ? "Two-Way" : "Bench";
  
  return (
    <div 
      className={`px-3 py-2 rounded-lg shadow-lg min-w-[120px] relative cursor-pointer transition-all duration-300 ${
        isHighlighted 
          ? "bg-amber-900 border-2 border-amber-300 ring-2 ring-amber-400/50 scale-110" 
          : isDimmed 
            ? "bg-amber-950/40 border-2 border-amber-400/30 opacity-40" 
            : "bg-amber-950 border-2 border-amber-400 hover:border-amber-300"
      }`}
    >
      <Handle type="source" position={Position.Left} className="!bg-amber-400 !w-3 !h-3" />
      {isRosterPlayer && <Handle type="source" position={Position.Right} className="!bg-amber-400 !w-3 !h-3" />}
      <div className="flex items-center gap-1 mb-1">
        <span className={`text-xs ${isHighlighted ? "text-amber-300 animate-pulse" : "text-amber-400"}`}>★</span>
        <span className={`text-[9px] font-bold uppercase ${isHighlighted ? "text-amber-200" : "text-amber-300"}`}>
          {isRosterPlayer ? `${categoryLabel} · Origin` : "Origin"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {headshotUrl && (
          <img 
            src={headshotUrl}
            alt={nodeData.label}
            className={`w-10 h-10 rounded-full object-cover bg-amber-950 border ${
              isHighlighted ? "border-amber-300" : "border-amber-400"
            }`}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div>
          <div className="font-bold text-white text-xs">{nodeData.label}</div>
          {nodeData.date && <div className={`text-[8px] ${isHighlighted ? "text-amber-200" : "text-amber-300"}`}>
            {formatDate(nodeData.date)}
          </div>}
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  target: RosterNode,
  player: PlayerNode,
  pick: PickNode,
  origin: OriginNode,
  acquisition: PlayerNode,
};

const NODE_WIDTH = 150;
const NODE_HEIGHT = 60;

const elkOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "LEFT",
  "elk.spacing.nodeNode": "80",
  "elk.layered.spacing.nodeNodeBetweenLayers": "180",
  "elk.layered.spacing.edgeNodeBetweenLayers": "40",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
};

// Vertical spacing for roster column
const ROSTER_VERTICAL_SPACING = 100;
const ROSTER_X_POSITION = 0;

export default function TeamAcquisitionTree({
  nodes: initialNodes,
  edges: initialEdges,
  teamColors,
  teamName = "Boston Celtics",
  onPlayerSelect,
}: TeamAcquisitionTreeProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [baseNodes, setBaseNodes] = useState<Node[]>([]);
  const [baseEdges, setBaseEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSelections, setExportSelections] = useState({
    fullTree: true,
    twitterLandscape: false,
    statCard: false,
  });
  const [exportMode, setExportMode] = useState<'dark' | 'light'>('dark');
  const exportRef = useRef<HTMLDivElement>(null);

  // Build adjacency map for path finding (edge source -> edge targets)
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, string[]>();
    initialEdges.forEach(edge => {
      // Build reverse map: for each target, what sources point to it?
      const sources = map.get(edge.target) || [];
      sources.push(edge.source);
      map.set(edge.target, sources);
    });
    return map;
  }, [initialEdges]);

  // Find all nodes in the path from a node back to origin(s)
  const findPathToOrigins = useCallback((startNodeId: string): Set<string> => {
    const pathNodes = new Set<string>();
    const queue = [startNodeId];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (pathNodes.has(nodeId)) continue;
      pathNodes.add(nodeId);
      
      // Get all source nodes that point to this node
      const sources = adjacencyMap.get(nodeId) || [];
      sources.forEach(sourceId => {
        if (!pathNodes.has(sourceId)) {
          queue.push(sourceId);
        }
      });
    }
    
    return pathNodes;
  }, [adjacencyMap]);

  // Handle node click
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (selectedNodeId === node.id) {
      // Clicking same node deselects
      setSelectedNodeId(null);
    } else {
      setSelectedNodeId(node.id);
      const nd = node.data as NodeData;
      if (nd.isRosterPlayer) {
        const teamAbbr = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() || '' : '';
        trackPlayerClick(nd.label, teamAbbr.toUpperCase());
      }
    }
  }, [selectedNodeId]);

  // Notify parent when selection changes
  useEffect(() => {
    if (!onPlayerSelect) return;
    
    if (!selectedNodeId || baseNodes.length === 0) {
      onPlayerSelect(null);
      return;
    }
    
    const selectedNode = baseNodes.find(n => n.id === selectedNodeId);
    if (!selectedNode) {
      onPlayerSelect(null);
      return;
    }
    
    const nodeData = selectedNode.data as NodeData;
    const pathNodeIds = findPathToOrigins(selectedNodeId);
    
    // Build path info from the nodes in the path
    const pathNodes = Array.from(pathNodeIds)
      .map(nodeId => {
        const node = baseNodes.find(n => n.id === nodeId);
        if (!node) return null;
        const data = node.data as NodeData;
        return {
          id: node.id,
          name: data.label,
          type: node.type || 'unknown',
          date: data.date,
          acquisitionType: data.acquisitionType,
          tradePartner: data.tradePartner,
          isOrigin: data.isOrigin,
        };
      })
      .filter(Boolean) as SelectedPlayerInfo['pathNodes'];
    
    // Sort by date (oldest first)
    pathNodes.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    onPlayerSelect({
      id: selectedNodeId,
      name: nodeData.label,
      isRosterPlayer: nodeData.isRosterPlayer || false,
      acquisitionType: nodeData.acquisitionType,
      pathNodes,
    });
  }, [selectedNodeId, baseNodes, findPathToOrigins, onPlayerSelect]);

  // Update node/edge styling based on selection
  useEffect(() => {
    if (baseNodes.length === 0) return;

    if (!selectedNodeId) {
      // No selection - reset all to normal
      setNodes(baseNodes.map(node => ({
        ...node,
        data: { ...node.data, isHighlighted: false, isDimmed: false }
      })));
      setEdges(baseEdges.map(edge => ({
        ...edge,
        style: {
          stroke: initialNodes.find(n => n.id === edge.source)?.data.isOrigin ? "#f59e0b" : "#22c55e",
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: initialNodes.find(n => n.id === edge.source)?.data.isOrigin ? "#f59e0b" : "#22c55e",
          width: 15,
          height: 15,
        },
      })));
      return;
    }

    // Find path from selected node to origins
    const pathNodeIds = findPathToOrigins(selectedNodeId);

    // Update nodes
    const updatedNodes = baseNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isHighlighted: pathNodeIds.has(node.id),
        isDimmed: !pathNodeIds.has(node.id),
      }
    }));

    // Update edges
    const updatedEdges = baseEdges.map(edge => {
      const isInPath = pathNodeIds.has(edge.source) && pathNodeIds.has(edge.target);
      const sourceNode = initialNodes.find(n => n.id === edge.source);
      const isOriginEdge = sourceNode?.data.isOrigin;
      
      return {
        ...edge,
        style: {
          stroke: isInPath 
            ? (isOriginEdge ? "#fbbf24" : "#4ade80") 
            : "#3f3f46",
          strokeWidth: isInPath ? 3 : 1,
          opacity: isInPath ? 1 : 0.3,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isInPath 
            ? (isOriginEdge ? "#fbbf24" : "#4ade80") 
            : "#3f3f46",
          width: isInPath ? 18 : 12,
          height: isInPath ? 18 : 12,
        },
        animated: isInPath && isOriginEdge,
      };
    });

    setNodes(updatedNodes);
    setEdges(updatedEdges);
  }, [selectedNodeId, baseNodes, baseEdges, findPathToOrigins, initialNodes]);

  // Build initial graph layout
  useEffect(() => {
    async function buildGraph() {
      setIsLoading(true);

      const flowNodes: Node[] = initialNodes.map((n) => {
        let nodeType: string;
        if (n.data.isRosterPlayer) nodeType = "target";
        else if (n.data.isOrigin) nodeType = "origin";
        else if (n.data.nodeType === "pick" || (n.data.nodeType as string) === "other") nodeType = "pick";
        else nodeType = "player";

        return {
          id: n.id,
          type: nodeType,
          data: { ...n.data, isHighlighted: false, isDimmed: false },
          position: { x: 0, y: 0 },
        };
      });

      const flowEdges: Edge[] = initialEdges.map((e) => {
        const sourceNode = initialNodes.find(n => n.id === e.source);
        const isOriginEdge = sourceNode?.data.isOrigin;

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: "default",
          style: {
            stroke: isOriginEdge ? "#f59e0b" : "#22c55e",
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isOriginEdge ? "#f59e0b" : "#22c55e",
            width: 15,
            height: 15,
          },
        };
      });

      try {
        let positionedNodes: Node[];
        
        // For sparse graphs (< 5 edges), skip ELK and use simple column layout
        // ELK can hang on mostly-disconnected graphs
        if (flowEdges.length < 5) {
          console.log(`Sparse graph (${flowEdges.length} edges) - using simple layout`);
          
          // Separate roster and non-roster nodes
          const rosterNodes = flowNodes.filter(n => n.type === "target");
          const otherNodes = flowNodes.filter(n => n.type !== "target");
          
          // Sort roster by order
          rosterNodes.sort((a, b) => {
            const orderA = (a.data as NodeData).rosterOrder ?? 99;
            const orderB = (b.data as NodeData).rosterOrder ?? 99;
            return orderA - orderB;
          });
          
          // Position roster in left column
          rosterNodes.forEach((node, i) => {
            node.position = { x: 0, y: i * ROSTER_VERTICAL_SPACING };
          });
          
          // Position other nodes (origins, etc.) in a column to the right
          otherNodes.forEach((node, i) => {
            node.position = { x: NODE_WIDTH + 200, y: i * 80 };
          });
          
          positionedNodes = [...rosterNodes, ...otherNodes];
          
          setBaseNodes(positionedNodes);
          setBaseEdges(flowEdges);
          setNodes(positionedNodes);
          setEdges(flowEdges);
          setIsLoading(false);
          return; // Skip the rest of ELK processing
        }
        
        const graph = {
          id: "root",
          layoutOptions: elkOptions,
          children: flowNodes.map((node) => ({
            id: node.id,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
          })),
          edges: flowEdges.map((edge) => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
          })),
        };

        // Timeout wrapper for ELK layout (5 seconds max)
        const layoutWithTimeout = async (g: typeof graph, timeoutMs = 5000) => {
          return Promise.race([
            elk.layout(g),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('ELK layout timeout')), timeoutMs)
            )
          ]);
        };

        const layoutedGraph = await layoutWithTimeout(graph);

        // Get initial positions from ELK
        positionedNodes = flowNodes.map((node) => {
          const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
          return {
            ...node,
            position: {
              x: elkNode?.x ?? 0,
              y: elkNode?.y ?? 0,
            },
          };
        });

        // Post-process: arrange roster nodes in a vertical column on the left
        const rosterNodes = positionedNodes.filter(n => n.type === "target");
        const otherNodes = positionedNodes.filter(n => n.type !== "target");
        
        // Sort roster nodes by roster order (starters → bench → two-way)
        rosterNodes.sort((a, b) => {
          const orderA = (a.data as NodeData).rosterOrder ?? 99;
          const orderB = (b.data as NodeData).rosterOrder ?? 99;
          return orderA - orderB;
        });
        
        // Position roster nodes in a vertical column
        rosterNodes.forEach((node, index) => {
          node.position = {
            x: ROSTER_X_POSITION,
            y: index * ROSTER_VERTICAL_SPACING,
          };
        });
        
        // Find the rightmost roster node position to offset other nodes
        const rosterWidth = NODE_WIDTH + 80; // Add padding
        
        // Shift all other nodes to the right of the roster column
        const minOtherX = Math.min(...otherNodes.map(n => n.position.x));
        const offsetX = rosterWidth - minOtherX;
        
        otherNodes.forEach(node => {
          node.position.x += offsetX;
        });
        
        positionedNodes = [...rosterNodes, ...otherNodes];

        setBaseNodes(positionedNodes);
        setBaseEdges(flowEdges);
        setNodes(positionedNodes);
        setEdges(flowEdges);
      } catch (error) {
        console.error("Layout error:", error);
        const positionedNodes = flowNodes.map((node, i) => ({
          ...node,
          position: { x: (i % 10) * 200, y: Math.floor(i / 10) * 100 },
        }));
        setBaseNodes(positionedNodes);
        setBaseEdges(flowEdges);
        setNodes(positionedNodes);
        setEdges(flowEdges);
      }

      setIsLoading(false);
    }

    buildGraph();
  }, [initialNodes, initialEdges]);

  // Click on background to deselect
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Helper to load an image
  const loadImage = useCallback((url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }, []);

  // Helper to get team-specific colors and data
  const getTeamData = useCallback(() => {
    const rosterCount = nodes.filter(n => n.type === 'target').length;
    const originCount = nodes.filter(n => (n.data as NodeData).isOrigin).length;
    const homegrownCount = nodes.filter(n => (n.data as NodeData).isHomegrown).length;
    
    // Get franchise players - prioritize actual stars over roster order
    const rosterNodes = nodes.filter(n => n.type === 'target');
    
    // Define star players to prioritize (by name)
    const starPriority = ['Jayson Tatum', 'Jaylen Brown', 'Jaylen Brown', 'Anthony Davis', 'LeBron James', 
      'Luka Doncic', 'Stephen Curry', 'Giannis Antetokounmpo', 'Kevin Durant', 'Joel Embiid',
      'Nikola Jokic', 'Shai Gilgeous-Alexander', 'Victor Wembanyama', 'Anthony Edwards',
      'Donovan Mitchell', 'Devin Booker', 'Trae Young', 'Ja Morant', 'Zion Williamson'];
    
    // Sort: stars first, then by roster order
    const sortedRoster = [...rosterNodes].sort((a, b) => {
      const labelA = (a.data as NodeData).label;
      const labelB = (b.data as NodeData).label;
      const starIndexA = starPriority.indexOf(labelA);
      const starIndexB = starPriority.indexOf(labelB);
      
      // If both are stars, use star priority order
      if (starIndexA !== -1 && starIndexB !== -1) return starIndexA - starIndexB;
      // If only A is a star, A comes first
      if (starIndexA !== -1) return -1;
      // If only B is a star, B comes first
      if (starIndexB !== -1) return 1;
      // Otherwise use roster order
      const orderA = (a.data as NodeData).rosterOrder ?? 99;
      const orderB = (b.data as NodeData).rosterOrder ?? 99;
      return orderA - orderB;
    });
    
    const franchisePlayers = sortedRoster
      .slice(0, 3)
      .map(n => {
        const label = (n.data as NodeData).label;
        const headshotUrl = getHeadshotUrl(label);
        return {
          name: label,
          espnId: ESPN_PLAYER_IDS[label],
          headshotUrl: headshotUrl || null,
        };
      });
    
    return {
      rosterCount,
      originCount,
      homegrownCount,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      franchisePlayers,
    };
  }, [nodes, edges]);

  // Export Option A: "The Story" - 1:1 Square format (compact)
  const exportStoryFormat = useCallback(async (mode: 'dark' | 'light'): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const size = 1800; // Smaller for tighter layout
    canvas.width = size;
    canvas.height = size;
    
    const teamData = getTeamData();
    const isDark = mode === 'dark';
    
    // Colors
    const bgGradientStart = isDark ? '#0a2e0a' : '#e8f5e9';
    const bgGradientEnd = isDark ? '#051505' : '#c8e6c9';
    const textColor = isDark ? '#ffffff' : '#1a1a1a';
    const accentGold = '#d4a84b';
    const accentGreen = isDark ? '#22c55e' : '#16a34a';
    const cardBg = isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.2)';
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, bgGradientStart);
    gradient.addColorStop(1, bgGradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    const padding = 60;
    
    // Team badge
    ctx.fillStyle = accentGreen;
    ctx.beginPath();
    ctx.roundRect(padding, padding, 50, 50, 10);
    ctx.fill();
    ctx.fillStyle = isDark ? '#051505' : '#ffffff';
    ctx.font = 'bold 28px system-ui';
    ctx.fillText('☘️', padding + 10, padding + 36);
    
    // Team name
    ctx.fillStyle = accentGreen;
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(teamName.toUpperCase(), padding + 65, padding + 36);
    
    // Main headline
    ctx.fillStyle = textColor;
    ctx.font = 'bold 80px system-ui, -apple-system, sans-serif';
    ctx.fillText('The Trade That Built', padding, padding + 160);
    ctx.fillStyle = accentGold;
    ctx.fillText('A Dynasty', padding, padding + 250);
    
    // Load player headshots
    const headshots = await Promise.all(
      teamData.franchisePlayers.slice(0, 2).map(p => p.headshotUrl ? loadImage(p.headshotUrl) : Promise.resolve(null))
    );
    
    // Player cards - side by side
    const cardY = padding + 310;
    const cardWidth = 340;
    const cardHeight = 90;
    
    teamData.franchisePlayers.slice(0, 2).forEach((player, i) => {
      const cardX = padding + i * (cardWidth + 30);
      
      // Card background
      ctx.fillStyle = cardBg;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 14);
      ctx.fill();
      ctx.strokeStyle = accentGreen;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Player headshot - preserve aspect ratio
      const headshot = headshots[i];
      const circleRadius = 32;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cardX + 50, cardY + 45, circleRadius, 0, Math.PI * 2);
      ctx.clip();
      if (headshot) {
        // ESPN images are 350x254, draw centered and scaled
        const imgSize = circleRadius * 2.5;
        ctx.drawImage(headshot, cardX + 50 - imgSize/2, cardY + 45 - imgSize/2.2, imgSize, imgSize * 0.73);
      } else {
        ctx.fillStyle = isDark ? '#1a472a' : '#a5d6a7';
        ctx.fillRect(cardX, cardY, circleRadius * 2, circleRadius * 2);
      }
      ctx.restore();
      
      // Circle border
      ctx.beginPath();
      ctx.arc(cardX + 50, cardY + 45, circleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = accentGreen;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Player name
      ctx.fillStyle = textColor;
      ctx.font = 'bold 24px system-ui';
      ctx.fillText(player.name, cardX + 95, cardY + 40);
      ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
      ctx.font = '16px system-ui';
      ctx.fillText(`#3 Pick via BKN${i === 0 ? ' → PHI' : ''}`, cardX + 95, cardY + 62);
    });
    
    // Big stats row - moved up
    const statsY = cardY + 160;
    ctx.fillStyle = accentGreen;
    ctx.font = 'bold 60px system-ui';
    ctx.fillText('1 TRADE', padding, statsY);
    ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af';
    ctx.font = '40px system-ui';
    ctx.fillText('→', padding + 270, statsY - 8);
    ctx.fillStyle = accentGold;
    ctx.font = 'bold 60px system-ui';
    ctx.fillText('10 YEARS', padding + 320, statsY);
    ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af';
    ctx.font = '40px system-ui';
    ctx.fillText('→', padding + 610, statsY - 8);
    ctx.fillStyle = accentGreen;
    ctx.font = 'bold 60px system-ui';
    ctx.fillText('1 TITLE', padding + 660, statsY);
    
    // Timeline section - more compact
    const timelineY = statsY + 80;
    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.roundRect(padding, timelineY, size - padding * 2, 160, 16);
    ctx.fill();
    
    // Timeline nodes
    const timelineNodes = ['KG + Pierce', 'BKN Picks', 'Brown + Tatum'];
    const timelineDates = ['Traded 2013', '2014-2018', 'Dynasty Core'];
    const nodeSpacing = (size - padding * 2 - 160) / 2;
    
    timelineNodes.forEach((node, i) => {
      const nodeX = padding + 80 + i * nodeSpacing;
      const nodeY = timelineY + 80;
      
      ctx.fillStyle = i === 0 ? accentGold : accentGreen;
      ctx.beginPath();
      ctx.roundRect(nodeX - 70, nodeY - 25, 140, 50, 8);
      ctx.fill();
      
      ctx.fillStyle = isDark ? '#000' : '#fff';
      ctx.font = 'bold 18px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(node, nodeX, nodeY + 5);
      
      ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
      ctx.font = '14px system-ui';
      ctx.fillText(timelineDates[i], nodeX, nodeY + 42);
      
      if (i < timelineNodes.length - 1) {
        ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af';
        ctx.font = '28px system-ui';
        ctx.fillText('→', nodeX + 100, nodeY + 5);
      }
    });
    ctx.textAlign = 'left';
    
    // Bottom stats row - moved up
    const bottomY = size - 140;
    const statLabels = ['ROSTER', '🏠 HOMEGROWN', 'ORIGINS', 'TRADES', 'EARLIEST'];
    const statValues = [teamData.rosterCount, teamData.homegrownCount, teamData.originCount, teamData.totalEdges, '1996'];
    const statSpacing = (size - padding * 2) / statLabels.length;
    
    statLabels.forEach((label, i) => {
      const x = padding + i * statSpacing;
      ctx.fillStyle = textColor;
      ctx.font = 'bold 40px system-ui';
      ctx.fillText(String(statValues[i]), x, bottomY);
      ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
      ctx.font = '14px system-ui';
      ctx.fillText(label, x, bottomY + 24);
    });
    
    // Footer
    ctx.fillStyle = textColor;
    ctx.font = 'bold 20px system-ui';
    ctx.fillText('@ByAkshayRam', padding, size - padding + 10);
    ctx.fillStyle = accentGreen;
    ctx.fillText(' · RosterDNA', padding + ctx.measureText('@ByAkshayRam').width, size - padding + 10);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af';
    ctx.font = '20px system-ui';
    ctx.fillText(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), size - padding, size - padding + 10);
    
    return canvas.toDataURL('image/jpeg', 0.95);
  }, [teamName, getTeamData, loadImage]);

  // Export Option C: "Stat Card" - 16:9 (2400x1350) - Centered layout, single player focus
  const exportStatCard = useCallback(async (mode: 'dark' | 'light'): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const width = 2400;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;
    
    const teamData = getTeamData();
    const isDark = mode === 'dark';
    
    const bgColor = isDark ? '#0a0a0a' : '#fafafa';
    const textColor = isDark ? '#ffffff' : '#1a1a1a';
    const accentGold = '#c9a227';
    const accentGreen = isDark ? '#22c55e' : '#16a34a';
    const subtextColor = isDark ? '#71717a' : '#71717a';
    
    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Top accent bar
    const gradientBar = ctx.createLinearGradient(0, 0, width, 0);
    gradientBar.addColorStop(0, accentGreen);
    gradientBar.addColorStop(0.5, accentGold);
    gradientBar.addColorStop(1, accentGreen);
    ctx.fillStyle = gradientBar;
    ctx.fillRect(0, 0, width, 12);
    
    const padding = 80;
    
    // Team badge
    ctx.fillStyle = accentGreen;
    ctx.beginPath();
    ctx.roundRect(padding, 50, 80, 80, 16);
    ctx.fill();
    ctx.fillStyle = isDark ? '#000' : '#fff';
    ctx.font = '44px system-ui';
    ctx.fillText('☘️', padding + 18, 102);
    
    // Team name
    ctx.fillStyle = textColor;
    ctx.font = 'bold 44px system-ui';
    ctx.fillText(teamName, padding + 100, 88);
    ctx.fillStyle = subtextColor;
    ctx.font = '26px system-ui';
    ctx.fillText('RosterDNA Analysis', padding + 100, 122);
    
    // Load ONLY the main player headshot (Jayson Tatum)
    const mainPlayer = teamData.franchisePlayers[0];
    const headshot = mainPlayer?.headshotUrl ? await loadImage(mainPlayer.headshotUrl) : null;
    
    // Single player headshot (top right) - BIGGER
    const headshotY = 50;
    const headshotX = width - padding - 55;
    const radius = 55;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(headshotX, headshotY + 55, radius, 0, Math.PI * 2);
    ctx.clip();
    if (headshot) {
      const aspectRatio = 350 / 254;
      const drawHeight = radius * 2.4;
      const drawWidth = drawHeight * aspectRatio;
      ctx.drawImage(headshot, headshotX - drawWidth/2, headshotY + 55 - radius - 8, drawWidth, drawHeight);
    } else {
      ctx.fillStyle = isDark ? '#1f2937' : '#e5e7eb';
      ctx.fill();
    }
    ctx.restore();
    
    ctx.beginPath();
    ctx.arc(headshotX, headshotY + 55, radius, 0, Math.PI * 2);
    ctx.strokeStyle = accentGold;
    ctx.lineWidth = 5;
    ctx.stroke();
    
    // Calculate layout - split into left (headline) and right (chain) sections
    const chainBoxWidth = 480;
    const chainBoxHeight = 480;
    const leftSectionWidth = width - chainBoxWidth - padding * 3;
    const verticalCenter = height / 2;
    
    // Main headline - CENTERED in left section, BIGGER font
    const headlineX = padding;
    const headlineY = verticalCenter - 60; // Center vertically
    const playerName = mainPlayer?.name || 'This Team';
    
    ctx.fillStyle = textColor;
    ctx.font = 'bold 88px system-ui';
    ctx.fillText(`${playerName} exists because`, headlineX, headlineY);
    
    ctx.fillStyle = accentGold;
    ctx.font = 'bold 88px system-ui';
    ctx.fillText('the Nets gave up their future', headlineX, headlineY + 110);
    
    ctx.fillStyle = textColor;
    ctx.font = 'bold 88px system-ui';
    ctx.fillText('for ', headlineX, headlineY + 220);
    ctx.fillStyle = accentGreen;
    ctx.fillText('2 years', headlineX + ctx.measureText('for ').width, headlineY + 220);
    ctx.fillStyle = textColor;
    ctx.fillText(' of KG.', headlineX + ctx.measureText('for 2 years').width, headlineY + 220);
    
    // Chain sidebar (right side) - CENTERED vertically, BIGGER
    const chainX = width - chainBoxWidth - padding;
    const chainY = verticalCenter - chainBoxHeight / 2;
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
    ctx.beginPath();
    ctx.roundRect(chainX, chainY, chainBoxWidth, chainBoxHeight, 24);
    ctx.fill();
    
    // Chain title - CENTERED
    ctx.fillStyle = subtextColor;
    ctx.font = '22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('T H E   C H A I N', chainX + chainBoxWidth / 2, chainY + 55);
    
    const chainNodes = [
      { color: accentGold, text: 'KG/Pierce Trade (2013)' },
      { color: accentGreen, text: 'Brooklyn 1st Rounder' },
      { color: '#3b82f6', text: 'Swap with Philly' },
      { color: accentGold, text: `${playerName} (#3, 2017)` },
    ];
    
    ctx.textAlign = 'left';
    const chainStartY = chainY + 110;
    const chainNodeSpacing = 90;
    
    chainNodes.forEach((node, i) => {
      const y = chainStartY + i * chainNodeSpacing;
      const nodeX = chainX + 50;
      
      ctx.beginPath();
      ctx.arc(nodeX, y, 15, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      
      ctx.fillStyle = textColor;
      ctx.font = '32px system-ui';
      ctx.fillText(node.text, nodeX + 35, y + 10);
      
      if (i < chainNodes.length - 1) {
        ctx.strokeStyle = subtextColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(nodeX, y + 25);
        ctx.lineTo(nodeX, y + chainNodeSpacing - 25);
        ctx.stroke();
      }
    });
    
    // Bottom stats - BIGGER
    const bottomY = height - 100;
    const stats = [
      { value: '1996', label: 'EARLIEST' },
      { value: teamData.originCount, label: 'ORIGINS' },
      { value: teamData.homegrownCount, label: 'HOMEGROWN' },
      { value: teamData.rosterCount, label: 'ROSTER' },
    ];
    
    ctx.textAlign = 'right';
    stats.forEach((stat, i) => {
      const x = width - padding - i * 180;
      ctx.fillStyle = textColor;
      ctx.font = 'bold 56px system-ui';
      ctx.fillText(String(stat.value), x, bottomY - 8);
      ctx.fillStyle = subtextColor;
      ctx.font = '20px system-ui';
      ctx.fillText(stat.label, x, bottomY + 26);
    });
    
    // Footer branding
    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;
    ctx.font = 'bold 28px system-ui';
    ctx.fillText('@ByAkshayRam', padding, bottomY);
    ctx.fillStyle = accentGreen;
    ctx.fillText(' · RosterDNA', padding + ctx.measureText('@ByAkshayRam').width, bottomY);
    
    return canvas.toDataURL('image/jpeg', 0.95);
  }, [teamName, getTeamData, loadImage]);

  // Export Option E: "Twitter Landscape" - EXACT mockup dimensions (2700x2160)
  const exportTwitterLandscape = useCallback(async (mode: 'dark' | 'light'): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const width = 2700;
    const height = 2160;
    canvas.width = width;
    canvas.height = height;
    
    const teamData = getTeamData();
    const isDark = mode === 'dark';
    
    const leftBg = isDark ? '#0a0a0a' : '#fafafa';
    const textColor = isDark ? '#ffffff' : '#1a1a1a';
    const accentGold = '#c9a227';
    const accentGreen = isDark ? '#22c55e' : '#16a34a';
    const subtextColor = isDark ? '#71717a' : '#71717a';
    
    const splitPoint = width * 0.55;
    
    // Left side (dark)
    ctx.fillStyle = leftBg;
    ctx.fillRect(0, 0, splitPoint, height);
    
    // Right side (team color gradient)
    const rightGradient = ctx.createLinearGradient(splitPoint, 0, width, height);
    rightGradient.addColorStop(0, isDark ? '#0d470d' : '#dcfce7');
    rightGradient.addColorStop(1, isDark ? '#052505' : '#bbf7d0');
    ctx.fillStyle = rightGradient;
    ctx.fillRect(splitPoint, 0, width - splitPoint, height);
    
    // Pattern overlay on right side
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 25; i++) {
      for (let j = 0; j < 30; j++) {
        ctx.fillStyle = accentGreen;
        ctx.beginPath();
        ctx.arc(splitPoint + 50 + i * 45, 50 + j * 75, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    
    const leftPadding = 65;
    const rightCenter = splitPoint + (width - splitPoint) / 2;
    
    // Left side: Team badge - BIGGER
    ctx.fillStyle = accentGreen;
    ctx.beginPath();
    ctx.roundRect(leftPadding, 50, 80, 80, 16);
    ctx.fill();
    ctx.fillStyle = isDark ? '#000' : '#fff';
    ctx.font = '44px system-ui';
    ctx.fillText('☘️', leftPadding + 18, 100);
    
    ctx.fillStyle = textColor;
    ctx.font = 'bold 42px system-ui';
    ctx.fillText(teamName, leftPadding + 105, 92);
    ctx.fillStyle = subtextColor;
    ctx.font = '26px system-ui';
    ctx.fillText('RosterDNA Analysis', leftPadding + 105, 125);
    
    // Main headline - BIGGER
    const headlineY = 350;
    ctx.fillStyle = textColor;
    ctx.font = 'bold 82px system-ui';
    ctx.fillText('One trade in ', leftPadding, headlineY);
    ctx.fillStyle = accentGreen;
    ctx.fillText('2013', leftPadding + ctx.measureText('One trade in ').width, headlineY);
    ctx.fillStyle = textColor;
    ctx.fillText('.', leftPadding + ctx.measureText('One trade in 2013').width, headlineY);
    
    ctx.fillText('Two franchise players.', leftPadding, headlineY + 100);
    
    ctx.fillStyle = accentGreen;
    ctx.fillText('One championship', leftPadding, headlineY + 200);
    ctx.fillStyle = subtextColor;
    ctx.fillText(' a decade', leftPadding + ctx.measureText('One championship').width, headlineY + 200);
    ctx.fillText('later.', leftPadding, headlineY + 300);
    
    // Trade chain - BIGGER chips
    const chainY = headlineY + 420;
    const chainNodes = [
      { color: accentGold, text: 'KG/Pierce (2013)' },
      { color: accentGreen, text: 'Brooklyn Picks' },
      { color: '#3b82f6', text: 'Draft Trades' },
    ];
    
    chainNodes.forEach((node, i) => {
      const x = leftPadding + i * 280;
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
      ctx.beginPath();
      ctx.roundRect(x, chainY, 240, 60, 30);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(x + 30, chainY + 30, 12, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      
      ctx.fillStyle = textColor;
      ctx.font = '26px system-ui';
      ctx.fillText(node.text, x + 52, chainY + 38);
      
      if (i < chainNodes.length - 1) {
        ctx.fillStyle = subtextColor;
        ctx.font = '32px system-ui';
        ctx.fillText('→', x + 250, chainY + 38);
      }
    });
    
    // Result chip - BIGGER
    ctx.fillStyle = isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.3)';
    ctx.beginPath();
    ctx.roundRect(leftPadding, chainY + 85, 240, 60, 30);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(leftPadding + 30, chainY + 115, 12, 0, Math.PI * 2);
    ctx.fillStyle = accentGreen;
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = '26px system-ui';
    ctx.fillText('Tatum + Brown', leftPadding + 52, chainY + 123);
    
    // Load player headshots
    const headshots = await Promise.all(
      teamData.franchisePlayers.slice(0, 2).map(p => p.headshotUrl ? loadImage(p.headshotUrl) : Promise.resolve(null))
    );
    
    // Right side: Player cards - BIGGER
    const cardWidth = 480;
    const cardHeight = 200;
    const cardStartY = 240;
    
    teamData.franchisePlayers.slice(0, 2).forEach((player, i) => {
      const cardY = cardStartY + i * (cardHeight + 50);
      const cardX = rightCenter - cardWidth / 2;
      const headshot = headshots[i];
      
      ctx.fillStyle = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 24);
      ctx.fill();
      
      // Player headshot - match web UI style
      const circleRadius = 65;
      const circleX = cardX + 85;
      const circleY = cardY + cardHeight/2;
      
      // Background circle
      ctx.beginPath();
      ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? '#1a472a' : '#a5d6a7';
      ctx.fill();
      
      // Draw headshot
      if (headshot) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius - 3, 0, Math.PI * 2);
        ctx.clip();
        // ESPN images are 350x254 - draw to fill circle while keeping face centered
        const aspectRatio = 350 / 254;
        const drawHeight = circleRadius * 2.4;
        const drawWidth = drawHeight * aspectRatio;
        ctx.drawImage(headshot, circleX - drawWidth/2, circleY - circleRadius - 8, drawWidth, drawHeight);
        ctx.restore();
      }
      
      // Circle border - gold like web UI
      ctx.beginPath();
      ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = accentGold;
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Player name
      ctx.fillStyle = textColor;
      ctx.font = 'bold 42px system-ui';
      ctx.fillText(player.name, cardX + 170, cardY + 70);
      ctx.fillStyle = subtextColor;
      ctx.font = '22px system-ui';
      ctx.fillText(`201${7 - i} #3 Pick via BKN${i === 0 ? '/PHI' : ''}`, cardX + 170, cardY + 105);
      
      // Badge
      ctx.fillStyle = accentGreen;
      ctx.beginPath();
      ctx.roundRect(cardX + 170, cardY + 125, i === 0 ? 130 : 140, 40, 8);
      ctx.fill();
      ctx.fillStyle = isDark ? '#000' : '#fff';
      ctx.font = 'bold 18px system-ui';
      ctx.fillText(i === 0 ? '5X ALL-STAR' : 'FINALS MVP', cardX + 185, cardY + 152);
    });
    
    // Trophy section - moved up
    const trophyY = cardStartY + 2 * (cardHeight + 50) + 80;
    ctx.font = '100px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', rightCenter, trophyY);
    
    ctx.fillStyle = accentGold;
    ctx.font = '26px system-ui';
    ctx.fillText('N B A   C H A M P I O N S', rightCenter, trophyY + 80);
    ctx.fillStyle = accentGreen;
    ctx.font = 'bold 90px system-ui';
    ctx.fillText('2024', rightCenter, trophyY + 180);
    ctx.textAlign = 'left';
    
    // Bottom stats (left side) - BIGGER
    const bottomY = height - 130;
    const stats = [
      { value: teamData.rosterCount, label: 'ROSTER' },
      { value: teamData.homegrownCount, label: 'HOMEGROWN' },
      { value: teamData.originCount, label: 'ORIGINS' },
    ];
    
    stats.forEach((stat, i) => {
      const x = leftPadding + i * 180;
      ctx.fillStyle = textColor;
      ctx.font = 'bold 52px system-ui';
      ctx.fillText(String(stat.value), x, bottomY);
      ctx.fillStyle = subtextColor;
      ctx.font = '18px system-ui';
      ctx.fillText(stat.label, x, bottomY + 28);
    });
    
    // Footer branding - BIGGER
    ctx.fillStyle = textColor;
    ctx.font = 'bold 28px system-ui';
    ctx.fillText('@ByAkshayRam', leftPadding, height - 50);
    ctx.fillStyle = accentGreen;
    ctx.fillText(' · RosterDNA', leftPadding + ctx.measureText('@ByAkshayRam').width, height - 50);
    
    return canvas.toDataURL('image/jpeg', 0.95);
  }, [teamName, getTeamData, loadImage]);

  // Export Option D v3: Full Tree - EXACT mockup dimensions (2160x2700)
  const exportFullTree = useCallback(async (mode: 'dark' | 'light'): Promise<string> => {
    const teamData = getTeamData();
    const isDark = mode === 'dark';
    
    const bgColor = isDark ? '#0a0a0a' : '#fafafa';
    const textColor = isDark ? '#ffffff' : '#1a1a1a';
    const accentGreen = isDark ? '#22c55e' : '#16a34a';
    const accentGold = '#d4a84b';
    const accentBlue = '#3b82f6';
    const subtextColor = isDark ? '#71717a' : '#71717a';
    
    // Capture the flow - hide ALL UI overlays
    const flowContainer = document.querySelector('.react-flow') as HTMLElement;
    if (!flowContainer) throw new Error("Could not find flow element");
    
    const controls = flowContainer.querySelector('.react-flow__controls') as HTMLElement;
    const minimap = flowContainer.querySelector('.react-flow__minimap') as HTMLElement;
    const parentContainer = flowContainer.closest('.relative, [class*="relative"]') as HTMLElement;
    
    const overlays: HTMLElement[] = [];
    if (parentContainer) {
      parentContainer.querySelectorAll('[class*="absolute"]').forEach(el => {
        const htmlEl = el as HTMLElement;
        if (!htmlEl.closest('.react-flow__viewport')) {
          overlays.push(htmlEl);
          htmlEl.style.display = 'none';
        }
      });
    }
    if (controls) controls.style.display = 'none';
    if (minimap) minimap.style.display = 'none';
    
    const flowImage = await toJpeg(flowContainer, {
      quality: 0.95,
      backgroundColor: bgColor,
      pixelRatio: 2,
    });
    
    if (controls) controls.style.display = '';
    if (minimap) minimap.style.display = '';
    overlays.forEach(el => el.style.display = '');
    
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = flowImage;
    });
    
    // EXACT mockup dimensions
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const width = 2160;
    const height = 2700;
    canvas.width = width;
    canvas.height = height;
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    const padding = 50;
    
    // Team badge - position from mockup
    ctx.fillStyle = accentGreen;
    ctx.beginPath();
    ctx.roundRect(padding, 45, 60, 60, 12);
    ctx.fill();
    ctx.fillStyle = isDark ? '#000' : '#fff';
    ctx.font = '32px system-ui';
    ctx.fillText('☘️', padding + 14, 85);
    
    ctx.fillStyle = textColor;
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(teamName, padding + 80, 70);
    ctx.fillStyle = subtextColor;
    ctx.font = '18px system-ui';
    ctx.fillText('RosterDNA', padding + 80, 95);
    
    // Season badge - top right
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.roundRect(width - padding - 115, 50, 115, 42, 8);
    ctx.fill();
    ctx.fillStyle = subtextColor;
    ctx.font = '20px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('2025-26', width - padding - 18, 80);
    ctx.textAlign = 'left';
    
    // Headline - LARGER font for better visibility
    ctx.fillStyle = accentGreen;
    ctx.font = 'bold 64px system-ui';
    ctx.fillText(`${teamData.rosterCount} players`, padding, 180);
    ctx.fillStyle = accentGold;
    ctx.fillText(`. ${teamData.totalNodes} assets`, padding + ctx.measureText(`${teamData.rosterCount} players`).width, 180);
    ctx.fillStyle = accentBlue;
    ctx.fillText(`. 30 years of moves.`, padding + ctx.measureText(`${teamData.rosterCount} players. ${teamData.totalNodes} assets`).width, 180);
    
    ctx.fillStyle = textColor;
    ctx.font = 'bold 64px system-ui';
    ctx.fillText('This is how a championship roster gets built.', padding, 260);
    
    // Draw the tree - fit within bounds (adjusted for larger headline)
    const treeY = 310;
    const treeBottom = height - 300;
    const treeHeight = treeBottom - treeY;
    const treeWidth = width - padding * 2;
    
    const scaleX = treeWidth / img.width;
    const scaleY = treeHeight / img.height;
    const scale = Math.min(scaleX, scaleY);
    
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const drawX = padding + (treeWidth - drawWidth) / 2;
    const drawY = treeY + (treeHeight - drawHeight) / 2;
    
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    
    // Legend box - bottom left, moved up to avoid overlapping stats
    const legendY = height - 340;
    ctx.fillStyle = isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(250, 250, 250, 0.9)';
    ctx.beginPath();
    ctx.roundRect(padding - 40, legendY, 340, 95, 12);
    ctx.fill();
    
    const legendItems = [
      { color: accentGold, label: 'Origin' },
      { color: '#3b82f6', label: 'Player' },
      { color: accentGreen, label: 'Pick' },
      { color: textColor, label: '🏠 Homegrown' },
    ];
    
    let legendX = padding - 25;
    legendItems.forEach((item, i) => {
      if (i < 3) {
        ctx.beginPath();
        ctx.roundRect(legendX, legendY + 28, 14, 14, 4);
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.fillStyle = subtextColor;
        ctx.font = '16px system-ui';
        ctx.fillText(item.label, legendX + 22, legendY + 42);
        legendX += ctx.measureText(item.label).width + 45;
      } else {
        ctx.fillStyle = subtextColor;
        ctx.font = '16px system-ui';
        ctx.fillText(item.label, legendX, legendY + 42);
      }
    });
    
    ctx.fillStyle = subtextColor;
    ctx.font = '14px system-ui';
    ctx.fillText('Click node to trace path', padding - 25, legendY + 75);
    
    // Bottom stats - colors match web UI legend (green=roster, gold=origins, blue=assets)
    const bottomY = height - 115;
    const stats = [
      { value: teamData.rosterCount, label: 'CURRENT ROSTER', color: accentGreen },
      { value: teamData.homegrownCount, label: '🏠 HOMEGROWN', color: accentGreen },
      { value: teamData.totalNodes, label: 'TOTAL ASSETS', color: accentBlue },
      { value: teamData.originCount, label: 'TRUE ORIGINS', color: accentGold },
      { value: '1996', label: 'EARLIEST ORIGIN', color: accentGold },
    ];
    
    const statSpacing = (width - padding * 2) / stats.length;
    stats.forEach((stat, i) => {
      const x = padding + i * statSpacing;
      ctx.fillStyle = stat.color;
      ctx.font = 'bold 56px system-ui';
      ctx.fillText(String(stat.value), x, bottomY);
      ctx.fillStyle = subtextColor;
      ctx.font = '14px system-ui';
      ctx.fillText(stat.label, x, bottomY + 32);
    });
    
    // Footer
    ctx.fillStyle = textColor;
    ctx.font = 'bold 22px system-ui';
    ctx.fillText('@ByAkshayRam', padding, height - 40);
    ctx.fillStyle = accentGreen;
    ctx.fillText(' · RosterDNA', padding + ctx.measureText('@ByAkshayRam').width, height - 40);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = subtextColor;
    ctx.font = '18px system-ui';
    ctx.fillText('Explore the full interactive tree →', width - padding, height - 40);
    
    return canvas.toDataURL('image/jpeg', 0.95);
  }, [teamName, getTeamData]);

  // Main export handler
  const handleExport = useCallback(async () => {
    const selected = Object.entries(exportSelections).filter(([_, v]) => v);
    if (selected.length === 0) {
      alert('Please select at least one format to export');
      return;
    }
    
    setIsExporting(true);
    setShowExportMenu(false);
    const teamAbbr = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() || '' : '';
    trackExport(selected.map(([k]) => k).join(','), teamAbbr.toUpperCase());
    
    try {
      const exports: { name: string; data: string }[] = [];
      
      if (exportSelections.fullTree) {
        const data = await exportFullTree(exportMode);
        exports.push({ name: `${teamName.toLowerCase().replace(/\s+/g, '-')}-full-tree-${exportMode}`, data });
      }
      
      if (exportSelections.twitterLandscape) {
        const data = await exportTwitterLandscape(exportMode);
        exports.push({ name: `${teamName.toLowerCase().replace(/\s+/g, '-')}-twitter-${exportMode}`, data });
      }
      
      if (exportSelections.statCard) {
        const data = await exportStatCard(exportMode);
        exports.push({ name: `${teamName.toLowerCase().replace(/\s+/g, '-')}-stat-card-${exportMode}`, data });
      }
      
      // Download all
      exports.forEach((exp, i) => {
        setTimeout(() => {
          const link = document.createElement('a');
          link.download = `${exp.name}.jpg`;
          link.href = exp.data;
          link.click();
        }, i * 500); // Stagger downloads
      });
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  }, [exportSelections, exportMode, teamName, exportStoryFormat, exportStatCard, exportTwitterLandscape, exportFullTree]);

  if (isLoading) {
    return (
      <div className="h-[800px] flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-green-500 rounded-full animate-spin" />
          <div className="text-zinc-400">Building team tree ({initialNodes.length} nodes)...</div>
        </div>
      </div>
    );
  }

  // Find selected player name for display
  const selectedNode = selectedNodeId ? baseNodes.find(n => n.id === selectedNodeId) : null;
  const selectedPlayerName = selectedNode ? (selectedNode.data as NodeData).label : null;

  return (
    <div className="h-[800px] bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.05}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        panOnDrag
        zoomOnScroll
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#3f3f46" gap={20} />
        <Controls 
          showInteractive={false}
          position="top-right"
          className="!bg-zinc-800 !border-zinc-700 !rounded-lg" 
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as NodeData;
            if (data.isDimmed) return "#3f3f46";
            if (node.type === "target") return "#22c55e";
            if (node.type === "origin") return "#f59e0b";
            if (node.type === "pick") return "#d946ef";
            return "#3b82f6";
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="!bg-zinc-900 !border-zinc-700"
          position="bottom-right"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur rounded-lg p-3 border border-zinc-700 text-xs">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-900 border border-green-400" />
            <span className="text-zinc-400">Current Roster</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-950 border border-amber-400" />
            <span className="text-zinc-400">Origin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-zinc-900 border-l-2 border-l-blue-500" />
            <span className="text-zinc-400">Player</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-zinc-900 border-l-2 border-l-fuchsia-500" />
            <span className="text-zinc-400">Pick</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🏠</span>
            <span className="text-zinc-400">Homegrown</span>
          </div>
        </div>
        <div className="mt-2 text-zinc-500 text-[10px]">
          <span className="text-yellow-300">Starter</span> · <span className="text-green-300">Bench</span> · <span className="text-purple-300">Two-Way</span> · Click node to trace path
        </div>
      </div>

      {/* Node count & selection info */}
      <div className="absolute top-4 left-4 bg-zinc-900/90 backdrop-blur rounded-lg px-3 py-2 border border-zinc-700">
        <div className="text-xs text-zinc-500">RosterDNA</div>
        <div className="text-sm font-bold text-white">{nodes.length} nodes · {edges.length} edges</div>
        {selectedPlayerName && (
          <div className="mt-1 text-xs text-green-400 flex items-center gap-1">
            <span className="animate-pulse">●</span>
            Tracing: {selectedPlayerName}
          </div>
        )}
      </div>

      {/* Share Button */}
      <div className="absolute top-4 right-16 z-10">
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
          
          {showExportMenu && (
            <div className="absolute top-full right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden w-[320px]">
              <div className="px-4 py-3 border-b border-zinc-700">
                <div className="text-sm font-semibold text-white mb-1">Share This Team</div>
                <div className="text-xs text-zinc-400">Copy link or share on social</div>
              </div>
              
              {/* Share Options */}
              <div className="p-3 space-y-2">
                <button
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700/50 transition-colors text-left"
                >
                  <span className="text-lg">🔗</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">Copy Link</div>
                    <div className="text-xs text-zinc-500">Share this team page</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    const url = window.location.href;
                    const text = `Check out how the ${teamName} roster was built 🧬`;
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700/50 transition-colors text-left"
                >
                  <span className="text-lg">𝕏</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">Share on Twitter/X</div>
                    <div className="text-xs text-zinc-500">Tweet with pre-filled text</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    const url = window.location.href;
                    const title = `How the ${teamName} roster was built`;
                    window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, '_blank');
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700/50 transition-colors text-left"
                >
                  <span className="text-lg">🟠</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">Share on Reddit</div>
                    <div className="text-xs text-zinc-500">Post to r/nba or any subreddit</div>
                  </div>
                </button>
              </div>

              <div className="px-4 py-3 border-t border-zinc-700">
                <div className="text-[10px] text-zinc-600 flex items-center gap-1.5">
                  <span>🧬</span> Branded cards coming soon — follow @RosterDNA
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close share menu */}
      {showExportMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowExportMenu(false)}
        />
      )}
      {/* Hidden export container ref (kept for potential future use) */}
      <div ref={exportRef} className="hidden" />
    </div>
  );
}
