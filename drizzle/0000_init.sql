CREATE TYPE "public"."answer_type" AS ENUM('scale', 'yes_no', 'choice', 'text', 'industry');--> statement-breakpoint
CREATE TYPE "public"."question_kind" AS ENUM('identity', 'core', 'industry', 'tagged');--> statement-breakpoint
CREATE TYPE "public"."response_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "answers" (
	"response_id" uuid NOT NULL,
	"question_id" integer NOT NULL,
	"value" text NOT NULL,
	"score" integer,
	CONSTRAINT "answers_response_id_question_id_pk" PRIMARY KEY("response_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "industries_name_unique" UNIQUE("name"),
	CONSTRAINT "industries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "industry_question_order" (
	"industry_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "industry_question_order_industry_id_question_id_pk" PRIMARY KEY("industry_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "industry_tags" (
	"industry_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "industry_tags_industry_id_tag_id_pk" PRIMARY KEY("industry_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "question_tags" (
	"question_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "question_tags_question_id_tag_id_pk" PRIMARY KEY("question_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"prompt" text NOT NULL,
	"help_text" text DEFAULT '' NOT NULL,
	"kind" "question_kind" NOT NULL,
	"industry_id" integer,
	"answer_type" "answer_type" NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "industry_question_has_industry" CHECK (("questions"."kind" = 'industry') = ("questions"."industry_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"industry_id" integer NOT NULL,
	"short_form_id" integer,
	"company_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"status" "response_status" DEFAULT 'in_progress' NOT NULL,
	"score" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "short_form_questions" (
	"short_form_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	CONSTRAINT "short_form_questions_short_form_id_question_id_pk" PRIMARY KEY("short_form_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "short_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"industry_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_question_order" ADD CONSTRAINT "industry_question_order_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_question_order" ADD CONSTRAINT "industry_question_order_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_tags" ADD CONSTRAINT "industry_tags_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_tags" ADD CONSTRAINT "industry_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_short_form_id_short_forms_id_fk" FOREIGN KEY ("short_form_id") REFERENCES "public"."short_forms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_form_questions" ADD CONSTRAINT "short_form_questions_short_form_id_short_forms_id_fk" FOREIGN KEY ("short_form_id") REFERENCES "public"."short_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_form_questions" ADD CONSTRAINT "short_form_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_forms" ADD CONSTRAINT "short_forms_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE cascade ON UPDATE no action;