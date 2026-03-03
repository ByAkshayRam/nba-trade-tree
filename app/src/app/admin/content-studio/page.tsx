"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
const ChartBuilder = dynamic(() => import("./ChartBuilder"), { ssr: false });
const CardBuilder = dynamic(() => import("./CardBuilder"), { ssr: false });
const SocialCardBuilder = dynamic(() => import("./SocialCardBuilder"), { ssr: false });

// ─── Types ───
interface NodeVersion {
  text: string;
  savedAt: string;
}

interface CoherenceRec {
  nodeId: string;
  original: string;
  suggested: string;
  reason: string;
  status: "pending" | "accepted" | "declined";
}

interface ThreadNode {
  id: string;
  position: number;
  text: string;
  mediaUrl: string;
  notes: string;
  status: "ideas" | "researching" | "draft" | "ready" | "posted";
  isVariation: boolean;
  parentId: string | null;
  history?: NodeVersion[];
}

interface Thread {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
  status: "ideas" | "researching" | "draft" | "ready" | "posted";
  taskId?: string;
  contentId?: string;
  nodes: ThreadNode[];
}

// ─── Constants ───
const ADMIN_PASSWORD = "rosterdna-admin-2026";
const LS_KEY = "rdna-content-studio";

function newId() {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function newThread(): Thread {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : newId(),
    title: "Untitled Thread",
    prompt: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "draft",
    nodes: [],
  };
}

function charColor(len: number): string {
  if (len <= 240) return "#22c55e";
  if (len <= 270) return "#eab308";
  return "#ef4444";
}

type TweetStatus = "ideas" | "researching" | "draft" | "ready" | "posted";
const STATUSES: { key: TweetStatus; label: string; icon: string; color: string }[] = [
  { key: "ideas", label: "Ideas", icon: "💡", color: "#eab308" },
  { key: "researching", label: "Researching", icon: "🎯", color: "#a78bfa" },
  { key: "draft", label: "Draft", icon: "📄", color: "#6b7280" },
  { key: "ready", label: "Ready to Post", icon: "✏️", color: "#22c55e" },
  { key: "posted", label: "Posted", icon: "🚩", color: "#ef4444" },
];
function statusColor(s: string): string {
  return STATUSES.find(st => st.key === s)?.color ?? "#6b7280";
}
function statusLabel(s: string): string {
  const st = STATUSES.find(st => st.key === s);
  return st ? `${st.icon} ${st.label}` : s;
}

// ─── Main Page ───
export default function ContentStudioPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("rdna_admin") === "1") setAuthenticated(true);
    else if (typeof window !== "undefined" && window.location.hostname.startsWith("100.")) {
      sessionStorage.setItem("rdna_admin", "1");
      setAuthenticated(true);
    }
  }, []);

  // refreshList defined after state declarations below

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 w-80">
          <h1 className="text-white text-xl font-bold mb-2">Content Studio</h1>
          <p className="text-zinc-500 text-sm mb-4">Enter admin password</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && password === ADMIN_PASSWORD) {
                sessionStorage.setItem("rdna_admin", "1");
                setAuthenticated(true);
              }
            }}
            className="w-full p-2 rounded bg-zinc-800 text-white border border-zinc-700 mb-3"
            placeholder="Password"
          />
          <button
            onClick={() => {
              if (password === ADMIN_PASSWORD) {
                sessionStorage.setItem("rdna_admin", "1");
                setAuthenticated(true);
              }
            }}
            className="w-full py-2 rounded bg-fuchsia-600 text-white font-medium hover:bg-fuchsia-500"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return <Studio />;
}

