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
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  getSmoothStepPath,
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

// Player node - acquired player in the chain
function PlayerNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div
      className="px-4 py-3 rounded-lg shadow-lg min-w-[220px] border-l-4 bg-zinc-900"
      style={{ borderLeftColor: "#3b82f6" }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-xs text-blue-400 font-medium uppercase tracking-wide">Player</span>
      </div>
      <div className="font-bold text-white mt-1">{data.label}</div>
      {data.sublabel && (
        <div className="text-sm text-zinc-400">{data.sublabel}</div>
      )}
      {data.date && (
        <div className="text-xs text-zinc-500 mt-1">{data.date}</div>
      )}
      {data.note && (
        <div className="text-xs text-zinc-500 mt-2 italic border-t border-zinc-700 pt-2">{data.note}</div>
      )}
    </div>
  );
}

// Trade node
function TradeNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div className="px-4 py-3 rounded-lg shadow-lg min-w-[240px] bg-zinc-800 border-l-4 border-l-amber-500">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-xs text-amber-400 font-medium uppercase tracking-wide">Trade</span>
      </div>
      <div className="font-medium text-white text-sm mt-1">{data.label}</div>
      {data.sublabel && (
        <div className="text-xs text-zinc-400 mt-1">{data.sublabel}</div>
      )}
      {data.date && (
        <div className="text-xs text-zinc-500 mt-1">{data.date}</div>
      )}
      {data.tradePartner && (
        <div className="text-xs text-amber-400/70 mt-1">↔ {data.tradePartner}</div>
      )}
    </div>
  );
}

