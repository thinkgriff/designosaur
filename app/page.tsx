"use client";

import { useState } from "react";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
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
    setResults(data.images || []);
    setSelected(data.images?.[0] || null);
    setLoading(false);
  }

  function handleFileChange(file: File) {
    setFile(file);
    setPreview(URL.createObjectURL(file));
    setResults([]);
    setSelected(null);
  }

  return (
    <main className="wrap">
      <div className="card">
        <h1>Designosaur Me</h1>
        <p className="subtitle">
          Upload a photo → transform → pick your favorite → download.
        </p>

        <div className="imageBox">
          {!preview && !loading && (
            <label className="drop">
              🦖 Upload or drag image
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) =>
                  e.target.files && handleFileChange(e.target.files[0])
                }
              />
            </label>
          )}

          {preview && !loading && (
            <img src={preview} alt="Preview" className="mainImage" />
          )}

          {loading && (
            <div className="loading">
              <div className="dino">🦖💨</div>
              <p>Chasing down your Designosaur… be cool.</p>
            </div>
          )}

          {selected && !loading && (
            <img src={selected} alt="Result" className="mainImage" />
          )}
        </div>

        {results.length > 1 && (
          <div className="thumbRow">
            {results.map((img, i) => (
              <img
                key={i}
                src={img}
                className={img === selected ? "thumb active" : "thumb"}
                onClick={() => setSelected(img)}
              />
            ))}
          </div>
        )}

        {!selected && (
          <button disabled={!file || loading} onClick={handleGenerate}>
            Designosaur Me
          </button>
        )}

        {selected && (
          <>
            <a href={selected} download="designosaur.png">
              <button>Download</button>
            </a>
            <button
              className="secondary"
              onClick={handleGenerate}
              disabled={loading}
            >
              Generate another
            </button>
          </>
        )}

        <p className="privacy">
          Privacy: this prototype doesn’t save your upload. It sends your image
          to an AI provider to generate the output.
        </p>
      </div>
    </main>
  );
}
