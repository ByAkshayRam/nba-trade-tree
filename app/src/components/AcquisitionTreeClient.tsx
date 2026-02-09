"use client";

import dynamic from "next/dynamic";

// Load AcquisitionTree only on client side (dagre has SSR issues with Turbopack)
const AcquisitionTree = dynamic(() => import("./AcquisitionTree"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-900 rounded-lg flex items-center justify-center">
      <div className="text-gray-400">Loading visualization...</div>
    </div>
  ),
});

interface AcquisitionTreeClientProps {
  nodes: Array<{
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
  }>;
  edges: Array<{
    from: string;
    to: string;
  }>;
  teamColors?: {
    primary: string;
    secondary: string;
  };
  originYear?: number;
  player?: string;
}

export default function AcquisitionTreeClient(props: AcquisitionTreeClientProps) {
  return <AcquisitionTree {...props} />;
}
