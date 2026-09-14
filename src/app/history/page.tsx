// app/history/page.tsx
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function HistoryPage() {
  // ① まず未ログインを弾く（他のAPIと同じ思想＝ログインしていない人は入れない）
  const { userId } = await auth();
  if (!userId) {
    return (
      <main className="p-8">
        <p>履歴を見るにはログインしてください。</p>
      </main>
    );
  }

  // ② 一覧は"自分のだけ"（userId 一致）・新しい順
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt));

  return (
    <main style={{ padding: 24, maxWidth: 640 }}>
      <h1>練習の記録（{rows.length}件）</h1>
      {rows.length === 0 ? (
        <p>まだありません。練習して「保存」しましょう。</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/history/${row.id}`}>
                {row.topic} ／ 笑顔 {row.smileScore ?? 0}%
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

// import { db, CURRENT_USER_ID } from "@/db";
// import { sessions } from "@/db/schema";
// import { desc, eq } from "drizzle-orm";
// import Link from "next/link";
// import DeletePracticeButton from "./DeletePracticeButton";

// export const dynamic = "force-dynamic";

// export default async function HistoryPage() {
//     // 削除APIと同じ条件（自分のレコードだけ）で一覧する。
//     // ここを揃えておかないと、「一覧には出るのに削除できない」記録が生まれてしまう。
//     const rows = await db.select().from(sessions).where(eq(sessions.userId, CURRENT_USER_ID)).orderBy(desc(sessions.createdAt), desc(sessions.id));
//     const recent = rows.slice(0, 10).reverse();
//     const measured = recent.filter((row) => row.smileAvg !== null);
//     const average = measured.length ? measured.reduce((sum, row) => sum + row.smileAvg!, 0) / measured.length : null;
//     const scoreY = (score: number) => 300 - Math.min(100, Math.max(0, score)) * 2.4;
//     const pointX = (index: number) => recent.length === 1 ? 355 : 80 + index * 550 / Math.max(1, recent.length - 1);

//     return (
//         <main className="studio-shell history-dashboard">
//             <header className="history-intro"><p className="eyebrow">THE PRACTICE COLLECTION</p><h1>積み重ねた、あなたの言葉。</h1><p className="intro-copy">練習の記録 / {rows.length} 件。一回ごとの気づきが、次の自信につながります。</p></header>
//             <div className="history-layout">
//                 <section className="history-card trend-card" aria-labelledby="trend-title">
//                     <p className="eyebrow">SMILE / LAST 10 PRACTICES</p>
//                     <h2 id="trend-title">表情の変化を眺める</h2>
//                     <div className="trend-summary"><p className="muted-copy">直近 {recent.length} 回の録音中の平均笑顔率<br />左から古い順 · 最大10回</p><p className="trend-average"><span>各回の平均笑顔率の平均</span><strong>{average === null ? "未計測" : `${Math.round(average)}%`}</strong></p></div>
//                     {recent.length ? <>
//                         <svg className="smile-trend" viewBox="0 0 710 365" role="img" aria-labelledby="trend-svg-title trend-svg-description">
//                             <title id="trend-svg-title">{`直近${recent.length}回の録音中の平均笑顔率の推移`}</title>
//                             <desc id="trend-svg-description">{recent.map((row) => `PRACTICE ${String(row.id).padStart(3, "0")}：${row.smileAvg === null ? "未計測" : `${row.smileAvg}%`}`).join("、")}。平均は{average === null ? "未計測" : `${Math.round(average)}%`}。未計測は平均から除外しています。</desc>
//                             {[0, 25, 50, 75, 100].map((tick) => <g key={tick}><line x1="60" x2="660" y1={scoreY(tick)} y2={scoreY(tick)} className="trend-gridline" /><text x="48" y={scoreY(tick) + 4} textAnchor="end" className="trend-axis">{tick}%</text></g>)}
//                             {average !== null && <line x1="60" x2="660" y1={scoreY(average)} y2={scoreY(average)} className="trend-average-line" />}
//                             {recent.map((row, index) => {
//                                 const previous = recent[index - 1];
//                                 return <g key={row.id}>
//                                     {row.smileAvg !== null && previous?.smileAvg != null && <line x1={pointX(index - 1)} y1={scoreY(previous.smileAvg)} x2={pointX(index)} y2={scoreY(row.smileAvg)} className="trend-line" />}
//                                     {row.smileAvg !== null ? <><circle cx={pointX(index)} cy={scoreY(row.smileAvg)} r="6" className="trend-point" /><text x={pointX(index)} y={scoreY(row.smileAvg) - 15} textAnchor="middle" className="trend-value">{row.smileAvg}%</text></> : <text x={pointX(index)} y="285" textAnchor="middle" className="trend-axis">未計測</text>}
//                                     <text x={pointX(index)} y="325" textAnchor="middle" className="trend-axis">{String(row.id).padStart(3, "0")}</text>
//                                 </g>;
//                             })}
//                             <text x="355" y="352" textAnchor="middle" className="trend-axis">PRACTICE</text>
//                         </svg>
//                         <div className="trend-legend"><span><i className="legend-score" />録音中の平均笑顔率</span><span><i className="legend-average" />平均 {average === null ? "未計測" : `${Math.round(average)}%`}</span></div>
//                         {measured.length < recent.length && <p className="muted-copy">未計測の記録は平均の計算に含みません。</p>}
//                     </> : <div className="trend-empty"><h2>最初の一回を、ここに。</h2><p className="review-empty">練習を保存すると、ここに表情の推移が表示されます。</p><Link className="studio-button primary-button" href="/">練習をはじめる ↗</Link></div>}
//                 </section>
//                 <aside className="history-sidebar" aria-labelledby="history-list-title">
//                     <div className="panel-heading"><h2 id="history-list-title">練習の記録</h2><span className="small-tag">全 {rows.length} 件 · 新しい順</span></div>
//                     {rows.length ? <ul className="history-list">{rows.map((row) => <li key={row.id} className="history-record"><Link className="history-entry" href={`/history/${row.id}`}><div><small>PRACTICE / {String(row.id).padStart(3, "0")}</small><strong>{row.topic}</strong></div><span className="history-score" title="録音中の平均笑顔率">{row.smileAvg === null ? "未計測" : `${row.smileAvg}%`} ↗</span></Link><DeletePracticeButton id={row.id} /></li>)}</ul> : <p className="muted-copy">保存した練習がここに並びます。</p>}
//                 </aside>
//             </div>
//         </main>
//     );
// }
