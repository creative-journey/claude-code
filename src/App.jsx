import { useState, useRef } from "react";

const PLATFORMS = ["Pinterest", "Instagram", "Facebook", "TikTok"];
const PLATFORM_COLORS = { Pinterest: "#c94040", Instagram: "#833ab4", Facebook: "#1877f2", TikTok: "#111" };
const PLATFORM_ABBR = { Pinterest: "P", Instagram: "IG", Facebook: "FB", TikTok: "TT" };
const GOALS = ["saves", "shares", "traffic", "awareness", "engagement"];

const ANALYZE_PROMPT = `You are a creative assistant for Everwynn, a warm pet-lover lifestyle brand. Analyze this image and suggest:
1. A topic/context sentence (what story is this image telling?)
2. A likely product reference (what Everwynn product could this relate to — e.g. pet wall art, custom apparel, planner, digital product, home decor, accessory)
3. A season or trending hook if applicable (e.g. "spring refresh," "Mother's Day," "cozy fall vibes") — or leave blank if none is obvious.
Respond ONLY in this exact JSON, no markdown: {"topic":"...","product":"...","hook":"..."}`;

const buildGenerateSystem = (platforms) => `You are the social media copywriter for Everwynn, a pet-lover lifestyle brand on Etsy.
Brand voice: warm, genuine, plain-spoken, empathetic, quietly elegant. "Trusted friend who gets it." Never salesy. Storytelling-first. Short sentences. One friendly flourish is fine. Never mention product names. Never use em dashes.
Generate posts for: ${platforms.join(", ")}. Max 30 words per caption (excluding hashtags).
${platforms.includes("Pinterest") ? "- Pinterest: save-worthy, cozy, relatable. Designed to earn a save." : ""}
${platforms.includes("Instagram") ? "- Instagram: emotional hook in line 1. Can use a line break." : ""}
${platforms.includes("Facebook") ? "- Facebook: conversational, community-feeling." : ""}
${platforms.includes("TikTok") ? "- TikTok: punchy opener, trend-aware, energetic but not loud." : ""}
Hashtags: Suggest the most effective, current hashtags for 2026 per platform, aligned with the goal. Mix: 2-3 high-volume (100k+ posts), 3-4 mid-range (10k-100k), 2-3 niche (<10k). Do NOT just repeat the hashtag bank. Curate and expand per platform. Flag trending ones.
Image Notes: Honestly assess whether this image will perform well toward the stated goal. If it will, say so and why (1-2 sentences). If not, give 2-4 specific, actionable improvements (composition, lighting, styling, text overlay, format like carousel/reel/still). Be direct. Set imageNotes to null only if image is already strong with nothing meaningful to add.
Respond ONLY in this exact JSON, no markdown — include ONLY the keys for the platforms listed above:
{${platforms.map(p => `"${p}":{"caption":"...","hashtags":[...],"trending":[...]}`).join(",")},"imageNotes":"...or null"}`;

const callClaude = async (messages, system) => {
  const body = { model: "claude-sonnet-4-20250514", max_tokens: 1000, messages };
  if (system) body.system = system;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.content?.map((b) => b.text || "").join("").trim();
};

