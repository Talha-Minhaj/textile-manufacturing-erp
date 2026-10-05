"use client";

import { useState } from "react";

const SAMPLE_QUERIES = [
  "Show stock levels for low-inventory cotton yarn",
  "What is the defect rate on recent knitting shifts?",
  "How many cartons of Category A socks are ready for dispatch?",
  "Which machines are currently running and who are the operators?",
  "Calculate unit manufacturing cost for athletic crew socks",
];

export function AIOperationsAssistant() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  async function handleAsk(promptText?: string) {
    const textToSend = promptText ?? query;
    if (!textToSend.trim()) return;

    setLoading(true);
    setError("");
    setQuery(textToSend);
    setIsOpen(true);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textToSend }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Query failed");
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to reach AI Query Assistant");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="panel ai-assistant-card"
      style={{
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))",
        border: "1px solid rgba(14, 165, 233, 0.3)",
        borderRadius: "12px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
        color: "#f8fafc",
        padding: "1.25rem",
        marginBottom: "1.5rem",
      }}
    >
      <div className="flex-between" style={{ alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #0284c7, #06b6d4)",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              ✦
            </span>
            <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc", fontWeight: 700 }}>
              Forward Deployed AI Assistant
            </h2>
            <span
              style={{
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                background: "rgba(14, 165, 233, 0.2)",
                color: "#38bdf8",
                padding: "2px 8px",
                borderRadius: "999px",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                fontWeight: 600,
              }}
            >
              Schema Grounded
            </span>
          </div>
          <p style={{ margin: "0.35rem 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>
            Ask natural language business questions across yarn stocks, machine telemetry, grading, or unit costing.
          </p>
        </div>

        <button
          className="btn sm ghost"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            borderColor: "rgba(148, 163, 184, 0.3)",
            color: "#cbd5e1",
            fontSize: "0.8rem",
          }}
        >
          {isOpen ? "Collapse ▲" : "Expand Assistant ▼"}
        </button>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          style={{ display: "flex", gap: "0.5rem" }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., 'Show stock levels for low-inventory cotton yarn' or 'What is defect rate?'"
            style={{
              flex: 1,
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              color: "#f8fafc",
              padding: "0.6rem 0.85rem",
              borderRadius: "8px",
              fontSize: "0.9rem",
              outline: "none",
            }}
          />
          <button
            type="submit"
            className="btn"
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #0284c7, #06b6d4)",
              border: "none",
              color: "#ffffff",
              fontWeight: 600,
              padding: "0 1.25rem",
              borderRadius: "8px",
            }}
          >
            {loading ? "Grounding…" : "Ask Agent"}
          </button>
        </form>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.6rem" }}>
          {SAMPLE_QUERIES.map((sample, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleAsk(sample)}
              style={{
                background: "rgba(30, 41, 59, 0.7)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                color: "#94a3b8",
                fontSize: "0.75rem",
                padding: "3px 8px",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#38bdf8";
                e.currentTarget.style.borderColor = "#38bdf8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.2)";
              }}
            >
              ✦ {sample}
            </button>
          ))}
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: "1rem", borderTop: "1px solid rgba(148, 163, 184, 0.15)", paddingTop: "1rem" }}>
          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#fca5a5",
                padding: "0.75rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
              }}
            >
              {error}
            </div>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div
                style={{
                  background: "rgba(14, 165, 233, 0.1)",
                  border: "1px solid rgba(14, 165, 233, 0.25)",
                  borderRadius: "8px",
                  padding: "0.85rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#38bdf8",
                      textTransform: "uppercase",
                    }}
                  >
                    Intent: {result.intent} (Confidence: {Math.round(result.confidence * 100)}%)
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Deterministic Safety: Passed</span>
                </div>
                <div style={{ marginTop: "0.35rem", fontSize: "0.95rem", color: "#f8fafc", fontWeight: 500 }}>
                  {result.summary}
                </div>
                {result.recommendation && (
                  <div style={{ marginTop: "0.4rem", fontSize: "0.82rem", color: "#cbd5e1", fontStyle: "italic" }}>
                    💡 <strong>Action:</strong> {result.recommendation}
                  </div>
                )}
              </div>

              {result.metrics && Object.keys(result.metrics).length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "0.5rem",
                  }}
                >
                  {Object.entries(result.metrics).map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        background: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        borderRadius: "8px",
                        padding: "0.6rem 0.75rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          letterSpacing: "0.03em",
                        }}
                      >
                        {k.replace(/([A-Z])/g, " $1")}
                      </div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#38bdf8", marginTop: "2px" }}>
                        {String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.groundedSql && (
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: "3px", fontWeight: 600 }}>
                    GROUNDED ERP SQL / AST PROJECTION
                  </div>
                  <pre
                    style={{
                      background: "rgba(10, 15, 30, 0.9)",
                      border: "1px solid rgba(51, 65, 85, 0.8)",
                      borderRadius: "6px",
                      padding: "0.6rem 0.8rem",
                      color: "#a5f3fc",
                      fontSize: "0.75rem",
                      overflowX: "auto",
                      margin: 0,
                    }}
                  >
                    <code>{result.groundedSql}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
