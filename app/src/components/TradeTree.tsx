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
  type: "player" | "trade" | "pick" | "team-asset";
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
  }>;
}

interface TradeTreeProps {
  playerId: number;
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
        {data.date}
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
          <span className="text-xs opacity-70">{data.date}</span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-white text-sm font-medium leading-relaxed">{data.label}</div>
        {data.sublabel && (
          <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
            <span>→</span> {data.sublabel}
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
          <span className="text-xs opacity-70">{data.date}</span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-white text-sm font-medium leading-relaxed">{data.label}</div>
        {data.sublabel && (
          <div className="text-xs text-zinc-300 mt-2 flex items-center gap-1">
            <span>→</span> {data.sublabel}
          </div>
        )}
        
        {/* Show assets received if available */}
        {data.received && data.received.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-700">
            <div className="text-xs text-zinc-500 mb-2">Selected:</div>
            {data.received.map((asset, i) => (
              <div key={i} className="text-sm text-green-400 flex items-center gap-2">
                <span>⭐</span>
                {asset}
              </div>
            ))}
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
    const nodeSpacingY = 200;
    const branchSpacingX = 500;
    const containerWidth = 1200;
    const nodeWidth = 300;
    
    // Group nodes by branch
    const branchNodes: Map<number, Array<{ node: TreeNode; index: number }>> = new Map();
    
    treeData.nodes.forEach((node) => {
      if (node.id.startsWith('player-')) {
        // Player node is shared across branches
        return;
      }
      
      const match = node.id.match(/chain-(\d+)-(\d+)/);
      if (match) {
        const branchIdx = parseInt(match[1]);
        const stepIdx = parseInt(match[2]);
        
        if (!branchNodes.has(branchIdx)) {
          branchNodes.set(branchIdx, []);
        }
        branchNodes.get(branchIdx)!.push({ node, index: stepIdx });
      }
    });

    const positionedNodes: Node[] = [];
    const styledEdges: Edge[] = [];

    // Calculate total branches for centering
    const numBranches = branchNodes.size || 1;
    const totalWidth = (numBranches - 1) * branchSpacingX;
    const startX = (containerWidth - totalWidth) / 2 - nodeWidth / 2;

    // Player node at center bottom
    const playerNode = treeData.nodes.find(n => n.id.startsWith('player-'));
    if (playerNode) {
      // Find max depth across all branches
      let maxDepth = 0;
      branchNodes.forEach((steps) => {
        maxDepth = Math.max(maxDepth, steps.length);
      });

      positionedNodes.push({
        id: playerNode.id,
        type: playerNode.type,
        data: playerNode.data,
        draggable: false,
        connectable: false,
        position: { 
          x: (containerWidth - nodeWidth) / 2 - nodeWidth / 2, 
          y: maxDepth * nodeSpacingY + 100
        },
      });
    }

    // Position each branch
    let branchIndex = 0;
    branchNodes.forEach((steps, branchIdx) => {
      // Sort by step index (descending to go from most recent to origin)
      steps.sort((a, b) => b.index - a.index);
      
      const branchX = startX + branchIndex * branchSpacingX;
      
      steps.forEach((step, visualIdx) => {
        positionedNodes.push({
          id: step.node.id,
          type: step.node.type,
          data: step.node.data,
          draggable: false,
          connectable: false,
          position: { 
            x: branchX, 
            y: visualIdx * nodeSpacingY
          },
        });
      });

      branchIndex++;
    });

    // Create edges with styled lines
    treeData.edges.forEach((edge) => {
      styledEdges.push({
        ...edge,
        type: "smoothstep",
        animated: false,
        style: { 
          stroke: "#22c55e", 
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#22c55e",
          width: 16,
          height: 16,
        },
      });
    });

    setNodes(positionedNodes);
    setEdges(styledEdges);
  }, [treeData, setNodes, setEdges]);

  const handleExport = useCallback(async () => {
    if (!flowRef.current || !treeData) return;
    
    setIsExporting(true);
    
    try {
      // Find the react-flow viewport
      const viewport = flowRef.current.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewport) return;
      
      const dataUrl = await toPng(viewport, {
        backgroundColor: '#0a0a0b',
        pixelRatio: 2,
        filter: (node) => {
          // Exclude minimap and controls
          const className = node.className?.toString() || '';
          return !className.includes('react-flow__minimap') && 
                 !className.includes('react-flow__panel');
        }
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = `${treeData.player.name.replace(/\s+/g, '-')}-trade-tree.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
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
          <MiniMap
            nodeColor={(node) => {
              if (node.type === "player") return "#22c55e";
              if (node.type === "pick") return "#16a34a";
              return "#52525b";
            }}
            maskColor="rgba(10, 10, 11, 0.9)"
            className="!bg-[#141416] !border-[#232328] !rounded-lg"
            pannable
            zoomable
          />
          
          {/* Branches legend */}
          {treeData.branches.length > 1 && (
            <Panel position="top-left" className="!m-4">
              <div className="bg-[#141416] p-3 rounded-lg border border-[#232328] text-sm">
                <div className="text-zinc-400 mb-2 font-medium">Branches</div>
                {treeData.branches.map((branch, i) => (
                  <div key={i} className="text-zinc-500 text-xs mb-1">
                    Branch {i + 1}: {branch.stepsCount} steps
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Origin trade info */}
      {treeData.originTrade && (
        <div className="bg-[#141416] p-4 rounded-lg border border-[#232328]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-500">🌱</span>
            <span className="text-sm font-medium text-zinc-300">Origin Trade</span>
            <span className="text-xs text-zinc-500">{treeData.originTrade.date}</span>
          </div>
          <p className="text-sm text-zinc-400">{treeData.originTrade.description}</p>
        </div>
      )}
    </div>
  );
}
