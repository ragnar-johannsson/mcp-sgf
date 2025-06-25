# MCP SGF Processing Server – Product Requirements Document (PRD)

## 1. Introduction / Overview
This project delivers an MCP-compatible API server, written in TypeScript, that processes Go SGF (Smart Game Format) files. It exposes two tools:

1. **get-sgf-info** – returns metadata contained in an SGF (e.g. player names, ranks, result, event, date).
2. **get-sgf-diagram** – returns a PNG image representing the board position (full board or specific move range) derived from the SGF.

The primary objective is to enable Large Language Models (LLMs) or downstream services to programmatically inspect SGF data and obtain rendered diagrams without maintaining their own SGF parsing logic.

---

## 2. Goals
1. Provide a simple, documented API for `get-sgf-info` and `get-sgf-diagram`.
2. Return complete SGF metadata with 100 % tag coverage for commonly-used SGF properties.
3. Generate accurate, legible PNG diagrams for any valid SGF up to 361 × 361 boards.
4. Achieve <200 ms median response time for info requests and <500 ms for diagram requests on files ≤100 kB.
5. Reach 95 % unit-test coverage and 100 % type coverage across the codebase.

---

## 3. User Stories
Although no user stories were provided, the following narratives clarify expected behaviours:

* **As an LLM integrator**, I want to fetch SGF metadata via an API so that I can answer questions about a Go game.
* **As a developer of a Go study tool**, I want to retrieve a diagram for a given move range so that I can embed it in study notes.
* **As a data analyst**, I want to process batches of SGFs and extract structured JSON so that I can run statistics on player performance.

---

## 4. Functional Requirements
1. The system **MUST** expose two MCP tools: `get-sgf-info` and `get-sgf-diagram`.
2. `get-sgf-info` **MUST** accept an SGF file (string or buffer) and **MUST** return a JSON object containing all SGF tags found.
3. `get-sgf-diagram` **MUST** accept:
   * An SGF file (string or buffer)
   * Optional parameters:
     * `moveNumber` – integer; if provided, render board state after this move.
     * `start` / `end` – integers; if provided together, render the sequence of moves in that range.
4. Diagram responses **MUST** be PNG images encoded as `image/png`.
5. The server **MUST** validate inputs and return clear error messages for malformed SGF, missing parameters, or unsupported board sizes.
6. The server **MUST** handle concurrent requests without data leakage between sessions.
7. The project **MUST** include comprehensive unit tests (vitest) and type-checking (TypeScript strict mode).
8. Tool documentation **MUST** be available via generated markdown or OpenAPI schema.
9. The server **MUST** be startable via `npx` without requiring global installation.

---

## 5. Non-Goals (Out of Scope)
* Real-time game playback or interactive board UI.
* SGF editing, merging, or creation utilities.
* Authentication, rate limiting, or quota management.
* Integration with external storage, databases, or third-party services.
* Support for non-PNG output formats.

---

## 6. Design Considerations (Optional)
* Diagrams are generated via **sgf-to-image**, ensuring consistent board styling.
* Default board theme should match common Go study tools (light wooden board, black/white stones).
* Keep API surface minimal: only required parameters and a few optional rendering options.

---

## 7. Technical Considerations (Optional)
* Language / Tooling: TypeScript, Vite (build), Vitest (tests).
* Libraries:
  * **@modelcontextprotocol/sdk** – expose MCP tools.
  * **@sabaki/sgf** – SGF parsing.
  * **sgf-to-image** – diagram rendering.
* Strict ESLint + Prettier configuration enforced via CI.
* No persistent storage: server is stateless; all processing is in-memory.

---

## 8. Success Metrics
| Metric | Target |
| --- | --- |
| API availability | 99.9 % uptime |
| Median response time (info) | <200 ms |
| Median response time (diagram) | <500 ms |
| Unit-test coverage | ≥95 % |
| Type coverage (ts-prune / tsc) | 100 % |

---

## 9. Resolved Questions
1. **Maximum SGF file size** – No explicit limit will be enforced; the server must gracefully handle large inputs and guard against denial-of-service vectors.
2. **Required SGF tags for 100 % coverage** – All tags listed in the *Game Information* section of the SGF user guide (<https://www.red-bean.com/sgf/user_guide/index.html>).
3. **API versioning** – Not required; the two MCP tool names (`get-sgf-info`, `get-sgf-diagram`) are considered stable contract points.