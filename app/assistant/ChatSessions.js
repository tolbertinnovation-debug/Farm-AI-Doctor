"use client";

import { useEffect, useState } from "react";

function wav16k(buffer) {
  const target = 16000;
  const ratio = Math.floor(buffer.sampleRate / target) || 1;
  const ch = buffer.getChannelData(0);
  const out = [];
  for (let i = 0; i < ch.length; i += ratio) out.push(ch[i]);
  const n = out.length;
  const ab = new ArrayBuffer(44 + n * 2);
  const v = new DataView(ab);
  function str(o, s) { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
  str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, target, true); v.setUint32(28, target * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    let s = Math.max(-1, Math.min(1, out[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true);
  }
  return new Blob([ab], { type: "audio/wav" });
}

export default function ChatSessions() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);

  async function loadSessions(firstId) {
    try {
      const res = await fetch("/api/chat-sessions");
      const data = await res.json();
      if (res.ok) {
        setSessions(data.sessions || []);
        const pick = firstId || data.sessions?.[0]?.id || null;
        if (pick) openSession(pick);
      }
    } catch {}
  }

  useEffect(() => { loadSessions(); }, []);

  async function openSession(id) {
    setActiveId(id);
    setError("");
    try {
      const res = await fetch("/api/chat-sessions/" + id);
      const data = await res.json();
      if (res.ok) setMessages(data.messages || []);
      else setError(data.error || "Could not open.");
    } catch {
      setError("No internet.");
    }
  }

  async function newChat() {
    setError("");
    const res = await fetch("/api/chat-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Could not start."); return; }
    setSessions((s) => [{ id: data.session.id, title: data.session.title, updated_at: new Date().toISOString() }, ...s]);
    setActiveId(data.session.id);
    setMessages([]);
    setInput("");
  }

  async function removeChat(id) {
    if (!window.confirm("Delete this chat?")) return;
    const res = await fetch("/api/chat-sessions/" + id, { method: "DELETE" });
    if (!res.ok) { setError("Could not delete."); return; }
    const left = sessions.filter((s) => s.id !== id);
    setSessions(left);
    if (activeId === id) {
      setActiveId(left[0]?.id || null);
      setMessages([]);
      if (left[0]) openSession(left[0].id);
    }
  }

  async function send(e) {
    if (e) e.preventDefault();
    setError("");
    if (!input.trim()) { setError("Write a question first."); return; }
    let sid = activeId;
    if (!sid) {
      const res = await fetch("/api/chat-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) { setError("Could not start."); return; }
      sid = data.session.id;
      setSessions((s) => [{ id: sid, title: "New chat", updated_at: new Date().toISOString() }, ...s]);
      setActiveId(sid);
    }
    const q = input;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat-sessions/" + sid + "/messages", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: q })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "No answer."); setLoading(false); return; }
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
      loadSessions(sid);
      openSession(sid);
    } catch {
      setError("No internet. Try again.");
    }
    setLoading(false);
  }

  function readAloud(text) {
    try {
      if (!("speechSynthesis" in window)) { setError("This phone cannot read aloud."); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en";
      window.speechSynthesis.speak(u);
    } catch {
      setError("Cannot read aloud.");
    }
  }

  function talk() {
    setError("");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      try {
        const r = new SR();
        r.lang = "en";
        r.onresult = (ev) => {
          const t = ev.results?.[0]?.[0]?.transcript || "";
          if (t) setInput((s) => (s ? s + " " : "") + t);
        };
        r.onerror = () => setError("Voice did not hear. Try again.");
        r.start();
        return;
      } catch {}
    }
    recordAndSend();
  }

  async function recordAndSend() {
    if (listening) return;
    try {
      setListening(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const parts = [];
      rec.ondataavailable = (ev) => { if (ev.data.size) parts.push(ev.data); };
      rec.start();
      await new Promise((r) => setTimeout(r, 4000));
      rec.stop();
      await new Promise((r) => { rec.onstop = r; });
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(parts, { type: rec.mimeType || "audio/webm" });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const ab = await blob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(ab);
      const wav = wav16k(decoded);
      try { ctx.close(); } catch {}
      const fd = new FormData();
      fd.append("audio", wav, "voice.wav");
      const res = await fetch("/api/assistant/voice", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Voice failed."); setListening(false); return; }
      setInput((s) => (s ? s + " " : "") + data.transcript);
    } catch {
      setError("Microphone blocked. Allow it and try again.");
    }
    setListening(false);
  }

  function onPaper(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const t = String(reader.result || "").slice(0, 2000);
      if (t) setInput((s) => (s ? s + "\n" : "") + t);
    };
    reader.readAsText(f);
    try { e.target.value = ""; } catch {}
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-2">
        <button onClick={newChat} className="min-h-[48px] flex-1 rounded-xl bg-green-700 px-4 py-3 text-lg font-bold text-white">+ New chat</button>
      </div>
      <div>
        <label htmlFor="chatPick" className="font-bold">My chats</label>
        <select id="chatPick" value={activeId || ""} onChange={(e) => { if (e.target.value) openSession(Number(e.target.value)); }} className="mt-1 w-full rounded-xl border p-4 text-lg">
          <option value="">Pick a chat</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
        {sessions.length === 0 ? <p className="mt-1">No chats yet. Tap New chat.</p> : null}
      </div>
      {activeId ? (
        <button onClick={() => removeChat(activeId)} className="min-h-[48px] w-full rounded-xl border-2 border-red-600 px-4 py-3 font-bold text-red-700">Delete this chat</button>
      ) : null}
      <div className="space-y-2">
        {messages.length === 0 ? <p>Ask about cassava, rice, goats, chickens. Example: My leaves have yellow spots, what do I do?</p> : null}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "rounded-xl bg-green-50 p-3" : "rounded-xl border p-3"}>
            <p className="whitespace-pre-wrap text-lg">{m.content}</p>
            {m.role === "assistant" ? (
              <button onClick={() => readAloud(m.content)} className="mt-2 min-h-[48px] rounded-xl border px-4 py-2 font-bold">🔊 Read</button>
            ) : null}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="space-y-3">
        <label htmlFor="chatInput" className="font-bold">Your question</label>
        <textarea id="chatInput" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Write here..." rows={3} className="w-full rounded-xl border p-4 text-lg" />
        <div>
          <label htmlFor="paper" className="font-bold">Add a paper (.txt)</label>
          <input id="paper" type="file" accept=".txt,.md,text/plain" onChange={onPaper} className="mt-1 w-full rounded-xl border p-4 text-lg" />
        </div>
        {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
        <button type="submit" disabled={loading} className="min-h-[48px] w-full rounded-xl bg-green-700 px-4 py-4 text-lg font-bold text-white disabled:opacity-50">{loading ? "Thinking..." : "Send"}</button>
        <button type="button" onClick={talk} className="min-h-[48px] w-full rounded-xl border-2 border-green-700 px-4 py-3 text-lg font-bold text-green-800">{listening ? "Listening..." : "🎤 Talk"}</button>
      </form>
    </div>
  );
}