// Pick node - draft pick asset
function PickNode({ data }: { data: AcquisitionNodeData }) {
  const isOrigin = data.isOrigin;
  
  return (
    <div 
      className={`px-4 py-3 rounded-lg shadow-lg min-w-[200px] border-l-4 ${isOrigin ? "ring-2 ring-amber-500 animate-pulse" : ""}`}
      style={{ 
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        borderLeftColor: "#22c55e"
      }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs text-green-400 font-medium uppercase tracking-wide">
          {isOrigin ? "★ Origin Pick" : "Draft Pick"}
        </span>
      </div>
      <div className="font-medium text-white text-sm mt-1">{data.label}</div>
      {data.sublabel && (
        <div className="text-xs text-green-300 mt-1">{data.sublabel}</div>
      )}
      {data.date && (
        <div className="text-xs text-zinc-500 mt-1">{data.date}</div>
      )}
      {data.draftPick && (
        <div className="text-xs text-green-400 mt-1 font-medium">Pick #{data.draftPick}</div>
      )}
    </div>
  );
}

// Target player node (final destination - Vucevic)
function TargetNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div
      className="px-5 py-4 rounded-xl shadow-xl min-w-[240px] border-2 ring-2 ring-green-400/30"
      style={{
        backgroundColor: "#14532d",
        borderColor: "#22c55e",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-green-300 font-bold uppercase tracking-wide">Acquired</span>
      </div>
      <div className="font-bold text-white text-xl">{data.label}</div>
      {data.sublabel && (
        <div className="text-sm text-green-200">{data.sublabel}</div>
      )}
      {data.date && (
        <div className="text-sm text-green-300 mt-2 font-medium">{data.date}</div>
      )}
      <div className="text-xs text-green-400 mt-2 font-medium flex items-center gap-1">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Current Roster
      </div>
    </div>
  );
}

// Origin node (starting point - the original pick/player)
function OriginNode({ data }: { data: AcquisitionNodeData }) {
  return (
    <div
      className="px-5 py-4 rounded-xl shadow-xl min-w-[240px] border-2 animate-pulse"
      style={{
        backgroundColor: "#451a03",
        borderColor: "#f59e0b",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-amber-400" />
        <span className="text-xs text-amber-300 font-bold uppercase tracking-wide">★ Origin</span>
      </div>
      <div className="font-bold text-white text-lg">{data.label}</div>
      {data.sublabel && (
        <div className="text-sm text-amber-200">{data.sublabel}</div>
      )}
      {data.date && (
        <div className="text-sm text-amber-300 mt-2">{data.date}</div>
      )}
      <div className="text-xs text-amber-400 mt-2 font-medium">
        Where it all began
      </div>
    </div>
  );
}

// Custom edge with step path for tree-like appearance
function TreeEdge({ 
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  label,
  style,
  markerEnd 
}: {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  label?: string;
  style?: React.CSSProperties;
  markerEnd?: string;
}) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    borderRadius: 8,
  });

  return (
    <>
      <BaseEdge 
        id={id} 
        path={edgePath} 
        style={style}
        markerEnd={markerEnd}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="bg-zinc-800 px-2 py-1 rounded text-xs text-zinc-300 border border-zinc-600 font-medium"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = {
  player: PlayerNode,
  trade: TradeNode,
  pick: PickNode,
  target: TargetNode,
  origin: OriginNode,
  acquisition: PlayerNode,
};

const edgeTypes = {
  tree: TreeEdge,
};

const NODE_WIDTH = 240;
const NODE_HEIGHT = 120;

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

// ELK layout options for tree structure
const elkOptions = {
  "elk.algorithm": "layered",
  "elk.layered.spacing.nodeNodeBetweenLayers": "120",
  "elk.spacing.nodeNode": "80",
  "elk.direction": "DOWN",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
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
      initialEdges.map((e, index) => {
        // Find source node to determine edge color
        const sourceNode = initialNodes.find(n => n.id === e.source);
        const isPick = sourceNode?.data.nodeType === "pick";
        const edgeColor = isPick ? "#22c55e" : "#3b82f6";
        
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label || (index === 0 ? "traded for" : ""),
          animated: false,
          type: "smoothstep",
          style: { 
            stroke: edgeColor, 
            strokeWidth: 3,
            strokeDasharray: isPick ? "0" : "0",
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColor,
            width: 20,
            height: 20,
          },
          labelStyle: { 
            fill: "#e4e4e7", 
            fontSize: 11,
            fontWeight: 500,
          },
          labelBgStyle: { 
            fill: "#18181b", 
            fillOpacity: 0.95,
            stroke: "#3f3f46",
            strokeWidth: 1,
            rx: 4,
            ry: 4,
          },
          labelBgPadding: [8, 4] as [number, number],
        };
      }),
    [initialEdges, initialNodes]
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
          position: { x: 300, y: index * 160 },
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
      <div className="h-[700px] flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-green-500 rounded-full animate-spin" />
          <div className="text-zinc-400">Building acquisition tree...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[700px] bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
        }}
      >
        <Background color="#27272a" gap={24} size={1} />
        <Controls 
          showInteractive={false}
          className="!bg-zinc-800 !border-zinc-700 !rounded-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-600 [&>button]:!text-zinc-300 [&>button:hover]:!bg-zinc-700" 
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "target") return "#22c55e";
            if (node.type === "origin") return "#f59e0b";
            if (node.type === "pick") return "#22c55e";
            return "#3b82f6";
          }}
          maskColor="rgba(0, 0, 0, 0.85)"
          className="!bg-zinc-900 !border-zinc-700"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-zinc-900/95 backdrop-blur-sm rounded-lg p-4 border border-zinc-700 shadow-xl">
        <div className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-3">Legend</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-amber-500 bg-amber-900/50" />
            <span className="text-zinc-300">Origin ({originYear})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-900/50" />
            <span className="text-zinc-300">{player}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-l-4 border-l-green-500 bg-green-900/20" />
            <span className="text-zinc-300">Draft Pick</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-l-4 border-l-blue-500 bg-zinc-900" />
            <span className="text-zinc-300">Player Asset</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-zinc-700 flex items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <div className="w-6 h-0.5 bg-green-500" />
            <span>Pick path</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-0.5 bg-blue-500" />
            <span>Player path</span>
          </div>
        </div>
      </div>

      {/* Title overlay */}
      <div className="absolute top-4 left-4 bg-zinc-900/95 backdrop-blur-sm rounded-lg px-4 py-2 border border-zinc-700">
        <div className="text-xs text-zinc-400 uppercase tracking-wide">Asset Chain</div>
        <div className="text-lg font-bold text-white">{originYear} → {player}</div>
      </div>
    </div>
  );
}
