## Relevant Files

- `package.json` - Project dependencies, scripts (including `npx mcp-sgf-server` start command).
- `tsconfig.json` - TypeScript strict mode configuration.
- `.eslintrc.json` - ESLint configuration with TypeScript support and strict rules.
- `.prettierrc.json` - Prettier configuration for consistent code formatting.
- `.prettierignore` - Files and directories to exclude from Prettier formatting.
- `vitest.config.ts` - Vitest configuration ensuring ≥95% coverage.
- `.github/workflows/ci.yml` - GitHub Actions workflow to run lint, type-check, and tests on push.
- `src/index.ts` - Entry point for the MCP-compatible API server; exposes both tools and starts via `npx`.
- `src/tools/getSgfInfo.ts` - Implementation of the `get-sgf-info` tool.
- `src/tools/getSgfDiagram.ts` - Implementation of the `get-sgf-diagram` tool.
- `src/utils/sgfParser.ts` - Wrapper utilities around **@sabaki/sgf** for tag extraction.
- `src/utils/diagramRenderer.ts` - Helper for **sgf-to-image** rendering logic.
- `src/types/sgf.ts` - Shared TypeScript types for SGF metadata and diagram parameters.
- `tests/getSgfInfo.test.ts` - Unit tests for `getSgfInfo.ts`.
- `tests/getSgfDiagram.test.ts` - Unit tests for `getSgfDiagram.ts`.
- `tests/validation.test.ts` - Tests covering input validation and error handling.

### Notes

- Place unit tests in the `tests/` directory and mirror the structure of source files.
- Run all tests with `npm test`. Use `npm test tests/getSgfInfo.test.ts` to run a specific suite.
- Maintain strict TypeScript settings (`strict: true`) for full type coverage.
- After completing a major task, run `npm test`, `npm run type-check`, `npm run format` and `npm run lint` to verify code quality.

## Tasks

- [x] 1.0 Project Setup & Build Pipeline
  - [x] 1.1 Initialize project with `npm init -y` and create base directory structure (`src/`, `tests/`).
  - [x] 1.2 Install dependencies: TypeScript, Vite, Vitest, **@modelcontextprotocol/sdk**, **@sabaki/sgf**, **sgf-to-image**, ESLint, Prettier.
  - [x] 1.3 Configure `tsconfig.json` with strict mode and output settings.
  - [x] 1.4 Add ESLint and Prettier configs; integrate with CI.
  - [x] 1.5 Set up Vite build (if needed) and create NPM script `start` that is runnable via `npx mcp-sgf-server`.
  - [x] 1.6 Configure Vitest with coverage reporting.
  - [x] 1.7 Set up GitHub Actions (or equivalent) CI to run lint, type-check, and test on push.

- [ ] 2.0 `get-sgf-info` Tool Implementation
  - [ ] 2.1 Design TypeScript interfaces in `src/types/sgf.ts` to represent SGF tags.
  - [ ] 2.2 Implement SGF parsing helper in `src/utils/sgfParser.ts` leveraging **@sabaki/sgf**.
  - [ ] 2.3 Implement the MCP tool in `src/tools/getSgfInfo.ts` adhering to the SDK's spec.
  - [ ] 2.4 Ensure 100 % coverage of *Game Information* SGF tags.
  - [ ] 2.5 Write unit tests in `tests/getSgfInfo.test.ts` covering happy and edge cases.
  - [ ] 2.6 Benchmark performance (≤200 ms for ≤100 kB files) and optimise if necessary.

- [ ] 3.0 `get-sgf-diagram` Tool Implementation
  - [ ] 3.1 Design parameter types (moveNumber, start/end) in `src/types/sgf.ts`.
  - [ ] 3.2 Implement diagram renderer helper in `src/utils/diagramRenderer.ts` using **sgf-to-image**.
  - [ ] 3.3 Implement the MCP tool wrapper in `src/tools/getSgfDiagram.ts` returning PNG (`image/png`).
  - [ ] 3.4 Support board sizes up to 361 × 361 and validate ranges.
  - [ ] 3.5 Write unit tests in `tests/getSgfDiagram.test.ts` including performance benchmarks (<500 ms).

- [ ] 4.0 Input Validation & Error Handling
  - [ ] 4.1 Implement validation utilities (e.g., using Zod) for SGF input and diagram parameters.
  - [ ] 4.2 Handle malformed SGF, missing parameters, unsupported board sizes with clear error messages.
  - [ ] 4.3 Ensure no data leakage between concurrent requests (stateless processing).
  - [ ] 4.4 Create tests in `tests/validation.test.ts` for error scenarios.

- [ ] 5.0 Testing & Quality Assurance
  - [ ] 5.1 Achieve ≥95 % unit-test coverage across the codebase.
  - [ ] 5.2 Ensure 100 % TypeScript type coverage (no `any` types, use `ts-prune` or similar).
  - [ ] 5.3 Add performance tests verifying response time targets.
  - [ ] 5.4 Integrate coverage and performance checks into CI pipeline.

- [ ] 6.0 Documentation & Developer Experience
  - [ ] 6.1 Generate tool documentation (markdown and/or OpenAPI schema) from code annotations.
  - [ ] 6.2 Create `README.md` with setup, usage examples, and `npx` start instructions.
  - [ ] 6.3 Provide sample SGF files in a `samples/` directory for testing.
  - [ ] 6.4 Document coding standards, lint rules, and contribution guidelines.
