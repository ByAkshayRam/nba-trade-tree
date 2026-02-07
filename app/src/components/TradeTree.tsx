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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

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
  nodes: Array<{
    id: string;
    type: string;
    data: {
      label: string;
      sublabel?: string;
      color?: string;
      date?: string;
      imageUrl?: string;
    };
  }>;
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

// Custom node component
function PlayerNode({ data }: { data: TreeData["nodes"][0]["data"] }) {
  return (
    <div
      className="px-4 py-3 rounded-lg shadow-lg min-w-[200px] border-2"
      style={{
        backgroundColor: "#18181b",
        borderColor: data.color || "#22c55e",
      }}
    >
      <div className="flex items-center gap-3">
        {data.imageUrl && (
          <img
            src={data.imageUrl}
            alt=""
            className="w-12 h-12 rounded-full object-cover"
          />
        )}
        <div>
          <div className="font-bold text-white">{data.label}</div>
          {data.sublabel && (
            <div className="text-sm text-zinc-400">{data.sublabel}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TradeNode({ data }: { data: TreeData["nodes"][0]["data"] }) {
  return (
    <div className="px-4 py-3 rounded-lg shadow-lg min-w-[240px] bg-zinc-800 border border-zinc-600">
      <div className="text-xs text-zinc-400 mb-1">{data.date}</div>
      <div className="font-medium text-white text-sm">{data.label}</div>
      {data.sublabel && (
        <div className="text-xs text-green-400 mt-1">→ {data.sublabel}</div>
      )}
    </div>
  );
}

function PickNode({ data }: { data: TreeData["nodes"][0]["data"] }) {
  return (
    <div className="px-4 py-3 rounded-lg shadow-lg min-w-[200px] bg-green-900/30 border border-green-600">
      <div className="text-xs text-green-400 mb-1">{data.date}</div>
      <div className="font-medium text-white text-sm">{data.label}</div>
      {data.sublabel && (
        <div className="text-xs text-green-300 mt-1">→ {data.sublabel}</div>
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

    // Position nodes vertically
    const positionedNodes: Node[] = treeData.nodes.map((node, index) => ({
      id: node.id,
      type: node.type,
      data: node.data,
      position: { x: 250, y: index * 150 },
    }));

    const styledEdges: Edge[] = treeData.edges.map((edge) => ({
      ...edge,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#22c55e", strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#22c55e",
      },
    }));

    setNodes(positionedNodes);
    setEdges(styledEdges);
  }, [treeData, setNodes, setEdges]);

  if (isLoading) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-green-500 rounded-full animate-spin" />
          <div className="text-zinc-400">Loading trade tree...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!treeData || treeData.nodes.length === 0) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800">
        <div className="text-center">
          <div className="text-2xl mb-2">🏀</div>
          <div className="text-zinc-400">No trade tree data available for this player.</div>
          <div className="text-sm text-zinc-500 mt-1">
            {treeData?.acquisition?.type === "draft" && !treeData.chain?.length
              ? "This player was drafted directly by their team."
              : "Trade chain information not yet available."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background color="#27272a" gap={20} />
        <Controls className="!bg-zinc-800 !border-zinc-700 !rounded-lg" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "player") return "#22c55e";
            if (node.type === "pick") return "#16a34a";
            return "#52525b";
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="!bg-zinc-900 !border-zinc-700"
        />
      </ReactFlow>
    </div>
  );
}
