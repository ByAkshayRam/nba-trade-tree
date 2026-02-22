"use client";
import { NBA_PLAYER_IDS, ESPN_PLAYER_IDS, getHeadshotUrl } from "@/lib/player-headshots";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { trackPlayerClick, trackExport } from "@/lib/analytics";
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

interface SelectedPlayerInfo {
  id: string;
  name: string;
  isRosterPlayer: boolean;
  acquisitionType?: string;
  pathNodes: Array<{
    id: string;
    name: string;
    type: string;
    date?: string;
    acquisitionType?: string;
    tradePartner?: string;
    isOrigin?: boolean;
  }>;
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
  onPlayerSelect?: (player: SelectedPlayerInfo | null) => void;
  highlightPlayer?: string | null;
  highlightPartner?: string | null;
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

// Roster player node (green, with headshot)
// Format acquisition type for display
function formatAcquisitionType(acqType?: string): { label: string; color: string } {
  switch (acqType) {
    case "trade": return { label: "TRADE", color: "text-blue-400" };
    case "draft": return { label: "DRAFT", color: "text-emerald-400" };
    case "draft-night-trade": return { label: "DRAFT-NIGHT TRADE", color: "text-teal-400" };
    case "free-agent": return { label: "SIGNED FA", color: "text-amber-400" };
    case "undrafted": return { label: "SIGNED UDFA", color: "text-orange-400" };
    case "sign-and-trade": return { label: "SIGN & TRADE", color: "text-purple-400" };
    default: return { label: acqType?.toUpperCase() || "", color: "text-zinc-400" };
  }
}

function RosterNode({ data }: NodeProps) {
  const nodeData = data as NodeData;
  const espnUrl = getHeadshotUrl(nodeData.label);
  
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
  
  // Acquisition type badge
  const acqInfo = formatAcquisitionType(nodeData.acquisitionType);
  
  // Extract salary from note if it's a FA signing
  const salaryMatch = nodeData.note?.match(/\$[\d,.]+[MmKk]?\b/);
  const salary = salaryMatch ? salaryMatch[0] : null;
  
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
          {acqInfo.label && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`text-[8px] font-semibold ${acqInfo.color}`}>{acqInfo.label}</span>
            </div>
          )}
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
  const acqInfo = formatAcquisitionType(nodeData.acquisitionType);
  
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
      {acqInfo.label && <div className={`text-[8px] font-semibold ${acqInfo.color}`}>{acqInfo.label}</div>}
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
            ? "bg-fuchsia-900 border-l-4 border-l-fuchsia-400 ring-2 ring-fuchsia-400/50 scale-105" 
            : isDimmed 
              ? "bg-zinc-900/40 border-l-4 border-l-fuchsia-500/30 opacity-40" 
              : "bg-zinc-900 border-l-4 border-l-fuchsia-500 hover:border-l-fuchsia-400"
        }`}
      >
        <Handle type="source" position={Position.Left} className="!bg-fuchsia-500 !w-2 !h-2" />
        <Handle type="target" position={Position.Right} className="!bg-fuchsia-500 !w-2 !h-2" />
        <div className={`text-[9px] font-semibold uppercase ${isHighlighted ? "text-fuchsia-300" : "text-fuchsia-400"}`}>
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
  const isRosterPlayer = nodeData.isRosterPlayer;
  const headshotUrl = isRosterPlayer ? getHeadshotUrl(nodeData.label) : "";
  const category = nodeData.rosterCategory;
  const categoryLabel = category === "starter" ? "Starter" : category === "two-way" ? "Two-Way" : "Bench";
  
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
      <Handle type="target" position={Position.Right} className="!bg-amber-400 !w-2 !h-2" />
      {isRosterPlayer && <Handle type="source" position={Position.Right} className="!bg-amber-400 !w-3 !h-3" />}
      <div className="flex items-center gap-1 mb-1">
        <span className={`text-xs ${isHighlighted ? "text-amber-300 animate-pulse" : "text-amber-400"}`}>★</span>
        <span className={`text-[9px] font-bold uppercase ${isHighlighted ? "text-amber-200" : "text-amber-300"}`}>
          {isRosterPlayer ? `${categoryLabel} · Origin` : "Origin"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {headshotUrl && (
          <img 
            src={headshotUrl}
            alt={nodeData.label}
            className={`w-10 h-10 rounded-full object-cover bg-amber-950 border ${
              isHighlighted ? "border-amber-300" : "border-amber-400"
            }`}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div>
          <div className="font-bold text-white text-xs">{nodeData.label}</div>
          {(() => { const ai = formatAcquisitionType(nodeData.acquisitionType); return ai.label ? <div className={`text-[8px] font-semibold ${ai.color}`}>{ai.label}</div> : null; })()}
          {nodeData.date && <div className={`text-[8px] ${isHighlighted ? "text-amber-200" : "text-amber-300"}`}>
            {formatDate(nodeData.date)}
          </div>}
        </div>
      </div>
    </div>
  );
}

function OtherNode({ data }: NodeProps) {
  const nodeData = data as NodeData;
  const isHighlighted = nodeData.isHighlighted;
  const isDimmed = nodeData.isDimmed;
  
  return (
    <div className="relative">
      <div 
        className={`px-3 py-2 rounded-lg shadow-lg min-w-[120px] relative cursor-pointer transition-all duration-300 ${
          isHighlighted 
            ? "bg-cyan-900 border-l-4 border-l-cyan-400 ring-2 ring-cyan-400/50 scale-105" 
            : isDimmed 
              ? "bg-zinc-900/40 border-l-4 border-l-cyan-500/30 opacity-40" 
              : "bg-zinc-900 border-l-4 border-l-cyan-500 hover:border-l-cyan-400"
        }`}
      >
        <Handle type="source" position={Position.Left} className="!bg-cyan-500 !w-2 !h-2" />
        <Handle type="target" position={Position.Right} className="!bg-cyan-500 !w-2 !h-2" />
        <div className={`text-[9px] font-semibold uppercase ${isHighlighted ? "text-cyan-300" : "text-cyan-400"}`}>
          Other
        </div>
        <div className="font-medium text-white text-xs">{nodeData.label}</div>
        {nodeData.date && <div className="text-[8px] text-zinc-500">{formatDate(nodeData.date)}</div>}
      </div>
    </div>
  );
}

const nodeTypes = {
  target: RosterNode,
  player: PlayerNode,
  pick: PickNode,
  other: OtherNode,
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
  onPlayerSelect,
  highlightPlayer,
  highlightPartner,
}: TeamAcquisitionTreeProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [baseNodes, setBaseNodes] = useState<Node[]>([]);
  const [baseEdges, setBaseEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [partnerHighlightCleared, setPartnerHighlightCleared] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSelections, setExportSelections] = useState({
    fullTree: true,
    twitterLandscape: false,
    statCard: false,
  });
  const [exportMode, setExportMode] = useState<'dark' | 'light'>('dark');
  const exportRef = useRef<HTMLDivElement>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [graphInteractive, setGraphInteractive] = useState(true);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reactFlowInstance = useRef<any>(null);

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
    setPartnerHighlightCleared(true);
    if (selectedNodeId === node.id) {
      // Clicking same node deselects
      setSelectedNodeId(null);
    } else {
      setSelectedNodeId(node.id);
      const nd = node.data as NodeData;
      if (nd.isRosterPlayer) {
        const teamAbbr = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() || '' : '';
        trackPlayerClick(nd.label, teamAbbr.toUpperCase());
      }
    }
  }, [selectedNodeId]);

  // Track the chain root separately so navigation doesn't lose it
  const [chainRootId, setChainRootId] = useState<string | null>(null);

  // When user clicks a node directly (not via nav arrows), update the chain root
  useEffect(() => {
    if (!selectedNodeId) {
      setChainRootId(null);
      return;
    }
    const selectedNode = baseNodes.find(n => n.id === selectedNodeId);
    if (!selectedNode) return;
    const isRoster = (selectedNode.data as NodeData).isRosterPlayer;
    if (isRoster) {
      // Clicked a roster node — this is the new chain root
      setChainRootId(selectedNodeId);
    }
    // If non-roster node clicked directly (not via nav), find root
    // But we only reset chainRootId when a roster node is clicked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  // Get the chain path nodes sorted left-to-right (by x position) for the current chain
  const chainNavNodes = useMemo(() => {
    const rootId = chainRootId;
    if (!rootId) return [];
    
    // Get all nodes in this chain via findPathToOrigins from the root
    const pathIds = findPathToOrigins(rootId);
    pathIds.add(rootId);
    
    // Get actual nodes, sort by x position (left to right = root to leaves)
    return Array.from(pathIds)
      .map(id => baseNodes.find(n => n.id === id))
      .filter(Boolean)
      .sort((a, b) => (a!.position.x) - (b!.position.x))
      .map(n => n!.id);
  }, [chainRootId, baseNodes, findPathToOrigins]);

  // Navigate to prev/next node within the current chain
  const navigateChainNode = useCallback((direction: 'prev' | 'next') => {
    if (chainNavNodes.length === 0) return;
    
    const currentIndex = selectedNodeId ? chainNavNodes.indexOf(selectedNodeId) : -1;
    let nextIndex: number;
    
    if (currentIndex === -1) {
      nextIndex = direction === 'next' ? 0 : chainNavNodes.length - 1;
    } else {
      // Clamp, don't wrap — stop at ends
      if (direction === 'next') {
        nextIndex = Math.min(currentIndex + 1, chainNavNodes.length - 1);
      } else {
        nextIndex = Math.max(currentIndex - 1, 0);
      }
    }
    
    const nextNodeId = chainNavNodes[nextIndex];
    setSelectedNodeId(nextNodeId);
    
    // Center the view on the node
    const node = baseNodes.find(n => n.id === nextNodeId);
    if (node && reactFlowInstance.current) {
      const x = node.position.x + (node.width || 200) / 2;
      const y = node.position.y + (node.height || 80) / 2;
      reactFlowInstance.current.setCenter(x, y, { zoom: 1.2, duration: 400 });
    }
  }, [selectedNodeId, chainNavNodes, baseNodes]);

  // Notify parent when selection changes
  useEffect(() => {
    if (!onPlayerSelect) return;
    
    if (!selectedNodeId || baseNodes.length === 0) {
      onPlayerSelect(null);
      return;
    }
    
    const selectedNode = baseNodes.find(n => n.id === selectedNodeId);
    if (!selectedNode) {
      onPlayerSelect(null);
      return;
    }
    
    const nodeData = selectedNode.data as NodeData;
    const pathNodeIds = findPathToOrigins(selectedNodeId);
    
    // Build path info from the nodes in the path
    const pathNodes = Array.from(pathNodeIds)
      .map(nodeId => {
        const node = baseNodes.find(n => n.id === nodeId);
        if (!node) return null;
        const data = node.data as NodeData;
        return {
          id: node.id,
          name: data.label,
          type: node.type || 'unknown',
          date: data.date,
          acquisitionType: data.acquisitionType,
          tradePartner: data.tradePartner,
          isOrigin: data.isOrigin,
        };
      })
      .filter(Boolean) as SelectedPlayerInfo['pathNodes'];
    
    // Sort by date (oldest first)
    pathNodes.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    onPlayerSelect({
      id: selectedNodeId,
      name: nodeData.label,
      isRosterPlayer: nodeData.isRosterPlayer || false,
      acquisitionType: nodeData.acquisitionType,
      pathNodes,
    });
  }, [selectedNodeId, baseNodes, findPathToOrigins, onPlayerSelect]);

  // Update node/edge styling based on selection
  useEffect(() => {
    if (baseNodes.length === 0) return;

    if (!selectedNodeId) {
      if (highlightPartner && !partnerHighlightCleared) {
        // Partner highlight mode — find nodes traded with the partner team, then trace up to roster
        const partnerNodeIds = new Set<string>();
        
        // Find all nodes with tradePartner matching
        const tradeNodes: string[] = [];
        for (const node of baseNodes) {
          const nd = node.data as NodeData;
          if (nd.tradePartner === highlightPartner) {
            tradeNodes.push(node.id);
          }
        }
        
        // For each trade node, find its roster player (walk edges target direction)
        // Then highlight the full chain from roster to origins via findPathToOrigins
        // Build adjacency: edge source -> target (deeper -> shallower toward roster)
        const childToParent = new Map<string, string>();
        for (const edge of baseEdges) {
          childToParent.set(edge.source, edge.target);
        }
        
        for (const tradeNodeId of tradeNodes) {
          // Walk up to find the roster node
          let current = tradeNodeId;
          let rosterNodeId: string | null = null;
          const visited = new Set<string>();
          while (current && !visited.has(current)) {
            visited.add(current);
            const node = baseNodes.find(n => n.id === current);
            if (node && (node.data as NodeData).isRosterPlayer) {
              rosterNodeId = current;
              break;
            }
            const parent = childToParent.get(current);
            if (parent) current = parent;
            else break;
          }
          
          // Highlight the full chain for this roster player
          if (rosterNodeId) {
            const pathIds = findPathToOrigins(rosterNodeId);
            for (const id of pathIds) partnerNodeIds.add(id);
          }
        }
        
        // If we found partner nodes, highlight them
        if (partnerNodeIds.size > 0) {
          setNodes(baseNodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              isHighlighted: partnerNodeIds.has(node.id),
              isDimmed: !partnerNodeIds.has(node.id),
            }
          })));
          setEdges(baseEdges.map(edge => {
            const isInPath = partnerNodeIds.has(edge.source) && partnerNodeIds.has(edge.target);
            const sourceNode = initialNodes.find(n => n.id === edge.source);
            const isOriginEdge = sourceNode?.data.isOrigin;
            const targetsRoster = baseNodes.find(n => n.id === edge.target)?.type === "target";
            return {
              ...edge,
              style: {
                stroke: isInPath ? (isOriginEdge ? "#fbbf24" : "#4ade80") : "#3f3f46",
                strokeWidth: isInPath ? 3 : 1,
                opacity: isInPath ? 1 : 0.3,
              },
              markerEnd: targetsRoster ? undefined : {
                type: MarkerType.ArrowClosed,
                color: isInPath ? (isOriginEdge ? "#fbbf24" : "#4ade80") : "#3f3f46",
                width: isInPath ? 18 : 12,
                height: isInPath ? 18 : 12,
              },
              animated: isInPath && isOriginEdge,
            };
          }));
          return;
        }
      }
      
      // No selection - reset all to normal
      setNodes(baseNodes.map(node => ({
        ...node,
        data: { ...node.data, isHighlighted: false, isDimmed: false }
      })));
      setEdges(baseEdges.map(edge => {
        const isOriginEdge = initialNodes.find(n => n.id === edge.source)?.data.isOrigin;
        const targetsRoster = baseNodes.find(n => n.id === edge.target)?.type === "target";
        return {
          ...edge,
          style: {
            stroke: isOriginEdge ? "#f59e0b" : "#22c55e",
            strokeWidth: 2,
          },
          markerEnd: targetsRoster ? undefined : {
            type: MarkerType.ArrowClosed,
            color: isOriginEdge ? "#f59e0b" : "#22c55e",
            width: 15,
            height: 15,
          },
        };
      }));
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
      const targetsRoster = baseNodes.find(n => n.id === edge.target)?.type === "target";
      
      return {
        ...edge,
        style: {
          stroke: isInPath 
            ? (isOriginEdge ? "#fbbf24" : "#4ade80") 
            : "#3f3f46",
          strokeWidth: isInPath ? 3 : 1,
          opacity: isInPath ? 1 : 0.3,
        },
        markerEnd: targetsRoster ? undefined : {
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
  }, [selectedNodeId, baseNodes, baseEdges, findPathToOrigins, initialNodes, highlightPartner, partnerHighlightCleared]);

  // Build initial graph layout
  useEffect(() => {
    async function buildGraph() {
      setIsLoading(true);

      const flowNodes: Node[] = initialNodes.map((n) => {
        let nodeType: string;
        if (n.data.isRosterPlayer) nodeType = "target";
        else if (n.data.isOrigin) nodeType = "origin";
        else if (n.data.nodeType === "pick") nodeType = "pick";
        else if ((n.data.nodeType as string) === "other") nodeType = "other";
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
          ...(initialNodes.find(n => n.id === e.target)?.data.isRosterPlayer ? {} : {
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isOriginEdge ? "#f59e0b" : "#22c55e",
              width: 15,
              height: 15,
            },
          }),
        };
      });

      try {
        let positionedNodes: Node[];
        
        // For sparse graphs (< 5 edges), skip ELK and use simple column layout
        // ELK can hang on mostly-disconnected graphs
        if (flowEdges.length < 5) {
          console.log(`Sparse graph (${flowEdges.length} edges) - using simple layout`);
          
          // Separate roster and non-roster nodes
          const rosterNodes = flowNodes.filter(n => n.type === "target");
          const otherNodes = flowNodes.filter(n => n.type !== "target");
          
          // Sort roster by order
          rosterNodes.sort((a, b) => {
            const orderA = (a.data as NodeData).rosterOrder ?? 99;
            const orderB = (b.data as NodeData).rosterOrder ?? 99;
            return orderA - orderB;
          });
          
          // Position roster in left column
          rosterNodes.forEach((node, i) => {
            node.position = { x: 0, y: i * ROSTER_VERTICAL_SPACING };
          });
          
          // Position other nodes (origins, etc.) in a column to the right
          otherNodes.forEach((node, i) => {
            node.position = { x: NODE_WIDTH + 200, y: i * 80 };
          });
          
          positionedNodes = [...rosterNodes, ...otherNodes];
          
          const srcWithEdges = new Set(flowEdges.map(e => e.source));
          positionedNodes.forEach(n => {
            if (n.type === "target") (n.data as NodeData).hasChain = srcWithEdges.has(n.id);
          });

          setBaseNodes(positionedNodes);
          setBaseEdges(flowEdges);
          setNodes(positionedNodes);
          setEdges(flowEdges);
          setIsLoading(false);
          return; // Skip the rest of ELK processing
        }
        
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

        // Timeout wrapper for ELK layout (5 seconds max)
        const layoutWithTimeout = async (g: typeof graph, timeoutMs = 5000) => {
          return Promise.race([
            elk.layout(g),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('ELK layout timeout')), timeoutMs)
            )
          ]);
        };

        const layoutedGraph = await layoutWithTimeout(graph);

        // Get initial positions from ELK
        positionedNodes = flowNodes.map((node) => {
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

        // Tag roster nodes that have outgoing edges (i.e., a chain to follow)
        const sourcesWithEdges = new Set(flowEdges.map(e => e.source));
        positionedNodes.forEach(n => {
          if (n.type === "target") {
            (n.data as NodeData).hasChain = sourcesWithEdges.has(n.id);
          }
        });

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
        const sourcesWithEdges2 = new Set(flowEdges.map(e => e.source));
        positionedNodes.forEach(n => {
          if (n.type === "target") {
            (n.data as NodeData).hasChain = sourcesWithEdges2.has(n.id);
          }
        });
        setBaseNodes(positionedNodes);
        setBaseEdges(flowEdges);
        setNodes(positionedNodes);
        setEdges(flowEdges);
      }

      setIsLoading(false);
    }

    buildGraph();
  }, [initialNodes, initialEdges]);

  // Auto-highlight player from search query param
  useEffect(() => {
    if (!highlightPlayer || isLoading || baseNodes.length === 0) return;
    
    // Find the roster node matching the player slug
    const slug = highlightPlayer.toLowerCase();
    const matchNode = baseNodes.find(n => {
      const label = (n.data as NodeData).label?.toLowerCase() || '';
      const nodeSlug = label.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return nodeSlug === slug || label === slug.replace(/-/g, ' ');
    });
    
    if (matchNode && !selectedNodeId) {
      setSelectedNodeId(matchNode.id);
    }
  }, [highlightPlayer, isLoading, baseNodes, selectedNodeId]);

  // Detect touch device — only gate graph interaction on mobile/touch
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(isTouch);
    if (isTouch) setGraphInteractive(false);
  }, []);

  // Deactivate graph interaction when user taps outside
  useEffect(() => {
    if (!graphInteractive) return;
    const handleTouchOutside = (e: TouchEvent) => {
      if (graphContainerRef.current && !graphContainerRef.current.contains(e.target as globalThis.Node)) {
        setGraphInteractive(false);
      }
    };
    document.addEventListener('touchstart', handleTouchOutside);
    return () => document.removeEventListener('touchstart', handleTouchOutside);
  }, [graphInteractive]);

  // Click on background to deselect
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Helper to load an image
  const loadImage = useCallback((url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }, []);

  // Helper to get team-specific colors and data
  const getTeamData = useCallback(() => {
    const rosterCount = nodes.filter(n => n.type === 'target').length;
    const originCount = nodes.filter(n => (n.data as NodeData).isOrigin).length;
    const homegrownCount = nodes.filter(n => (n.data as NodeData).isHomegrown).length;
    
    // Get franchise players - prioritize actual stars over roster order
    const rosterNodes = nodes.filter(n => n.type === 'target');
    
    // Define star players to prioritize (by name)
    const starPriority = ['Jayson Tatum', 'Jaylen Brown', 'Jaylen Brown', 'Anthony Davis', 'LeBron James', 
      'Luka Doncic', 'Stephen Curry', 'Giannis Antetokounmpo', 'Kevin Durant', 'Joel Embiid',
      'Nikola Jokic', 'Shai Gilgeous-Alexander', 'Victor Wembanyama', 'Anthony Edwards',
      'Donovan Mitchell', 'Devin Booker', 'Trae Young', 'Ja Morant', 'Zion Williamson'];
    
    // Sort: stars first, then by roster order
    const sortedRoster = [...rosterNodes].sort((a, b) => {
      const labelA = (a.data as NodeData).label;
      const labelB = (b.data as NodeData).label;
      const starIndexA = starPriority.indexOf(labelA);
      const starIndexB = starPriority.indexOf(labelB);
      
      // If both are stars, use star priority order
      if (starIndexA !== -1 && starIndexB !== -1) return starIndexA - starIndexB;
      // If only A is a star, A comes first
      if (starIndexA !== -1) return -1;
      // If only B is a star, B comes first
      if (starIndexB !== -1) return 1;
      // Otherwise use roster order
      const orderA = (a.data as NodeData).rosterOrder ?? 99;
      const orderB = (b.data as NodeData).rosterOrder ?? 99;
      return orderA - orderB;
    });
    
    const franchisePlayers = sortedRoster
      .slice(0, 3)
      .map(n => {
        const label = (n.data as NodeData).label;
        const headshotUrl = getHeadshotUrl(label);
        return {
          name: label,
          espnId: ESPN_PLAYER_IDS[label],
          headshotUrl: headshotUrl || null,
        };
      });
    
    return {
      rosterCount,
      originCount,
      homegrownCount,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      franchisePlayers,
    };
  }, [nodes, edges]);

  // Export Option A: "The Story" - 1:1 Square format (compact)
  const exportStoryFormat = useCallback(async (mode: 'dark' | 'light'): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const size = 1800; // Smaller for tighter layout
    canvas.width = size;
    canvas.height = size;
    
    const teamData = getTeamData();
    const isDark = mode === 'dark';
    
    // Colors
    const bgGradientStart = isDark ? '#0a2e0a' : '#e8f5e9';
    const bgGradientEnd = isDark ? '#051505' : '#c8e6c9';
    const textColor = isDark ? '#ffffff' : '#1a1a1a';
    const accentGold = '#d4a84b';
    const accentGreen = isDark ? '#22c55e' : '#16a34a';
    const cardBg = isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.2)';
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, bgGradientStart);
    gradient.addColorStop(1, bgGradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    const padding = 60;
    
    // Team badge
    ctx.fillStyle = accentGreen;
    ctx.beginPath();
    ctx.roundRect(padding, padding, 50, 50, 10);
    ctx.fill();
    ctx.fillStyle = isDark ? '#051505' : '#ffffff';
    ctx.font = 'bold 28px system-ui';
    ctx.fillText('☘️', padding + 10, padding + 36);
    
    // Team name
    ctx.fillStyle = accentGreen;
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(teamName.toUpperCase(), padding + 65, padding + 36);
    
    // Main headline
    ctx.fillStyle = textColor;
    ctx.font = 'bold 80px system-ui, -apple-system, sans-serif';
    ctx.fillText('The Trade That Built', padding, padding + 160);
    ctx.fillStyle = accentGold;
    ctx.fillText('A Dynasty', padding, padding + 250);
    
    // Load player headshots
    const headshots = await Promise.all(
      teamData.franchisePlayers.slice(0, 2).map(p => p.headshotUrl ? loadImage(p.headshotUrl) : Promise.resolve(null))
    );
    
    // Player cards - side by side
    const cardY = padding + 310;
    const cardWidth = 340;
    const cardHeight = 90;
    
    teamData.franchisePlayers.slice(0, 2).forEach((player, i) => {
      const cardX = padding + i * (cardWidth + 30);
      
      // Card background
      ctx.fillStyle = cardBg;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 14);
      ctx.fill();
      ctx.strokeStyle = accentGreen;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Player headshot - preserve aspect ratio
      const headshot = headshots[i];
      const circleRadius = 32;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cardX + 50, cardY + 45, circleRadius, 0, Math.PI * 2);
      ctx.clip();
      if (headshot) {
        // ESPN images are 350x254, draw centered and scaled
        const imgSize = circleRadius * 2.5;
        ctx.drawImage(headshot, cardX + 50 - imgSize/2, cardY + 45 - imgSize/2.2, imgSize, imgSize * 0.73);
      } else {
        ctx.fillStyle = isDark ? '#1a472a' : '#a5d6a7';
        ctx.fillRect(cardX, cardY, circleRadius * 2, circleRadius * 2);
      }
      ctx.restore();
      
      // Circle border
      ctx.beginPath();
      ctx.arc(cardX + 50, cardY + 45, circleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = accentGreen;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Player name
      ctx.fillStyle = textColor;
      ctx.font = 'bold 24px system-ui';
      ctx.fillText(player.name, cardX + 95, cardY + 40);
      ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
      ctx.font = '16px system-ui';
      ctx.fillText(`#3 Pick via BKN${i === 0 ? ' → PHI' : ''}`, cardX + 95, cardY + 62);
    });
    
    // Big stats row - moved up
    const statsY = cardY + 160;
    ctx.fillStyle = accentGreen;
    ctx.font = 'bold 60px system-ui';
    ctx.fillText('1 TRADE', padding, statsY);
    ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af';
    ctx.font = '40px system-ui';
    ctx.fillText('→', padding + 270, statsY - 8);
    ctx.fillStyle = accentGold;
    ctx.font = 'bold 60px system-ui';
    ctx.fillText('10 YEARS', padding + 320, statsY);
    ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af';
    ctx.font = '40px system-ui';
    ctx.fillText('→', padding + 610, statsY - 8);
    ctx.fillStyle = accentGreen;
    ctx.font = 'bold 60px system-ui';
    ctx.fillText('1 TITLE', padding + 660, statsY);
    
    // Timeline section - more compact
    const timelineY = statsY + 80;
    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.roundRect(padding, timelineY, size - padding * 2, 160, 16);
    ctx.fill();
    
    // Timeline nodes
    const timelineNodes = ['KG + Pierce', 'BKN Picks', 'Brown + Tatum'];
    const timelineDates = ['Traded 2013', '2014-2018', 'Dynasty Core'];
    const nodeSpacing = (size - padding * 2 - 160) / 2;
    
    timelineNodes.forEach((node, i) => {
      const nodeX = padding + 80 + i * nodeSpacing;
      const nodeY = timelineY + 80;
      
      ctx.fillStyle = i === 0 ? accentGold : accentGreen;
      ctx.beginPath();
      ctx.roundRect(nodeX - 70, nodeY - 25, 140, 50, 8);
      ctx.fill();
      
      ctx.fillStyle = isDark ? '#000' : '#fff';
      ctx.font = 'bold 18px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(node, nodeX, nodeY + 5);
      
      ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
      ctx.font = '14px system-ui';
      ctx.fillText(timelineDates[i], nodeX, nodeY + 42);
      
      if (i < timelineNodes.length - 1) {
        ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af';
        ctx.font = '28px system-ui';
        ctx.fillText('→', nodeX + 100, nodeY + 5);
      }
    });
    ctx.textAlign = 'left';
    
    // Bottom stats row - moved up
    const bottomY = size - 140;
    const statLabels = ['ROSTER', '🏠 HOMEGROWN', 'ORIGINS', 'TRADES', 'EARLIEST'];
    const statValues = [teamData.rosterCount, teamData.homegrownCount, teamData.originCount, teamData.totalEdges, '1996'];
    const statSpacing = (size - padding * 2) / statLabels.length;
    
    statLabels.forEach((label, i) => {
      const x = padding + i * statSpacing;
      ctx.fillStyle = textColor;
      ctx.font = 'bold 40px system-ui';
      ctx.fillText(String(statValues[i]), x, bottomY);
      ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
      ctx.font = '14px system-ui';
      ctx.fillText(label, x, bottomY + 24);
    });
    
    // Footer
    ctx.fillStyle = textColor;
    ctx.font = 'bold 20px system-ui';
    ctx.fillText('@ByAkshayRam', padding, size - padding + 10);
    ctx.fillStyle = accentGreen;
    ctx.fillText(' · RosterDNA', padding + ctx.measureText('@ByAkshayRam').width, size - padding + 10);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = isDark ? '#6b7280' : '#9ca3af';
    ctx.font = '20px system-ui';
    ctx.fillText(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), size - padding, size - padding + 10);
    
    return canvas.toDataURL('image/jpeg', 0.95);
  }, [teamName, getTeamData, loadImage]);

  // Export Option C: "Stat Card" - 16:9 (2400x1350) - Centered layout, single player focus
  const exportStatCard = useCallback(async (mode: 'dark' | 'light'): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const width = 2400;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;
    
    const teamData = getTeamData();
    const isDark = mode === 'dark';
    
    const bgColor = isDark ? '#0a0a0a' : '#fafafa';
    const textColor = isDark ? '#ffffff' : '#1a1a1a';
    const accentGold = '#c9a227';
    const accentGreen = isDark ? '#22c55e' : '#16a34a';
    const subtextColor = isDark ? '#71717a' : '#71717a';
    
    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Top accent bar
    const gradientBar = ctx.createLinearGradient(0, 0, width, 0);
    gradientBar.addColorStop(0, accentGreen);
    gradientBar.addColorStop(0.5, accentGold);
    gradientBar.addColorStop(1, accentGreen);
    ctx.fillStyle = gradientBar;
    ctx.fillRect(0, 0, width, 12);
    
    const padding = 80;
    
    // Team badge
    ctx.fillStyle = accentGreen;
    ctx.beginPath();
    ctx.roundRect(padding, 50, 80, 80, 16);
    ctx.fill();
    ctx.fillStyle = isDark ? '#000' : '#fff';
    ctx.font = '44px system-ui';
    ctx.fillText('☘️', padding + 18, 102);
    
    // Team name
    ctx.fillStyle = textColor;
    ctx.font = 'bold 44px system-ui';
    ctx.fillText(teamName, padding + 100, 88);
    ctx.fillStyle = subtextColor;
    ctx.font = '26px system-ui';
    ctx.fillText('RosterDNA Analysis', padding + 100, 122);
    
    // Load ONLY the main player headshot (Jayson Tatum)
    const mainPlayer = teamData.franchisePlayers[0];
    const headshot = mainPlayer?.headshotUrl ? await loadImage(mainPlayer.headshotUrl) : null;
    
    // Single player headshot (top right) - BIGGER
    const headshotY = 50;
    const headshotX = width - padding - 55;
    const radius = 55;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(headshotX, headshotY + 55, radius, 0, Math.PI * 2);
    ctx.clip();
    if (headshot) {
      const aspectRatio = 350 / 254;
      const drawHeight = radius * 2.4;
      const drawWidth = drawHeight * aspectRatio;
      ctx.drawImage(headshot, headshotX - drawWidth/2, headshotY + 55 - radius - 8, drawWidth, drawHeight);
    } else {
      ctx.fillStyle = isDark ? '#1f2937' : '#e5e7eb';
      ctx.fill();
    }
    ctx.restore();
    
    ctx.beginPath();
    ctx.arc(headshotX, headshotY + 55, radius, 0, Math.PI * 2);
    ctx.strokeStyle = accentGold;
    ctx.lineWidth = 5;
    ctx.stroke();
    
    // Calculate layout - split into left (headline) and right (chain) sections
    const chainBoxWidth = 480;
    const chainBoxHeight = 480;
    const leftSectionWidth = width - chainBoxWidth - padding * 3;
    const verticalCenter = height / 2;
    
    // Main headline - CENTERED in left section, BIGGER font
    const headlineX = padding;
    const headlineY = verticalCenter - 60; // Center vertically
    const playerName = mainPlayer?.name || 'This Team';
    
    ctx.fillStyle = textColor;
    ctx.font = 'bold 88px system-ui';
    ctx.fillText(`${playerName} exists because`, headlineX, headlineY);
    
    ctx.fillStyle = accentGold;
    ctx.font = 'bold 88px system-ui';
    ctx.fillText('the Nets gave up their future', headlineX, headlineY + 110);
    
    ctx.fillStyle = textColor;
    ctx.font = 'bold 88px system-ui';
    ctx.fillText('for ', headlineX, headlineY + 220);
    ctx.fillStyle = accentGreen;
    ctx.fillText('2 years', headlineX + ctx.measureText('for ').width, headlineY + 220);
    ctx.fillStyle = textColor;
    ctx.fillText(' of KG.', headlineX + ctx.measureText('for 2 years').width, headlineY + 220);
    
    // Chain sidebar (right side) - CENTERED vertically, BIGGER
    const chainX = width - chainBoxWidth - padding;
    const chainY = verticalCenter - chainBoxHeight / 2;
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
    ctx.beginPath();
    ctx.roundRect(chainX, chainY, chainBoxWidth, chainBoxHeight, 24);
    ctx.fill();
    
    // Chain title - CENTERED
    ctx.fillStyle = subtextColor;
    ctx.font = '22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('T H E   C H A I N', chainX + chainBoxWidth / 2, chainY + 55);
    
    const chainNodes = [
      { color: accentGold, text: 'KG/Pierce Trade (2013)' },
      { color: accentGreen, text: 'Brooklyn 1st Rounder' },
      { color: '#3b82f6', text: 'Swap with Philly' },
      { color: accentGold, text: `${playerName} (#3, 2017)` },
    ];
    
    ctx.textAlign = 'left';
    const chainStartY = chainY + 110;
    const chainNodeSpacing = 90;
    
    chainNodes.forEach((node, i) => {
      const y = chainStartY + i * chainNodeSpacing;
      const nodeX = chainX + 50;
      
      ctx.beginPath();
      ctx.arc(nodeX, y, 15, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      
      ctx.fillStyle = textColor;
      ctx.font = '32px system-ui';
      ctx.fillText(node.text, nodeX + 35, y + 10);
      
      if (i < chainNodes.length - 1) {
        ctx.strokeStyle = subtextColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(nodeX, y + 25);
        ctx.lineTo(nodeX, y + chainNodeSpacing - 25);
        ctx.stroke();
      }
    });
    
    // Bottom stats - BIGGER
    const bottomY = height - 100;
    const stats = [
      { value: '1996', label: 'EARLIEST' },
      { value: teamData.originCount, label: 'ORIGINS' },
      { value: teamData.homegrownCount, label: 'HOMEGROWN' },
      { value: teamData.rosterCount, label: 'ROSTER' },
    ];
    
    ctx.textAlign = 'right';
    stats.forEach((stat, i) => {
      const x = width - padding - i * 180;
      ctx.fillStyle = textColor;
      ctx.font = 'bold 56px system-ui';
      ctx.fillText(String(stat.value), x, bottomY - 8);
      ctx.fillStyle = subtextColor;
      ctx.font = '20px system-ui';
      ctx.fillText(stat.label, x, bottomY + 26);
    });
    
    // Footer branding
    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;
    ctx.font = 'bold 28px system-ui';
    ctx.fillText('@ByAkshayRam', padding, bottomY);
    ctx.fillStyle = accentGreen;
    ctx.fillText(' · RosterDNA', padding + ctx.measureText('@ByAkshayRam').width, bottomY);
    
    return canvas.toDataURL('image/jpeg', 0.95);
  }, [teamName, getTeamData, loadImage]);

  // Export Option E: "Twitter Landscape" - EXACT mockup dimensions (2700x2160)
  const exportTwitterLandscape = useCallback(async (mode: 'dark' | 'light'): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const width = 2700;
    const height = 2160;
    canvas.width = width;
    canvas.height = height;
    
    const teamData = getTeamData();
    const isDark = mode === 'dark';
    
    const leftBg = isDark ? '#0a0a0a' : '#fafafa';
    const textColor = isDark ? '#ffffff' : '#1a1a1a';
    const accentGold = '#c9a227';
    const accentGreen = isDark ? '#22c55e' : '#16a34a';
    const subtextColor = isDark ? '#71717a' : '#71717a';
    
    const splitPoint = width * 0.55;
    
    // Left side (dark)
    ctx.fillStyle = leftBg;
    ctx.fillRect(0, 0, splitPoint, height);
    
    // Right side (team color gradient)
    const rightGradient = ctx.createLinearGradient(splitPoint, 0, width, height);
    rightGradient.addColorStop(0, isDark ? '#0d470d' : '#dcfce7');
    rightGradient.addColorStop(1, isDark ? '#052505' : '#bbf7d0');
    ctx.fillStyle = rightGradient;
    ctx.fillRect(splitPoint, 0, width - splitPoint, height);
    
    // Pattern overlay on right side
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 25; i++) {
      for (let j = 0; j < 30; j++) {
        ctx.fillStyle = accentGreen;
        ctx.beginPath();
        ctx.arc(splitPoint + 50 + i * 45, 50 + j * 75, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    
    const leftPadding = 65;
    const rightCenter = splitPoint + (width - splitPoint) / 2;
    
    // Left side: Team badge - BIGGER
    ctx.fillStyle = accentGreen;
    ctx.beginPath();
    ctx.roundRect(leftPadding, 50, 80, 80, 16);
    ctx.fill();
    ctx.fillStyle = isDark ? '#000' : '#fff';
    ctx.font = '44px system-ui';
    ctx.fillText('☘️', leftPadding + 18, 100);
    
    ctx.fillStyle = textColor;
    ctx.font = 'bold 42px system-ui';
    ctx.fillText(teamName, leftPadding + 105, 92);
    ctx.fillStyle = subtextColor;
    ctx.font = '26px system-ui';
    ctx.fillText('RosterDNA Analysis', leftPadding + 105, 125);
    
    // Main headline - BIGGER
    const headlineY = 350;
    ctx.fillStyle = textColor;
    ctx.font = 'bold 82px system-ui';
    ctx.fillText('One trade in ', leftPadding, headlineY);
    ctx.fillStyle = accentGreen;
    ctx.fillText('2013', leftPadding + ctx.measureText('One trade in ').width, headlineY);
    ctx.fillStyle = textColor;
    ctx.fillText('.', leftPadding + ctx.measureText('One trade in 2013').width, headlineY);
    
    ctx.fillText('Two franchise players.', leftPadding, headlineY + 100);
    
    ctx.fillStyle = accentGreen;
    ctx.fillText('One championship', leftPadding, headlineY + 200);
    ctx.fillStyle = subtextColor;
    ctx.fillText(' a decade', leftPadding + ctx.measureText('One championship').width, headlineY + 200);
    ctx.fillText('later.', leftPadding, headlineY + 300);
    
    // Trade chain - BIGGER chips
    const chainY = headlineY + 420;
    const chainNodes = [
      { color: accentGold, text: 'KG/Pierce (2013)' },
      { color: accentGreen, text: 'Brooklyn Picks' },
      { color: '#3b82f6', text: 'Draft Trades' },
    ];
    
    chainNodes.forEach((node, i) => {
      const x = leftPadding + i * 280;
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
      ctx.beginPath();
      ctx.roundRect(x, chainY, 240, 60, 30);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(x + 30, chainY + 30, 12, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      
      ctx.fillStyle = textColor;
      ctx.font = '26px system-ui';
      ctx.fillText(node.text, x + 52, chainY + 38);
      
      if (i < chainNodes.length - 1) {
        ctx.fillStyle = subtextColor;
        ctx.font = '32px system-ui';
        ctx.fillText('→', x + 250, chainY + 38);
      }
    });
    
    // Result chip - BIGGER
    ctx.fillStyle = isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.3)';
    ctx.beginPath();
    ctx.roundRect(leftPadding, chainY + 85, 240, 60, 30);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(leftPadding + 30, chainY + 115, 12, 0, Math.PI * 2);
    ctx.fillStyle = accentGreen;
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = '26px system-ui';
    ctx.fillText('Tatum + Brown', leftPadding + 52, chainY + 123);
    
    // Load player headshots
    const headshots = await Promise.all(
      teamData.franchisePlayers.slice(0, 2).map(p => p.headshotUrl ? loadImage(p.headshotUrl) : Promise.resolve(null))
    );
    
    // Right side: Player cards - BIGGER
    const cardWidth = 480;
    const cardHeight = 200;
    const cardStartY = 240;
    
    teamData.franchisePlayers.slice(0, 2).forEach((player, i) => {
      const cardY = cardStartY + i * (cardHeight + 50);
      const cardX = rightCenter - cardWidth / 2;
      const headshot = headshots[i];
      
      ctx.fillStyle = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 24);
      ctx.fill();
      
      // Player headshot - match web UI style
      const circleRadius = 65;
      const circleX = cardX + 85;
      const circleY = cardY + cardHeight/2;
      
      // Background circle
      ctx.beginPath();
      ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? '#1a472a' : '#a5d6a7';
      ctx.fill();
      
      // Draw headshot
      if (headshot) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius - 3, 0, Math.PI * 2);
        ctx.clip();
        // ESPN images are 350x254 - draw to fill circle while keeping face centered
        const aspectRatio = 350 / 254;
        const drawHeight = circleRadius * 2.4;
        const drawWidth = drawHeight * aspectRatio;
        ctx.drawImage(headshot, circleX - drawWidth/2, circleY - circleRadius - 8, drawWidth, drawHeight);
        ctx.restore();
      }
      
      // Circle border - gold like web UI
      ctx.beginPath();
      ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = accentGold;
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Player name
      ctx.fillStyle = textColor;
      ctx.font = 'bold 42px system-ui';
      ctx.fillText(player.name, cardX + 170, cardY + 70);
      ctx.fillStyle = subtextColor;
      ctx.font = '22px system-ui';
      ctx.fillText(`201${7 - i} #3 Pick via BKN${i === 0 ? '/PHI' : ''}`, cardX + 170, cardY + 105);
      
      // Badge
      ctx.fillStyle = accentGreen;
      ctx.beginPath();
      ctx.roundRect(cardX + 170, cardY + 125, i === 0 ? 130 : 140, 40, 8);
      ctx.fill();
      ctx.fillStyle = isDark ? '#000' : '#fff';
      ctx.font = 'bold 18px system-ui';
      ctx.fillText(i === 0 ? '5X ALL-STAR' : 'FINALS MVP', cardX + 185, cardY + 152);
    });
    
    // Trophy section - moved up
    const trophyY = cardStartY + 2 * (cardHeight + 50) + 80;
    ctx.font = '100px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', rightCenter, trophyY);
    
    ctx.fillStyle = accentGold;
    ctx.font = '26px system-ui';
    ctx.fillText('N B A   C H A M P I O N S', rightCenter, trophyY + 80);
    ctx.fillStyle = accentGreen;
    ctx.font = 'bold 90px system-ui';
    ctx.fillText('2024', rightCenter, trophyY + 180);
    ctx.textAlign = 'left';
    
    // Bottom stats (left side) - BIGGER
    const bottomY = height - 130;
    const stats = [
      { value: teamData.rosterCount, label: 'ROSTER' },
      { value: teamData.homegrownCount, label: 'HOMEGROWN' },
      { value: teamData.originCount, label: 'ORIGINS' },
    ];
    
    stats.forEach((stat, i) => {
      const x = leftPadding + i * 180;
      ctx.fillStyle = textColor;
      ctx.font = 'bold 52px system-ui';
      ctx.fillText(String(stat.value), x, bottomY);
      ctx.fillStyle = subtextColor;
      ctx.font = '18px system-ui';
      ctx.fillText(stat.label, x, bottomY + 28);
    });
    
    // Footer branding - BIGGER
    ctx.fillStyle = textColor;
    ctx.font = 'bold 28px system-ui';
    ctx.fillText('@ByAkshayRam', leftPadding, height - 50);
    ctx.fillStyle = accentGreen;
    ctx.fillText(' · RosterDNA', leftPadding + ctx.measureText('@ByAkshayRam').width, height - 50);
    
    return canvas.toDataURL('image/jpeg', 0.95);
  }, [teamName, getTeamData, loadImage]);

  // Export Option D v3: Full Tree - EXACT mockup dimensions (2160x2700)
  const exportFullTree = useCallback(async (mode: 'dark' | 'light'): Promise<string> => {
    const teamData = getTeamData();
    const isDark = mode === 'dark';
    
    const bgColor = isDark ? '#0a0a0a' : '#fafafa';
    const textColor = isDark ? '#ffffff' : '#1a1a1a';
    const accentGreen = isDark ? '#22c55e' : '#16a34a';
    const accentGold = '#d4a84b';
    const accentBlue = '#3b82f6';
    const subtextColor = isDark ? '#71717a' : '#71717a';
    
    // Capture the flow - hide ALL UI overlays
    const flowContainer = document.querySelector('.react-flow') as HTMLElement;
    if (!flowContainer) throw new Error("Could not find flow element");
    
    const controls = flowContainer.querySelector('.react-flow__controls') as HTMLElement;
    const minimap = flowContainer.querySelector('.react-flow__minimap') as HTMLElement;
    const parentContainer = flowContainer.closest('.relative, [class*="relative"]') as HTMLElement;
    
    const overlays: HTMLElement[] = [];
    if (parentContainer) {
      parentContainer.querySelectorAll('[class*="absolute"]').forEach(el => {
        const htmlEl = el as HTMLElement;
        if (!htmlEl.closest('.react-flow__viewport')) {
          overlays.push(htmlEl);
          htmlEl.style.display = 'none';
        }
      });
    }
    if (controls) controls.style.display = 'none';
    if (minimap) minimap.style.display = 'none';
    
    const flowImage = await toJpeg(flowContainer, {
      quality: 0.95,
      backgroundColor: bgColor,
      pixelRatio: 2,
    });
    
    if (controls) controls.style.display = '';
    if (minimap) minimap.style.display = '';
    overlays.forEach(el => el.style.display = '');
    
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = flowImage;
    });
    
    // EXACT mockup dimensions
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const width = 2160;
    const height = 2700;
    canvas.width = width;
    canvas.height = height;
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    const padding = 50;
    
    // Team badge - position from mockup
    ctx.fillStyle = accentGreen;
    ctx.beginPath();
    ctx.roundRect(padding, 45, 60, 60, 12);
    ctx.fill();
    ctx.fillStyle = isDark ? '#000' : '#fff';
    ctx.font = '32px system-ui';
    ctx.fillText('☘️', padding + 14, 85);
    
    ctx.fillStyle = textColor;
    ctx.font = 'bold 30px system-ui';
    ctx.fillText(teamName, padding + 80, 70);
    ctx.fillStyle = subtextColor;
    ctx.font = '18px system-ui';
    ctx.fillText('RosterDNA', padding + 80, 95);
    
    // Season badge - top right
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.roundRect(width - padding - 115, 50, 115, 42, 8);
    ctx.fill();
    ctx.fillStyle = subtextColor;
    ctx.font = '20px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('2025-26', width - padding - 18, 80);
    ctx.textAlign = 'left';
    
    // Headline - LARGER font for better visibility
    ctx.fillStyle = accentGreen;
    ctx.font = 'bold 64px system-ui';
    ctx.fillText(`${teamData.rosterCount} players`, padding, 180);
    ctx.fillStyle = accentGold;
    ctx.fillText(`. ${teamData.totalNodes} assets`, padding + ctx.measureText(`${teamData.rosterCount} players`).width, 180);
    ctx.fillStyle = accentBlue;
    ctx.fillText(`. 30 years of moves.`, padding + ctx.measureText(`${teamData.rosterCount} players. ${teamData.totalNodes} assets`).width, 180);
    
    ctx.fillStyle = textColor;
    ctx.font = 'bold 64px system-ui';
    ctx.fillText('This is how a championship roster gets built.', padding, 260);
    
    // Draw the tree - fit within bounds (adjusted for larger headline)
    const treeY = 310;
    const treeBottom = height - 300;
    const treeHeight = treeBottom - treeY;
    const treeWidth = width - padding * 2;
    
    const scaleX = treeWidth / img.width;
    const scaleY = treeHeight / img.height;
    const scale = Math.min(scaleX, scaleY);
    
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const drawX = padding + (treeWidth - drawWidth) / 2;
    const drawY = treeY + (treeHeight - drawHeight) / 2;
    
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    
    // Legend box - bottom left, moved up to avoid overlapping stats
    const legendY = height - 340;
    ctx.fillStyle = isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(250, 250, 250, 0.9)';
    ctx.beginPath();
    ctx.roundRect(padding - 40, legendY, 340, 95, 12);
    ctx.fill();
    
    const legendItems = [
      { color: accentGold, label: 'Origin' },
      { color: '#3b82f6', label: 'Player' },
      { color: accentGreen, label: 'Pick' },
      { color: '#06b6d4', label: 'Other' },
      { color: textColor, label: '🏠 Homegrown' },
    ];
    
    let legendX = padding - 25;
    legendItems.forEach((item, i) => {
      if (i < 4) {
        ctx.beginPath();
        ctx.roundRect(legendX, legendY + 28, 14, 14, 4);
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.fillStyle = subtextColor;
        ctx.font = '16px system-ui';
        ctx.fillText(item.label, legendX + 22, legendY + 42);
        legendX += ctx.measureText(item.label).width + 45;
      } else {
        ctx.fillStyle = subtextColor;
        ctx.font = '16px system-ui';
        ctx.fillText(item.label, legendX, legendY + 42);
      }
    });
    
    ctx.fillStyle = subtextColor;
    ctx.font = '14px system-ui';
    ctx.fillText('Click node to trace path', padding - 25, legendY + 75);
    
    // Bottom stats - colors match web UI legend (green=roster, gold=origins, blue=assets)
    const bottomY = height - 115;
    const stats = [
      { value: teamData.rosterCount, label: 'CURRENT ROSTER', color: accentGreen },
      { value: teamData.homegrownCount, label: '🏠 HOMEGROWN', color: accentGreen },
      { value: teamData.totalNodes, label: 'TOTAL ASSETS', color: accentBlue },
      { value: teamData.originCount, label: 'TRUE ORIGINS', color: accentGold },
      { value: '1996', label: 'EARLIEST ORIGIN', color: accentGold },
    ];
    
    const statSpacing = (width - padding * 2) / stats.length;
    stats.forEach((stat, i) => {
      const x = padding + i * statSpacing;
      ctx.fillStyle = stat.color;
      ctx.font = 'bold 56px system-ui';
      ctx.fillText(String(stat.value), x, bottomY);
      ctx.fillStyle = subtextColor;
      ctx.font = '14px system-ui';
      ctx.fillText(stat.label, x, bottomY + 32);
    });
    
    // Footer
    ctx.fillStyle = textColor;
    ctx.font = 'bold 22px system-ui';
    ctx.fillText('@ByAkshayRam', padding, height - 40);
    ctx.fillStyle = accentGreen;
    ctx.fillText(' · RosterDNA', padding + ctx.measureText('@ByAkshayRam').width, height - 40);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = subtextColor;
    ctx.font = '18px system-ui';
    ctx.fillText('Explore the full interactive tree →', width - padding, height - 40);
    
    return canvas.toDataURL('image/jpeg', 0.95);
  }, [teamName, getTeamData]);

  // Main export handler
  const handleExport = useCallback(async () => {
    const selected = Object.entries(exportSelections).filter(([_, v]) => v);
    if (selected.length === 0) {
      alert('Please select at least one format to export');
      return;
    }
    
    setIsExporting(true);
    setShowExportMenu(false);
    const teamAbbr = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() || '' : '';
    trackExport(selected.map(([k]) => k).join(','), teamAbbr.toUpperCase());
    
    try {
      const exports: { name: string; data: string }[] = [];
      
      if (exportSelections.fullTree) {
        const data = await exportFullTree(exportMode);
        exports.push({ name: `${teamName.toLowerCase().replace(/\s+/g, '-')}-full-tree-${exportMode}`, data });
      }
      
      if (exportSelections.twitterLandscape) {
        const data = await exportTwitterLandscape(exportMode);
        exports.push({ name: `${teamName.toLowerCase().replace(/\s+/g, '-')}-twitter-${exportMode}`, data });
      }
      
      if (exportSelections.statCard) {
        const data = await exportStatCard(exportMode);
        exports.push({ name: `${teamName.toLowerCase().replace(/\s+/g, '-')}-stat-card-${exportMode}`, data });
      }
      
      // Download all
      exports.forEach((exp, i) => {
        setTimeout(() => {
          const link = document.createElement('a');
          link.download = `${exp.name}.jpg`;
          link.href = exp.data;
          link.click();
        }, i * 500); // Stagger downloads
      });
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  }, [exportSelections, exportMode, teamName, exportStoryFormat, exportStatCard, exportTwitterLandscape, exportFullTree]);

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
    <div ref={graphContainerRef} className="h-[800px] bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden relative">
      {/* Mobile/touch: tap-to-interact overlay */}
      {isTouchDevice && !graphInteractive && (
        <div
          className="absolute inset-0 z-10 flex items-end justify-center pb-6 pointer-events-none"
        >
          <button
            onClick={() => setGraphInteractive(true)}
            className="pointer-events-auto bg-zinc-800/90 backdrop-blur text-zinc-300 text-sm px-4 py-2 rounded-full border border-zinc-600 shadow-lg animate-pulse"
          >
            Tap to explore graph
          </button>
        </div>
      )}
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
        panOnDrag={graphInteractive}
        zoomOnScroll={graphInteractive}
        zoomOnPinch={graphInteractive}
        preventScrolling={graphInteractive}
        proOptions={{ hideAttribution: true }}
        onInit={(instance) => { reactFlowInstance.current = instance; }}
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
            if (node.type === "pick") return "#d946ef";
            return "#3b82f6";
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="!bg-zinc-900 !border-zinc-700"
          position="bottom-right"
        />
      </ReactFlow>

      {/* Chain navigation arrows — above minimap, always visible */}
      <div className="absolute bottom-[168px] right-3 z-10 flex flex-col items-end gap-1" title={!selectedNodeId ? "Select a player to navigate" : undefined}>
        <div className="flex gap-1">
          <button
            onClick={() => navigateChainNode('prev')}
            disabled={!selectedNodeId || chainNavNodes.length <= 1 || chainNavNodes.indexOf(selectedNodeId) === 0}
            className="w-6 h-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded text-zinc-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-zinc-800"
            title="Previous node in chain (←)"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => navigateChainNode('next')}
            disabled={!selectedNodeId || chainNavNodes.length <= 1 || chainNavNodes.indexOf(selectedNodeId) === chainNavNodes.length - 1}
            className="w-6 h-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded text-zinc-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-zinc-800"
            title="Next node in chain (→)"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

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
            <div className="w-3 h-3 rounded bg-zinc-900 border-l-2 border-l-fuchsia-500" />
            <span className="text-zinc-400">Pick</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-zinc-900 border-l-2 border-l-cyan-500" />
            <span className="text-zinc-400">Other</span>
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
        <div className="text-xs text-zinc-500">RosterDNA</div>
        <div className="text-sm font-bold text-white">{nodes.length} nodes · {edges.length} edges</div>
        {selectedPlayerName && (
          <div className="mt-1 text-xs text-green-400 flex items-center gap-1">
            <span className="animate-pulse">●</span>
            Tracing: {selectedPlayerName}
          </div>
        )}
      </div>

      {/* Share Button */}
      <div className="absolute top-4 right-16 z-10">
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
          
          {showExportMenu && (
            <div className="absolute top-full right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden w-[320px]">
              <div className="px-4 py-3 border-b border-zinc-700">
                <div className="text-sm font-semibold text-white mb-1">Share This Team</div>
                <div className="text-xs text-zinc-400">Copy link or share on social</div>
              </div>
              
              {/* Share Options */}
              <div className="p-3 space-y-2">
                <button
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700/50 transition-colors text-left"
                >
                  <span className="text-lg">🔗</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">Copy Link</div>
                    <div className="text-xs text-zinc-500">Share this team page</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    const url = window.location.href;
                    const text = `Check out how the ${teamName} roster was built 🧬`;
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700/50 transition-colors text-left"
                >
                  <span className="text-lg">𝕏</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">Share on Twitter/X</div>
                    <div className="text-xs text-zinc-500">Tweet with pre-filled text</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    const url = window.location.href;
                    const title = `How the ${teamName} roster was built`;
                    window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, '_blank');
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700/50 transition-colors text-left"
                >
                  <span className="text-lg">🟠</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">Share on Reddit</div>
                    <div className="text-xs text-zinc-500">Post to r/nba or any subreddit</div>
                  </div>
                </button>
              </div>

              <div className="px-4 py-3 border-t border-zinc-700">
                <div className="text-[10px] text-zinc-600 flex items-center gap-1.5">
                  <span>🧬</span> Branded cards coming soon — follow @RosterDNA
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close share menu */}
      {showExportMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowExportMenu(false)}
        />
      )}
      {/* Hidden export container ref (kept for potential future use) */}
      <div ref={exportRef} className="hidden" />
    </div>
  );
}
