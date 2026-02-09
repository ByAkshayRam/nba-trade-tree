"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MarkerType,
  NodeMouseHandler,
  Handle,
  Position,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";

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

interface TreeData {
  player: {
    id: number;
    name: string;
    draftYear: number;
    draftPick: number;
    headshotUrl: string | null;
    teamAbbr: string;
    teamName: string;
    teamColor: string;
    teamSecondaryColor: string;
  };
  acquisition: {
    type: string;
    date: string;
    originTradeId: number | null;
  } | null;
  originTrade: {
    id: number;
    date: string;
    description: string;
  } | null;
  chains: ChainStep[][];
  branches: Array<{
    index: number;
    originDate: string;
    description: string;
    stepsCount: number;
  }>;
  nodes: TreeNode[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    acquisitionType?: 'trade' | 'draft' | 'signing' | 'waiver';
  }>;
}

interface TradeTreeProps {
  playerId: number;
}

// Format date from "YYYY-MM-DD" to "Month Day, Year"
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

// Custom node component for players - enhanced
function PlayerNode({ data }: { data: TreeNode["data"] }) {
  return (
    <div
      className="rounded-xl shadow-2xl min-w-[280px] overflow-hidden cursor-pointer relative"
      style={{
        backgroundColor: "#18181b",
        border: `3px solid ${data.color || "#22c55e"}`,
        boxShadow: `0 0 30px ${data.color || "#22c55e"}50`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-500 !w-3 !h-3 !border-2 !border-green-300" />
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3 !border-2 !border-green-300" />
      
      {/* Header bar with team color */}
      <div 
        className="h-2"
        style={{ backgroundColor: data.color || "#22c55e" }}
      />
      
      <div className="p-4">
        <div className="flex items-center gap-4">
          {data.imageUrl && (
            <img
              src={data.imageUrl}
              alt=""
              className="w-16 h-16 rounded-full object-cover border-3"
              style={{ borderColor: data.color || "#22c55e", borderWidth: '3px' }}
            />
          )}
          <div className="flex-1">
            <div className="font-bold text-white text-xl">{data.label}</div>
            {data.sublabel && (
              <div className="text-sm text-zinc-400 mt-1">{data.sublabel}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// New Trade Node matching reference style - "Team Gets:" format
function TradeNode({ data }: { data: TreeNode["data"] }) {
  const teamFromColor = data.teamFromColor || "#666";
  const teamToColor = data.teamToColor || "#666";
  
  return (
    <div className="flex gap-3 cursor-pointer relative">
      <Handle type="target" position={Position.Top} className="!bg-green-500 !w-3 !h-3 !border-2 !border-green-300 !left-1/2" />
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3 !border-2 !border-green-300 !left-1/2" />
      
      {/* Team FROM box - what they sent */}
      {data.teamFrom && data.assets && data.assets.length > 0 && (
        <div 
          className="rounded-lg overflow-hidden min-w-[200px] shadow-lg"
          style={{ 
            backgroundColor: `${teamFromColor}20`,
            border: `2px solid ${teamFromColor}`,
          }}
        >
          <div 
            className="px-3 py-2 text-white text-sm font-bold flex items-center gap-2"
            style={{ backgroundColor: teamFromColor }}
          >
            <span className="opacity-80">{data.teamFrom}</span>
            <span className="text-xs opacity-70">Sends:</span>
          </div>
          <div className="p-3 space-y-1">
            {data.assets.map((asset, i) => (
              <div key={i} className="text-white text-sm flex items-center gap-2">
                <span className="text-zinc-500">•</span>
                {asset}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Arrow */}
      <div className="flex items-center text-green-500 text-2xl font-bold">
        →
      </div>
      
      {/* Team TO box - what they received */}
      {data.teamTo && data.received && data.received.length > 0 && (
        <div 
          className="rounded-lg overflow-hidden min-w-[200px] shadow-lg"
          style={{ 
            backgroundColor: `${teamToColor}20`,
            border: `2px solid ${teamToColor}`,
          }}
        >
          <div 
            className="px-3 py-2 text-white text-sm font-bold flex items-center gap-2"
            style={{ backgroundColor: teamToColor }}
          >
            <span className="opacity-80">{data.teamTo}</span>
            <span className="text-xs opacity-70">Gets:</span>
          </div>
          <div className="p-3 space-y-1">
            {data.received.map((asset, i) => (
              <div key={i} className="text-white text-sm flex items-center gap-2">
                <span className="text-green-500">✓</span>
                {asset}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Date badge */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full border border-zinc-700 whitespace-nowrap">
        {formatDate(data.date || '')}
      </div>
    </div>
  );
}

// Simplified trade node for single-sided display
function SimpleTradeNode({ data }: { data: TreeNode["data"] }) {
  const color = data.color || "#666";
  
  return (
    <div 
      className="rounded-lg overflow-hidden min-w-[280px] shadow-lg cursor-pointer relative"
      style={{ 
        backgroundColor: `${color}15`,
        border: `2px solid ${color}`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-500 !w-3 !h-3 !border-2 !border-green-300" />
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3 !border-2 !border-green-300" />
      
      <div 
        className="px-3 py-2 text-white text-sm font-bold"
        style={{ backgroundColor: color }}
      >
        <div className="flex items-center justify-between">
          <span>🔄 Trade</span>
          <span className="text-xs opacity-70">{formatDate(data.date || '')}</span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-white text-sm font-medium leading-relaxed">{data.label}</div>
        {data.sublabel && (
          <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
            <span>→</span> {data.sublabel}
          </div>
        )}
        
        {/* Inline assets for compact mode */}
        {(data.assets || data.received) && (
          <div className="mt-3 pt-3 border-t border-zinc-700 flex gap-4 text-xs">
            {data.assets && data.assets.length > 0 && (
              <div className="flex-1">
                <div className="text-zinc-500 uppercase text-[10px] mb-1">Sent →</div>
                <div className="text-zinc-400 space-y-0.5">
                  {data.assets.map((asset: string, i: number) => (
                    <div key={i}>{asset}</div>
                  ))}
                </div>
              </div>
            )}
            {data.received && data.received.length > 0 && (
              <div className="flex-1">
                <div className="text-zinc-500 uppercase text-[10px] mb-1">← Received</div>
                <div className="text-green-400 space-y-0.5">
                  {data.received.map((asset: string, i: number) => (
                    <div key={i}>{asset}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PickNode({ data }: { data: TreeNode["data"] }) {
  const color = data.color || "#22c55e";
  
  return (
    <div 
      className="rounded-lg overflow-hidden min-w-[280px] shadow-lg cursor-pointer relative"
      style={{ 
        backgroundColor: `${color}15`,
        border: `2px solid ${color}`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-500 !w-3 !h-3 !border-2 !border-green-300" />
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3 !border-2 !border-green-300" />
      
      <div 
        className="px-3 py-2 text-white text-sm font-bold"
        style={{ backgroundColor: color }}
      >
        <div className="flex items-center justify-between">
          <span>🎯 Draft Pick</span>
          <span className="text-xs opacity-70">{formatDate(data.date || '')}</span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-white text-sm font-medium leading-relaxed">{data.label}</div>
        {data.sublabel && (
          <div className="text-xs text-zinc-300 mt-2 flex items-center gap-1">
            <span>→</span> {data.sublabel}
          </div>
        )}
      </div>
    </div>
  );
}

// Trade Header Node - displays trade event info without listing all assets
function TradeHeaderNode({ data }: { data: TreeNode["data"] }) {
  const color = data.teamFromColor || data.color || "#666";
  
  return (
    <div 
      className="rounded-lg overflow-hidden min-w-[320px] shadow-lg cursor-pointer relative"
      style={{ 
        backgroundColor: "#141416",
        border: `2px solid ${color}`,
        boxShadow: `0 4px 20px ${color}30`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-500 !w-3 !h-3 !border-2 !border-green-300" />
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3 !border-2 !border-green-300" />
      
      <div 
        className="px-4 py-2 text-white text-sm font-bold flex items-center justify-between"
        style={{ backgroundColor: color }}
      >
        <div className="flex items-center gap-2">
          <span>🔄</span>
          <span>Trade</span>
        </div>
        <span className="text-xs opacity-80 font-normal">{formatDate(data.date || '')}</span>
      </div>
      <div className="p-4">
        <div className="text-white text-sm font-medium leading-relaxed">{data.label}</div>
        {data.sublabel && (
          <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
            <span>→</span> {data.sublabel}
          </div>
        )}
        {data.teamFrom && data.teamTo && (
          <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500">
            <span 
              className="px-2 py-1 rounded"
              style={{ backgroundColor: `${data.teamFromColor}30`, color: data.teamFromColor }}
            >
              {data.teamFrom}
            </span>
            <span>→</span>
            <span 
              className="px-2 py-1 rounded"
              style={{ backgroundColor: `${data.teamToColor}30`, color: data.teamToColor }}
            >
              {data.teamTo}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Individual Asset Node - compact representation of a single player, pick, or cash
function AssetNode({ data }: { data: TreeNode["data"] }) {
  const isReceived = data.direction === 'received';
  const color = isReceived ? (data.teamToColor || data.color || "#22c55e") : (data.teamFromColor || data.color || "#666");
  const assetType = data.assetType || "player";
  
  // Determine icon based on asset type
  const getIcon = () => {
    switch (assetType) {
      case "pick": return "🎯";
      case "cash": return "💵";
      default: return "👤";
    }
  };
  
  return (
    <div 
      className="rounded-lg overflow-hidden min-w-[140px] max-w-[200px] shadow-lg cursor-pointer relative"
      style={{ 
        backgroundColor: "#141416",
        border: `2px solid ${color}`,
        boxShadow: `0 2px 12px ${color}25`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-green-500 !w-2 !h-2 !border-2 !border-green-300" />
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-2 !h-2 !border-2 !border-green-300" />
      
      {/* Compact header bar */}
      <div 
        className="h-1.5"
        style={{ backgroundColor: color }}
      />
      
      <div className="p-3">
        {/* Direction indicator for received assets */}
        {isReceived && (
          <div className="text-[10px] text-green-400 font-medium mb-1 uppercase tracking-wide">
            ⬇ Received
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-lg">{getIcon()}</span>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{data.label}</div>
            {!isReceived && (
              <div className="text-xs text-zinc-500 mt-0.5">
                {data.teamFrom} → {data.teamTo}
              </div>
            )}
          </div>
        </div>
        {/* Show pick outcome if available */}
        {data.sublabel && (
          <div className="text-xs text-green-400 mt-2 pt-2 border-t border-zinc-700">
            {data.sublabel}
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  player: PlayerNode,
  trade: SimpleTradeNode,
  pick: PickNode,
  "trade-header": TradeHeaderNode,
  asset: AssetNode,
};

export function TradeTree({ playerId }: TradeTreeProps) {
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  useEffect(() => {
    async function fetchTree() {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/tree/${playerId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch tree data");
        }
        const data = await response.json();
        setTreeData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    if (playerId) {
      fetchTree();
    }
  }, [playerId]);

  useEffect(() => {
    if (!treeData) return;

    // Layout: Origin at TOP, Player at BOTTOM
    const nodeSpacingY = 350; // Large spacing to account for variable node heights
    const assetRowSpacing = 200; // Extra space for asset rows
    const branchSpacingX = 600;
    const containerWidth = 1400;
    const nodeWidth = 300;
    const assetNodeWidth = 160;
    const assetSpacing = 20;
    
    // Separate nodes by type and structure
    const headerNodes: TreeNode[] = [];
    const assetNodes: Map<string, TreeNode[]> = new Map(); // parentTradeId -> assets
    const regularNodes: TreeNode[] = [];
    const playerNode = treeData.nodes.find(n => n.id.startsWith('player-'));
    
    treeData.nodes.forEach((node) => {
      if (node.id.startsWith('player-')) return;
      
      if (node.type === 'trade-header') {
        headerNodes.push(node);
      } else if (node.type === 'asset') {
        const parentId = node.data.parentTradeId || '';
        if (!assetNodes.has(parentId)) {
          assetNodes.set(parentId, []);
        }
        assetNodes.get(parentId)!.push(node);
      } else {
        regularNodes.push(node);
      }
    });

    // Group regular nodes by branch
    const branchNodes: Map<number, Array<{ node: TreeNode; index: number; isHeader: boolean }>> = new Map();
    
    [...regularNodes, ...headerNodes].forEach((node) => {
      const match = node.id.match(/chain-(\d+)-(\d+)/);
      if (match) {
        const branchIdx = parseInt(match[1]);
        const stepIdx = parseInt(match[2]);
        
        if (!branchNodes.has(branchIdx)) {
          branchNodes.set(branchIdx, []);
        }
        branchNodes.get(branchIdx)!.push({ 
          node, 
          index: stepIdx, 
          isHeader: node.type === 'trade-header' 
        });
      }
    });

    const positionedNodes: Node[] = [];
    const styledEdges: Edge[] = [];

    // Calculate total branches for centering
    const numBranches = branchNodes.size || 1;
    const totalWidth = (numBranches - 1) * branchSpacingX;
    const startX = (containerWidth - totalWidth) / 2 - nodeWidth / 2;

    // Track max Y position across all branches to place player at bottom
    let maxFinalY = 0;

    // Position each branch
    let branchIndex = 0;
    branchNodes.forEach((steps) => {
      // Sort by step index (ascending so origin trade is at TOP, flows down to player)
      steps.sort((a, b) => a.index - b.index);
      
      const branchX = startX + branchIndex * branchSpacingX;
      let currentY = 0;
      
      steps.forEach((step) => {
        const nodeX = branchX;
        
        // If this is a trade header, position assets above AND below
        if (step.isHeader) {
          const assets = assetNodes.get(step.node.id) || [];
          
          // Separate above (sent) and below (received) assets
          const aboveAssets = assets.filter(a => a.data.position === 'above' || a.data.direction === 'sent');
          const belowAssets = assets.filter(a => a.data.position === 'below');
          
          // Position ABOVE assets (players sent)
          if (aboveAssets.length > 0) {
            aboveAssets.sort((a, b) => (a.data.assetIndex || 0) - (b.data.assetIndex || 0));
            const totalAboveWidth = aboveAssets.length * assetNodeWidth + (aboveAssets.length - 1) * assetSpacing;
            const aboveStartX = nodeX + (nodeWidth - totalAboveWidth) / 2;
            
            aboveAssets.forEach((asset, i) => {
              positionedNodes.push({
                id: asset.id,
                type: asset.type,
                data: asset.data,
                draggable: false,
                connectable: false,
                position: {
                  x: aboveStartX + i * (assetNodeWidth + assetSpacing),
                  y: currentY,
                },
              });
            });
            currentY += assetRowSpacing;
          }
          
          // Position the trade header
          positionedNodes.push({
            id: step.node.id,
            type: step.node.type,
            data: step.node.data,
            draggable: false,
            connectable: false,
            position: { x: nodeX, y: currentY },
          });
          currentY += nodeSpacingY;
          
          // Position BELOW assets (the relevant pick received)
          if (belowAssets.length > 0) {
            belowAssets.sort((a, b) => (a.data.assetIndex || 0) - (b.data.assetIndex || 0));
            const totalBelowWidth = belowAssets.length * assetNodeWidth + (belowAssets.length - 1) * assetSpacing;
            const belowStartX = nodeX + (nodeWidth - totalBelowWidth) / 2;
            
            belowAssets.forEach((asset, i) => {
              positionedNodes.push({
                id: asset.id,
                type: asset.type,
                data: asset.data,
                draggable: false,
                connectable: false,
                position: {
                  x: belowStartX + i * (assetNodeWidth + assetSpacing),
                  y: currentY,
                },
              });
            });
            currentY += assetRowSpacing;
          }
        } else {
          // Position the main node (regular trade or pick node)
          positionedNodes.push({
            id: step.node.id,
            type: step.node.type,
            data: step.node.data,
            draggable: false,
            connectable: false,
            position: { x: nodeX, y: currentY },
          });
          currentY += nodeSpacingY;
        }
      });

      // Track the max Y position across all branches
      maxFinalY = Math.max(maxFinalY, currentY);
      branchIndex++;
    });

    // Position player node at the bottom, after all chain nodes
    if (playerNode && branchNodes.size > 0) {
      positionedNodes.push({
        id: playerNode.id,
        type: playerNode.type,
        data: playerNode.data,
        draggable: false,
        connectable: false,
        position: { 
          x: (containerWidth - nodeWidth) / 2 - nodeWidth / 2, 
          y: maxFinalY
        },
      });
    }

    // Handle acquisition-based nodes (acq-*) that aren't part of chain system
    const acqNodes = treeData.nodes.filter(n => n.id.startsWith('acq-'));
    if (acqNodes.length > 0 && branchNodes.size === 0) {
      // Sort by index (extracted from id like "acq-37-0")
      acqNodes.sort((a, b) => {
        const aIdx = parseInt(a.id.split('-')[2] || '0');
        const bIdx = parseInt(b.id.split('-')[2] || '0');
        return aIdx - bIdx;
      });
      
      const centerX = (containerWidth - nodeWidth) / 2 - nodeWidth / 2;
      let currentY = 0;
      
      // Position acquisition nodes from origin (draft) at top flowing down to player
      acqNodes.forEach((node) => {
        positionedNodes.push({
          id: node.id,
          type: node.type,
          data: node.data,
          draggable: false,
          connectable: false,
          position: { x: centerX, y: currentY },
        });
        currentY += nodeSpacingY;
      });
      
      // Add player node at bottom
      if (playerNode) {
        positionedNodes.push({
          id: playerNode.id,
          type: playerNode.type,
          data: playerNode.data,
          draggable: false,
          connectable: false,
          position: { x: centerX, y: currentY },
        });
      }
    }

    // Create edges with styled lines
    treeData.edges.forEach((edge) => {
      // Check if this is an edge from header to asset or asset to next node
      const isAssetEdge = edge.source.includes('-asset-') || edge.target.includes('-asset-');
      // Check if this is a signing (free agent) - use dotted line
      const isSigning = edge.acquisitionType === 'signing';
      
      styledEdges.push({
        ...edge,
        type: isAssetEdge ? "bezier" : "smoothstep",
        animated: false,
        style: { 
          stroke: isSigning ? "#60a5fa" : (isAssetEdge ? "#4ade80" : "#22c55e"), 
          strokeWidth: isAssetEdge ? 1.5 : 2,
          opacity: isAssetEdge ? 0.7 : 1,
          strokeDasharray: isSigning ? "8 4" : undefined, // Dotted line for signings
        },
        // No arrows - clean lines only
      });
    });

    setNodes(positionedNodes);
    setEdges(styledEdges);
  }, [treeData, setNodes, setEdges]);

  const handleExport = useCallback(async () => {
    if (!flowRef.current || !treeData) return;
    
    setIsExporting(true);
    
    try {
      // Use the entire flow container for export
      const flowContainer = flowRef.current;
      
      const dataUrl = await toPng(flowContainer, {
        backgroundColor: '#0a0a0b',
        pixelRatio: 2,
        skipFonts: true,
        filter: (node) => {
          const className = node.className?.toString() || '';
          // Exclude minimap, controls, and panels
          if (className.includes('react-flow__minimap')) return false;
          if (className.includes('react-flow__panel')) return false;
          if (className.includes('react-flow__controls')) return false;
          // Skip external images (they cause CORS errors)
          if (node.tagName === 'IMG') {
            const src = (node as HTMLImageElement).src || '';
            if (src.includes('cdn.nba.com')) return false;
          }
          return true;
        },
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = `${treeData.player.name.replace(/\s+/g, '-')}-trade-tree.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Try again or take a screenshot instead.');
    } finally {
      setIsExporting(false);
    }
  }, [treeData]);

  if (isLoading) {
    return (
      <div className="h-[700px] flex items-center justify-center bg-[#0a0a0b] rounded-xl border border-[#232328]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-green-500 rounded-full animate-spin" />
          <div className="text-zinc-400">Loading trade tree...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[700px] flex items-center justify-center bg-[#0a0a0b] rounded-xl border border-[#232328]">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!treeData || treeData.nodes.length <= 1) {
    return (
      <div className="h-[700px] flex items-center justify-center bg-[#0a0a0b] rounded-xl border border-[#232328]">
        <div className="text-center px-4">
          <div className="text-4xl mb-4">🏀</div>
          <div className="text-zinc-300 text-lg font-medium mb-2">No Trade Tree Data</div>
          <div className="text-sm text-zinc-500 max-w-md">
            {treeData?.acquisition?.type === "draft"
              ? "This player was drafted directly — no trades in their acquisition lineage."
              : treeData?.acquisition?.type === "signing"
              ? "This player was signed as a free agent — no trade chain to display."
              : "Trade chain information not yet available for this player."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tree header with export button */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-white">Trade Tree</h4>
          <p className="text-sm text-zinc-500">
            {treeData.branches.length > 1 
              ? `${treeData.branches.length} branches from origin trade`
              : 'Trace upward to see acquisition history'
            }
          </p>
        </div>
        
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 
                     text-white rounded-lg transition-colors flex items-center gap-2"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PNG
            </>
          )}
        </button>
      </div>

      {/* React Flow canvas */}
      <div 
        ref={flowRef}
        className="h-[700px] bg-[#0a0a0b] rounded-xl border border-[#232328] overflow-hidden"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1a1a1b" gap={32} size={1} />
          {/* MiniMap disabled for mobile - was getting in the way */}
          
          {/* Legend panel */}
          <Panel position="top-left" className="!m-4">
            <div className="bg-[#141416] p-3 rounded-lg border border-[#232328] text-sm space-y-3">
              {/* Line types legend */}
              <div>
                <div className="text-zinc-400 mb-2 font-medium text-xs uppercase tracking-wide">Line Types</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <div className="w-6 h-0.5 bg-green-500" />
                    <span>Traded / Drafted</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <div className="w-6 h-0.5 bg-blue-400" style={{ background: 'repeating-linear-gradient(to right, #60a5fa 0, #60a5fa 4px, transparent 4px, transparent 8px)' }} />
                    <span>Signed (Free Agent)</span>
                  </div>
                </div>
              </div>
              
              {/* Branches legend */}
              {treeData.branches.length > 1 && (
                <div className="pt-2 border-t border-zinc-700">
                  <div className="text-zinc-400 mb-2 font-medium text-xs uppercase tracking-wide">Branches</div>
                  {treeData.branches.map((branch, i) => (
                    <div key={i} className="text-zinc-500 text-xs mb-1">
                      Branch {i + 1}: {branch.stepsCount} steps
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Origin trade info */}
      {treeData.originTrade && (
        <div className="bg-[#141416] p-4 rounded-lg border border-[#232328]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-500">🌱</span>
            <span className="text-sm font-medium text-zinc-300">Origin Trade</span>
            <span className="text-xs text-zinc-500">{formatDate(treeData.originTrade.date)}</span>
          </div>
          <p className="text-sm text-zinc-400">{treeData.originTrade.description}</p>
        </div>
      )}
    </div>
  );
}
