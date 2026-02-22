import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getHeadshotUrl } from "@/lib/player-headshots";

interface TreeNode {
  type?: string;
  name?: string;
  acquisitionType?: string;
  date?: string;
  draftPick?: number;
  draftRound?: number;
  tradePartner?: string;
  tradeDescription?: string;
  becamePlayer?: string;
  isOrigin?: boolean;
  note?: string;
  assetsGivenUp?: TreeNode[];
  children?: TreeNode[];
  currentTeam?: string;
}

interface CardStop {
  team: string;
  years: string;
  isCurrent: boolean;
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

function getYear(date?: string): string {
  if (!date) return "";
  return date.slice(0, 4);
}

// Recursively collect all trade stops from the tree
function collectStops(
  node: TreeNode,
  currentTeam: string,
  meta: { player: string }
): CardStop[] {
  const stops: CardStop[] = [];

  // First stop: the current team (root player)
  // We'll build this from the root node's perspective

  // Walk assetsGivenUp to find the chain of trades
  function walkAssets(assets: TreeNode[], parentTeam: string): CardStop | null {
    if (!assets || assets.length === 0) return null;

    const nodesForStop: CardStop["nodes"] = [];

    for (const asset of assets) {
      const isPickType = asset.type === "pick";
      const isOriginType = asset.isOrigin || asset.acquisitionType === "draft" || asset.acquisitionType === "free-agent" || asset.acquisitionType === "undrafted";

      let nodeType: "player" | "pick" | "origin" | "other" = "player";
      if (isOriginType) nodeType = "origin";
      else if (isPickType) nodeType = "pick";
      else if (asset.type === "other" || asset.type === "cash") nodeType = "other";

      let detail = "";
      if (asset.draftPick) {
        detail = `#${asset.draftPick} overall · ${getYear(asset.date)} Draft`;
      } else if (asset.tradeDescription) {
        detail = asset.tradeDescription;
      }

      nodesForStop.push({
        type: nodeType,
        name: asset.name || "",
        detail,
        becameName: asset.becamePlayer || "",
        becameLabel: asset.becamePlayer ? "Became" : "",
        notConveyed: false,
        champBadge: false,
        champYear: "",
      });

      // Recurse into nested assetsGivenUp
      const nestedAssets = asset.assetsGivenUp || asset.children || [];
      if (nestedAssets.length > 0) {
        const nestedStop = walkAssets(nestedAssets, asset.tradePartner || parentTeam);
        if (nestedStop) stops.unshift(nestedStop);
      }
    }

    if (nodesForStop.length > 0) {
      // Determine team for this stop from the first asset's tradePartner
      const stopTeam = assets[0]?.tradePartner || parentTeam;
      const year = getYear(assets[0]?.date);

      return {
        team: stopTeam,
        years: year,
        isCurrent: false,
        nodes: nodesForStop,
      };
    }
    return null;
  }

  const rootAssets = node.assetsGivenUp || node.children || [];
  const tradeStop = walkAssets(rootAssets, currentTeam);
  if (tradeStop) stops.push(tradeStop);

  // Add the current team as the last stop
  stops.push({
    team: currentTeam,
    years: "now",
    isCurrent: true,
    nodes: [{
      type: "player" as const,
      name: meta.player,
      detail: node.note || "",
      becameName: "",
      becameLabel: "",
      notConveyed: false,
      champBadge: false,
      champYear: "",
    }],
  });

  return stops;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const dataDir = path.join(process.cwd(), "data", "acquisition-trees");
  const filePath = path.join(dataDir, `${slug}.json`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    const meta = data._meta;
    const tree = data.tree;

    const stops = collectStops(tree, meta.team, { player: meta.player });

    // Count stats
    let tradeCount = 0;
    let playersMovedCount = 0;
    let picksCount = 0;
    const teamsInvolved = new Set<string>();

    for (const stop of stops) {
      teamsInvolved.add(stop.team);
      for (const node of stop.nodes) {
        if (node.type === "player" && node.name) playersMovedCount++;
        if (node.type === "pick") picksCount++;
      }
      if (!stop.isCurrent) tradeCount++;
    }

    return NextResponse.json({
      playerName: meta.player,
      team: meta.team,
      headshotUrl: getHeadshotUrl(meta.player),
      depth: meta.depth,
      originYear: meta.originYear,
      stops,
      stats: [
        { value: String(tradeCount), label: "Trades" },
        { value: String(playersMovedCount), label: "Players Moved" },
        { value: String(picksCount), label: "Picks Involved" },
        { value: String(teamsInvolved.size), label: "Franchises" },
      ],
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to parse data" }, { status: 500 });
  }
}
