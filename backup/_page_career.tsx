"use client";
// src/app/page.tsx
//
// 「心動くキャリア対話」サービスの入り口ページ（MVP・第3弾）
// ① キャラクター選択 → ② 対話フロー（右上固定キャラクター＋吹き出し＋回答一覧パネル）
//
// ※ 以前のバージョン（4カード式のプレゼン練習コーチ）は
//   src/app/_page_idea1.tsx にバックアップとして残してあります。

import { useEffect, useRef, useState } from "react";

// キャラクターの情報をまとめておく（増やしたい時はここに追加するだけでOK）
// voice: 音声読み上げ（EdgeTTS）で使う声の名前。日本語で選べる声が2種類しかないため、
// 3キャラのうち2人は同じ声を共有している（将来、声の種類が増えたら分ければOK）
const CHARACTERS = [
  {
    id: "gentle",
    emoji: "🌱",
    name: "やさしい先輩",
    desc: "共感しながら、ゆっくり話を聞いてくれる。じっくり考えながら話したい人向け。",
    voice: "ja-JP-NanamiNeural",
  },
  {
    id: "passionate",
    emoji: "🔥",
    name: "情熱コーチ",
    desc: "テンポよく背中を押してくれる。勢いで話したい人向け。",
    voice: "ja-JP-KeitaNeural",
  },
  {
    id: "navigator",
    emoji: "🧭",
    name: "冷静なナビゲーター",
    desc: "話を論理的に整理してくれる。頭の中を整理しながら話したい人向け。",
    voice: "ja-JP-KeitaNeural",
  },
] as const;

// CHARACTERS の中の id だけを取り出した型（"gentle" | "passionate" | "navigator"）
type CharacterId = (typeof CHARACTERS)[number]["id"];

// 対話の進み方をステップという単位で管理する
type Step =
  | "select"
  | "q0"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "q6"
  | "q7"
  | "q9"
  | "q10"
  | "done";

// 各ステップで表示する質問文（キャラクターによって口調を変える拡張は後で行う）
const QUESTIONS: { step: Step; text: string }[] = [
  { step: "q0", text: "こんにちは、簡単に自己紹介をお願いします。" },
  { step: "q1", text: "自分ってどんなことに力が湧いたり、心動く人だと思っている？思っていることを何でも聞かせて。" },
  { step: "q2", text: "その時の具体的なエピソードと、どんな瞬間に心動いたかを聞かせて。" },
  { step: "q3", text: "そのほかにも、心動くことがあれば聞かせて（いくつでもOK）。書き終わったら「次へ」を押してね。" },
  { step: "q4", text: "いろんなことをやってきたんだね。そこで培われた、あなたの強みってどんなところだと思う？" },
  { step: "q5", text: "その強みを活かして働くなら、どんな仕事なら興味がある？業界や職種は気にせず、自分がこういうことならやってみたいな、でいいよ。" },
  { step: "q6", text: "ちなみに、どんな人の力になれると、達成感を感じたり、喜びを感じるってことはある？" },
  { step: "q7", text: "そんな仕事ができたとして、人生としては、10年後、こうなっていたらいいなってことはある？" },
];

// 回答をまとめて持っておく型
type Answers = {
  intro: string;
  energizing: string;
  episode: string;
  moreEnergizing: string[];
  strength: string;
  wantedJob: string;
  whoToHelp: string;
  visionIn10Years: string;
  summaryFeedback: "yes" | "no" | null;
  honestFeeling: string;
  canDo: string;
  needHelp: string;
};

const EMPTY_ANSWERS: Answers = {
  intro: "",
  energizing: "",
  episode: "",
  moreEnergizing: [],
  strength: "",
  wantedJob: "",
  whoToHelp: "",
  visionIn10Years: "",
  summaryFeedback: null,
  honestFeeling: "",
  canDo: "",
  needHelp: "",
};

