"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  ConnectionMode,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

interface AcquisitionNodeData {
  label: string;
  sublabel?: string;
  date?: string;
  nodeType: "player" | "pick" | "cash" | "trade-action";
  acquisitionType?: string;
  tradePartner?: string;
  note?: string;
  isOrigin?: boolean;
  isTarget?: boolean;
  isPrimaryOrigin?: boolean;
  draftPick?: number;
  [key: string]: unknown;
}

interface AcquisitionTreeProps {
  nodes: Array<{
    id: string;
    type: string;
    data: AcquisitionNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    animated?: boolean;
  }>;
  teamColors: {
    primary: string;
    secondary: string;
  };
  originYear: number;
  player: string;
}

// Player node
function PlayerNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div className="px-4 py-3 rounded-lg shadow-lg min-w-[180px] bg-zinc-900 border-l-4 border-l-blue-500">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-[10px] text-blue-400 font-semibold uppercase">Player</span>
      </div>
      <div className="font-bold text-white text-sm">{data.label}</div>
      {data.sublabel && <div className="text-xs text-zinc-400">{data.sublabel}</div>}
      {data.date && <div className="text-[10px] text-zinc-500 mt-1">{data.date}</div>}
    </div>
  );
}

// Pick node
function PickNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div className="px-4 py-3 rounded-lg shadow-lg min-w-[180px] bg-green-950/50 border-l-4 border-l-green-500">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-[10px] text-green-400 font-semibold uppercase">Draft Pick</span>
      </div>
      <div className="font-bold text-white text-sm">{data.label}</div>
      {data.date && <div className="text-[10px] text-zinc-500 mt-1">{data.date}</div>}
    </div>
  );
}

// Asset node (secondary origins)
function AssetNode({ data }: { data: AcquisitionNodeData }) {
  const isPick = data.nodeType === "pick";
  return (
    <div className={`px-3 py-2 rounded shadow min-w-[140px] border ${isPick ? 'bg-green-950/30 border-green-800' : 'bg-zinc-800/50 border-zinc-700'}`}>
      <div className="font-medium text-zinc-300 text-xs">{data.label}</div>
      {data.date && <div className="text-[9px] text-zinc-600 mt-0.5">{data.date}</div>}
    </div>
  );
}

// Target node (Vucevic)
function TargetNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div className="px-5 py-4 rounded-xl shadow-xl min-w-[200px] bg-green-900 border-2 border-green-400">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-green-300 font-bold uppercase">Acquired</span>
      </div>
      <div className="font-bold text-white text-lg">{data.label}</div>
      {data.date && <div className="text-sm text-green-300 mt-1">{data.date}</div>}
    </div>
  );
}

// Origin node (Moïso)
function OriginNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div className="px-5 py-4 rounded-xl shadow-xl min-w-[200px] bg-amber-950 border-2 border-amber-400 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-400">★</span>
        <span className="text-xs text-amber-300 font-bold uppercase">Origin</span>
      </div>
      <div className="font-bold text-white text-lg">{data.label}</div>
      {data.date && <div className="text-sm text-amber-300 mt-1">{data.date}</div>}
    </div>
  );
}

const nodeTypes = {
  player: PlayerNode,
  pick: PickNode,
  asset: AssetNode,
  target: TargetNode,
  origin: OriginNode,
  acquisition: PlayerNode,
  trade: PlayerNode,
};

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

// ELK layout - LEFT to RIGHT
const elkOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.spacing.nodeNode": "40",
  "elk.layered.spacing.nodeNodeBetweenLayers": "80",
  "elk.edgeRouting": "ORTHOGONAL",
};

function parseDate(dateStr?: string): number {
  if (!dateStr) return Infinity;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? Infinity : date.getTime();
}

