import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),              // 通し番号（主キー・自動）
    userId: text("user_id").notNull(),          // 誰のデータか
    topic: text("topic").notNull(),             // お題
    answerText: text("answer_text"),            // 回答
    smileScore: integer("smile_score"),         // 笑顔スコア
    feedback: text("feedback"),                 // AIのフィードバック
    createdAt: timestamp("created_at").defaultNow().notNull(), // 作成日時
    smileAvg: integer("smile_avg"),             // 録音中の平均笑顔率
    reflection: text("reflection"),             // 本人の振り返り
  },
  (table) => [
    // 一覧の問い合わせは「WHERE user_id = ? ORDER BY created_at DESC」の形。
    // user_id と created_at を1本の複合インデックスにまとめると、
    // 絞り込みと並べ替えの両方をこれ1本でまかなえる（別々に2本作るより効く）。
    // 並び順まで一致させたいので created_at 側は desc で作る。
    index("sessions_user_id_created_at_idx").on(table.userId, table.createdAt.desc()),
  ],
);
