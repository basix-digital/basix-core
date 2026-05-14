export const AGENT_CATALOG = [
  {
    id: "sdr_assistant",
    name: "SDR Assistant",
    description:
      "Qualifica leads inbound e conduz a primeira conversa comercial.",
  },
  {
    id: "qualification_agent",
    name: "Qualification Agent",
    description: "Coleta contexto, identifica fit e atualiza CRM.",
  },
  {
    id: "closer_assistant",
    name: "Closer Assistant",
    description: "Apoia objeções, próximos passos e avanço de proposta.",
  },
  {
    id: "support_assistant",
    name: "Support Assistant",
    description:
      "Atende conversas operacionais sem misturar contexto comercial.",
  },
] as const;

export const AGENT_IDS: ReadonlySet<string> = new Set(
  AGENT_CATALOG.map((agent) => agent.id),
);
