import { GoogleGenAI } from "@google/genai";

export const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const DEFAULT_MODEL = "gemini-flash-latest";

export type AgentTask = {
  name: string;
  systemPrompt: string;
  userMessage: string;
};

export type AgentResult = {
  name: string;
  content: string;
  error?: string;
};

/**
 * Un seul appel à Gemini : instructions système + message utilisateur → texte.
 */
export async function generateText(
  systemPrompt: string,
  userMessage: string,
  maxOutputTokens = 4096,
  model = DEFAULT_MODEL
): Promise<string> {
  const response = await genAI.models.generateContent({
    model,
    contents: userMessage,
    config: { systemInstruction: systemPrompt, maxOutputTokens },
  });
  return (response.text ?? "").trim();
}

/**
 * Lance plusieurs agents Gemini en parallèle et retourne leurs résultats.
 * Chaque agent reçoit son propre system prompt et message utilisateur.
 */
export async function runAgentsInParallel(
  tasks: AgentTask[],
  model = DEFAULT_MODEL
): Promise<AgentResult[]> {
  const results = await Promise.allSettled(
    tasks.map(async (task): Promise<AgentResult> => {
      const content = await generateText(task.systemPrompt, task.userMessage, 4096, model);
      return { name: task.name, content };
    })
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    return {
      name: tasks[i].name,
      content: "",
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });
}

/**
 * Stream une réponse Gemini pour les cas interactifs (UI streaming).
 */
export async function streamAgentResponse(
  systemPrompt: string,
  userMessage: string,
  model = DEFAULT_MODEL
) {
  return genAI.models.generateContentStream({
    model,
    contents: userMessage,
    config: { systemInstruction: systemPrompt, maxOutputTokens: 4096 },
  });
}

export const GENEALOGY_SYSTEM_PROMPT = `Tu es un assistant généalogique expert pour la famille Dudouyt.
Tu as accès à l'arbre généalogique couvrant la période 1799–2024, avec 342 personnes, 147 familles et 9 pays d'origine.
Les branches principales incluent : les Dudouyt (percepteurs de la Manche), les Mercader (Barcelone et Santiago de Cuba).

Tu dois :
- Répondre en français
- Proposer des pistes de recherche généalogique précises
- Identifier les anomalies et incohérences dans les données
- Suggérer des sources d'archives pertinentes (Archives Nationales, Ancestry, FamilySearch)
- Respecter la vie privée des personnes vivantes (ne pas divulguer leur date de naissance exacte)`;
