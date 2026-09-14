CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic" text NOT NULL,
	"answer_text" text,
	"smile_score" integer,
	"feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
