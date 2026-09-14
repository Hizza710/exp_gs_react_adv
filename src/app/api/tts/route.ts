// src/app/api/tts/route.ts
import { EdgeTTS } from "@andresaya/edge-tts";

// 読み上げる文字数の上限。長すぎる文章は合成に時間がかかり、
// base64 の応答も巨大になるため、ここで止める。
const MAX_TEXT_LENGTH = 3000;

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }
  const { text, voice } = body;

  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "読み上げる文章がありません" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return Response.json({ error: `文章が長すぎます（${MAX_TEXT_LENGTH}文字までにしてください）` }, { status: 400 });
  }

  const tts = new EdgeTTS();
  // voice が指定されなかった場合は、デフォルトの声（ナナミ）を使う
  await tts.synthesize(text, typeof voice === "string" && voice ? voice : "ja-JP-NanamiNeural");
  const base64 = tts.toBase64(); // 音声(mp3)をbase64で受け取る

  return Response.json({ audio: base64 });
}
