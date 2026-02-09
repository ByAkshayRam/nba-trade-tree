import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface AcquisitionNode {
  type: "player" | "pick" | "cash";
  name: string;
  acquisitionType: "draft" | "trade" | "signing" | "original" | "waiver";
  date: string;
  draftPick?: number;
  draftRound?: number;
  tradePartner?: string;
  tradeDescription?: string;
  becamePlayer?: string;
  currentTeam?: string;
  note?: string;
  assetsGivenUp?: AcquisitionNode[];
}

interface TreeFile {
  _meta: {
    team: string;
    player: string;
    source: string;
    sourceUrl?: string;
    originYear: number;
    depth: number;
    lastUpdated: string;
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
    draftPick?: number;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

// Team colors for styling
const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  BOS: { primary: "#007A33", secondary: "#BA9653" },
  CHI: { primary: "#CE1141", secondary: "#000000" },
  OKC: { primary: "#007AC1", secondary: "#EF3B24" },
  MEM: { primary: "#5D76A9", secondary: "#12173F" },
  PHI: { primary: "#006BB6", secondary: "#ED174C" },
  POR: { primary: "#E03A3E", secondary: "#000000" },
  IND: { primary: "#002D62", secondary: "#FDBB30" },
  MIL: { primary: "#00471B", secondary: "#EEE1C6" },
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamAbbr: string; playerId: string }> }
) {
  const { teamAbbr, playerId } = await params;
  const team = teamAbbr.toUpperCase();
  
  // Convert playerId to filename format (e.g., "nikola-vucevic" or numeric)
  const playerSlug = playerId.toLowerCase().replace(/\s+/g, "-");
  
  // Try to load from pre-built tree files
  // Use __dirname alternative for ESM modules, fall back to process.cwd()
  const baseDir = process.cwd();
  
  // Multiple possible locations depending on how Next.js runs
  const treesDirs = [
    path.join(baseDir, "..", "data", "acquisition-trees"),
    path.join(baseDir, "data", "acquisition-trees"),
    "/home/ubuntu/clawd/projects/nba-trade-tree/data/acquisition-trees", // Absolute fallback
  ];
  
  // Extract last name from player slug (e.g., "nikola-vucevic" -> "vucevic")
  const lastName = playerSlug.split("-").pop() || playerSlug;
  
  const possibleFiles: string[] = [];
  for (const dir of treesDirs) {
    possibleFiles.push(
      path.join(dir, `${team.toLowerCase()}-${playerSlug}.json`),
      path.join(dir, `${team.toLowerCase()}-${lastName}.json`),
      path.join(dir, `${team.toLowerCase()}-${playerId}.json`)
    );
  }
  
  console.log("CWD:", baseDir);
  console.log("Looking for files:", possibleFiles.slice(0, 6));
  
  let treeData: TreeFile | null = null;
  
  for (const filePath of possibleFiles) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        treeData = JSON.parse(content);
        break;
      }
    } catch (e) {
      console.error(`Error reading ${filePath}:`, e);
    }
  }
  
  if (!treeData) {
    return NextResponse.json(
      { 
        error: "Acquisition tree not found",
        hint: `Looking for ${team.toLowerCase()}-${playerSlug}.json in data/acquisition-trees/`
      },
      { status: 404 }
    );
  }
  
  // Convert tree to React Flow nodes and edges
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  let nodeCounter = 0;
  
  function processNode(
    node: AcquisitionNode,
    parentId: string | null,
    depth: number,
    siblingIndex: number,
    totalSiblings: number
  ): string {
    const nodeId = `node-${nodeCounter++}`;
    const isTarget = depth === 0;
    const isOrigin = !node.assetsGivenUp || node.assetsGivenUp.length === 0;
    
    // Determine node type for styling
    let nodeType: "player" | "pick" | "cash" | "trade-action" = node.type;
    
    // Format label
    let label = node.name;
    let sublabel = "";
    
    if (node.type === "pick") {
      sublabel = node.becamePlayer ? `→ ${node.becamePlayer}` : "";
    } else if (node.acquisitionType === "draft") {
      sublabel = `#${node.draftPick} pick (${new Date(node.date).getFullYear()})`;
    } else if (node.acquisitionType === "trade") {
      sublabel = node.tradePartner ? `via ${node.tradePartner}` : "";
    }
    
    nodes.push({
      id: nodeId,
      type: isTarget ? "target" : isOrigin ? "origin" : "acquisition",
      data: {
        label,
        sublabel,
        date: node.date,
        nodeType,
        acquisitionType: node.acquisitionType,
        tradePartner: node.tradePartner,
        note: node.note,
        isOrigin,
        isTarget,
        draftPick: node.draftPick,
      },
    });
    
    // Connect to parent
    if (parentId) {
      const edgeLabel = node.acquisitionType === "draft" 
        ? "drafted" 
        : node.acquisitionType === "trade"
        ? "traded"
        : node.acquisitionType;
        
      edges.push({
        id: `edge-${parentId}-${nodeId}`,
        source: nodeId,  // Child points to parent (bottom-up flow visually)
        target: parentId,
        label: depth === 1 ? "gave up" : undefined,
        animated: isOrigin,
      });
    }
    
    // Process children (assets given up)
    if (node.assetsGivenUp && node.assetsGivenUp.length > 0) {
      node.assetsGivenUp.forEach((child, idx) => {
        processNode(child, nodeId, depth + 1, idx, node.assetsGivenUp!.length);
      });
    }
    
    return nodeId;
  }
  
  processNode(treeData.tree, null, 0, 0, 1);
  
  return NextResponse.json({
    team: treeData._meta.team,
    player: treeData._meta.player,
    source: treeData._meta.source,
    sourceUrl: treeData._meta.sourceUrl,
    originYear: treeData._meta.originYear,
    depth: treeData._meta.depth,
    lastUpdated: treeData._meta.lastUpdated,
    tree: treeData.tree,
    nodes,
    edges,
    teamColors: TEAM_COLORS[team] || { primary: "#666", secondary: "#333" },
  });
}
