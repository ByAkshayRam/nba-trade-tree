import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "..", "data", "nba_trades.db");

// Helper to look up who was drafted with a pick
function getPickOutcome(db: Database.Database, pickDescription: string): { playerName: string; pickNumber: number } | null {
  // Parse year and round from descriptions like "2016 1st Round Pick" or "2024 1st"
  const yearMatch = pickDescription.match(/(\d{4})/);
  const roundMatch = pickDescription.match(/1st|2nd|first|second/i);
  
  if (!yearMatch) return null;
  
  const year = parseInt(yearMatch[1]);
  const round = roundMatch && (roundMatch[0].toLowerCase().includes('2') || roundMatch[0].toLowerCase() === 'second') ? 2 : 1;
  
  try {
    const pick = db.prepare(`
      SELECT dp.pick_number, p.name as player_name 
      FROM draft_picks dp 
      LEFT JOIN players p ON dp.player_id = p.id 
      WHERE dp.year = ? AND dp.round = ? AND dp.player_id IS NOT NULL
      LIMIT 1
    `).get(year, round) as { pick_number: number; player_name: string } | undefined;
    
    if (pick && pick.player_name) {
      return { playerName: pick.player_name, pickNumber: pick.pick_number };
    }
  } catch (e) {
    // Ignore errors, just return null
  }
  
  return null;
}

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
    assetType?: "player" | "pick" | "cash";
    assetIndex?: number;
    totalAssets?: number;
    parentTradeId?: string;
    direction?: "sent" | "received";
    position?: "above" | "below";
  };
}

