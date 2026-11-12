export default async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const apiKey = process.env.SARVAM_API_KEY;
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const text = String(body.text || "").trim();
  if (!text) return Response.json({ error: "Pehle kahani likho." }, { status: 400 });
  if (text.length > 2500) return Response.json({ error: "Scene text 2500 characters se chhota rakhein." }, { status: 400 });
  // PLACEHOLDER: without SARVAM_API_KEY, return silent audio timed to the text so the app stays usable.
  if (!apiKey) return Response.json({ audioBase64: placeholderWav(text), mimeType: "audio/wav", mock: true });
  const speakers = { "Deep male narrator": "aditya", "Calm male narrator": "shubh", "Female narrator": "ritu" };
  try {
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-subscription-key": apiKey },
      body: JSON.stringify({ text, language_code: "hi-IN", speaker: speakers[body.voice] || "aditya", model: "bulbul:v3", output_audio_codec: "mp3" })
    });
    const data = await response.json();
    if (!response.ok) return Response.json({ error: data.error?.message || data.message || "Sarvam voice error" }, { status: 502 });
    return Response.json({ audioBase64: data.audios?.[0], mimeType: "audio/mpeg" });
  } catch { return Response.json({ error: "Voice connection failed" }, { status: 502 }); }
};

// Builds a silent mono 8 kHz WAV roughly as long as the text would take to narrate.
function placeholderWav(text) {
  const rate = 8000;
  const seconds = Math.min(60, Math.max(2, text.length * 0.07));
  const samples = Math.round(rate * seconds);
  const buf = Buffer.alloc(44 + samples, 128);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate, 28); buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34);
  buf.write("data", 36); buf.writeUInt32LE(samples, 40);
  return buf.toString("base64");
}
