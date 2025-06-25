/**
 * MCP tool implementation for generating SGF board diagrams
 */

import type { Tool, ImageContent, CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { parseSgfGameInfo, validateSgfFormat } from '../utils/sgfParser.js'
import {
  generateDiagram,
  getSupportedThemes,
  getSupportedFormats,
} from '../utils/diagramRenderer.js'
import { SgfError, SgfErrorType, type DiagramParameters } from '../types/sgf.js'
import {
  validateGetSgfDiagramArgs,
  sanitizeInput,
  validateStatelessProcessing,
} from '../utils/validation.js'

/**
 * MCP tool definition for get-sgf-diagram
 */
export const getSgfDiagramTool: Tool = {
  name: 'get-sgf-diagram',
  description:
    'Generate visual board diagrams from SGF (Smart Game Format) files. Returns PNG images showing the board position at specified moves or move ranges. Supports various customization options including board size, themes, and annotations.',
  inputSchema: {
    type: 'object',
    properties: {
      sgfContent: {
        type: 'string',
        description: 'The complete SGF file content as a string. Must be valid SGF format.',
      },
      moveNumber: {
        type: 'number',
        description:
          'Specific move number to display (0-based). If not specified, shows final position.',
        minimum: 0,
      },
      startMove: {
        type: 'number',
        description:
          'Start of move range to display (0-based). Use with endMove for range display.',
        minimum: 0,
      },
      endMove: {
        type: 'number',
        description:
          'End of move range to display (0-based). Use with startMove for range display.',
        minimum: 0,
      },
      width: {
        type: 'number',
        description: 'Image width in pixels (100-2000, default: 600).',
        minimum: 100,
        maximum: 2000,
      },
      height: {
        type: 'number',
        description: 'Image height in pixels (100-2000, default: 600).',
        minimum: 100,
        maximum: 2000,
      },
      coordLabels: {
        type: 'boolean',
        description: 'Whether to show coordinate labels (default: true).',
      },
      moveNumbers: {
        type: 'boolean',
        description: 'Whether to show move numbers on stones (default: true).',
      },
      theme: {
        type: 'string',
        enum: ['classic', 'modern', 'minimal'],
        description: 'Visual theme for the board (default: classic).',
      },
      format: {
        type: 'string',
        enum: ['png', 'svg'],
        description: 'Output image format (default: png).',
      },
    },
    required: ['sgfContent'],
  },
}

// Define response types for better type safety
interface SuccessResponse {
  success: true
  data: {
    mimeType: string
    width: number
    height: number
    movesCovered: number
    boardSize: number
    parameters: DiagramParameters
  }
}

interface ErrorResponse {
  success: false
  error: {
    type: string
    message: string
    details?: unknown
  }
}

/**
 * Handle get-sgf-diagram tool execution
 * @param args - Tool arguments containing SGF content and diagram parameters
 * @returns Tool execution result with diagram image
 */
export async function handleGetSgfDiagram(args: unknown): Promise<CallToolResult> {
  try {
    // Ensure stateless processing (subtask 4.3)
    validateStatelessProcessing()

    // Validate and sanitize input using Zod schemas (subtask 4.2)
    const validation = validateGetSgfDiagramArgs(args)
    if (!validation.success) {
      throw validation.error
    }

    const {
      sgfContent: rawContent,
      moveNumber,
      startMove,
      endMove,
      width,
      height,
      coordLabels,
      moveNumbers,
      theme,
      format,
    } = validation.data

    const sgfContent = sanitizeInput(rawContent)

    // Additional SGF format validation for enhanced security
    if (!validateSgfFormat(sgfContent)) {
      throw new SgfError(
        SgfErrorType.INVALID_FORMAT,
        'Invalid SGF format. SGF files must start with "(" and end with ")" and contain at least one property.'
      )
    }

    // Parse SGF to get game info and validate
    const parseResult = parseSgfGameInfo(sgfContent)

    // Prepare diagram parameters (validation already handled by Zod)
    const diagramParams: DiagramParameters = {
      format: format ?? 'png',
      maxBoardSize: 361, // Support up to 361x361 boards
      ...(moveNumber !== undefined && { moveNumber }),
      ...(startMove !== undefined && { startMove }),
      ...(endMove !== undefined && { endMove }),
      ...(width !== undefined && { width }),
      ...(height !== undefined && { height }),
      ...(coordLabels !== undefined && { coordLabels }),
      ...(moveNumbers !== undefined && { moveNumbers }),
      ...(theme !== undefined && { theme }),
    }

    // Note: Parameter validation (move combinations, ranges, etc.) is now handled by Zod schemas

    // Generate the diagram
    const diagramResult = await generateDiagram(
      sgfContent,
      diagramParams,
      parseResult.totalMoves,
      parseResult.boardSize
    )

    // Format response for MCP
    const response: SuccessResponse = {
      success: true,
      data: {
        mimeType: diagramResult.mimeType,
        width: diagramResult.width,
        height: diagramResult.height,
        movesCovered: diagramResult.movesCovered,
        boardSize: diagramResult.boardSize,
        parameters: diagramParams,
      },
    }

    return {
      content: [
        {
          type: 'image',
          data: diagramResult.imageData,
          mimeType: diagramResult.mimeType,
        } as ImageContent,
      ],
      metadata: response.data,
    }
  } catch (error) {
    // Handle SGF-specific errors
    if (error instanceof SgfError) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          type: error.type,
          message: error.message,
          details: error.details,
        },
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorResponse, null, 2),
          },
        ],
        isError: true,
      }
    }

    // Handle unexpected errors
    const unexpectedErrorResponse: ErrorResponse = {
      success: false,
      error: {
        type: 'UNEXPECTED_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: error,
      },
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(unexpectedErrorResponse, null, 2),
        },
      ],
      isError: true,
    }
  }
}

/**
 * Get information about supported diagram options
 * @returns Object with supported themes, formats, and limits
 */
export function getDiagramCapabilities(): {
  supportedThemes: string[]
  supportedFormats: string[]
  maxBoardSize: number
  dimensionLimits: { min: number; max: number }
  defaultDimensions: { width: number; height: number }
} {
  return {
    supportedThemes: getSupportedThemes(),
    supportedFormats: getSupportedFormats(),
    maxBoardSize: 361,
    dimensionLimits: {
      min: 100,
      max: 2000,
    },
    defaultDimensions: {
      width: 600,
      height: 600,
    },
  }
}