interface TreeEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  acquisitionType?: 'trade' | 'draft' | 'signing' | 'waiver';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await params;
  const id = parseInt(playerId, 10);
  
  // Get view mode from query params (compact is default, detailed for future toggle)
  const { searchParams } = new URL(request.url);
  const viewMode = searchParams.get('mode') || 'compact'; // 'compact' or 'detailed'

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
  }

  const db = new Database(dbPath, { readonly: true });

  try {
    // Get player info with team
    const player = db.prepare(`
      SELECT 
        p.id, p.name, p.draft_year as draftYear, p.draft_pick as draftPick,
        p.draft_round as draftRound,
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
      draftRound: number;
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

    // Get ALL acquisitions for this player (full transaction history)
    const allAcquisitions = db.prepare(`
      SELECT 
        a.acquisition_type as type, a.date, a.trade_id as tradeId, 
        a.origin_trade_id as originTradeId, a.pick_id as pickId, a.notes,
        t.abbreviation as teamAbbr, t.name as teamName, 
        t.primary_color as teamColor, t.secondary_color as teamSecondaryColor
      FROM acquisitions a
      LEFT JOIN teams t ON a.team_id = t.id
      WHERE a.player_id = ?
      ORDER BY a.date ASC
    `).all(id) as Array<{
      type: string;
      date: string;
      tradeId: number | null;
      originTradeId: number | null;
      pickId: number | null;
      notes: string | null;
      teamAbbr: string;
      teamName: string;
      teamColor: string;
      teamSecondaryColor: string;
    }>;
    
    // Most recent acquisition for backwards compatibility
    const acquisition = allAcquisitions.length > 0 
      ? allAcquisitions[allAcquisitions.length - 1] 
      : undefined;

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

    // Helper to format draft round as ordinal
    const formatRound = (round: number): string => {
      if (round === 1) return "1st Round";
      if (round === 2) return "2nd Round";
      return `Round ${round}`;
    };

    // Player node (current)
    const draftInfo = player.draftYear && player.draftRound
      ? `${formatRound(player.draftRound)} (${player.draftYear})`
      : player.draftYear 
        ? `(${player.draftYear})`
        : "";
    
    nodes.push({
      id: `player-${player.id}`,
      type: "player",
      data: {
        label: player.name,
        sublabel: `${player.teamAbbr}${draftInfo ? ` • ${draftInfo}` : ""}`,
        color: player.teamColor || "#007A33",
        secondaryColor: player.teamSecondaryColor || "#333",
        imageUrl: player.headshotUrl || undefined,
      },
    });

    // Calculate which data source is more complete
    const chainStepsCount = chains.reduce((sum, c) => sum + JSON.parse(c.chainJson).length, 0);
    const useChains = chains.length > 0 && chainStepsCount >= allAcquisitions.length;

    if (useChains) {
      // Process each chain branch (for complex multi-asset trades)
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

          // Assets sent in trade
          const assetsSent = step.assets || [];
          // Assets received
          const assetsReceived = step.received || [];

          // COMPACT MODE: Single trade node with assets listed inline
          if (viewMode === 'compact') {
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
                assets: assetsSent.length > 0 ? assetsSent : undefined,
                received: assetsReceived.length > 0 ? assetsReceived : undefined,
                teamFromColor,
                teamToColor,
                color: teamFromColor || teamToColor,
              },
            });

            edges.push({
              id: `edge-${baseNodeId}-${prevNodeId}`,
              source: baseNodeId,
              target: prevNodeId,
              acquisitionType: isDraft ? 'draft' : 'trade',
            });

            prevNodeId = baseNodeId;
            continue;
          }
          
          // DETAILED MODE: Separate asset nodes (legacy behavior for future toggle)
          // Filter received assets to only the pick matching the player's draft year
          const relevantReceivedPick = assetsReceived.find(pick => {
            const yearMatch = pick.match(/(\d{4})/);
            if (yearMatch && player.draftYear) {
              return parseInt(yearMatch[1]) === player.draftYear;
            }
            return false;
          });
          
          // Only show sent assets above, and the one relevant pick below
          const sentAssets = assetsSent.map(a => ({ label: a, direction: 'sent' as const, position: 'above' as const }));
          const receivedAsset = relevantReceivedPick ? [{ label: relevantReceivedPick, direction: 'received' as const, position: 'below' as const }] : [];
          
          const allAssets = [...sentAssets, ...receivedAsset];
          const shouldSplitAssets = !isDraft && sentAssets.length > 0;

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

            // Create individual asset nodes - sent assets above, received pick below
            allAssets.forEach((assetInfo, assetIdx) => {
              const asset = assetInfo.label;
              const direction = assetInfo.direction;
              const position = assetInfo.position; // 'above' or 'below'
              const assetNodeId = `${baseNodeId}-asset-${direction}-${assetIdx}`;
              const assetLower = asset.toLowerCase();
              
              // Determine asset type
              const isPickAsset = assetLower.includes('pick') || 
                                   assetLower.includes('1st') || 
                                   assetLower.includes('2nd') ||
                                   assetLower.includes('round');
              const isCashAsset = assetLower.includes('cash') || 
                                   assetLower.includes('$') ||
                                   assetLower.includes('million');
              
              let assetType: "player" | "pick" | "cash" = "player";
              if (isPickAsset) assetType = "pick";
              else if (isCashAsset) assetType = "cash";
              
              // For picks, look up who was drafted (only in detailed mode)
              let pickOutcome: string | undefined;
              if (isPickAsset) {
                const outcome = getPickOutcome(db, asset);
                if (outcome) {
                  pickOutcome = `→ Became ${outcome.playerName} (#${outcome.pickNumber})`;
                }
              }
              
              nodes.push({
                id: assetNodeId,
                type: "asset",
                data: {
                  label: asset,
                  sublabel: pickOutcome,
                  assetType,
                  direction, // 'sent' or 'received'
                  position, // 'above' or 'below' the trade header
                  teamFrom: direction === 'sent' ? step.teamFrom : step.teamTo,
                  teamTo: direction === 'sent' ? step.teamTo : step.teamFrom,
                  color: direction === 'received' ? teamToColor : teamFromColor,
                  teamFromColor,
                  teamToColor,
                  assetIndex: assetIdx,
                  totalAssets: allAssets.length,
                  parentTradeId: headerNodeId,
                },
              });

              // Edge from each asset DOWN to the trade header (assets are ABOVE)
              edges.push({
                id: `edge-${assetNodeId}-${headerNodeId}`,
                source: assetNodeId,
                target: headerNodeId,
              });
            });

            // Edge from trade header to the next node in chain
            edges.push({
              id: `edge-${headerNodeId}-${prevNodeId}`,
              source: headerNodeId,
              target: prevNodeId,
              acquisitionType: 'trade',
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
              acquisitionType: isDraft ? 'draft' : 'trade',
            });

            prevNodeId = baseNodeId;
          }
        }
      });
    } else if (allAcquisitions.length > 0) {
      // Build timeline from all acquisitions (draft → trades/signings → current)
      // Process in REVERSE order (most recent first, working back to draft)
      // so edges point from origin → player
      let prevNodeId = `player-${player.id}`;
      
      for (let i = allAcquisitions.length - 1; i >= 0; i--) {
        const acq = allAcquisitions[i];
        const nodeId = `acq-${player.id}-${i}`;
        const color = acq.teamColor || '#666';
        
        // Determine node type and label based on acquisition type
        let nodeType: 'pick' | 'trade' = 'trade';
        let label = '';
        let sublabel = acq.notes || undefined;
        
        if (acq.type === 'draft') {
          nodeType = 'pick';
          label = `Drafted #${player.draftPick} (${player.draftYear})`;
          sublabel = `by ${acq.teamName}`;
        } else if (acq.type === 'signing') {
          label = `Signed with ${acq.teamAbbr}`;
        } else if (acq.type === 'trade') {
          label = `Traded to ${acq.teamAbbr}`;
        } else {
          label = `Joined ${acq.teamAbbr}`;
        }
        
        nodes.push({
          id: nodeId,
          type: nodeType,
          data: {
            label,
            sublabel,
            date: acq.date,
            color,
            teamTo: acq.teamAbbr,
            teamToColor: color,
          },
        });
        
        edges.push({
          id: `edge-${nodeId}-${prevNodeId}`,
          source: nodeId,
          target: prevNodeId,
          acquisitionType: acq.type as 'trade' | 'draft' | 'signing' | 'waiver',
        });
        
        prevNodeId = nodeId;
      }
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
