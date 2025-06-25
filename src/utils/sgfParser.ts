/**
 * SGF parsing utilities using @sabaki/sgf
 */

import pkg from '@sabaki/sgf'
const { parse } = pkg
import type { SgfGameInfo, SgfParseResult } from '../types/sgf.js'
import { SgfError, SgfErrorType } from '../types/sgf.js'

// Define interfaces for the @sabaki/sgf library types
interface SgfNode {
  id: number
  data: Record<string, string[]>
  parentId: number | null
  children: SgfNode[]
}

/**
 * Maximum allowed file size (100KB as per requirements)
 */
const MAX_FILE_SIZE = 100 * 1024

/**
 * Parse SGF content and extract game information
 * @param sgfContent - Raw SGF file content as string
 * @returns Parsed SGF result with game information
 */
export function parseSgfGameInfo(sgfContent: string): SgfParseResult {
  // Validate file size
  if (Buffer.byteLength(sgfContent, 'utf8') > MAX_FILE_SIZE) {
    throw new SgfError(
      SgfErrorType.FILE_TOO_LARGE,
      `SGF file exceeds maximum size of ${MAX_FILE_SIZE} bytes`
    )
  }

  try {
    // Parse SGF using @sabaki/sgf
    const gameTrees = parse(sgfContent) as unknown as SgfNode[]

    if (!gameTrees || gameTrees.length === 0) {
      throw new SgfError(SgfErrorType.INVALID_FORMAT, 'Invalid SGF format: empty game tree')
    }

    // Use the first game tree
    const gameTree = gameTrees[0]

    // Extract root node properties
    const properties = gameTree.data ?? {}

    // Validate this is a Go game (GM should be 1 or unspecified)
    const gameType = getPropertyValue(properties, 'GM')
    if (gameType && parseInt(gameType) !== 1) {
      throw new SgfError(
        SgfErrorType.UNSUPPORTED_GAME,
        `Unsupported game type: ${gameType}. Only Go (GM[1]) is supported.`
      )
    }

    // Extract game information
    const gameInfo: SgfGameInfo = {
      // Game identification
      GN: getPropertyValue(properties, 'GN'),
      GC: getPropertyValue(properties, 'GC'),
      EV: getPropertyValue(properties, 'EV'),
      RO: getPropertyValue(properties, 'RO'),
      DT: getPropertyValue(properties, 'DT'),
      PC: getPropertyValue(properties, 'PC'),
      SO: getPropertyValue(properties, 'SO'),
      US: getPropertyValue(properties, 'US'),
      AN: getPropertyValue(properties, 'AN'),
      CP: getPropertyValue(properties, 'CP'),

      // Players
      PB: getPropertyValue(properties, 'PB'),
      PW: getPropertyValue(properties, 'PW'),
      BR: getPropertyValue(properties, 'BR'),
      WR: getPropertyValue(properties, 'WR'),
      BT: getPropertyValue(properties, 'BT'),
      WT: getPropertyValue(properties, 'WT'),

      // Game rules and setup
      RU: getPropertyValue(properties, 'RU'),
      SZ: getNumericPropertyValue(properties, 'SZ'),
      HA: getNumericPropertyValue(properties, 'HA'),
      KM: getNumericPropertyValue(properties, 'KM'),
      TM: getNumericPropertyValue(properties, 'TM'),
      OT: getPropertyValue(properties, 'OT'),

      // Game result
      RE: getPropertyValue(properties, 'RE'),

      // Application and file format
      AP: getPropertyValue(properties, 'AP'),
      CA: getPropertyValue(properties, 'CA'),
      FF: getNumericPropertyValue(properties, 'FF'),
      GM: getNumericPropertyValue(properties, 'GM'),
      ST: getNumericPropertyValue(properties, 'ST'),
      VW: getPropertyValue(properties, 'VW'),
    }

    // Count total moves in the game
    const totalMoves = countMoves(gameTree)

    // Determine board size (default to 19 if not specified)
    const boardSize = gameInfo.SZ ?? 19

    // Validate board size
    if (boardSize < 1 || boardSize > 361) {
      throw new SgfError(
        SgfErrorType.INVALID_PARAMETERS,
        `Invalid board size: ${boardSize}. Must be between 1 and 361.`
      )
    }

    const warnings: string[] = []

    // Add warnings for missing standard properties
    if (!gameInfo.SZ) {
      warnings.push('Board size (SZ) not specified, assuming 19x19')
    }

    if (!gameInfo.FF) {
      warnings.push('File format (FF) not specified')
    }

    return {
      gameInfo,
      totalMoves,
      boardSize,
      hasValidStructure: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  } catch (error) {
    if (error instanceof SgfError) {
      throw error
    }

    throw new SgfError(
      SgfErrorType.PARSING_ERROR,
      `Failed to parse SGF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error
    )
  }
}

/**
 * Extract string property value from SGF properties
 * @param properties - SGF node properties
 * @param key - Property key
 * @returns Property value or undefined
 */
function getPropertyValue(properties: Record<string, string[]>, key: string): string | undefined {
  const prop = properties[key]
  if (!prop || prop.length === 0) return undefined
  return prop[0]
}

/**
 * Extract numeric property value from SGF properties
 * @param properties - SGF node properties
 * @param key - Property key
 * @returns Numeric property value or undefined
 */
function getNumericPropertyValue(
  properties: Record<string, string[]>,
  key: string
): number | undefined {
  const value = getPropertyValue(properties, key)
  if (!value) return undefined

  const parsed = parseFloat(value)
  return isNaN(parsed) ? undefined : parsed
}

/**
 * Count total moves in a game tree
 * @param gameTree - Root node of the parsed SGF game tree
 * @returns Total number of moves
 */
function countMoves(gameTree: SgfNode): number {
  let moveCount = 0

  function traverseNode(node: SgfNode): void {
    const properties = node.data ?? {}

    // Count black and white moves (B and W properties)
    if (properties.B || properties.W) {
      moveCount++
    }

    // Recursively traverse child nodes
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        traverseNode(child)
      }
    }
  }

  traverseNode(gameTree)
  return moveCount
}

/**
 * Validate SGF content format
 * @param sgfContent - Raw SGF content
 * @returns True if basic format is valid
 */
export function validateSgfFormat(sgfContent: string): boolean {
  // Basic SGF format validation - should start with ( and contain at least one property
  const trimmed = sgfContent.trim()
  if (!trimmed.startsWith('(')) {
    return false
  }

  // Should contain at least one property
  if (!trimmed.includes('[') || !trimmed.includes(']')) {
    return false
  }

  return true
}
