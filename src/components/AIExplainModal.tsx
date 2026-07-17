import { useState, useEffect, useRef } from "react";
import { X, Loader2, AlertCircle, Lightbulb, Factory, Shield, BookOpen } from "lucide-react";
import {
  streamExplanation,
  getCachedExplanation,
  cacheExplanation,
  type AIExplanation,
  type ExplanationKey,
} from "@/services/aiExplainService";
import { cn } from "@/lib/utils";

interface AIExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  equation: string;
  productName: string;
  condition: string;
  type: string;
}

export default function AIExplainModal({
  isOpen,
  onClose,
  equation,
  productName,
  condition,
  type,
}: AIExplainModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<Partial<AIExplanation>>({});
  const [currentKey, setCurrentKey] = useState<ExplanationKey | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setError(null);
      setExplanation({});
      setCurrentKey(null);
      setIsComplete(false);
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const cached = getCachedExplanation(equation, productName);
    if (cached) {
      setExplanation(cached);
      setIsComplete(true);
      setLoading(false);
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setExplanation({});
    setCurrentKey(null);
    setIsComplete(false);

    streamExplanation(equation, productName, condition, type, {
      onUpdate: (partial, key) => {
        setExplanation(partial);
        setCurrentKey(key);
        setLoading(false);
      },
      onDone: (result) => {
        setExplanation(result);
        setIsComplete(true);
        setCurrentKey(null);
        setLoading(false);
        cacheExplanation(equation, productName, result);
      },
      onError: (err) => {
        if (controller.signal.aborted) return;
        setError(err.message || "AI 解释请求失败");
        setLoading(false);
      },
    });

    return () => {
      controller.abort();
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isOpen, equation, productName, condition, type]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setExplanation({});
    setCurrentKey(null);
    setIsComplete(false);

    streamExplanation(equation, productName, condition, type, {
      onUpdate: (partial, key) => {
        setExplanation(partial);
        setCurrentKey(key);
        setLoading(false);
      },
      onDone: (result) => {
        setExplanation(result);
        setIsComplete(true);
        setCurrentKey(null);
        setLoading(false);
        cacheExplanation(equation, productName, result);
      },
      onError: (err) => {
        setError(err.message || "AI 解释请求失败");
        setLoading(false);
      },
    });
  };

  if (!isOpen) return null;

  const hasAnyContent = Object.values(explanation).some((v) => v && v.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-700 bg-slate-900 p-4 z-20">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-bold text-slate-100">AI 反应解释</h3>
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
              AI生成
            </span>
            {!isComplete && hasAnyContent && (
              <span className="flex items-center gap-1 rounded bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-400">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                生成中
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-2 text-xs text-slate-500">当前方程式</div>
          <div className="font-mono text-xl text-emerald-400">{equation}</div>
          <div className="mt-2 text-sm text-slate-400">
            {type} · {condition} · 生成 {productName}
          </div>
        </div>

        <div className="p-4">
          {loading && !hasAnyContent && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              <p className="mt-4">AI 正在分析反应原理...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-red-400">
              <AlertCircle className="h-8 w-8" />
              <p className="mt-4">{error}</p>
              <button
                onClick={handleRetry}
                className="mt-4 rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-600"
              >
                重试
              </button>
            </div>
          )}

          {hasAnyContent && !error && (
            <div className="space-y-4">
              <ExplanationSection
                icon={<Lightbulb className="h-4 w-4" />}
                title="反应原理"
                content={explanation.principle || ""}
                color="cyan"
                isStreaming={currentKey === "principle"}
              />

              <ExplanationSection
                icon={<Factory className="h-4 w-4" />}
                title="工业应用"
                content={explanation.application || ""}
                color="emerald"
                isStreaming={currentKey === "application"}
              />

              <ExplanationSection
                icon={<Shield className="h-4 w-4" />}
                title="安全提示"
                content={explanation.safety || ""}
                color="orange"
                isStreaming={currentKey === "safety"}
              />

              {(explanation.extension || currentKey === "extension") && (
                <ExplanationSection
                  icon={<BookOpen className="h-4 w-4" />}
                  title="延伸知识"
                  content={explanation.extension || ""}
                  color="purple"
                  isStreaming={currentKey === "extension"}
                />
              )}

              {isComplete && (
                <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
                  ⚠️ 以上内容由 AI 自动生成，仅供学习参考。请以教材和教师讲解为准。
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExplanationSection({
  icon,
  title,
  content,
  color,
  isStreaming,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  color: "cyan" | "emerald" | "orange" | "purple";
  isStreaming?: boolean;
}) {
  const colorMap = {
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    orange: "border-orange-500/30 bg-orange-500/10 text-orange-400",
    purple: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  };

  const isEmpty = !content || content.trim().length === 0;

  if (isEmpty && !isStreaming) {
    return (
      <div className={cn(
        "rounded-lg border border-dashed p-4 opacity-40",
        colorMap[color].replace("bg-", "border-").split(" ")[0]
      )}>
        <div className="flex items-center gap-2 mb-2 font-semibold opacity-60">
          {icon}
          {title}
        </div>
        <p className="text-sm text-slate-500 italic">等待生成中...</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border p-4 transition-all duration-300", colorMap[color], isStreaming && "ring-2 ring-offset-2 ring-offset-slate-900")}>
      <div className="flex items-center gap-2 mb-2 font-semibold">
        {icon}
        {title}
        {isStreaming && (
          <span className="ml-1 inline-block h-3 w-0.5 bg-current animate-pulse" />
        )}
      </div>
      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
        {content}
        {isStreaming && <span className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle animate-pulse" />}
      </p>
    </div>
  );
}
