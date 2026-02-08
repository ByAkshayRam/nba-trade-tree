"use client";

import { useEffect, useRef } from "react";

interface NodeDetail {
  id: string;
  type: "player" | "trade" | "pick";
  data: {
    label: string;
    sublabel?: string;
    color?: string;
    date?: string;
    imageUrl?: string;
  };
}

interface NodeDetailModalProps {
  node: NodeDetail | null;
  onClose: () => void;
  originTrade?: {
    id: number;
    date: string;
    description: string;
  } | null;
}

export function NodeDetailModal({ node, onClose, originTrade }: NodeDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  if (!node) return null;

  const renderContent = () => {
    switch (node.type) {
      case "player":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {node.data.imageUrl && (
                <img
                  src={node.data.imageUrl}
                  alt={node.data.label}
                  className="w-20 h-20 rounded-full object-cover border-2"
                  style={{ borderColor: node.data.color || "#22c55e" }}
                />
              )}
              <div>
                <h3 className="text-2xl font-bold text-white">{node.data.label}</h3>
                <p className="text-zinc-400">{node.data.sublabel}</p>
              </div>
            </div>
            
            {originTrade && (
              <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
                <div className="text-sm text-zinc-400 mb-1">Origin Trade</div>
                <div className="text-white font-medium">{originTrade.description}</div>
                <div className="text-sm text-green-400 mt-1">{originTrade.date}</div>
              </div>
            )}
          </div>
        );

      case "trade":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-2xl">
                🔄
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Trade Event</h3>
                <p className="text-sm text-zinc-400">{node.data.date}</p>
              </div>
            </div>
            
            <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
              <div className="text-white">{node.data.label}</div>
              {node.data.sublabel && (
                <div className="text-green-400 mt-2 text-sm">→ {node.data.sublabel}</div>
              )}
            </div>
          </div>
        );

      case "pick":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-900/50 border border-green-600 flex items-center justify-center text-2xl">
                🎯
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Draft Pick Used</h3>
                <p className="text-sm text-zinc-400">{node.data.date}</p>
              </div>
            </div>
            
            <div className="bg-green-900/20 p-4 rounded-lg border border-green-700">
              <div className="text-white">{node.data.label}</div>
              {node.data.sublabel && (
                <div className="text-green-400 mt-2 text-sm">→ {node.data.sublabel}</div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="relative w-full max-w-lg mx-4 p-6 bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* Type badge */}
        <div className="absolute top-4 left-4">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              node.type === "player"
                ? "bg-green-900/50 text-green-400 border border-green-700"
                : node.type === "pick"
                ? "bg-green-900/50 text-green-400 border border-green-700"
                : "bg-zinc-800 text-zinc-400 border border-zinc-600"
            }`}
          >
            {node.type.toUpperCase()}
          </span>
        </div>

        <div className="mt-8">{renderContent()}</div>
      </div>
    </div>
  );
}
