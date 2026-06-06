import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

interface TreeNode {
  id: string;
  type: string;
  data: {
    label: string;
    sublabel?: string;
    date?: string;
    nodeType: "player" | "pick" | "cash" | "trade-action";
    acquisitionType?: string;
    tradePartner?: string;
    isOrigin?: boolean;
    isRosterPlayer?: boolean;
    isHomegrown?: boolean;
    rosterCategory?: "starter" | "bench" | "two-way";
  };
}

interface TreeEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

interface TeamTreeData {
  team: string;
  teamName: string;
  nodes: TreeNode[];
  edges: TreeEdge[];
  teamColors: { primary: string; secondary: string };
  rosterCount: number;
  homegrownCount: number;
  tradeCount: number;
  earliestOrigin: number;
}

async function getTeamTree(teamAbbr: string): Promise<TeamTreeData | null> {
  try {
    // Use the same host detection logic as the team page
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.rosterdna.com'
      : 'http://localhost:3456';
      
    const res = await fetch(`${baseUrl}/api/acquisition-tree/${teamAbbr}/team`, {
      cache: "no-store"
    });
    
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch team tree:", error);
    return null;
  }
}

function getNodeColor(node: TreeNode): string {
  if (node.data.isOrigin) return "#f59e0b"; // amber
  if (node.data.isRosterPlayer) return "#22c55e"; // green
  if (node.data.nodeType === "pick") return "#a855f7"; // purple
  if (node.data.acquisitionType === "trade") return "#3b82f6"; // blue
  return "#6b7280"; // gray
}

