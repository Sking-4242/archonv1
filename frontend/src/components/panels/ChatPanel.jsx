import { useEffect, useRef, useState } from "react";
import useGraphStore from "../../store/graphStore";
import useSecurityStore from "../../store/securityStore";
import useIAMStore from "../../store/iamStore";
import useSettingsStore from "../../store/settingsStore";
import { serializeGraph } from "../../utils/serializer";
import { sendChatMessage } from "../../api/chat";

const WELCOME =
  "Ask me anything about your architecture — security, cost, scalability, Terraform snippets, best practices...";

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"} mb-3`}
    >
      <div
        className={`text-xs rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold ${
          isUser ? "bg-indigo-600 text-white" : "bg-gray-700 text-white"
        }`}
      >
        {isUser ? "U" : "A"}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-indigo-600 text-white ml-auto"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

export default function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const graphMeta = useGraphStore((s) => s.graphMeta);
  const securityGroups = useSecurityStore((s) => s.securityGroups);
  const iamRoles = useIAMStore((s) => s.iamRoles);
  const provider = useSettingsStore((s) => s.provider);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const models = useSettingsStore((s) => s.models);
  const ollamaBaseUrl = useSettingsStore((s) => s.ollamaBaseUrl);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const graph = serializeGraph(
        graphMeta,
        nodes,
        edges,
        securityGroups,
        iamRoles,
      );
      const data = await sendChatMessage(graph, newMessages, {
        provider,
        apiKey: apiKeys[provider] ?? null,
        model: models[provider] ?? null,
        baseUrl: provider === "ollama" ? ollamaBaseUrl : null,
      });
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">AI Chat</span>
          <span className="text-xs text-gray-400 capitalize">{provider}</span>
          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]);
                setError(null);
              }}
              className="text-xs text-gray-400 hover:text-gray-600 ml-1"
            >
              Clear
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-sm leading-none px-1"
        >
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">{WELCOME}</p>
        )}
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {sending && (
          <div className="flex gap-2 mb-3">
            <div className="text-xs rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold bg-gray-700 text-white">
              A
            </div>
            <div className="bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-400 italic">
              Thinking…
            </div>
          </div>
        )}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-2">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 px-4 py-2 border-t border-gray-200 flex-shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your architecture... (Enter to send, Shift+Enter for newline)"
          disabled={sending}
          rows={2}
          className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  );
}
