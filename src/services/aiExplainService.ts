/**
 * AI 解释服务 - 调用 Agnes 2.0 Flash API
 * 用于解释化学反应的原理、应用和注意事项
 * 支持流式输出，提升用户体验
 */

const API_BASE_URL = "https://api.chatlz.dpdns.org";
const MODEL = "agnes-2.0-flash";

export interface AIExplanation {
  principle: string;
  application: string;
  safety: string;
  extension: string;
}

export type ExplanationKey = keyof AIExplanation;

export interface StreamCallbacks {
  onUpdate: (partial: Partial<AIExplanation>, currentKey: ExplanationKey | null) => void;
  onDone: (result: AIExplanation) => void;
  onError: (error: Error) => void;
}

const SECTION_MARKERS: Record<string, ExplanationKey> = {
  "【反应原理】": "principle",
  "【工业应用】": "application",
  "【安全提示】": "safety",
  "【延伸知识】": "extension",
};

const SYSTEM_PROMPT = `你是一位专业的化学教师，擅长用通俗易懂的语言解释化学反应。
请从以下四个方面解释给定的化学反应，每个部分用简短的段落回答（50-100字）：

请严格按照以下格式输出，使用中文方括号标记每个部分：
【反应原理】为什么这些物质能发生反应？从化学键、电子转移、能量变化等角度简要说明。
【工业应用】这个反应在工业生产或日常生活中有什么实际用途？
【安全提示】进行这个反应时需要注意哪些安全问题？
【延伸知识】有哪些相关的化学反应或知识点值得了解？

注意事项：
1. 每个标记独占一行
2. 内容紧跟在标记后面
3. 不要使用 JSON 格式
4. 不要添加额外的引言或结语
5. 按顺序输出四个部分`;

function buildUserPrompt(
  equation: string,
  productName: string,
  condition: string,
  type: string
): string {
  return `请解释以下化学反应：
- 方程式：${equation}
- 产物：${productName}
- 反应条件：${condition}
- 反应类型：${type}`;
}

function parseStreamContent(
  fullText: string
): { partial: Partial<AIExplanation>; currentKey: ExplanationKey | null } {
  const result: Partial<AIExplanation> = {};

  // 找到所有标记的位置
  const foundMarkers: { key: ExplanationKey; start: number; end: number }[] = [];
  for (const [marker, key] of Object.entries(SECTION_MARKERS)) {
    const idx = fullText.indexOf(marker);
    if (idx !== -1) {
      foundMarkers.push({ key, start: idx, end: idx + marker.length });
    }
  }

  if (foundMarkers.length === 0) {
    return { partial: result, currentKey: null };
  }

  foundMarkers.sort((a, b) => a.start - b.start);

  // 提取每个标记的内容
  for (let i = 0; i < foundMarkers.length; i++) {
    const current = foundMarkers[i];
    const next = foundMarkers[i + 1];
    const contentEnd = next ? next.start : fullText.length;
    result[current.key] = fullText.slice(current.end, contentEnd).trim();
  }

  // 当前正在生成的段落是最后一个找到的标记
  const currentKey = foundMarkers[foundMarkers.length - 1].key;
  return { partial: result, currentKey };
}

export async function streamExplanation(
  equation: string,
  productName: string,
  condition: string,
  type: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const { onUpdate, onDone, onError } = callbacks;

  try {
    const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(equation, productName, condition, type) },
        ],
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API 错误响应:", response.status, errorText);
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error("响应体为空，无法进行流式读取");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullContent = "";
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (!trimmed.startsWith("data:")) continue;

        const dataStr = trimmed.slice(5).trim();
        if (dataStr === "[DONE]") continue;

        try {
          const data = JSON.parse(dataStr);
          const delta = data.choices?.[0]?.delta;
          const content = delta?.content || "";
          const reasoningContent = delta?.reasoning_content || "";

          if (content) {
            fullContent += content;
            const { partial, currentKey } = parseStreamContent(fullContent);
            onUpdate(partial, currentKey);
          }

          if (reasoningContent) {
            // 忽略思考过程
          }
        } catch (e) {
          // 解析失败跳过这一行
          console.warn("流式数据解析失败:", dataStr);
        }
      }
    }

    if (buffer) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data:")) {
        const dataStr = trimmed.slice(5).trim();
        if (dataStr !== "[DONE]") {
          try {
            const data = JSON.parse(dataStr);
            const delta = data.choices?.[0]?.delta;
            const content = delta?.content || "";
            if (content) {
              fullContent += content;
            }
          } catch (e) {
            // 忽略
          }
        }
      }
    }

    const { partial } = parseStreamContent(fullContent);
    const finalResult: AIExplanation = {
      principle: partial.principle || "",
      application: partial.application || "",
      safety: partial.safety || "",
      extension: partial.extension || "",
    };

    onDone(finalResult);
  } catch (error) {
    console.error("AI 流式解释失败:", error);
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function explainReaction(
  equation: string,
  productName: string,
  condition: string,
  type: string
): Promise<AIExplanation> {
  return new Promise((resolve, reject) => {
    streamExplanation(equation, productName, condition, type, {
      onUpdate: () => {},
      onDone: resolve,
      onError: reject,
    });
  });
}

const explanationCache = new Map<string, AIExplanation>();

export async function getExplanation(
  equation: string,
  productName: string,
  condition: string,
  type: string
): Promise<AIExplanation> {
  const cacheKey = `${equation}|${productName}`;

  if (explanationCache.has(cacheKey)) {
    return explanationCache.get(cacheKey)!;
  }

  const explanation = await explainReaction(equation, productName, condition, type);
  explanationCache.set(cacheKey, explanation);
  return explanation;
}

export function getCachedExplanation(
  equation: string,
  productName: string
): AIExplanation | undefined {
  const cacheKey = `${equation}|${productName}`;
  return explanationCache.get(cacheKey);
}

export function cacheExplanation(
  equation: string,
  productName: string,
  explanation: AIExplanation
): void {
  const cacheKey = `${equation}|${productName}`;
  explanationCache.set(cacheKey, explanation);
}
