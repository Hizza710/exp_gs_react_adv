// app/api/sessions/[id]/route.ts
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "ログインしてください" }, { status: 401 });

  const { id } = await params;
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, Number(id)), eq(sessions.userId, userId)));

  return Response.json(rows[0] ?? null);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "ログインしてください" }, { status: 401 });

  const { id } = await params;
  await db
    .delete(sessions)
    .where(and(eq(sessions.id, Number(id)), eq(sessions.userId, userId)));

  return Response.json({ ok: true });
}

// // app/api/sessions/[id]/route.ts
// import { db, CURRENT_USER_ID } from "@/db";
// import { sessions } from "@/db/schema";
// import { and, eq } from "drizzle-orm";

// // URLの :id は文字列で届く。数字でないものを Number() に通すと NaN になり、
// // そのまま SQL に渡すとエラーになるため、ここで弾いておく。
// function parseId(raw: string) {
//   const id = Number(raw);
//   return Number.isInteger(id) && id > 0 ? id : null;
// }

// // 1件だけ取得
// export async function GET(
//   _request: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const { id: raw } = await params; // Next.js16では params は await が必要
//   const id = parseId(raw);
//   if (id === null) return Response.json({ error: "IDが不正です" }, { status: 400 });

//   // 「そのIDである」だけでなく「自分のものである」ことも条件にする。
//   // こうしておけば、他人のIDを指定しても取得できない。
//   const rows = await db
//     .select()
//     .from(sessions)
//     .where(and(eq(sessions.id, id), eq(sessions.userId, CURRENT_USER_ID)));

//   if (!rows[0]) return Response.json({ error: "見つかりません" }, { status: 404 });
//   return Response.json(rows[0]);
// }

// // 1件 削除
// export async function DELETE(
//   _request: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const { id: raw } = await params;
//   const id = parseId(raw);
//   if (id === null) return Response.json({ error: "IDが不正です" }, { status: 400 });

//   // 取得と同じ条件。自分のレコード以外は、IDを直接指定されても消えない。
//   const deleted = await db
//     .delete(sessions)
//     .where(and(eq(sessions.id, id), eq(sessions.userId, CURRENT_USER_ID)))
//     .returning({ id: sessions.id });

//   if (deleted.length === 0) return Response.json({ error: "見つかりません" }, { status: 404 });
//   return Response.json({ ok: true });
// }
