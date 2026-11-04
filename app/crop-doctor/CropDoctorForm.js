"use client";

import { useState } from "react";

export default function CropDoctorForm() {
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [cropName, setCropName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function onFile(e) {
    const f = e.target.files && e.target.files[0];
    setResult(null);
    setError("");
    if (!f) {
      setPhoto(null);
      setPreview("");
      return;
    }
    if (!f.type.startsWith("image/")) {
      setError("Pick a photo (JPG or PNG).");
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      setError("Photo is too big. Pick one under 4 MB.");
      return;
    }
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!photo) {
      setError("Pick a leaf photo first.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("photo", photo);
      fd.append("name", cropName);
      const res = await fetch("/api/crop-doctor", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not diagnose. Try again.");
        setLoading(false);
        return;
      }
      setResult(data);
    } catch {
      setError("No internet. Try again.");
    }
    setLoading(false);
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="leafPhoto" className="font-bold">Leaf photo</label>
          <input id="leafPhoto" type="file" accept="image/*" capture="environment" onChange={onFile} className="mt-1 w-full rounded-xl border p-4 text-lg" />
        </div>
        {preview ? <img src={preview} alt="Leaf preview" className="w-full rounded-xl border" /> : null}
        <div>
          <label htmlFor="cropName" className="font-bold">Crop name (optional)</label>
          <input id="cropName" value={cropName} onChange={(e) => setCropName(e.target.value)} placeholder="Cassava" className="mt-1 w-full rounded-xl border p-4 text-lg" />
        </div>
        {error ? <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-green-700 px-4 py-4 text-lg font-bold text-white disabled:opacity-50">
          {loading ? "Checking leaf..." : "Check my crop"}
        </button>
      </form>
      {result ? (
        <div aria-live="polite" className="mt-4 rounded-xl border-2 border-green-700 p-4">
          <p className="text-xl font-bold">Disease: {result.disease}</p>
          <p className="mt-1">Sure: {result.confidence}</p>
          {result.treatment ? <p className="mt-2 text-lg">Do this: {result.treatment}</p> : null}
          {result.seen ? <p className="mt-2">Seen: {result.seen}</p> : null}
          {result.outlineNote ? <p className="mt-2 text-sm">{result.outlineNote}</p> : null}
          <p className="mt-2 text-sm">Saved to Recent checks on your farm page.</p>
        </div>
      ) : null}
    </div>
  );
}