"use client";
// src/app/page.tsx

import { useState } from "react";

// ─────────────────────────────────────────────
// 参照用：題は固定文字列で、回答欄は1つ。口調だけ選べるシンプルバージョン
//
// const [answer, setAnswer] = useState("");
// const [tone, setTone] = useState("やさしめ");
// const topic = "自己紹介を1分で";
//
// async function handleSubmit() {
//   setLoading(true);
//   setFeedback("");
//   try {
//     const res = await fetch("/api/coach", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ topic, answer }),
//     });
//     const data = await res.json();
//     setFeedback(data.feedback ?? "エラーが起きました。もう一度お試しください。");
//   } catch {
//     setFeedback("通信に失敗しました。ネットワークを確認してください。");
//   } finally {
//     setLoading(false);
//   }
// }
// ─────────────────────────────────────────────

export default function Home() {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState("やさしめ");

  // 工夫#1 現実的 / 理想的 の2モードで、それぞれ4つのトピックを編集できるようにする
  const [mode, setMode] = useState<"real" | "ideal">("real");
  const topics = [
    { key: "intro", label: "自己紹介" },
    { key: "motivation", label: "志望動機" },
    { key: "contribution", label: "貢献価値" },
    { key: "vision", label: "ビジョン" },
  ];

  // answers.real/answers.ideal にそれぞれのテキストを保持
  const [answers, setAnswers] = useState({
    real: { intro: "", motivation: "", contribution: "", vision: "" },
    ideal: { intro: "", motivation: "", contribution: "", vision: "" },
  });

  const [coachQuestion, setCoachQuestion] = useState("consistency");

  async function handleSubmit() {
    setLoading(true);
    setFeedback("");

    // 自分のAPI(/api/coach)を呼ぶ（Groqのキーはこの先＝サーバー側にある）
    // 通信やAPI側の失敗で画面が無反応にならないよう try/catch/finally で確認
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone, mode, answers, coachQuestion }),
      });
      const data = await res.json();
      setFeedback(data.feedback ?? "エラーが起きました。もう一度お試しください。");
    } catch {
      setFeedback("通信に失敗しました。ネットワークを確認してください。");
    } finally {
      setLoading(false);
    }
  }

  // AIの返答に含まれる Markdown 記号（*, **）を、実際の太字表示に変換するための小さなヘルパー
  // 例1: "とても**良い**です"   → "とても" + <strong>良い</strong> + "です"
  // 例2: "* 良い点があります"   → "良い点があります"（箇条書きの * を太字に変換）
  // 例3: "*良い*です"          → "良い" + <strong>良い</strong> + "です"
  function renderFeedback(text: string) {
    // ① 行の先頭にある「* 」（箇条書き記号）は、太字の見出しっぽく変換する
    //    例: "* 良い点" → "**良い点**"
    const withBulletsBolded = text.replace(/^\*\s+(.+)$/gm, "**$1**");

    // ② "**text**"（太字）と "*text*"（強調）をまとめて太字に変換する
    //    (\*\*(.+?)\*\*|\*(.+?)\*) の意味：
    //    - \*\*(.+?)\*\* → ** で囲まれた部分
    //    - \*(.+?)\*     → * だけで囲まれた部分
    const parts = withBulletsBolded.split(/\*\*(.+?)\*\*|\*(.+?)\*/g);

    return parts.map((part, i) => {
      if (!part) return null; // split で空文字が混ざることがあるので無視する
      // split の仕組み上、太字にしたい部分は3つおき（1, 2, 4, 5, 7, 8...）に入ってくる
      const isBold = i % 3 !== 0;
      return isBold ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>;
    });
  }

  return (
    <main className="container">
      <h1 className="title">AI練習コーチ</h1>

      {/* モード切替 */}
      <div className="mode-switch">
        <button
          className={`mode-btn ${mode === "real" ? "mode-btn-active" : ""}`}
          onClick={() => setMode("real")}
        >
          現実的に考えていること
        </button>
        <button
          className={`mode-btn ${mode === "ideal" ? "mode-btn-active" : ""}`}
          onClick={() => setMode("ideal")}
        >
          理想的に描いていること
        </button>
      </div>

      {/* 4つのウィンドウを横並び */}
      <div className="cards-grid">
        {topics.map((t) => (
          <div key={t.key} className="card">
            <h2 className="card-title">{t.label}</h2>
            <textarea
              rows={6}
              className="textarea"
              value={answers[mode][t.key as keyof typeof answers.real]}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [mode]: { ...prev[mode], [t.key]: e.target.value },
                }))
              }
              placeholder={`${t.label} を ${mode === "real" ? "現状で" : "理想的に"} 書いてください`}
            />
          </div>
        ))}
      </div>

      {/* サマリーの下に送信ボタンと聞きたいこと選択 */}
      <div className="actions">
        <div className="actions-row">
          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary">
            {loading ? "生成中…" : "コーチに見てもらう"}
          </button>

          <label className="field-label">コーチに聞きたいこと：</label>
          <select className="select" value={coachQuestion} onChange={(e) => setCoachQuestion(e.target.value)}>
            <option value="consistency">伝わりやすさ (consistency)</option>
            <option value="uniqueness">自分らしさ (uniqueness)</option>
            <option value="authenticness">現実と理想のギャップ (authenticness)</option>
          </select>

          <label className="field-label">口調：</label>
          <select className="select" value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="やさしめ">やさしめ</option>
            <option value="スパルタ">スパルタ</option>
            <option value="ていねい">ていねい</option>
          </select>
        </div>
      </div>
      {/* 送信後にコーチのコメントを表示するコンテナ */}
      {feedback && (
        <div className="feedback-box">
          <h3 className="feedback-title">コーチのコメント</h3>
          <div className="feedback-body">{renderFeedback(feedback)}</div>
        </div>
      )}
    </main>
  );
}