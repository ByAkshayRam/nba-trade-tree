"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  Handle,
  NodeProps,
  useReactFlow,
  ReactFlowProvider,
  useReactFlow as useFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import { toJpeg } from "html-to-image";

const elk = new ELK();

interface NodeData {
  label: string;
  sublabel?: string;
  date?: string;
  nodeType: "player" | "pick" | "cash" | "trade-action";
  acquisitionType?: string;
  tradePartner?: string;
  note?: string;
  isOrigin?: boolean;
  isTarget?: boolean;
  isRosterPlayer?: boolean;
  isHomegrown?: boolean;
  rosterOrder?: number;
  rosterCategory?: "starter" | "bench" | "two-way";
  draftPick?: number;
  becamePlayer?: string;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  [key: string]: unknown;
}

interface TeamAcquisitionTreeProps {
  nodes: Array<{
    id: string;
    type: string;
    data: NodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    animated?: boolean;
  }>;
  teamColors: {
    primary: string;
    secondary: string;
  };
  teamName?: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric", 
    year: "numeric",
    timeZone: "UTC"
  });
}

// ESPN Player ID mapping
const ESPN_PLAYER_IDS: Record<string, string> = {
  "Nikola Vucevic": "6478",
  "Jayson Tatum": "4065648",
  "Jaylen Brown": "3917376",
  "Derrick White": "3078576",
  "Payton Pritchard": "4066354",
  "Sam Hauser": "4065804",
  "Neemias Queta": "4397424",
  "Jordan Walsh": "4683689",
  "Baylor Scheierman": "4593841",
  "Luka Garza": "4277951",
  "Ron Harper Jr.": "4397251",
  "Hugo Gonzalez": "5175647",
  "Max Shulga": "4701992",
  "Amari Williams": "4702745",
  "John Tonje": "4593043",
};

// Roster player node (green, with headshot)
function RosterNode({ data }: NodeProps) {
  const nodeData = data as NodeData;
  const espnId = ESPN_PLAYER_IDS[nodeData.label] || "";
  const espnUrl = espnId 
    ? `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${espnId}.png&w=350&h=254`
    : "";
  
  const isHighlighted = nodeData.isHighlighted;
  const isDimmed = nodeData.isDimmed;
  const isHomegrown = nodeData.isHomegrown;
  const category = nodeData.rosterCategory;
  
  // Category label styling
  const categoryLabel = category === "starter" ? "Starter" : category === "two-way" ? "Two-Way" : "Bench";
  const categoryColor = category === "starter" 
    ? "text-yellow-300" 
    : category === "two-way" 
      ? "text-purple-300" 
      : "text-green-300";
  
  return (
    <div 
      className={`px-3 py-2 rounded-lg shadow-lg min-w-[140px] relative cursor-pointer transition-all duration-300 ${
        isHighlighted 
          ? "bg-green-800 border-2 border-green-300 ring-2 ring-green-400/50 scale-105" 
          : isDimmed 
            ? "bg-green-900/40 border-2 border-green-400/30 opacity-40" 
            : "bg-green-900 border-2 border-green-400 hover:border-green-300"
      }`}
    >
      <Handle type="source" position={Position.Right} className="!bg-green-400 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        {espnUrl && (
          <img 
            src={espnUrl}
            alt={nodeData.label}
            className={`w-10 h-10 rounded-full object-cover bg-green-950 border transition-all duration-300 ${
              isHighlighted ? "border-green-300" : "border-green-400"
            }`}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div>
          <div className={`text-[9px] font-bold uppercase flex items-center gap-1 ${isHighlighted ? "text-green-200" : categoryColor}`}>
            {categoryLabel}
            {isHomegrown && <span title="Homegrown talent">🏠</span>}
          </div>
          <div className="font-bold text-white text-xs">{nodeData.label}</div>
        </div>
      </div>
    </div>
  );
}

