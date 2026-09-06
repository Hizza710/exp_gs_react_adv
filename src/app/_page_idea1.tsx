"use client";
// src/app/page.tsx

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Recorder from "./Recorder";

// FaceMeter は内部で face-api（ブラウザ専用ライブラリ）を使うため、
// サーバー側では読み込まない設定（ssr: false）にする。
// これにより「サーバーで評価されて壊れる」問題を防げる。
const FaceMeter = dynamic(() => import("./FaceMeter"), { ssr: false });

export default function Home() {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState("やさしめ");

  // 現実的 / 理想的 の2モードで、それぞれ4つのトピックを編集できるようにする
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

  // ── ここから：録音中の表情記録（笑顔スコア）まわり ──
  const [smileScore, setSmileScore] = useState(0);
  // 録音中に集計した「録音中だけの」平均笑顔率（録音していなければ null）
  const [recordedSmileAvg, setRecordedSmileAvg] = useState<number | null>(null);
  const isRecordingRef = useRef(false);
  const smileSamplesRef = useRef<number[]>([]);

  // 笑顔率(数字)を受け取って、絵文字を返す
  // 三項演算子(条件 ? Aの場合 : Bの場合)を2つ組み合わせて、3段階に出し分けている
  function smileEmoji(n: number) {
    return n >= 70 ? "😄" : n >= 40 ? "🙂" : "😐";
  }

  // 同じ考え方で、文字の色も3段階に出し分ける
  function smileColor(n: number) {
    return n >= 70 ? "green" : n >= 40 ? "orange" : "red";
  }

  // FaceMeter から0.5秒ごとに呼ばれる。常に表示用の smileScore を更新しつつ、
  // 録音中であればサンプルとして貯めておく。
  function handleScore(n: number) {
    setSmileScore(n);
    if (isRecordingRef.current) {
      smileSamplesRef.current.push(n);
    }
  }

  // Recorder から録音の開始/終了が通知されたときの処理
  function handleRecordingChange(isRecording: boolean) {
    isRecordingRef.current = isRecording;
    if (isRecording) {
      smileSamplesRef.current = [];
      setRecordedSmileAvg(null);
    } else {
      const samples = smileSamplesRef.current;
      if (samples.length > 0) {
        const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
        setRecordedSmileAvg(avg);
      }
    }
  }

  // ── ここから：録音の文字起こし先（4つのカードのうち、どこに入れるか） ──
  // 直近でフォーカス（クリック）したカードのキーを覚えておき、
  // Recorder から届いた文字起こし結果は、そのカードに書き込む
  const [activeField, setActiveField] = useState<keyof typeof answers.real>("intro");

  function handleRecordedText(t: string) {
    setAnswers((prev) => ({
      ...prev,
      [mode]: { ...prev[mode], [activeField]: t },
    }));
  }

  async function handleSubmit() {
    setLoading(true);
    setFeedback("");

    // 自分のAPI(/api/coach)を呼ぶ（Groqのキーはこの先＝サーバー側にある）
    // 通信やAPI側の失敗で画面が無反応にならないよう try/catch/finally で確認
    try {
      const scoreToSend = recordedSmileAvg ?? smileScore;
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone, mode, answers, coachQuestion, smileScore: scoreToSend }),
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
  function renderFeedback(text: string) {
    const withBulletsBolded = text.replace(/^\*\s+(.+)$/gm, "**$1**");
    const parts = withBulletsBolded.split(/\*\*(.+?)\*\*|\*(.+?)\*/g);

    return parts.map((part, i) => {
      if (!part) return null;
      const isBold = i % 3 !== 0;
      return isBold ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>;
    });
  }

  return (
    <main className="container">
      <h1 className="title">AI練習コーチ</h1>

      {/* カメラで表情（笑顔率）を計測。録音中の平均も算出して見せる */}
      <FaceMeter onScore={handleScore} />
      <p style={{ color: smileColor(smileScore) }}>いまの笑顔率：{smileScore}% {smileEmoji(smileScore)}</p>
      {recordedSmileAvg !== null && (
        <p style={{ color: smileColor(recordedSmileAvg) }}>録音中の平均笑顔率：{recordedSmileAvg}% {smileEmoji(recordedSmileAvg)}</p>
      )}

      {/* 録音した内容は、直近でフォーカスしたカードに書き込まれる */}
      <p className="field-label">🎤 話した内容は「{topics.find((t) => t.key === activeField)?.label}」の欄に反映されます</p>
      <Recorder onText={handleRecordedText} onRecordingChange={handleRecordingChange} />

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
              onFocus={() => setActiveField(t.key as keyof typeof answers.real)}
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
