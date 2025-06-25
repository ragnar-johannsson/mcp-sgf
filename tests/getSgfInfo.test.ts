/**
 * Unit tests for getSgfInfo tool
 */

import { describe, it, expect } from 'vitest'
import { handleGetSgfInfo, formatGameInfo } from '../src/tools/getSgfInfo.js'
import { SgfErrorType, type SgfGameInfo } from '../src/types/sgf.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

// Type definitions for test responses
interface SuccessResponse {
  success: true
  data: {
    gameInfo: Record<string, unknown>
    metadata: {
      totalMoves: number
      boardSize: number
      hasValidStructure: boolean
    }
    warnings?: string[]
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

type TestResponse = SuccessResponse | ErrorResponse

// Helper function to safely parse test results with proper typing
function parseTestResult(result: CallToolResult): TestResponse {
  expect(result.content).toBeDefined()
  expect(result.content[0]?.text).toBeDefined()

  const text = result.content[0]?.text as string
  return JSON.parse(text) as TestResponse
}

describe('getSgfInfo', () => {
  describe('Happy Path Tests', () => {
    it('should parse basic SGF with minimal game information', () => {
      const sgf = '(;GM[1]FF[4]SZ[19]PB[Black Player]PW[White Player];B[dd];W[pp])'

      const result = handleGetSgfInfo({ sgfContent: sgf })

      expect(result.content).toHaveLength(1)
      expect(result.content[0]?.type).toBe('text')
      const response = parseTestResult(result)
      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data.gameInfo.playerBlack).toBe('Black Player')
        expect(response.data.gameInfo.playerWhite).toBe('White Player')
      }
    })

    it('should parse SGF with comprehensive game information', () => {
      const sgf = `(;GM[1]FF[4]SZ[19]
        PB[Takemiya Masaki]PW[Cho Chikun]
        BR[9p]WR[9p]
        EV[Honinbo]RO[Final]
        DT[1984-06-28]
        KM[5.5]HA[0]
        RE[B+5]RU[Japanese]
        PC[Tokyo]GN[Game 1]
        ;B[dd];W[pp];B[dq];W[qd])`

      const result = handleGetSgfInfo({ sgfContent: sgf })

      expect(result.content).toHaveLength(1)
      const response = parseTestResult(result)
      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data.gameInfo.playerBlack).toBe('Takemiya Masaki')
        expect(response.data.gameInfo.playerWhite).toBe('Cho Chikun')
        expect(response.data.gameInfo.blackRank).toBe('9p')
        expect(response.data.gameInfo.whiteRank).toBe('9p')
        expect(response.data.gameInfo.event).toBe('Honinbo')
        expect(response.data.gameInfo.result).toBe('B+5')
        expect(response.data.metadata.totalMoves).toBeGreaterThan(0)
      }
    })

    it('should handle SGF without board size (defaulting to 19)', () => {
      const sgf = '(;GM[1]FF[4]PB[Test Black]PW[Test White];B[dd])'

      const result = handleGetSgfInfo({ sgfContent: sgf })

      expect(result.content).toHaveLength(1)
      const response = parseTestResult(result)
      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data.metadata.boardSize).toBe(19) // Default board size
      }
    })

    it('should handle different board sizes', () => {
      const sgf = '(;GM[1]FF[4]SZ[13]PB[Player1]PW[Player2];B[dd])'

      const result = handleGetSgfInfo({ sgfContent: sgf })

      expect(result.content).toHaveLength(1)
      const response = parseTestResult(result)
      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data.metadata.boardSize).toBe(13)
      }
    })

    it('should handle handicap games', () => {
      const sgf = '(;GM[1]FF[4]SZ[19]HA[3]KM[0.5]PB[Weaker]PW[Stronger];B[dd];B[pp];B[dp])'

      const result = handleGetSgfInfo({ sgfContent: sgf })

      expect(result.content).toHaveLength(1)
      const response = parseTestResult(result)
      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data.gameInfo.handicap).toBe(3)
        expect(response.data.gameInfo.komi).toBe(0.5)
      }
    })
  })

  describe('Error Handling Tests', () => {
    it('should reject empty SGF content', () => {
      const result = handleGetSgfInfo({ sgfContent: '' })

      expect(result.content).toHaveLength(1)
      expect(result.isError).toBe(true)
      const response = parseTestResult(result)
      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
      }
    })

    it('should reject missing sgfContent parameter', () => {
      const result = handleGetSgfInfo({})

      expect(result.content).toHaveLength(1)
      expect(result.isError).toBe(true)
      const response = parseTestResult(result)
      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
      }
    })

    it('should reject invalid SGF format', () => {
      const result = handleGetSgfInfo({ sgfContent: 'not a valid sgf' })

      expect(result.content).toHaveLength(1)
      expect(result.isError).toBe(true)
      const response = parseTestResult(result)
      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.error.type).toBe(SgfErrorType.INVALID_FORMAT)
      }
    })

    it('should reject SGF without parentheses', () => {
      const result = handleGetSgfInfo({ sgfContent: 'GM[1]FF[4]SZ[19]' })

      expect(result.content).toHaveLength(1)
      expect(result.isError).toBe(true)
      const response = parseTestResult(result)
      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.error.type).toBe(SgfErrorType.INVALID_FORMAT)
      }
    })

    it('should reject unsupported game types', () => {
      const sgf = '(;GM[2]FF[4]SZ[8];B[dd])' // GM[2] is not Go

      const result = handleGetSgfInfo({ sgfContent: sgf })

      expect(result.content).toHaveLength(1)
      expect(result.isError).toBe(true)
      const response = parseTestResult(result)
      expect(response.success).toBe(false)
    })

    it('should reject invalid board sizes', () => {
      const sgf = '(;GM[1]FF[4]SZ[0]PB[Test];B[dd])' // Invalid board size

      const result = handleGetSgfInfo({ sgfContent: sgf })

      expect(result.content).toHaveLength(1)
      expect(result.isError).toBe(true)
      const response = parseTestResult(result)
      expect(response.success).toBe(false)
    })

    it('should handle malformed SGF gracefully', () => {
      const sgf = '(;GM[1]FF[4]SZ[19]PB[Test Player]' // Missing closing parenthesis

      const result = handleGetSgfInfo({ sgfContent: sgf })

      expect(result.content).toHaveLength(1)
      expect(result.isError).toBe(true)
      const response = parseTestResult(result)
      expect(response.success).toBe(false)
    })

    it('should handle unexpected errors gracefully', () => {
      // Test error path by passing null which should cause a parsing error
      const result = handleGetSgfInfo({ sgfContent: null })

      expect(result.content).toHaveLength(1)
      expect(result.isError).toBe(true)
      const response = parseTestResult(result)
      expect(response.success).toBe(false)
      if (!response.success) {
        expect(response.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle SGF with only root node', () => {
      const sgf = '(;GM[1]FF[4]SZ[19])'

      const result = handleGetSgfInfo({ sgfContent: sgf })

      expect(result.content).toHaveLength(1)
      const response = parseTestResult(result)
      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data.metadata.totalMoves).toBe(0)
      }
    })

    it('should handle SGF with variations', () => {
      const sgf = '(;GM[1]FF[4]SZ[19](;B[dd];W[pp])(;B[pd];W[dp]))'

      const result = handleGetSgfInfo({ sgfContent: sgf })

      expect(result.content).toHaveLength(1)
      const response = parseTestResult(result)
      expect(response.success).toBe(true)
    })

    it('should handle SGF with comments and special characters', () => {
      const sgf =
        '(;GM[1]FF[4]SZ[19]C[Game comment\\nwith newlines]PB[Player "A"]PW[Player \\]B\\[])'

      const result = handleGetSgfInfo({ sgfContent: sgf })

      expect(result.content).toHaveLength(1)
      const response = parseTestResult(result)
      expect(response.success).toBe(true)
    })

    it('should handle numeric properties correctly', () => {
      const sgf = '(;GM[1]FF[4]SZ[19]KM[6.5]HA[2]TM[7200]OT[30/300])'

      const result = handleGetSgfInfo({ sgfContent: sgf })

      expect(result.content).toHaveLength(1)
      const response = parseTestResult(result)
      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data.gameInfo.komi).toBe(6.5)
        expect(response.data.gameInfo.handicap).toBe(2)
      }
    })

    it('should handle missing file format gracefully', () => {
      const sgf = '(;GM[1]SZ[19]PB[Test];B[dd])' // Missing FF property

      const result = handleGetSgfInfo({ sgfContent: sgf })

      expect(result.content).toHaveLength(1)
      const response = parseTestResult(result)
      expect(response.success).toBe(true)
    })
  })

  describe('Performance Tests', () => {
    it('should process medium-sized SGF within time limit', () => {
      const moves = Array.from({ length: 200 }, (_, i) => (i % 2 === 0 ? 'B[dd]' : 'W[pp]')).join(
        ';'
      )
      const sgf = `(;GM[1]FF[4]SZ[19]PB[Player1]PW[Player2];${moves})`

      const start = Date.now()
      const result = handleGetSgfInfo({ sgfContent: sgf })
      const duration = Date.now() - start

      expect(duration).toBeLessThan(200) // Should process in under 200ms
      expect(result.content).toHaveLength(1)
      const response = parseTestResult(result)
      expect(response.success).toBe(true)
    })
  })

  describe('formatGameInfo function', () => {
    it('should format minimal game info', () => {
      const gameInfo: SgfGameInfo = {
        gameType: 1,
        fileFormat: 4,
        boardSize: 19,
      }

      const formatted = formatGameInfo(gameInfo)
      expect(formatted).toContain('Board Size: 19x19')
    })

    it('should format complete game info', () => {
      const gameInfo: SgfGameInfo = {
        gameType: 1,
        fileFormat: 4,
        boardSize: 19,
        playerBlack: 'Takemiya Masaki',
        playerWhite: 'Cho Chikun',
        blackRank: '9p',
        whiteRank: '9p',
        gameName: 'Honinbo Title Match',
        event: 'Honinbo',
        round: 'Game 1',
        date: '1984-06-28',
        place: 'Tokyo',
        komi: 5.5,
        handicap: 0,
        result: 'B+5',
        rules: 'Japanese',
        timeLimit: 7200,
        overtime: '5x30s',
        annotator: 'GoSeigen',
        source: 'GoBase',
        gameComment: 'Excellent game',
      }

      const formatted = formatGameInfo(gameInfo)

      expect(formatted).toContain('Game: Honinbo Title Match')
      expect(formatted).toContain('Event: Honinbo')
      expect(formatted).toContain('Round: Game 1')
      expect(formatted).toContain('Black: Takemiya Masaki (9p)')
      expect(formatted).toContain('White: Cho Chikun (9p)')
      expect(formatted).toContain('Date: 1984-06-28')
      expect(formatted).toContain('Place: Tokyo')
      expect(formatted).toContain('Komi: 5.5')
      expect(formatted).toContain('Result: B+5')
      expect(formatted).toContain('Rules: Japanese')
      expect(formatted).toContain('Time Limit: 7200')
      expect(formatted).toContain('Overtime: 5x30s')
      expect(formatted).toContain('Annotator: GoSeigen')
      expect(formatted).toContain('Source: GoBase')
    })

    it('should handle game info with only player names', () => {
      const gameInfo: SgfGameInfo = {
        gameType: 1,
        fileFormat: 4,
        boardSize: 19,
        playerBlack: 'Black Player',
        playerWhite: 'White Player',
      }

      const formatted = formatGameInfo(gameInfo)
      expect(formatted).toContain('Black: Black Player')
      expect(formatted).toContain('White: White Player')
      expect(formatted).not.toContain('(')
    })

    it('should handle game info with handicap', () => {
      const gameInfo: SgfGameInfo = {
        gameType: 1,
        fileFormat: 4,
        boardSize: 19,
        handicap: 3,
        komi: 0.5,
      }

      const formatted = formatGameInfo(gameInfo)
      expect(formatted).toContain('Handicap: 3')
      expect(formatted).toContain('Komi: 0.5')
    })

    it('should not show handicap when it is 0', () => {
      const gameInfo: SgfGameInfo = {
        gameType: 1,
        fileFormat: 4,
        boardSize: 19,
        handicap: 0,
        komi: 6.5,
      }

      const formatted = formatGameInfo(gameInfo)
      expect(formatted).not.toContain('Handicap')
      expect(formatted).toContain('Komi: 6.5')
    })

    it('should handle empty game info', () => {
      const gameInfo: SgfGameInfo = {
        gameType: 1,
        fileFormat: 4,
        boardSize: 19,
      }

      const formatted = formatGameInfo(gameInfo)
      expect(formatted).toContain('Board Size: 19x19')
      expect(formatted.split('\n\n')).toHaveLength(1) // Only one section
    })
  })
})
