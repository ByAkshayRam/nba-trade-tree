"use client";

import { useState, useRef, useCallback } from "react";
import { toPng } from "html-to-image";

const TEAM_COLORS: Record<string, string> = {
  ATL: '#E03A3E', BOS: '#007A33', BKN: '#000000', CHA: '#00788C',
  CHI: '#CE1141', CLE: '#860038', DAL: '#00538C', DEN: '#0E2240',
  DET: '#C8102E', GSW: '#FFC72C', HOU: '#CE1141', IND: '#002D62',
  LAC: '#C8102E', LAL: '#552583', MEM: '#5D76A9', MIA: '#98002E',
  MIL: '#00471B', MIN: '#0C2340', NOP: '#B4975A', NYK: '#F58426',
  OKC: '#007AC1', ORL: '#0077C0', PHI: '#006BB6', PHX: '#1D1160',
  POR: '#E03A3E', SAC: '#5A2D81', SAS: '#C4CED4', TOR: '#CE1141',
  UTA: '#3E1175', WAS: '#002B5C'
};

const TEAM_LIST = Object.keys(TEAM_COLORS).sort();

interface Node {
  type: 'player' | 'pick' | 'origin' | 'other';
  name: string;
  detail: string;
  becameName: string;
  becameLabel: string;
  notConveyed: boolean;
  champBadge: boolean;
  champYear: string;
}

interface Stop {
  team: string;
  years: string;
  isCurrent: boolean;
  nodes: Node[];
}

interface Stat {
  value: string;
  label: string;
}

