import { useState, useRef, useCallback } from "react";

const QUESTIONS = [
  { id: "productName", label: "What is the product?", placeholder: "e.g. Hand-poured lavender soy candle in amber glass jar", required: true },
  { id: "materials", label: "What materials or medium is it made from?", placeholder: "e.g. 100% soy wax, cotton wick, dried lavender buds, recycled amber glass" },
  { id: "sizes", label: "What sizes, variants, or customization options are available?", placeholder: "e.g. 4oz, 8oz, 16oz — also available in rose & eucalyptus scents; custom labels available" },
  { id: "targetBuyer", label: "Who is the ideal buyer?", placeholder: "e.g. Women 25–45, self-care lovers, gift shoppers for birthdays or housewarming" },
  { id: "occasion", label: "What occasions or use cases does it fit?", placeholder: "e.g. Birthday gift, housewarming, self-care Sunday, home décor, meditation, spa night" },
  { id: "uniqueValue", label: "What makes this listing special vs. competitors?", placeholder: "e.g. Hand-poured in small batches, long 50-hr burn time, all-natural, eco-friendly packaging" },
  { id: "style", label: "What's the visual style or aesthetic?", placeholder: "e.g. Cottagecore, minimalist, boho, farmhouse, dark academia, coastal, modern luxury" },
  { id: "shopStyle", label: "Any brand voice or shop style preferences?", placeholder: "e.g. Warm and conversational, or professional and concise (optional)" },
  { id: "seedKeywords", label: "Paste real Etsy search suggestions here (optional but recommended)", placeholder: "e.g. printable planner for women, daily planner pdf, habit tracker printable, undated planner insert, planner for adhd adults, weekly planner instant download", hint: true },
];

const SYSTEM_PROMPT = `You are a world-class Etsy SEO specialist trained on the 2026 Etsy search algorithm. Your job is to generate fully optimized Etsy listing metadata that maximizes visibility AND conversion.

2026 ETSY ALGORITHM RULES (critical — follow exactly):
- Etsy now uses advanced NLP. Natural, conversational language ALWAYS outperforms keyword stuffing.
- Title: Must contain exactly 8 long-tail keyword phrases. 120–140 characters. Primary keyword phrase in the FIRST 40 characters (mobile truncation point). Use commas or "|" as natural separators between keyword clusters.

  MANDATORY THINKING STEP — before writing a single word of the title, answer these three questions internally:
  1. WHO is buying this? (e.g. a busy mom, a college student, someone with ADHD, a small business owner)
  2. WHO or WHAT is it for? (e.g. for herself, as a gift for her sister, for back-to-school, for a new job)
  3. WHAT PROBLEM does it solve or desire does it fulfill? (e.g. "I can never stick to a routine", "I need to feel in control of my day", "I want to plan meals and track habits in one place")

  Each of the 8 phrases must answer one of those three questions — from the BUYER'S mouth, not the seller's. Every phrase must be something a real person types into Etsy at the moment they need this product.

  BAD title (product feature list — NEVER do this):
  "Printable Planner Bundle Undated | Daily Planner PDF Time Block, Habit Tracker Printable, Mood Tracker, Four Seasons Digital Planner Insert"
  → This describes WHAT the product IS. It does not reflect why someone searches for it.

  GOOD title (buyer-intent driven — always do this):
  "Daily Planner Printable for Busy Moms | Undated Weekly Planner for ADHD | Habit Tracker PDF for Women | Digital Planner for Work Life Balance"
  → Every phrase answers: who needs this, why they need it, what problem it solves.

  The 8 phrases must span: the primary product type, the buyer identity, the recipient or self-use angle, the core problem solved, the emotional outcome, the occasion or life moment, a style or format detail, and a trending or seasonal angle.
- Tags: Exactly 13 tags. STRICT 20-character limit per tag — count every character including spaces. When a long-tail keyword phrase from the title exceeds 20 characters, SPLIT it intelligently into two shorter tags that each still make sense as standalone buyer searches (e.g. "personalized leather journal for him" splits into "leather journal men" and "personalized journal"). Never truncate mid-word. Cover the same 8 buyer-intent angles from the title plus 5 additional variations: synonyms, alternate recipients, related use cases, material variations, seasonal angles. Do NOT repeat exact title phrases. Do NOT use hyphens in tags.
- Description: Mobile-first short paragraphs (2–3 sentences each). Weave the same 8 long-tail buyer-intent keyword phrases from the title naturally into the body — each should appear at least once, worked into real sentences a buyer would enjoy reading. Primary keyword appears in the opening sentence. Open with the buyer benefit or use case, not product specs. Include materials, dimensions, care instructions, and a warm closing CTA. 150–250 words. Do NOT use hyphens or bullet points — write in flowing prose paragraphs only.
- Alt text: One clear sentence. Describes the image visually + includes primary keyword naturally.
- AVOID: keyword stuffing, subjective fluff ("beautiful", "perfect"), sale language ("free shipping"), repeating the same phrase in both title and multiple tags.

Output ONLY valid JSON, no markdown, no preamble. Structure:
{
  "title": "...",
  "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10","tag11","tag12","tag13"],
  "description": "...",
  "altText": "...",
  "seoScore": { "titleScore": 0-100, "tagScore": 0-100, "descriptionScore": 0-100, "overallScore": 0-100 },
  "keyInsights": ["insight1","insight2","insight3"]
}`;

