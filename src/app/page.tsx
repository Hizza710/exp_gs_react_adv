"use client";
// app/page.tsx

import { useState, useRef } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"; // ← Day4で追加
import FaceMeter from "./FaceMeter";
import Recorder from "./Recorder";        // ← Day2【発展】をやっていない人は消す

export default function Home() {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [smileScore, setSmileScore] = useState(0);
  const [speaking, setSpeaking] = useState(false);          // 読み上げ中か
  const audioRef = useRef<HTMLAudioElement | null>(null);   // 今鳴っている音声
  const topic = "自己紹介を1分で";

  // コーチに見てもらう
  async function handleSubmit() {
    audioRef.current?.pause();   // 前の読み上げが残っていたら止める
    setSpeaking(false);
    setLoading(true);
    setFeedback("");
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, answer, smileScore }),
    });
    const data = await res.json();
    setFeedback(data.feedback);
    setLoading(false);
  }

  // Day3：DBに保存する（Day4：結果を確認してから知らせる）
  async function save() {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, answer, smileScore, feedback }),
    });
    if (res.ok) alert("保存しました");
    else if (res.status === 401) alert("保存するにはログインしてください");
    else alert(`保存に失敗しました（${res.status}）`);
  }

  // Day4：メールで受け取る
  async function deliver() {
    const res = await fetch("/api/deliver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback }),
    });
    if (res.ok) alert("メールを送りました");
    else alert("メール送信に失敗しました（無料枠では自分の登録メール宛のみ送れます）");
  }

  // Day2【発展】：読み上げる（やっていない人は、この関数ごと消す）
  async function speak() {
    if (speaking) return;
    setSpeaking(true);
    try {
      audioRef.current?.pause();
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: feedback }),
      });
      const data = await res.json();
      if (!res.ok || !data.audio) {
        alert("読み上げに失敗しました。");
        setSpeaking(false);
        return;
      }
      const audio = new Audio("data:audio/mp3;base64," + data.audio);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch (e) {
      console.error(e);
      alert("読み上げに失敗しました。");
      setSpeaking(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 640 }}>
      <h1>AI練習コーチ</h1>
      <Link href="/history">📖 履歴を見る</Link>

      <FaceMeter onScore={setSmileScore} />
      <p>いまの笑顔率：{smileScore}%</p>

      <p>お題：{topic}</p>
      <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} style={{ width: "100%" }} placeholder="ここに回答を入力" />

      {/* Day2【発展】：録音（やっていない人は、この1行を消す） */}
      <Recorder onText={(t) => setAnswer(t)} />

      <button onClick={handleSubmit} disabled={loading} style={{ marginTop: 12 }}>
        {loading ? "生成中…" : "コーチに見てもらう"}
      </button>

      {feedback && (
        <>
          <p style={{ whiteSpace: "pre-wrap", marginTop: 16 }}>{feedback}</p>

          {/* Day4：保存とメールは「ログイン中だけ」表示する */}
          <SignedIn>
            <button onClick={save}>💾 保存する</button>
            <button onClick={deliver}>✉ メールで受け取る</button>
          </SignedIn>
          <SignedOut>
            <p>練習を保存・メールで受け取るには、ログインしてください。</p>
            <SignInButton>
              <button>ログインする</button>
            </SignInButton>
          </SignedOut>

          {/* Day2【発展】：読み上げ（やっていない人は、この2行を消す） */}
          <button onClick={speak} disabled={speaking}>
            {speaking ? "🔊 読み上げ中…" : "🔊 読み上げ"}
          </button>
        </>
      )}
    </main>
  );
}

// "use client";
// // src/app/page.tsx

// import { useEffect, useRef, useState } from "react";
// import dynamic from "next/dynamic";
// import Recorder from "./Recorder";
// import FeedbackText from "./FeedbackText";

// // FaceMeter は内部で face-api（ブラウザ専用ライブラリ）を使うため、
// // サーバー側では読み込まない設定（ssr: false）にする。
// // これにより「サーバーで評価されて壊れる」問題を防げる。
// const FaceMeter = dynamic(() => import("./FaceMeter"), { ssr: false });

// export default function Home() {
//   const [answer, setAnswer] = useState("");
//   const [reflection, setReflection] = useState("");
//   const [feedback, setFeedback] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [speaking, setSpeaking] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const audioRef = useRef<HTMLAudioElement | null>(null);
//   const speechRequestRef = useRef<AbortController | null>(null);
//   const savingRef = useRef(false);

//   useEffect(() => () => {
//     speechRequestRef.current?.abort();
//     audioRef.current?.pause();
//   }, []);
//   const [smileScore, setSmileScore] = useState(0);
//   const [recordedSmileAvg, setRecordedSmileAvg] = useState<number | null>(null);
//   const topic = "自己紹介を1分で";

