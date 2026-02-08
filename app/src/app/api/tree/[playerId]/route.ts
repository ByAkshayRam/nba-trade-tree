import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "..", "data", "nba_trades.db");

interface ChainStep {
  event: string;
  date: string;
  action?: string;
  teamFrom?: string;
  teamTo?: string;
  assets?: string[];
  received?: string[];
}

interface TreeNode {
  id: string;
  type: "player" | "trade" | "pick" | "team-asset" | "trade-header" | "asset";
  data: {
    label: string;
    sublabel?: string;
    color?: string;
    secondaryColor?: string;
    date?: string;
    imageUrl?: string;
    teamFrom?: string;
    teamTo?: string;
    assets?: string[];
    received?: string[];
    teamFromColor?: string;
    teamToColor?: string;
    // For asset nodes
    assetType?: "player" | "pick";
    assetIndex?: number;
    totalAssets?: number;
    parentTradeId?: string;
  };
}

interface TreeEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
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

  const db = new Database(dbPath, { readonly: true });

  try {
    // Get player info with team
    const player = db.prepare(`
      SELECT 
        p.id, p.name, p.draft_year as draftYear, p.draft_pick as draftPick, 
        p.headshot_url as headshotUrl, p.position,
        t.abbreviation as teamAbbr, t.name as teamName, t.primary_color as teamColor,
        t.secondary_color as teamSecondaryColor
      FROM players p
      LEFT JOIN teams t ON p.current_team_id = t.id
      WHERE p.id = ?
    `).get(id) as {
      id: number;
      name: string;
      draftYear: number;
      draftPick: number;
      headshotUrl: string | null;
      position: string | null;
      teamAbbr: string;
      teamName: string;
      teamColor: string;
      teamSecondaryColor: string;
    } | undefined;

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Get acquisition info
    const acquisition = db.prepare(`
      SELECT 
        acquisition_type as type, date, trade_id as tradeId, 
        origin_trade_id as originTradeId, pick_id as pickId, notes
      FROM acquisitions
      WHERE player_id = ?
      ORDER BY date DESC
      LIMIT 1
    `).get(id) as {
      type: string;
      date: string;
      tradeId: number | null;
      originTradeId: number | null;
      pickId: number | null;
      notes: string | null;
    } | undefined;

    // Get all trade chains for this player
    const chains = db.prepare(`
      SELECT 
        tc.id, tc.origin_trade_id as originTradeId, tc.chain_json as chainJson,
        tc.branch_index as branchIndex,
        t.date as originDate, t.description as originDescription
      FROM trade_chains tc
      JOIN trades t ON tc.origin_trade_id = t.id
      WHERE tc.resulting_player_id = ?
      ORDER BY tc.branch_index ASC
    `).all(id) as Array<{
      id: number;
      originTradeId: number;
      chainJson: string;
      branchIndex: number;
      originDate: string;
      originDescription: string;
    }>;

    // Get all teams for color lookup
    const teamsResult = db.prepare(`
      SELECT abbreviation, name, primary_color, secondary_color FROM teams
    `).all() as Array<{
      abbreviation: string;
      name: string;
      primary_color: string;
      secondary_color: string;
    }>;

    const teamColors: Record<string, { primary: string; secondary: string; name: string }> = {};
    teamsResult.forEach(t => {
      teamColors[t.abbreviation] = { 
        primary: t.primary_color || '#666', 
        secondary: t.secondary_color || '#333',
        name: t.name
      };
    });

    // Build tree structure
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
        secondaryColor: player.teamSecondaryColor || "#333",
        imageUrl: player.headshotUrl || undefined,
      },
    });

    if (chains.length > 0) {
      // Process each chain branch
      chains.forEach((chainData, branchIdx) => {
        const chain: ChainStep[] = JSON.parse(chainData.chainJson);
        
        if (chain.length === 0) return;

        // Build nodes for this chain branch
        let prevNodeId = `player-${player.id}`;

        // Process chain in reverse (from most recent to origin)
        for (let i = chain.length - 1; i >= 0; i--) {
          const step = chain[i];
          const baseNodeId = `chain-${branchIdx}-${i}`;
          
          // Determine node type based on content
          const isDraft = step.action?.toLowerCase().includes('draft') || step.event.toLowerCase().includes('draft');
          
          // Get team colors
          const teamFromColor = step.teamFrom ? teamColors[step.teamFrom]?.primary : undefined;
          const teamToColor = step.teamTo ? teamColors[step.teamTo]?.primary : undefined;

          // Check if this trade has multiple assets to split
          const assetsToSplit = step.assets || [];
          const shouldSplitAssets = !isDraft && assetsToSplit.length > 1;

          if (shouldSplitAssets) {
            // Create trade header node
            const headerNodeId = `${baseNodeId}-header`;
            nodes.push({
              id: headerNodeId,
              type: "trade-header",
              data: {
                label: step.event,
                sublabel: step.action,
                date: step.date,
                teamFrom: step.teamFrom,
                teamTo: step.teamTo,
                teamFromColor,
                teamToColor,
                color: teamFromColor,
              },
            });

            // Create individual asset nodes
            assetsToSplit.forEach((asset, assetIdx) => {
              const assetNodeId = `${baseNodeId}-asset-${assetIdx}`;
              const isPickAsset = asset.toLowerCase().includes('pick') || 
                                   asset.toLowerCase().includes('1st') || 
                                   asset.toLowerCase().includes('2nd');
              
              nodes.push({
                id: assetNodeId,
                type: "asset",
                data: {
                  label: asset,
                  assetType: isPickAsset ? "pick" : "player",
                  teamFrom: step.teamFrom,
                  teamTo: step.teamTo,
                  color: teamFromColor,
                  teamFromColor,
                  teamToColor,
                  assetIndex: assetIdx,
                  totalAssets: assetsToSplit.length,
                  parentTradeId: headerNodeId,
                },
              });

              // Edge from header to each asset
              edges.push({
                id: `edge-${headerNodeId}-${assetNodeId}`,
                source: headerNodeId,
                target: assetNodeId,
              });

              // Edge from each asset to the next node in chain
              edges.push({
                id: `edge-${assetNodeId}-${prevNodeId}`,
                source: assetNodeId,
                target: prevNodeId,
              });
            });

            prevNodeId = headerNodeId;
          } else {
            // Single asset or draft pick - use original behavior
            const nodeType = isDraft ? 'pick' : 'trade';

            nodes.push({
              id: baseNodeId,
              type: nodeType,
              data: {
                label: step.event,
                sublabel: step.action,
                date: step.date,
                teamFrom: step.teamFrom,
                teamTo: step.teamTo,
                assets: step.assets,
                received: step.received,
                teamFromColor,
                teamToColor,
                color: teamToColor || teamFromColor,
              },
            });

            edges.push({
              id: `edge-${baseNodeId}-${prevNodeId}`,
              source: baseNodeId,
              target: prevNodeId,
              label: isDraft ? "Drafted" : undefined,
            });

            prevNodeId = baseNodeId;
          }
        }
      });
    } else if (acquisition) {
      // Fallback: simple acquisition node if no chain
      const nodeId = `acq-${player.id}`;
      nodes.push({
        id: nodeId,
        type: acquisition.type === 'draft' ? 'pick' : 'trade',
        data: {
          label: acquisition.type === 'draft' 
            ? `Drafted #${player.draftPick} (${player.draftYear})`
            : `Acquired via ${acquisition.type}`,
          sublabel: acquisition.notes || undefined,
          date: acquisition.date,
        },
      });

      edges.push({
        id: `edge-${nodeId}-player-${player.id}`,
        source: nodeId,
        target: `player-${player.id}`,
      });
    }

    // Get origin trade details if exists
    let originTrade = null;
    if (chains.length > 0) {
      const trade = db.prepare(`
        SELECT id, date, description FROM trades WHERE id = ?
      `).get(chains[0].originTradeId) as { id: number; date: string; description: string } | undefined;
      originTrade = trade || null;
    }

    // Get all branches info for UI
    const branches = chains.map((c, idx) => ({
      index: idx,
      originDate: c.originDate,
      description: c.originDescription,
      stepsCount: JSON.parse(c.chainJson).length,
    }));

    return NextResponse.json({
      player,
      acquisition: acquisition || null,
      originTrade,
      chains: chains.map(c => JSON.parse(c.chainJson)),
      branches,
      nodes,
      edges,
    });
  } finally {
    db.close();
  }
}