function getNodeLabel(node: TreeNode): string {
  let label = node.data.label;
  if (label.length > 12) {
    label = label.slice(0, 11) + "…";
  }
  return label;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamAbbr: string }> }
) {
  const { teamAbbr } = await params;
  const team = teamAbbr.toUpperCase();
  
  const treeData = await getTeamTree(teamAbbr);
  if (!treeData) {
    return new Response("Team not found", { status: 404 });
  }

  // Filter and organize nodes for the visualization
  const rosterNodes = treeData.nodes
    .filter(n => n.data.isRosterPlayer)
    .sort((a, b) => {
      const orderA = a.data.rosterCategory === "starter" ? 1 : 2;
      const orderB = b.data.rosterCategory === "starter" ? 1 : 2;
      return orderA - orderB;
    })
    .slice(0, 12); // Show top 12 players

  const originNodes = treeData.nodes.filter(n => n.data.isOrigin);
  const tradeNodes = treeData.nodes
    .filter(n => n.data.acquisitionType === "trade" && !n.data.isRosterPlayer)
    .slice(0, 8); // Show key trade nodes

  const pickNodes = treeData.nodes
    .filter(n => n.data.nodeType === "pick")
    .slice(0, 6); // Show key draft picks

  // Combine key nodes for visualization
  const keyNodes = [
    ...rosterNodes,
    ...originNodes,
    ...tradeNodes.slice(0, 4),
    ...pickNodes.slice(0, 3)
  ].slice(0, 20); // Max 20 nodes for clean layout

  // Create a simple layout (3 columns, multiple rows)
  const nodesPerColumn = Math.ceil(keyNodes.length / 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#09090b",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div 
          style={{ 
            position: "absolute", 
            top: 0, 
            left: 0, 
            right: 0, 
            height: "4px", 
            background: `linear-gradient(90deg, ${treeData.teamColors.primary}, ${treeData.teamColors.secondary})`,
            display: "flex" 
          }} 
        />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: treeData.teamColors.primary, fontSize: "14px", fontWeight: 700, letterSpacing: "1px", display: "flex" }}>
              ROSTER DNA
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#fff", display: "flex" }}>
              {treeData.teamName} Trade Tree
            </div>
          </div>
          
          {/* Stats */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#22c55e", display: "flex" }}>
                {treeData.rosterCount}
              </div>
              <div style={{ fontSize: "9px", fontWeight: 600, color: "#52525b", display: "flex" }}>
                PLAYERS
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#3b82f6", display: "flex" }}>
                {treeData.tradeCount}
              </div>
              <div style={{ fontSize: "9px", fontWeight: 600, color: "#52525b", display: "flex" }}>
                TRADES
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#f59e0b", display: "flex" }}>
                {treeData.earliestOrigin}
              </div>
              <div style={{ fontSize: "9px", fontWeight: 600, color: "#52525b", display: "flex" }}>
                ORIGIN
              </div>
            </div>
          </div>
        </div>

        {/* Main visualization area */}
        <div style={{ 
          flex: 1, 
          display: "flex", 
          gap: "12px",
          justifyContent: "space-between",
          alignItems: "flex-start"
        }}>
          {/* Column 1: Roster Players */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "8px",
            flex: 1
          }}>
            <div style={{ 
              fontSize: "11px", 
              fontWeight: 700, 
              color: "#22c55e", 
              marginBottom: "4px",
              display: "flex"
            }}>
              CURRENT ROSTER
            </div>
            {rosterNodes.slice(0, 8).map((node, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: "#18181b",
                  borderRadius: "6px",
                  borderLeft: `3px solid ${getNodeColor(node)}`,
                  padding: "6px 8px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ 
                  color: "#e4e4e7", 
                  fontSize: "11px", 
                  fontWeight: 700,
                  display: "flex"
                }}>
                  {getNodeLabel(node)}
                </div>
                {node.data.rosterCategory && (
                  <div style={{ 
                    color: node.data.rosterCategory === "starter" ? "#fbbf24" : "#a3a3a3", 
                    fontSize: "8px", 
                    fontWeight: 600,
                    textTransform: "uppercase",
                    display: "flex"
                  }}>
                    {node.data.rosterCategory}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Column 2: Trade Chain */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "8px",
            flex: 1
          }}>
            <div style={{ 
              fontSize: "11px", 
              fontWeight: 700, 
              color: "#3b82f6", 
              marginBottom: "4px",
              display: "flex"
            }}>
              TRADE ASSETS
            </div>
            {tradeNodes.slice(0, 6).map((node, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: "#18181b",
                  borderRadius: "6px",
                  borderLeft: `3px solid ${getNodeColor(node)}`,
                  padding: "6px 8px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ 
                  color: "#e4e4e7", 
                  fontSize: "11px", 
                  fontWeight: 700,
                  display: "flex"
                }}>
                  {getNodeLabel(node)}
                </div>
                {node.data.tradePartner && (
                  <div style={{ 
                    color: "#3b82f6", 
                    fontSize: "8px", 
                    fontWeight: 600,
                    display: "flex"
                  }}>
                    via {node.data.tradePartner}
                  </div>
                )}
              </div>
            ))}

            {/* Show some picks in this column too */}
            {pickNodes.slice(0, 3).map((node, i) => (
              <div
                key={`pick-${i}`}
                style={{
                  backgroundColor: "#18181b",
                  borderRadius: "6px",
                  borderLeft: `3px solid ${getNodeColor(node)}`,
                  padding: "6px 8px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ 
                  color: "#e4e4e7", 
                  fontSize: "11px", 
                  fontWeight: 700,
                  display: "flex"
                }}>
                  {getNodeLabel(node)}
                </div>
                <div style={{ 
                  color: "#a855f7", 
                  fontSize: "8px", 
                  fontWeight: 600,
                  display: "flex"
                }}>
                  PICK
                </div>
              </div>
            ))}
          </div>

          {/* Column 3: Origins & Key Connections */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "8px",
            flex: 1
          }}>
            <div style={{ 
              fontSize: "11px", 
              fontWeight: 700, 
              color: "#f59e0b", 
              marginBottom: "4px",
              display: "flex"
            }}>
              ORIGINS
            </div>
            {originNodes.map((node, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: "#18181b",
                  borderRadius: "6px",
                  borderLeft: `3px solid ${getNodeColor(node)}`,
                  padding: "6px 8px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ 
                  color: "#e4e4e7", 
                  fontSize: "11px", 
                  fontWeight: 700,
                  display: "flex"
                }}>
                  ★ {getNodeLabel(node)}
                </div>
                {node.data.date && (
                  <div style={{ 
                    color: "#f59e0b", 
                    fontSize: "8px", 
                    fontWeight: 600,
                    display: "flex"
                  }}>
                    {new Date(node.data.date).getFullYear()}
                  </div>
                )}
              </div>
            ))}

            {/* Visual connection lines indicator */}
            <div style={{
              backgroundColor: "#27272a",
              borderRadius: "6px",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "8px"
            }}>
              <div style={{ 
                color: "#71717a", 
                fontSize: "10px", 
                fontWeight: 600,
                display: "flex",
                marginBottom: "4px"
              }}>
                CONNECTED BY
              </div>
              <div style={{ 
                color: "#a3a3a3", 
                fontSize: "8px", 
                textAlign: "center",
                display: "flex"
              }}>
                {treeData.edges.length} trade paths
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
          <div style={{ 
            color: "#71717a", 
            fontSize: "10px", 
            display: "flex"
          }}>
            Interactive tree visualization available at rosterdna.com
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ fontSize: "12px", color: "#71717a", display: "flex" }}>🧬</div>
            <div style={{ fontSize: "12px", color: "#71717a", fontWeight: 600, display: "flex" }}>
              RosterDNA
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}