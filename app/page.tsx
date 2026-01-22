"use client";

import { useState } from "react";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResults([]);
    setSelected(null);
  }

  async function generate() {
    if (!file) return;
    setLoading(true);
    setResults([]);
    setSelected(null);

    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("/api/designosaur", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setResults(data.images);
    setSelected(data.images[0]);
    setLoading(false);
  }

  return (
    <div className="wrap">
      <main className="card">
        <h1>Designosaur Me</h1>
        <p className="subtitle">
          Upload a photo → transform → pick your favorite → download.
        </p>

        <div className="imageArea">
          {!preview && (
            <label className="upload">
              🦖 Upload or drag image
              <input type="file" accept="image/*" onChange={onFileChange} />
            </label>
          )}

          {preview && !loading && (
            <img src={selected ?? preview} className="heroImage" />
          )}

          {loading && (
            <div className="loading">
              <div className="runner">🦖💨</div>
              <p>Chasing down your Designosaur… be cool.</p>
            </div>
          )}
        </div>

        {results.length > 1 && (
          <div className="thumbRow">
            {results.map((img, i) => (
              <img
                key={i}
                src={img}
                className={`thumb ${img === selected ? "active" : ""}`}
                onClick={() => setSelected(img)}
              />
            ))}
          </div>
        )}

        <button
          disabled={!file || loading}
          className="primary"
          onClick={results.length ? undefined : generate}
        >
          {results.length ? "Download" : "Designosaur Me"}
        </button>

        {results.length > 0 && (
          <button className="secondary" onClick={generate}>
            Generate another
          </button>
        )}

        <p className="privacy">
          Privacy: this prototype doesn’t save your upload. It sends your image
          to an AI provider to generate the output.
        </p>
      </main>

      <style jsx>{`
        .wrap {
          min-height: 100vh;
          background: #ff6f61;
          padding: 24px;
        }

        .wrap::before {
          content: "";
          position: fixed;
          inset: 0;
          background-image: url("/raptor-track.png");
          opacity: 0.12;
          transform: rotate(-10deg);
          pointer-events: none;
        }

        .card {
          max-width: 720px;
          margin: auto;
          background: #fff7e6;
          padding: 24px;
          border-radius: 24px;
          position: relative;
          z-index: 1;
        }

       h1 {
  font-family: var(--font-erica), system-ui, -apple-system, Segoe UI,
    Roboto, Arial, sans-serif;

  /* Optical fixes */
  font-size: clamp(2.1rem, 7vw, 3.4rem);
  letter-spacing: -0.02em;
  line-height: 0.9;

  /* Color + rendering */
  color: #111;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;

  text-align: center;
  margin-bottom: 6px;
}


        .subtitle {
          text-align: center;
  color: #444;
  font-size: 0.95rem;
          margin-bottom: 16px;
        }


        .imageArea {
          border: 2px dashed #ccc;
          border-radius: 16px;
          padding: 12px;
          min-height: 260px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .upload input {
          display: none;
        }

        .upload {
          cursor: pointer;
          font-size: 1.1rem;
        }

        .heroImage {
          width: 100%;
          max-height: 55vh;
          object-fit: contain;
          border-radius: 12px;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .runner {
          font-size: 2rem;
          animation: run 1s linear infinite;
        }

        @keyframes run {
          from {
            transform: translateX(-40px);
          }
          to {
            transform: translateX(40px);
          }
        }

        .thumbRow {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          justify-content: center;
        }

        .thumb {
          height: 72px;
          border-radius: 8px;
          cursor: pointer;
          opacity: 0.8;
        }

        .thumb.active {
          outline: 3px solid #1f2d1f;
          opacity: 1;
        }

        .primary {
          margin-top: 16px;
          width: 100%;
          padding: 14px;
          background: #1f2d1f;
          color: white;
          border-radius: 12px;
          font-size: 1.1rem;
        }

        .secondary {
          margin-top: 8px;
          background: none;
          border: none;
          color: #1f2d1f;
          text-decoration: underline;
          cursor: pointer;
        }

        .privacy {
          font-size: 0.8rem;
          text-align: center;
          margin-top: 12px;
        }
      `}</style>
    </div>
  );
}
