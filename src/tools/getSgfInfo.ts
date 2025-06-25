/**
 * MCP tool implementation for extracting SGF game information
 */

import type { Tool, TextContent, CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { parseSgfGameInfo, validateSgfFormat } from '../utils/sgfParser.js'
import { validateGetSgfInfoArgs, sanitizeInput } from '../utils/validation.js'
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
export function handleGetSgfInfo(args: unknown): CallToolResult {
  try {
    // Validate and sanitize input using Zod schemas
    const validation = validateGetSgfInfoArgs(args)
    if (!validation.success) {
      throw validation.error
    }

    const { sgfContent: rawContent } = validation.data
    const sgfContent = sanitizeInput(rawContent)

    // Additional SGF format validation for enhanced security
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
  if (gameInfo.gameName || gameInfo.event || gameInfo.round) {
    const gameSection = []
    if (gameInfo.gameName) gameSection.push(`Game: ${String(gameInfo.gameName)}`)
    if (gameInfo.event) gameSection.push(`Event: ${String(gameInfo.event)}`)
    if (gameInfo.round) gameSection.push(`Round: ${String(gameInfo.round)}`)
    sections.push(gameSection.join('\n'))
  }

  // Players
  if (gameInfo.playerBlack || gameInfo.playerWhite || gameInfo.blackRank || gameInfo.whiteRank) {
    const playerSection = []
    if (gameInfo.playerBlack) {
      playerSection.push(
        `Black: ${String(gameInfo.playerBlack)}${gameInfo.blackRank ? ` (${String(gameInfo.blackRank)})` : ''}`
      )
    }
    if (gameInfo.playerWhite) {
      playerSection.push(
        `White: ${String(gameInfo.playerWhite)}${gameInfo.whiteRank ? ` (${String(gameInfo.whiteRank)})` : ''}`
      )
    }
    sections.push(playerSection.join('\n'))
  }

  // Game Details
  const gameDetails = []
  if (gameInfo.date) gameDetails.push(`Date: ${String(gameInfo.date)}`)
  if (gameInfo.place) gameDetails.push(`Place: ${String(gameInfo.place)}`)
  if (gameInfo.komi !== undefined) gameDetails.push(`Komi: ${String(gameInfo.komi)}`)
  if (gameInfo.handicap !== undefined && Number(gameInfo.handicap) > 0)
    gameDetails.push(`Handicap: ${String(gameInfo.handicap)}`)
  if (gameInfo.boardSize)
    gameDetails.push(`Board Size: ${String(gameInfo.boardSize)}x${String(gameInfo.boardSize)}`)
  if (gameInfo.result) gameDetails.push(`Result: ${String(gameInfo.result)}`)
  if (gameDetails.length > 0) {
    sections.push(gameDetails.join('\n'))
  }

  // Additional Information
  const additionalInfo = []
  if (gameInfo.rules) additionalInfo.push(`Rules: ${String(gameInfo.rules)}`)
  if (gameInfo.timeLimit) additionalInfo.push(`Time Limit: ${String(gameInfo.timeLimit)}`)
  if (gameInfo.overtime) additionalInfo.push(`Overtime: ${String(gameInfo.overtime)}`)
  if (gameInfo.annotator) additionalInfo.push(`Annotator: ${String(gameInfo.annotator)}`)
  if (gameInfo.source) additionalInfo.push(`Source: ${String(gameInfo.source)}`)
  if (additionalInfo.length > 0) {
    sections.push(additionalInfo.join('\n'))
  }

  return sections.join('\n\n')
}
