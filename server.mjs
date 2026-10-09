// Minimal local API server for the Demographic Questionnaire app: resolves a participant's
// research-configured demographic question set via their magic link and accepts their one-shot
// answer submission, against the shared Neon Postgres database. Run with
// `node --env-file=.env server.mjs` (Neon) or `--env-file=.env.local` (local dev Postgres,
// DB_MODE=local). Mirrors the pattern used by task-app-andrejkatin's/REI-40/Big Five's own
// server.mjs — no file upload here, so no multer.

import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import { createLocalSql } from './server/local-db.mjs';

const PORT = process.env.PORT || 4315;

// Dual-mode (DB_MODE=local for local dev Postgres, else Neon) — same convention as every other
// app in this ecosystem.
let dbClient;
function getDb() {
  if (!dbClient) {
    if (process.env.DB_MODE === 'local') {
      const url = process.env.LOCAL_DATABASE_URL;
      if (!url) throw new Error('LOCAL_DATABASE_URL environment variable is not set (DB_MODE=local)');
      dbClient = createLocalSql(url);
      console.log('[db] developer mode: local Postgres');
    } else {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error('DATABASE_URL environment variable is not set');
      dbClient = neon(url);
    }
  }
  return dbClient;
}

function isNonEmptyString(v, max) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max;
}

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json());

// Resolves a DEMOGRAPHIC magic-link token to the research's currently-configured question set —
// live, not baked into the token (an admin editing questions takes effect on the same link
// immediately, same as REI-40's Rei40Variant / task-app's GenericTaskId resolution). Joins on
// ParticipantGuid, not the bare ParticipantId string, same established per-research-scoping rule
// every sibling app's server.mjs already follows.
async function resolveDemographicLink(sql, token) {
  const rows = await sql`
    SELECT sat."ParticipantId", sat."ParticipantGuid", sat."ExpiresAt", p."Language",
           r."ConsentPortalActive", p."ResearchId"
    FROM "SurveyAccessToken" sat
    JOIN "Participant" p ON p."Guid" = sat."ParticipantGuid"
    JOIN "Research" r ON r."Id" = p."ResearchId"
    WHERE sat."Token" = ${token} AND sat."SurveyType" = 'DEMOGRAPHIC'
    LIMIT 1
  `;
  if (!rows.length) return { error: 'NOT_FOUND' };
  const row = rows[0];
  if (new Date(row.ExpiresAt) < new Date()) return { error: 'EXPIRED' };
  if (row.ConsentPortalActive === false) return { error: 'NOT_ACTIVE' };
  const existing = await sql`SELECT 1 FROM "DemographicResponse" WHERE "ParticipantGuid" = ${row.ParticipantGuid} LIMIT 1`;
  if (existing.length) return { error: 'ALREADY_COMPLETED' };
  return { row };
}

async function loadQuestions(sql, researchId) {
  const qRows = await sql`
    SELECT "Id", "QuestionType", "PromptSr", "PromptEn" FROM "DemographicQuestion"
    WHERE "ResearchId" = ${researchId} ORDER BY "SortOrder"
  `;
  const qIds = qRows.map((q) => q.Id);
  const optRows = qIds.length
    ? await sql`SELECT "Id","QuestionId","LabelSr","LabelEn","IsOtherSpecify" FROM "DemographicQuestionOption" WHERE "QuestionId" = ANY(${qIds}) ORDER BY "SortOrder"`
    : [];
  const optsByQuestion = new Map();
  for (const o of optRows) {
    const list = optsByQuestion.get(o.QuestionId) ?? [];
    list.push({ id: o.Id, labelSr: o.LabelSr, labelEn: o.LabelEn, isOtherSpecify: o.IsOtherSpecify });
    optsByQuestion.set(o.QuestionId, list);
  }
  return qRows.map((q) => ({
    id: q.Id,
    type: q.QuestionType, // 'TEXT' | 'SINGLE_CHOICE'
    promptSr: q.PromptSr,
    promptEn: q.PromptEn,
    options: optsByQuestion.get(q.Id) ?? [],
  }));
}

