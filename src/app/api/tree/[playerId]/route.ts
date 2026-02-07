import { NextResponse } from "next/server";
import { db, players, teams, acquisitions, trades, tradeChains } from "@/db";
import { eq, sql } from "drizzle-orm";

interface TreeNode {
  id: string;
  type: "player" | "trade" | "pick";
  data: {
    label: string;
    sublabel?: string;
    color?: string;
    date?: string;
    imageUrl?: string;
  };
}

interface TreeEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await params;
  const id = parseInt(playerId, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
  }

  // Get player info
  const playerResult = await db
    .select({
      id: players.id,
      name: players.name,
      draftYear: players.draftYear,
      draftPick: players.draftPick,
      headshotUrl: players.headshotUrl,
      teamAbbr: teams.abbreviation,
      teamName: teams.name,
      teamColor: teams.primaryColor,
    })
    .from(players)
    .leftJoin(teams, sql`${players.currentTeamId} = ${teams.id}`)
    .where(eq(players.id, id))
    .limit(1);

  if (playerResult.length === 0) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const player = playerResult[0];

  // Get acquisition info
  const acqResult = await db
    .select({
      type: acquisitions.acquisitionType,
      date: acquisitions.date,
      originTradeId: acquisitions.originTradeId,
    })
    .from(acquisitions)
    .where(eq(acquisitions.playerId, id))
    .limit(1);

  const acquisition = acqResult[0] || null;

  // Get trade chain if exists
  let chain: Array<{ event: string; date: string; action?: string }> = [];
  let originTrade = null;

  if (acquisition?.originTradeId) {
    // Get origin trade details
    const tradeResult = await db
      .select()
      .from(trades)
      .where(eq(trades.id, acquisition.originTradeId))
      .limit(1);

    originTrade = tradeResult[0] || null;

    // Get chain
    const chainResult = await db
      .select({ chainJson: tradeChains.chainJson })
      .from(tradeChains)
      .where(eq(tradeChains.resultingPlayerId, id))
      .limit(1);

    if (chainResult[0]) {
      chain = JSON.parse(chainResult[0].chainJson);
    }
  }

  // Build tree structure for React Flow
  const nodes: TreeNode[] = [];
  const edges: TreeEdge[] = [];

  // Player node (current)
  nodes.push({
    id: `player-${player.id}`,
    type: "player",
    data: {
      label: player.name,
      sublabel: `${player.teamAbbr} • #${player.draftPick} (${player.draftYear})`,
      color: player.teamColor || "#007A33",
      imageUrl: player.headshotUrl || undefined,
    },
  });

  // Add chain nodes
  if (chain.length > 0) {
    let prevNodeId = `player-${player.id}`;

    for (let i = chain.length - 1; i >= 0; i--) {
      const step = chain[i];
      const nodeId = `chain-${i}`;

      nodes.push({
        id: nodeId,
        type: step.action?.includes("Drafted") ? "pick" : "trade",
        data: {
          label: step.event,
          sublabel: step.action,
          date: step.date,
        },
      });

      edges.push({
        id: `edge-${nodeId}-${prevNodeId}`,
        source: nodeId,
        target: prevNodeId,
        label: step.action?.includes("Drafted") ? "Drafted" : undefined,
      });

      prevNodeId = nodeId;
    }

    // Add origin trade node
    if (originTrade) {
      const originNodeId = `trade-${originTrade.id}`;
      nodes.push({
        id: originNodeId,
        type: "trade",
        data: {
          label: originTrade.description || "Trade",
          date: originTrade.date,
        },
      });

      edges.push({
        id: `edge-origin-${chain.length - 1}`,
        source: originNodeId,
        target: `chain-${chain.length - 1}`,
      });
    }
  }

  return NextResponse.json({
    player,
    acquisition,
    originTrade,
    chain,
    nodes,
    edges,
  });
}