// answers-panel に表示する「これまでの回答」一覧を作るための定義
// label と、answers の中のどの値を出すかをまとめておく
const ANSWER_ITEMS: { label: string; get: (a: Answers) => string }[] = [
  { label: "自己紹介", get: (a) => a.intro },
  { label: "心動くこと", get: (a) => a.energizing },
  { label: "エピソード", get: (a) => a.episode },
  { label: "その他心動くこと", get: (a) => a.moreEnergizing.join(" / ") },
  { label: "強み", get: (a) => a.strength },
  { label: "やってみたい仕事", get: (a) => a.wantedJob },
  { label: "力になりたい人", get: (a) => a.whoToHelp },
  { label: "10年後のビジョン", get: (a) => a.visionIn10Years },
  { label: "今できること", get: (a) => a.canDo },
];

export default function Home() {
  const [selected, setSelected] = useState<CharacterId | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);

  const [draft, setDraft] = useState("");
  const [moreDraft, setMoreDraft] = useState("");

  // 音声読み上げのON/OFF（ユーザーが🔊ボタンで切り替えられる）
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // 再生中の <audio> 要素を覚えておく箱（次の質問が来たら、これを止めてから新しい音声を鳴らす）
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 文章をキャラクターの声で読み上げる関数
  // 1. /api/tts に文章を送る → 2. base64の音声データが返ってくる → 3. ブラウザで再生する
  async function speak(text: string, voice: string) {
    // 前に再生していた音声があれば止める（質問がどんどん切り替わっても声が重ならないように）
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    try {
      setIsSpeaking(true);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });
      const data = await res.json();
      const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
      audioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      await audio.play();
    } catch (err) {
      console.error("読み上げに失敗しました", err);
      setIsSpeaking(false);
    }
  }

  function startDialogue() {
    setStep("q0");
  }

  function goNext() {
    if (step === "q0") {
      setAnswers((prev) => ({ ...prev, intro: draft }));
      setStep("q1");
    } else if (step === "q1") {
      setAnswers((prev) => ({ ...prev, energizing: draft }));
      setStep("q2");
    } else if (step === "q2") {
      setAnswers((prev) => ({ ...prev, episode: draft }));
      setStep("q3");
    } else if (step === "q3") {
      setStep("q4");
    } else if (step === "q4") {
      setAnswers((prev) => ({ ...prev, strength: draft }));
      setStep("q5");
    } else if (step === "q5") {
      setAnswers((prev) => ({ ...prev, wantedJob: draft }));
      setStep("q6");
    } else if (step === "q6") {
      setAnswers((prev) => ({ ...prev, whoToHelp: draft }));
      setStep("q7");
    } else if (step === "q7") {
      setAnswers((prev) => ({ ...prev, visionIn10Years: draft }));
      setStep("q10");
    } else if (step === "q9") {
      setAnswers((prev) => ({ ...prev, honestFeeling: draft }));
      setStep("q10");
    } else if (step === "q10") {
      setAnswers((prev) => ({ ...prev, canDo: draft }));
      setStep("done");
    }
    setDraft("");
  }

  function addMoreEnergizing() {
    if (!moreDraft.trim()) return;
    setAnswers((prev) => ({
      ...prev,
      moreEnergizing: [...prev.moreEnergizing, moreDraft.trim()],
    }));
    setMoreDraft("");
  }

  const currentQuestion = QUESTIONS.find((q) => q.step === step);
  const character = CHARACTERS.find((c) => c.id === selected);
  const characterName = character?.name ?? "";
  const characterEmoji = character?.emoji ?? "🙂";

  // 質問が切り替わるたびに、キャラクターの声で自動読み上げる
  // （audioEnabled が false ＝ミュート中なら何もしない）
  useEffect(() => {
    if (!audioEnabled) return;
    if (!currentQuestion || !character) return;
    speak(currentQuestion.text, character.voice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, audioEnabled]);

  // 「これまでの回答」のうち、まだ何も書かれていないものは一覧から除く
  const filledAnswerItems = ANSWER_ITEMS.filter((item) => item.get(answers).trim() !== "");

  return (
    <main className="container">
      <h1 className="title">心動くキャリアをつくる旅</h1>

      {/* ── キャラクターは対話が始まったら、常に右上に固定表示する ── */}
      {selected && step !== "select" && (
        <div className="character-fixed">
          <div className="character-fixed-emoji">{characterEmoji}</div>
          <div className="character-fixed-name">{characterName}</div>
          <button
            className="character-fixed-mute"
            onClick={() => setAudioEnabled((prev) => !prev)}
            title={audioEnabled ? "読み上げをオフにする" : "読み上げをオンにする"}
          >
            {audioEnabled ? (isSpeaking ? "🔊" : "🔉") : "🔇"}
          </button>
        </div>
      )}

      {/* ── ① キャラクター選択画面 ── */}
      {step === "select" && (
        <>
          <p className="lead-text">
            綺麗にまとめようとせず、自分の本音で話してみてね。{"\n"}
            普段は「考えてから言葉にする」ことを求められるけど、ここでは考えずに、
            まず心や頭に浮かぶことを自由に投げてみて。{"\n"}
            もやもやしていても、きれいごとでなくてもOK。
            あなたのホントで心動くキャリアをつくる旅に、一歩踏み出そう。
          </p>

          <p className="field-label" style={{ marginTop: 24 }}>
            まずは、伴走してほしいキャラクターを選んでください
          </p>

          <div className="character-grid">
            {CHARACTERS.map((c) => (
              <div
                key={c.id}
                className={`character-card ${selected === c.id ? "character-card-selected" : ""}`}
                onClick={() => setSelected(c.id)}
              >
                <span className="character-emoji">{c.emoji}</span>
                <div className="character-name">{c.name}</div>
                <div className="character-desc">{c.desc}</div>
              </div>
            ))}
          </div>

          {selected && (
            <div className="actions">
              <button className="btn btn-primary" onClick={startDialogue}>
                {characterName} と話しはじめる
              </button>
            </div>
          )}
        </>
      )}

      {/* ── ② 対話フロー：質問は吹き出しで表示 ── */}
      {currentQuestion && (
        <>
          <div className="speech-bubble">
            <p className="speech-bubble-text">{currentQuestion.text}</p>

            {step === "q3" ? (
              <>
                <div className="actions-row" style={{ marginTop: 12 }}>
                  <textarea
                    className="textarea"
                    rows={2}
                    value={moreDraft}
                    onChange={(e) => setMoreDraft(e.target.value)}
                    placeholder="心動くことを1つ書いて「追加」を押してね"
                  />
                  <button className="btn btn-primary" onClick={addMoreEnergizing}>
                    追加
                  </button>
                </div>
                {answers.moreEnergizing.length > 0 && (
                  <ul style={{ marginTop: 8 }}>
                    {answers.moreEnergizing.map((item, i) => (
                      <li key={i} className="field-label">・{item}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <textarea
                className="textarea"
                rows={4}
                style={{ marginTop: 12 }}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="思いついたことを、そのまま書いてみてね"
              />
            )}

            <div className="actions">
              <button className="btn btn-primary" onClick={goNext}>
                次へ
              </button>
            </div>
          </div>

          {/* ── これまでの回答を、対話中でも一画面でまとめて見られるパネル ── */}
          {filledAnswerItems.length > 0 && (
            <div className="answers-panel">
              <p className="answers-panel-title">📝 ここまでの回答</p>
              {filledAnswerItems.map((item) => (
                <p key={item.label} className="answers-panel-item">
                  <span className="answers-panel-label">{item.label}：</span>
                  {item.get(answers)}
                </p>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── 対話完了（ひとまずのゴール。AI要約は次のステップで実装） ── */}
      {step === "done" && (
        <div className="feedback-box">
          <h3 className="feedback-title">ここまでの回答（確認用）</h3>
          <div className="feedback-body">
            {ANSWER_ITEMS.map((item) => (
              <p key={item.label}>{item.label}：{item.get(answers)}</p>
            ))}
          </div>
          <p className="field-label" style={{ marginTop: 12 }}>
            （この続き：AIによる要約・ギフト画面は次のステップで実装します）
          </p>
        </div>
      )}
    </main>
  );
}
