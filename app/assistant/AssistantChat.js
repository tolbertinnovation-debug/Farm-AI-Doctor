"use client";
import { useState, useRef } from "react";

function encodeWav(samples, sampleRate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  function wstr(o, s) { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
  wstr(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  wstr(8, "WAVE");
  wstr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  wstr(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

async function blobTo16kWav(blob) {
  const ab = await blob.arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const audio = await ctx.decodeAudioData(ab.slice(0));
  const len = Math.max(1, Math.ceil(audio.duration * 16000));
  const off = new OfflineAudioContext(1, len, 16000);
  const src = off.createBufferSource();
  src.buffer = audio;
  src.connect(off.destination);
  src.start(0);
  const done = await off.startRendering();
  const data = done.getChannelData(0);
  try { ctx.close(); } catch {}
  return encodeWav(data, 16000);
}

function MessageText({ text }) {
  const parts = String(text || "").split("```");
  return (
    <div className="space-y-2">
      {parts.map((p, i) => {
        if (i % 2 === 1) {
          return <pre key={i} className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-sm text-white" style={{ whiteSpace: "pre-wrap" }}>{p.trim()}</pre>;
        }
        return <p key={i} style={{ whiteSpace: "pre-wrap" }}>{p}</p>;
      })}
    </div>
  );
}

export default function AssistantChat() {
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Hello! Ask me about crops or animals. Example: my cassava leaves turn yellow, what do I do?" }]);
  const [input, setInput] = useState("");
  const [docText, setDocText] = useState("");
  const [docName, setDocName] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voicing, setVoicing] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  async function send(text) {
    const q = String(text || input).trim();
    if (!q || loading) return;
    setError("");
    const next = [...msgs, { role: "user", content: q.slice(0, 2000) }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, docText })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not answer. Try again.");
        setLoading(false);
        return;
      }
      setMsgs([...next, { role: "assistant", content: data.answer }]);
    } catch {
      setError("No internet. Try again.");
    }
    setLoading(false);
  }

  async function onDoc(e) {
    const f = e.target.files && e.target.files[0];
    setError("");
    if (!f) return;
    if (!/\.(txt|md|csv)$/i.test(f.name)) {
      setError("Use a .txt, .md or .csv paper.");
      try { e.target.value = ""; } catch {}
      return;
    }
    if (f.size > 50000) {
      setError("Paper is too big. Use one under 50 KB.");
      try { e.target.value = ""; } catch {}
      return;
    }
    try {
      const t = await f.text();
      setDocText(t.slice(0, 8000));
      setDocName(f.name);
    } catch {
      setError("Could not read paper.");
    }
    try { e.target.value = ""; } catch {}
  }

  async function toggleRecord() {
    setError("");
    if (recording) {
      try {
        recRef.current && recRef.current.stop();
      } catch {}
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunksRef.current.push(ev.data); };
      rec.onstop = async () => {
        setRecording(false);
        try { stream.getTracks().forEach((t) => t.stop()); } catch {}
        try {
          setVoicing(true);
          const raw = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
          const wav = await blobTo16kWav(raw);
          const fd = new FormData();
          fd.append("audio", wav, "audio.wav");
          const res = await fetch("/api/assistant/transcribe", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || "Could not hear you.");
          } else if (data.transcript) {
            setInput(data.transcript.slice(0, 500));
          } else {
            setError("Could not hear you. Try again.");
          }
        } catch {
          setError("Voice failed. Type your question.");
        }
        setVoicing(false);
      };
      rec.start();
      setRecording(true);
    } catch {
      setError("Microphone is blocked. Allow it or type.");
    }
  }

  function readLast() {
    try {
      const last = [...msgs].reverse().find((m) => m.role === "assistant");
      if (!last) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(last.content.slice(0, 500));
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch {
      setError("This phone cannot read aloud.");
    }
  }

  return (
    <div>
      <div className="space-y-2">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "rounded-xl bg-green-700 p-3 text-white" : "rounded-xl border p-3 bg-white"}>
            <MessageText text={m.content} />
          </div>
        ))}
        {loading ? <p>Thinking...</p> : null}
      </div>
      {docName ? <p className="mt-2 text-sm">Paper: {docName} <button type="button" onClick={() => { setDocName(""); setDocText(""); }} className="underline">remove</button></p> : null}
      {error ? <p role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
      <div className="mt-3">
        <label htmlFor="chatQ" className="font-bold">Your question</label>
        <input id="chatQ" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your farm" className="mt-1 w-full rounded-xl border p-4 text-lg" />
      </div>
      <div className="mt-3 space-y-3">
        <button type="button" onClick={() => send()} disabled={loading} className="w-full rounded-xl bg-green-700 px-4 py-4 text-lg font-bold text-white disabled:opacity-50">
          {loading ? "Please wait..." : "Send"}
        </button>
        <button type="button" onClick={toggleRecord} className="w-full rounded-xl border-2 border-green-700 px-4 py-4 text-lg font-bold text-green-800">
          {recording ? "Stop recording" : "🎤 Talk"}
        </button>
        {voicing ? <p>Changing voice to text...</p> : null}
        <button type="button" onClick={readLast} className="w-full rounded-xl border-2 border-green-700 px-4 py-4 text-lg font-bold text-green-800">
          🔊 Read answer aloud
        </button>
        <label className="block w-full rounded-xl border-2 border-green-700 px-4 py-4 text-center text-lg font-bold text-green-800">
          📄 Add paper (.txt)
          <input type="file" accept=".txt,.md,.csv,text/plain" onChange={onDoc} hidden />
        </label>
      </div>
    </div>
  );
}