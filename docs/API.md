# External API Integrations

This system relies on four external APIs to gather the data necessary for a comprehensive property evaluation. Access to these APIs is managed through dedicated MCP servers.

## 1. ImmoScout24 API

-   **Purpose**: To fetch new property listings that match Greenzero's criteria.
-   **MCP Server**: `immoscout-server.ts`
-   **Usage**: The main application trigger uses this API once daily to scout for plots in NRW that meet the size and price requirements.
-   **Key Endpoints**:
    -   `POST /listings/search`: Used to find properties based on filter criteria.
-   **Filters Used**:
    -   Region: `Nordrhein-Westfalen`
    -   Plot Type: `building`, `agricultural`, `commercial`
    -   Minimum Size: `5,000 m²`
    -   Maximum Price per m²: `150 €`

## 2. SerpAPI

-   **Purpose**: A general-purpose web search tool available to all agents for contextual research.
-   **MCP Server**: `serpapi-server.ts`
-   **Usage**: Agents can use this tool dynamically to answer questions that arise during their evaluation.
    -   **ECO Agent**: Might search for local news about conservation efforts or soil quality reports.
    -   **Legal Agent**: Could look up recent changes to zoning laws or details on specific local regulations.
    -   **Finance Agent**: May search for comparable land sales in the area to validate market prices.
-   **Key Endpoints**:
    -   `GET /search`: The standard search endpoint.

## 3. Copernicus Land Monitoring API

-   **Purpose**: To provide geospatial and environmental data for ecological assessment.
-   **MCP Server**: `copernicus-server.ts`
-   **Usage**: Primarily used by the **ECO Impact Agent**.
-   **Key Datasets**:
    -   **Land Cover**: To understand the current state of the land (e.g., forest, agricultural, artificial surface).
    -   **Soil Sealing**: To measure the degree of impervious surfaces, which impacts water drainage and biodiversity.
    -   **Forest Data**: To assess the type and health of existing tree cover.
    -   **Water & Wetness**: To identify nearby water bodies or areas with high soil moisture.

## 4. INSPIRE Geoportal API

-   **Purpose**: To provide official, cross-border geospatial data related to legal and regulatory frameworks.
-   **MCP Server**: `inspire-server.ts`
-   **Usage**: Primarily used by the **Legal Agent**.
-   **Key Datasets**:
    -   **Land Use (Zoning)**: To verify that the intended use aligns with municipal planning.
    -   **Protected Areas**: To check if the plot is within or near a nature reserve, national park, or other protected zone (e.g., Natura 2000 sites).
    -   **Administrative Units**: To confirm municipal boundaries and relevant jurisdictions.