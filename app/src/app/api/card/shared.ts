import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  BOS: { primary: "#007A33", secondary: "#BA9653" },
  NYK: { primary: "#F58426", secondary: "#006BB6" },
  OKC: { primary: "#007AC1", secondary: "#EF3B24" },
  WAS: { primary: "#002B5C", secondary: "#E31837" },
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

export const TEAM_NAMES: Record<string, string> = {
  BOS: "Boston Celtics", NYK: "New York Knicks", OKC: "Oklahoma City Thunder",
  WAS: "Washington Wizards", ATL: "Atlanta Hawks", BKN: "Brooklyn Nets",
  CHA: "Charlotte Hornets", CHI: "Chicago Bulls", CLE: "Cleveland Cavaliers",
  DET: "Detroit Pistons", IND: "Indiana Pacers", MIA: "Miami Heat",
  MIL: "Milwaukee Bucks", ORL: "Orlando Magic", PHI: "Philadelphia 76ers",
  TOR: "Toronto Raptors", DAL: "Dallas Mavericks", DEN: "Denver Nuggets",
  GSW: "Golden State Warriors", HOU: "Houston Rockets", LAC: "LA Clippers",
  LAL: "Los Angeles Lakers", MEM: "Memphis Grizzlies", MIN: "Minnesota Timberwolves",
  NOP: "New Orleans Pelicans", PHX: "Phoenix Suns", POR: "Portland Trail Blazers",
  SAC: "Sacramento Kings", SAS: "San Antonio Spurs", UTA: "Utah Jazz",
};

// Dynamically load NBA_PLAYER_IDS from the component file
let _playerIds: Record<string, string> | null = null;
export function getNbaPlayerIds(): Record<string, string> {
  if (_playerIds) return _playerIds;
  try {
    const filePath = join(process.cwd(), "src/components/TeamAcquisitionTree.tsx");
    const content = readFileSync(filePath, "utf-8");
    const match = content.match(/const NBA_PLAYER_IDS[^{]*(\{[\s\S]*?\n\};)/);
    if (match) {
      // Parse the object literal
      const ids: Record<string, string> = {};
      const entries = match[1].matchAll(/"([^"]+)":\s*"(\d+)"/g);
      for (const e of entries) {
        ids[e[1]] = e[2];
      }
      _playerIds = ids;
      return ids;
    }
  } catch {}
  _playerIds = {};
  return _playerIds;
}

export function getHeadshotUrl(playerName: string): string {
  const ids = getNbaPlayerIds();
  const nbaId = ids[playerName];
  if (nbaId) {
    return `https://cdn.nba.com/headshots/nba/latest/1040x760/${nbaId}.png`;
  }
  return "";
}

export interface TreeNode {
  type: "player" | "pick";
  name: string;
  acquisitionType: string;
  date: string;
  draftPick?: number;
  draftRound?: number;
  currentTeam?: string;
  tradePartner?: string;
  tradeDescription?: string;
  becamePlayer?: string;
  note?: string;
  isOrigin?: boolean;
  assetsGivenUp?: TreeNode[];
}

export interface AcquisitionData {
  _meta: {
    team: string;
    player: string;
    source: string;
    sourceUrl: string;
    originYear: number;
    depth: number;
    lastUpdated: string;
  };
  tree: TreeNode;
}

const DATA_DIR = join(process.cwd(), "data/acquisition-trees");

export function loadPlayerData(slug: string): AcquisitionData | null {
  try {
    const filePath = join(DATA_DIR, `${slug}.json`);
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export function listTeamPlayers(teamAbbr: string): string[] {
  try {
    const files = readdirSync(DATA_DIR);
    return files
      .filter((f) => f.startsWith(teamAbbr.toLowerCase() + "-") && f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}

export function getAcquisitionBadge(type: string): { label: string; color: string } {
  switch (type) {
    case "draft": return { label: "DRAFT", color: "#22c55e" };
    case "trade": return { label: "TRADE", color: "#3b82f6" };
    case "free-agent": case "free_agent": case "fa": return { label: "FREE AGENT", color: "#6b7280" };
    case "sign-and-trade": case "sign_and_trade": return { label: "SIGN & TRADE", color: "#a855f7" };
    default: return { label: type.toUpperCase(), color: "#6b7280" };
  }
}

export function flattenChain(node: TreeNode): TreeNode[] {
  const result: TreeNode[] = [node];
  if (node.assetsGivenUp) {
    for (const child of node.assetsGivenUp) {
      result.push(...flattenChain(child));
    }
  }
  return result;
}

/** Get the main chain path (follow first asset at each level) */
export function getMainChain(node: TreeNode): TreeNode[] {
  const chain: TreeNode[] = [node];
  let current = node;
  while (current.assetsGivenUp && current.assetsGivenUp.length > 0) {
    current = current.assetsGivenUp[0];
    chain.push(current);
  }
  return chain;
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}
