"use client";

import { useState, useCallback } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Search, GitBranch, Trophy, Users } from "lucide-react";

// Example data: Celtics/Nets trade tree leading to Tatum
const initialNodes: Node[] = [
  {
    id: "trade-2013",
    type: "default",
    position: { x: 0, y: 0 },
    data: { 
      label: (
        <div className="p-3 text-center">
          <div className="text-xs text-zinc-500 mb-1">June 27, 2013</div>
          <div className="font-semibold">KG + Pierce Trade</div>
          <div className="text-xs text-zinc-400">BOS → BKN</div>
        </div>
      )
    },
    style: { 
      background: "#141416", 
      border: "2px solid #22c55e",
      borderRadius: "12px",
      width: 180,
    },
  },
  {
    id: "pick-2014",
    type: "default",
    position: { x: -200, y: 150 },
    data: { 
      label: (
        <div className="p-3 text-center">
          <div className="text-xs text-zinc-500 mb-1">2014 1st (#17)</div>
          <div className="font-semibold">James Young</div>
          <div className="text-xs text-zinc-400">BKN → BOS</div>
        </div>
      )
    },
    style: { 
      background: "#141416", 
      border: "1px solid #232328",
      borderRadius: "12px",
      width: 160,
    },
  },
  {
    id: "pick-2016",
    type: "default",
    position: { x: 0, y: 150 },
    data: { 
      label: (
        <div className="p-3 text-center">
          <div className="text-xs text-amber-500 mb-1">2016 1st (#3)</div>
          <div className="font-bold text-amber-400">Jaylen Brown ⭐</div>
          <div className="text-xs text-zinc-400">BKN → BOS</div>
        </div>
      )
    },
    style: { 
      background: "#141416", 
      border: "2px solid #f59e0b",
      borderRadius: "12px",
      width: 160,
    },
  },
  {
    id: "pick-2017-orig",
    type: "default",
    position: { x: 200, y: 150 },
    data: { 
      label: (
        <div className="p-3 text-center">
          <div className="text-xs text-zinc-500 mb-1">2017 1st (#1)</div>
          <div className="font-semibold">Traded to PHI</div>
          <div className="text-xs text-zinc-400">BKN → BOS</div>
        </div>
      )
    },
    style: { 
      background: "#141416", 
      border: "1px solid #232328",
      borderRadius: "12px",
      width: 160,
    },
  },
  {
    id: "trade-phi",
    type: "default",
    position: { x: 200, y: 300 },
    data: { 
      label: (
        <div className="p-3 text-center">
          <div className="text-xs text-zinc-500 mb-1">Draft Day Trade</div>
          <div className="font-semibold">#1 → #3 + future</div>
          <div className="text-xs text-zinc-400">BOS → PHI</div>
        </div>
      )
    },
    style: { 
      background: "#141416", 
      border: "1px solid #3b82f6",
      borderRadius: "12px",
      width: 160,
    },
  },
  {
    id: "tatum",
    type: "default",
    position: { x: 200, y: 450 },
    data: { 
      label: (
        <div className="p-3 text-center">
          <div className="text-xs text-amber-500 mb-1">2017 1st (#3)</div>
          <div className="font-bold text-lg text-amber-400">Jayson Tatum ⭐</div>
          <div className="text-xs text-emerald-500 mt-1">🏆 2024 Champion</div>
        </div>
      )
    },
    style: { 
      background: "#141416", 
      border: "2px solid #f59e0b",
      borderRadius: "12px",
      width: 180,
    },
  },
  {
    id: "pick-2018",
    type: "default",
    position: { x: 400, y: 150 },
    data: { 
      label: (
        <div className="p-3 text-center">
          <div className="text-xs text-zinc-500 mb-1">2018 1st (#8)</div>
          <div className="font-semibold">Kyrie Trade Chain</div>
          <div className="text-xs text-zinc-400">BKN → BOS</div>
        </div>
      )
    },
    style: { 
      background: "#141416", 
      border: "1px solid #232328",
      borderRadius: "12px",
      width: 160,
    },
  },
];

const initialEdges: Edge[] = [
  { id: "e1", source: "trade-2013", target: "pick-2014", animated: false },
  { id: "e2", source: "trade-2013", target: "pick-2016", animated: true },
  { id: "e3", source: "trade-2013", target: "pick-2017-orig", animated: true },
  { id: "e4", source: "trade-2013", target: "pick-2018", animated: false },
  { id: "e5", source: "pick-2017-orig", target: "trade-phi", animated: true },
  { id: "e6", source: "trade-phi", target: "tatum", animated: true },
];

export default function Home() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [searchQuery, setSearchQuery] = useState("");

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <main className="h-screen w-screen flex flex-col bg-[#0a0a0b]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#232328]">
        <div className="flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold text-white">NBA Trade Tree</h1>
        </div>
        
        {/* Search */}
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search player (e.g., Jayson Tatum)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#141416] border border-[#232328] rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        {/* Quick links */}
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
            <Users className="w-4 h-4" />
            Teams
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
            <Trophy className="w-4 h-4" />
            Champions
          </button>
        </div>
      </header>
      
      {/* Info banner */}
      <div className="px-6 py-3 bg-[#141416] border-b border-[#232328]">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500">Viewing:</span>
          <span className="font-medium text-white">Celtics/Nets Trade Tree (2013)</span>
          <span className="text-zinc-500">→</span>
          <span className="text-amber-400">Jayson Tatum + Jaylen Brown</span>
          <span className="text-zinc-500">→</span>
          <span className="text-emerald-400">🏆 2024 NBA Champions</span>
        </div>
      </div>
      
      {/* React Flow canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.5 }}
          defaultEdgeOptions={{
            style: { stroke: "#3b82f6", strokeWidth: 2 },
            type: "smoothstep",
          }}
        >
          <Controls 
            className="!bg-[#141416] !border-[#232328]"
            showInteractive={false}
          />
          <MiniMap 
            className="!bg-[#141416] !border-[#232328]"
            nodeColor="#232328"
            maskColor="rgba(0, 0, 0, 0.8)"
          />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1}
            color="#232328"
          />
        </ReactFlow>
      </div>
      
      {/* Footer */}
      <footer className="px-6 py-3 border-t border-[#232328] text-center text-xs text-zinc-500">
        NBA Trade Tree • Built by Edward 🤖 • Data from Basketball-Reference
      </footer>
    </main>
  );
}
