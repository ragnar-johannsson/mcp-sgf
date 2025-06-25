# mcp-sgf

An MCP server in Typescript for processing Go SGF data/files and returning the information it contains, including diagrams of games. It exposes two tools: `get-sgf-info` and `get-sgf-diagram`. The `get-sgf-info` tool returns metadata contained in the SGF, such as player names and ranks, date played, event, result, etc. The `get-sgf-diagram` tool returns a diagram of the SGF. It supports getting a diagram of game state at specific move number, showing ranges of moves, etc.

## Implementation notes

    - Use vite and vitest.
    - Setup a rigorous testing, type-checking, formatting and linting infrastructure and use it.
    - Use @modelcontextprotocol/sdk for MCP functionality.
    - Use @sabaki/sgf for SGF parsing.
    - Use sgf-to-image to generate diagrams from SGF data.
    - The server should be started using npx