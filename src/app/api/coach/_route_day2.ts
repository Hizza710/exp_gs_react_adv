// src/app/api/coach/route.ts
export async function POST(request: Request) {
  const { topic, answer, smileScore } = await request.json();
  const prompt = `あなたはプレゼン/面接の練習コーチです。
次の「お題」に対する「回答」を読んで、良かった点と改善点を、
やさしく具体的に、200文字くらいで日本語でフィードバックしてください。
お題: ${topic}
回答: ${answer}
笑顔率: ${smileScore}%`;

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

  const data = await res.json();
  const feedback = data.choices[0].message.content;
  return Response.json({ feedback });
}

