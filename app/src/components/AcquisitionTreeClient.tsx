"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

// Load AcquisitionTree only on client side (dagre has SSR issues with Turbopack)
const AcquisitionTree = dynamic(() => import("./AcquisitionTree"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-900 rounded-lg flex items-center justify-center">
      <div className="text-gray-400">Loading visualization...</div>
    </div>
  ),
});

interface NodeInput {
  id: string;
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
}

interface EdgeInput {
  from: string;
  to: string;
}

interface AcquisitionTreeClientProps {
  nodes: NodeInput[];
  edges: EdgeInput[];
  teamColors?: {
    primary: string;
    secondary: string;
  };
  originYear?: number;
  player?: string;
}

export default function AcquisitionTreeClient(props: AcquisitionTreeClientProps) {
  // Transform flat node structure to nested { id, type, data } structure
  const transformedNodes = useMemo(() => {
    return props.nodes.map((node) => ({
      id: node.id,
      type: node.nodeType === "pick" ? "pick" : node.isOrigin ? "origin" : node.isTarget ? "target" : "player",
      data: {
        label: node.label,
        sublabel: node.sublabel,
        date: node.date,
        nodeType: node.nodeType,
        acquisitionType: node.acquisitionType,
        tradePartner: node.tradePartner,
        note: node.note,
        isOrigin: node.isOrigin,
        isTarget: node.isTarget,
        draftPick: node.draftPick,
      },
    }));
  }, [props.nodes]);

  // Transform { from, to } edges to { id, source, target } structure
  const transformedEdges = useMemo(() => {
    return props.edges.map((edge, i) => ({
      id: `edge-${i}`,
      source: edge.from,
      target: edge.to,
    }));
  }, [props.edges]);

  const transformedProps = {
    nodes: transformedNodes,
    edges: transformedEdges,
    teamColors: props.teamColors || { primary: "#22c55e", secondary: "#16a34a" },
    originYear: props.originYear || 2000,
    player: props.player || "Player",
  };

  return <AcquisitionTree {...transformedProps} />;
}
