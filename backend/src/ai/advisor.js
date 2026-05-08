// src/ai/advisor.js
// Step 8: AI Advisor — project roadmaps and technical debugging help.
// All AI calls go through the shared Gemini client in src/ai/gemini.js.

const { generate } = require('./gemini');

/**
 * generateRoadmap({ title, description, skills, teamSize, duration })
 * Returns a structured JSON roadmap for a project.
 * Falls back to a static template if Gemini is unavailable.
 */
async function generateRoadmap({ title, description, skills = [], teamSize = 3, duration = '3 months' }) {
  const skillList = skills.length > 0 ? skills.join(', ') : 'general software development';

  const prompt = `You are a senior software engineering mentor helping an engineering student plan their final-year project.

Project Title: "${title}"
Description: ${description}
Tech Skills Available: ${skillList}
Team Size: ${teamSize} people
Target Duration: ${duration}

Generate a detailed, actionable project roadmap as a JSON object with this exact structure:
{
  "phases": [
    {
      "name": "Phase name",
      "duration": "X weeks",
      "goals": ["goal1", "goal2"],
      "tasks": ["task1", "task2", "task3"],
      "deliverables": ["deliverable1"]
    }
  ],
  "tech_stack": {
    "frontend": "...",
    "backend": "...",
    "database": "...",
    "deployment": "..."
  },
  "risks": ["risk1", "risk2"],
  "success_metrics": ["metric1", "metric2"]
}

Return ONLY valid JSON, no markdown, no explanation.`;

  const raw = await generate(prompt);

  if (!raw) {
    // Static fallback when Gemini is unavailable
    return {
      ai_available: false,
      roadmap: {
        phases: [
          {
            name: 'Planning & Setup',
            duration: '2 weeks',
            goals: ['Define requirements', 'Set up development environment'],
            tasks: ['Write project spec', 'Initialize repository', 'Set up CI/CD'],
            deliverables: ['Project spec document', 'Running dev environment'],
          },
          {
            name: 'Core Development',
            duration: '6 weeks',
            goals: ['Build core features', 'Implement database layer'],
            tasks: ['Design database schema', 'Build API endpoints', 'Build frontend UI'],
            deliverables: ['Working MVP'],
          },
          {
            name: 'Testing & Deployment',
            duration: '2 weeks',
            goals: ['Test all features', 'Deploy to production'],
            tasks: ['Write tests', 'Fix bugs', 'Deploy'],
            deliverables: ['Live application'],
          },
        ],
        tech_stack: {
          frontend: 'Next.js / React',
          backend: 'Node.js / Express',
          database: 'PostgreSQL',
          deployment: 'Railway / Render',
        },
        risks: ['Scope creep', 'Integration complexity'],
        success_metrics: ['All core features working', 'Deployed and accessible'],
      },
    };
  }

  // Parse the JSON from Gemini — strip any accidental markdown fences
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const roadmap = JSON.parse(cleaned);
    return { ai_available: true, roadmap };
  } catch {
    // If parsing fails, return the raw text under a different key
    return { ai_available: true, roadmap_text: raw };
  }
}

/**
 * debugHelp({ problem, code, language, error })
 * Returns a technical debugging response.
 * Falls back to a helpful generic message if Gemini is unavailable.
 */
async function debugHelp({ problem, code = '', language = 'JavaScript', error = '' }) {
  if (!problem) {
    return { ai_available: false, response: 'Please describe the problem you are facing.' };
  }

  const codeBlock = code ? `\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`` : '';
  const errorBlock = error ? `\n\nError message:\n${error}` : '';

  const prompt = `You are a senior software engineer helping an engineering student debug their code.

Problem description: ${problem}${codeBlock}${errorBlock}

Provide a clear, concise debugging response with:
1. Root cause analysis (what is likely wrong)
2. Step-by-step fix
3. Best practice tip to prevent this in future

Be direct and technical. Format with clear sections. Keep it under 300 words.`;

  const response = await generate(prompt);

  if (!response) {
    return {
      ai_available: false,
      response:
        'AI advisor is not configured. Please add GEMINI_API_KEY to your .env file. ' +
        'Get a free key at https://aistudio.google.com/app/apikey',
    };
  }

  return { ai_available: true, response };
}

module.exports = { generateRoadmap, debugHelp };
