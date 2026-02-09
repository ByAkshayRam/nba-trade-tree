"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

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
  [key: string]: unknown; // Index signature for React Flow compatibility
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

// Custom node component for the acquisition tree
function AcquisitionNode({ data }: { data: AcquisitionNodeData }) {
  const isPlayer = data.nodeType === "player";
  const isPick = data.nodeType === "pick";
  const isOrigin = data.isOrigin;
  const isTarget = data.isTarget;

  // Node styling based on type
  const getBgColor = () => {
    if (isTarget) return "bg-green-600";
    if (isOrigin) return "bg-amber-600";
    if (isPick) return "bg-blue-600";
    return "bg-gray-700";
  };

  const getBorderStyle = () => {
    if (isTarget) return "ring-2 ring-green-400";
    if (isOrigin) return "ring-2 ring-amber-400 animate-pulse";
    return "";
  };

  return (
    <div
      className={`
        px-4 py-3 rounded-lg shadow-lg min-w-[180px] max-w-[250px]
        ${getBgColor()} ${getBorderStyle()}
        transition-all duration-200 hover:scale-105 hover:shadow-xl
      `}
    >
      {/* Icon indicator */}
      <div className="flex items-center gap-2 mb-1">
        {isTarget && <span className="text-lg">🏀</span>}
        {isOrigin && <span className="text-lg">🌱</span>}
        {isPick && !isOrigin && <span className="text-sm">📋</span>}
        {isPlayer && !isTarget && !isOrigin && <span className="text-sm">👤</span>}
        
        <span className="text-white font-bold text-sm truncate">
          {data.label}
        </span>
      </div>

      {/* Sublabel */}
      {data.sublabel && (
        <div className="text-gray-200 text-xs mb-1">{data.sublabel}</div>
      )}

      {/* Date */}
      {data.date && (
        <div className="text-gray-300 text-xs">
          {new Date(data.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      )}

      {/* Note tooltip (show on hover) */}
      {data.note && (
        <div className="mt-2 text-xs text-gray-300 italic border-t border-gray-600 pt-2">
          {data.note}
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  target: AcquisitionNode,
  origin: AcquisitionNode,
  acquisition: AcquisitionNode,
};

// Dagre layout configuration
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const NODE_WIDTH = 200;
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
  style?: Record<string, unknown>;
  markerEnd?: unknown;
  labelStyle?: Record<string, unknown>;
  labelBgStyle?: Record<string, unknown>;
};

function getLayoutedElements(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction = "TB"
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes: FlowNode[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
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
  // Convert to React Flow format
  const flowNodes: FlowNode[] = useMemo(
    () =>
      initialNodes.map((n) => ({
        id: n.id,
        type: n.type,
        data: n.data as AcquisitionNodeData,
        position: { x: 0, y: 0 },
      })),
    [initialNodes]
  );

  const flowEdges: FlowEdge[] = useMemo(
    () =>
      initialEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: e.animated,
        style: { stroke: teamColors.primary, strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: teamColors.primary,
        },
        labelStyle: { fill: "#fff", fontWeight: 600 },
        labelBgStyle: { fill: "#333", fillOpacity: 0.8 },
      })),
    [initialEdges, teamColors]
  );

  // Apply layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(flowNodes, flowEdges, "BT"), // Bottom to Top
    [flowNodes, flowEdges]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges as any);

  return (
    <div className="w-full h-[700px] bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: teamColors.primary }}
      >
        <div>
          <h2 className="text-white font-bold text-lg">
            How did they get {player}?
          </h2>
          <p className="text-white/80 text-sm">
            {2026 - originYear} years of asset history
          </p>
        </div>
        <div className="flex items-center gap-4 text-white/80 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span>Current Player</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
            <span>Origin ({originYear})</span>
          </div>
        </div>
      </div>

      {/* Flow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={1.5}
        attributionPosition="bottom-left"
      >
        <Background color="#374151" gap={20} />
        <Controls className="bg-gray-800 border-gray-700" />
        <MiniMap
          nodeColor={(node) => {
            if (node.data?.isTarget) return "#16a34a";
            if (node.data?.isOrigin) return "#d97706";
            if (node.data?.nodeType === "pick") return "#2563eb";
            return "#4b5563";
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="bg-gray-800"
        />
      </ReactFlow>
    </div>
  );
}
