"use client";
// src/app/page.tsx

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Recorder from "./Recorder";
import FeedbackText from "./FeedbackText";

// FaceMeter は内部で face-api（ブラウザ専用ライブラリ）を使うため、
// サーバー側では読み込まない設定（ssr: false）にする。
// これにより「サーバーで評価されて壊れる」問題を防げる。
const FaceMeter = dynamic(() => import("./FaceMeter"), { ssr: false });

export default function Home() {
  const [answer, setAnswer] = useState("");
  const [reflection, setReflection] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false); // 今のフィードバックを保存済みか（履歴ボタンの強調に使う）
  const [delivering, setDelivering] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRequestRef = useRef<AbortController | null>(null);
  const savingRef = useRef(false);
  const deliveringRef = useRef(false);

  useEffect(() => () => {
    speechRequestRef.current?.abort();
    audioRef.current?.pause();
  }, []);
  const [smileScore, setSmileScore] = useState(0);
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
    if (loading || !answer.trim()) return;
    stopSpeaking();
    setLoading(true);
    setFeedback("");
    setSaved(false); // 新しいフィードバックは、まだ保存していない
    const scoreToSend = recordedSmileAvg ?? smileScore;
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, answer, reflection, smileScore: scoreToSend }),
      });
      const data = await res.json();
      if (!res.ok || typeof data.feedback !== "string") throw new Error("評価に失敗しました");
      setFeedback(data.feedback);
    } catch {
      alert("コーチへの送信に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  function stopSpeaking() {
    speechRequestRef.current?.abort();
    speechRequestRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.currentTime = 0;
    }
    audioRef.current = null;
    setSpeaking(false);
  }

  async function speak() {
    // stateが更新される前の連打も防ぐ。
    if (speechRequestRef.current || !feedback) return;
    const controller = new AbortController();
    speechRequestRef.current = controller;
    setSpeaking(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: feedback }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("読み上げ失敗");
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (typeof data.audio !== "string" || !data.audio) throw new Error("音声がありません");
      const audio = new Audio("data:audio/mp3;base64," + data.audio);
      audioRef.current = audio;
      audio.onended = stopSpeaking;
      audio.onerror = () => {
        stopSpeaking();
        alert("音声を再生できませんでした。");
      };
      await audio.play();
    } catch {
      if (controller.signal.aborted) return;
      stopSpeaking();
      alert("読み上げに失敗しました。もう一度お試しください。");
    }
  }

  // 今の内容（お題・回答・笑顔率・フィードバック）を、ログイン中のユーザーの記録としてDBに1件保存する
  async function save() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          answer,
          smileScore,
          feedback,
          smileAvg: recordedSmileAvg,
          reflection,
        }),
      });

      // 結果を確認してから知らせる（401 はログインが切れている）
      if (res.status === 401) {
        alert("保存するにはログインしてください");
        return;
      }
      if (!res.ok) {
        throw new Error("保存失敗");
      }

      setSaved(true);
      alert("保存しました");
    } catch {
      alert("保存できませんでした。もう一度お試しください。");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  // フィードバックを、ログイン中のユーザーのメールアドレス宛に送る
  async function deliver() {
    if (deliveringRef.current || !feedback) return;
    deliveringRef.current = true;
    setDelivering(true);
    try {
      const res = await fetch("/api/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      if (res.status === 401) {
        alert("メールで受け取るにはログインしてください");
        return;
      }
      if (!res.ok) throw new Error("送信失敗");
      alert("メールを送りました");
    } catch {
      alert("メール送信に失敗しました（無料枠では自分の登録メール宛のみ送れます）");
    } finally {
      deliveringRef.current = false;
      setDelivering(false);
    }
  }

  return (
    <main className="studio-shell practice-studio">
      <header className="studio-intro">
        <div className="intro-heading"><p className="eyebrow">YOUR CAREER ATELIER</p><h1>あなたの本音、<br />ここで紡ごう。</h1></div><p className="intro-copy">リラックスして、いつもの自分で。<br />勘がすぎずに、まず話す、気づく、また試す。あなただけが練習できるアトリエに。</p>
        <div className="studio-art" aria-hidden="true"><div className="art-print"><i /><b /><span /></div><div className="art-caption">A little practice, a little confidence.</div></div>
      </header>
      <div className="studio-workspace">
        <aside className="mirror-panel">
          <div className="panel-heading"><span className="eyebrow">01 / YOUR SPACE</span><span className="small-tag">表情をチェック</span></div>
          <FaceMeter onScore={handleScore} />
          <div className="smile-readout"><span>いまの笑顔率</span><strong style={{ color: smileColor(smileScore) }}>{smileScore}<small>%</small> <span className="smile-emoji">{smileEmoji(smileScore)}</span></strong></div>
          <meter className="smile-meter" min={0} max={100} value={smileScore} aria-label="いまの笑顔率" />
          {recordedSmileAvg !== null && <p className="average-note">録音中の平均笑顔率 <strong>{recordedSmileAvg}%</strong></p>}
          <p className="mirror-note">うまく話すより、まずはあなたの言葉で。<br />肩の力を抜いてはじめましょう。</p>
        </aside>
        <section className="practice-panel" aria-labelledby="practice-title">
          <div className="panel-heading"><span className="eyebrow">02 / PRACTICE</span><span className="small-tag">面接トレーニング</span></div>
          <div className="topic-heading"><h2 id="practice-title">{topic}</h2><span className="time-stamp">約 1 分</span></div>
          <p className="muted-copy">あなたの経験や大切にしていることを、聞き手に届けてみましょう。</p>
          <label className="input-label" htmlFor="answer">あなたの回答</label>
          <textarea id="answer" className="studio-textarea answer-paper" maxLength={4000} value={answer} onChange={(e) => { setAnswer(e.target.value); setFeedback(""); }} disabled={loading} rows={4} placeholder="ここに回答を入力、またはマイクで話してみましょう。" />
          <Recorder disabled={loading} onText={(t) => { setAnswer(t); setFeedback(""); }} onRecordingChange={handleRecordingChange} />
          <div className="reflection-submit">
            <div className="reflection-field">
              <label className="input-label" htmlFor="reflection">あなた自身の振り返り <span className="muted-copy">（任意）</span></label>
              <textarea id="reflection" className="studio-textarea reflection-input" maxLength={2000} value={reflection} onChange={(e) => { setReflection(e.target.value); setFeedback(""); }} disabled={loading} rows={2} placeholder="話して気づいたこと、コーチに相談したいこと。" />
            </div>
            <button className="mailbox-submit" onClick={handleSubmit} disabled={loading || !answer.trim()} aria-label="回答と振り返りをコーチに提出する" title="回答と振り返りをコーチに提出する" aria-busy={loading}>
              <svg viewBox="0 0 64 72" aria-hidden="true" focusable="false"><path d="M12 60V19a20 20 0 0 1 40 0v41Z" fill="currentColor" /><path d="M20 19h24v5H20z" fill="#fff9ed" /><path d="M26 32h12m-12 5h12m-6 0v10" fill="none" stroke="#fff9ed" strokeWidth="3" /><path d="M25 60v7m14-7v7M19 68h26" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
              <span>{loading ? "送信中…" : "提出する"}</span>
            </button>
          </div>
        </section>
      </div>
      <section className="review-panel" aria-labelledby="review-title" aria-busy={loading}>
        <div className="panel-heading"><span className="eyebrow">03 / REFLECT & GROW</span><span className="small-tag">気づきを次の一歩に</span></div>
        <h2 id="review-title">回答と振り返りから、次の一歩へ。</h2>
        {feedback ? <div className="review-grid">
          <div><p className="input-label">コーチからのフィードバック</p><p className="feedback-copy"><FeedbackText text={feedback} /></p><div className="studio-actions"><button className="studio-button" onClick={speak} disabled={speaking}>{speaking ? "🔊 読み上げ中…" : "🔊 読み上げ"}</button><button className="studio-button" onClick={stopSpeaking} disabled={!speaking} aria-label="読み上げを停止">⏹ 停止</button></div></div>
          {/* 保存とメールは「ログイン中だけ」表示する */}
          <div>
            <SignedIn>
              {/* 保存・メール・記録の3つを、同じ大きさの丸アイコンで右下に並べる。
                  保存したら「記録を見る」を塗りつぶして、見に行けることを伝える */}
              <div className="coach-icon-actions">
                <button type="button" className={`coach-icon${saved ? " is-done" : ""}`} onClick={save} disabled={saving}>
                  <span className="coach-icon-circle">
                    {saved
                      ? <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                      : <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v5h7V3M8 21v-7h8v7" /></svg>}
                  </span>
                  <span>{saving ? "保存中…" : saved ? "保存しました" : "練習を保存する"}</span>
                </button>
                <button type="button" className="coach-icon" onClick={deliver} disabled={delivering}>
                  <span className="coach-icon-circle"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18v12H3z" /><path d="M3 7l9 7 9-7" /></svg></span>
                  <span>{delivering ? "送信中…" : "メールで受け取る"}</span>
                </button>
                <Link className={`coach-icon${saved ? " is-active" : ""}`} href="/history">
                  <span className="coach-icon-circle"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z" /><path d="M12 6v13.5" /></svg></span>
                  <span>練習の記録を見る</span>
                </Link>
              </div>
            </SignedIn>
            <SignedOut>
              <p className="muted-copy">練習を保存・メールで受け取るには、ログインしてください。</p>
              <SignInButton><button className="studio-button primary-button">ログインする</button></SignInButton>
            </SignedOut>
          </div>
        </div> : <p className="review-empty">{loading ? "コーチがあなたの回答を読んでいます。少しお待ちください。" : "回答と振り返りを送ると、両方を踏まえたフィードバックが届きます。"}</p>}
      </section>
    </main>
  );
}
