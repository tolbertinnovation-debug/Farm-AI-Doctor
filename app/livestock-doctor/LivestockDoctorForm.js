"use client";

import { useState } from "react";

const ANIMALS = ["Goat", "Sheep", "Cow", "Pig", "Chicken", "Duck", "Rabbit", "Other"];

export default function LivestockDoctorForm() {
  const [animalType, setAnimalType] = useState("Goat");
  const [otherAnimal, setOtherAnimal] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function onFile(e) {
    const f = e.target.files && e.target.files[0];
    setResult(null);
    setError("");
    if (preview) {
      try { URL.revokeObjectURL(preview); } catch {}
    }
    if (!f) {
      setPhoto(null);
      setPreview("");
      return;
    }
    if (!f.type.startsWith("image/")) {
      setPhoto(null);
      setPreview("");
      setError("Pick a photo (JPG or PNG).");
      try { e.target.value = ""; } catch {}
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      setPhoto(null);
      setPreview("");
      setError("Photo is too big. Pick one under 4 MB.");
      try { e.target.value = ""; } catch {}
      return;
    }
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    const finalAnimal = animalType === "Other" ? otherAnimal.trim() : animalType.trim();
    if (finalAnimal.length < 2) {
      setError("Write animal type, like Goat.");
      return;
    }
    if (!description.trim() && !photo) {
      setError("Write signs or add a photo.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("animalType", finalAnimal);
      fd.append("description", description);
      if (photo) fd.append("photo", photo);
      const res = await fetch("/api/livestock-doctor", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not check. Try again.");
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
          <label htmlFor="animalType" className="font-bold">Animal</label>
          <select id="animalType" value={animalType} onChange={(e) => setAnimalType(e.target.value)} className="mt-1 w-full rounded-xl border p-4 text-lg">
            {ANIMALS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        {animalType === "Other" ? (
          <div>
            <label htmlFor="otherAnimal" className="font-bold">Which animal?</label>
            <input id="otherAnimal" value={otherAnimal} onChange={(e) => setOtherAnimal(e.target.value)} placeholder="Rabbit" className="mt-1 w-full rounded-xl border p-4 text-lg" />
          </div>
        ) : null}
        <div>
          <label htmlFor="signs" className="font-bold">Signs (what is wrong?)</label>
          <textarea id="signs" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Not eating, cough, runny nose" rows={3} className="mt-1 w-full rounded-xl border p-4 text-lg" />
        </div>
        <div>
          <label htmlFor="animalPhoto" className="font-bold">Photo (optional)</label>
          <input id="animalPhoto" type="file" accept="image/*" capture="environment" onChange={onFile} className="mt-1 w-full rounded-xl border p-4 text-lg" />
        </div>
        {preview ? <img src={preview} alt="Animal preview" className="w-full rounded-xl border" style={{ maxHeight: "320px", objectFit: "cover" }} /> : null}
        {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-green-700 px-4 py-4 text-lg font-bold text-white disabled:opacity-50">
          {loading ? "Checking animal..." : "Check my animal"}
        </button>
      </form>
      {result ? (
        <div aria-live="polite" className="mt-4 rounded-xl border-2 border-green-700 p-4">
          <p className="text-xl font-bold">Likely cause: {result.cause}</p>
          <p className="mt-1">Sure: {result.confidence}</p>
          {result.firstAid ? <p className="mt-2 text-lg">First aid: {result.firstAid}</p> : null}
          {result.callVet ? <p className="mt-2 text-lg">Call a vet: {result.callVet}</p> : null}
          {result.seen ? <p className="mt-2">Seen: {result.seen}</p> : null}
          <p className="mt-2 text-sm">Saved to Recent checks on your farm page.</p>
        </div>
      ) : null}
    </div>
  );
}