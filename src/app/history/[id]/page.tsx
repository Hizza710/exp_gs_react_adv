// app/history/[id]/page.tsx
import { db, CURRENT_USER_ID } from "@/db";
import { sessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import FeedbackText from "../../FeedbackText";

export default async function HistoryDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 数字でないIDは Number() で NaN になり、そのまま SQL に渡すとエラーになる。
  const sessionId = Number(id);
  const row = Number.isInteger(sessionId)
    ? (await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, CURRENT_USER_ID))))[0]
    : undefined;

  if (!row) return <main className="studio-shell history-intro"><h1>記録が見つかりませんでした。</h1><Link className="studio-button" href="/history">← 練習の記録へ</Link></main>;

  return (
    <main className="studio-shell">
      <header className="history-intro"><Link className="muted-copy" href="/history">← 練習の記録へ</Link><p className="eyebrow" style={{ marginTop: 24 }}>PRACTICE / {String(row.id).padStart(3, "0")}</p><h1>{row.topic}</h1></header>
      <div className="detail-scores"><span>保存時の笑顔スコア <strong>{row.smileScore ?? 0}%</strong></span><span>録音中の平均笑顔率 <strong>{row.smileAvg == null ? "未計測" : `${row.smileAvg}%`}</strong></span></div>
      <div className="detail-content">
        <section className="history-card"><span className="eyebrow">01 / YOUR WORDS</span><h2>あなたの回答</h2><p>{row.answerText || "回答はありません。"}</p></section>
        <section className="history-card"><span className="eyebrow">02 / COACH’S NOTE</span><h2>コーチからのフィードバック</h2><p><FeedbackText text={row.feedback || "フィードバックはありません。"} /></p></section>
        <section className="review-panel" style={{ marginTop: 0 }}><span className="eyebrow">03 / REFLECTION</span><h2>あなた自身の振り返り</h2><p>{row.reflection || "振り返りはまだ記入されていません。"}</p></section>
      </div>
    </main>
  );
}
