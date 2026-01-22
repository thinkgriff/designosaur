"use client";

import React, { useRef, useState } from "react";

type Phase = "idle" | "ready" | "transforming" | "done";

export default function Page() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [results, setResults] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const selected = results[selectedIdx] ?? null;
  const isLoading = phase === "transforming";

  async function resizeImage(input: File, max = 900): Promise<File> {
    const bitmap = await createImageBitmap(input);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85)
    );

    return new File([blob], "designosaur-input.jpg", { type: "image/jpeg" });
  }

  function cleanupPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }

  function hardResetToUploadState(message: string) {
    setError(message);
    setResults([]);
    setSelectedIdx(0);

    setFile(null);
    cleanupPreview();
    setPreviewUrl(null);

    setPhase("idle");
  }

  async function onPickFile(f: File | null) {
    setError(null);
    setResults([]);
    setSelectedIdx(0);

    if (!f) {
      setFile(null);
      cleanupPreview();
      setPreviewUrl(null);
      setPhase("idle");
      return;
    }

    const resized = await resizeImage(f);
    setFile(resized);

    cleanupPreview();
    setPreviewUrl(URL.createObjectURL(resized));

    setPhase("ready");
  }

  async function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    await onPickFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  }

  async function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    await onPickFile(e.dataTransfer.files?.[0] ?? null);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function pickFile() {
    inputRef.current?.click();
  }

  async function generateThree() {
    if (!file || isLoading) return;

    setError(null);
    setResults([]);
    setSelectedIdx(0);
    setPhase("transforming");

    try {
      const form = new FormData();
      form.append("image", file);

      const res = await fetch("/api/designosaur", { method: "POST", body: form });
      const data = await res.json().catch(() => ({} as any));

      // RATE LIMITED: wipe the UI and stop
      if (res.status === 429) {
        hardResetToUploadState(
          data?.error || "Too many dinos 🦖💨 Please try again later."
        );
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || `Generation failed (${res.status})`);
      }

      const imgs = Array.isArray(data?.images) ? (data.images as string[]) : [];
      if (!imgs.length) throw new Error("No images returned");

      setResults(imgs);
      setSelectedIdx(0);
      setPhase("done");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
      setPhase(file ? "ready" : "idle");
    } finally {
      // If we hard-reset due to 429, phase is already idle.
      setPhase((p) => (p === "transforming" ? (file ? "ready" : "idle") : p));
    }
  }

  function downloadSelected() {
    const url = selected;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "designosaur-me.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const primaryDisabled = !file || isLoading;

  return (
    <main className="wrap">
      <div className="card">
        <h1 className="title">Designosaur Me</h1>
        <p className="subtitle">
          Upload a photo → transform → pick your favorite → download.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="file"
          onChange={onInputChange}
        />

        <div className="drop" onClick={pickFile} onDrop={onDrop} onDragOver={onDragOver}>
          {!previewUrl && !selected ? (
            <div className="placeholder">
              <div className="emoji">🦖</div>
              <div className="prompt">Upload or drag image</div>
            </div>
          ) : (
            <img
              src={selected ?? previewUrl ?? ""}
              alt="Designosaur preview"
              className="heroImage"
            />
          )}

          {isLoading && (
            <div className="overlay">
              <div className="overlayText">
                <strong>Chasing down your Designosaur…</strong>
                <div>This can take a minute. Be cool.</div>
              </div>
              <RunningDino />
            </div>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        {results.length > 1 && (
          <div className="thumbRow" aria-label="Pick your favorite">
            {results.map((u, i) => (
              <button
                key={u + i}
                type="button"
                className={`thumb ${i === selectedIdx ? "active" : ""}`}
                onClick={() => setSelectedIdx(i)}
                aria-label={`Result ${i + 1}`}
              >
                <img src={u} alt={`Result ${i + 1}`} />
              </button>
            ))}
          </div>
        )}

        {/* Primary CTA: hidden when rate-limited because file is cleared */}
        <button
          className="primary"
          disabled={primaryDisabled}
          onClick={() => {
            if (!file || isLoading) return;
            if (results.length) downloadSelected();
            else generateThree();
          }}
        >
          {results.length ? "Download" : "Designosaur Me"}
        </button>

        {results.length > 0 && (
          <button className="secondary" onClick={generateThree} disabled={isLoading}>
            Generate another
          </button>
        )}

        <p className="privacy">
          Privacy: this prototype doesn’t save your upload. It sends your image to an AI provider
          to generate the output.
        </p>
      </div>

      <style jsx>{`
        .wrap {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 18px;
          background-color: #ff6f61;
          position: relative;
          overflow: hidden;
        }

        .wrap::before {
          content: "";
          position: fixed;
          inset: 0;
          background-image: url("/raptor-track.png");
          background-repeat: no-repeat;
          background-size: cover;
          opacity: 0.12;
          transform: rotate(-10deg);
          z-index: 0;
          pointer-events: none;
        }

        .card {
          position: relative;
          z-index: 1;
          width: min(720px, 100%);
          background: #fff6e4;
          border-radius: 20px;
          padding: 22px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.15);
        }

        .title {
          font-family: var(--font-erica), system-ui, -apple-system, Segoe UI, Roboto, Arial,
            sans-serif;
          font-size: clamp(2.1rem, 7vw, 3.4rem);
          line-height: 0.92;
          letter-spacing: -0.02em;
          text-align: center;
          margin: 0 0 6px 0;
          color: #111;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        .subtitle {
          text-align: center;
          opacity: 0.75;
          margin: 0 0 14px 0;
          font-size: 0.98rem;
        }

        .file {
          display: none;
        }

        .drop {
          position: relative;
          border: 2px dashed rgba(0, 0, 0, 0.22);
          border-radius: 16px;
          background: #f3f3f3;
          overflow: hidden;
          cursor: pointer;

          max-height: 58vh;
          min-height: 260px;
          display: grid;
          place-items: center;
        }

        .placeholder {
          text-align: center;
          font-weight: 800;
          padding: 28px 18px;
        }

        .emoji {
          font-size: 36px;
          margin-bottom: 8px;
        }

        .prompt {
          font-size: 1.05rem;
        }

        .heroImage {
          width: 100%;
          height: 100%;
          max-height: 58vh;
          object-fit: contain;
          background: white;
          display: block;
        }

        .overlay {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.86);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 10px;
          text-align: center;
          padding: 16px;
        }

        .overlayText {
          text-align: center;
        }

        .thumbRow {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .thumb {
          border-radius: 12px;
          border: 2px solid rgba(0, 0, 0, 0.16);
          overflow: hidden;
          background: white;
          cursor: pointer;
          aspect-ratio: 1 / 1;
          display: grid;
          place-items: center;
          padding: 0;
        }

        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: white;
          display: block;
        }

        .thumb.active {
          border-color: rgba(0, 0, 0, 0.85);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.16);
        }

        .primary {
          width: 100%;
          margin-top: 14px;
          padding: 14px;
          background: #1f2a1f;
          color: white;
          border-radius: 12px;
          font-weight: 900;
          border: none;
          cursor: pointer;
          font-size: 1.05rem;
        }

        .primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .secondary {
          display: block;
          margin: 8px auto 0;
          background: none;
          border: none;
          text-decoration: underline;
          cursor: pointer;
          font-weight: 800;
          color: #1f2a1f;
        }

        .error {
          margin-top: 10px;
          color: #b00020;
          font-weight: 900;
          text-align: center;
        }

        .privacy {
          margin-top: 14px;
          font-size: 12px;
          text-align: center;
          opacity: 0.62;
        }

        @media (max-width: 480px) {
          .card {
            padding: 16px;
            border-radius: 18px;
          }
          .thumb {
            aspect-ratio: 4 / 3;
          }
        }
      `}</style>
    </main>
  );
}

function RunningDino() {
  return (
    <div style={{ width: 260, overflow: "hidden" }}>
      <div style={{ fontSize: 32, animation: "run 1s linear infinite", transform: "scaleX(-1)" }}>
        🦖
      </div>
      <style jsx>{`
        @keyframes run {
          from {
            transform: translateX(-40px) scaleX(-1);
          }
          to {
            transform: translateX(300px) scaleX(-1);
          }
        }
      `}</style>
    </div>
  );
}
