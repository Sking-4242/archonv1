const QUESTION_HEADER_RE = /^\*\*Q(\d+)\.\*\*\s*(.*)$/;
const OPTION_RE = /^-\s*([A-D])\)\s*(.+)$/;
const ANSWER_RE = /^\*\*Answer:\s*([A-D])\*\*\s*[—–-]\s*(.+)$/;

/**
 * Parse Quick Check markdown into structured questions.
 * @param {string} text - body after "## Quick Check" (no heading)
 * @returns {Array<{ id: string, prompt: string, options: { key: string, text: string }[], answer: string, explanation: string }>}
 */
export function parseQuickCheckQuestions(text) {
  if (!text?.trim()) return [];

  const chunks = text.split(/\n(?=\*\*Q\d+\.\*\*)/).filter((chunk) => chunk.trim());
  const questions = [];

  for (const chunk of chunks) {
    const lines = chunk.trim().split("\n");
    const headerMatch = lines[0].match(QUESTION_HEADER_RE);
    if (!headerMatch) continue;

    const id = headerMatch[1];
    const prompt = headerMatch[2].trim();
    const options = [];
    let answer = null;
    let explanation = null;

    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) continue;

      const answerMatch = line.match(ANSWER_RE);
      if (answerMatch) {
        answer = answerMatch[1];
        explanation = answerMatch[2].trim();
        continue;
      }

      const optionMatch = line.match(OPTION_RE);
      if (optionMatch) {
        options.push({ key: optionMatch[1], text: optionMatch[2].trim() });
      }
    }

    if (prompt && options.length > 0 && answer) {
      questions.push({ id, prompt, options, answer, explanation });
    }
  }

  return questions;
}

/**
 * Split lesson markdown into body, quick-check questions, and trailing sections.
 */
export function splitLessonContent(content) {
  if (!content) {
    return { before: "", questions: [], after: "" };
  }

  const marker = "## Quick Check";
  const idx = content.indexOf(marker);
  if (idx === -1) {
    return { before: content, questions: [], after: "" };
  }

  const before = content.slice(0, idx).trimEnd();
  let rest = content.slice(idx + marker.length).replace(/^\s*/, "");

  const nextHeadingIdx = rest.search(/\n## /);
  let quickCheckText = rest;
  let after = "";

  if (nextHeadingIdx !== -1) {
    quickCheckText = rest.slice(0, nextHeadingIdx).trim();
    after = rest.slice(nextHeadingIdx + 1).trim();
  }

  const questions = parseQuickCheckQuestions(quickCheckText);
  if (questions.length === 0) {
    return { before: content, questions: [], after: "" };
  }

  return { before, questions, after };
}
