// app/api/sessions/route.ts
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

// 一覧（自分のだけ・新しい順）
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "ログインしてください" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt));

  return Response.json(rows);
}

// 1件保存（本物のログインidで）
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "ログインしてください" }, { status: 401 });
  }

  const body = await request.json();
  await db.insert(sessions).values({
    userId, // ← "demo" ではなく、本物のログインid
    topic: body.topic,
    answerText: body.answer,
    smileScore: body.smileScore,
    feedback: body.feedback,
  });

  return Response.json({ ok: true });
}


// // app/api/sessions/route.ts
// import { db, CURRENT_USER_ID } from "@/db";
// import { sessions } from "@/db/schema";
// import { desc, eq } from "drizzle-orm";

// // 入力の上限（DBに入れる前に弾く）
// const LIMITS = {
//   topic: 200,
//   answer: 4000,
//   feedback: 8000,
//   reflection: 2000,
// } as const;

// // 文字列として妥当か＋長さが上限内かを確かめる。問題があればメッセージを返す。
// function checkText(value: unknown, label: string, max: number) {
//   if (value === undefined || value === null) return null; // 任意項目は未送信でもよい
//   if (typeof value !== "string") return `${label}は文字列で送ってください`;
//   if (value.length > max) return `${label}が長すぎます（${max}文字までにしてください）`;
//   return null;
// }

// // 笑顔率は 0〜100 の整数しか受け付けない
// function checkScore(value: unknown, label: string) {
//   if (value === undefined || value === null) return null;
//   if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
//     return `${label}は0〜100の整数で送ってください`;
//   }
//   return null;
// }

// // 一覧を取得（新しい順）
// export async function GET() {
//   const rows = await db
//     .select()
//     .from(sessions)
//     .where(eq(sessions.userId, CURRENT_USER_ID))
//     .orderBy(desc(sessions.createdAt));
//   return Response.json(rows);
// }

// // 1件保存
// export async function POST(request: Request) {
//   let body;
//   try {
//     body = await request.json();
//   } catch {
//     return Response.json({ error: "リクエストの形式が不正です" }, { status: 400 });
//   }

//   // お題は必須。それ以外は未記入でも保存できる。
//   if (typeof body.topic !== "string" || !body.topic.trim()) {
//     return Response.json({ error: "お題がありません" }, { status: 400 });
//   }

//   const problem =
//     checkText(body.topic, "お題", LIMITS.topic) ??
//     checkText(body.answer, "回答", LIMITS.answer) ??
//     checkText(body.feedback, "フィードバック", LIMITS.feedback) ??
//     checkText(body.reflection, "振り返り", LIMITS.reflection) ??
//     checkScore(body.smileScore, "笑顔スコア") ??
//     checkScore(body.smileAvg, "平均笑顔率");
//   if (problem) {
//     return Response.json({ error: problem }, { status: 400 });
//   }

//   await db.insert(sessions).values({
//     userId: CURRENT_USER_ID,
//     topic: body.topic,
//     answerText: body.answer,
//     smileScore: body.smileScore,
//     feedback: body.feedback,
//     smileAvg: body.smileAvg,
//     reflection: body.reflection,
//   });

//   return Response.json({ ok: true });
// }
