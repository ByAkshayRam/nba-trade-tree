"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { toPng, toJpeg } from "html-to-image";
import { getHeadshotUrl } from "@/lib/player-headshots";

/* ─── Team Colors ─── */
const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  ATL: { primary: "#E03A3E", secondary: "#C1D32F" },
  BOS: { primary: "#007A33", secondary: "#BA9653" },
  BKN: { primary: "#000000", secondary: "#FFFFFF" },
  CHA: { primary: "#00788C", secondary: "#1D1160" },
  CHI: { primary: "#CE1141", secondary: "#000000" },
  CLE: { primary: "#860038", secondary: "#FDBB30" },
  DAL: { primary: "#00538C", secondary: "#002B5E" },
  DEN: { primary: "#0E2240", secondary: "#FEC524" },
  DET: { primary: "#C8102E", secondary: "#1D42BA" },
  GSW: { primary: "#FFC72C", secondary: "#1D428A" },
  HOU: { primary: "#CE1141", secondary: "#000000" },
  IND: { primary: "#002D62", secondary: "#FDBB30" },
  LAC: { primary: "#C8102E", secondary: "#1D428A" },
  LAL: { primary: "#552583", secondary: "#FDB927" },
  MEM: { primary: "#5D76A9", secondary: "#12173F" },
  MIA: { primary: "#98002E", secondary: "#F9A01B" },
  MIL: { primary: "#00471B", secondary: "#EEE1C6" },
  MIN: { primary: "#0C2340", secondary: "#236192" },
  NOP: { primary: "#B4975A", secondary: "#0C2340" },
  NYK: { primary: "#F58426", secondary: "#006BB6" },
  OKC: { primary: "#007AC1", secondary: "#EF3B24" },
  ORL: { primary: "#0077C0", secondary: "#C4CED4" },
  PHI: { primary: "#006BB6", secondary: "#ED174C" },
  PHX: { primary: "#1D1160", secondary: "#E56020" },
  POR: { primary: "#E03A3E", secondary: "#000000" },
  SAC: { primary: "#5A2D81", secondary: "#63727A" },
  SAS: { primary: "#C4CED4", secondary: "#000000" },
  TOR: { primary: "#CE1141", secondary: "#000000" },
  UTA: { primary: "#3E1175", secondary: "#002B5C" },
  WAS: { primary: "#002B5C", secondary: "#E31837" },
};
const TEAM_LIST = Object.keys(TEAM_COLORS).sort();

/* ─── Types ─── */
interface TreeNode {
  type: string;
  name: string;
  acquisitionType?: string;
  date?: string;
  currentTeam?: string;
  tradePartner?: string;
  tradeDescription?: string;
  draftPick?: number;
  note?: string;
  isOrigin?: boolean;
  becamePlayer?: string;
  assetsGivenUp?: TreeNode[];
}

interface PlayerData {
  _meta: { team: string; player: string; depth: number };
  tree: TreeNode;
}

interface RosterPlayer {
  name: string;
  slug: string;
}

/* ─── Sizes ─── */
const SIZES = {
  "4:5": { w: 1080, h: 1350 },
  "1:1": { w: 1080, h: 1080 },
  "3:2": { w: 1200, h: 800 },
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
} as const;
type SizeKey = keyof typeof SIZES;

type LayoutMode = "fullbleed" | "split-hero";

