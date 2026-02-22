import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface TreeNode {
  type?: string;
  name?: string;
  acquisitionType?: string;
  date?: string;
  draftPick?: number;
  tradePartner?: string;
  tradeDescription?: string;
  becamePlayer?: string;
  isOrigin?: boolean;
  note?: string;
  assetsGivenUp?: TreeNode[];
  children?: TreeNode[];
}

interface TreeFile {
  _meta: {
    team: string;
    player: string;
    originYear: number;
    depth: number;
  };
  tree: TreeNode;
}

interface StopInfo {
  team: string;
  years: string;
  isCurrent: boolean;
  acquisitionType: string;
  tradePartner?: string;
  nodes: {
    type: "player" | "pick" | "origin" | "other";
    name: string;
    detail: string;
    becameName: string;
    becameLabel: string;
    notConveyed: boolean;
    champBadge: boolean;
    champYear: string;
  }[];
}

// Walk the tree to extract trade chain stops
function extractStops(tree: TreeNode, currentTeam: string): StopInfo[] {
  const stops: StopInfo[] = [];

  // The root node is the current player on their current team
  // We need to walk the assetsGivenUp chain to find previous stops
  function walkChain(node: TreeNode, depth: number) {
    if (!node) return;

    // Each assetsGivenUp entry with a tradePartner represents a trade stop
    const assets = node.assetsGivenUp || node.children || [];

    for (const asset of assets) {
      if (asset.tradePartner || asset.isOrigin || asset.acquisitionType === "draft") {
        // This is a meaningful node in the chain
        const nodeType = asset.isOrigin || asset.acquisitionType === "draft" || asset.acquisitionType === "free-agent"
          ? "origin"
          : asset.type === "pick" ? "pick" : "player";

        const detail = asset.draftPick
          ? `#${asset.draftPick} overall · ${(asset.date || "").slice(0, 4)} Draft`
          : asset.tradeDescription || "";

        stops.push({
          team: asset.tradePartner || currentTeam,
          years: (asset.date || "").slice(0, 4) || "",
          isCurrent: false,
          acquisitionType: asset.acquisitionType || "",
          tradePartner: asset.tradePartner,
          nodes: [{
            type: nodeType,
            name: asset.name || "",
            detail,
            becameName: asset.becamePlayer || "",
            becameLabel: asset.becamePlayer ? "Became" : "",
            notConveyed: false,
            champBadge: false,
            champYear: "",
          }],
        });
      }
      // Recurse deeper
      walkChain(asset, depth + 1);
    }
  }

  walkChain(tree, 0);
  return stops;
}

export async function GET() {
  const dataDir = path.join(process.cwd(), "data", "acquisition-trees");
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"));

  const playersByTeam: Record<string, {
    name: string;
    slug: string;
    file: string;
    depth: number;
    originYear: number;
    acquisitionType: string;
  }[]> = {};

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dataDir, file), "utf-8");
      const data: TreeFile = JSON.parse(raw);
      const team = data._meta.team;
      const player = data._meta.player;
      const slug = file.replace(".json", "");

      if (!playersByTeam[team]) playersByTeam[team] = [];
      playersByTeam[team].push({
        name: player,
        slug,
        file,
        depth: data._meta.depth,
        originYear: data._meta.originYear,
        acquisitionType: data.tree.acquisitionType || "unknown",
      });
    } catch {
      // skip bad files
    }
  }

  // Sort players within each team alphabetically
  for (const team of Object.keys(playersByTeam)) {
    playersByTeam[team].sort((a, b) => a.name.localeCompare(b.name));
  }

  return NextResponse.json(playersByTeam);
}