// Regular player node
function PlayerNode({ data }: NodeProps) {
  const nodeData = data as NodeData;
  const isHighlighted = nodeData.isHighlighted;
  const isDimmed = nodeData.isDimmed;
  
  return (
    <div 
      className={`px-3 py-2 rounded-lg shadow-lg min-w-[120px] relative cursor-pointer transition-all duration-300 ${
        isHighlighted 
          ? "bg-blue-900 border-l-4 border-l-blue-400 ring-2 ring-blue-400/50 scale-105" 
          : isDimmed 
            ? "bg-zinc-900/40 border-l-4 border-l-blue-500/30 opacity-40" 
            : "bg-zinc-900 border-l-4 border-l-blue-500 hover:border-l-blue-400"
      }`}
    >
      <Handle type="source" position={Position.Left} className="!bg-blue-500 !w-2 !h-2" />
      <Handle type="target" position={Position.Right} className="!bg-blue-500 !w-2 !h-2" />
      <div className={`text-[9px] font-semibold uppercase ${isHighlighted ? "text-blue-300" : "text-blue-400"}`}>
        Player
      </div>
      <div className="font-medium text-white text-xs">{nodeData.label}</div>
      {nodeData.sublabel && <div className="text-[9px] text-zinc-400">{nodeData.sublabel}</div>}
      {nodeData.date && <div className="text-[8px] text-zinc-500">{formatDate(nodeData.date)}</div>}
    </div>
  );
}

// Pick node
function PickNode({ data }: NodeProps) {
  const nodeData = data as NodeData;
  const isHighlighted = nodeData.isHighlighted;
  const isDimmed = nodeData.isDimmed;
  
  return (
    <div className="relative">
      <div 
        className={`px-3 py-2 rounded-lg shadow-lg min-w-[120px] relative cursor-pointer transition-all duration-300 ${
          isHighlighted 
            ? "bg-green-900 border-l-4 border-l-green-400 ring-2 ring-green-400/50 scale-105" 
            : isDimmed 
              ? "bg-green-950/20 border-l-4 border-l-green-500/30 opacity-40" 
              : "bg-green-950/50 border-l-4 border-l-green-500 hover:border-l-green-400"
        }`}
      >
        <Handle type="source" position={Position.Left} className="!bg-green-500 !w-2 !h-2" />
        <Handle type="target" position={Position.Right} className="!bg-green-500 !w-2 !h-2" />
        <div className={`text-[9px] font-semibold uppercase ${isHighlighted ? "text-green-300" : "text-green-400"}`}>
          Pick
        </div>
        <div className="font-medium text-white text-xs">{nodeData.label}</div>
        {nodeData.date && <div className="text-[8px] text-zinc-500">{formatDate(nodeData.date)}</div>}
      </div>
      {nodeData.becamePlayer && (
        <div className={`absolute -bottom-4 right-0 px-1.5 py-0.5 bg-zinc-800 border border-zinc-600 rounded text-[8px] text-zinc-300 whitespace-nowrap transition-opacity duration-300 ${
          isDimmed ? "opacity-40" : ""
        }`}>
          → {nodeData.becamePlayer}
        </div>
      )}
    </div>
  );
}

// Origin node
function OriginNode({ data }: NodeProps) {
  const nodeData = data as NodeData;
  const isHighlighted = nodeData.isHighlighted;
  const isDimmed = nodeData.isDimmed;
  
  return (
    <div 
      className={`px-3 py-2 rounded-lg shadow-lg min-w-[120px] relative cursor-pointer transition-all duration-300 ${
        isHighlighted 
          ? "bg-amber-900 border-2 border-amber-300 ring-2 ring-amber-400/50 scale-110" 
          : isDimmed 
            ? "bg-amber-950/40 border-2 border-amber-400/30 opacity-40" 
            : "bg-amber-950 border-2 border-amber-400 hover:border-amber-300"
      }`}
    >
      <Handle type="source" position={Position.Left} className="!bg-amber-400 !w-3 !h-3" />
      <div className="flex items-center gap-1 mb-1">
        <span className={`text-xs ${isHighlighted ? "text-amber-300 animate-pulse" : "text-amber-400"}`}>★</span>
        <span className={`text-[9px] font-bold uppercase ${isHighlighted ? "text-amber-200" : "text-amber-300"}`}>
          Origin
        </span>
      </div>
      <div className="font-bold text-white text-xs">{nodeData.label}</div>
      {nodeData.date && <div className={`text-[8px] ${isHighlighted ? "text-amber-200" : "text-amber-300"}`}>
        {formatDate(nodeData.date)}
      </div>}
    </div>
  );
}

