// db/index.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// 今は全員この固定IDで保存/取得している（Day4で本物のログインidに置きかえる）。
// 保存・取得・削除で同じ値を使うため、1か所にまとめておく。
// ここを「ログイン中のユーザーID」に差し替えれば、各ルートの where 条件はそのまま使える。
export const CURRENT_USER_ID = "demo";
