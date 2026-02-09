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
  isPrimaryOrigin?: boolean;
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

// Player node - acquired player in the chain
function PlayerNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div className="px-4 py-3 rounded-lg shadow-lg min-w-[200px] bg-zinc-900 border-l-4 border-l-blue-500">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Player</span>
      </div>
      <div className="font-bold text-white">{data.label}</div>
      {data.sublabel && <div className="text-sm text-zinc-400">{data.sublabel}</div>}
      {data.date && <div className="text-xs text-zinc-500 mt-1">{data.date}</div>}
    </div>
  );
}

// Pick node - draft pick asset
function PickNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div className="px-4 py-3 rounded-lg shadow-lg min-w-[200px] bg-green-950/50 border-l-4 border-l-green-500">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">Draft Pick</span>
      </div>
      <div className="font-bold text-white">{data.label}</div>
      {data.sublabel && <div className="text-sm text-green-300">{data.sublabel}</div>}
      {data.date && <div className="text-xs text-zinc-500 mt-1">{data.date}</div>}
    </div>
  );
}

// Additional asset node (leaf nodes that aren't the primary origin)
function AssetNode({ data }: { data: AcquisitionNodeData }) {
  const isPick = data.nodeType === "pick";
  return (
    <div className={`px-3 py-2 rounded shadow-lg min-w-[160px] border border-zinc-600 ${isPick ? 'bg-green-950/30' : 'bg-zinc-800/50'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`w-1.5 h-1.5 rounded-full ${isPick ? 'bg-green-600' : 'bg-zinc-500'}`} />
        <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">
          {isPick ? 'Pick' : 'Asset'}
        </span>
      </div>
      <div className="font-medium text-zinc-300 text-sm">{data.label}</div>
      {data.date && <div className="text-[10px] text-zinc-600 mt-0.5">{data.date}</div>}
    </div>
  );
}

// Target player node (final destination - Vucevic)
function TargetNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div className="px-5 py-4 rounded-xl shadow-xl min-w-[240px] bg-green-900 border-2 border-green-500 ring-4 ring-green-500/20">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-green-300 font-bold uppercase tracking-wide">Acquired</span>
      </div>
      <div className="font-bold text-white text-xl">{data.label}</div>
      {data.sublabel && <div className="text-sm text-green-200">{data.sublabel}</div>}
      {data.date && <div className="text-sm text-green-300 mt-2 font-medium">{data.date}</div>}
      <div className="flex items-center gap-1 text-xs text-green-400 mt-2 font-medium">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Current Roster
      </div>
    </div>
  );
}

// Primary Origin node (THE starting point - only one)
function OriginNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div className="px-5 py-4 rounded-xl shadow-xl min-w-[240px] bg-amber-950 border-2 border-amber-500 ring-4 ring-amber-500/20 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">★</span>
        <span className="text-xs text-amber-300 font-bold uppercase tracking-wide">Origin Point</span>
      </div>
      <div className="font-bold text-white text-xl">{data.label}</div>
      {data.sublabel && <div className="text-sm text-amber-200">{data.sublabel}</div>}
      {data.date && <div className="text-sm text-amber-300 mt-2">{data.date}</div>}
      <div className="text-xs text-amber-400 mt-2 font-medium">
        Where it all started
      </div>
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
  labelBgPadding?: [number, number];
};

// ELK layout for proper tree structure
const elkOptions = {
  "elk.algorithm": "layered",
  "elk.layered.spacing.nodeNodeBetweenLayers": "100",
  "elk.spacing.nodeNode": "50",
  "elk.direction": "UP", // Origin at bottom, target at top
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "elk.edgeRouting": "ORTHOGONAL", // Right-angle tree lines!
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
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
      sourcePosition: Position.Top,
      targetPosition: Position.Bottom,
    };
  });

  return { nodes: layoutedNodes, edges };
}

// Parse date string to comparable value
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
  const [layoutedNodes, setLayoutedNodes] = useState<FlowNode[]>([]);
  const [layoutedEdges, setLayoutedEdges] = useState<FlowEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Find the PRIMARY origin (earliest date among origin nodes)
  const primaryOriginId = useMemo(() => {
    const originNodes = initialNodes.filter(n => n.data.isOrigin);
    if (originNodes.length === 0) return null;
    
    // Sort by date, earliest first
    const sorted = [...originNodes].sort((a, b) => {
      return parseDate(a.data.date) - parseDate(b.data.date);
    });
    
    return sorted[0]?.id;
  }, [initialNodes]);

  // Convert to React Flow format with proper node types
  const flowNodes: FlowNode[] = useMemo(
    () =>
      initialNodes.map((n) => {
        let nodeType: string;
        
        if (n.data.isTarget) {
          nodeType = "target";
        } else if (n.data.isOrigin && n.id === primaryOriginId) {
          // Only THE primary origin gets the special origin style
          nodeType = "origin";
        } else if (n.data.isOrigin) {
          // Other origin nodes are just assets
          nodeType = "asset";
        } else if (n.data.nodeType === "pick") {
          nodeType = "pick";
        } else {
          nodeType = "player";
        }

        return {
          id: n.id,
          type: nodeType,
          data: {
            ...n.data,
            isPrimaryOrigin: n.id === primaryOriginId,
          } as AcquisitionNodeData,
          position: { x: 0, y: 0 },
        };
      }),
    [initialNodes, primaryOriginId]
  );

  const flowEdges: FlowEdge[] = useMemo(
    () =>
      initialEdges.map((e) => {
        const sourceNode = initialNodes.find(n => n.id === e.source);
        const isPrimaryPath = sourceNode?.id === primaryOriginId || 
          !sourceNode?.data.isOrigin; // Main chain, not side assets
        
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          animated: false,
          type: "smoothstep", // Step edges for tree look
          style: { 
            stroke: isPrimaryPath ? "#22c55e" : "#52525b",
            strokeWidth: isPrimaryPath ? 3 : 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isPrimaryPath ? "#22c55e" : "#52525b",
            width: 16,
            height: 16,
          },
          labelStyle: { 
            fill: "#a1a1aa", 
            fontSize: 10,
            fontWeight: 500,
          },
          labelBgStyle: { 
            fill: "#18181b", 
            fillOpacity: 0.9,
          },
          labelBgPadding: [6, 3] as [number, number],
        };
      }),
    [initialEdges, initialNodes, primaryOriginId]
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
        const fallbackNodes = flowNodes.map((node, index) => ({
          ...node,
          position: { x: 300, y: (flowNodes.length - index - 1) * 140 },
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

  useEffect(() => {
    if (layoutedNodes.length > 0) {
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  if (isLoading) {
    return (
      <div className="h-[700px] flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-green-500 rounded-full animate-spin" />
          <div className="text-zinc-400">Building acquisition tree...</div>
        </div>
      </div>
    );
  }

  // Find primary origin label for display
  const primaryOriginNode = initialNodes.find(n => n.id === primaryOriginId);
  const primaryOriginLabel = primaryOriginNode?.data.label || "Origin";

  return (
    <div className="h-[700px] bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
        defaultEdgeOptions={{
          type: "smoothstep",
        }}
      >
        <Background color="#27272a" gap={20} size={1} />
        <Controls 
          showInteractive={false}
          className="!bg-zinc-800 !border-zinc-700 !rounded-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-600 [&>button]:!text-zinc-300 [&>button:hover]:!bg-zinc-700" 
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "target") return "#22c55e";
            if (node.type === "origin") return "#f59e0b";
            if (node.type === "pick") return "#22c55e";
            if (node.type === "asset") return "#52525b";
            return "#3b82f6";
          }}
          maskColor="rgba(0, 0, 0, 0.85)"
          className="!bg-zinc-900 !border-zinc-700"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Title */}
      <div className="absolute top-4 left-4 bg-zinc-900/95 backdrop-blur-sm rounded-lg px-4 py-3 border border-zinc-700">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Acquisition Chain</div>
        <div className="text-lg font-bold text-white mt-0.5">
          {primaryOriginLabel} <span className="text-zinc-500">→</span> {player}
        </div>
        <div className="text-xs text-zinc-500 mt-1">{originYear} to present</div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-zinc-900/95 backdrop-blur-sm rounded-lg p-3 border border-zinc-700">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-2">Legend</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-950 border-2 border-amber-500" />
            <span className="text-zinc-300">★ Origin (starting point)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-900 border-2 border-green-500" />
            <span className="text-zinc-300">Target (acquired player)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-zinc-900 border-l-4 border-l-blue-500" />
            <span className="text-zinc-300">Player in chain</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-950/50 border-l-4 border-l-green-500" />
            <span className="text-zinc-300">Draft pick</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-zinc-800/50 border border-zinc-600" />
            <span className="text-zinc-400">Additional asset</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-zinc-700 flex items-center gap-3 text-[10px] text-zinc-500">
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 bg-green-500 rounded" />
            <span>Main path</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 bg-zinc-600 rounded" />
            <span>Side asset</span>
          </div>
        </div>
      </div>
    </div>
  );
}
