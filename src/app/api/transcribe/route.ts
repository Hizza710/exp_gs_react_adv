// src/app/api/transcribe/route.ts

// 送られてくる音声の上限（1分の録音はおよそ 1MB 前後）。
// 上限を決めておかないと、巨大なファイルをそのまま外部APIに転送してしまう。
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  // 画面から送られた音声ファイルを受け取る
  const inForm = await request.formData();
  const audio = inForm.get("audio");

  // ファイルが入っていない／サイズが上限超えなら、外部APIに送る前に断る
  if (!(audio instanceof File)) {
    return Response.json({ error: "音声ファイルが送られていません" }, { status: 400 });
  }
  if (audio.size === 0) {
    return Response.json({ error: "音声データが空です" }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return Response.json({ error: "録音が長すぎます（10MBまで）" }, { status: 413 });
  }

  // Groqの音声API(Whisper)へ転送する形に詰め替える
  const groqForm = new FormData();
  groqForm.append("file", audio, "audio.webm");
  groqForm.append("model", "whisper-large-v3-turbo");
  groqForm.append("language", "ja");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: groqForm, // ← FormDataのときは Content-Type を自分で付けない
  });

  const data = await res.json();
  return Response.json({ text: data.text });
}
