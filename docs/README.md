# Greenzero Property Scout AI Agent

## 🌍 Mission Overview

Greenzero is a company dedicated to ecological rebuilding and sustainable land use. A core part of their mission involves identifying and acquiring land plots with high potential for ecological restoration, biodiversity enhancement, and climate impact mitigation.

This project, the **Flächensuch-Agent (Land Scouting Agent)**, is a modular, multi-agent AI system designed to automate and enhance Greenzero's land acquisition pipeline. By systematically scouting, evaluating, and prioritizing land listings, this system empowers Greenzero to make faster, data-driven decisions that align with its ecological and financial goals.

## 🎯 System Goal

The primary goal is to build an autonomous agent system that:
1.  **Scouts Daily**: Fetches new land listings daily from ImmoScout24 for the Nordrhein-Westfalen (NRW) region.
2.  **Filters Listings**: Applies Greenzero's specific criteria (min size: 5,000 m², max price/m²: 150 €, specific plot types).
3.  **Evaluates Holistically**: Assesses each promising property from three critical perspectives: ecological impact, legal compliance, and financial viability.
4.  **Provides Actionable Insights**: Produces a structured JSON report with a clear recommendation, an overall score, and an executive summary for each evaluated property.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Docker and Docker Compose
- An OpenAI API Key
- API keys for ImmoScout24, SerpAPI, Copernicus, and INSPIRE

### Installation
1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd property-scout-ai-agent
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up your environment variables:
    ```bash
    cp .env.example .env
    # Edit .env with your API keys and desired ports
    ```

### Running the System
To run the daily scouting and evaluation process:
```bash
npm run dev
```
To build and run the production version:

```bash
npm run build
npm start#
```

Running with Docker
The entire system, including the MCP servers, can be orchestrated with Docker Compose:
```bash
docker-compose up --build
```

**File: `docs/ARCHITECTURE.md`**
# System Architecture

This project is designed as a modular, multi-agent AI system with a clear separation of concerns. The architecture prioritizes scalability, maintainability, and extensibility.

## Core Components

The system is composed of four main layers:

1.  **Data Ingestion**: A dedicated service that fetches new property listings from ImmoScout24 daily.
2.  **MCP (Model Context Protocol) Servers**: A set of microservices that wrap external APIs, providing a standardized interface for the AI agents to access tools.
3.  **AI Agents**: Specialized agents, each with a distinct role (ECO, Legal, Finance), responsible for evaluating a property from their specific domain.
4.  **Orchestrator**: A central agent, built with LangGraph, that manages the evaluation workflow, delegates tasks to the specialized agents, and aggregates their findings into a final report.

## Agent Orchestration with LangGraph

The core of the system is the **Orchestrator Agent**, which functions as a state machine implemented using **LangGraph**. The workflow for a single property listing is as follows:

1.  **Start**: The orchestrator receives a new property listing.
2.  **Delegate**: The orchestrator invokes the three sub-agents (ECO, Legal, Finance) in parallel.
3.  **Evaluate**: Each sub-agent performs its analysis by calling its dedicated tools (e.g., Copernicus API for the ECO agent) via the MCP servers. They can also use the general-purpose SerpAPI tool for additional research.
4.  **Aggregate**: The orchestrator waits for all sub-agents to complete their evaluations.
5.  **Synthesize**: The orchestrator aggregates the individual scores and summaries, calculates a weighted overall score, and generates a final recommendation and executive summary.
6.  **End**: The final, structured JSON output is produced and can be stored or exported.

![Diagram of the agent orchestration flow]

## MCP (Model Context Protocol) for Tool Access

To ensure modularity and control, all external tools are wrapped in their own dedicated **MCP (Model Context Protocol) servers**.

-   **What is MCP?** MCP is a design pattern where each tool (API) is exposed via a simple, standardized microservice. This decouples the agents from the specific implementation details of the tools.
-   **Benefits**:
    -   **Isolation**: If an API changes, only its corresponding MCP server needs to be updated.
    -   **Security**: API keys are stored securely within their respective servers, not exposed to the agents.
    -   **Scalability**: Each server can be scaled independently.
    -   **Standardization**: All agents communicate with tools using a consistent client, simplifying agent logic.

The four MCP servers in this system are:
-   `immoscout-server.ts`
-   `serpapi-server.ts`
-   `copernicus-server.ts`
-   `inspire-server.ts`