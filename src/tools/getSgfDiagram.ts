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
export async function handleGetSgfDiagram(args: {
  sgfContent: string
  moveNumber?: number
  startMove?: number
  endMove?: number
  width?: number
  height?: number
  coordLabels?: boolean
  moveNumbers?: boolean
  theme?: 'classic' | 'modern' | 'minimal'
  format?: 'png' | 'svg'
}): Promise<CallToolResult> {
  try {
    // Validate input
    if (!args.sgfContent || typeof args.sgfContent !== 'string') {
      throw new SgfError(
        SgfErrorType.INVALID_PARAMETERS,
        'Missing or invalid sgfContent parameter. Must be a non-empty string.'
      )
    }

    const sgfContent = args.sgfContent.trim()

    if (sgfContent.length === 0) {
      throw new SgfError(SgfErrorType.INVALID_PARAMETERS, 'SGF content cannot be empty.')
    }

    // Basic format validation
    if (!validateSgfFormat(sgfContent)) {
      throw new SgfError(
        SgfErrorType.INVALID_FORMAT,
        'Invalid SGF format. SGF files must start with "(" and end with ")" and contain at least one property.'
      )
    }

    // Parse SGF to get game info and validate
    const parseResult = parseSgfGameInfo(sgfContent)

    // Prepare diagram parameters
    const diagramParams: DiagramParameters = {
      ...(args.moveNumber !== undefined && { moveNumber: args.moveNumber }),
      ...(args.startMove !== undefined && { startMove: args.startMove }),
      ...(args.endMove !== undefined && { endMove: args.endMove }),
      ...(args.width !== undefined && { width: args.width }),
      ...(args.height !== undefined && { height: args.height }),
      ...(args.coordLabels !== undefined && { coordLabels: args.coordLabels }),
      ...(args.moveNumbers !== undefined && { moveNumbers: args.moveNumbers }),
      ...(args.theme !== undefined && { theme: args.theme }),
      format: args.format ?? 'png',
      maxBoardSize: 361, // Support up to 361x361 boards
    }

    // Validate parameter combinations
    if (
      args.moveNumber !== undefined &&
      (args.startMove !== undefined || args.endMove !== undefined)
    ) {
      throw new SgfError(
        SgfErrorType.INVALID_PARAMETERS,
        'Cannot specify both moveNumber and move range (startMove/endMove). Use one or the other.'
      )
    }

    if (args.startMove !== undefined && args.endMove === undefined) {
      throw new SgfError(
        SgfErrorType.INVALID_PARAMETERS,
        'startMove requires endMove to be specified for range display.'
      )
    }

    if (args.endMove !== undefined && args.startMove === undefined) {
      throw new SgfError(
        SgfErrorType.INVALID_PARAMETERS,
        'endMove requires startMove to be specified for range display.'
      )
    }

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
