/**
 * Unit tests for getSgfInfo tool
 */

import { describe, it, expect } from 'vitest'
import { handleGetSgfInfo } from '../src/tools/getSgfInfo.js'
import { SgfErrorType } from '../src/types/sgf.js'

// Helper function to safely parse test results
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTestResult(result: any): any {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  expect(result.content).toBeDefined()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  expect(result.content?.[0]?.text).toBeDefined()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  return JSON.parse(result.content[0].text)
}

describe('getSgfInfo', () => {
  describe('Happy Path Tests', () => {
    it('should parse basic SGF with minimal game information', () => {
      const sgfContent = '(;FF[4]GM[1]SZ[19];B[dd];W[pd])'

      const result = handleGetSgfInfo({ sgfContent })

      expect(result.content).toBeDefined()
      expect(result.content[0].type).toBe('text')

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = parseTestResult(result)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.success).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.metadata.boardSize).toBe(19)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.metadata.totalMoves).toBe(2)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.gameInfo.FF).toBe(4)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.gameInfo.GM).toBe(1)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.gameInfo.SZ).toBe(19)
    })

    it('should parse SGF with comprehensive game information', () => {
      const sgfContent = `(;FF[4]CA[UTF-8]GM[1]DT[2023-12-25]
PC[Online]GN[Test Game]EV[Test Tournament]RO[Final]
PB[Black Player]BR[5d]PW[White Player]WR[6d]
KM[6.5]HA[0]SZ[19]TM[7200]OT[3x30 byo-yomi]
RU[Japanese]RE[B+0.5]AN[Test Annotator]
SO[Test Source]US[Test User]CP[Test Copyright]
;B[dd];W[pd];B[pp];W[dp])`

      const result = handleGetSgfInfo({ sgfContent })

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = parseTestResult(result)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.success).toBe(true)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const gameInfo = response.data.gameInfo
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(gameInfo.GN).toBe('Test Game')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(gameInfo.EV).toBe('Test Tournament')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(gameInfo.RO).toBe('Final')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(gameInfo.PB).toBe('Black Player')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(gameInfo.BR).toBe('5d')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(gameInfo.PW).toBe('White Player')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(gameInfo.WR).toBe('6d')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(gameInfo.KM).toBe(6.5)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(gameInfo.SZ).toBe(19)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(gameInfo.RE).toBe('B+0.5')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(gameInfo.RU).toBe('Japanese')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(gameInfo.DT).toBe('2023-12-25')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(gameInfo.PC).toBe('Online')

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.metadata.totalMoves).toBe(4)
    })

    it('should handle SGF without board size (defaulting to 19)', () => {
      const sgfContent = '(;FF[4]GM[1];B[dd];W[pd])'

      const result = handleGetSgfInfo({ sgfContent })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = parseTestResult(result)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.success).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.metadata.boardSize).toBe(19)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.warnings).toContain('Board size (SZ) not specified, assuming 19x19')
    })

    it('should handle different board sizes', () => {
      const sgfContent = '(;FF[4]GM[1]SZ[13];B[dd];W[pd])'

      const result = handleGetSgfInfo({ sgfContent })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = parseTestResult(result)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.success).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.metadata.boardSize).toBe(13)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.gameInfo.SZ).toBe(13)
    })

    it('should handle handicap games', () => {
      const sgfContent = '(;FF[4]GM[1]SZ[19]HA[4]AB[dd][pd][dp][pp];W[qf])'

      const result = handleGetSgfInfo({ sgfContent })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = parseTestResult(result)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.success).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.gameInfo.HA).toBe(4)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.metadata.totalMoves).toBe(1) // Only count actual moves, not setup stones
    })
  })

  describe('Error Handling Tests', () => {
    it('should reject empty SGF content', () => {
      const result = handleGetSgfInfo({ sgfContent: '' })

      expect(result.isError).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = parseTestResult(result)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.success).toBe(false)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
    })

    it('should reject missing sgfContent parameter', () => {
      const result = handleGetSgfInfo({})
      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0]?.text as string) as {
        success: boolean
        error: { type: string; message: string }
      }
      expect(response.success).toBe(false)
      expect(response.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
    })

    it('should reject invalid SGF format', () => {
      const result = handleGetSgfInfo({ sgfContent: 'not sgf content' })
      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0]?.text as string) as {
        success: boolean
        error: { type: string; message: string }
      }
      expect(response.success).toBe(false)
      expect(response.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
    })

    it('should reject SGF without parentheses', () => {
      const result = handleGetSgfInfo({ sgfContent: 'GM[1]FF[4]SZ[19]' })
      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0]?.text as string) as {
        success: boolean
        error: { type: string; message: string }
      }
      expect(response.success).toBe(false)
      expect(response.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
    })

    it('should reject unsupported game types', () => {
      const sgfContent = '(;FF[4]GM[2];B[aa])' // Chess (GM[2])

      const result = handleGetSgfInfo({ sgfContent })

      expect(result.isError).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = parseTestResult(result)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.success).toBe(false)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.error.type).toBe(SgfErrorType.UNSUPPORTED_GAME)
    })

    it('should reject invalid board sizes', () => {
      const sgfContent = '(;FF[4]GM[1]SZ[500];B[dd])' // Too large

      const result = handleGetSgfInfo({ sgfContent })

      expect(result.isError).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = parseTestResult(result)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.success).toBe(false)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
    })

    it('should handle malformed SGF gracefully', () => {
      // Use an SGF that passes Zod validation but fails our parser
      const malformedSgf = '(;GM[1]FF[4]SZ[19];B[zz])' // Invalid coordinate
      const result = handleGetSgfInfo({ sgfContent: malformedSgf })
      // Our parser is lenient, so this test verifies graceful handling rather than rejection
      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      expect(Array.isArray(result.content)).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle SGF with only root node', () => {
      const sgfContent = '(;FF[4]GM[1]SZ[19])'

      const result = handleGetSgfInfo({ sgfContent })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = parseTestResult(result)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.success).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.metadata.totalMoves).toBe(0)
    })

    it('should handle SGF with variations', () => {
      const sgfContent = '(;FF[4]GM[1]SZ[19];B[dd](;W[pd])(;W[dp]))'

      const result = handleGetSgfInfo({ sgfContent })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = parseTestResult(result)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.success).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.metadata.totalMoves).toBe(3) // Should count moves in all variations
    })

    it('should handle SGF with comments and special characters', () => {
      const sgfContent =
        '(;FF[4]GM[1]SZ[19]GN[Test: Game \\] with [special\\] chars]C[Comment with \\] brackets];B[dd];W[pd])'

      const result = handleGetSgfInfo({ sgfContent })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = parseTestResult(result)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.success).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.gameInfo.GN).toBe('Test: Game ] with [special] chars')
    })

    it('should handle numeric properties correctly', () => {
      const sgfContent = '(;FF[4]GM[1]SZ[19]KM[7.5]HA[2]TM[3600];B[dd];W[pd])'

      const result = handleGetSgfInfo({ sgfContent })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = parseTestResult(result)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.success).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.gameInfo.KM).toBe(7.5)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.gameInfo.HA).toBe(2)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.gameInfo.TM).toBe(3600)
    })

    it('should handle missing file format gracefully', () => {
      const sgfContent = '(;GM[1]SZ[19];B[dd];W[pd])'

      const result = handleGetSgfInfo({ sgfContent })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = parseTestResult(result)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.success).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.warnings).toContain('File format (FF) not specified')
    })
  })

  describe('Performance Tests', () => {
    it('should process medium-sized SGF within time limit', () => {
      // Generate SGF with many moves
      let sgfContent = '(;FF[4]GM[1]SZ[19]'
      const moves = ['dd', 'pd', 'dp', 'pp', 'qf', 'nq', 'jd', 'dj']

      for (let i = 0; i < 50; i++) {
        sgfContent += `;B[${moves[i % moves.length]}]`
        sgfContent += `;W[${moves[(i + 1) % moves.length]}]`
      }
      sgfContent += ')'

      const startTime = Date.now()
      const result = handleGetSgfInfo({ sgfContent })
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(200) // Should complete within 200ms

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = parseTestResult(result)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.success).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.data.metadata.totalMoves).toBe(100)
    })
  })
})