// ─── Studio (no React Flow - card-based layout) ───
function Studio() {
  const [studioTab, setStudioTab] = useState<"threads" | "charts" | "cards" | "social">("threads");
  const [thread, setThread] = useState<Thread>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) try {
        const parsed = JSON.parse(saved);
        // Ensure nodes have history field
        if (parsed.nodes) {
          parsed.nodes = parsed.nodes.map((n: ThreadNode) => ({ ...n, history: n.history || [] }));
        }
        return parsed;
      } catch {
        localStorage.removeItem(LS_KEY);
      }
    }
    return newThread();
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [savedList, setSavedList] = useState<{ id: string; title: string; filename: string; updatedAt: string; status?: string }[]>([]);
  
  // Load thread list on mount
  const refreshList = useCallback(async () => {
    try {
      const res = await fetch("/api/content-studio");
      const data = await res.json();
      setSavedList(Array.isArray(data) ? data : []);
    } catch {}
  }, []);
  useEffect(() => { refreshList(); }, [refreshList]);
  const [prompt, setPrompt] = useState(thread.prompt);
  const [dragId, setDragId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("");
  const [genRequestId, setGenRequestId] = useState<string | null>(null);
  const [coherenceRecs, setCoherenceRecs] = useState<CoherenceRec[]>([]);
  const [coherenceLoading, setCoherenceLoading] = useState(false);
  const [coherenceRequestId, setCoherenceRequestId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null); // nodeId

  // Auto-save
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(thread));
  }, [thread]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 2000); return () => clearTimeout(t); }
  }, [toast]);

  // Poll for coherence check result (timeout after 30s)
  useEffect(() => {
    if (!coherenceRequestId) return;
    const startTime = Date.now();
    const interval = setInterval(async () => {
      if (Date.now() - startTime > 90000) {
        setCoherenceLoading(false);
        setCoherenceRequestId(null);
        setToast("⏱ Flow check timed out — saved successfully though!");
        clearInterval(interval);
        return;
      }
      try {
        const res = await fetch(`/api/content-studio/generate?requestId=${coherenceRequestId}`);
        const data = await res.json();
        if (data.status === "done" && data.thread) {
          const recs: CoherenceRec[] = (data.thread.nodes || []).map((n: { id: string; text: string; notes: string; mediaUrl: string }) => ({
            nodeId: n.id,
            original: n.notes || "",
            suggested: n.text || "",
            reason: n.mediaUrl || "",
            status: "pending" as const,
          }));
          setCoherenceRecs(recs);
          setCoherenceLoading(false);
          setCoherenceRequestId(null);
          clearInterval(interval);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [coherenceRequestId]);

  // Poll for generation result
  useEffect(() => {
    if (!genRequestId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/content-studio/generate?requestId=${genRequestId}`);
        const data = await res.json();
        if (data.status === "done" && data.thread) {
          setThread(data.thread);
          setPrompt(data.thread.prompt || "");
          setGenerating(false);
          setGenStatus("");
          setGenRequestId(null);
          setToast("✅ Thread generated!");
          clearInterval(interval);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [genRequestId]);

  // Activity logging (fire-and-forget, no deps to avoid circular refs)
  const logActivity = useCallback((action: string, details?: Record<string, unknown>) => {
    try {
      const t = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      fetch("/api/content-studio/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, threadId: t.id || "", threadTitle: t.title || "", ...details }),
      }).catch(() => {});
    } catch {}
  }, []);

  const updateThread = useCallback((fn: (t: Thread) => Thread) => {
    setThread((prev) => fn({ ...prev, updatedAt: new Date().toISOString() }));
  }, []);

  const mainNodes = useMemo(() => thread.nodes.filter((n) => !n.isVariation).sort((a, b) => a.position - b.position), [thread.nodes]);
  const editingNode = thread.nodes.find((n) => n.id === editingId);

  // ─── Actions ───
  const addNode = useCallback(() => {
    const maxPos = Math.max(0, ...thread.nodes.filter((n) => !n.isVariation).map((n) => n.position));
    const n: ThreadNode = {
      id: newId(),
      position: maxPos + 1,
      text: "",
      mediaUrl: "",
      notes: "",
      status: "draft",
      isVariation: false,
      parentId: null,
    };
    updateThread((t) => ({ ...t, nodes: [...t.nodes, n] }));
    setEditingId(n.id);
    logActivity("add_node", { position: n.position });
  }, [thread.nodes, updateThread, logActivity]);

  const deleteNode = useCallback((id: string) => {
    updateThread((t) => {
      const filtered = t.nodes.filter((n) => n.id !== id && n.parentId !== id);
      let pos = 1;
      return { ...t, nodes: filtered.map((n) => n.isVariation ? n : { ...n, position: pos++ }) };
    });
    if (editingId === id) setEditingId(null);
    logActivity("delete_node", { nodeId: id });
  }, [editingId, updateThread, logActivity]);

  const explodeNode = useCallback((id: string) => {
    const source = thread.nodes.find((n) => n.id === id);
    if (!source) return;
    const variations: ThreadNode[] = [1, 2, 3].map((i) => ({
      id: newId() + `-v${i}`,
      position: source.position,
      text: `[Variation ${i}] ${source.text}`,
      mediaUrl: "",
      notes: "",
      status: "draft" as const,
      isVariation: true,
      parentId: id,
    }));
    updateThread((t) => ({ ...t, nodes: [...t.nodes, ...variations] }));
    logActivity("explode_node", { nodeId: id, sourceText: source.text.slice(0, 50) });
  }, [thread.nodes, updateThread, logActivity]);

  const acceptVariation = useCallback((varId: string) => {
    const variation = thread.nodes.find((n) => n.id === varId);
    if (!variation || !variation.parentId) return;
    const parentId = variation.parentId;
    updateThread((t) => ({
      ...t,
      nodes: t.nodes
        .filter((n) => !(n.isVariation && n.parentId === parentId))
        .map((n) => n.id === parentId ? { ...n, text: variation.text.replace(/^\[Variation \d\] /, "") } : n),
    }));
    logActivity("accept_variation", { varId, parentId });
  }, [thread.nodes, updateThread, logActivity]);

  // Save node and trigger coherence check
  const saveNodeAndCheck = useCallback(async (id: string) => {
    const node = thread.nodes.find(n => n.id === id);
    if (!node || node.isVariation) return;

    // Save current text to history
    updateThread((t) => ({
      ...t,
      nodes: t.nodes.map((n) => n.id === id ? {
        ...n,
        history: [...(n.history || []), { text: n.text, savedAt: new Date().toISOString() }],
      } : n),
    }));
    logActivity("save_node", { nodeId: id, position: node.position });

    // Get subsequent nodes for coherence check
    const subsequentNodes = thread.nodes
      .filter(n => !n.isVariation && n.position > node.position)
      .sort((a, b) => a.position - b.position);

    if (subsequentNodes.length === 0) {
      setToast("✅ Saved!");
      return;
    }

    // Send coherence check request
    setCoherenceLoading(true);
    setCoherenceRecs([]);
    try {
      const res = await fetch("/api/content-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `COHERENCE CHECK — Do NOT generate a new thread. Analyze the following thread for tone/style/flow consistency after Tweet #${node.position} was edited.

EDITED TWEET #${node.position}:
"${node.text}"

SUBSEQUENT TWEETS THAT MAY NEED ADJUSTMENT:
${subsequentNodes.map(n => `#${n.position}: "${n.text}"`).join("\n")}

For each subsequent tweet that needs changes to maintain flow, return a node with:
- id: the original node id (${subsequentNodes.map(n => n.id).join(", ")})
- text: the SUGGESTED new text
- notes: the ORIGINAL text (so we can show the diff)
- mediaUrl: brief reason for the change

Only include nodes that actually need changes. If everything flows well, return an empty nodes array.
Return as a valid thread JSON with title "coherence-check" and the nodes array.`,
          threadId: thread.id,
          threadTitle: "coherence-check",
        }),
      });
      const data = await res.json();
      if (data.requestId) {
        setCoherenceRequestId(data.requestId);
        setToast("✅ Saved! Checking thread flow...");
      }
    } catch {
      setToast("✅ Saved (coherence check failed)");
      setCoherenceLoading(false);
    }
  }, [thread, updateThread, logActivity]);

  // Accept a coherence recommendation
  const acceptRec = useCallback((rec: CoherenceRec) => {
    // Save old text to history first
    updateThread((t) => ({
      ...t,
      nodes: t.nodes.map((n) => n.id === rec.nodeId ? {
        ...n,
        text: rec.suggested,
        history: [...(n.history || []), { text: n.text, savedAt: new Date().toISOString() }],
      } : n),
    }));
    setCoherenceRecs(prev => prev.map(r => r.nodeId === rec.nodeId ? { ...r, status: "accepted" } : r));
    logActivity("accept_coherence_rec", { nodeId: rec.nodeId, reason: rec.reason });
  }, [updateThread, logActivity]);

  // Decline a coherence recommendation
  const declineRec = useCallback((nodeId: string) => {
    setCoherenceRecs(prev => prev.map(r => r.nodeId === nodeId ? { ...r, status: "declined" } : r));
    logActivity("decline_coherence_rec", { nodeId });
  }, [logActivity]);

  // Restore a previous version
  const restoreVersion = useCallback((nodeId: string, version: NodeVersion) => {
    updateThread((t) => ({
      ...t,
      nodes: t.nodes.map((n) => n.id === nodeId ? {
        ...n,
        text: version.text,
        history: [...(n.history || []), { text: n.text, savedAt: new Date().toISOString() }],
      } : n),
    }));
    setShowHistory(null);
    logActivity("restore_version", { nodeId });
  }, [updateThread, logActivity]);

  const updateNode = useCallback((id: string, updates: Partial<ThreadNode>) => {
    updateThread((t) => ({
      ...t,
      nodes: t.nodes.map((n) => n.id === id ? { ...n, ...updates } : n),
    }));
    // Log status changes and significant edits
    if (updates.status) logActivity("change_status", { nodeId: id, newStatus: updates.status });
    if (updates.text !== undefined) logActivity("edit_text", { nodeId: id, charCount: updates.text.length, preview: updates.text.slice(0, 50) });
  }, [updateThread, logActivity]);

  const moveNode = useCallback((fromPos: number, toPos: number) => {
    if (fromPos === toPos) return;
    updateThread((t) => {
      const nodes = [...t.nodes];
      const mainSorted = nodes.filter(n => !n.isVariation).sort((a, b) => a.position - b.position);
      const fromIdx = mainSorted.findIndex(n => n.position === fromPos);
      const toIdx = mainSorted.findIndex(n => n.position === toPos);
      if (fromIdx === -1 || toIdx === -1) return t;
      const [moved] = mainSorted.splice(fromIdx, 1);
      mainSorted.splice(toIdx, 0, moved);
      mainSorted.forEach((n, i) => n.position = i + 1);
      return { ...t, nodes };
    });
  }, [updateThread]);

  // ─── Save / Load ───
  const saveThread = useCallback(async () => {
    try {
      let updatedThread = { ...thread };
      
      // Auto-create Mission Control task if not linked yet
      if (!updatedThread.taskId && updatedThread.title && updatedThread.title !== "Untitled Thread") {
        try {
          const tweetCount = updatedThread.nodes.filter(n => !n.isVariation).length;
          const taskRes = await fetch("http://100.100.180.42:3333/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: `📝 ${updatedThread.title}`,
              description: `Content thread: ${tweetCount} tweets. Status: ${updatedThread.status}. Content Studio thread ID: ${updatedThread.id}`,
              status: updatedThread.status === "posted" ? "done" : "in-progress",
              priority: "high",
              source: "content-studio",
              tags: "content,rosterdna,thread",
            }),
          });
          const taskData = await taskRes.json();
          if (taskData.id) {
            updatedThread.taskId = taskData.id;
            setThread(updatedThread);
          }
        } catch (e) { console.error("Task creation failed:", e); }
      } else if (updatedThread.taskId) {
        // Update existing task status
        try {
          await fetch(`http://100.100.180.42:3333/api/tasks/${updatedThread.taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: updatedThread.status === "posted" ? "done" : "in-progress",
              description: `Content thread: ${updatedThread.nodes.filter(n => !n.isVariation).length} tweets. Status: ${updatedThread.status}. Content Studio thread ID: ${updatedThread.id}`,
            }),
          });
        } catch (e) { console.error("Task update failed:", e); }
      }
      
      // Sync status to Mission Control Content Lab
      const contentLabStatus = updatedThread.status === "ideas" ? "idea" : updatedThread.status;
      try {
        if (!updatedThread.contentId) {
          // Create content entry
          const contentRes = await fetch("http://100.100.180.42:3333/api/rosterdna", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              table: "content",
              title: updatedThread.title,
              status: contentLabStatus,
              series: "thread",
              platform: "twitter",
              notes: `Content Studio thread: ${updatedThread.id}`,
            }),
          });
          const contentData = await contentRes.json();
          if (contentData.id) {
            updatedThread.contentId = contentData.id;
            setThread(updatedThread);
          }
        } else {
          // Update existing content entry status
          await fetch("http://100.100.180.42:3333/api/rosterdna", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              table: "content",
              id: updatedThread.contentId,
              status: contentLabStatus,
              title: updatedThread.title,
            }),
          });
        }
      } catch (e) { console.error("Content Lab sync failed:", e); }

      await fetch("/api/content-studio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedThread) });
      setToast("✅ Saved!");
      logActivity("save_thread", { nodeCount: updatedThread.nodes.filter(n => !n.isVariation).length });
      refreshList();
    } catch { setToast("❌ Save failed"); }
  }, [thread, logActivity]);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/content-studio");
      const data = await res.json();
      setSavedList(Array.isArray(data) ? data : []);
      setShowLoadModal(true);
    } catch { setToast("❌ Load failed"); }
  }, []);

  const loadThread = useCallback(async (filename: string) => {
    try {
      const res = await fetch(`/api/content-studio?file=${encodeURIComponent(filename)}`);
      const data = await res.json();
      if (data && data.nodes) {
        setThread(data);
        setPrompt(data.prompt || "");
        setEditingId(null);
        setShowLoadModal(false);
        setToast("✅ Loaded!");
      }
    } catch { setToast("❌ Load failed"); }
  }, []);

  const copyThread = useCallback(() => {
    const text = mainNodes.map((n, i) => `${i + 1}/ ${n.text}`).join("\n\n");
    navigator.clipboard.writeText(text);
    setToast("📋 Copied!");
    logActivity("copy_thread", { tweetCount: mainNodes.length });
  }, [mainNodes, logActivity]);

  const setAllStatus = useCallback((status: ThreadNode["status"]) => {
    updateThread((t) => ({
      ...t,
      nodes: t.nodes.map((n) => n.isVariation ? n : { ...n, status }),
    }));
  }, [updateThread]);

  // ─── Drag handlers ───
  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = thread.nodes.find(n => n.id === dragId);
    const to = thread.nodes.find(n => n.id === targetId);
    if (from && to && !from.isVariation && !to.isVariation) {
      moveNode(from.position, to.position);
    }
    setDragId(null);
  };

  // ─── Thread Preview ───
  if (showPreview) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold">Thread Preview — {thread.title}</h1>
            <div className="flex gap-2">
              <button onClick={copyThread} className="px-3 py-1.5 rounded bg-blue-600 text-sm hover:bg-blue-500">Copy Thread</button>
              <button onClick={() => setShowPreview(false)} className="px-3 py-1.5 rounded bg-zinc-700 text-sm hover:bg-zinc-600">Back</button>
            </div>
          </div>
          <div className="space-y-1">
            {mainNodes.map((n, i) => (
              <div key={n.id}>
                {i > 0 && <div className="w-px h-4 bg-zinc-700 ml-6" />}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {i + 1}
                    </div>
                  </div>
                  <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-1">
                    <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">{n.text || "(empty)"}</p>
                    {n.mediaUrl && <div className="mt-2 text-xs text-zinc-500">📎 {n.mediaUrl}</div>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-mono" style={{ color: charColor(n.text.length) }}>{n.text.length}/280</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: statusColor(n.status) + "30", color: statusColor(n.status) }}>{statusLabel(n.status)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Main View ───
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-zinc-800 border border-zinc-700 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Left Sidebar */}
      <div className={`fixed top-0 left-0 h-full bg-zinc-900 border-r border-zinc-800 z-50 transition-all duration-200 ${showSidebar && studioTab === "threads" ? "w-64" : "w-0 overflow-hidden"}`} style={{ display: studioTab !== "threads" ? "none" : undefined }}>
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-300">📁 Threads</h2>
          <div className="flex gap-1">
            <button onClick={() => { setThread(newThread()); setEditingId(null); setPrompt(""); }} className="text-[10px] px-2 py-1 rounded bg-fuchsia-900/50 text-fuchsia-300 hover:bg-fuchsia-800/50">+ New</button>
            <button onClick={() => setShowSidebar(false)} className="text-zinc-500 hover:text-zinc-300 text-sm px-1">✕</button>
          </div>
        </div>
        <div className="overflow-y-auto h-[calc(100%-49px)]">
          {savedList.length === 0 ? (
            <p className="text-zinc-600 text-xs p-3">No threads yet</p>
          ) : (
            savedList.map((s) => (
              <button
                key={s.id}
                onClick={() => loadThread(s.filename)}
                className={`w-full text-left px-3 py-2.5 border-b border-zinc-800/50 hover:bg-zinc-800 transition-colors ${thread.id === s.id ? "bg-zinc-800 border-l-2 border-l-fuchsia-500" : ""}`}
              >
                <div className="text-sm text-zinc-200 truncate">{s.title || "Untitled"}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: statusColor(s.status || "draft") + "30", color: statusColor(s.status || "draft") }}>
                    {s.status || "draft"}
                  </span>
                  <span className="text-[10px] text-zinc-600">{new Date(s.updatedAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Header */}
      <div className={`border-b border-zinc-800 px-4 py-3 flex items-center justify-between gap-4 sticky top-0 bg-zinc-950 z-40 transition-all ${showSidebar ? "ml-64" : "ml-0"}`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {!showSidebar && (
            <button onClick={() => setShowSidebar(true)} className="text-zinc-400 hover:text-white text-lg mr-1">☰</button>
          )}
          <h1 className="text-lg font-bold bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
            Content Studio
          </h1>
          <div className="flex bg-zinc-800 rounded-md p-0.5">
            <button onClick={() => setStudioTab("threads")} className={`px-3 py-1 rounded text-xs font-medium transition ${studioTab === "threads" ? "bg-fuchsia-600 text-white" : "text-zinc-400 hover:text-white"}`}>✏️ Threads</button>
            <button onClick={() => setStudioTab("charts")} className={`px-3 py-1 rounded text-xs font-medium transition ${studioTab === "charts" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"}`}>📊 Charts</button>
            <button onClick={() => setStudioTab("cards")} className={`px-3 py-1 rounded text-xs font-medium transition ${studioTab === "cards" ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white"}`}>🎨 Cards</button>
            <button onClick={() => setStudioTab("social")} className={`px-3 py-1 rounded text-xs font-medium transition ${studioTab === "social" ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-white"}`}>📸 Social</button>
          </div>
          {studioTab === "threads" && <input
            value={thread.title}
            onChange={(e) => updateThread((t) => ({ ...t, title: e.target.value }))}
            className="bg-zinc-800 text-white text-sm px-2 py-1 rounded border border-zinc-700 w-full max-w-sm"
            placeholder="Thread title"
          />}
          {studioTab === "threads" && <>
            {thread.taskId ? (
              <a href={`http://100.100.180.42:3333/tasks`} target="_blank" rel="noopener" className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 border border-green-800/50 hover:bg-green-900/60">
                ✅ Task
              </a>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                No task — save to link
              </span>
            )}
            {thread.contentId ? (
              <a href={`http://100.100.180.42:3333/rosterdna`} target="_blank" rel="noopener" className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-900/40 text-fuchsia-400 border border-fuchsia-800/50 hover:bg-fuchsia-900/60">
                📋 Content Lab
              </a>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                No content — save to link
              </span>
            )}
          </>}
        </div>
        {studioTab === "threads" && (
          <div className="flex items-center gap-2">
            <button onClick={addNode} className="px-3 py-1.5 rounded bg-zinc-700 text-sm hover:bg-zinc-600">+ Tweet</button>
            <button onClick={() => setShowPreview(true)} className="px-3 py-1.5 rounded bg-zinc-700 text-sm hover:bg-zinc-600">Preview</button>
            <button onClick={copyThread} className="px-3 py-1.5 rounded bg-zinc-700 text-sm hover:bg-zinc-600">Copy</button>
            <button onClick={saveThread} className="px-3 py-1.5 rounded bg-green-700 text-sm hover:bg-green-600">Save</button>
            <button onClick={() => { setThread(newThread()); setEditingId(null); setPrompt(""); }} className="px-3 py-1.5 rounded bg-zinc-800 text-sm text-zinc-400 hover:bg-zinc-700">New</button>
          </div>
        )}
      </div>

      {studioTab === "charts" && <ChartBuilder />}
      {studioTab === "cards" && <CardBuilder />}
      {studioTab === "social" && <SocialCardBuilder />}

      {/* Prompt Bar */}
      {studioTab === "threads" && <div className={`border-b border-zinc-800 px-4 py-2 flex gap-2 sticky top-[57px] bg-zinc-950 z-30 transition-all ${showSidebar ? "ml-64" : "ml-0"}`}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1 bg-zinc-900 text-white text-sm px-3 py-2 rounded border border-zinc-700"
          placeholder="Describe your content idea..."
        />
        <button
          disabled={generating}
          onClick={async () => {
            updateThread((t) => ({ ...t, prompt }));
            if (!prompt.trim()) { setToast("⚠️ Enter a prompt first"); return; }
            setGenerating(true);
            setGenStatus("Sending to Edward...");
            try {
              const res = await fetch("/api/content-studio/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, threadId: thread.id, threadTitle: thread.title }),
              });
              const data = await res.json();
              if (data.requestId) {
                setGenRequestId(data.requestId);
                setGenStatus("⏳ Edward is writing your thread...");
              }
            } catch { setToast("❌ Failed to send"); setGenerating(false); }
          }}
          className={`px-4 py-2 rounded text-sm font-medium ${generating ? "bg-fuchsia-800 text-fuchsia-300 cursor-wait" : "bg-fuchsia-600 hover:bg-fuchsia-500 text-white"}`}
        >
          {generating ? "Generating..." : "Generate"}
        </button>
      </div>}

      {studioTab === "threads" && <>{/* Generation Status */}
      {generating && (
        <div className="border-b border-fuchsia-800/50 bg-fuchsia-950/30 px-4 py-2 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
          <span className="text-sm text-fuchsia-300">{genStatus}</span>
        </div>
      )}

      {/* Content Area */}
      <div className={`flex transition-all ${showSidebar ? "ml-64" : "ml-0"}`}>
        {/* Thread Cards */}
        <div className="flex-1 p-4">
          {thread.nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
              <p className="text-lg mb-3">No tweets yet</p>
              <button onClick={addNode} className="px-4 py-2 rounded bg-fuchsia-600 text-white text-sm hover:bg-fuchsia-500">
                Add First Tweet
              </button>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-3">
              {/* Bulk actions */}
              <div className="flex gap-2 mb-4">
                <span className="text-xs text-zinc-500 py-1">Set all:</span>
                {STATUSES.map(st => (
                  <button key={st.key} onClick={() => setAllStatus(st.key)} className="text-xs px-2 py-1 rounded hover:opacity-80" style={{ background: st.color + "20", color: st.color }}>{st.icon} {st.label}</button>
                ))}
              </div>

              {mainNodes.map((n, i) => (
                <div key={n.id}>
                  {/* Main node card */}
                  <div
                    draggable
                    onDragStart={() => handleDragStart(n.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(n.id)}
                    onClick={() => setEditingId(n.id)}
                    className={`bg-zinc-900 border rounded-lg p-4 cursor-pointer transition-all hover:border-zinc-600 ${
                      editingId === n.id ? "border-fuchsia-500 ring-1 ring-fuchsia-500/30" : "border-zinc-800"
                    } ${dragId === n.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 cursor-grab">⠿</span>
                        <div className="flex flex-col -my-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); if (i > 0) moveNode(n.position, mainNodes[i - 1].position); }}
                            className={`text-[10px] leading-none px-0.5 rounded hover:bg-zinc-700 ${i === 0 ? "text-zinc-700 cursor-default" : "text-zinc-400"}`}
                            disabled={i === 0}
                          >▲</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (i < mainNodes.length - 1) moveNode(n.position, mainNodes[i + 1].position); }}
                            className={`text-[10px] leading-none px-0.5 rounded hover:bg-zinc-700 ${i === mainNodes.length - 1 ? "text-zinc-700 cursor-default" : "text-zinc-400"}`}
                            disabled={i === mainNodes.length - 1}
                          >▼</button>
                        </div>
                        <span className="text-white font-bold text-sm">#{i + 1}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: statusColor(n.status) + "30", color: statusColor(n.status), border: `1px solid ${statusColor(n.status)}` }}>
                          {statusLabel(n.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono mr-2" style={{ color: charColor(n.text.length) }}>
                          {n.text.length}/280
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); explodeNode(n.id); }} className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-900/50 text-fuchsia-300 hover:bg-fuchsia-800/50">
                          ✦ Explode
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteNode(n.id); }} className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50">
                          ✕
                        </button>
                      </div>
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {n.text || <span className="text-zinc-600 italic">Click to edit...</span>}
                    </p>
                    {n.mediaUrl && <div className="mt-2 text-xs text-zinc-500">📎 {n.mediaUrl}</div>}
                  </div>

                  {/* Variation cards */}
                  {thread.nodes.filter(v => v.isVariation && v.parentId === n.id).map((v) => (
                    <div key={v.id} className="ml-8 mt-2 bg-zinc-950 border border-dashed border-fuchsia-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-fuchsia-400 text-xs font-medium">✦ Variation</span>
                        <div className="flex gap-1">
                          <button onClick={() => acceptVariation(v.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-green-600/30 text-green-400 hover:bg-green-600/50">
                            Accept
                          </button>
                          <button onClick={() => setEditingId(v.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600">
                            Edit
                          </button>
                          <button onClick={() => deleteNode(v.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50">
                            ✕
                          </button>
                        </div>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-wrap">{v.text}</p>
                    </div>
                  ))}

                  {/* Connector line */}
                  {i < mainNodes.length - 1 && (
                    <div className="flex justify-center py-1">
                      <div className="w-px h-3 bg-zinc-700" />
                    </div>
                  )}
                </div>
              ))}

              {/* Add tweet at bottom */}
              <button onClick={addNode} className="w-full py-3 rounded-lg border border-dashed border-zinc-700 text-zinc-500 text-sm hover:border-zinc-500 hover:text-zinc-400 transition-colors">
                + Add Tweet
              </button>
            </div>
          )}
        </div>

        {/* Edit Panel */}
        {editingNode && (
          <div className="w-80 border-l border-zinc-800 bg-zinc-900 p-4 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">
                {editingNode.isVariation ? "Edit Variation" : `Edit Tweet #${mainNodes.findIndex(n => n.id === editingNode.id) + 1}`}
              </h2>
              <button onClick={() => setEditingId(null)} className="text-zinc-500 hover:text-white text-lg">✕</button>
            </div>

            <label className="text-xs text-zinc-500 mb-1 block">Tweet Text</label>
            <textarea
              value={editingNode.text}
              onChange={(e) => { updateNode(editingNode.id, { text: e.target.value }); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
              className="w-full min-h-[10rem] bg-zinc-800 text-white text-sm p-3 rounded border border-zinc-700 resize-none mb-1 overflow-hidden"
              autoFocus
            />
            <div className="text-right text-[10px] font-mono mb-3" style={{ color: charColor(editingNode.text.length) }}>
              {editingNode.text.length}/280
            </div>

            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-zinc-500">Media URL</label>
              {editingNode.mediaUrl && editingNode.mediaUrl.startsWith("http") && (
                <a href={editingNode.mediaUrl} target="_blank" rel="noopener" className="text-[10px] text-blue-400 hover:text-blue-300 underline">
                  Open ↗
                </a>
              )}
            </div>
            <input
              value={editingNode.mediaUrl}
              onChange={(e) => updateNode(editingNode.id, { mediaUrl: e.target.value })}
              className="w-full bg-zinc-800 text-white text-sm p-2 rounded border border-zinc-700 mb-3"
              placeholder="https://..."
            />

            <label className="text-xs text-zinc-500 mb-1 block">Notes (internal)</label>
            <textarea
              value={editingNode.notes}
              onChange={(e) => { updateNode(editingNode.id, { notes: e.target.value }); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
              className="w-full min-h-[5rem] bg-zinc-800 text-white text-sm p-2 rounded border border-zinc-700 resize-none mb-3 overflow-hidden"
              placeholder="Internal notes..."
            />

            <label className="text-xs text-zinc-500 mb-1 block">Status</label>
            <select
              value={editingNode.status}
              onChange={(e) => updateNode(editingNode.id, { status: e.target.value as ThreadNode["status"] })}
              className="w-full bg-zinc-800 text-white text-sm p-2 rounded border border-zinc-700 mb-4"
            >
              {STATUSES.map(st => (
                <option key={st.key} value={st.key}>{st.icon} {st.label}</option>
              ))}
            </select>

            {/* Save buttons */}
            {!editingNode.isVariation && (
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => {
                    updateThread((t) => ({
                      ...t,
                      nodes: t.nodes.map((n) => n.id === editingNode.id ? {
                        ...n,
                        history: [...(n.history || []), { text: n.text, savedAt: new Date().toISOString() }],
                      } : n),
                    }));
                    setToast("✅ Saved!");
                  }}
                  className="flex-1 py-2.5 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-500"
                >
                  💾 Save
                </button>
                <button
                  disabled={coherenceLoading}
                  onClick={() => saveNodeAndCheck(editingNode.id)}
                  className={`flex-1 py-2.5 rounded text-sm font-medium ${coherenceLoading ? "bg-blue-800 text-blue-300 cursor-wait" : "bg-blue-600 text-white hover:bg-blue-500"}`}
                >
                  {coherenceLoading ? "⏳ Checking..." : "🔄 Save & Check Flow"}
                </button>
              </div>
            )}

            {!editingNode.isVariation && (
              <button
                onClick={() => explodeNode(editingNode.id)}
                className="w-full py-2 rounded bg-fuchsia-900/50 text-fuchsia-300 text-sm hover:bg-fuchsia-800/50 mb-2"
              >
                ✦ Explode (3 Variations)
              </button>
            )}
            {editingNode.isVariation && (
              <button
                onClick={() => acceptVariation(editingNode.id)}
                className="w-full py-2 rounded bg-green-700 text-white text-sm hover:bg-green-600 mb-2"
              >
                ✅ Accept This Variation
              </button>
            )}

            {/* Version History */}
            {editingNode.history && editingNode.history.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={() => setShowHistory(showHistory === editingNode.id ? null : editingNode.id)}
                  className="w-full py-1.5 rounded bg-zinc-800 text-zinc-400 text-xs hover:bg-zinc-700 mb-1"
                >
                  📜 Version History ({editingNode.history.length})
                </button>
                {showHistory === editingNode.id && (
                  <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                    {[...editingNode.history].reverse().map((v, i) => (
                      <div key={i} className="bg-zinc-800 border border-zinc-700 rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-zinc-500">
                            {new Date(v.savedAt).toLocaleTimeString()}
                          </span>
                          <button
                            onClick={() => restoreVersion(editingNode.id, v)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 hover:bg-amber-900/50"
                          >
                            Restore
                          </button>
                        </div>
                        <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-3">{v.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Coherence Recommendations */}
            {coherenceRecs.length > 0 && (
              <div className="mb-3">
                <h3 className="text-xs font-bold text-amber-400 mb-2">⚡ Flow Recommendations</h3>
                <div className="space-y-2">
                  {coherenceRecs.filter(r => r.status === "pending").map((rec) => {
                    const targetNode = thread.nodes.find(n => n.id === rec.nodeId);
                    return (
                      <div key={rec.nodeId} className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-3">
                        <div className="text-[10px] text-amber-400 font-medium mb-1">
                          Tweet #{targetNode?.position} — {rec.reason}
                        </div>
                        {/* Show diff */}
                        <div className="mb-2">
                          <div className="text-[10px] text-zinc-500 mb-0.5">Current:</div>
                          <p className="text-zinc-400 text-[11px] leading-relaxed bg-red-950/20 border border-red-900/30 rounded p-1.5 line-clamp-3">{rec.original}</p>
                        </div>
                        <div className="mb-2">
                          <div className="text-[10px] text-zinc-500 mb-0.5">Suggested:</div>
                          <p className="text-green-300 text-[11px] leading-relaxed bg-green-950/20 border border-green-900/30 rounded p-1.5 line-clamp-3">{rec.suggested}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => acceptRec(rec)}
                            className="flex-1 text-[10px] py-1 rounded bg-green-600/30 text-green-400 hover:bg-green-600/50"
                          >
                            ✅ Accept
                          </button>
                          <button
                            onClick={() => declineRec(rec.nodeId)}
                            className="flex-1 text-[10px] py-1 rounded bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                          >
                            ✕ Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {coherenceRecs.every(r => r.status !== "pending") && (
                    <button
                      onClick={() => setCoherenceRecs([])}
                      className="w-full text-[10px] py-1 rounded bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                    >
                      Clear recommendations
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => deleteNode(editingNode.id)}
              className="w-full py-2 rounded bg-red-900/30 text-red-400 text-sm hover:bg-red-900/50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Load Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowLoadModal(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-96 max-h-96 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white font-bold mb-4">Load Thread</h2>
            {savedList.length === 0 ? (
              <p className="text-zinc-500 text-sm">No saved threads yet</p>
            ) : (
              <div className="space-y-2">
                {savedList.map((s) => (
                  <button
                    key={s.filename}
                    onClick={() => loadThread(s.filename)}
                    className="w-full text-left p-3 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                  >
                    <div className="text-white text-sm font-medium">{s.title}</div>
                    <div className="text-zinc-500 text-xs">{s.filename}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>}
    </div>
  );
}
