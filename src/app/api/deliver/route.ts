// app/api/deliver/route.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { Resend } from "resend";

// フィードバックの上限（保存APIと同じ）
const MAX_FEEDBACK_LENGTH = 8000;

// AIの出力をそのまま HTML に入れると、文中の < や & がタグとして解釈されてしまう。
// メール本文に入れる前に、HTMLで意味を持つ記号を文字として表示される形に置きかえる。
function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "ログインしてください" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }
  const { feedback } = body;
  if (typeof feedback !== "string" || !feedback.trim()) {
    return Response.json({ error: "送るフィードバックがありません" }, { status: 400 });
  }
  if (feedback.length > MAX_FEEDBACK_LENGTH) {
    return Response.json({ error: `フィードバックが長すぎます（${MAX_FEEDBACK_LENGTH}文字までにしてください）` }, { status: 400 });
  }

  // ログイン中ユーザーのメールアドレスを"送り先"にする
  const user = await currentUser();
  const to = user?.primaryEmailAddress?.emailAddress;
  if (!to) return Response.json({ error: "メールが取得できません" }, { status: 400 });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({     // ← 結果から error を受け取る
    from: "AI練習コーチ <onboarding@resend.dev>",
    to: [to],
    subject: "きょうの練習レポート",
    // エスケープしてから、改行だけを <br> に戻して読みやすくする
    html: `<h2>コーチのフィードバック</h2><p>${escapeHtml(feedback).replace(/\n/g, "<br>")}</p>`,
  });

  // 送信に失敗したら、成功扱いにしない（理由を画面とターミナルに出す）
  if (error) {
    console.error("Resendエラー:", error);
    return Response.json({ error: error.message }, { status: 502 });
  }

  return Response.json({ ok: true });
}