function buildUserPrompt(answers, hasImage) {
  const parts = [`Generate optimized 2026 Etsy SEO metadata for this product.`];
  if (hasImage) parts.push(`I've uploaded the main product image. Use it to inform colors, materials, style, and visual keywords.`);
  QUESTIONS.forEach(q => {
    if (q.id === "seedKeywords") return;
    if (answers[q.id]?.trim()) parts.push(`${q.label}\n→ ${answers[q.id].trim()}`);
  });
  if (answers.seedKeywords?.trim()) {
    parts.push(`REAL ETSY SEARCH DATA — HIGHEST PRIORITY:\nThe following phrases are actual buyer searches pulled from Etsy autocomplete. These are what real people are typing right now. You MUST prioritize these exact phrases (or close variations) when selecting the 8 long-tail keywords for the title, and when building the 13 tags and description. Do not invent keyword phrases when real data has been provided — use this as your primary keyword pool and supplement only where gaps exist:\n→ ${answers.seedKeywords.trim()}`);
  }
  return parts.join("\n\n");
}

function ScoreBar({ label, score }) {
  const c = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#78716c", marginBottom: 4 }}>
        <span>{label}</span><span style={{ fontWeight: 600, color: c }}>{score}/100</span>
      </div>
      <div style={{ height: 6, background: "#f5f0eb", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: c, borderRadius: 99, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const value = text != null ? String(text) : "";
    if (!value) return;
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (e) {
      navigator.clipboard?.writeText(value).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{
      fontSize: 11, padding: "4px 10px", borderRadius: 6,
      border: "1px solid #d6d0c8", background: copied ? "#f0fdf4" : "#faf8f5",
      color: copied ? "#16a34a" : "#78716c", cursor: "pointer", fontFamily: "inherit",
      transition: "all 0.2s", whiteSpace: "nowrap"
    }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

export default function EtsySEOGenerator() {
  const [step, setStep] = useState(0); // 0=upload, 1=qa, 2=generating, 3=results
  const [image, setImage] = useState(null); // { base64, mediaType, preview }
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(",")[1];
      setImage({ base64, mediaType: file.type, preview: e.target.result });
      setStep(1);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const generate = async () => {
    setStep(2); setError(null);
    try {
      const messages = [{ role: "user", content: [] }];
      if (image) {
        messages[0].content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } });
      }
      messages[0].content.push({ type: "text", text: buildUserPrompt(answers, !!image) });

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, system: SYSTEM_PROMPT, messages })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("").trim();
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setStep(3);
    } catch (e) {
      setError("Something went wrong generating your SEO. Please try again.");
      setStep(1);
    }
  };

  const reset = () => { setStep(0); setImage(null); setAnswers({}); setResult(null); };

  const filledCount = QUESTIONS.filter(q => answers[q.id]?.trim()).length;
  const requiredFilled = answers["productName"]?.trim();

  const s = {
    wrap: { fontFamily: "'Georgia', serif", background: "#faf7f2", minHeight: "100vh", padding: "0 0 60px" },
    header: {
      background: "#2c2116", padding: "24px 28px 20px", display: "flex",
      alignItems: "center", justifyContent: "space-between"
    },
    logo: { display: "flex", alignItems: "center", gap: 10 },
    logoIcon: { width: 32, height: 32, background: "#e07a3a", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
    logoText: { color: "#f5f0eb", fontSize: 18, fontWeight: 600, letterSpacing: "-.3px" },
    logoSub: { color: "#a39080", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 1 },
    badge: { background: "#e07a3a22", color: "#e07a3a", fontSize: 11, padding: "3px 10px", borderRadius: 20, border: "1px solid #e07a3a44", letterSpacing: ".05em" },
    body: { maxWidth: 680, margin: "0 auto", padding: "0 20px" },
    stepIndicator: { display: "flex", gap: 8, alignItems: "center", padding: "28px 0 20px" },
    stepDot: (active, done) => ({
      width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontFamily: "'Helvetica Neue', sans-serif", fontWeight: 600,
      background: done ? "#e07a3a" : active ? "#2c2116" : "#e8e0d8",
      color: done || active ? "#fff" : "#a39080", transition: "all .3s"
    }),
    stepLine: { flex: 1, height: 1, background: "#e8e0d8" },
    card: { background: "#fff", border: "1px solid #ebe5dc", borderRadius: 16, padding: "28px 28px", marginBottom: 16 },
    h2: { fontSize: 22, color: "#2c2116", margin: "0 0 6px", fontWeight: 600, lineHeight: 1.3 },
    p: { fontSize: 14, color: "#78716c", margin: "0 0 20px", lineHeight: 1.6, fontFamily: "sans-serif" },
    dropZone: (over) => ({
      border: `2px dashed ${over ? "#e07a3a" : "#d6d0c8"}`, borderRadius: 14,
      padding: "48px 24px", textAlign: "center", cursor: "pointer",
      background: over ? "#fef6f0" : "#faf8f5", transition: "all .2s"
    }),
    uploadIcon: { fontSize: 36, marginBottom: 12 },
    uploadText: { fontSize: 15, color: "#44403c", fontWeight: 500, marginBottom: 6, fontFamily: "sans-serif" },
    uploadSub: { fontSize: 13, color: "#a8a29e", fontFamily: "sans-serif" },
    imgPreview: { width: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 10, background: "#f5f0eb" },
    qLabel: { display: "block", fontSize: 13, fontWeight: 600, color: "#44403c", marginBottom: 8, fontFamily: "sans-serif", letterSpacing: "-.01em" },
    qInput: { width: "100%", padding: "12px 14px", fontSize: 14, border: "1.5px solid #e0d9d0", borderRadius: 10, background: "#faf8f5", color: "#2c2116", fontFamily: "sans-serif", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 },
    qRequired: { color: "#e07a3a", fontSize: 11, marginLeft: 4 },
    nav: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 },
    btnPrimary: { background: "#e07a3a", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif", transition: "background .2s" },
    btnSecondary: { background: "none", color: "#78716c", border: "1px solid #d6d0c8", padding: "11px 20px", borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: "sans-serif" },
    progressRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    tag: { display: "inline-block", background: "#fef6f0", border: "1px solid #fcd5b5", color: "#9a3412", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontFamily: "sans-serif", margin: "3px 3px 3px 0", fontWeight: 500 },
    resultSection: { marginBottom: 24 },
    resultLabel: { fontSize: 11, fontWeight: 600, color: "#a39080", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10, fontFamily: "sans-serif" },
    resultBox: { background: "#faf8f5", border: "1px solid #ebe5dc", borderRadius: 10, padding: "14px 16px", fontSize: 14, color: "#2c2116", lineHeight: 1.7, fontFamily: "sans-serif" },
    insight: { display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f0ebe4" },
    insightDot: { width: 6, height: 6, borderRadius: "50%", background: "#e07a3a", marginTop: 6, flexShrink: 0 },
    insightText: { fontSize: 13, color: "#44403c", lineHeight: 1.55, fontFamily: "sans-serif" },
  };

  const STEP_LABELS = ["Image", "Details", "Generate", "Results"];

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.logo}>
          <div style={s.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L11 7H16L12 10.5L13.5 16L9 13L4.5 16L6 10.5L2 7H7L9 2Z" fill="#fff"/></svg>
          </div>
          <div>
            <div style={s.logoText}>Etsy SEO Studio</div>
            <div style={s.logoSub}>Powered by Claude AI</div>
          </div>
        </div>
        <div style={s.badge}>2026 Algorithm</div>
      </div>

      <div style={s.body}>
        <div style={s.stepIndicator}>
          {STEP_LABELS.map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : 0, gap: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={s.stepDot(step === i, step > i)}>
                  {step > i ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 10, color: step === i ? "#2c2116" : "#a39080", fontFamily: "sans-serif", whiteSpace: "nowrap" }}>{label}</span>
              </div>
              {i < 3 && <div style={{ ...s.stepLine, background: step > i ? "#e07a3a" : "#e8e0d8", marginBottom: 14 }} />}
            </div>
          ))}
        </div>

        {/* Step 0: Image upload */}
        {step === 0 && (
          <div style={s.card}>
            <h2 style={s.h2}>Upload your product image</h2>
            <p style={s.p}>Claude will analyze the image for colors, materials, style, and visual context — seeding better keywords automatically.</p>
            <div
              style={s.dropZone(dragOver)}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current.click()}
            >
              <div style={s.uploadIcon}>📷</div>
              <div style={s.uploadText}>Drop your product photo here</div>
              <div style={s.uploadSub}>JPG, PNG, WEBP · or click to browse</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button style={{ ...s.btnSecondary, fontSize: 13 }} onClick={() => setStep(1)}>
                Skip — no image →
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Q&A */}
        {step === 1 && (
          <>
            {image && (
              <div style={{ ...s.card, padding: 16, marginBottom: 12 }}>
                <img src={image.preview} alt="product" style={s.imgPreview} />
              </div>
            )}
            <div style={s.card}>
              <div style={s.progressRow}>
                <h2 style={{ ...s.h2, margin: 0, fontSize: 18 }}>Tell Claude about your product</h2>
                <span style={{ fontSize: 12, color: "#a39080", fontFamily: "sans-serif" }}>{filledCount}/{QUESTIONS.length} filled</span>
              </div>
              <p style={{ ...s.p, marginBottom: 24 }}>More detail = better keywords. Required fields are marked with ✶</p>

              {QUESTIONS.map((q) => (
                <div key={q.id} style={{ marginBottom: 20 }}>
                  {q.hint && (
                    <div style={{ background: "#fef6f0", border: "1px solid #fcd5b5", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#9a3412", fontFamily: "sans-serif", marginBottom: 6 }}>How to get these keywords in 30 seconds</div>
                      <div style={{ fontSize: 12, color: "#78716c", fontFamily: "sans-serif", lineHeight: 1.6 }}>
                        1. Open <strong>etsy.com</strong> in a new tab and click the search bar<br/>
                        2. Type your main product (e.g. <em>"printable planner"</em>)<br/>
                        3. Copy the autocomplete suggestions that drop down<br/>
                        4. Repeat with 2–3 variations (add "for", "gift", your style)<br/>
                        5. Paste everything below — Claude will use these as real buyer data
                      </div>
                    </div>
                  )}
                  <label style={s.qLabel}>
                    {q.label}
                    {q.required && <span style={s.qRequired}>✶ required</span>}
                  </label>
                  <textarea
                    style={{ ...s.qInput, minHeight: q.hint ? 90 : 60, borderColor: q.hint && answers[q.id]?.trim() ? "#e07a3a" : undefined }}
                    placeholder={q.placeholder}
                    value={answers[q.id] || ""}
                    onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                  />
                  {q.hint && answers[q.id]?.trim() && (
                    <div style={{ fontSize: 11, color: "#e07a3a", fontFamily: "sans-serif", marginTop: 4 }}>
                      ✓ {answers[q.id].split(",").filter(k => k.trim()).length} keyword phrases detected — Claude will prioritize these
                    </div>
                  )}
                </div>
              ))}

              <div style={s.nav}>
                <button style={s.btnSecondary} onClick={() => setStep(0)}>← Back</button>
                <button
                  style={{ ...s.btnPrimary, opacity: requiredFilled ? 1 : .45, cursor: requiredFilled ? "pointer" : "not-allowed" }}
                  disabled={!requiredFilled}
                  onClick={generate}
                >
                  Generate SEO ✦
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Generating */}
        {step === 2 && (
          <div style={{ ...s.card, textAlign: "center", padding: "60px 28px" }}>
            <div style={{ fontSize: 40, marginBottom: 20, animation: "spin 2s linear infinite", display: "inline-block" }}>✦</div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <h2 style={{ ...s.h2, marginBottom: 10 }}>Claude is crafting your SEO</h2>
            <p style={{ ...s.p, margin: 0 }}>Analyzing image · researching 2026 buyer intent · writing natural-language metadata…</p>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && result && (
          <>
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <h2 style={{ ...s.h2, fontSize: 18, marginBottom: 4 }}>SEO analysis complete</h2>
                  <p style={{ ...s.p, margin: 0 }}>Overall listing quality score</p>
                </div>
                <div style={{ textAlign: "center", background: "#fef6f0", border: "2px solid #fcd5b5", borderRadius: 12, padding: "10px 18px" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#e07a3a", lineHeight: 1 }}>{result.seoScore?.overallScore ?? "—"}</div>
                  <div style={{ fontSize: 10, color: "#a39080", fontFamily: "sans-serif", marginTop: 2, letterSpacing: ".06em", textTransform: "uppercase" }}>/ 100</div>
                </div>
              </div>
              <ScoreBar label="Title" score={result.seoScore?.titleScore ?? 80} />
              <ScoreBar label="Tags" score={result.seoScore?.tagScore ?? 80} />
              <ScoreBar label="Description" score={result.seoScore?.descriptionScore ?? 80} />
            </div>

            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={s.resultLabel}>Listing title</div>
                <CopyButton text={result.title} />
              </div>
              <div style={{ ...s.resultBox, fontSize: 15, fontWeight: 500, color: "#1c1917" }}>{result.title}</div>
              <div style={{ display: "flex", gap: 16, marginTop: 10, fontFamily: "sans-serif" }}>
                <span style={{ fontSize: 12, color: result.title?.length <= 140 ? "#16a34a" : "#dc2626" }}>
                  {result.title?.length ?? 0}/140 chars {result.title?.length <= 140 ? "✓" : "⚠ too long"}
                </span>
                <span style={{ fontSize: 12, color: "#a39080" }}>Primary keyword in first 40: {result.title?.substring(0, 40)}</span>
              </div>
            </div>

            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={s.resultLabel}>Tags ({result.tags?.length ?? 0}/13)</div>
                  <div style={{ fontSize: 11, color: "#a39080", fontFamily: "sans-serif", marginTop: 2 }}>Copy all — paste directly into Etsy tag field</div>
                </div>
                <CopyButton text={Array.isArray(result.tags) ? result.tags.join(",") : ""} />
              </div>
              <div>
                {result.tags?.map((tag, i) => (
                  <span key={i} style={s.tag}>
                    {tag}
                    <span style={{ color: tag.length > 20 ? "#dc2626" : "#a39080", fontSize: 10, marginLeft: 5 }}>{tag.length}</span>
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: "#a39080", fontFamily: "sans-serif" }}>
                {result.tags?.filter(t => t.length > 20).length === 0
                  ? "✓ All tags within 20-char limit"
                  : `⚠ ${result.tags.filter(t => t.length > 20).length} tag(s) exceed 20-char limit — review before pasting`}
              </div>
            </div>

            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={s.resultLabel}>Listing description</div>
                <CopyButton text={result.description} />
              </div>
              <div style={{ ...s.resultBox, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.75 }}>{result.description}</div>
            </div>

            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={s.resultLabel}>Image alt text</div>
                <CopyButton text={result.altText} />
              </div>
              <div style={s.resultBox}>{result.altText}</div>
            </div>

            {result.keyInsights?.length > 0 && (
              <div style={s.card}>
                <div style={{ ...s.resultLabel, marginBottom: 14 }}>SEO insights for this listing</div>
                {result.keyInsights.map((insight, i) => (
                  <div key={i} style={{ ...s.insight, borderBottom: i < result.keyInsights.length - 1 ? "1px solid #f0ebe4" : "none" }}>
                    <div style={s.insightDot} />
                    <div style={s.insightText}>{insight}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <button style={{ ...s.btnPrimary, flex: 1 }} onClick={() => { setStep(1); setResult(null); }}>
                ↩ Refine inputs
              </button>
              <button style={{ ...s.btnSecondary, flex: 1 }} onClick={reset}>
                + New listing
              </button>
            </div>
          </>
        )}

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", color: "#dc2626", fontSize: 13, fontFamily: "sans-serif", marginTop: 12 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
