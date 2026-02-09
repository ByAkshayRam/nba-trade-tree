"use client";

import { useMemo, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  ConnectionMode,
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
  draftPick?: number;
  color?: string;
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

// Player node - matches TradeTree styling
function PlayerNode({ data }: { data: AcquisitionNodeData }) {
  const isOrigin = data.isOrigin;
  const isTarget = data.isTarget;
  
  const borderColor = isTarget 
    ? "#22c55e" 
    : isOrigin 
      ? "#f59e0b" 
      : data.color || "#52525b";

  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-lg min-w-[200px] border-2 ${isOrigin ? "animate-pulse" : ""}`}
      style={{
        backgroundColor: "#18181b",
        borderColor,
      }}
    >
      <div className="font-bold text-white">{data.label}</div>
      {data.sublabel && (
        <div className="text-sm text-zinc-400">{data.sublabel}</div>
      )}
      {data.date && (
        <div className="text-xs text-zinc-500 mt-1">{data.date}</div>
      )}
      {data.acquisitionType && (
        <div className="text-xs text-green-400 mt-2">
          {data.acquisitionType}
        </div>
      )}
    </div>
  );
}

// Trade/Transaction node
function TradeNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div className="px-4 py-3 rounded-lg shadow-lg min-w-[240px] bg-zinc-800 border border-zinc-600">
      {data.date && (
        <div className="text-xs text-zinc-400 mb-1">{data.date}</div>
      )}
      <div className="font-medium text-white text-sm">{data.label}</div>
      {data.sublabel && (
        <div className="text-xs text-green-400 mt-1">→ {data.sublabel}</div>
      )}
      {data.tradePartner && (
        <div className="text-xs text-zinc-400 mt-1">via {data.tradePartner}</div>
      )}
    </div>
  );
}

// Pick node
function PickNode({ data }: { data: AcquisitionNodeData }) {
  const isOrigin = data.isOrigin;
  
  return (
    <div 
      className={`px-4 py-3 rounded-lg shadow-lg min-w-[200px] bg-green-900/30 border border-green-600 ${isOrigin ? "animate-pulse ring-2 ring-amber-500" : ""}`}
    >
      {data.date && (
        <div className="text-xs text-green-400 mb-1">{data.date}</div>
      )}
      <div className="font-medium text-white text-sm">{data.label}</div>
      {data.sublabel && (
        <div className="text-xs text-green-300 mt-1">→ {data.sublabel}</div>
      )}
      {data.draftPick && (
        <div className="text-xs text-zinc-400 mt-1">Pick #{data.draftPick}</div>
      )}
    </div>
  );
}

// Target player node (final destination)
function TargetNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div
      className="px-4 py-3 rounded-lg shadow-lg min-w-[200px] border-2 ring-2 ring-green-400/50"
      style={{
        backgroundColor: "#14532d",
        borderColor: "#22c55e",
      }}
    >
      <div className="font-bold text-white text-lg">{data.label}</div>
      {data.sublabel && (
        <div className="text-sm text-green-200">{data.sublabel}</div>
      )}
      {data.date && (
        <div className="text-xs text-green-300 mt-1">{data.date}</div>
      )}
      <div className="text-xs text-green-400 mt-2 font-medium">
        ✓ Current Roster
      </div>
    </div>
  );
}

// Origin node (starting point)
function OriginNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div
      className="px-4 py-3 rounded-lg shadow-lg min-w-[200px] border-2 animate-pulse"
      style={{
        backgroundColor: "#451a03",
        borderColor: "#f59e0b",
      }}
    >
      <div className="font-bold text-white">{data.label}</div>
      {data.sublabel && (
        <div className="text-sm text-amber-200">{data.sublabel}</div>
      )}
      {data.date && (
        <div className="text-xs text-amber-300 mt-1">{data.date}</div>
      )}
      <div className="text-xs text-amber-400 mt-2 font-medium">
        ★ Origin Point
      </div>
    </div>
  );
}

const nodeTypes = {
  player: PlayerNode,
  trade: TradeNode,
  pick: PickNode,
  target: TargetNode,
  origin: OriginNode,
  acquisition: TradeNode,
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;

type FlowNode = {
  id: string;
  type: string;
  data: AcquisitionNodeData;
  position: { x: number; y: number };
  sourcePosition?: Position;
  targetPosition?: Position;
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  type?: string;
  style?: Record<string, unknown>;
  markerEnd?: unknown;
  labelStyle?: Record<string, unknown>;
  labelBgStyle?: Record<string, unknown>;
};

// ELK layout options
const elkOptions = {
  "elk.algorithm": "layered",
  "elk.layered.spacing.nodeNodeBetweenLayers": "100",
  "elk.spacing.nodeNode": "60",
  "elk.direction": "DOWN",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
};

async function getLayoutedElements(
  nodes: FlowNode[],
  edges: FlowEdge[]
): Promise<{ nodes: FlowNode[]; edges: FlowEdge[] }> {
  const graph = {
    id: "root",
    layoutOptions: elkOptions,
    children: nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layoutedGraph = await elk.layout(graph);

  const layoutedNodes: FlowNode[] = nodes.map((node) => {
    const layoutedNode = layoutedGraph.children?.find((n) => n.id === node.id);
    return {
      ...node,
      position: {
        x: layoutedNode?.x ?? 0,
        y: layoutedNode?.y ?? 0,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  return { nodes: layoutedNodes, edges };
}

export default function AcquisitionTree({
  nodes: initialNodes,
  edges: initialEdges,
  teamColors,
  originYear,
  player,
}: AcquisitionTreeProps) {
  const [layoutedNodes, setLayoutedNodes] = useState<FlowNode[]>([]);
  const [layoutedEdges, setLayoutedEdges] = useState<FlowEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Convert to React Flow format with proper node types
  const flowNodes: FlowNode[] = useMemo(
    () =>
      initialNodes.map((n) => {
        // Determine node type based on data
        let nodeType = n.type;
        if (n.data.isTarget) nodeType = "target";
        else if (n.data.isOrigin) nodeType = "origin";
        else if (n.data.nodeType === "pick") nodeType = "pick";
        else if (n.data.nodeType === "trade-action") nodeType = "trade";
        else nodeType = "player";

        return {
          id: n.id,
          type: nodeType,
          data: n.data as AcquisitionNodeData,
          position: { x: 0, y: 0 },
        };
      }),
    [initialNodes]
  );

  const flowEdges: FlowEdge[] = useMemo(
    () =>
      initialEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: true,
        type: "smoothstep",
        style: { stroke: "#22c55e", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#22c55e",
        },
        labelStyle: { fill: "#e4e4e7", fontSize: 11 },
        labelBgStyle: { fill: "#27272a", fillOpacity: 0.9 },
      })),
    [initialEdges]
  );

  // Run layout on mount
  useEffect(() => {
    async function runLayout() {
      setIsLoading(true);
      try {
        const { nodes, edges } = await getLayoutedElements(flowNodes, flowEdges);
        setLayoutedNodes(nodes);
        setLayoutedEdges(edges);
      } catch (error) {
        console.error("Layout error:", error);
        // Fallback: stack nodes vertically
        const fallbackNodes = flowNodes.map((node, index) => ({
          ...node,
          position: { x: 250, y: index * 150 },
        }));
        setLayoutedNodes(fallbackNodes);
        setLayoutedEdges(flowEdges);
      }
      setIsLoading(false);
    }
    runLayout();
  }, [flowNodes, flowEdges]);

  const [nodes, setNodes] = useNodesState(layoutedNodes);
  const [edges, setEdges] = useEdgesState(layoutedEdges);

  // Update nodes/edges when layout completes
  useEffect(() => {
    if (layoutedNodes.length > 0) {
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  if (isLoading) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-green-500 rounded-full animate-spin" />
          <div className="text-zinc-400">Building acquisition tree...</div>
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
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
      >
        <Background color="#27272a" gap={20} />
        <Controls 
          showInteractive={false}
          className="!bg-zinc-800 !border-zinc-700 !rounded-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-600 [&>button]:!text-zinc-300 [&>button:hover]:!bg-zinc-700" 
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "target") return "#22c55e";
            if (node.type === "origin") return "#f59e0b";
            if (node.type === "pick") return "#16a34a";
            return "#52525b";
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="!bg-zinc-900 !border-zinc-700"
        />
      </ReactFlow>

      {/* Legend - matching original style */}
      <div className="absolute bottom-4 left-4 bg-zinc-900/95 backdrop-blur rounded-lg p-3 flex items-center gap-4 text-xs border border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-amber-500 bg-amber-900/50 animate-pulse" />
          <span className="text-zinc-300">Origin ({originYear})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-green-500 bg-green-900/50" />
          <span className="text-zinc-300">{player}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-900/30 border border-green-600" />
          <span className="text-zinc-300">Draft Pick</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-zinc-800 border border-zinc-600" />
          <span className="text-zinc-300">Trade</span>
        </div>
      </div>
    </div>
  );
}