export default function AcquisitionTree({
  nodes: initialNodes,
  edges: initialEdges,
  teamColors,
  originYear,
  player,
}: AcquisitionTreeProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Find primary origin (earliest date)
  const primaryOriginId = useMemo(() => {
    const originNodes = initialNodes.filter(n => n.data.isOrigin);
    if (originNodes.length === 0) return null;
    const sorted = [...originNodes].sort((a, b) => parseDate(a.data.date) - parseDate(b.data.date));
    return sorted[0]?.id;
  }, [initialNodes]);

  // Build and layout the graph
  useEffect(() => {
    async function buildGraph() {
      setIsLoading(true);

      // Create nodes with proper types
      const flowNodes: Node[] = initialNodes.map((n) => {
        let nodeType: string;
        if (n.data.isTarget) nodeType = "target";
        else if (n.data.isOrigin && n.id === primaryOriginId) nodeType = "origin";
        else if (n.data.isOrigin) nodeType = "asset";
        else if (n.data.nodeType === "pick") nodeType = "pick";
        else nodeType = "player";

        return {
          id: n.id,
          type: nodeType,
          data: n.data,
          position: { x: 0, y: 0 },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        };
      });

      // Create edges with styling
      const flowEdges: Edge[] = initialEdges.map((e) => {
        const sourceNode = initialNodes.find(n => n.id === e.source);
        const isMainPath = !sourceNode?.data.isOrigin || sourceNode?.id === primaryOriginId;

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: "smoothstep",
          animated: false,
          style: {
            stroke: isMainPath ? "#22c55e" : "#52525b",
            strokeWidth: isMainPath ? 3 : 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isMainPath ? "#22c55e" : "#52525b",
            width: 20,
            height: 20,
          },
        };
      });

      // Run ELK layout
      try {
        const graph = {
          id: "root",
          layoutOptions: elkOptions,
          children: flowNodes.map((node) => ({
            id: node.id,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
          })),
          edges: flowEdges.map((edge) => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
          })),
        };

        const layoutedGraph = await elk.layout(graph);

        // Apply positions
        const positionedNodes = flowNodes.map((node) => {
          const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
          return {
            ...node,
            position: {
              x: elkNode?.x ?? 0,
              y: elkNode?.y ?? 0,
            },
          };
        });

        setNodes(positionedNodes);
        setEdges(flowEdges);
      } catch (error) {
        console.error("Layout error:", error);
        // Fallback: simple horizontal layout
        const positionedNodes = flowNodes.map((node, i) => ({
          ...node,
          position: { x: i * 250, y: Math.random() * 300 },
        }));
        setNodes(positionedNodes);
        setEdges(flowEdges);
      }

      setIsLoading(false);
    }

    buildGraph();
  }, [initialNodes, initialEdges, primaryOriginId]);

  const primaryOriginNode = initialNodes.find(n => n.id === primaryOriginId);

  if (isLoading) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-green-500 rounded-full animate-spin" />
          <div className="text-zinc-400">Building tree...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
      >
        <Background color="#3f3f46" gap={16} />
        <Controls 
          showInteractive={false}
          className="!bg-zinc-800 !border-zinc-700 !rounded-lg" 
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "target") return "#22c55e";
            if (node.type === "origin") return "#f59e0b";
            if (node.type === "pick") return "#22c55e";
            return "#3b82f6";
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="!bg-zinc-900 !border-zinc-700"
        />
      </ReactFlow>

      {/* Title */}
      <div className="absolute top-4 left-4 bg-zinc-900/90 backdrop-blur rounded-lg px-4 py-2 border border-zinc-700">
        <div className="text-xs text-zinc-500 uppercase tracking-wide">Asset Chain</div>
        <div className="font-bold text-white">
          {primaryOriginNode?.data.label || "Origin"} → {player}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur rounded-lg p-3 border border-zinc-700 text-xs">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-950 border border-amber-400" />
            <span className="text-zinc-400">Origin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-900 border border-green-400" />
            <span className="text-zinc-400">Target</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-zinc-900 border-l-2 border-l-blue-500" />
            <span className="text-zinc-400">Player</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-950/50 border-l-2 border-l-green-500" />
            <span className="text-zinc-400">Pick</span>
          </div>
        </div>
      </div>

      {/* Debug info */}
      <div className="absolute top-4 right-4 bg-zinc-900/90 backdrop-blur rounded px-2 py-1 text-[10px] text-zinc-500 border border-zinc-700">
        {nodes.length} nodes · {edges.length} edges
      </div>
    </div>
  );
}
