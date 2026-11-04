"use client";

import { useState } from "react";

export default function FarmManager({ initialCrops, initialAnimals }) {
  const [crops, setCrops] = useState(initialCrops || []);
  const [animals, setAnimals] = useState(initialAnimals || []);
  const [cropName, setCropName] = useState("");
  const [cropDetails, setCropDetails] = useState("");
  const [animalType, setAnimalType] = useState("Chicken");
  const [customAnimalType, setCustomAnimalType] = useState("");
  const [animalCount, setAnimalCount] = useState("1");
  const [animalDetails, setAnimalDetails] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function addCrop(e) {
    e.preventDefault();
    setMsg("");
    if (cropName.trim().length < 2) {
      setMsg("Write crop name, like Cassava.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/crops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cropName, details: cropDetails })
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Could not save crop.");
        setLoading(false);
        return;
      }
      setCrops([data.crop, ...crops]);
      setCropName("");
      setCropDetails("");
      setMsg("Crop saved.");
    } catch {
      setMsg("No internet. Try again.");
    }
    setLoading(false);
  }

  async function deleteCrop(id) {
    if (!confirm("Remove this crop?")) return;
    setMsg("");
    try {
      const res = await fetch("/api/crops/" + id, { method: "DELETE" });
      if (!res.ok) {
        setMsg("Could not remove.");
        return;
      }
      setCrops(crops.filter((c) => c.id !== id));
    } catch {
      setMsg("No internet. Try again.");
    }
  }

  async function addAnimal(e) {
    e.preventDefault();
    setMsg("");
    const n = Number(animalCount);
    const finalType = animalType === "Other" ? customAnimalType.trim() : animalType.trim();
    if (finalType.length < 2) {
      setMsg("Write animal type, like Goat.");
      return;
    }
    if (!Number.isInteger(n) || n < 1) {
      setMsg("Write how many, like 5.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/animals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: finalType, count: n, details: animalDetails })
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Could not save animal.");
        setLoading(false);
        return;
      }
      setAnimals([data.animal, ...animals]);
      setAnimalDetails("");
      setAnimalCount("1");
      setCustomAnimalType("");
      setMsg("Animal saved.");
    } catch {
      setMsg("No internet. Try again.");
    }
    setLoading(false);
  }

  async function deleteAnimal(id) {
    if (!confirm("Remove this animal?")) return;
    setMsg("");
    try {
      const res = await fetch("/api/animals/" + id, { method: "DELETE" });
      if (!res.ok) {
        setMsg("Could not remove.");
        return;
      }
      setAnimals(animals.filter((a) => a.id !== id));
    } catch {
      setMsg("No internet. Try again.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold">My crops 🌱</h2>
        <form onSubmit={addCrop} className="mt-3 space-y-3">
          <div>
            <label htmlFor="cropName" className="font-bold">Crop name</label>
            <input id="cropName" value={cropName} onChange={(e) => setCropName(e.target.value)} placeholder="Cassava" className="mt-1 w-full rounded-xl border p-4 text-lg" />
          </div>
          <div>
            <label htmlFor="cropDetails" className="font-bold">Note (optional)</label>
            <input id="cropDetails" value={cropDetails} onChange={(e) => setCropDetails(e.target.value)} placeholder="Planted in May" className="mt-1 w-full rounded-xl border p-4 text-lg" />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-green-700 px-4 py-4 text-lg font-bold text-white disabled:opacity-50">
            Add crop
          </button>
        </form>
        {crops.length === 0 ? (
          <p className="mt-3">No crops yet. Add your first crop above.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {crops.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border p-3">
                <div>
                  <p className="font-bold">{c.name}</p>
                  {c.details ? <p className="text-sm">{c.details}</p> : null}
                </div>
                <button onClick={() => deleteCrop(c.id)} className="rounded-xl border-2 border-red-600 px-4 py-3 font-bold text-red-700" aria-label={"Remove " + c.name}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold">My animals 🐐</h2>
        <form onSubmit={addAnimal} className="mt-3 space-y-3">
          <div>
            <label htmlFor="animalType" className="font-bold">Animal</label>
            <select id="animalType" value={animalType} onChange={(e) => setAnimalType(e.target.value)} className="mt-1 w-full rounded-xl border p-4 text-lg">
              <option>Chicken</option>
              <option>Goat</option>
              <option>Sheep</option>
              <option>Cow</option>
              <option>Pig</option>
              <option>Duck</option>
              <option>Other</option>
            </select>
          </div>
          {animalType === "Other" ? (
            <div>
              <label htmlFor="customAnimalType" className="font-bold">Which animal?</label>
              <input id="customAnimalType" value={customAnimalType} onChange={(e) => setCustomAnimalType(e.target.value)} placeholder="Rabbit" className="mt-1 w-full rounded-xl border p-4 text-lg" />
            </div>
          ) : null}
          <div>
            <label htmlFor="animalCount" className="font-bold">How many</label>
            <input id="animalCount" type="number" min="1" max="100000" value={animalCount} onChange={(e) => setAnimalCount(e.target.value)} className="mt-1 w-full rounded-xl border p-4 text-lg" />
          </div>
          <div>
            <label htmlFor="animalDetails" className="font-bold">Note (optional)</label>
            <input id="animalDetails" value={animalDetails} onChange={(e) => setAnimalDetails(e.target.value)} placeholder="2 sick" className="mt-1 w-full rounded-xl border p-4 text-lg" />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-green-700 px-4 py-4 text-lg font-bold text-white disabled:opacity-50">
            Add animal
          </button>
        </form>
        {animals.length === 0 ? (
          <p className="mt-3">No animals yet. Add them above.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {animals.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl border p-3">
                <div>
                  <p className="font-bold">{a.type} × {a.count}</p>
                  {a.details ? <p className="text-sm">{a.details}</p> : null}
                </div>
                <button onClick={() => deleteAnimal(a.id)} className="rounded-xl border-2 border-red-600 px-4 py-3 font-bold text-red-700" aria-label={"Remove " + a.type}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {msg ? <p className="rounded-xl bg-green-50 p-3">{msg}</p> : null}
    </div>
  );
}