/* ─── Helpers ─── */
function formatDate(d: string): string {
  try {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function getAcqLabel(node: TreeNode): string {
  const t = node.acquisitionType;
  if (t === "trade" || t === "sign-and-trade") return "TRADE";
  if (t === "draft" || t === "draft-night-trade") return "DRAFT";
  if (t === "free-agent") return "FREE AGENT";
  if (t === "undrafted") return "UNDRAFTED";
  if (t === "original") return "ORIGINAL";
  return (t || "").toUpperCase();
}

const NODE_STYLES: Record<string, { bg: string; border: string; labelColor: string }> = {
  player: { bg: "#18181b", border: "#3b82f6", labelColor: "#60a5fa" },
  pick: { bg: "#18181b", border: "#d946ef", labelColor: "#e879f9" },
  origin: { bg: "#18181b", border: "#22c55e", labelColor: "#4ade80" },
  other: { bg: "#18181b", border: "#22d3ee", labelColor: "#67e8f5" },
};

function getNodeStyle(node: TreeNode, isOrigin?: boolean) {
  if (node.type === "pick") return NODE_STYLES.pick;
  if (node.type === "other") return NODE_STYLES.other;
  if (isOrigin) return NODE_STYLES.origin;
  return NODE_STYLES.player;
}

function collectLeaves(node: TreeNode): TreeNode[] {
  const isLeaf = !node.assetsGivenUp || node.assetsGivenUp.length === 0;
  if (isLeaf && node.type !== "pick") return [node];
  if (!node.assetsGivenUp) return [];
  return node.assetsGivenUp.flatMap(collectLeaves);
}

function findLatestOriginName(tree: TreeNode): string | null {
  const leaves = collectLeaves(tree);
  if (leaves.length <= 1) return null;
  const sorted = leaves
    .filter((n) => n.date)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  return sorted[0]?.name || null;
}

/* ─── Layout ─── */
interface LayoutNode {
  id: string;
  node: TreeNode;
  depth: number;
  x: number;
  y: number;
  w: number;
  h: number;
  parentId?: string;
}

function layoutTree(tree: TreeNode, spread: number = 1.0): { nodes: LayoutNode[]; width: number; height: number } {
  const nodes: LayoutNode[] = [];
  let idCounter = 0;
  const nodeW = [220, 170, 150, 130, 120];
  const nodeH = [90, 75, 66, 60, 54];
  const gapX = [60, 45, 30, 24, 18].map(g => Math.round(g * spread));
  const gapY = [22, 16, 12, 8, 6];

  function layout(n: TreeNode, depth: number, parentId?: string): { height: number } {
    const id = `n${idCounter++}`;
    const w = nodeW[Math.min(depth, 4)];
    const h = nodeH[Math.min(depth, 4)];
    const children = n.assetsGivenUp || [];
    if (children.length === 0) {
      nodes.push({ id, node: n, depth, x: 0, y: 0, w, h, parentId });
      return { height: h };
    }
    for (const child of children) {
      layout(child, depth + 1, id);
    }
    const childGap = gapY[Math.min(depth, 4)];
    const childNodes = nodes.filter((c) => c.parentId === id);
    function subtreeH(nid: string): number {
      const nd = nodes.find((nn) => nn.id === nid)!;
      const kids = nodes.filter((c) => c.parentId === nid);
      if (kids.length === 0) return nd.h;
      const g = gapY[Math.min(nd.depth, 4)];
      return kids.reduce((s, k) => s + subtreeH(k.id), 0) + g * (kids.length - 1);
    }
    const totalChildrenH = childNodes.reduce((s, c) => s + subtreeH(c.id), 0) + childGap * (childNodes.length - 1);
    const myH = Math.max(h, totalChildrenH);
    nodes.push({ id, node: n, depth, x: 0, y: 0, w, h, parentId });
    return { height: myH };
  }

  layout(tree, 0);

  function subtreeH(nid: string): number {
    const nd = nodes.find((nn) => nn.id === nid)!;
    const kids = nodes.filter((c) => c.parentId === nid);
    if (kids.length === 0) return nd.h;
    const g = gapY[Math.min(nd.depth, 4)];
    return kids.reduce((s, k) => s + subtreeH(k.id), 0) + g * (kids.length - 1);
  }

  function position(nodeId: string, x: number, yCenter: number) {
    const n = nodes.find((nn) => nn.id === nodeId)!;
    n.x = x;
    n.y = yCenter - n.h / 2;
    const children = nodes.filter((c) => c.parentId === nodeId);
    if (children.length === 0) return;
    const childGap = gapY[Math.min(n.depth, 4)];
    const gap = gapX[Math.min(n.depth, 4)];
    const childrenH = children.map((c) => subtreeH(c.id));
    const totalH = childrenH.reduce((s, h) => s + h, 0) + childGap * (children.length - 1);
    let cy = yCenter - totalH / 2;
    for (let i = 0; i < children.length; i++) {
      position(children[i].id, x + n.w + gap, cy + childrenH[i] / 2);
      cy += childrenH[i] + childGap;
    }
  }

  const root = nodes.find((n) => !n.parentId)!;
  const rootH = subtreeH(root.id);
  position(root.id, 0, rootH / 2);

  const maxX = Math.max(...nodes.map((n) => n.x + n.w));
  const maxY = Math.max(...nodes.map((n) => n.y + n.h));
  return { nodes, width: maxX, height: maxY };
}

/* ─── Main Page ─── */
export default function SocialCardBuilder() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [playerHeader, setPlayerHeader] = useState<{ name: string; headshotUrl: string } | null>(null);

  // Layout mode
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("fullbleed");
  const [heroSplit, setHeroSplit] = useState(38); // percentage for hero side
  const [heroImageUrl, setHeroImageUrl] = useState(""); // custom hero image URL
  const [heroGradientOpacity, setHeroGradientOpacity] = useState(0.6); // gradient darkness on hero side
  // chain screenshot removed

  // Image state
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });
  const [imgScale, setImgScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

  // Card settings
  const [exportSize, setExportSize] = useState<SizeKey>("4:5");
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);
  const [chainHeight, setChainHeight] = useState(50); // percentage of card height
  const [chainSpread, setChainSpread] = useState(1.0);
  const [showHeader, setShowHeader] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [imgBrightness, setImgBrightness] = useState(0.6);

  // Custom text overlay
  const [customText, setCustomText] = useState("");
  const [customTextSize, setCustomTextSize] = useState(24);
  const [customTextColor, setCustomTextColor] = useState("#ffffff");
  const [customTextWeight, setCustomTextWeight] = useState<"400" | "600" | "700" | "800">("700");
  const [customTextAlign, setCustomTextAlign] = useState<"left" | "center" | "right">("left");
  const [showCustomText, setShowCustomText] = useState(false);

  // Draggable element positions (percentage-based for export consistency)
  const [headerPos, setHeaderPos] = useState({ x: 0, y: 0 }); // offset from default position
  const [textPos, setTextPos] = useState({ x: 28, y: 120 }); // absolute px position
  const [dragTarget, setDragTarget] = useState<"image" | "header" | "text" | null>(null);

  // Computed early so drag handlers can reference it
  const size = SIZES[exportSize];

  // LUT state
  const [lutData, setLutData] = useState<{ size: number; table: Float32Array } | null>(null);
  const [lutName, setLutName] = useState<string>("");
  const [lutIntensity, setLutIntensity] = useState(1.0);
  const [lutProcessedImage, setLutProcessedImage] = useState<string | null>(null);

  // Levels state (0-255)
  const [levelsBlack, setLevelsBlack] = useState(0);
  const [levelsWhite, setLevelsWhite] = useState(255);
  const [levelsGamma, setLevelsGamma] = useState(1.0);

  // Clarity & Dehaze
  const [clarity, setClarity] = useState(0); // -100 to 100
  const [dehaze, setDehaze] = useState(0); // -100 to 100

  // Selective Color: per-channel CMYK adjustments
  const [selectiveColorChannel, setSelectiveColorChannel] = useState<string>("reds");
  const [selectiveColor, setSelectiveColor] = useState<Record<string, { c: number; m: number; y: number; k: number }>>({
    reds: { c: 0, m: 0, y: 0, k: 0 },
    yellows: { c: 0, m: 0, y: 0, k: 0 },
    greens: { c: 0, m: 0, y: 0, k: 0 },
    cyans: { c: 0, m: 0, y: 0, k: 0 },
    blues: { c: 0, m: 0, y: 0, k: 0 },
    magentas: { c: 0, m: 0, y: 0, k: 0 },
    whites: { c: 0, m: 0, y: 0, k: 0 },
    neutrals: { c: 0, m: 0, y: 0, k: 0 },
    blacks: { c: 0, m: 0, y: 0, k: 0 },
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lutFileRef = useRef<HTMLInputElement>(null);

  // Auth (auto-authenticated when embedded in Content Studio)
  useEffect(() => {
    setAuthenticated(true);
  }, []);

  // Parse .cube LUT file
  const handleLutUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLutName(file.name.replace(/\.cube$/i, ""));
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split("\n");
      let size = 0;
      const values: number[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        if (trimmed.startsWith("TITLE")) continue;
        if (trimmed.startsWith("DOMAIN_MIN")) continue;
        if (trimmed.startsWith("DOMAIN_MAX")) continue;
        if (trimmed.startsWith("LUT_3D_SIZE")) {
          size = parseInt(trimmed.split(/\s+/)[1]);
          continue;
        }
        // Data line: R G B floats
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 3) {
          values.push(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]));
        }
      }
      if (size > 0 && values.length === size * size * size * 3) {
        setLutData({ size, table: new Float32Array(values) });
      } else {
        alert(`Invalid .cube file. Expected ${size}^3*3 = ${size * size * size * 3} values, got ${values.length}`);
      }
    };
    reader.readAsText(file);
  };

  // Check if any adjustments are active
  const hasAdjustments = useMemo(() => {
    if (lutData) return true;
    if (levelsBlack !== 0 || levelsWhite !== 255 || levelsGamma !== 1.0) return true;
    if (clarity !== 0 || dehaze !== 0) return true;
    return Object.values(selectiveColor).some(ch => ch.c !== 0 || ch.m !== 0 || ch.y !== 0 || ch.k !== 0);
  }, [lutData, levelsBlack, levelsWhite, levelsGamma, clarity, dehaze, selectiveColor]);

  // Full image processing pipeline: LUT → Levels → Clarity → Dehaze → Selective Color
  useEffect(() => {
    if (!bgImage || !hasAdjustments) {
      setLutProcessedImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      // --- Clarity (unsharp mask with large radius) ---
      if (clarity !== 0) {
        const blurCanvas = document.createElement("canvas");
        blurCanvas.width = img.width;
        blurCanvas.height = img.height;
        const blurCtx = blurCanvas.getContext("2d")!;
        blurCtx.filter = "blur(12px)";
        blurCtx.drawImage(canvas, 0, 0);
        const origData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const blurData = blurCtx.getImageData(0, 0, canvas.width, canvas.height);
        const amount = clarity / 100;
        for (let i = 0; i < origData.data.length; i += 4) {
          for (let ch = 0; ch < 3; ch++) {
            const diff = origData.data[i + ch] - blurData.data[i + ch];
            origData.data[i + ch] = Math.max(0, Math.min(255, origData.data[i + ch] + diff * amount));
          }
        }
        ctx.putImageData(origData, 0, 0);
      }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // --- LUT ---
        if (lutData) {
          const { size, table } = lutData;
          const maxIdx = size - 1;
          const rN = r / 255, gN = g / 255, bN = b / 255;
          const rIdx = rN * maxIdx, gIdx = gN * maxIdx, bIdx = bN * maxIdx;
          const r0 = Math.floor(rIdx), r1 = Math.min(r0 + 1, maxIdx);
          const g0 = Math.floor(gIdx), g1 = Math.min(g0 + 1, maxIdx);
          const b0 = Math.floor(bIdx), b1 = Math.min(b0 + 1, maxIdx);
          const rf = rIdx - r0, gf = gIdx - g0, bf = bIdx - b0;
          const idx = (bI: number, gI: number, rI: number) => (bI * size * size + gI * size + rI) * 3;
          const corners = [idx(b0,g0,r0),idx(b0,g0,r1),idx(b0,g1,r0),idx(b0,g1,r1),idx(b1,g0,r0),idx(b1,g0,r1),idx(b1,g1,r0),idx(b1,g1,r1)];
          const rgb = [r, g, b];
          for (let ch = 0; ch < 3; ch++) {
            const v00 = table[corners[0]+ch] + (table[corners[1]+ch]-table[corners[0]+ch])*rf;
            const v10 = table[corners[2]+ch] + (table[corners[3]+ch]-table[corners[2]+ch])*rf;
            const v01 = table[corners[4]+ch] + (table[corners[5]+ch]-table[corners[4]+ch])*rf;
            const v11 = table[corners[6]+ch] + (table[corners[7]+ch]-table[corners[6]+ch])*rf;
            const v0 = v00 + (v10-v00)*gf;
            const v1 = v01 + (v11-v01)*gf;
            const lutVal = v0 + (v1-v0)*bf;
            rgb[ch] = Math.round(Math.min(255, Math.max(0, (rgb[ch]/255 + (lutVal - rgb[ch]/255) * lutIntensity) * 255)));
          }
          r = rgb[0]; g = rgb[1]; b = rgb[2];
        }

        // --- Levels ---
        if (levelsBlack !== 0 || levelsWhite !== 255 || levelsGamma !== 1.0) {
          const range = Math.max(1, levelsWhite - levelsBlack);
          const applyLevels = (v: number) => {
            let n = (v - levelsBlack) / range;
            n = Math.max(0, Math.min(1, n));
            n = Math.pow(n, 1 / levelsGamma);
            return Math.round(n * 255);
          };
          r = applyLevels(r);
          g = applyLevels(g);
          b = applyLevels(b);
        }

        // --- Dehaze ---
        if (dehaze !== 0) {
          const amount = dehaze / 100;
          const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          // Dehaze: boost contrast in shadows, add saturation
          const contrast = 1 + amount * 0.5;
          const mid = 128;
          r = Math.max(0, Math.min(255, mid + (r - mid) * contrast));
          g = Math.max(0, Math.min(255, mid + (g - mid) * contrast));
          b = Math.max(0, Math.min(255, mid + (b - mid) * contrast));
          // Slight saturation boost
          const gray = r * 0.299 + g * 0.587 + b * 0.114;
          const satBoost = 1 + amount * 0.3;
          r = Math.max(0, Math.min(255, gray + (r - gray) * satBoost));
          g = Math.max(0, Math.min(255, gray + (g - gray) * satBoost));
          b = Math.max(0, Math.min(255, gray + (b - gray) * satBoost));
        }

        // --- Selective Color ---
        {
          const rN = r / 255, gN = g / 255, bN = b / 255;
          const maxC = Math.max(rN, gN, bN), minC = Math.min(rN, gN, bN);
          const lum = (maxC + minC) / 2;
          let hue = 0;
          if (maxC !== minC) {
            const d = maxC - minC;
            if (maxC === rN) hue = ((gN - bN) / d + 6) % 6;
            else if (maxC === gN) hue = (bN - rN) / d + 2;
            else hue = (rN - gN) / d + 4;
            hue *= 60;
          }

          // Determine channel weights
          const weights: Record<string, number> = {};
          const sat = maxC - minC;
          // Hue-based channels
          if (sat > 0.05) {
            weights.reds = Math.max(0, 1 - Math.min(Math.abs(hue) / 30, Math.abs(hue - 360) / 30));
            weights.yellows = Math.max(0, 1 - Math.abs(hue - 60) / 30);
            weights.greens = Math.max(0, 1 - Math.abs(hue - 120) / 30);
            weights.cyans = Math.max(0, 1 - Math.abs(hue - 180) / 30);
            weights.blues = Math.max(0, 1 - Math.abs(hue - 240) / 30);
            weights.magentas = Math.max(0, 1 - Math.abs(hue - 300) / 30);
          } else {
            weights.reds = weights.yellows = weights.greens = weights.cyans = weights.blues = weights.magentas = 0;
          }
          // Tonal channels
          weights.whites = Math.max(0, (lum - 0.67) / 0.33);
          weights.neutrals = 1 - Math.abs(lum - 0.5) * 2;
          weights.blacks = Math.max(0, (0.33 - lum) / 0.33);

          let cAdj = 0, mAdj = 0, yAdj = 0, kAdj = 0;
          for (const [ch, w] of Object.entries(weights)) {
            if (w > 0 && selectiveColor[ch]) {
              const sc = selectiveColor[ch];
              cAdj += sc.c * w; mAdj += sc.m * w; yAdj += sc.y * w; kAdj += sc.k * w;
            }
          }
          if (cAdj !== 0 || mAdj !== 0 || yAdj !== 0 || kAdj !== 0) {
            // Apply CMYK adjustments
            r = Math.max(0, Math.min(255, r - (cAdj / 100) * 255 - (kAdj / 100) * 255));
            g = Math.max(0, Math.min(255, g - (mAdj / 100) * 255 - (kAdj / 100) * 255));
            b = Math.max(0, Math.min(255, b - (yAdj / 100) * 255 - (kAdj / 100) * 255));
          }
        }

        data[i] = r; data[i + 1] = g; data[i + 2] = b;
      }
      ctx.putImageData(imageData, 0, 0);
      setLutProcessedImage(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = bgImage;
  }, [bgImage, lutData, lutIntensity, levelsBlack, levelsWhite, levelsGamma, clarity, dehaze, selectiveColor, hasAdjustments]);

  // Fetch roster
  useEffect(() => {
    if (!selectedTeam) return;
    setRoster([]);
    setSelectedSlug("");
    setPlayerData(null);
    setPlayerHeader(null);
    fetch(`/api/acquisition-tree/${selectedTeam}/team`)
      .then((r) => r.json())
      .then((data) => {
        const nodes = data.nodes || [];
        const players: RosterPlayer[] = nodes
          .filter((n: { data: { isRosterPlayer?: boolean; isTarget?: boolean } }) => n.data?.isRosterPlayer || n.data?.isTarget)
          .map((n: { data: { label: string } }) => ({
            name: n.data.label,
            slug: n.data.label.toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          }));
        const seen = new Set<string>();
        const unique = players.filter((p: RosterPlayer) => {
          if (seen.has(p.slug)) return false;
          seen.add(p.slug);
          return true;
        });
        unique.sort((a: RosterPlayer, b: RosterPlayer) => a.name.localeCompare(b.name));
        setRoster(unique);
      })
      .catch(() => setRoster([]));
  }, [selectedTeam]);

  // Fetch player data
  useEffect(() => {
    if (!selectedTeam || !selectedSlug) return;
    setPlayerData(null);
    setPlayerHeader(null);
    fetch(`/api/chain-builder/${selectedTeam}/${selectedSlug}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { if (data?.tree) setPlayerData(data); })
      .catch(() => {});
    fetch(`/api/card-builder/player/${selectedTeam.toLowerCase()}-${selectedSlug}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => {
        if (data?.playerName) {
          setPlayerHeader({ name: data.playerName, headshotUrl: data.headshotUrl || "" });
        }
      })
      .catch(() => {});
  }, [selectedTeam, selectedSlug]);

  // Image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBgImage(reader.result as string);
      setImgOffset({ x: 0, y: 0 });
      setImgScale(1);
    };
    reader.readAsDataURL(file);
  };

  // Drag to reposition (supports image, header, and text targets)
  const handleMouseDown = (e: React.MouseEvent, target: "image" | "header" | "text" = "image") => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    setDragTarget(target);
    setDragStart({ x: e.clientX, y: e.clientY });
    if (target === "image") setDragStartOffset({ ...imgOffset });
    else if (target === "header") setDragStartOffset({ ...headerPos });
    else if (target === "text") setDragStartOffset({ ...textPos });
  };
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !dragTarget) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    // Scale drag distance by preview scale factor
    const previewScale = Math.min(1, 600 / size.w);
    const sdx = dx / previewScale;
    const sdy = dy / previewScale;
    if (dragTarget === "image") {
      setImgOffset({ x: dragStartOffset.x + sdx, y: dragStartOffset.y + sdy });
    } else if (dragTarget === "header") {
      setHeaderPos({ x: dragStartOffset.x + sdx, y: dragStartOffset.y + sdy });
    } else if (dragTarget === "text") {
      setTextPos({ x: dragStartOffset.x + sdx, y: dragStartOffset.y + sdy });
    }
  }, [dragging, dragTarget, dragStart, dragStartOffset, size.w]);
  const handleMouseUp = () => { setDragging(false); setDragTarget(null); };

  // Export
  const handleExport = useCallback(async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      // Convert images to data URLs
      const imgs = cardRef.current.querySelectorAll("img");
      for (const img of Array.from(imgs)) {
        try {
          const resp = await fetch(img.src);
          const blob = await resp.blob();
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          img.src = dataUrl;
        } catch {
          // skip
        }
      }
      const opts = { pixelRatio: 2, backgroundColor: "#09090b", skipFonts: true };
      const fn = exportFormat === "jpeg" ? toJpeg : toPng;
      const data = await fn(cardRef.current, exportFormat === "jpeg" ? { ...opts, quality: 0.95 } : opts);
      const link = document.createElement("a");
      link.download = `${selectedTeam}-${selectedSlug}-social.${exportFormat === "jpeg" ? "jpg" : "png"}`;
      link.href = data;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    }
    setExporting(false);
  }, [selectedTeam, selectedSlug, exportFormat]);

  const teamColor = selectedTeam ? TEAM_COLORS[selectedTeam] : null;

  if (!authenticated) return null;

  return (
    <div className="bg-zinc-900 text-white" style={{ height: 'calc(100vh - 57px)', overflow: 'hidden' }} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div className="flex flex-col lg:flex-row gap-6 p-4" style={{ height: '100%', overflow: 'hidden' }}>
        {/* Controls panel */}
        <div className="lg:w-80 space-y-4 flex-shrink-0">
          {/* Team + Player */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Player</h3>
            <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white">
              <option value="">Select team...</option>
              {TEAM_LIST.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {roster.length > 0 && (
              <select value={selectedSlug} onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white">
                <option value="">Select player...</option>
                {roster.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
            )}
          </div>

          {/* Layout Mode */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Layout</h3>
            <div className="flex gap-1">
              {([["fullbleed", "Full Bleed"], ["split-hero", "Split Hero"]] as const).map(([mode, label]) => (
                <button key={mode} onClick={() => {
                  setLayoutMode(mode as LayoutMode);
                  if (mode === "split-hero" && exportSize !== "3:2" && exportSize !== "16:9") {
                    setExportSize("3:2");
                  }
                }}
                  className={`flex-1 px-3 py-1.5 rounded text-xs font-semibold border ${layoutMode === mode
                    ? "bg-fuchsia-600 border-fuchsia-500 text-white"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>
            {layoutMode === "split-hero" && (
              <>
                <div>
                  <label className="text-xs text-zinc-500">Hero Width ({heroSplit}%)</label>
                  <input type="range" min={25} max={50} step={1} value={heroSplit}
                    onChange={(e) => setHeroSplit(parseInt(e.target.value))}
                    className="w-full accent-fuchsia-500" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Hero Gradient ({Math.round(heroGradientOpacity * 100)}%)</label>
                  <input type="range" min={0} max={1} step={0.05} value={heroGradientOpacity}
                    onChange={(e) => setHeroGradientOpacity(parseFloat(e.target.value))}
                    className="w-full accent-fuchsia-500" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Hero Image URL (optional)</label>
                  <input type="text" value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)}
                    placeholder="Paste action shot URL..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-xs text-white" />
                  <p className="text-xs text-zinc-600 mt-1">Leave empty to use player headshot</p>
                </div>
              </>
            )}
          </div>

          {/* Background Image */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Background Image</h3>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()}
              className="w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 rounded text-sm text-white">
              {bgImage ? "Change Image" : "Upload Image"}
            </button>
            {bgImage && (
              <>
                <p className="text-xs text-zinc-500">Drag the preview to reposition</p>
                <div>
                  <label className="text-xs text-zinc-500">Zoom</label>
                  <input type="range" min={0.5} max={3} step={0.05} value={imgScale}
                    onChange={(e) => setImgScale(parseFloat(e.target.value))}
                    className="w-full accent-fuchsia-500" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Brightness</label>
                  <input type="range" min={0.2} max={1} step={0.05} value={imgBrightness}
                    onChange={(e) => setImgBrightness(parseFloat(e.target.value))}
                    className="w-full accent-fuchsia-500" />
                </div>
              </>
            )}
          </div>

          {/* Color Grading (LUT) */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Color Grading</h3>
            <input ref={lutFileRef} type="file" accept=".cube,.CUBE" onChange={handleLutUpload} className="hidden" />
            <button onClick={() => lutFileRef.current?.click()}
              className="w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 rounded text-sm text-white">
              {lutData ? `🎨 ${lutName}` : "Load .cube LUT"}
            </button>
            {lutData && (
              <>
                <div>
                  <label className="text-xs text-zinc-500">Intensity ({Math.round(lutIntensity * 100)}%)</label>
                  <input type="range" min={0} max={1} step={0.05} value={lutIntensity}
                    onChange={(e) => setLutIntensity(parseFloat(e.target.value))}
                    className="w-full accent-fuchsia-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{lutData.size}³ LUT ({lutData.size * lutData.size * lutData.size} points)</span>
                  <button onClick={() => { setLutData(null); setLutName(""); setLutProcessedImage(null); }}
                    className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
              </>
            )}
            {!lutData && (
              <p className="text-xs text-zinc-600">Upload a Photoshop .cube file for color grading</p>
            )}
          </div>

          {/* Levels */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Levels</h3>
            <div>
              <label className="text-xs text-zinc-500">Black Point ({levelsBlack})</label>
              <input type="range" min={0} max={120} step={1} value={levelsBlack}
                onChange={(e) => setLevelsBlack(parseInt(e.target.value))}
                className="w-full accent-fuchsia-500" />
            </div>
            <div>
              <label className="text-xs text-zinc-500">White Point ({levelsWhite})</label>
              <input type="range" min={135} max={255} step={1} value={levelsWhite}
                onChange={(e) => setLevelsWhite(parseInt(e.target.value))}
                className="w-full accent-fuchsia-500" />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Gamma ({levelsGamma.toFixed(2)})</label>
              <input type="range" min={0.2} max={3} step={0.05} value={levelsGamma}
                onChange={(e) => setLevelsGamma(parseFloat(e.target.value))}
                className="w-full accent-fuchsia-500" />
            </div>
            <button onClick={() => { setLevelsBlack(0); setLevelsWhite(255); setLevelsGamma(1.0); }}
              className="text-xs text-zinc-500 hover:text-zinc-300">Reset Levels</button>
          </div>

          {/* Clarity & Dehaze */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Clarity & Dehaze</h3>
            <div>
              <label className="text-xs text-zinc-500">Clarity ({clarity})</label>
              <input type="range" min={-100} max={100} step={5} value={clarity}
                onChange={(e) => setClarity(parseInt(e.target.value))}
                className="w-full accent-fuchsia-500" />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Dehaze ({dehaze})</label>
              <input type="range" min={-100} max={100} step={5} value={dehaze}
                onChange={(e) => setDehaze(parseInt(e.target.value))}
                className="w-full accent-fuchsia-500" />
            </div>
            <button onClick={() => { setClarity(0); setDehaze(0); }}
              className="text-xs text-zinc-500 hover:text-zinc-300">Reset</button>
          </div>

          {/* Selective Color */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Selective Color</h3>
            <div className="flex flex-wrap gap-1">
              {["reds", "yellows", "greens", "cyans", "blues", "magentas", "whites", "neutrals", "blacks"].map((ch) => {
                const colors: Record<string, string> = { reds: "bg-red-600", yellows: "bg-yellow-500", greens: "bg-green-600", cyans: "bg-cyan-500", blues: "bg-blue-600", magentas: "bg-fuchsia-600", whites: "bg-white", neutrals: "bg-zinc-400", blacks: "bg-zinc-900 border border-zinc-600" };
                const hasAdj = selectiveColor[ch] && (selectiveColor[ch].c !== 0 || selectiveColor[ch].m !== 0 || selectiveColor[ch].y !== 0 || selectiveColor[ch].k !== 0);
                return (
                  <button key={ch} onClick={() => setSelectiveColorChannel(ch)}
                    className={`w-7 h-7 rounded-full ${colors[ch]} ${selectiveColorChannel === ch ? "ring-2 ring-fuchsia-400 ring-offset-1 ring-offset-zinc-900" : ""} ${hasAdj ? "ring-1 ring-emerald-400" : ""}`}
                    title={ch} />
                );
              })}
            </div>
            <p className="text-xs text-zinc-500 capitalize">{selectiveColorChannel}</p>
            {["c", "m", "y", "k"].map((comp) => {
              const labels: Record<string, string> = { c: "Cyan", m: "Magenta", y: "Yellow", k: "Black" };
              const val = selectiveColor[selectiveColorChannel]?.[comp as "c"|"m"|"y"|"k"] || 0;
              return (
                <div key={comp}>
                  <label className="text-xs text-zinc-500">{labels[comp]} ({val > 0 ? "+" : ""}{val}%)</label>
                  <input type="range" min={-100} max={100} step={5} value={val}
                    onChange={(e) => setSelectiveColor(prev => ({
                      ...prev,
                      [selectiveColorChannel]: { ...prev[selectiveColorChannel], [comp]: parseInt(e.target.value) }
                    }))}
                    className="w-full accent-fuchsia-500" />
                </div>
              );
            })}
            <button onClick={() => setSelectiveColor(prev => ({
              ...prev,
              [selectiveColorChannel]: { c: 0, m: 0, y: 0, k: 0 }
            }))}
              className="text-xs text-zinc-500 hover:text-zinc-300">Reset {selectiveColorChannel}</button>
          </div>

          {/* Chain Overlay Settings */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Chain Overlay</h3>
            <div>
              <label className="text-xs text-zinc-500">Overlay Height ({chainHeight}%)</label>
              <input type="range" min={30} max={70} step={1} value={chainHeight}
                onChange={(e) => setChainHeight(parseInt(e.target.value))}
                className="w-full accent-fuchsia-500" />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Overlay Opacity ({Math.round(overlayOpacity * 100)}%)</label>
              <input type="range" min={0.5} max={1} step={0.05} value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-full accent-fuchsia-500" />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Chain Spread ({chainSpread.toFixed(1)}x)</label>
              <input type="range" min={0.3} max={3} step={0.1} value={chainSpread}
                onChange={(e) => setChainSpread(parseFloat(e.target.value))}
                className="w-full accent-fuchsia-500" />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={showHeader} onChange={(e) => setShowHeader(e.target.checked)}
                className="accent-fuchsia-500" />
              Show player header
            </label>
          </div>

          {/* Custom Text Overlay */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Text Overlay</h3>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={showCustomText} onChange={(e) => setShowCustomText(e.target.checked)}
                className="accent-fuchsia-500" />
              Show text overlay
            </label>
            {showCustomText && (
              <>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Enter custom text..."
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white resize-none"
                />
                <div>
                  <label className="text-xs text-zinc-500">Font Size ({customTextSize}px)</label>
                  <input type="range" min={12} max={64} step={1} value={customTextSize}
                    onChange={(e) => setCustomTextSize(parseInt(e.target.value))}
                    className="w-full accent-fuchsia-500" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 block mb-1">Weight</label>
                    <select value={customTextWeight} onChange={(e) => setCustomTextWeight(e.target.value as typeof customTextWeight)}
                      className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white">
                      <option value="400">Regular</option>
                      <option value="600">Semibold</option>
                      <option value="700">Bold</option>
                      <option value="800">Extra Bold</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 block mb-1">Align</label>
                    <div className="flex gap-1">
                      {(["left", "center", "right"] as const).map((a) => (
                        <button key={a} onClick={() => setCustomTextAlign(a)}
                          className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold border ${customTextAlign === a
                            ? "bg-fuchsia-600 border-fuchsia-500 text-white"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>
                          {a === "left" ? "L" : a === "center" ? "C" : "R"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Color</label>
                  <div className="flex gap-1">
                    {["#ffffff", "#a1a1aa", "#fbbf24", "#34d399", "#60a5fa", "#e879f9"].map((c) => (
                      <button key={c} onClick={() => setCustomTextColor(c)}
                        className={`w-7 h-7 rounded-full border-2 ${customTextColor === c ? "border-white" : "border-zinc-700"}`}
                        style={{ backgroundColor: c }} />
                    ))}
                    <input type="color" value={customTextColor} onChange={(e) => setCustomTextColor(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer" />
                  </div>
                </div>
                <p className="text-xs text-zinc-600">Drag the text on the preview to reposition</p>
              </>
            )}
          </div>

          {/* Positioning */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Positioning</h3>
            <p className="text-xs text-zinc-500">Drag elements on the preview to reposition them.</p>
            <div className="flex gap-2">
              <button onClick={() => { setHeaderPos({ x: 0, y: 0 }); setTextPos({ x: 28, y: 120 }); }}
                className="flex-1 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 rounded text-xs text-white">
                Reset Positions
              </button>
            </div>
          </div>

          {/* Export */}
          <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Export</h3>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Aspect Ratio</label>
              <div className="flex gap-1">
                {(Object.keys(SIZES) as SizeKey[]).map((s) => (
                  <button key={s} onClick={() => setExportSize(s)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold border ${exportSize === s
                      ? "bg-fuchsia-600 border-fuchsia-500 text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Format</label>
              <div className="flex gap-1">
                {(["png", "jpeg"] as const).map((fmt) => (
                  <button key={fmt} onClick={() => setExportFormat(fmt)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold border ${exportFormat === fmt
                      ? "bg-fuchsia-600 border-fuchsia-500 text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"}`}>
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleExport} disabled={!playerData || exporting}
              className="w-full px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-40 text-white rounded text-sm font-semibold">
              {exporting ? "Exporting..." : "Export"}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 flex justify-center">
          <div style={{ transform: `scale(${Math.min(1, 600 / size.w)})`, transformOrigin: "top center" }}>
            <div
              ref={cardRef}
              style={{
                width: size.w,
                height: size.h,
                position: "relative",
                overflow: "hidden",
                backgroundColor: "#09090b",
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                cursor: layoutMode === "fullbleed" && bgImage ? (dragging && dragTarget === "image" ? "grabbing" : "grab") : "default",
              }}
              onMouseDown={layoutMode === "fullbleed" && bgImage ? (e) => handleMouseDown(e, "image") : undefined}
            >
              {layoutMode === "split-hero" ? (
                /* ═══════════ SPLIT HERO LAYOUT ═══════════ */
                <>
                  {/* Left hero panel */}
                  <div style={{
                    position: "absolute",
                    top: 0, left: 0, bottom: 0,
                    width: `${heroSplit}%`,
                    overflow: "hidden",
                    zIndex: 1,
                  }}>
                    {/* Hero image (uploaded bg > custom URL > headshot) */}
                    {(() => {
                      const heroSrc = (bgImage ? (lutProcessedImage || bgImage) : null) || heroImageUrl || (playerHeader?.headshotUrl ? getHeadshotUrl(playerHeader.headshotUrl) : null);
                      return heroSrc ? (
                        <img
                          src={heroSrc}
                          alt=""
                          draggable={false}
                          onMouseDown={bgImage ? (e) => handleMouseDown(e, "image") : undefined}
                          style={{
                            position: "absolute",
                            width: bgImage ? `${100 * imgScale}%` : "100%",
                            height: bgImage ? `${100 * imgScale}%` : "100%",
                            objectFit: "cover",
                            objectPosition: bgImage ? undefined : "center top",
                            left: bgImage ? imgOffset.x : undefined,
                            top: bgImage ? imgOffset.y : undefined,
                            filter: `brightness(${imgBrightness})`,
                            userSelect: "none",
                            cursor: bgImage ? (dragging && dragTarget === "image" ? "grabbing" : "grab") : "default",
                          }}
                        />
                      ) : (
                        <div style={{
                          position: "absolute", inset: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "linear-gradient(135deg, #18181b 0%, #09090b 100%)",
                        }}>
                          <span style={{ color: "#3f3f46", fontSize: 12 }}>No hero image</span>
                        </div>
                      );
                    })()}

                    {/* Dark gradient overlay on hero */}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: `linear-gradient(to right, rgba(9,9,11,${heroGradientOpacity * 0.15}) 0%, rgba(9,9,11,${heroGradientOpacity * 0.5}) 70%, rgba(9,9,11,${heroGradientOpacity}) 100%), linear-gradient(to top, rgba(9,9,11,${heroGradientOpacity * 0.85}) 0%, transparent 35%)`,
                      zIndex: 1,
                    }} />

                    {/* Player info at bottom of hero */}
                    {showHeader && playerHeader && teamColor && (
                      <div style={{
                        position: "absolute",
                        bottom: 0, left: 0, right: 0,
                        padding: "24px 20px",
                        zIndex: 2,
                      }}>
                        <div style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: teamColor.primary,
                          textTransform: "uppercase",
                          letterSpacing: 2,
                          marginBottom: 4,
                          textShadow: "0 1px 6px rgba(0,0,0,0.9)",
                        }}>
                          Acquisition Chain
                        </div>
                        <div style={{
                          fontSize: Math.min(32, size.w * heroSplit / 100 * 0.08),
                          fontWeight: 800,
                          color: "#fff",
                          lineHeight: 1.1,
                          textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.6)",
                        }}>
                          {playerHeader.name}
                        </div>
                        {playerData && (
                          <div style={{
                            fontSize: 12,
                            color: "#a1a1aa",
                            marginTop: 6,
                            textShadow: "0 1px 6px rgba(0,0,0,0.9)",
                          }}>
                            {(() => {
                              const teams = new Set<string>();
                              let trades = 0;
                              function walk(node: TreeNode) {
                                if (node.tradePartner) teams.add(node.tradePartner);
                                if (node.currentTeam) teams.add(node.currentTeam);
                                const t = node.acquisitionType;
                                if (t === "trade" || t === "sign-and-trade" || t === "draft-night-trade") trades++;
                                (node.assetsGivenUp || []).forEach(walk);
                              }
                              walk(playerData.tree);
                              teams.add(playerData._meta.team);
                              return `${teams.size} teams · ${trades} trades`;
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right chain panel */}
                  <div style={{
                    position: "absolute",
                    top: 0, right: 0, bottom: 0,
                    width: `${100 - heroSplit}%`,
                    zIndex: 1,
                  }}>
                    {/* Subtle dot grid */}
                    <div style={{
                      position: "absolute", inset: 0, opacity: 0.05,
                      backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }} />

                    {/* Chain content */}
                    {playerData ? (
                      <div style={{ position: "absolute", top: 16, left: 16, right: 16, bottom: 40 }}>
                        <ChainOverlay
                          data={playerData}
                          teamColor={teamColor!}
                          width={Math.round(size.w * (100 - heroSplit) / 100) - 32}
                          height={size.h - 56}
                          spread={chainSpread}
                        />
                      </div>
                    ) : (
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        height: "100%", color: "#3f3f46", fontSize: 13,
                      }}>
                        Select a player to load chain
                      </div>
                    )}

                    {/* Footer */}
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      padding: "8px 16px",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <img src="/rosterdna-icon.png" alt="" style={{ width: 16, height: 16, borderRadius: 3, opacity: 0.7 }} />
                        <span style={{ fontSize: 10, color: "#52525b", fontWeight: 600 }}>RosterDNA</span>
                      </div>
                      <span style={{ fontSize: 10, color: "#52525b" }}>@RosterDNA</span>
                    </div>
                  </div>

                  {/* Custom text overlay (draggable) */}
                  {showCustomText && customText && (
                    <div
                      style={{
                        position: "absolute",
                        left: textPos.x,
                        top: textPos.y,
                        zIndex: 4,
                        maxWidth: size.w - 56,
                        cursor: dragging && dragTarget === "text" ? "grabbing" : "grab",
                        userSelect: "none",
                      }}
                      onMouseDown={(e) => handleMouseDown(e, "text")}
                    >
                      <div style={{
                        fontSize: customTextSize,
                        fontWeight: parseInt(customTextWeight),
                        color: customTextColor,
                        textAlign: customTextAlign,
                        lineHeight: 1.3,
                        textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.6)",
                        whiteSpace: "pre-wrap",
                        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                      }}>
                        {customText}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* ═══════════ FULL BLEED LAYOUT ═══════════ */
                <>
              {/* Background image */}
              {bgImage && (
                <div style={{
                  position: "absolute", inset: 0, zIndex: 0,
                }}>
                  <img
                    src={lutProcessedImage || bgImage}
                    alt=""
                    draggable={false}
                    style={{
                      position: "absolute",
                      width: `${100 * imgScale}%`,
                      height: `${100 * imgScale}%`,
                      objectFit: "cover",
                      left: imgOffset.x,
                      top: imgOffset.y,
                      filter: `brightness(${imgBrightness})`,
                      userSelect: "none",
                    }}
                  />
                  {/* Gradient fade into overlay */}
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${chainHeight + 15}%`,
                    background: `linear-gradient(to bottom, transparent 0%, rgba(9,9,11,${overlayOpacity * 0.8}) 30%, rgba(9,9,11,${overlayOpacity}) 50%)`,
                    zIndex: 1,
                  }} />
                </div>
              )}

              {/* No image placeholder */}
              {!bgImage && (
                <div style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0,
                  height: `${100 - chainHeight}%`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 0,
                }}>
                  <div style={{
                    position: "absolute", inset: 0, opacity: 0.06,
                    backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }} />
                  <span style={{ color: "#3f3f46", fontSize: 14 }}>Upload a background image</span>
                </div>
              )}

              {/* Player name overlay on image area (draggable) */}
              {showHeader && playerHeader && teamColor && (
                <div
                  style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0,
                    height: `${100 - chainHeight}%`,
                    zIndex: 2,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: "0 28px 20px",
                    transform: `translate(${headerPos.x}px, ${headerPos.y}px)`,
                    cursor: dragging && dragTarget === "header" ? "grabbing" : "grab",
                  }}
                  onMouseDown={(e) => handleMouseDown(e, "header")}
                >
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: teamColor.primary,
                    textTransform: "uppercase",
                    letterSpacing: 2.5,
                    marginBottom: 4,
                    textShadow: "0 1px 8px rgba(0,0,0,0.8)",
                  }}>
                    Acquisition Chain
                  </div>
                  <div style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: "#fff",
                    lineHeight: 1.1,
                    textShadow: "0 2px 16px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)",
                  }}>
                    {playerHeader.name}
                  </div>
                  {playerData && (
                    <div style={{
                      fontSize: 13,
                      color: "#a1a1aa",
                      marginTop: 4,
                      textShadow: "0 1px 6px rgba(0,0,0,0.8)",
                    }}>
                      {(() => {
                        const teams = new Set<string>();
                        let trades = 0;
                        function walk(node: TreeNode) {
                          if (node.tradePartner) teams.add(node.tradePartner);
                          if (node.currentTeam) teams.add(node.currentTeam);
                          const t = node.acquisitionType;
                          if (t === "trade" || t === "sign-and-trade" || t === "draft-night-trade") trades++;
                          (node.assetsGivenUp || []).forEach(walk);
                        }
                        walk(playerData.tree);
                        teams.add(playerData._meta.team);
                        return `${teams.size} teams · ${trades} trades`;
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Custom text overlay (draggable) */}
              {showCustomText && customText && (
                <div
                  style={{
                    position: "absolute",
                    left: textPos.x,
                    top: textPos.y,
                    zIndex: 4,
                    maxWidth: size.w - 56,
                    cursor: dragging && dragTarget === "text" ? "grabbing" : "grab",
                    userSelect: "none",
                  }}
                  onMouseDown={(e) => handleMouseDown(e, "text")}
                >
                  <div style={{
                    fontSize: customTextSize,
                    fontWeight: parseInt(customTextWeight),
                    color: customTextColor,
                    textAlign: customTextAlign,
                    lineHeight: 1.3,
                    textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.6)",
                    whiteSpace: "pre-wrap",
                    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                  }}>
                    {customText}
                  </div>
                </div>
              )}

              {/* Chain overlay container */}
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: `${chainHeight}%`,
                zIndex: 3,
              }}>
                {/* Dot grid inside overlay */}
                <div style={{
                  position: "absolute", inset: 0, opacity: 0.08,
                  backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }} />

                {/* Chain content */}
                {playerData ? (
                  <ChainOverlay
                    data={playerData}
                    teamColor={teamColor!}
                    width={size.w}
                    height={Math.round(size.h * chainHeight / 100)}
                    spread={chainSpread}
                  />
                ) : (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    height: "100%", color: "#3f3f46", fontSize: 13,
                  }}>
                    Select a player to load chain
                  </div>
                )}

                {/* Footer inside overlay */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  padding: "8px 24px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img src="/rosterdna-icon.png" alt="" style={{ width: 20, height: 20, borderRadius: 4, opacity: 0.7 }} />
                    <span style={{ fontSize: 11, color: "#52525b", fontWeight: 600 }}>RosterDNA</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#52525b" }}>@RosterDNA</span>
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Chain Overlay Component ─── */
function ChainOverlay({ data, teamColor, width, height, spread = 1.0 }: {
  data: PlayerData;
  teamColor: { primary: string; secondary: string };
  width: number;
  height: number;
  spread?: number;
}) {
  const { tree } = data;
  const originName = useMemo(() => findLatestOriginName(tree), [tree]);
  const treeRef = useRef<HTMLDivElement>(null);
  const [treeScale, setTreeScale] = useState(1);
  const [treeOffset, setTreeOffset] = useState({ x: 0, y: 0 });

  const pad = 24;
  const footerH = 36;
  const availW = width - pad * 2;
  const availH = height - footerH - 16;

  useEffect(() => {
    const el = treeRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      const naturalW = el.scrollWidth;
      const naturalH = el.scrollHeight;
      if (naturalW === 0 || naturalH === 0) return;
      const scaleX = availW / naturalW;
      const scaleY = availH / naturalH;
      const s = Math.min(scaleX, scaleY, 2.5);
      setTreeScale(s);
      setTreeOffset({
        x: (availW - naturalW * s) / 2,
        y: (availH - naturalH * s) / 2,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [data, availW, availH]);

  return (
    <div style={{
      position: "relative", width: availW, height: availH,
      marginLeft: pad, marginRight: pad, marginTop: 8,
      overflow: "hidden",
    }}>
      <div ref={treeRef} style={{
        position: "absolute",
        left: treeOffset.x,
        top: treeOffset.y,
        transform: `scale(${treeScale})`,
        transformOrigin: "top left",
      }}>
        <TreeRenderer tree={tree} originName={originName} spread={spread} />
      </div>
    </div>
  );
}

/* ─── Tree Renderer (horizontal L→R) ─── */
function TreeRenderer({ tree, originName, spread = 1.0 }: { tree: TreeNode; originName?: string | null; spread?: number }) {
  const { nodes, width, height } = useMemo(() => layoutTree(tree, spread), [tree, spread]);

  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const edges: { x1: number; y1: number; x2: number; y2: number; color: string; isRoot: boolean }[] = [];
  for (const n of nodes) {
    if (!n.parentId) continue;
    const parent = nodeById.get(n.parentId);
    if (parent) {
      edges.push({
        x1: parent.x + parent.w,
        y1: parent.y + parent.h / 2,
        x2: n.x,
        y2: n.y + n.h / 2,
        color: parent.depth === 0 ? "#10b981" : "#3b82f6",
        isRoot: parent.depth === 0,
      });
    }
  }

  return (
    <div style={{ position: "relative", width, height }}>
      <svg style={{ position: "absolute", top: 0, left: 0, width, height, overflow: "visible", zIndex: 0 }}>
        <defs>
          <filter id="sc-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {edges.map((e, i) => {
          const dx = e.x2 - e.x1;
          const cpx = dx * 0.5;
          const d = `M ${e.x1},${e.y1} C ${e.x1 + cpx},${e.y1} ${e.x2 - cpx},${e.y2} ${e.x2},${e.y2}`;
          return (
            <g key={i}>
              <path d={d} stroke={e.color} strokeWidth={e.isRoot ? 2.5 : 1.5} fill="none" opacity={0.5} filter="url(#sc-glow)" />
              <path d={d} stroke={e.color} strokeWidth={e.isRoot ? 2 : 1.2} fill="none" opacity={0.85} />
              <circle cx={e.x1} cy={e.y1} r={e.isRoot ? 4 : 3} fill={e.color} filter="url(#sc-glow)" />
              <circle cx={e.x2} cy={e.y2} r={e.isRoot ? 4 : 3} fill={e.color} filter="url(#sc-glow)" />
            </g>
          );
        })}
      </svg>
      {nodes.map((n) => (
        <div key={n.id} style={{ position: "absolute", left: n.x, top: n.y, zIndex: 1 }}>
          <MiniNode node={n.node} depth={n.depth} w={n.w} h={n.h} originName={originName} />
        </div>
      ))}
    </div>
  );
}

/* ─── Mini Node Box ─── */
function MiniNode({ node, depth, w, h, originName }: { node: TreeNode; depth: number; w: number; h: number; originName?: string | null }) {
  const isLeaf = !node.assetsGivenUp || node.assetsGivenUp.length === 0;
  const isRoot = depth === 0;
  const isOrigin = isLeaf && node.type !== "pick" && (!originName || node.name === originName);
  const style = getNodeStyle(node, isOrigin);

  const rootBg = "#064e3b";
  const rootBorder = "#10b981";
  const originBg = "#451a03";
  const originBorder = "#f59e0b";

  const bgColor = isRoot ? rootBg : isOrigin ? originBg : style.bg;
  const borderColor = isRoot ? rootBorder : isOrigin ? originBorder : style.border;
  const labelColor = isRoot ? "#34d399" : isOrigin ? "#fbbf24" : style.labelColor;

  const sizes = isRoot
    ? { nameSize: 15, labelSize: 8, subSize: 9, pad: "8px 12px" }
    : depth === 1
    ? { nameSize: 12, labelSize: 7, subSize: 8, pad: "6px 10px" }
    : { nameSize: 10, labelSize: 6, subSize: 7, pad: "5px 8px" };

  return (
    <div style={{
      backgroundColor: bgColor,
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 8,
      padding: sizes.pad,
      width: w,
      minHeight: h,
      boxSizing: "border-box",
      boxShadow: `0 2px 8px rgba(0,0,0,0.6), 0 0 ${isRoot ? "16px" : "8px"} ${borderColor}20`,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      overflow: "hidden",
    }}>
      <div style={{ fontSize: sizes.labelSize, fontWeight: 700, color: labelColor, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {isRoot ? "STARTER" : node.type === "pick" ? "PICK" : isOrigin ? "ORIGIN" : "PLAYER"}
      </div>
      <div style={{ fontSize: sizes.nameSize, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
        {node.name}
      </div>
      {node.tradePartner && (
        <div style={{ fontSize: sizes.subSize, color: isRoot ? "#a7f3d0" : isOrigin ? "#fde68a" : "#a1a1aa" }}>via {node.tradePartner}</div>
      )}
      <div style={{ fontSize: sizes.labelSize, fontWeight: 600, color: labelColor }}>{getAcqLabel(node)}</div>
      {node.date && (
        <div style={{ fontSize: Math.max(sizes.labelSize - 1, 6), color: "#71717a" }}>{formatDate(node.date)}</div>
      )}
      {node.becamePlayer && (
        <div style={{ fontSize: Math.max(sizes.labelSize - 1, 6), color: "#a1a1aa" }}>→ {node.becamePlayer}</div>
      )}
    </div>
  );
}
