/**
 * MCP tool implementation for extracting SGF game information
 */

import type { Tool, TextContent, CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { parseSgfGameInfo, validateSgfFormat } from '../utils/sgfParser.js'
import { SgfError, SgfErrorType, type SgfGameInfo } from '../types/sgf.js'

/**
 * MCP tool definition for get-sgf-info
 */
export const getSgfInfoTool: Tool = {
  name: 'get-sgf-info',
  description:
    'Extract comprehensive game information from SGF (Smart Game Format) files. Returns all available metadata including player names, ranks, game details, rules, and result.',
  inputSchema: {
    type: 'object',
    properties: {
      sgfContent: {
        type: 'string',
        description: 'The complete SGF file content as a string. Must be valid SGF format.',
      },
    },
    required: ['sgfContent'],
  },
}

// Define response types for better type safety
interface SuccessResponse {
  success: true
  data: {
    gameInfo: SgfGameInfo
    metadata: {
      totalMoves: number
      boardSize: number
      hasValidStructure: boolean
    }
    warnings: string[] | undefined
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
 * Handle get-sgf-info tool execution
 * @param args - Tool arguments containing SGF content
 * @returns Tool execution result with game information
 */
export function handleGetSgfInfo(args: { sgfContent: string }): CallToolResult {
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

    // Parse SGF and extract game information
    const parseResult = parseSgfGameInfo(sgfContent)

    // Format response for MCP
    const response: SuccessResponse = {
      success: true,
      data: {
        gameInfo: parseResult.gameInfo,
        metadata: {
          totalMoves: parseResult.totalMoves,
          boardSize: parseResult.boardSize,
          hasValidStructure: parseResult.hasValidStructure,
        },
        warnings: parseResult.warnings,
      },
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        } as TextContent,
      ],
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
          } as TextContent,
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
        } as TextContent,
      ],
      isError: true,
    }
  }
}

/**
 * Format game information for display
 * @param gameInfo - Parsed SGF game information
 * @returns Formatted string representation
 */
export function formatGameInfo(gameInfo: SgfGameInfo): string {
  const sections: string[] = []

  // Game Identification
  if (gameInfo.GN || gameInfo.EV || gameInfo.RO) {
    const gameSection = []
    if (gameInfo.GN) gameSection.push(`Game: ${String(gameInfo.GN)}`)
    if (gameInfo.EV) gameSection.push(`Event: ${String(gameInfo.EV)}`)
    if (gameInfo.RO) gameSection.push(`Round: ${String(gameInfo.RO)}`)
    sections.push(gameSection.join('\n'))
  }

  // Players
  if (gameInfo.PB || gameInfo.PW || gameInfo.BR || gameInfo.WR) {
    const playerSection = []
    if (gameInfo.PB) {
      playerSection.push(
        `Black: ${String(gameInfo.PB)}${gameInfo.BR ? ` (${String(gameInfo.BR)})` : ''}`
      )
    }
    if (gameInfo.PW) {
      playerSection.push(
        `White: ${String(gameInfo.PW)}${gameInfo.WR ? ` (${String(gameInfo.WR)})` : ''}`
      )
    }
    sections.push(playerSection.join('\n'))
  }

  // Game Details
  const gameDetails = []
  if (gameInfo.DT) gameDetails.push(`Date: ${String(gameInfo.DT)}`)
  if (gameInfo.PC) gameDetails.push(`Place: ${String(gameInfo.PC)}`)
  if (gameInfo.KM !== undefined) gameDetails.push(`Komi: ${String(gameInfo.KM)}`)
  if (gameInfo.HA !== undefined && Number(gameInfo.HA) > 0)
    gameDetails.push(`Handicap: ${String(gameInfo.HA)}`)
  if (gameInfo.SZ) gameDetails.push(`Board Size: ${String(gameInfo.SZ)}x${String(gameInfo.SZ)}`)
  if (gameInfo.RE) gameDetails.push(`Result: ${String(gameInfo.RE)}`)
  if (gameDetails.length > 0) {
    sections.push(gameDetails.join('\n'))
  }

  // Additional Information
  const additionalInfo = []
  if (gameInfo.RU) additionalInfo.push(`Rules: ${String(gameInfo.RU)}`)
  if (gameInfo.TM) additionalInfo.push(`Time Limit: ${String(gameInfo.TM)}`)
  if (gameInfo.OT) additionalInfo.push(`Overtime: ${String(gameInfo.OT)}`)
  if (gameInfo.AN) additionalInfo.push(`Annotator: ${String(gameInfo.AN)}`)
  if (gameInfo.SO) additionalInfo.push(`Source: ${String(gameInfo.SO)}`)
  if (additionalInfo.length > 0) {
    sections.push(additionalInfo.join('\n'))
  }

  return sections.join('\n\n')
}
