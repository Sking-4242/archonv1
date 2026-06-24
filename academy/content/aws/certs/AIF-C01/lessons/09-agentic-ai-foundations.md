---
title: "Agentic AI Foundations: Agents, MCP, and Multi-Agent Patterns"
type: content
estimated_minutes: 14
cert_tags: ["AIF-C01"]
---

# Agentic AI Foundations: Agents, MCP, and Multi-Agent Patterns

## Overview

A plain foundation model is reactive: you send a prompt, it returns text, and the interaction ends. **Agentic AI** turns that reactive model into something that can *act* — plan a sequence of steps, call external tools and APIs, remember what it has done, and work toward a goal with limited human supervision. This is one of the fastest-moving areas of AI, and the AI Practitioner exam was updated to include it: Domain 2, Task 2.1 now asks you to define foundational agentic concepts, including multi-agent patterns, the Model Context Protocol (MCP), memory management, tool usage, and workflow orchestration.

For a foundational certification, the goal is conceptual fluency, not implementation. You need to understand *what an agent is*, *what gives it its abilities*, and *how AWS helps you run agents*, so that you can recognize agentic use cases and reason about their benefits and risks. The mental model is simple and powerful: an agent is a foundation model wrapped in a loop that lets it reason about a goal, choose an action (often calling a tool), observe the result, and repeat until the task is done. Everything else — memory, tools, protocols, multiple cooperating agents — is structure built around that loop to make it more capable and more reliable.

This lesson defines the agentic building blocks and introduces the AWS services that build and operate agents. Because several of these services are very new, the descriptions here are kept at the conceptual level the exam tests. After it you will be able to explain what makes AI "agentic," what MCP does, and how multi-agent systems and memory extend the basic pattern.

---

## Core Concepts

### What Makes an AI "Agentic"

An **AI agent** is a system that uses a foundation model as its reasoning engine and adds three capabilities a bare model lacks: the ability to **plan** (break a goal into steps), the ability to **use tools** (call functions, APIs, or services to get information or take action), and **memory** (retain context across steps and sessions). The agent runs a loop — reason about the goal, decide on an action, execute it, observe the outcome, and continue — until the objective is met or it needs human input. Where a chatbot answers a question, an agent can *accomplish a task*: research a topic across several sources, fill out a form, place an order, or triage a support ticket end to end.

The defining shift is **autonomy with action**. The model is no longer just generating text; it is deciding what to do next and doing it. That power is also the source of agentic AI's risks — an agent that can take actions can take *wrong* actions — which is why the security and governance domain pays special attention to controlling what agents are allowed to do.

### Tool Use — Giving the Model Hands

A foundation model on its own only knows what was in its training data and can only produce text. **Tool use** breaks that limitation. By giving an agent access to tools — a web search, a database query, a calculator, an internal API, a code executor — the agent can fetch current information and cause real effects in the world. The model decides *when* to call a tool and *with what inputs*, based on the goal. Tool use is what lets an agent answer "what's our current inventory?" (it queries the database) rather than guessing. It is the single most important capability separating an agent from a chatbot.

### Memory Management

Agents need **memory** to be useful across more than a single turn. **Short-term memory** holds the context of the current task or conversation — what the user asked, what steps have been taken. **Long-term memory** persists across sessions, letting an agent remember a user's preferences or past interactions, and includes newer ideas like **episodic memory**, where an agent learns from past experiences to handle future tasks better. Memory management is the discipline of deciding what to store, what to retrieve, and what to forget, so the agent stays coherent without being overwhelmed or carrying stale information.

### The Model Context Protocol (MCP)

The **Model Context Protocol (MCP)** is an open standard that defines a common way for AI agents to connect to external tools, data sources, and systems. Before such a standard, every integration between an agent and an external system was custom-built. MCP standardizes that connection: a system exposes its capabilities through an **MCP server**, and any MCP-compatible agent can use it as a tool without bespoke glue code. Thousands of MCP servers exist for common systems, so an agent can gain new abilities by connecting to them. For the exam, hold this definition: **MCP is the standard "plug" that connects agents to external tools and data**, making agents more interoperable and easier to extend.

### Multi-Agent Systems and Communication Patterns

Complex problems are often better solved by **multiple specialized agents** than one do-everything agent. In a **multi-agent system**, agents with distinct roles cooperate — for example, a "researcher" agent gathers information, an "analyst" agent reasons over it, and a "writer" agent produces the output, coordinated by an orchestrator. Common patterns include a supervisor/orchestrator delegating to sub-agents, agents working in a pipeline, and peer agents collaborating. **Agent-to-agent (A2A) communication** lets agents pass tasks and results among themselves. Multi-agent designs improve modularity and let each agent be specialized, at the cost of added coordination complexity.

### Workflow Orchestration

**Workflow orchestration** is the coordination layer that sequences an agent's (or several agents') steps, manages branching and retries, and ties tool calls together into a reliable process. Orchestration is what turns a loose collection of reasoning steps and tool calls into a dependable workflow — handling the order of operations, error recovery, and hand-offs. It is the difference between an impressive demo and a production system.

### AWS Services for Agents (Conceptual)

AWS offers building blocks at several levels. **Amazon Bedrock Agents** lets you create agents on Bedrock that can call APIs and query knowledge bases. **Amazon Bedrock AgentCore** (generally available in late 2025) is a platform to build, deploy, and operate agents securely at scale, framework- and model-agnostic; its components address the concepts above — a managed **Runtime** for executing agents with session isolation, **Identity** for controlling what an agent can act on and on whose behalf, **Memory** for short- and long-term recall, a **Gateway** for connecting tools, **Observability** for monitoring, and a **Policy** capability for enforcing guardrails on what agents may do. **Strands Agents** is an open-source AWS SDK that takes a model-driven approach — you supply a model, a system prompt, and a set of tools, and the model handles planning and tool use; it supports MCP and multi-agent patterns. At the application level, agentic assistants like **Amazon Q** (for business and developer tasks), **Amazon Quick Suite**, and the **Kiro** agentic IDE show agents applied to concrete work. For the foundational exam, recognize these by category — agent framework/SDK vs. managed agent platform vs. ready-made assistant — rather than memorizing internals.

