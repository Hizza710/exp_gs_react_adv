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
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [smileScore, setSmileScore] = useState(0);
  // 録音中に集計した「録音中だけの」平均笑顔率（録音していなければ null）
  const [recordedSmileAvg, setRecordedSmileAvg] = useState<number | null>(null);
  const topic = "自己紹介を1分で";

  // 録音中かどうか、録音中に集めたスコアの一覧を ref で持つ
  // （state だとコールバック内で古い値を参照してしまう可能性があるため ref を使う）
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
      // 録音開始：サンプルをリセット
      smileSamplesRef.current = [];
      setRecordedSmileAvg(null);
    } else {
      // 録音終了：貯まったサンプルの平均を計算
      const samples = smileSamplesRef.current;
      if (samples.length > 0) {
        const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
        setRecordedSmileAvg(avg);
      }
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setFeedback("");
    // 録音中の平均笑顔率があればそれを、なければ今の笑顔率を使う
    const scoreToSend = recordedSmileAvg ?? smileScore;
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, answer, smileScore: scoreToSend }),
    });
    const data = await res.json();
    setFeedback(data.feedback);
    setLoading(false);
  }

  async function speak() {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: feedback }),
    });
    const data = await res.json();
    const audio = new Audio("data:audio/mp3;base64," + data.audio);
    audio.play();
  }

  return (
    <main style={{ padding: 24, maxWidth: 640 }}>
      <h1>AI練習コーチ</h1>
      {/* ③ <h1> の下あたりに置く */}
      <FaceMeter onScore={handleScore} />
      <p style={{ color: smileColor(smileScore) }}>いまの笑顔率：{smileScore}% {smileEmoji(smileScore)}</p>
      {recordedSmileAvg !== null && (
        <p style={{ color: smileColor(recordedSmileAvg) }}>録音中の平均笑顔率：{recordedSmileAvg}% {smileEmoji(recordedSmileAvg)}</p>
      )}

      <p>お題：{topic}</p>
      <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} style={{ width: "100%" }} placeholder="ここに回答を入力" />
      {/* textarea の下あたり */}
      <Recorder onText={(t) => setAnswer(t)} onRecordingChange={handleRecordingChange} />

      <button onClick={handleSubmit} disabled={loading} style={{ marginTop: 12 }}>
        {loading ? "生成中…" : "コーチに見てもらう"}
      </button>
      {feedback && (
        <>
          <p style={{ whiteSpace: "pre-wrap", marginTop: 16 }}>{feedback}</p>
          <button onClick={speak}>🔊 読み上げ</button>
        </>
      )}
    </main>
  );
}
