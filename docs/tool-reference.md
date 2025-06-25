# MCP SGF Tool Reference

This document provides a comprehensive reference for the MCP SGF (Smart Game Format) tools. These tools allow you to extract game information and generate visual diagrams from SGF files.

## Table of Contents

- [Overview](#overview)
- [Tool: get-sgf-info](#tool-get-sgf-info)
- [Tool: get-sgf-diagram](#tool-get-sgf-diagram)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Overview

The MCP SGF server provides two main tools for working with SGF (Smart Game Format) files:

1. **`get-sgf-info`** - Extract comprehensive game information and metadata
2. **`get-sgf-diagram`** - Generate visual board diagrams at specific positions

Both tools support strict validation, comprehensive error handling, and performance optimization for files up to 100KB.

## Tool: get-sgf-info

Extract comprehensive game information from SGF files including player details, game rules, and metadata.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "sgfContent": {
      "type": "string",
      "description": "The complete SGF file content as a string. Must be valid SGF format."
    }
  },
  "required": ["sgfContent"]
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sgfContent` | string | ✓ | Complete SGF file content in valid SGF format |

### Response Format

#### Success Response

```json
{
  "success": true,
  "data": {
    "gameInfo": {
      "playerBlack": "Black Player Name",
      "playerWhite": "White Player Name",
      "blackRank": "5d",
      "whiteRank": "6d",
      "boardSize": 19,
      "komi": 6.5,
      "handicap": 0,
      "result": "W+2.5",
      "date": "2024-01-01",
      "event": "Tournament Name",
      "round": "Final",
      "place": "Tokyo, Japan",
      "gameType": 1,
      "fileFormat": 4
    },
    "metadata": {
      "totalMoves": 245,
      "boardSize": 19,
      "hasValidStructure": true
    },
    "warnings": []
  }
}
```

#### Game Information Fields

| Field | Type | Description |
|-------|------|-------------|
| `playerBlack` | string | Black player name |
| `playerWhite` | string | White player name |
| `blackRank` | string | Black player rank |
| `whiteRank` | string | White player rank |
| `boardSize` | number | Board size (typically 9, 13, or 19) |
| `komi` | number | Komi points for white |
| `handicap` | number | Number of handicap stones |
| `result` | string | Game result (e.g., "W+2.5", "B+R") |
| `date` | string | Game date |
| `event` | string | Tournament or event name |
| `round` | string | Round or game number |
| `place` | string | Location where game was played |
| `rules` | string | Rule set used |
| `timeLimit` | number | Time limit in seconds |
| `overtime` | string | Overtime system description |
| `gameType` | number | Game type (1 = Go) |
| `fileFormat` | number | SGF file format version |

### Performance

- **Target**: ≤200ms for files ≤100KB
- **Memory**: Stateless processing with no memory leaks
- **Validation**: Comprehensive input sanitization and format validation

## Tool: get-sgf-diagram

Generate visual board diagrams from SGF files with customizable appearance and positioning.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "sgfContent": {
      "type": "string",
      "description": "The complete SGF file content as a string. Must be valid SGF format."
    },
    "moveNumber": {
      "type": "number",
      "description": "Specific move number to display (0-based). If not specified, shows final position.",
      "minimum": 0
    },
    "startMove": {
      "type": "number",
      "description": "Start of move range to display (0-based). Use with endMove for range display.",
      "minimum": 0
    },
    "endMove": {
      "type": "number",
      "description": "End of move range to display (0-based). Use with startMove for range display.",
      "minimum": 0
    },
    "width": {
      "type": "number",
      "description": "Image width in pixels (100-2000, default: 600).",
      "minimum": 100,
      "maximum": 2000
    },
    "height": {
      "type": "number",
      "description": "Image height in pixels (100-2000, default: 600).",
      "minimum": 100,
      "maximum": 2000
    },
    "coordLabels": {
      "type": "boolean",
      "description": "Whether to show coordinate labels (default: true)."
    },
    "moveNumbers": {
      "type": "boolean",
      "description": "Whether to show move numbers on stones (default: true)."
    },
    "theme": {
      "type": "string",
      "enum": ["classic", "modern", "minimal"],
      "description": "Visual theme for the board (default: classic)."
    },
    "format": {
      "type": "string",
      "enum": ["png", "svg"],
      "description": "Output image format (default: png)."
    }
  },
  "required": ["sgfContent"]
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `sgfContent` | string | ✓ | - | Complete SGF file content in valid SGF format |
| `moveNumber` | number | ✗ | final position | Specific move to display (0-based) |
| `startMove` | number | ✗ | - | Start of move range (use with endMove) |
| `endMove` | number | ✗ | - | End of move range (use with startMove) |
| `width` | number | ✗ | 600 | Image width in pixels (100-2000) |
| `height` | number | ✗ | 600 | Image height in pixels (100-2000) |
| `coordLabels` | boolean | ✗ | true | Show coordinate labels (A-T, 1-19) |
| `moveNumbers` | boolean | ✗ | true | Show move numbers on stones |
| `theme` | string | ✗ | "classic" | Visual theme: classic, modern, minimal |
| `format` | string | ✗ | "png" | Output format: png, svg |

### Response Format

#### Success Response

Returns image content with metadata:

```json
{
  "success": true,
  "data": {
    "mimeType": "image/png",
    "width": 600,
    "height": 600,
    "movesCovered": 50,
    "boardSize": 19,
    "parameters": {
      "format": "png",
      "width": 600,
      "height": 600,
      "coordLabels": true,
      "moveNumbers": true,
      "theme": "classic"
    }
  }
}
```

**Content**: Base64-encoded image data with the specified MIME type.

#### Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `mimeType` | string | MIME type of generated image |
| `width` | number | Actual image width in pixels |
| `height` | number | Actual image height in pixels |
| `movesCovered` | number | Number of moves shown in diagram |
| `boardSize` | number | Board size used for diagram |
| `parameters` | object | Applied diagram parameters |

### Supported Features

#### Board Sizes
- **Supported**: 1×1 to 361×361
- **Common**: 9×9, 13×13, 19×19
- **Validation**: Automatic size detection from SGF

#### Themes
- **classic**: Traditional wood board with traditional stones
- **modern**: Clean, contemporary appearance
- **minimal**: Simplified design for clarity

#### Output Formats
- **PNG**: Raster format, best for viewing and sharing
- **SVG**: Vector format, scalable and editable

### Performance

- **Target**: ≤500ms for diagram generation
- **Memory**: Efficient processing with automatic cleanup
- **Board Size**: Optimized for boards up to 361×361
- **Concurrent**: Thread-safe, stateless processing

## Error Handling

Both tools use comprehensive error handling with specific error types:

### Error Response Format

```json
{
  "success": false,
  "error": {
    "type": "ERROR_TYPE",
    "message": "Human-readable error description",
    "details": {}
  }
}
```

### Error Types

| Error Type | Description |
|------------|-------------|
| `INVALID_FORMAT` | SGF content is not valid SGF format |
| `INVALID_PARAMETERS` | Invalid or missing required parameters |
| `PARSING_ERROR` | Failed to parse SGF content |
| `UNSUPPORTED_GAME` | Game type not supported (only Go is supported) |
| `FILE_TOO_LARGE` | SGF file exceeds size limits |

### Common Error Scenarios

#### Invalid SGF Format
```json
{
  "success": false,
  "error": {
    "type": "INVALID_FORMAT",
    "message": "Invalid SGF format. SGF files must start with '(' and end with ')' and contain at least one property."
  }
}
```

#### Invalid Parameters
```json
{
  "success": false,
  "error": {
    "type": "INVALID_PARAMETERS",
    "message": "Move number 150 is out of range (0-100)"
  }
}
```

#### Parsing Error
```json
{
  "success": false,
  "error": {
    "type": "PARSING_ERROR",
    "message": "Failed to parse SGF: Malformed property at position 45"
  }
}
```

## Examples

### Example 1: Extract Game Information

**Request**:
```json
{
  "sgfContent": "(;FF[4]GM[1]SZ[19]PB[Lee Sedol]PW[AlphaGo]BR[9p]WR[-]KM[7.5]RE[W+R]DT[2016-03-09];B[pd];W[dp];B[cd];W[qp])"
}
```

**Response**:
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
    }
  }
}
```

### Example 2: Generate Board Diagram

**Request**:
```json
{
  "sgfContent": "(;FF[4]GM[1]SZ[19]PB[Black]PW[White];B[pd];W[dp];B[cd];W[qp])",
  "moveNumber": 2,
  "width": 400,
  "height": 400,
  "theme": "modern",
  "coordLabels": true,
  "moveNumbers": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "mimeType": "image/png",
    "width": 400,
    "height": 400,
    "movesCovered": 3,
    "boardSize": 19,
    "parameters": {
      "moveNumber": 2,
      "width": 400,
      "height": 400,
      "theme": "modern",
      "coordLabels": true,
      "moveNumbers": false,
      "format": "png"
    }
  }
}
```

### Example 3: Generate SVG with Move Range

**Request**:
```json
{
  "sgfContent": "(;FF[4]GM[1]SZ[19];B[pd];W[dp];B[cd];W[qp];B[ed];W[fq])",
  "startMove": 1,
  "endMove": 4,
  "format": "svg",
  "theme": "minimal"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "mimeType": "image/svg+xml",
    "width": 600,
    "height": 600,
    "movesCovered": 4,
    "boardSize": 19,
    "parameters": {
      "startMove": 1,
      "endMove": 4,
      "format": "svg",
      "theme": "minimal",
      "width": 600,
      "height": 600,
      "coordLabels": true,
      "moveNumbers": true
    }
  }
}
```

---

*Generated from code annotations and schemas - Last updated: 2024* 