---

## Configuration Reference

The agentic building blocks:

```text
Concept                What it adds to a foundation model
---------------------- ------------------------------------------------
Planning               break a goal into ordered steps
Tool use               call APIs/functions to get data or take action
Memory (short/long)    retain context within and across sessions
MCP                    open standard to connect agents to tools/data
Multi-agent system     specialized agents cooperate on a complex task
A2A communication      agents pass tasks/results to each other
Orchestration          sequence steps, handle branching/retries/hand-offs
```

AWS agent building blocks (by category):

```text
Layer                  AWS example                  Role
---------------------- ---------------------------- ---------------------------
Agent SDK/framework    Strands Agents (open source) build agents in code (model-driven)
Managed agent platform Bedrock Agents / AgentCore   build, run, secure, monitor agents at scale
Ready-made assistants  Amazon Q, Quick Suite, Kiro  apply agents to business/dev work
Tool connectivity      MCP (+ AgentCore Gateway)    standard way to connect tools/data
```

---

## How to Decide

- **Does the task require taking actions / multiple steps, not just answering?** → it's an **agentic** use case.
- **Does the agent need current data or to affect a system?** → it needs **tool use** (often via **MCP**).
- **Is the problem complex with distinct sub-tasks?** → consider a **multi-agent** design with orchestration.
- **Building agents on AWS?** → an SDK like **Strands** for code-first builds, a managed platform like **Bedrock AgentCore** to run/secure/monitor at scale, or a ready-made assistant (**Amazon Q / Quick / Kiro**) when you don't need to build at all.

---

## How This Connects

Agentic AI builds on the foundation-model concepts from the previous two lessons (an agent's reasoning engine is an FM) and connects forward to evaluation (agents and workflows need their own evaluation approaches, Domain 3.4) and especially to **security and governance** (Domain 5), where controlling an agent's permissions, tool access, and actions — via identity, policy, and guardrails — is critical precisely because agents can act. It also relates to RAG (Domain 3), since retrieval is one of the most common tools an agent uses.

---

## Exam Traps

- **Equating a chatbot with an agent.** A chatbot answers; an agent plans, uses tools, and takes actions toward a goal.
- **Misdefining MCP.** MCP is an open standard for connecting agents to external tools and data — not a model, not a programming language.
- **Assuming more agents is always better.** Multi-agent systems add coordination complexity; a single agent is often sufficient and simpler.
- **Overlooking agent risk.** Because agents act, controlling their permissions and tool access (identity, policy, guardrails) is essential — a Domain 5 theme.
- **Memorizing service internals.** For this exam, recognize AWS agent offerings by category and purpose, not by detailed configuration.

---

## Summary

Agentic AI extends a foundation model with planning, tool use, and memory, wrapping it in a loop that reasons about a goal, acts (often by calling tools), observes, and repeats. Tool use gives the model the ability to fetch live data and cause effects; memory keeps it coherent within and across sessions; the Model Context Protocol (MCP) is the open standard that lets agents connect to external tools and data; multi-agent systems split complex work among specialized, cooperating agents coordinated by orchestration. AWS supports agents through SDKs and frameworks (Strands Agents), managed platforms (Bedrock Agents and AgentCore), and ready-made assistants (Amazon Q, Quick Suite, Kiro). Because agents take actions, governing what they are allowed to do is a central concern carried into the security domain.

---

## Examples

**Example 1 — Agent vs. chatbot.** A support assistant that reads a ticket, looks up the order via a tool, issues a refund through an API, and emails the customer is an **agent**; one that only suggests a reply is a chatbot.

**Example 2 — MCP as a plug.** A team wants its agent to query an internal inventory system. Exposing that system as an **MCP server** lets the agent use it as a tool without custom integration code.

**Example 3 — Multi-agent.** A market-research workflow uses a researcher agent, an analysis agent, and a writer agent coordinated by an orchestrator — each specialized, together producing a report.

**Example 4 — Choosing AWS building blocks.** A developer building a custom agent in code might use the **Strands** SDK and run it on **Bedrock AgentCore** for managed, secure execution; a business user who just needs results might use **Amazon Q / Quick Suite** instead.

---

## Think About It

A company wants an assistant that not only answers HR questions but can actually submit time-off requests and update employee records. Explain why this crosses from "chatbot" into "agent," which capability (tool use, memory, planning) is doing the heavy lifting, and why this added power makes governing the agent's permissions far more important.

---

## Quick Check

1. What three capabilities turn a foundation model into an agent?
2. In one sentence, what is the Model Context Protocol (MCP)?
3. What is the main advantage — and the main cost — of a multi-agent system?
4. Which capability lets an agent fetch current data or take real action?

*Answers: (1) planning, tool use, and memory (wrapped in a reason-act-observe loop); (2) an open standard that lets AI agents connect to external tools and data sources in a common way; (3) advantage: specialized agents handle distinct sub-tasks for modularity; cost: added coordination/orchestration complexity; (4) tool use.*

---

## What's Next

Next: **GenAI Capabilities, Limitations, and Model Selection** — what generative AI does well, where it fails (hallucinations, nondeterminism), and how to choose a model for a business problem.