//   // 録音中かどうか、録音中に集めたスコアの一覧を ref で持つ
//   // （state だとコールバック内で古い値を参照してしまう可能性があるため ref を使う）
//   const isRecordingRef = useRef(false);
//   const smileSamplesRef = useRef<number[]>([]);

//   // 笑顔率(数字)を受け取って、絵文字を返す
//   // 三項演算子(条件 ? Aの場合 : Bの場合)を2つ組み合わせて、3段階に出し分けている
//   function smileEmoji(n: number) {
//     return n >= 70 ? "😄" : n >= 40 ? "🙂" : "😐";
//   }

//   // 同じ考え方で、文字の色も3段階に出し分ける
//   function smileColor(n: number) {
//     return n >= 70 ? "green" : n >= 40 ? "orange" : "red";
//   }

//   // FaceMeter から0.5秒ごとに呼ばれる。常に表示用の smileScore を更新しつつ、
//   // 録音中であればサンプルとして貯めておく。
//   function handleScore(n: number) {
//     setSmileScore(n);
//     if (isRecordingRef.current) {
//       smileSamplesRef.current.push(n);
//     }
//   }

//   // Recorder から録音の開始/終了が通知されたときの処理
//   function handleRecordingChange(isRecording: boolean) {
//     isRecordingRef.current = isRecording;
//     if (isRecording) {
//       // 録音開始：サンプルをリセット
//       smileSamplesRef.current = [];
//       setRecordedSmileAvg(null);
//     } else {
//       // 録音終了：貯まったサンプルの平均を計算
//       const samples = smileSamplesRef.current;
//       if (samples.length > 0) {
//         const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
//         setRecordedSmileAvg(avg);
//       }
//     }
//   }

//   async function handleSubmit() {
//     if (loading || !answer.trim()) return;
//     stopSpeaking();
//     setLoading(true);
//     setFeedback("");
//     const scoreToSend = recordedSmileAvg ?? smileScore;
//     try {
//       const res = await fetch("/api/coach", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ topic, answer, reflection, smileScore: scoreToSend }),
//       });
//       const data = await res.json();
//       if (!res.ok || typeof data.feedback !== "string") throw new Error("評価に失敗しました");
//       setFeedback(data.feedback);
//     } catch {
//       alert("コーチへの送信に失敗しました。もう一度お試しください。");
//     } finally {
//       setLoading(false);
//     }
//   }

//   function stopSpeaking() {
//     speechRequestRef.current?.abort();
//     speechRequestRef.current = null;
//     const audio = audioRef.current;
//     if (audio) {
//       audio.onended = null;
//       audio.onerror = null;
//       audio.pause();
//       audio.currentTime = 0;
//     }
//     audioRef.current = null;
//     setSpeaking(false);
//   }

//   async function speak() {
//     // stateが更新される前の連打も防ぐ。
//     if (speechRequestRef.current || !feedback) return;
//     const controller = new AbortController();
//     speechRequestRef.current = controller;
//     setSpeaking(true);
//     try {
//       const res = await fetch("/api/tts", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ text: feedback }),
//         signal: controller.signal,
//       });
//       if (!res.ok) throw new Error("読み上げ失敗");
//       const data = await res.json();
//       if (controller.signal.aborted) return;
//       if (typeof data.audio !== "string" || !data.audio) throw new Error("音声がありません");
//       const audio = new Audio("data:audio/mp3;base64," + data.audio);
//       audioRef.current = audio;
//       audio.onended = stopSpeaking;
//       audio.onerror = () => {
//         stopSpeaking();
//         alert("音声を再生できませんでした。");
//       };
//       await audio.play();
//     } catch {
//       if (controller.signal.aborted) return;
//       stopSpeaking();
//       alert("読み上げに失敗しました。もう一度お試しください。");
//     }
//   }

//   // 今の内容（お題・回答・笑顔率・フィードバック）を、DBに1件保存する
//   async function save() {
//     if (savingRef.current) return;
//     savingRef.current = true;
//     setSaving(true);
//     try {
//       const res = await fetch("/api/sessions", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           topic,
//           answer,
//           smileScore,
//           feedback,
//           smileAvg: recordedSmileAvg,
//           reflection,
//         }),
//       });

//       if (!res.ok) {
//         throw new Error("保存失敗");
//       }

//       alert("保存しました");
//     } catch {
//       alert("保存できませんでした。もう一度お試しください。");
//     } finally {
//       savingRef.current = false;
//       setSaving(false);
//     }
//   }

