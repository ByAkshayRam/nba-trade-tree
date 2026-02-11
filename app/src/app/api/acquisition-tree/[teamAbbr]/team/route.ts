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

// Roster organization by team (as of 2025-26 season)
const ROSTER_ORDERS: Record<string, Record<string, { order: number; category: "starter" | "bench" | "two-way" }>> = {
  BOS: {
    // Starters
    "Derrick White": { order: 1, category: "starter" },
    "Jaylen Brown": { order: 2, category: "starter" },
    "Jayson Tatum": { order: 3, category: "starter" },
    "Nikola Vucevic": { order: 4, category: "starter" },
    "Payton Pritchard": { order: 5, category: "starter" },
    // Bench
    "Sam Hauser": { order: 10, category: "bench" },
    "Neemias Queta": { order: 11, category: "bench" },
    "Jordan Walsh": { order: 12, category: "bench" },
    "Baylor Scheierman": { order: 13, category: "bench" },
    "Luka Garza": { order: 14, category: "bench" },
    "Ron Harper Jr.": { order: 15, category: "bench" },
    "Chris Boucher": { order: 16, category: "bench" },
    "Hugo Gonzalez": { order: 17, category: "bench" },
    "Amari Williams": { order: 18, category: "bench" },
    // Two-way
    "John Tonje": { order: 20, category: "two-way" },
    "Max Shulga": { order: 21, category: "two-way" },
  },
  NYK: {
    // Starters
    "Jalen Brunson": { order: 1, category: "starter" },
    "Mikal Bridges": { order: 2, category: "starter" },
    "OG Anunoby": { order: 3, category: "starter" },
    "Karl-Anthony Towns": { order: 4, category: "starter" },
    "Josh Hart": { order: 5, category: "starter" },
    // Bench
    "Miles McBride": { order: 10, category: "bench" },
    "Jose Alvarado": { order: 11, category: "bench" },
    "Mitchell Robinson": { order: 12, category: "bench" },
    "Pacome Dadiet": { order: 13, category: "bench" },
    "Dillon Jones": { order: 14, category: "bench" },
    "Tyler Kolek": { order: 15, category: "bench" },
    "Ariel Hukporti": { order: 16, category: "bench" },
    "Jordan Clarkson": { order: 17, category: "bench" },
    "Landry Shamet": { order: 18, category: "bench" },
    // Two-way
    "Mohamed Diawara": { order: 20, category: "two-way" },
    "Trey Jemison III": { order: 21, category: "two-way" },
    "Kevin McCullar Jr.": { order: 22, category: "two-way" },
  },
  OKC: {
    // Starters
    "Shai Gilgeous-Alexander": { order: 1, category: "starter" },
    "Jalen Williams": { order: 2, category: "starter" },
    "Chet Holmgren": { order: 3, category: "starter" },
    "Alex Caruso": { order: 4, category: "starter" },
    "Isaiah Hartenstein": { order: 5, category: "starter" },
    // Bench
    "Cason Wallace": { order: 10, category: "bench" },
    "Luguentz Dort": { order: 11, category: "bench" },
    "Jared McCain": { order: 12, category: "bench" },
    "Isaiah Joe": { order: 13, category: "bench" },
    "Jaylin Williams": { order: 14, category: "bench" },
    "Aaron Wiggins": { order: 15, category: "bench" },
    "Kenrich Williams": { order: 16, category: "bench" },
    "Nikola Topic": { order: 17, category: "bench" },
    "Ajay Mitchell": { order: 18, category: "bench" },
    "Thomas Sorber": { order: 19, category: "bench" },
    // Two-way
    "Brooks Barnhizer": { order: 20, category: "two-way" },
    "Buddy Boeheim": { order: 21, category: "two-way" },
    "Branden Carlson": { order: 22, category: "two-way" },
    "Chris Youngblood": { order: 23, category: "two-way" },
  },
  WAS: {
    // Starters
    "Trae Young": { order: 1, category: "starter" },
    "Anthony Davis": { order: 2, category: "starter" },
    "Alex Sarr": { order: 3, category: "starter" },
    "Bilal Coulibaly": { order: 4, category: "starter" },
    "Bub Carrington": { order: 5, category: "starter" },
    // Bench
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
    // Two-way
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
};

const TEAM_NAMES: Record<string, string> = {
  BOS: "Boston Celtics",
  NYK: "New York Knicks",
  OKC: "Oklahoma City Thunder",
  WAS: "Washington Wizards",
};

// Compelling roster narratives for each team - creator-friendly stories
const ROSTER_NARRATIVES: Record<string, string> = {
  BOS: "The Celtics' championship core is a masterclass in patience. When Danny Ainge traded Kevin Garnett and Paul Pierce to Brooklyn in 2013, the basketball world thought Boston was entering a decade of darkness. Instead, those picks became Jaylen Brown (#3, 2016) and — through a trade with Philadelphia — Jayson Tatum (#3, 2017). One trade, a decade later, produced an NBA championship. Derrick White arrived via the Spurs for another Brooklyn pick. The KG/Pierce trade echoes through this entire roster.",
  NYK: "The Knicks built their contender through aggressive trading. Jalen Brunson chose New York in free agency, then helped recruit. OG Anunoby came from Toronto. Mikal Bridges arrived in a blockbuster with Brooklyn. Karl-Anthony Towns was traded from Minnesota. This isn't the Knicks of old — this is a front office that identified targets and went all-in. The result? A roster constructed for a championship run.",
  OKC: "Sam Presti played chess while everyone else played checkers. When he traded Russell Westbrook and Paul George, critics called it a teardown. Instead, it was a reload. Shai Gilgeous-Alexander — the 'throw-in' from the Clippers deal — became a top-5 player. Chet Holmgren at #2 adds unicorn potential. The Thunder have more draft picks than any team in NBA history, but their best assets are already on the roster.",
  WAS: "The Wizards are in full rebuild mode, and it's getting interesting. Alex Sarr at #2 overall anchors the future. Bilal Coulibaly shows star potential. Then came the blockbuster: Trae Young and Anthony Davis arrived via trade, instantly changing the timeline. This roster is a mix of young potential and proven stars — a fascinating experiment in competitive rebuilding.",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamAbbr: string }> }
) {
  const { teamAbbr } = await params;
  const team = teamAbbr.toUpperCase();
  
  const dataDir = path.join(process.cwd(), "..", "data", "acquisition-trees");
  
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
