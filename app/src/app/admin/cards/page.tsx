"use client";

import { useState, useEffect } from "react";

const TEAMS = [
  "ATL","BKN","BOS","CHA","CHI","CLE","DET","IND","MIA","MIL",
  "NYK","ORL","PHI","TOR","WAS","DAL","DEN","GSW","HOU","LAC",
  "LAL","MEM","MIN","NOP","OKC","PHX","POR","SAC","SAS","UTA",
];

const TEAM_NAMES: Record<string, string> = {
  BOS: "Celtics", NYK: "Knicks", OKC: "Thunder", WAS: "Wizards",
  ATL: "Hawks", BKN: "Nets", CHA: "Hornets", CHI: "Bulls",
  CLE: "Cavaliers", DET: "Pistons", IND: "Pacers", MIA: "Heat",
  MIL: "Bucks", ORL: "Magic", PHI: "76ers", TOR: "Raptors",
  DAL: "Mavericks", DEN: "Nuggets", GSW: "Warriors", HOU: "Rockets",
  LAC: "Clippers", LAL: "Lakers", MEM: "Grizzlies", MIN: "Timberwolves",
  NOP: "Pelicans", PHX: "Suns", POR: "Trail Blazers", SAC: "Kings",
  SAS: "Spurs", UTA: "Jazz",
};

export default function CardsAdmin() {
  const [selectedTeam, setSelectedTeam] = useState("BOS");
  const [players, setPlayers] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [cardType, setCardType] = useState<"player" | "chain" | "team" | "stat">("player");
  const [previewUrl, setPreviewUrl] = useState("");
  const [statTitle, setStatTitle] = useState("");
  const [statValue, setStatValue] = useState("");
  const [statSubtitle, setStatSubtitle] = useState("");

  useEffect(() => {
    fetch(`/api/acquisition-tree/${selectedTeam}/team`)
      .then((r) => r.json())
      .then((data) => {
        if (data.players) {
          const slugs = data.players.map((p: { slug: string }) => p.slug);
          setPlayers(slugs);
          if (slugs.length > 0) setSelectedPlayer(slugs[0]);
        }
      })
      .catch(() => setPlayers([]));
  }, [selectedTeam]);

  const generatePreview = () => {
    let url = "";
    switch (cardType) {
      case "player":
        url = `/api/card/player/${selectedPlayer}`;
        break;
      case "chain":
        url = `/api/card/chain/${selectedPlayer}`;
        break;
      case "team":
        url = `/api/card/team/${selectedTeam}`;
        break;
      case "stat":
        const params = new URLSearchParams();
        if (statTitle) params.set("title", statTitle);
        if (statValue) params.set("value", statValue);
        if (statSubtitle) params.set("subtitle", statSubtitle);
        params.set("teamAbbr", selectedTeam);
        url = `/api/card/stat?${params.toString()}`;
        break;
    }
    setPreviewUrl(url);
  };

  const downloadCard = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `rosterdna-${cardType}-${selectedPlayer || selectedTeam}.png`;
    a.click();
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#09090b", color: "#e4e4e7", fontFamily: "system-ui, sans-serif", padding: "32px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "4px" }}>🧬 Card Generator</h1>
        <p style={{ color: "#71717a", marginBottom: "32px" }}>Generate branded social cards for RosterDNA</p>

        <div style={{ display: "flex", gap: "32px" }}>
          {/* Controls */}
          <div style={{ width: "320px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Team selector */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#71717a", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>TEAM</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", color: "#e4e4e7", fontSize: "14px" }}
              >
                {TEAMS.map((t) => (
                  <option key={t} value={t}>{t} — {TEAM_NAMES[t]}</option>
                ))}
              </select>
            </div>

            {/* Card type */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#71717a", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>CARD TYPE</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {(["player", "chain", "team", "stat"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCardType(t)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: cardType === t ? "#3b82f6" : "#18181b",
                      border: cardType === t ? "1px solid #3b82f6" : "1px solid #27272a",
                      borderRadius: "6px",
                      color: "#e4e4e7",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Player selector (for player/chain) */}
            {(cardType === "player" || cardType === "chain") && (
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#71717a", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>PLAYER</label>
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", color: "#e4e4e7", fontSize: "14px" }}
                >
                  {players.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Stat fields */}
            {cardType === "stat" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#71717a", display: "block", marginBottom: "4px" }}>TITLE</label>
                  <input value={statTitle} onChange={(e) => setStatTitle(e.target.value)} placeholder="The deepest trade chain in the NBA" style={{ width: "100%", padding: "10px 12px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", color: "#e4e4e7", fontSize: "14px" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#71717a", display: "block", marginBottom: "4px" }}>VALUE</label>
                  <input value={statValue} onChange={(e) => setStatValue(e.target.value)} placeholder="7" style={{ width: "100%", padding: "10px 12px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", color: "#e4e4e7", fontSize: "14px" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#71717a", display: "block", marginBottom: "4px" }}>SUBTITLE</label>
                  <input value={statSubtitle} onChange={(e) => setStatSubtitle(e.target.value)} placeholder="transactions to get Buddy Hield" style={{ width: "100%", padding: "10px 12px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", color: "#e4e4e7", fontSize: "14px" }} />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={generatePreview}
                style={{ flex: 1, padding: "12px", backgroundColor: "#3b82f6", border: "none", borderRadius: "8px", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
              >
                Generate
              </button>
              <button
                onClick={downloadCard}
                disabled={!previewUrl}
                style={{ padding: "12px 20px", backgroundColor: previewUrl ? "#22c55e" : "#27272a", border: "none", borderRadius: "8px", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: previewUrl ? "pointer" : "default", opacity: previewUrl ? 1 : 0.5 }}
              >
                ⬇ PNG
              </button>
            </div>
          </div>

          {/* Preview */}
          <div style={{ flex: 1 }}>
            {previewUrl ? (
              <div style={{ backgroundColor: "#18181b", borderRadius: "12px", padding: "16px", border: "1px solid #27272a" }}>
                <img
                  src={previewUrl}
                  alt="Card preview"
                  style={{ width: "100%", borderRadius: "8px" }}
                />
                <div style={{ marginTop: "8px", color: "#52525b", fontSize: "12px", wordBreak: "break-all" }}>
                  {previewUrl}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px", backgroundColor: "#18181b", borderRadius: "12px", border: "1px solid #27272a" }}>
                <span style={{ color: "#3f3f46", fontSize: "16px" }}>Select options and click Generate</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