//   return (
//     <main className="studio-shell practice-studio">
//       <header className="studio-intro">
//         <div className="intro-heading"><p className="eyebrow">YOUR CAREER ATELIER</p><h1>あなたの本音、<br />ここで紡ごう。</h1></div><p className="intro-copy">リラックスして、いつもの自分で。<br />勘がすぎずに、まず話す、気づく、また試す。あなただけが練習できるアトリエに。</p>
//         <div className="studio-art" aria-hidden="true"><div className="art-print"><i /><b /><span /></div><div className="art-caption">A little practice, a little confidence.</div></div>
//       </header>
//       <div className="studio-workspace">
//         <aside className="mirror-panel">
//           <div className="panel-heading"><span className="eyebrow">01 / YOUR SPACE</span><span className="small-tag">表情をチェック</span></div>
//           <FaceMeter onScore={handleScore} />
//           <div className="smile-readout"><span>いまの笑顔率</span><strong style={{ color: smileColor(smileScore) }}>{smileScore}<small>%</small> <span className="smile-emoji">{smileEmoji(smileScore)}</span></strong></div>
//           <meter className="smile-meter" min={0} max={100} value={smileScore} aria-label="いまの笑顔率" />
//           {recordedSmileAvg !== null && <p className="average-note">録音中の平均笑顔率 <strong>{recordedSmileAvg}%</strong></p>}
//           <p className="mirror-note">うまく話すより、まずはあなたの言葉で。<br />肩の力を抜いてはじめましょう。</p>
//         </aside>
//         <section className="practice-panel" aria-labelledby="practice-title">
//           <div className="panel-heading"><span className="eyebrow">02 / PRACTICE</span><span className="small-tag">面接トレーニング</span></div>
//           <div className="topic-heading"><h2 id="practice-title">{topic}</h2><span className="time-stamp">約 1 分</span></div>
//           <p className="muted-copy">あなたの経験や大切にしていることを、聞き手に届けてみましょう。</p>
//           <label className="input-label" htmlFor="answer">あなたの回答</label>
//           <textarea id="answer" className="studio-textarea answer-paper" maxLength={4000} value={answer} onChange={(e) => { setAnswer(e.target.value); setFeedback(""); }} disabled={loading} rows={4} placeholder="ここに回答を入力、またはマイクで話してみましょう。" />
//           <Recorder disabled={loading} onText={(t) => { setAnswer(t); setFeedback(""); }} onRecordingChange={handleRecordingChange} />
//           <div className="reflection-submit">
//             <div className="reflection-field">
//               <label className="input-label" htmlFor="reflection">あなた自身の振り返り <span className="muted-copy">（任意）</span></label>
//               <textarea id="reflection" className="studio-textarea reflection-input" maxLength={2000} value={reflection} onChange={(e) => { setReflection(e.target.value); setFeedback(""); }} disabled={loading} rows={2} placeholder="話して気づいたこと、コーチに相談したいこと。" />
//             </div>
//             <button className="mailbox-submit" onClick={handleSubmit} disabled={loading || !answer.trim()} aria-label="回答と振り返りをコーチに提出する" title="回答と振り返りをコーチに提出する" aria-busy={loading}>
//               <svg viewBox="0 0 64 72" aria-hidden="true" focusable="false"><path d="M12 60V19a20 20 0 0 1 40 0v41Z" fill="currentColor" /><path d="M20 19h24v5H20z" fill="#fff9ed" /><path d="M26 32h12m-12 5h12m-6 0v10" fill="none" stroke="#fff9ed" strokeWidth="3" /><path d="M25 60v7m14-7v7M19 68h26" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
//               <span>{loading ? "送信中…" : "提出する"}</span>
//             </button>
//           </div>
//         </section>
//       </div>
//       <section className="review-panel" aria-labelledby="review-title" aria-busy={loading}>
//         <div className="panel-heading"><span className="eyebrow">03 / REFLECT & GROW</span><span className="small-tag">気づきを次の一歩に</span></div>
//         <h2 id="review-title">回答と振り返りから、次の一歩へ。</h2>
//         {feedback ? <div className="review-grid">
//           <div><p className="input-label">コーチからのフィードバック</p><p className="feedback-copy"><FeedbackText text={feedback} /></p><div className="studio-actions"><button className="studio-button" onClick={speak} disabled={speaking}>{speaking ? "🔊 読み上げ中…" : "🔊 読み上げ"}</button><button className="studio-button" onClick={stopSpeaking} disabled={!speaking} aria-label="読み上げを停止">⏹ 停止</button></div></div>
//           <div><button className="studio-button primary-button save-button" onClick={save} disabled={saving}>{saving ? "保存中…" : "💾 練習を保存する"}</button></div>
//         </div> : <p className="review-empty">{loading ? "コーチがあなたの回答を読んでいます。少しお待ちください。" : "回答と振り返りを送ると、両方を踏まえたフィードバックが届きます。"}</p>}
//       </section>
//     </main>
//   );
// }
