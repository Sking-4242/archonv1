import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { splitLessonContent } from "../../utils/parseQuickCheck";
import QuickCheckSection from "./QuickCheckSection";

export const LESSON_PROSE_CLASSES =
  "prose prose-sm max-w-none " +
  "prose-headings:font-semibold prose-headings:text-gray-900 " +
  "prose-p:text-gray-700 prose-p:leading-relaxed " +
  "prose-a:text-blue-600 prose-li:text-gray-700 " +
  "prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 " +
  "prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4 " +
  "prose-blockquote:border-l-blue-400 prose-blockquote:text-gray-600";

export default function LessonContent({
  content,
  storageKey,
  proseClassName = LESSON_PROSE_CLASSES,
}) {
  const { before, questions, after } = useMemo(
    () => splitLessonContent(content ?? ""),
    [content],
  );

  if (!questions.length) {
    if (!content) return null;
    return (
      <div className={proseClassName}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {before ? (
        <div className={proseClassName}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{before}</ReactMarkdown>
        </div>
      ) : null}

      <QuickCheckSection storageKey={storageKey} questions={questions} />

      {after ? (
        <div className={proseClassName}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{after}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}
