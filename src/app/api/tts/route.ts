// src/app/api/tts/route.ts
import { EdgeTTS } from "@andresaya/edge-tts";

export async function POST(request: Request) {
  const { text } = await request.json();

  const tts = new EdgeTTS();
  await tts.synthesize(text, "ja-JP-NanamiNeural"); // 日本語の自然な声
  const base64 = tts.toBase64(); // 音声(mp3)をbase64で受け取る

  return Response.json({ audio: base64 });
}