"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MarkerType,
  NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NodeDetailModal } from "./NodeDetailModal";

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
  chain: Array<{
    event: string;
    date: string;
    action?: string;
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

// Custom node component for players
function PlayerNode({ data }: { data: TreeNode["data"] }) {
  return (
    <div
      className="px-4 py-3 rounded-xl shadow-lg min-w-[220px] border-2 cursor-pointer hover:scale-105 transition-transform"
      style={{
        backgroundColor: "#18181b",
        borderColor: data.color || "#22c55e",
        boxShadow: `0 0 20px ${data.color || "#22c55e"}30`,
      }}
    >
      <div className="flex items-center gap-3">
        {data.imageUrl && (
          <img
            src={data.imageUrl}
            alt=""
            className="w-14 h-14 rounded-full object-cover border-2"
            style={{ borderColor: data.color || "#22c55e" }}
          />
        )}
        <div>
          <div className="font-bold text-white text-lg">{data.label}</div>
          {data.sublabel && (
            <div className="text-sm text-zinc-400">{data.sublabel}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TradeNode({ data }: { data: TreeNode["data"] }) {
  return (
    <div className="px-4 py-3 rounded-xl shadow-lg min-w-[260px] bg-zinc-800 border border-zinc-600 cursor-pointer hover:bg-zinc-700 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🔄</span>
        <span className="text-xs text-zinc-400">{data.date}</span>
      </div>
      <div className="font-medium text-white text-sm leading-tight">{data.label}</div>
      {data.sublabel && (
        <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
          <span>→</span> {data.sublabel}
        </div>
      )}
    </div>
  );
}

function PickNode({ data }: { data: TreeNode["data"] }) {
  return (
    <div className="px-4 py-3 rounded-xl shadow-lg min-w-[220px] bg-green-900/30 border border-green-600 cursor-pointer hover:bg-green-900/50 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🎯</span>
        <span className="text-xs text-green-400">{data.date}</span>
      </div>
      <div className="font-medium text-white text-sm leading-tight">{data.label}</div>
      {data.sublabel && (
        <div className="text-xs text-green-300 mt-2 flex items-center gap-1">
          <span>→</span> {data.sublabel}
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  player: PlayerNode,
  trade: TradeNode,
  pick: PickNode,
};

export function TradeTree({ playerId }: TradeTreeProps) {
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

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

    // Improved layout - center nodes vertically with better spacing
    const nodeSpacing = 180;
    const startX = 200;
    
    const positionedNodes: Node[] = treeData.nodes.map((node, index) => ({
      id: node.id,
      type: node.type,
      data: node.data,
      position: { 
        x: startX + (index % 2 === 0 ? 0 : 40), // Slight zigzag
        y: index * nodeSpacing 
      },
    }));

    const styledEdges: Edge[] = treeData.edges.map((edge) => ({
      ...edge,
      type: "smoothstep",
      animated: true,
      style: { 
        stroke: "#22c55e", 
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#22c55e",
        width: 20,
        height: 20,
      },
    }));

    setNodes(positionedNodes);
    setEdges(styledEdges);
  }, [treeData, setNodes, setEdges]);

  const handleNodeClick: NodeMouseHandler = useCallback((event, node) => {
    const treeNode = treeData?.nodes.find((n) => n.id === node.id);
    if (treeNode) {
      setSelectedNode(treeNode);
    }
  }, [treeData]);

  if (isLoading) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-[#0a0a0b] rounded-xl border border-[#232328]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-green-500 rounded-full animate-spin" />
          <div className="text-zinc-400">Loading trade tree...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-[#0a0a0b] rounded-xl border border-[#232328]">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!treeData || treeData.nodes.length === 0) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-[#0a0a0b] rounded-xl border border-[#232328]">
        <div className="text-center px-4">
          <div className="text-4xl mb-4">🏀</div>
          <div className="text-zinc-300 text-lg font-medium mb-2">No Trade Tree Data</div>
          <div className="text-sm text-zinc-500 max-w-md">
            {treeData?.acquisition?.type === "draft" && !treeData.chain?.length
              ? "This player was drafted directly by their team — no trades in their lineage."
              : treeData?.acquisition?.type === "signing"
              ? "This player was signed as a free agent — no trade chain to display."
              : "Trade chain information not yet available for this player."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-[600px] bg-[#0a0a0b] rounded-xl border border-[#232328] overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.5}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1a1a1b" gap={24} size={1} />
          <Controls 
            className="!bg-[#141416] !border-[#232328] !rounded-lg"
            showInteractive={false}
          />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === "player") return "#22c55e";
              if (node.type === "pick") return "#16a34a";
              return "#52525b";
            }}
            maskColor="rgba(10, 10, 11, 0.85)"
            className="!bg-[#141416] !border-[#232328] !rounded-lg"
          />
        </ReactFlow>
        
        {/* Click hint */}
        <div className="absolute bottom-4 left-4 text-xs text-zinc-500 bg-[#141416] px-3 py-1.5 rounded-full border border-[#232328]">
          Click any node for details
        </div>
      </div>

      {/* Node Detail Modal */}
      <NodeDetailModal
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        originTrade={treeData.originTrade}
      />
    </>
  );
}
