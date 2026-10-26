/**
 * Database schema. This file is the single source of truth for the tables:
 * `npm run db:generate` diffs it against the last migration and writes a new
 * SQL migration into /drizzle, and the TypeScript types used throughout the
 * app are inferred from it.
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * identity – asked first, before we know the company's industry. One of them
 *            (answer type "industry") determines which industry track to use.
 * core     – asked in every industry's survey.
 * industry – belongs to exactly one industry.
 * tagged   – general-purpose; slotted into any industry that shares a tag.
 */
export const questionKind = pgEnum("question_kind", ["identity", "core", "industry", "tagged"]);

/**
 * scale    – 1-5 agreement scale; the answer is the score.
 * yes_no   – yes scores 5, no scores 1.
 * choice   – pick one option; each option carries its own 1-5 score.
 * text     – free text, not scored.
 * industry – dropdown of active industries (identity questions only), not scored.
 */
export const answerType = pgEnum("answer_type", ["scale", "yes_no", "choice", "text", "industry"]);

export const responseStatus = pgEnum("response_status", ["in_progress", "completed"]);

export type ChoiceOption = { label: string; score: number | null };

export const industries = pgTable("industries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
});

/** Which tags an industry pulls questions from. */
export const industryTags = pgTable(
  "industry_tags",
  {
    industryId: integer("industry_id")
      .notNull()
      .references(() => industries.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.industryId, t.tagId] })],
);

export const questions = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    prompt: text("prompt").notNull(),
    helpText: text("help_text").notNull().default(""),
    kind: questionKind("kind").notNull(),
    // Only set for kind = 'industry'.
    industryId: integer("industry_id").references(() => industries.id, { onDelete: "cascade" }),
    answerType: answerType("answer_type").notNull(),
    // Only used for answer_type = 'choice' (and unscored identity choices).
    options: jsonb("options").$type<ChoiceOption[]>().notNull().default([]),
    // Relative importance when averaging scores. 0 = asked but not scored.
    weight: integer("weight").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // An industry question must name its industry; nothing else may.
    check("industry_question_has_industry", sql`(${t.kind} = 'industry') = (${t.industryId} IS NOT NULL)`),
  ],
);

export const questionTags = pgTable(
  "question_tags",
  {
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.tagId] })],
);

/**
 * Optional per-industry custom ordering set by an admin. If an industry has no
 * rows here, its questions use the default sort. Questions added to the
 * industry later (and so missing a row) go to the end in default order.
 */
export const industryQuestionOrder = pgTable(
  "industry_question_order",
  {
    industryId: integer("industry_id")
      .notNull()
      .references(() => industries.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.industryId, t.questionId] })],
);

/** A short-form survey is a named subset of one industry's questions. */
export const shortForms = pgTable("short_forms", {
  id: serial("id").primaryKey(),
  industryId: integer("industry_id")
    .notNull()
    .references(() => industries.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shortFormQuestions = pgTable(
  "short_form_questions",
  {
    shortFormId: integer("short_form_id")
      .notNull()
      .references(() => shortForms.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.shortFormId, t.questionId] })],
);

/** One company's run through a survey. The UUID id doubles as the URL token. */
export const responses = pgTable("responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  industryId: integer("industry_id")
    .notNull()
    .references(() => industries.id, { onDelete: "cascade" }),
  shortFormId: integer("short_form_id").references(() => shortForms.id, { onDelete: "set null" }),
  companyName: text("company_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  status: responseStatus("status").notNull().default("in_progress"),
  score: doublePrecision("score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const answers = pgTable(
  "answers",
  {
    responseId: uuid("response_id")
      .notNull()
      .references(() => responses.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    // Raw answer: "1".."5" for scale, "yes"/"no", option index for choice,
    // free text, or an industry id.
    value: text("value").notNull(),
    // 1-5, or null for unscored answers. Kept per answer for the future dashboard.
    score: integer("score"),
  },
  (t) => [primaryKey({ columns: [t.responseId, t.questionId] })],
);

// Relations power Drizzle's `db.query.*` API (nested reads without hand-written joins).
export const industriesRelations = relations(industries, ({ many }) => ({
  industryTags: many(industryTags),
  shortForms: many(shortForms),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  industryTags: many(industryTags),
  questionTags: many(questionTags),
}));

export const industryTagsRelations = relations(industryTags, ({ one }) => ({
  industry: one(industries, { fields: [industryTags.industryId], references: [industries.id] }),
  tag: one(tags, { fields: [industryTags.tagId], references: [tags.id] }),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  industry: one(industries, { fields: [questions.industryId], references: [industries.id] }),
  questionTags: many(questionTags),
}));

export const questionTagsRelations = relations(questionTags, ({ one }) => ({
  question: one(questions, { fields: [questionTags.questionId], references: [questions.id] }),
  tag: one(tags, { fields: [questionTags.tagId], references: [tags.id] }),
}));

export const shortFormsRelations = relations(shortForms, ({ one, many }) => ({
  industry: one(industries, { fields: [shortForms.industryId], references: [industries.id] }),
  shortFormQuestions: many(shortFormQuestions),
}));

export const shortFormQuestionsRelations = relations(shortFormQuestions, ({ one }) => ({
  shortForm: one(shortForms, { fields: [shortFormQuestions.shortFormId], references: [shortForms.id] }),
  question: one(questions, { fields: [shortFormQuestions.questionId], references: [questions.id] }),
}));

export const responsesRelations = relations(responses, ({ one, many }) => ({
  industry: one(industries, { fields: [responses.industryId], references: [industries.id] }),
  shortForm: one(shortForms, { fields: [responses.shortFormId], references: [shortForms.id] }),
  answers: many(answers),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  response: one(responses, { fields: [answers.responseId], references: [responses.id] }),
  question: one(questions, { fields: [answers.questionId], references: [questions.id] }),
}));

export type Industry = typeof industries.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type ShortForm = typeof shortForms.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type QuestionKind = (typeof questionKind.enumValues)[number];
export type AnswerType = (typeof answerType.enumValues)[number];
