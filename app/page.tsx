"use client";

import React, { useRef, useState } from "react";
import { Erica_One } from "next/font/google";

const erica = Erica_One({ weight: "400", subsets: ["latin"] });

type Phase = "idle" | "ready" | "transforming" | "done" | "error";

function b64ToObjectUrl(b64: string) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "image/png" });
  return URL.createObjectURL(blob);
}

export default function Page() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [resizedFile, setResizedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const selectedResult = resultUrls[selectedIdx] ?? null;
  const shownImage = selectedResult ?? previewUrl;

  async function resizeImage(file: File, max = 768): Promise<File> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.82)
    );

    return new File([blob], "designosaur-input.jpg", { type: "image/jpeg" });
  }

  function cleanupResultUrls(urls: string[]) {
    for (const u of urls) URL.revokeObjectURL(u);
  }

  async function handleFile(file: File | null) {
    setError(null);

    // clear results
    cleanupResultUrls(resultUrls);
    setResultUrls([]);
    setSelectedIdx(0);

    if (!file) {
      setResizedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPhase("idle");
      return;
    }

    const resized = await resizeImage(file);
    setResizedFile(resized);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(resized));

    setPhase("ready");
  }

  async function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    await handleFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  }

  async function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    await handleFile(e.dataTransfer.files?.[0] ?? null);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function pickFile() {
    inputRef.current?.click();
  }

  async function generate() {
    if (!resizedFile) return;

    setPhase("transforming");
    setError(null);

    // clear prior results
    cleanupResultUrls(resultUrls);
    setResultUrls([]);
    setSelectedIdx(0);

    try {
      const form = new FormData();
      form.append("userImage", resizedFile);

      const res = await fetch("/api/designosaur", { method: "POST", body: form });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Generation failed");
      }

      const data = (await res.json()) as { images: string[] };
      const urls = (data.images || []).slice(0, 3).map(b64ToObjectUrl);

      if (urls.length === 0) throw new Error("No images returned");

      setResultUrls(urls);
      setSelectedIdx(0);
      setPhase("done");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setPhase("error");
    }
  }

  function regenerate() {
    generate();
  }

  function download() {
    if (!selectedResult) return;
    const a = document.createElement("a");
    a.href = selectedResult;
    a.download = "designosaur-me.png";
    a.click();
  }

  const canGenerate = !!resizedFile && phase !== "transforming";

  return (
    <main className="wrap">
      <div className="card">
        <h1 className={`${erica.className} title`}>Designosaur Me</h1>
        <p className="subtitle">Upload a photo → transform → pick your favorite → download.</p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="file"
          onChange={onInputChange}
        />

        <div
          className="drop"
          onClick={pickFile}
          onDrop={onDrop}
          onDragOver={onDragOver}
          role="button"
          tabIndex={0}
        >
          {!shownImage ? (
            <div className="placeholder">
              <div className="icon">🦖</div>
              <div className="text">Upload or drag image</div>
            </div>
          ) : (
            <>
              <img src={shownImage} className="preview" alt="Preview" />
              {phase === "transforming" && (
                <div className="overlay">
                  <div className="overlayText">
                    <strong>Chasing down your Designosaur…</strong>
                    <div>This can take a minute. Be cool.</div>
                  </div>
                  <RunningDino />
                </div>
              )}
            </>
          )}
        </div>

        {/* 3-up results chooser */}
        {phase === "done" && resultUrls.length > 0 && (
          <div className="grid" aria-label="Pick your favorite">
            {resultUrls.map((u, i) => (
              <button
                key={u}
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

        <button
          className="cta"
          disabled={!canGenerate}
          onClick={phase === "done" ? download : generate}
        >
          {phase === "done" ? "Download" : "Designosaur Me"}
        </button>

        {phase === "done" && (
          <button className="secondary" onClick={regenerate}>
            Generate another
          </button>
        )}

        {error && <div className="error">{error}</div>}

        <div className="footnote">
          Privacy: this prototype doesn’t save your upload. It sends your image to an AI provider to generate the output.
        </div>
      </div>

      <style jsx>{`
        .wrap {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
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
          padding: 24px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.15);
        }

        .title {
          text-align: center;
          font-size: 56px;
          margin: 0;
        }

        .subtitle {
          text-align: center;
          opacity: 0.7;
          margin-bottom: 16px;
        }

        .file {
          display: none;
        }

        .drop {
          position: relative;
          aspect-ratio: 4 / 3;
          border: 2px dashed rgba(0, 0, 0, 0.25);
          border-radius: 16px;
          display: grid;
          place-items: center;
          cursor: pointer;
          background: #f4f4f4;
          overflow: hidden;
        }

        .placeholder {
          text-align: center;
          font-weight: 700;
        }

        .icon {
          font-size: 36px;
        }

        .preview {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: white;
        }

        .overlay {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.85);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 12px;
          text-align: center;
        }

        .grid {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .thumb {
  padding: 0;
  border-radius: 12px;
  border: 2px solid rgba(0, 0, 0, 0.18);
  overflow: hidden;
  background: white;
  cursor: pointer;
  aspect-ratio: 4 / 3;
  display: grid;
  place-items: center;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: white;
}


        .thumb.active {
          border-color: rgba(0, 0, 0, 0.8);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
        }

        .cta {
          width: 100%;
          margin-top: 16px;
          padding: 14px;
          background: #1f2a1f;
          color: white;
          border-radius: 12px;
          font-weight: 900;
          border: none;
          cursor: pointer;
        }

        .cta:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .secondary {
          display: block;
          margin: 10px auto 0;
          background: none;
          border: none;
          text-decoration: underline;
          cursor: pointer;
          font-weight: 800;
        }

        .error {
          margin-top: 12px;
          color: #b00020;
          font-weight: 700;
        }

        .footnote {
          margin-top: 16px;
          font-size: 12px;
          text-align: center;
          opacity: 0.6;
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
