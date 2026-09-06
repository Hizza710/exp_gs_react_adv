// src/app/api/tts/route.ts
import { EdgeTTS } from "@andresaya/edge-tts";

export async function POST(request: Request) {
  const { text, voice } = await request.json();

  const tts = new EdgeTTS();
  // voice が指定されなかった場合は、デフォルトの声（ナナミ）を使う
  await tts.synthesize(text, voice || "ja-JP-NanamiNeural");
  const base64 = tts.toBase64(); // 音声(mp3)をbase64で受け取る

  return Response.json({ audio: base64 });
}