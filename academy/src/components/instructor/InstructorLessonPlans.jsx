import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getLesson, updateLesson } from "../../api/lessons";

// ── Markdown prose styles ──────────────────────────────────────────────────────
const PROSE_CLASSES =
  "prose prose-sm max-w-none " +
  "prose-headings:font-semibold prose-headings:text-gray-900 " +
  "prose-p:text-gray-700 prose-p:leading-relaxed " +
  "prose-a:text-blue-600 prose-li:text-gray-700 " +
  "prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-sm " +
  "prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4 " +
  "prose-blockquote:border-l-blue-400 prose-blockquote:text-gray-600";

const CONTENT_PLACEHOLDER = `# Lesson Title

Write your lesson content here using **Markdown**.

## What you'll learn

- Key concept one
- Key concept two
- Key concept three

## Overview

Explain the concept here. You can use **bold**, *italic*, and \`inline code\`.

## Code example

\`\`\`bash
aws ec2 describe-instances --region us-east-1
\`\`\`

## Summary

Wrap up the key takeaways.
`;

const CANVAS_TEMPLATE_PLACEHOLDER = `{
  "nodes": [],
  "edges": [],
  "graphMeta": {
    "name": "Lab Starter",
    "provider": "aws",
    "region": "us-east-1"
  }
}`;

export default function InstructorLessonPlans() {
  const { lessonId } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [lessonType, setLessonType] = useState("content");
  const [canvasTemplateStr, setCanvasTemplateStr] = useState("");
  const [templateError, setTemplateError] = useState(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("edit"); // "edit" | "preview" | "split"
  const saveTimerRef = useRef(null);

  useEffect(() => {
    if (!lessonId) { setLoading(false); return; }
    getLesson(lessonId)
      .then((l) => {
        setLesson(l);
        setTitle(l.title);
        setContent(l.content || "");
        setLessonType(l.lesson_type || "content");
        setCanvasTemplateStr(
          l.canvas_template ? JSON.stringify(l.canvas_template, null, 2) : ""
        );
        setEstimatedMinutes(l.estimated_minutes || 10);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [lessonId]);

  // Auto-save 1.5s after last keystroke
  useEffect(() => {
    if (!lesson) return;
    setSaved(false);
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => handleSave(true), 1500);
    return () => clearTimeout(saveTimerRef.current);
  }, [title, content, lessonType, canvasTemplateStr, estimatedMinutes]);

  function parseTemplate() {
    if (!canvasTemplateStr.trim()) return null;
    try {
      const parsed = JSON.parse(canvasTemplateStr);
      setTemplateError(null);
      return parsed;
    } catch {
      setTemplateError("Invalid JSON — fix before saving.");
      return undefined; // undefined = parse failed
    }
  }

  async function handleSave(isAuto = false) {
    if (!lesson) return;
    if (!title.trim()) return;

    let canvas_template = null;
    if (lessonType === "canvas") {
      const parsed = parseTemplate();
      if (parsed === undefined) return; // JSON error, don't save
      canvas_template = parsed;
    }

    setSaving(true);
    try {
      await updateLesson(lesson.id, {
        module_id: lesson.module_id,
        title,
        content,
        lesson_type: lessonType,
        canvas_template,
        estimated_minutes: estimatedMinutes,
        order_index: lesson.order_index,
      });
      setSaved(true);
    } catch (e) {
      if (!isAuto) setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading lesson…
      </div>
    );
  }

  if (!lesson && lessonId) {
    return (
      <div className="text-center py-16">
        <div className="text-2xl mb-2">❌</div>
        <div className="text-sm text-gray-600">{error || "Lesson not found"}</div>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm text-blue-600">← Back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Toolbar */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-100 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back
        </button>

        {/* Title field */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lesson title…"
          className="flex-1 text-base font-semibold text-gray-900 border-0 focus:outline-none placeholder-gray-300 bg-transparent"
        />

        {/* Lesson type toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
          {[
            { id: "content", label: "📄 Content" },
            { id: "canvas", label: "🖼 Canvas Lab" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setLessonType(t.id)}
              className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                lessonType === t.id
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Est. minutes */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          <input
            type="number"
            min={1}
            max={300}
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
            className="w-14 text-sm text-gray-700 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400 text-center"
          />
          <span className="text-xs text-gray-400">min</span>
        </div>

        {/* View toggle — only shown for content lessons */}
        {lessonType === "content" && (
          <div className="flex bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
            {[
              { id: "edit", label: "Edit" },
              { id: "split", label: "Split" },
              { id: "preview", label: "Preview" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Save status */}
        <div className="text-xs text-gray-400 flex-shrink-0 w-20 text-right">
          {saving ? "Saving…" : saved ? "✓ Saved" : ""}
        </div>

        <button
          onClick={() => handleSave(false)}
          disabled={saving || !title.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
        >
          Save
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {/* ── Content lesson editor ─────────────────────────────────────────────── */}
      {lessonType === "content" && (
        <div className={`flex-1 overflow-hidden flex gap-4 ${activeTab === "split" ? "flex-row" : "flex-col"}`}>
          {(activeTab === "edit" || activeTab === "split") && (
            <div className={`flex flex-col ${activeTab === "split" ? "w-1/2" : "flex-1"}`}>
              {activeTab === "split" && (
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Editor</div>
              )}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={CONTENT_PLACEHOLDER}
                className="flex-1 w-full font-mono text-sm text-gray-800 border border-gray-200 rounded-lg p-4 resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}
          {(activeTab === "preview" || activeTab === "split") && (
            <div className={`flex flex-col overflow-hidden ${activeTab === "split" ? "w-1/2" : "flex-1"}`}>
              {activeTab === "split" && (
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Preview</div>
              )}
              <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-lg p-6">
                {content ? (
                  <div className={PROSE_CLASSES}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-gray-300 text-sm italic">Nothing to preview yet…</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Canvas lab editor ─────────────────────────────────────────────────── */}
      {lessonType === "canvas" && (
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Challenge description */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Challenge Description (Markdown)
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`# Lab: Build a 3-Tier VPC\n\nDescribe what the student should build in the Archon canvas.\n\n## Objective\n\n- Place a VPC on the canvas\n- Add public and private subnets\n- Wire up an Internet Gateway and NAT Gateway\n\n## Tips\n\nUse the sidebar to find components by name.`}
              className="flex-1 w-full font-mono text-sm text-gray-800 border border-gray-200 rounded-lg p-4 resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Starter template JSON */}
          <div className="flex flex-col" style={{ height: "240px" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Canvas Starter Template (JSON) — optional
              </div>
              <button
                onClick={() => setCanvasTemplateStr(CANVAS_TEMPLATE_PLACEHOLDER)}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                Insert blank template
              </button>
            </div>
            <textarea
              value={canvasTemplateStr}
              onChange={(e) => {
                setCanvasTemplateStr(e.target.value);
                setTemplateError(null);
              }}
              placeholder='Leave empty for a blank canvas, or paste { "nodes": [...], "edges": [...], "graphMeta": {...} }'
              className={`flex-1 w-full font-mono text-xs text-gray-800 border rounded-lg p-3 resize-none focus:outline-none leading-relaxed ${
                templateError
                  ? "border-red-300 focus:border-red-400 bg-red-50"
                  : "border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              }`}
              spellCheck={false}
            />
            {templateError && (
              <div className="text-xs text-red-600 mt-1">{templateError}</div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              Tip: Build an architecture in Archon, use Save → copy the JSON, paste it here to pre-load it for students.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
