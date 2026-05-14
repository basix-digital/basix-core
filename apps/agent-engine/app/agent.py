from typing import TypedDict

import asyncpg
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from .llm_adapters import LlmAdapterFactory, LlmConfig
from .provider_credentials import resolve_provider_credentials
from .settings import settings


class AgentState(TypedDict):
    tenant_id: str
    agent_id: str
    thread_id: str
    user_id: str
    message: str
    response: str


async def load_agent_settings(conn: asyncpg.Connection, tenant_id: str, agent_id: str) -> dict:
    row = await conn.fetchrow(
        """
        SELECT provider, model, system_prompt, temperature, top_p, top_k
        FROM ai_agent_llm_settings
        WHERE tenant_id = $1 AND agent_id = $2
        """,
        tenant_id,
        agent_id,
    )
    if row:
        return dict(row)
    return {
        "provider": settings.default_llm_provider,
        "model": settings.default_model,
        "system_prompt": (
            "You are a tenant-scoped SDR assistant. Never mix data across tenants. "
            "Use the CRM and conversation context only for the current tenant."
        ),
        "temperature": 0.4,
        "top_p": None,
        "top_k": None,
    }


async def load_playbook_context(conn: asyncpg.Connection, tenant_id: str, agent_id: str) -> str:
    rows = await conn.fetch(
        """
        SELECT v.title, v.situation, v.response_strategy, v.example_response, v.next_step
        FROM ai_agent_playbook_assignments a
        JOIN ai_playbook_versions v ON v.id = a.playbook_version_id
        WHERE a.tenant_id = $1
          AND a.agent_id = $2
          AND a.is_enabled = TRUE
          AND a.is_active = TRUE
          AND v.status = 'active'
        ORDER BY COALESCE(a.priority_override, v.priority) DESC
        LIMIT 5
        """,
        tenant_id,
        agent_id,
    )
    if not rows:
        return ""
    return "\n\n".join(
        f"Playbook: {row['title']}\nSituation: {row['situation']}\n"
        f"Strategy: {row['response_strategy']}\nExample: {row['example_response']}\n"
        f"Next step: {row['next_step']}"
        for row in rows
    )


async def run_agent(conn: asyncpg.Connection, state: AgentState) -> str:
    agent_settings = await load_agent_settings(conn, state["tenant_id"], state["agent_id"])
    playbook_context = await load_playbook_context(conn, state["tenant_id"], state["agent_id"])
    provider = agent_settings["provider"] or settings.default_llm_provider
    credentials = await resolve_provider_credentials(
        conn,
        tenant_id=state["tenant_id"],
        provider=provider,
        keys=["api_key"],
    )

    llm = LlmAdapterFactory().build_chat_model(
        LlmConfig(
            provider=provider,
            model=agent_settings["model"],
            api_key=credentials["api_key"],
            temperature=agent_settings["temperature"],
            top_p=agent_settings["top_p"],
            top_k=agent_settings["top_k"],
        ),
    )

    async def call_model(current: AgentState) -> AgentState:
        system_parts = [agent_settings["system_prompt"]]
        if playbook_context:
            system_parts.append(f"Tenant playbooks:\n{playbook_context}")
        messages = [
            SystemMessage(content="\n\n".join(system_parts)),
            HumanMessage(content=current["message"]),
        ]
        output = await llm.ainvoke(messages)
        return {**current, "response": str(output.content)}

    graph = StateGraph(AgentState)
    graph.add_node("call_model", call_model)
    graph.set_entry_point("call_model")
    graph.add_edge("call_model", END)
    compiled = graph.compile()
    result = await compiled.ainvoke(state, config={"configurable": {"thread_id": state["thread_id"]}})
    return result["response"]