const nodeTypes = {
  target: RosterNode,
  player: PlayerNode,
  pick: PickNode,
  origin: OriginNode,
  acquisition: PlayerNode,
};

const NODE_WIDTH = 150;
const NODE_HEIGHT = 60;

const elkOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "LEFT",
  "elk.spacing.nodeNode": "80",
  "elk.layered.spacing.nodeNodeBetweenLayers": "180",
  "elk.layered.spacing.edgeNodeBetweenLayers": "40",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
};

// Vertical spacing for roster column
const ROSTER_VERTICAL_SPACING = 100;
const ROSTER_X_POSITION = 0;

export default function TeamAcquisitionTree({
  nodes: initialNodes,
  edges: initialEdges,
  teamColors,
  teamName = "Boston Celtics",
}: TeamAcquisitionTreeProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [baseNodes, setBaseNodes] = useState<Node[]>([]);
  const [baseEdges, setBaseEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Build adjacency map for path finding (edge source -> edge targets)
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, string[]>();
    initialEdges.forEach(edge => {
      // Build reverse map: for each target, what sources point to it?
      const sources = map.get(edge.target) || [];
      sources.push(edge.source);
      map.set(edge.target, sources);
    });
    return map;
  }, [initialEdges]);

  // Find all nodes in the path from a node back to origin(s)
  const findPathToOrigins = useCallback((startNodeId: string): Set<string> => {
    const pathNodes = new Set<string>();
    const queue = [startNodeId];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (pathNodes.has(nodeId)) continue;
      pathNodes.add(nodeId);
      
      // Get all source nodes that point to this node
      const sources = adjacencyMap.get(nodeId) || [];
      sources.forEach(sourceId => {
        if (!pathNodes.has(sourceId)) {
          queue.push(sourceId);
        }
      });
    }
    
    return pathNodes;
  }, [adjacencyMap]);

  // Handle node click
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (selectedNodeId === node.id) {
      // Clicking same node deselects
      setSelectedNodeId(null);
    } else {
      setSelectedNodeId(node.id);
    }
  }, [selectedNodeId]);

  // Update node/edge styling based on selection
  useEffect(() => {
    if (baseNodes.length === 0) return;

    if (!selectedNodeId) {
      // No selection - reset all to normal
      setNodes(baseNodes.map(node => ({
        ...node,
        data: { ...node.data, isHighlighted: false, isDimmed: false }
      })));
      setEdges(baseEdges.map(edge => ({
        ...edge,
        style: {
          stroke: initialNodes.find(n => n.id === edge.source)?.data.isOrigin ? "#f59e0b" : "#22c55e",
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: initialNodes.find(n => n.id === edge.source)?.data.isOrigin ? "#f59e0b" : "#22c55e",
          width: 15,
          height: 15,
        },
      })));
      return;
    }

    // Find path from selected node to origins
    const pathNodeIds = findPathToOrigins(selectedNodeId);

    // Update nodes
    const updatedNodes = baseNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isHighlighted: pathNodeIds.has(node.id),
        isDimmed: !pathNodeIds.has(node.id),
      }
    }));

    // Update edges
    const updatedEdges = baseEdges.map(edge => {
      const isInPath = pathNodeIds.has(edge.source) && pathNodeIds.has(edge.target);
      const sourceNode = initialNodes.find(n => n.id === edge.source);
      const isOriginEdge = sourceNode?.data.isOrigin;
      
      return {
        ...edge,
        style: {
          stroke: isInPath 
            ? (isOriginEdge ? "#fbbf24" : "#4ade80") 
            : "#3f3f46",
          strokeWidth: isInPath ? 3 : 1,
          opacity: isInPath ? 1 : 0.3,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isInPath 
            ? (isOriginEdge ? "#fbbf24" : "#4ade80") 
            : "#3f3f46",
          width: isInPath ? 18 : 12,
          height: isInPath ? 18 : 12,
        },
        animated: isInPath && isOriginEdge,
      };
    });

    setNodes(updatedNodes);
    setEdges(updatedEdges);
  }, [selectedNodeId, baseNodes, baseEdges, findPathToOrigins, initialNodes]);

  // Build initial graph layout
  useEffect(() => {
    async function buildGraph() {
      setIsLoading(true);

      const flowNodes: Node[] = initialNodes.map((n) => {
        let nodeType: string;
        if (n.data.isRosterPlayer) nodeType = "target";
        else if (n.data.isOrigin) nodeType = "origin";
        else if (n.data.nodeType === "pick") nodeType = "pick";
        else nodeType = "player";

        return {
          id: n.id,
          type: nodeType,
          data: { ...n.data, isHighlighted: false, isDimmed: false },
          position: { x: 0, y: 0 },
        };
      });

      const flowEdges: Edge[] = initialEdges.map((e) => {
        const sourceNode = initialNodes.find(n => n.id === e.source);
        const isOriginEdge = sourceNode?.data.isOrigin;

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: "default",
          style: {
            stroke: isOriginEdge ? "#f59e0b" : "#22c55e",
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isOriginEdge ? "#f59e0b" : "#22c55e",
            width: 15,
            height: 15,
          },
        };
      });

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

        // Get initial positions from ELK
        let positionedNodes = flowNodes.map((node) => {
          const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
          return {
            ...node,
            position: {
              x: elkNode?.x ?? 0,
              y: elkNode?.y ?? 0,
            },
          };
        });

        // Post-process: arrange roster nodes in a vertical column on the left
        const rosterNodes = positionedNodes.filter(n => n.type === "target");
        const otherNodes = positionedNodes.filter(n => n.type !== "target");
        
        // Sort roster nodes by roster order (starters → bench → two-way)
        rosterNodes.sort((a, b) => {
          const orderA = (a.data as NodeData).rosterOrder ?? 99;
          const orderB = (b.data as NodeData).rosterOrder ?? 99;
          return orderA - orderB;
        });
        
        // Position roster nodes in a vertical column
        rosterNodes.forEach((node, index) => {
          node.position = {
            x: ROSTER_X_POSITION,
            y: index * ROSTER_VERTICAL_SPACING,
          };
        });
        
        // Find the rightmost roster node position to offset other nodes
        const rosterWidth = NODE_WIDTH + 80; // Add padding
        
        // Shift all other nodes to the right of the roster column
        const minOtherX = Math.min(...otherNodes.map(n => n.position.x));
        const offsetX = rosterWidth - minOtherX;
        
        otherNodes.forEach(node => {
          node.position.x += offsetX;
        });
        
        positionedNodes = [...rosterNodes, ...otherNodes];

        setBaseNodes(positionedNodes);
        setBaseEdges(flowEdges);
        setNodes(positionedNodes);
        setEdges(flowEdges);
      } catch (error) {
        console.error("Layout error:", error);
        const positionedNodes = flowNodes.map((node, i) => ({
          ...node,
          position: { x: (i % 10) * 200, y: Math.floor(i / 10) * 100 },
        }));
        setBaseNodes(positionedNodes);
        setBaseEdges(flowEdges);
        setNodes(positionedNodes);
        setEdges(flowEdges);
      }

      setIsLoading(false);
    }

    buildGraph();
  }, [initialNodes, initialEdges]);

  // Click on background to deselect
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Export function - captures the visible ReactFlow and adds header/footer
  const handleExport = useCallback(async (mode: "dark" | "light") => {
    setIsExporting(true);
    setShowExportMenu(false);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Get the ReactFlow container
      const flowContainer = document.querySelector('.react-flow') as HTMLElement;
      if (!flowContainer) throw new Error("Could not find flow element");
      
      // Hide controls and minimap for export
      const controls = flowContainer.querySelector('.react-flow__controls') as HTMLElement;
      const minimap = flowContainer.querySelector('.react-flow__minimap') as HTMLElement;
      if (controls) controls.style.display = 'none';
      if (minimap) minimap.style.display = 'none';
      
      // First capture the flow as an image
      const flowImage = await toJpeg(flowContainer, {
        quality: 0.95,
        backgroundColor: mode === 'dark' ? '#09090b' : '#f4f4f5',
        pixelRatio: 2,
      });
      
      // Restore controls and minimap
      if (controls) controls.style.display = '';
      if (minimap) minimap.style.display = '';
      
      // Create a canvas to compose the final image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Load the flow image to get dimensions
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = flowImage;
      });
      
      const padding = 60;
      const headerHeight = 140;
      const footerHeight = 80;
      const canvasWidth = Math.max(img.width, 1400);
      const canvasHeight = img.height + headerHeight + footerHeight + padding * 2;
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Colors based on mode
      const bgColor = mode === 'dark' ? '#09090b' : '#ffffff';
      const textColor = mode === 'dark' ? '#ffffff' : '#09090b';
      const subtextColor = mode === 'dark' ? '#a1a1aa' : '#52525b';
      const accentGreen = mode === 'dark' ? '#22c55e' : '#16a34a';
      const accentAmber = mode === 'dark' ? '#f59e0b' : '#d97706';
      const accentBlue = mode === 'dark' ? '#3b82f6' : '#2563eb';
      
      // Fill background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw header
      ctx.fillStyle = textColor;
      ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
      ctx.fillText(`🏀 ${teamName} Acquisition Tree`, padding, padding + 50);
      
      ctx.fillStyle = subtextColor;
      ctx.font = '20px system-ui, -apple-system, sans-serif';
      ctx.fillText('How every player on the current roster was acquired', padding, padding + 85);
      
      // Stats row
      const statsY = padding + 120;
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      
      const rosterCount = nodes.filter(n => n.type === 'target').length;
      const originCount = nodes.filter(n => (n.data as NodeData).isOrigin).length;
      
      ctx.fillStyle = accentGreen;
      ctx.fillText(`${rosterCount}`, padding, statsY);
      ctx.fillStyle = subtextColor;
      ctx.fillText(` Current Roster`, padding + ctx.measureText(`${rosterCount}`).width, statsY);
      
      let xOffset = padding + ctx.measureText(`${rosterCount} Current Roster`).width + 30;
      ctx.fillStyle = accentAmber;
      ctx.fillText(`${originCount}`, xOffset, statsY);
      ctx.fillStyle = subtextColor;
      ctx.fillText(` Origins`, xOffset + ctx.measureText(`${originCount}`).width, statsY);
      
      xOffset += ctx.measureText(`${originCount} Origins`).width + 30;
      ctx.fillStyle = accentBlue;
      ctx.fillText(`${nodes.length}`, xOffset, statsY);
      ctx.fillStyle = subtextColor;
      ctx.fillText(` Total Nodes`, xOffset + ctx.measureText(`${nodes.length}`).width, statsY);
      
      xOffset += ctx.measureText(`${nodes.length} Total Nodes`).width + 30;
      ctx.fillStyle = subtextColor;
      ctx.fillText(`${edges.length} Transactions`, xOffset, statsY);
      
      // Draw the flow image
      const flowY = headerHeight + padding;
      ctx.drawImage(img, (canvasWidth - img.width) / 2, flowY, img.width, img.height);
      
      // Draw footer
      const footerY = flowY + img.height + 40;
      
      ctx.fillStyle = textColor;
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillText('Created by @ByAkshayRam', padding, footerY);
      
      ctx.fillStyle = subtextColor;
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillText(' · NBA Acquisition Tree', padding + ctx.measureText('Created by @ByAkshayRam').width, footerY);
      
      // Right side of footer
      ctx.textAlign = 'right';
      ctx.fillText('Data: Basketball Reference, ESPN, NBA.com', canvasWidth - padding, footerY);
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), canvasWidth - padding, footerY + 22);
      
      // Convert canvas to JPEG and download
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `${teamName.toLowerCase().replace(/\s+/g, '-')}-acquisition-tree-${mode}.jpg`;
      link.href = dataUrl;
      link.click();
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error as Error).message);
      // Restore controls and minimap on error
      const flowContainer = document.querySelector('.react-flow') as HTMLElement;
      if (flowContainer) {
        const controls = flowContainer.querySelector('.react-flow__controls') as HTMLElement;
        const minimap = flowContainer.querySelector('.react-flow__minimap') as HTMLElement;
        if (controls) controls.style.display = '';
        if (minimap) minimap.style.display = '';
      }
    } finally {
      setIsExporting(false);
    }
  }, [nodes, edges, teamName]);

  if (isLoading) {
    return (
      <div className="h-[800px] flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-green-500 rounded-full animate-spin" />
          <div className="text-zinc-400">Building team tree ({initialNodes.length} nodes)...</div>
        </div>
      </div>
    );
  }

  // Find selected player name for display
  const selectedNode = selectedNodeId ? baseNodes.find(n => n.id === selectedNodeId) : null;
  const selectedPlayerName = selectedNode ? (selectedNode.data as NodeData).label : null;

  return (
    <div className="h-[800px] bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.05}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        panOnDrag
        zoomOnScroll
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#3f3f46" gap={20} />
        <Controls 
          showInteractive={false}
          position="top-right"
          className="!bg-zinc-800 !border-zinc-700 !rounded-lg" 
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as NodeData;
            if (data.isDimmed) return "#3f3f46";
            if (node.type === "target") return "#22c55e";
            if (node.type === "origin") return "#f59e0b";
            if (node.type === "pick") return "#22c55e";
            return "#3b82f6";
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="!bg-zinc-900 !border-zinc-700"
          position="bottom-right"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur rounded-lg p-3 border border-zinc-700 text-xs">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-900 border border-green-400" />
            <span className="text-zinc-400">Current Roster</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-950 border border-amber-400" />
            <span className="text-zinc-400">Origin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-zinc-900 border-l-2 border-l-blue-500" />
            <span className="text-zinc-400">Player</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-950/50 border-l-2 border-l-green-500" />
            <span className="text-zinc-400">Pick</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🏠</span>
            <span className="text-zinc-400">Homegrown</span>
          </div>
        </div>
        <div className="mt-2 text-zinc-500 text-[10px]">
          <span className="text-yellow-300">Starter</span> · <span className="text-green-300">Bench</span> · <span className="text-purple-300">Two-Way</span> · Click node to trace path
        </div>
      </div>

      {/* Node count & selection info */}
      <div className="absolute top-4 left-4 bg-zinc-900/90 backdrop-blur rounded-lg px-3 py-2 border border-zinc-700">
        <div className="text-xs text-zinc-500">Team Acquisition Tree</div>
        <div className="text-sm font-bold text-white">{nodes.length} nodes · {edges.length} edges</div>
        {selectedPlayerName && (
          <div className="mt-1 text-xs text-green-400 flex items-center gap-1">
            <span className="animate-pulse">●</span>
            Tracing: {selectedPlayerName}
          </div>
        )}
      </div>

      {/* Export Button */}
      <div className="absolute top-4 right-16 z-10">
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExporting}
            className="bg-green-600 hover:bg-green-500 disabled:bg-zinc-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Export
              </>
            )}
          </button>
          
          {showExportMenu && (
            <div className="absolute top-full right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-[180px]">
              <div className="px-3 py-2 text-xs text-zinc-400 border-b border-zinc-700">
                Export as JPEG
              </div>
              <button
                onClick={() => handleExport('dark')}
                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-3 transition-colors"
              >
                <span className="w-5 h-5 rounded bg-zinc-900 border border-zinc-600" />
                Dark Mode
              </button>
              <button
                onClick={() => handleExport('light')}
                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-zinc-700 flex items-center gap-3 transition-colors"
              >
                <span className="w-5 h-5 rounded bg-white border border-zinc-300" />
                Light Mode
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close export menu */}
      {showExportMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowExportMenu(false)}
        />
      )}

      {/* Hidden export container ref */}
      <div ref={exportRef} className="hidden" />
    </div>
  );
}
