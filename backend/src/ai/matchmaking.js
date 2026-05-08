// src/ai/matchmaking.js
// Step 5: AI-powered matchmaking engine.
//
// Algorithm:
//   1. SQL: Score every user who has at least one skill the project needs.
//      Score = SUM(MIN(user_level, skill_importance)) across matching skills,
//      normalized by the number of required skills.
//   2. Return top N candidates with their match score.
//   3. If GEMINI_API_KEY is set: ask Gemini to explain WHY the top candidates
//      are a good fit, in plain English.
//
// No ORMs. No string interpolation in SQL. Pure parameterized queries.

const pool = require('../db/pool');
const { generate } = require('./gemini');

const TOP_N = 10; // number of candidates to return

/**
 * rankCandidates(projectId)
 * Returns an array of ranked user objects with a numeric match_score.
 */
async function rankCandidates(projectId) {
  // Fetch project info + required skills
  const projectResult = await pool.query(
    `SELECT p.id, p.title, p.description, p.owner_id,
            COALESCE(
              json_agg(json_build_object(
                'skill_id', ps.skill_id,
                'skill_name', s.name,
                'importance', ps.importance
              )) FILTER (WHERE ps.skill_id IS NOT NULL),
              '[]'
            ) AS required_skills
     FROM projects p
     LEFT JOIN project_skills ps ON ps.project_id = p.id
     LEFT JOIN skills s ON s.id = ps.skill_id
     WHERE p.id = $1
     GROUP BY p.id`,
    [projectId]
  );

  if (projectResult.rows.length === 0) return { project: null, candidates: [] };
  const project = projectResult.rows[0];

  if (project.required_skills.length === 0) {
    return { project, candidates: [] };
  }

  // Score candidates using SQL.
  // Scoring formula per user:
  //   COALESCE(SUM(LEAST(user_level, importance)), 0)
  //   divided by the max possible score (SUM of all importance values)
  //   × 100 → gives a 0–100 match percentage.
  const maxScore = project.required_skills.reduce((sum, s) => sum + s.importance, 0);

  const candidatesResult = await pool.query(
    `SELECT
       u.id,
       u.full_name,
       u.email,
       u.bio,
       u.institution,
       u.avatar_url,
       ROUND(
         COALESCE(SUM(LEAST(us.level, ps.importance)), 0)::numeric
         / $1 * 100,
         1
       ) AS match_score,
       COALESCE(
         json_agg(
           json_build_object(
             'skill_name', s.name,
             'user_level', us.level,
             'required_importance', ps.importance
           )
         ) FILTER (WHERE s.id IS NOT NULL),
         '[]'
       ) AS matched_skills
     FROM users u
     JOIN user_skills us ON us.user_id = u.id
     JOIN project_skills ps ON ps.skill_id = us.skill_id AND ps.project_id = $2
     JOIN skills s ON s.id = us.skill_id
     WHERE u.id != $3
     GROUP BY u.id
     ORDER BY match_score DESC
     LIMIT $4`,
    [maxScore, projectId, project.owner_id, TOP_N]
  );

  return { project, candidates: candidatesResult.rows };
}

/**
 * getAISummary(project, candidates)
 * Sends the top candidates to Gemini and returns a human-readable explanation.
 * Returns null if Gemini is not configured.
 */
async function getAISummary(project, candidates) {
  if (candidates.length === 0) return null;

  const top3 = candidates.slice(0, 3);

  const candidateDescriptions = top3.map((c, i) =>
    `Candidate ${i + 1}: ${c.full_name} (${c.institution || 'unknown institution'})
     Match Score: ${c.match_score}%
     Matched Skills: ${c.matched_skills.map(s => `${s.skill_name} (user level ${s.user_level}/5, project needs ${s.required_importance}/5 importance)`).join(', ')}`
  ).join('\n\n');

  const prompt = `You are a technical team-matching advisor for engineering student projects.

Project: "${project.title}"
Description: ${project.description}

Top matched candidates based on skill alignment:

${candidateDescriptions}

In 2-3 sentences per candidate, explain concisely WHY each candidate is a strong match for this project. Focus on their specific skill alignment. Be direct, specific, and encouraging. Do not repeat the numbers — interpret them.`;

  return await generate(prompt);
}

module.exports = { rankCandidates, getAISummary };
