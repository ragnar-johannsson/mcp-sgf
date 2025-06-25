# MCP SGF Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for processing SGF (Smart Game Format) files. Extract game information and generate visual board diagrams with. 

## Features

- **Extract comprehensive game information** from SGF files
- **Generate visual board diagrams** with customizable themes and formats
- **High performance**: ≤200ms for game info, ≤500ms for diagrams
- **Robust validation** with detailed error handling
- **TypeScript strict mode** with 100% type safety
- **91.73% test coverage** with 139 comprehensive tests
- **Multiple output formats**: PNG and SVG support
- **Customizable themes**: Classic, modern, and minimal styles

## Quick Start

### NPX (Recommended)

Start the MCP server instantly without installation:

```bash
npx mcp-sgf
```

The server will start and listen for MCP protocol connections on stdio.

### Installation

Install globally for repeated use:

```bash
npm install -g mcp-sgf
mcp-sgf
```

### Development Setup

Clone and set up for development:

```bash
git clone <repository-url>
cd mcp-sgf
npm install
npm run build
npm start
```

## Usage

The MCP SGF server provides two main tools that can be called via the MCP protocol:

### 1. Extract Game Information (`get-sgf-info`)

Extract comprehensive metadata from SGF files including player information, game rules, and results.

```json
{
  "tool": "get-sgf-info",
  "arguments": {
    "sgfContent": "(;FF[4]GM[1]SZ[19]PB[Lee Sedol]PW[AlphaGo]BR[9p]WR[-]KM[7.5]RE[W+R]DT[2016-03-09];B[pd];W[dp];B[cd];W[qp])"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gameInfo": {
      "playerBlack": "Lee Sedol",
      "playerWhite": "AlphaGo",
      "blackRank": "9p",
      "whiteRank": "-",
      "boardSize": 19,
      "komi": 7.5,
      "result": "W+R",
      "date": "2016-03-09",
      "fileFormat": 4,
      "gameType": 1
    },
    "metadata": {
      "totalMoves": 4,
      "boardSize": 19,
      "hasValidStructure": true
    },
    "warnings": []
  }
}
```

### 2. Generate Board Diagrams (`get-sgf-diagram`)

Create visual board diagrams showing game positions with customizable appearance.

```json
{
  "tool": "get-sgf-diagram", 
  "arguments": {
    "sgfContent": "(;FF[4]GM[1]SZ[19];B[pd];W[dp];B[cd];W[qp];B[ed];W[fq])",
    "moveNumber": 4,
    "width": 800,
    "height": 800,
    "theme": "modern",
    "coordLabels": true,
    "moveNumbers": false,
    "format": "png"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mimeType": "image/png",
    "width": 800,
    "height": 800,
    "movesCovered": 5,
    "boardSize": 19,
    "parameters": {
      "moveNumber": 4,
      "format": "png",
      "theme": "modern"
    }
  }
}
```

The response includes base64-encoded image data with the specified MIME type.

## Configuration Options