export default function App() {
  const [imgUrl, setImgUrl] = useState(null);
  const [imgBase64, setImgBase64] = useState(null);
  const [imgType, setImgType] = useState("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [suggested, setSuggested] = useState(false);
  const [topic, setTopic] = useState("");
  const [productRef, setProductRef] = useState("");
  const [goal, setGoal] = useState("saves");
  const [hook, setHook] = useState("");
  const [hashtagBank, setHashtagBank] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([...PLATFORMS]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState({});
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        // Prevent deselecting the last platform
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== platform);
      }
      // Re-insert in canonical order
      return PLATFORMS.filter((p) => [...prev, platform].includes(p));
    });
    // Clear results when selection changes so stale data isn't shown
    setResults(null);
  };

  const processFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImgType(file.type);
    setImgUrl(URL.createObjectURL(file));
    setResults(null);
    setSuggested(false);
    setError(null);
    const b64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = (ev) => res(ev.target.result.split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    setImgBase64(b64);
    setAnalyzing(true);
    try {
      const raw = await callClaude([
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: file.type, data: b64 } },
            { type: "text", text: ANALYZE_PROMPT },
          ],
        },
      ]);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setTopic(parsed.topic || "");
      setProductRef(parsed.product || "");
      setHook(parsed.hook || "");
      setSuggested(true);
    } catch {
      setError("Couldn't auto-analyze image. Fill fields manually.");
    }
    setAnalyzing(false);
  };

  const handleFile = (e) => processFile(e.target.files[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    processFile(e.dataTransfer.files[0]);
  };

  const generate = async () => {
    if (!imgBase64) { setError("Upload an image first."); return; }
    if (!topic.trim()) { setError("Add a topic or context."); return; }
    if (selectedPlatforms.length === 0) { setError("Select at least one platform."); return; }
    setError(null);
    setLoading(true);
    setResults(null);
    try {
      const raw = await callClaude(
        [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: imgType, data: imgBase64 } },
              {
                type: "text",
                text: `Topic: ${topic}\nProduct ref (never mention): ${productRef || "unspecified"}\nGoal: ${goal}\nSeason/hook: ${hook || "none"}\nHashtag bank: ${hashtagBank || "none"}\nPlatforms: ${selectedPlatforms.join(", ")}\nYear: 2026`,
              },
            ],
          },
        ],
        buildGenerateSystem(selectedPlatforms)
      );
      setResults(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch {
      setError("Generation failed. Please try again.");
    }
    setLoading(false);
  };

  const copyAll = (platform) => {
    const d = results[platform];
    const tags = d.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
    navigator.clipboard.writeText(`${d.caption}\n\n${tags}`);
    setCopied((c) => ({ ...c, [platform]: true }));
    setTimeout(() => setCopied((c) => ({ ...c, [platform]: false })), 2000);
  };

  return (
    <div style={{ maxWidth: 660, margin: "0 auto", padding: "2rem 0 3rem", fontFamily: "var(--font-sans)" }}>
      <style>{`
        .upload-zone{border:1.5px dashed var(--color-border-secondary);border-radius:16px;cursor:pointer;overflow:hidden;background:var(--color-background-secondary);transition:border-color 0.15s;}
        .upload-zone:hover,.upload-zone.drag{border-color:var(--color-border-primary);}
        .pill-btn{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;padding:5px 13px;border-radius:999px;border:0.5px solid var(--color-border-secondary);background:var(--color-background-secondary);color:var(--color-text-secondary);cursor:pointer;transition:background 0.12s,color 0.12s,border-color 0.12s;}
        .pill-btn.active-goal{background:#7c5cbf;border-color:#7c5cbf;color:#fff;}
        .platform-btn{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:5px 13px;border-radius:999px;border:1.5px solid var(--color-border-secondary);background:var(--color-background-secondary);color:var(--color-text-secondary);cursor:pointer;transition:background 0.12s,color 0.12s,border-color 0.12s,opacity 0.12s;}
        .platform-btn.selected{color:#fff;}
        .platform-btn:not(.selected){opacity:0.55;}
        .platform-btn:hover{opacity:1;}
        .field-label{font-size:11px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-text-secondary);margin-bottom:5px;display:flex;align-items:center;gap:6px;}
        .auto-badge{font-size:10px;font-weight:500;padding:2px 7px;border-radius:999px;background:#e8f5ee;color:#2d7a50;border:0.5px solid #b2dfc7;}
        .result-card{border:0.5px solid var(--color-border-tertiary);border-radius:14px;overflow:hidden;margin-bottom:12px;background:var(--color-background-primary);}
        .result-header{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:0.5px solid var(--color-border-tertiary);background:var(--color-background-secondary);}
        .result-body{padding:14px 16px;}
        .tag-chip{font-size:11px;padding:3px 9px;border-radius:999px;background:var(--color-background-secondary);color:var(--color-text-secondary);}
        .tag-chip.trend{background:#fff8ec;color:#9a6000;border:0.5px solid #f0d08a;}
        .copy-btn{margin-left:auto;font-size:11px;padding:4px 12px;border-radius:999px;}
        .gen-btn{width:100%;padding:13px;border-radius:12px;font-size:14px;font-weight:500;background:#7c5cbf;color:#fff;border:none;cursor:pointer;transition:opacity 0.15s;}
        .gen-btn:hover{opacity:0.88;}
        .gen-btn:disabled{opacity:0.45;cursor:not-allowed;}
        .notes-card{border-left:3px solid #7c5cbf;border-radius:0 12px 12px 0;background:var(--color-background-secondary);padding:14px 16px;margin-bottom:12px;}
        .divider{height:0.5px;background:var(--color-border-tertiary);margin:20px 0;}
        textarea,input,select{font-size:13px;}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#7c5cbf", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 14 }}>✦</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>Everwynn post generator</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, paddingLeft: 42 }}>Upload an image. Fields auto-fill — edit as needed, then generate.</p>
      </div>

      {/* Upload */}
      <div
        className={`upload-zone${drag ? " drag" : ""}`}
        onClick={() => fileRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        style={{ marginBottom: 20 }}
      >
        {imgUrl
          ? (
            <div style={{ position: "relative" }}>
              <img src={imgUrl} alt="Uploaded" style={{ width: "100%", maxHeight: 300, objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, padding: "4px 10px", borderRadius: 999 }}>click to change</div>
            </div>
          )
          : (
            <div style={{ padding: "3rem 2rem", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 10, color: "var(--color-text-secondary)" }}>⬆</div>
              <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>Drop your image here</p>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>or click to browse</p>
            </div>
          )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

      {analyzing && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "10px 14px", background: "var(--color-background-secondary)", borderRadius: 10, border: "0.5px solid var(--color-border-tertiary)" }}>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Analyzing image...</span>
        </div>
      )}

      {/* Fields */}
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="field-label">Topic / context {suggested && <span className="auto-badge">auto-suggested</span>}</div>
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What story is this image telling?" rows={2} style={{ width: "100%", boxSizing: "border-box", resize: "vertical", borderRadius: 10 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 14 }}>
          <div>
            <div className="field-label">Product ref {suggested && <span className="auto-badge">auto-suggested</span>}</div>
            <input value={productRef} onChange={(e) => setProductRef(e.target.value)} placeholder="e.g. Pet POV Video" style={{ width: "100%", boxSizing: "border-box", borderRadius: 10 }} />
            <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>Not used in captions</p>
          </div>
          <div>
            <div className="field-label">Season / hook {suggested && <span className="auto-badge">auto-suggested</span>}</div>
            <input value={hook} onChange={(e) => setHook(e.target.value)} placeholder="e.g. spring refresh..." style={{ width: "100%", boxSizing: "border-box", borderRadius: 10 }} />
          </div>
        </div>

        <div>
          <div className="field-label">Goal</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {GOALS.map((g) => (
              <button key={g} className={`pill-btn${goal === g ? " active-goal" : ""}`} onClick={() => setGoal(g)}>{g}</button>
            ))}
          </div>
        </div>

        {/* Platform selector */}
        <div>
          <div className="field-label">
            Platforms
            <span style={{ fontSize: 11, fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--color-text-secondary)" }}>
              — {selectedPlatforms.length} of {PLATFORMS.length} selected
            </span>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {PLATFORMS.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform);
              return (
                <button
                  key={platform}
                  className={`platform-btn${isSelected ? " selected" : ""}`}
                  onClick={() => togglePlatform(platform)}
                  style={isSelected ? { background: PLATFORM_COLORS[platform], borderColor: PLATFORM_COLORS[platform] } : {}}
                  title={isSelected && selectedPlatforms.length === 1 ? "At least one platform must be selected" : undefined}
                >
                  <span style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: isSelected ? "rgba(255,255,255,0.25)" : PLATFORM_COLORS[platform],
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, fontWeight: 700, color: "#fff", flexShrink: 0, letterSpacing: "0.02em",
                  }}>
                    {PLATFORM_ABBR[platform]}
                  </span>
                  {platform}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="field-label">Hashtag bank</div>
          <textarea value={hashtagBank} onChange={(e) => setHashtagBank(e.target.value)} placeholder="#petlovers #dogsofinstagram #customgifts..." rows={2} style={{ width: "100%", boxSizing: "border-box", resize: "vertical", borderRadius: 10 }} />
        </div>
      </div>

      {error && <p style={{ fontSize: 13, color: "var(--color-text-danger)", margin: "12px 0 0" }}>{error}</p>}

      <div className="divider" />

      <button className="gen-btn" onClick={generate} disabled={loading || analyzing}>
        {loading
          ? `Generating for ${selectedPlatforms.join(", ")}...`
          : `Generate posts${selectedPlatforms.length < PLATFORMS.length ? ` for ${selectedPlatforms.join(", ")}` : ""}`}
      </button>

      {/* Results */}
      {results && (
        <div style={{ marginTop: 28 }}>
          {selectedPlatforms.map((platform) => {
            const d = results[platform];
            if (!d) return null;
            const trending = d.trending || [];
            return (
              <div key={platform} className="result-card">
                <div className="result-header">
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: PLATFORM_COLORS[platform], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: "#fff", flexShrink: 0, letterSpacing: "0.03em" }}>
                    {PLATFORM_ABBR[platform]}
                  </div>
                  <span style={{ fontWeight: 500, fontSize: 14, color: "var(--color-text-primary)" }}>{platform}</span>
                  <button className="copy-btn" onClick={() => copyAll(platform)}>
                    {copied[platform] ? "Copied ✓" : "Copy all"}
                  </button>
                </div>
                <div className="result-body">
                  <p style={{ fontSize: 14, lineHeight: 1.75, margin: "0 0 14px", whiteSpace: "pre-line", color: "var(--color-text-primary)" }}>{d.caption}</p>
                  <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: 8 }}>Hashtags</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {d.hashtags.map((tag, i) => {
                        const clean = tag.startsWith("#") ? tag : `#${tag}`;
                        const isTrend = trending.some((t) => t.replace("#", "").toLowerCase() === tag.replace("#", "").toLowerCase());
                        return (
                          <span key={i} className={`tag-chip${isTrend ? " trend" : ""}`}>
                            {clean}{isTrend ? " ✦" : ""}
                          </span>
                        );
                      })}
                    </div>
                    {trending.length > 0 && <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 7, marginBottom: 0 }}>✦ trending in 2026</p>}
                  </div>
                </div>
              </div>
            );
          })}

          {results.imageNotes && (
            <div className="notes-card">
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7c5cbf", marginBottom: 8 }}>Image notes</div>
              <p style={{ fontSize: 13, lineHeight: 1.75, color: "var(--color-text-primary)", margin: 0 }}>{results.imageNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