const defaultStops: Stop[] = [
  {
    team: 'NYK', years: '2015–19', isCurrent: false,
    nodes: [{ type: 'origin', name: 'Kristaps Porzingis', detail: '#4 overall · 2015 Draft', becameName: '', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' }]
  },
  {
    team: 'DAL', years: '2019–22', isCurrent: false,
    nodes: [
      { type: 'player', name: 'Dennis Smith Jr.', detail: '#9 pick (2017)', becameName: '', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' },
      { type: 'player', name: 'DeAndre Jordan', detail: '', becameName: '', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' },
      { type: 'player', name: 'Wesley Matthews', detail: '', becameName: '', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' },
      { type: 'pick', name: '2021 1st Round', detail: '', becameName: 'Keon Johnson (#21)', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' },
      { type: 'pick', name: '2023 1st (top-10 prot.)', detail: '', becameName: 'Kyshawn George (#24)', becameLabel: 'Conveyed 2024', notConveyed: false, champBadge: false, champYear: '' },
    ]
  },
  {
    team: 'WAS', years: '2022–23', isCurrent: false,
    nodes: [
      { type: 'player', name: 'Spencer Dinwiddie', detail: '', becameName: '', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' },
      { type: 'player', name: 'Davis Bertans', detail: '', becameName: '', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' },
    ]
  },
  {
    team: 'BOS', years: '2023–25', isCurrent: false,
    nodes: [
      { type: 'player', name: 'Marcus Smart', detail: '→ MEM (3-team)', becameName: '', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' },
      { type: 'player', name: 'Danilo Gallinari', detail: '→ WAS (3-team)', becameName: '', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' },
      { type: 'player', name: 'Mike Muscala', detail: '→ WAS (3-team)', becameName: '', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' },
      { type: 'pick', name: '2023 2nd (#35)', detail: '→ WAS', becameName: 'Julian Phillips', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' },
      { type: 'player', name: '', detail: '', becameName: '', becameLabel: 'Became', notConveyed: false, champBadge: true, champYear: '2024' },
    ]
  },
  {
    team: 'ATL', years: '2025–26', isCurrent: false,
    nodes: [
      { type: 'player', name: 'Terance Mann', detail: '→ BKN (3-team)', becameName: '', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' },
      { type: 'pick', name: '#22 Overall (2025)', detail: '', becameName: 'Drake Powell', becameLabel: 'Selected', notConveyed: false, champBadge: false, champYear: '' },
      { type: 'pick', name: 'BOS Future 2nd', detail: '', becameName: '', becameLabel: 'Became', notConveyed: true, champBadge: false, champYear: '' },
    ]
  },
  {
    team: 'GSW', years: '2026–now', isCurrent: true,
    nodes: [
      { type: 'player', name: 'Jonathan Kuminga', detail: '#7 pick (2021)', becameName: '', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' },
      { type: 'player', name: 'Buddy Hield', detail: '', becameName: '', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' },
      { type: 'pick', name: '2026 1st Rounder', detail: '', becameName: '', becameLabel: 'Became', notConveyed: true, champBadge: false, champYear: '' },
    ]
  },
];

const defaultStats: Stat[] = [
  { value: '5', label: 'Trades' },
  { value: '10+', label: 'Players Moved' },
  { value: '5+', label: '1st Round Picks' },
  { value: '8', label: 'Franchises Touched' },
];

function newNode(): Node {
  return { type: 'player', name: '', detail: '', becameName: '', becameLabel: 'Became', notConveyed: false, champBadge: false, champYear: '' };
}

function newStop(): Stop {
  return { team: 'ATL', years: '', isCurrent: false, nodes: [newNode()] };
}

export default function CardBuilderPage() {
  const [playerName, setPlayerName] = useState('Kristaps Porzingis');
  const [eyebrow, setEyebrow] = useState('The Trade Odyssey');
  const [subtitle, setSubtitle] = useState('');
  const [headshotUrl, setHeadshotUrl] = useState('');
  const [showHeadshot, setShowHeadshot] = useState(true);
  const [stops, setStops] = useState<Stop[]>(defaultStops);
  const [stats, setStats] = useState<Stat[]>(defaultStats);
  const [showGradientBar, setShowGradientBar] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showFooterStats, setShowFooterStats] = useState(true);
  const [brandName, setBrandName] = useState('RosterDNA');
  const [brandTagline, setBrandTagline] = useState('Trade Chain Intelligence');

  const cardRef = useRef<HTMLDivElement>(null);

  const autoSubtitle = `${stops.length} teams · ${Math.max(stops.length - 1, 0)} trades`;
  const displaySubtitle = subtitle || autoSubtitle;

  const gradientColors = stops.map(s => TEAM_COLORS[s.team] || '#666').join(', ');

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { width: 1200, height: 750, pixelRatio: 1 });
      const link = document.createElement('a');
      link.download = `${playerName.replace(/\s+/g, '-').toLowerCase()}-trade-odyssey.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [playerName]);

  const updateStop = (i: number, patch: Partial<Stop>) => {
    setStops(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };

  const updateNode = (si: number, ni: number, patch: Partial<Node>) => {
    setStops(prev => prev.map((s, idx) => idx === si ? { ...s, nodes: s.nodes.map((n, nIdx) => nIdx === ni ? { ...n, ...patch } : n) } : s));
  };

  const removeStop = (i: number) => setStops(prev => prev.filter((_, idx) => idx !== i));
  const addStop = () => setStops(prev => [...prev, newStop()]);
  const addNode = (si: number) => setStops(prev => prev.map((s, idx) => idx === si ? { ...s, nodes: [...s.nodes, newNode()] } : s));
  const removeNode = (si: number, ni: number) => setStops(prev => prev.map((s, idx) => idx === si ? { ...s, nodes: s.nodes.filter((_, nIdx) => nIdx !== ni) } : s));

  const nodeTypeColor = (t: string) => t === 'player' ? '#0066ff' : t === 'pick' ? '#d946ef' : t === 'origin' ? '#22c55e' : '#888';

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-zinc-500 hover:text-white text-sm">← Admin</a>
          <h1 className="text-lg font-bold">🎨 Trade Odyssey Card Builder</h1>
        </div>
        <button onClick={handleDownload} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold text-sm transition-colors">
          📥 Download PNG
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-[380px] shrink-0 border-r border-zinc-800 overflow-y-auto p-4 space-y-4">
          {/* Header Section */}
          <Section title="Header">
            <Label text="Player Name">
              <input value={playerName} onChange={e => setPlayerName(e.target.value)} className="input-field" />
            </Label>
            <Label text="Eyebrow Text">
              <input value={eyebrow} onChange={e => setEyebrow(e.target.value)} className="input-field" />
            </Label>
            <Label text="Subtitle (auto if empty)">
              <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder={autoSubtitle} className="input-field" />
            </Label>
            <Label text="Headshot URL">
              <input value={headshotUrl} onChange={e => setHeadshotUrl(e.target.value)} placeholder="https://..." className="input-field" />
            </Label>
            {headshotUrl && <img src={headshotUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-zinc-700" />}
            <Toggle label="Show Headshot" checked={showHeadshot} onChange={setShowHeadshot} />
          </Section>

          {/* Team Stops */}
          <Section title={`Team Stops (${stops.length})`}>
            {stops.map((stop, si) => (
              <div key={si} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded" style={{ background: TEAM_COLORS[stop.team] || '#666' }} />
                  <select value={stop.team} onChange={e => updateStop(si, { team: e.target.value })} className="select-field flex-1">
                    {TEAM_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input value={stop.years} onChange={e => updateStop(si, { years: e.target.value })} placeholder="2015–19" className="input-field w-24" />
                  <button onClick={() => removeStop(si)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                </div>
                <Toggle label="Current Team" checked={stop.isCurrent} onChange={v => updateStop(si, { isCurrent: v })} />

                <div className="space-y-2 pl-2 border-l border-zinc-700">
                  {stop.nodes.map((node, ni) => (
                    <div key={ni} className="bg-zinc-800/50 rounded p-2 space-y-1">
                      <div className="flex items-center gap-1">
                        <select value={node.type} onChange={e => updateNode(si, ni, { type: e.target.value as Node['type'] })} className="select-field text-xs flex-1">
                          <option value="player">Player</option>
                          <option value="pick">Pick</option>
                          <option value="origin">Origin</option>
                          <option value="other">Other</option>
                        </select>
                        <button onClick={() => removeNode(si, ni)} className="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                      </div>
                      <input value={node.name} onChange={e => updateNode(si, ni, { name: e.target.value })} placeholder="Name" className="input-field text-xs" />
                      <input value={node.detail} onChange={e => updateNode(si, ni, { detail: e.target.value })} placeholder="Detail (optional)" className="input-field text-xs" />
                      {(node.type === 'pick' || node.becameName) && (
                        <>
                          <input value={node.becameName} onChange={e => updateNode(si, ni, { becameName: e.target.value })} placeholder="Became name" className="input-field text-xs" />
                          <input value={node.becameLabel} onChange={e => updateNode(si, ni, { becameLabel: e.target.value })} placeholder="Became label" className="input-field text-xs" />
                        </>
                      )}
                      <div className="flex gap-3">
                        <Toggle label="Not conveyed" checked={node.notConveyed} onChange={v => updateNode(si, ni, { notConveyed: v })} small />
                        <Toggle label="🏆" checked={node.champBadge} onChange={v => updateNode(si, ni, { champBadge: v })} small />
                      </div>
                      {node.champBadge && (
                        <input value={node.champYear} onChange={e => updateNode(si, ni, { champYear: e.target.value })} placeholder="Year" className="input-field text-xs w-20" />
                      )}
                    </div>
                  ))}
                  <button onClick={() => addNode(si)} className="text-cyan-400 hover:text-cyan-300 text-xs">+ Add Node</button>
                </div>
              </div>
            ))}
            <button onClick={addStop} className="w-full py-2 border border-dashed border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-500 text-sm transition-colors">
              + Add Stop
            </button>
          </Section>

          {/* Footer Stats */}
          <Section title="Footer Stats">
            <Toggle label="Show Footer Stats" checked={showFooterStats} onChange={setShowFooterStats} />
            {stats.map((stat, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={stat.value} onChange={e => setStats(prev => prev.map((s, idx) => idx === i ? { ...s, value: e.target.value } : s))} placeholder="Value" className="input-field w-16" />
                <input value={stat.label} onChange={e => setStats(prev => prev.map((s, idx) => idx === i ? { ...s, label: e.target.value } : s))} placeholder="Label" className="input-field flex-1" />
                <button onClick={() => setStats(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 text-xs">✕</button>
              </div>
            ))}
            <button onClick={() => setStats(prev => [...prev, { value: '', label: '' }])} className="text-cyan-400 hover:text-cyan-300 text-xs">+ Add Stat</button>
          </Section>

          {/* Design */}
          <Section title="Design">
            <Toggle label="Gradient Bar" checked={showGradientBar} onChange={setShowGradientBar} />
            <Toggle label="Grid Background" checked={showGrid} onChange={setShowGrid} />
            <Label text="Brand Name">
              <input value={brandName} onChange={e => setBrandName(e.target.value)} className="input-field" />
            </Label>
            <Label text="Brand Tagline">
              <input value={brandTagline} onChange={e => setBrandTagline(e.target.value)} className="input-field" />
            </Label>
          </Section>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 overflow-auto p-6 flex items-start justify-center bg-zinc-900/50">
          <div style={{ transform: 'scale(0.65)', transformOrigin: 'top center' }}>
            {/* THE CARD */}
            <div
              ref={cardRef}
              style={{
                width: 1200, height: 750,
                background: '#0a0a0f',
                fontFamily: "'Inter', sans-serif",
                color: 'white',
                overflow: 'hidden',
                position: 'relative',
                borderRadius: 0,
              }}
            >
              {/* Google Fonts */}
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

              {/* Grid bg */}
              {showGrid && (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }} />
              )}

              <div style={{ position: 'relative', zIndex: 1, padding: '24px 32px 20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {showHeadshot && headshotUrl && (
                      <div style={{
                        width: 60, height: 60, borderRadius: '50%', overflow: 'hidden',
                        border: '3px solid #22d3ee', background: '#1a1a2e', flexShrink: 0,
                      }}>
                        <img src={headshotUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#22d3ee', marginBottom: 3 }}>{eyebrow}</div>
                      <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>{playerName}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, fontWeight: 500 }}>{displaySubtitle}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>{brandName}</div>
                    <div style={{ fontSize: 8, fontWeight: 600, color: '#22d3ee', letterSpacing: 2, textTransform: 'uppercase' as const, marginTop: 2, textAlign: 'right' as const }}>{brandTagline}</div>
                  </div>
                </div>

                {/* Gradient Line */}
                {showGradientBar && (
                  <div style={{
                    position: 'relative', height: 3, margin: '0 50px',
                    background: `linear-gradient(90deg, ${gradientColors})`,
                    borderRadius: 2,
                  }} />
                )}

                {/* Timeline */}
                <div style={{ flex: 1, display: 'flex', gap: 6, position: 'relative', marginTop: 10 }}>
                  {stops.map((stop, si) => (
                    <div key={si} style={{ display: 'contents' }}>
                      {si > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 14, flexShrink: 0, paddingTop: 26 }}>
                          <span style={{ color: '#22d3ee', fontSize: 14, opacity: 0.5 }}>›</span>
                        </div>
                      )}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: 7,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 8, fontWeight: 800, color: stop.team === 'GSW' ? '#1D428A' : 'white', flexShrink: 0,
                            background: TEAM_COLORS[stop.team] || '#666',
                            ...(stop.isCurrent ? { border: '2px solid #FFC72C', boxShadow: '0 0 12px #FFC72C44' } : {}),
                          }}>
                            {stop.team}
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>{stop.years}</div>
                        </div>
                        {stop.nodes.filter(n => n.name || n.champBadge).map((node, ni) => (
                          <div key={ni} style={{ width: '100%' }}>
                            {node.name && (
                              <div style={{
                                background: '#1e1e2e', borderRadius: 10, padding: '6px 9px', marginBottom: 6,
                                width: '100%', position: 'relative',
                                borderLeft: `3px solid ${nodeTypeColor(node.type)}`,
                              }}>
                                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 1, color: nodeTypeColor(node.type) }}>
                                  {node.type}
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{node.name}</div>
                                {node.detail && <div style={{ fontSize: 8, color: '#888', marginTop: 1 }}>{node.detail}</div>}
                                {node.becameName && (
                                  <div style={{ background: '#16161e', border: '1px solid #2a2a3a', borderRadius: 6, padding: '3px 7px', marginTop: 3 }}>
                                    <div style={{ fontSize: 6, color: '#666', textTransform: 'uppercase' as const, letterSpacing: 1, fontWeight: 600 }}>{node.becameLabel}</div>
                                    <div style={{ fontSize: 9, color: '#aaa', fontWeight: 600 }}>{node.becameName}</div>
                                  </div>
                                )}
                                {node.notConveyed && (
                                  <div style={{ background: '#1a1520', border: '1px solid #d946ef30', borderRadius: 6, padding: '3px 7px', marginTop: 3 }}>
                                    <div style={{ fontSize: 7, color: '#d946ef', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>⏳ Not yet conveyed</div>
                                  </div>
                                )}
                              </div>
                            )}
                            {node.champBadge && (
                              <div style={{
                                background: '#fbbf2420', border: '1px solid #fbbf2440', borderRadius: 6,
                                padding: '3px 7px', fontSize: 8, fontWeight: 700, color: '#fbbf24',
                                textAlign: 'center', marginBottom: 6, width: '100%',
                              }}>
                                🏆 {node.champYear} Champion
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                {showFooterStats && (
                  <div style={{
                    display: 'flex', gap: 36, marginTop: 'auto', paddingTop: 14,
                    borderTop: '1px solid rgba(255,255,255,0.06)', alignItems: 'center',
                  }}>
                    {stats.map((stat, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#22d3ee' }}>{stat.value}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#64748b', marginTop: 2 }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .input-field {
          width: 100%;
          padding: 6px 10px;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          color: white;
          font-size: 13px;
          outline: none;
        }
        .input-field:focus { border-color: #22d3ee; }
        .input-field::placeholder { color: #71717a; }
        .select-field {
          padding: 6px 10px;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          color: white;
          font-size: 13px;
          outline: none;
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-500 mb-1 block">{text}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange, small }: { label: string; checked: boolean; onChange: (v: boolean) => void; small?: boolean }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${small ? 'text-[10px]' : 'text-xs'} text-zinc-400`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="rounded bg-zinc-800 border-zinc-600" />
      {label}
    </label>
  );
}