### Game Information Tool

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sgfContent` | string | ✓ | Complete SGF file content |

### Diagram Tool

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `sgfContent` | string | ✓ | - | Complete SGF file content |
| `moveNumber` | number | ✗ | final | Specific move to display (0-based) |
| `startMove` | number | ✗ | - | Start of move range |
| `endMove` | number | ✗ | - | End of move range |
| `width` | number | ✗ | 600 | Image width (100-2000) |
| `height` | number | ✗ | 600 | Image height (100-2000) |
| `coordLabels` | boolean | ✗ | true | Show coordinate labels |
| `moveNumbers` | boolean | ✗ | true | Show move numbers |
| `theme` | string | ✗ | classic | Visual theme |
| `format` | string | ✗ | png | Output format |

### Supported Themes

- **`classic`**: Traditional wood board with classic stones
- **`modern`**: Clean, contemporary appearance  
- **`minimal`**: Simplified design for clarity

### Supported Formats

- **`png`**: Raster format, best for viewing and sharing
- **`svg`**: Vector format, scalable and editable

### Supported Board Sizes

- **Range**: 1×1 to 361×361 boards
- **Common**: 9×9, 13×13, 19×19
- **Automatic**: Size detection from SGF content

## Development

### Scripts

```bash
npm run build       # Build TypeScript to JavaScript
npm run dev         # Development mode with watch
npm test           # Run all tests with coverage
npm run lint       # ESLint checking
npm run format     # Prettier formatting
npm run type-check # TypeScript type checking
```

## Client Integration

### MCP Client Configuration

To use this server with MCP-compatible clients (Claude Desktop, etc.), add the following configuration:

**Claude Desktop Configuration (`claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "sgf": {
      "command": "npx",
      "args": ["mcp-sgf"]
    }
  }
}
```

**Alternative with local installation:**
```json
{
  "mcpServers": {
    "sgf": {
      "command": "mcp-sgf"
    }
  }
}
```

### MCP Protocol JSON Examples

When integrating programmatically, use these JSON message formats:

**List Available Tools:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Call Get SGF Info Tool:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get-sgf-info",
    "arguments": {
      "sgfContent": "(;FF[4]GM[1]SZ[19]PB[Lee Sedol]PW[AlphaGo]BR[9p]WR[-]KM[7.5]RE[W+R]DT[2016-03-09];B[pd];W[dp];B[cd];W[qp])"
    }
  }
}
```

**Call Get SGF Diagram Tool:**
```json
{
  "jsonrpc": "2.0", 
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get-sgf-diagram",
    "arguments": {
      "sgfContent": "(;FF[4]GM[1]SZ[19];B[pd];W[dp];B[cd];W[qp];B[ed];W[fq])",
      "moveNumber": 4,
      "width": 800,
      "height": 800,
      "theme": "modern",
      "format": "png"
    }
  }
}
```

### Project Structure

```
mcp-sgf/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/                # MCP tool implementations
│   │   ├── getSgfInfo.ts     # Game information extraction
│   │   └── getSgfDiagram.ts  # Diagram generation
│   ├── utils/                # Utility functions
│   │   ├── sgfParser.ts      # SGF parsing logic
│   │   ├── diagramRenderer.ts # Image generation
│   │   └── validation.ts     # Input validation
│   └── types/
│       └── sgf.ts           # TypeScript type definitions
├── tests/                   # Comprehensive test suite
├── docs/                    # Documentation
└── package.json            # Dependencies and scripts
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test tests/getSgfInfo.test.ts

# Run with coverage report
npm test -- --coverage

# Run performance tests
npm test tests/performance.test.ts
```

### Quality Assurance

- **TypeScript**: Strict mode with 100% type coverage
- **ESLint**: Zero warnings with strict rules
- **Prettier**: Consistent code formatting
- **Vitest**: 95% coverage threshold enforced
- **Performance**: Response time targets validated

## Error Handling

The server provides comprehensive error handling with specific error types:

### Error Types

| Type | Description |
|------|-------------|
| `INVALID_FORMAT` | SGF content is not valid format |
| `INVALID_PARAMETERS` | Invalid or missing parameters |
| `PARSING_ERROR` | Failed to parse SGF content |
| `UNSUPPORTED_GAME` | Game type not supported |
| `FILE_TOO_LARGE` | SGF file exceeds size limits |

### Example Error Response

```json
{
  "success": false,
  "error": {
    "type": "INVALID_FORMAT",
    "message": "Invalid SGF format. SGF files must start with '(' and end with ')' and contain at least one property.",
    "details": {}
  }
}
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

### Documentation

- **[Tool Reference](docs/tool-reference.md)**: Complete API documentation
- **[OpenAPI Schema](docs/openapi-schema.yaml)**: Machine-readable specification
- **[Model Context Protocol](https://modelcontextprotocol.io/)**: MCP specification

