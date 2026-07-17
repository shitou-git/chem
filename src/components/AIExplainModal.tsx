import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, Lightbulb, Factory, Shield, BookOpen } from "lucide-react";
import { getExplanation, type AIExplanation } from "@/services/aiExplainService";
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
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setError(null);
      setExplanation(null);
      return;
    }

    const fetchExplanation = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getExplanation(equation, productName, condition, type);
        setExplanation(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "AI 解释请求失败");
      } finally {
        setLoading(false);
      }
    };

    fetchExplanation();
  }, [isOpen, equation, productName, condition, type]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative z-10 w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* 头部 */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-700 bg-slate-900 p-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-bold text-slate-100">AI 反应解释</h3>
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
              AI生成
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 方程式展示 */}
        <div className="border-b border-slate-800 bg-slate-950/50 p-4">
          <div className="mb-2 text-xs text-slate-500">当前方程式</div>
          <div className="font-mono text-xl text-emerald-400">{equation}</div>
          <div className="mt-2 text-sm text-slate-400">
            {type} · {condition} · 生成 {productName}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-4">
          {loading && (
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
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  getExplanation(equation, productName, condition, type)
                    .then(setExplanation)
                    .catch((err) => setError(err.message))
                    .finally(() => setLoading(false));
                }}
                className="mt-4 rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-600"
              >
                重试
              </button>
            </div>
          )}

          {explanation && !loading && (
            <div className="space-y-4">
              {/* 反应原理 */}
              <ExplanationSection
                icon={<Lightbulb className="h-4 w-4" />}
                title="反应原理"
                content={explanation.principle}
                color="cyan"
              />

              {/* 工业应用 */}
              <ExplanationSection
                icon={<Factory className="h-4 w-4" />}
                title="工业应用"
                content={explanation.application}
                color="emerald"
              />

              {/* 安全提示 */}
              <ExplanationSection
                icon={<Shield className="h-4 w-4" />}
                title="安全提示"
                content={explanation.safety}
                color="orange"
              />

              {/* 延伸知识 */}
              {explanation.extension && (
                <ExplanationSection
                  icon={<BookOpen className="h-4 w-4" />}
                  title="延伸知识"
                  content={explanation.extension}
                  color="purple"
                />
              )}

              {/* 免责声明 */}
              <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
                ⚠️ 以上内容由 AI 自动生成，仅供学习参考。请以教材和教师讲解为准。
              </div>
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
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  color: "cyan" | "emerald" | "orange" | "purple";
}) {
  const colorMap = {
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    orange: "border-orange-500/30 bg-orange-500/10 text-orange-400",
    purple: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  };

  return (
    <div className={cn("rounded-lg border p-4", colorMap[color])}>
      <div className="flex items-center gap-2 mb-2 font-semibold">
        {icon}
        {title}
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">{content}</p>
    </div>
  );
}