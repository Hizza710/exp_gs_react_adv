// src/app/api/coach/route.ts
export async function POST(request: Request) {
  // ① 入力を受け取る（画面から送られてくる お題 と 回答）
  //   Body が空/JSONでない時に備えて、try で受け止める
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ feedback: "リクエストの形式が不正です（BrunoのBodyがJSONか確認してください）" }, { status: 400 });
  }
  // 受け取るフィールドを拡張：topic, tone, mode, answers, coachQuestion
  const { topic, answer, tone, mode, answers, coachQuestion } = body;

  // ② AIへの"お願い文"を組み立てる
  // --- 変更前のシンプルな prompt（参照用・コメント化） ---
  // const prompt = `あなたはプレゼン/面接の練習コーチです。
  // 「${tone}」な口調で、次の「お題」に対する「回答」を読んで、
  // 良かった点と改善点を、具体的に、200文字くらいで日本語でフィードバックしてください。
  // お題: ${topic}
  // 回答: ${answer}`;

  // coachQuestion に応じたプロンプトを作成
  function safe(v: any) {
    return v === undefined || v === null || v === "" ? "(未記入)" : String(v);
  }

  let prompt = "";
  const t = safe(tone);
  const top = safe(topic);

  // answers が与えられている場合は real/ideal を安全に展開
  const real = (answers && answers.real) || { intro: "", motivation: "", contribution: "", vision: "" };
  const ideal = (answers && answers.ideal) || { intro: "", motivation: "", contribution: "", vision: "" };

  if (coachQuestion === "consistency") {
    // 伝わりやすさテンプレ
    const from = (mode === "ideal" ? ideal : real);
    prompt = `あなたはプレゼン/面接の練習コーチです。\n「${t}」な口調で、次の回答を読み、伝わりやすさ（構成・導入→本論→結論、要点の明確さ、不要な重複の有無）に注目してフィードバックしてください。\n出力は「良かった点（3つ以内）」と「改善点（具体的な改善案 2つ）」に分け、合計で200〜300文字の日本語でお願いします。\n\n[お題] ${top}\n[回答]\n- 自己紹介: ${safe(from.intro)}\n- 志望動機: ${safe(from.motivation)}\n- 貢献価値: ${safe(from.contribution)}\n- ビジョン: ${safe(from.vision)}`;
  } else if (coachQuestion === "uniqueness") {
    // 自分らしさテンプレ
    const from = (mode === "ideal" ? ideal : real);
    prompt = `あなたはプレゼン/面接の練習コーチです。\n「${t}」な口調で、次の回答を読み、応募者としての「自分らしさ（差別化）」が伝わるかを評価してください。\n特に、エピソードの具体性、数字/成果の使用、感情的な共感ポイントがあるかをチェックし、「差別化できている点（箇条）」と「強化すべきポイント（具体案）」を150〜250文字の日本語で出力してください。\n\n[お題] ${top}\n[回答]\n- 自己紹介: ${safe(from.intro)}\n- 志望動機: ${safe(from.motivation)}\n- 貢献価値: ${safe(from.contribution)}\n- ビジョン: ${safe(from.vision)}`;
  } else if (coachQuestion === "authenticness") {
    // 現実と理想のギャップ比較テンプレ
    prompt = `あなたはプレゼン/面接の練習コーチです。\n「${t}」な口調で、以下の【現実（real）】と【理想（ideal）】を比較し、各項目ごとに\n1) ギャップの要約（1行）\n2) 最優先で取り組むべき具体的行動（1つ）\nを日本語で示してください。最後に全体の総評（50〜100文字）を付けてください。\n\n[お題] ${top}\n[現実（real）]\n- 自己紹介: ${safe(real.intro)}\n- 志望動機: ${safe(real.motivation)}\n- 貢献価値: ${safe(real.contribution)}\n- ビジョン: ${safe(real.vision)}\n\n[理想（ideal）]\n- 自己紹介: ${safe(ideal.intro)}\n- 志望動機: ${safe(ideal.motivation)}\n- 貢献価値: ${safe(ideal.contribution)}\n- ビジョン: ${safe(ideal.vision)}`;
  } else {
    // デフォルト：従来の単一回答フィードバック（answer を使う）
    prompt = `あなたはプレゼン/面接の練習コーチです。\n「${t}」な口調で、次の「お題」に対する「回答」を読んで、良かった点と改善点を、具体的に、200文字くらいで日本語でフィードバックしてください。\nお題: ${top}\n回答: ${safe(answer)}`;
  }

  // ③ Groq を叩く（キーはサーバー側の環境変数から。ブラウザには出ない）
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  // ④ 返事を取り出す
  const data = await res.json();

  // Groqがエラーを返した時（キー違い・回数制限など）はここで気づける
  if (!res.ok || !data.choices) {
    console.error("Groqエラー:", data);
    return Response.json(
      { feedback: "AIとの通信に失敗しました。ターミナルの赤い文字（キー違い・回数制限など）を確認してください。" },
      { status: 502 },
    );
  }

  const feedback = data.choices[0].message.content;

  // ⑤ 画面に返す
  return Response.json({ feedback });
}