function statusForError(error) {
  if (error === 'EXPIRED') return 410;
  if (error === 'NOT_ACTIVE') return 403;
  if (error === 'ALREADY_COMPLETED') return 409;
  return 404; // NOT_FOUND
}

app.get('/api/link/:token', async (req, res) => {
  const token = req.params.token;
  if (!isNonEmptyString(token, 64)) {
    res.status(400).json({ error: 'Invalid token' });
    return;
  }
  try {
    const sql = getDb();
    const result = await resolveDemographicLink(sql, token);
    if (result.error) {
      res.status(statusForError(result.error)).json({ error: result.error });
      return;
    }
    const row = result.row;
    const questions = await loadQuestions(sql, row.ResearchId);
    res.json({
      participantId: row.ParticipantId,
      lang: row.Language ?? 'sr',
      questions,
    });
  } catch (err) {
    console.error('[DB] link resolve error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

app.post('/api/link/:token/submit', async (req, res) => {
  const token = req.params.token;
  if (!isNonEmptyString(token, 64)) {
    res.status(400).json({ error: 'Invalid token' });
    return;
  }
  const { answers, lang } = req.body ?? {};
  if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) {
    res.status(400).json({ error: 'INVALID_PAYLOAD' });
    return;
  }

  try {
    const sql = getDb();
    const result = await resolveDemographicLink(sql, token);
    if (result.error) {
      res.status(statusForError(result.error)).json({ error: result.error });
      return;
    }
    const row = result.row;

    // Server-side required-field validation — every question is mandatory (v1 has no per-question
    // "required" toggle, matches the source Google Form where every question was mandatory).
    const qRows = await sql`SELECT "Id","QuestionType" FROM "DemographicQuestion" WHERE "ResearchId" = ${row.ResearchId}`;
    const qIds = qRows.map((q) => q.Id);
    const optRows = qIds.length
      ? await sql`SELECT "Id","QuestionId","IsOtherSpecify" FROM "DemographicQuestionOption" WHERE "QuestionId" = ANY(${qIds})`
      : [];
    const validOptionIdsByQuestion = new Map();
    const otherOptionIds = new Set();
    for (const o of optRows) {
      const set = validOptionIdsByQuestion.get(o.QuestionId) ?? new Set();
      set.add(o.Id);
      validOptionIdsByQuestion.set(o.QuestionId, set);
      if (o.IsOtherSpecify) otherOptionIds.add(o.Id);
    }
    for (const q of qRows) {
      const a = answers[String(q.Id)];
      if (!a || typeof a !== 'object') {
        res.status(400).json({ error: 'MISSING_ANSWER', questionId: q.Id });
        return;
      }
      if (q.QuestionType === 'TEXT') {
        if (typeof a.value !== 'string' || !a.value.trim()) {
          res.status(400).json({ error: 'MISSING_ANSWER', questionId: q.Id });
          return;
        }
      } else {
        const optionId = Number(a.value);
        const valid = validOptionIdsByQuestion.get(q.Id);
        if (!valid || !valid.has(optionId)) {
          res.status(400).json({ error: 'INVALID_ANSWER', questionId: q.Id });
          return;
        }
        if (otherOptionIds.has(optionId) && (typeof a.otherText !== 'string' || !a.otherText.trim())) {
          res.status(400).json({ error: 'MISSING_OTHER_TEXT', questionId: q.Id });
          return;
        }
      }
    }

    await sql`
      INSERT INTO "DemographicResponse" ("ParticipantGuid", "Language", "Answers")
      VALUES (${row.ParticipantGuid}, ${lang === 'en' ? 'en' : 'sr'}, ${JSON.stringify(answers)})
    `;
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[DB] submit error:', err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// On Vercel this app runs as a serverless function (api/index.mjs imports it) — only bind a port
// when started directly for local dev (npm run serve:api).
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Demographics API server listening on http://localhost:${PORT}`);
  });
}

export default app;
