/**
 * AI 解释服务 - 调用 Agnes 2.0 Flash API
 * 用于解释化学反应的原理、应用和注意事项
 */

// 开发环境使用代理，生产环境直接调用
const API_BASE_URL = import.meta.env.DEV ? "/api/agnes" : "https://api.agnes-ai.com/v1";
const API_KEY = "sk-bF0s663RzXQh86dOyYqc57DR7SAdXiv5MJvrPYXgWA9g55zq";
const MODEL = "agnes-2.0-flash";

export interface AIExplanation {
  principle: string;      // 反应原理
  application: string;    // 工业应用
  safety: string;         // 安全提示
  extension: string;      // 延伸知识
}

/**
 * 调用 AI 生成化学反应解释
 */
export async function explainReaction(
  equation: string,
  productName: string,
  condition: string,
  type: string
): Promise<AIExplanation> {
  const systemPrompt = `你是一位专业的化学教师，擅长用通俗易懂的语言解释化学反应。
请从以下四个方面解释给定的化学反应，每个部分用简短的段落回答（50-100字）：

1. 反应原理：为什么这些物质能发生反应？从化学键、电子转移、能量变化等角度简要说明。
2. 工业应用：这个反应在工业生产或日常生活中有什么实际用途？
3. 安全提示：进行这个反应时需要注意哪些安全问题？
4. 延伸知识：有哪些相关的化学反应或知识点值得了解？

请用 JSON 格式返回，格式如下：
{
  "principle": "反应原理说明",
  "application": "工业应用说明",
  "safety": "安全提示说明",
  "extension": "延伸知识说明"
}`;

  const userPrompt = `请解释以下化学反应：
- 方程式：${equation}
- 产物：${productName}
- 反应条件：${condition}
- 反应类型：${type}`;

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API 错误响应:", response.status, errorText);
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI 返回内容为空");
    }

    // 尝试解析 JSON
    try {
      // 提取 JSON 部分（AI 可能返回包含 ```json 的内容）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch {
      // JSON 解析失败，返回原始内容作为原理
      return {
        principle: content,
        application: "AI 无法解析结构化回复",
        safety: "请以实际教学内容为准",
        extension: "",
      };
    }
  } catch (error) {
    console.error("AI 解释失败:", error);
    throw error;
  }
}

/**
 * 解释缓存 - 避免重复调用 API
 */
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