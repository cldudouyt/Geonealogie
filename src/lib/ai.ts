import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const DEFAULT_MODEL = "claude-sonnet-4-6";

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
 * Lance plusieurs agents Claude en parallèle et retourne leurs résultats.
 * Chaque agent reçoit son propre system prompt et message utilisateur.
 */
export async function runAgentsInParallel(
  tasks: AgentTask[],
  model = DEFAULT_MODEL
): Promise<AgentResult[]> {
  const results = await Promise.allSettled(
    tasks.map(async (task): Promise<AgentResult> => {
      const message = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: task.systemPrompt,
        messages: [{ role: "user", content: task.userMessage }],
      });
      const content =
        message.content[0].type === "text" ? message.content[0].text : "";
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
 * Stream une réponse Claude pour les cas interactifs (UI streaming).
 */
export async function streamAgentResponse(
  systemPrompt: string,
  userMessage: string,
  model = DEFAULT_MODEL
) {
  return anthropic.messages.stream({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
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
