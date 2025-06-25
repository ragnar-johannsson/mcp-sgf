/**
 * Unit tests for getSgfInfo tool
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { handleGetSgfInfo } from '../src/tools/getSgfInfo'
import { SgfErrorType } from '../src/types/sgf'
describe('getSgfInfo', () => {
  describe('Happy Path Tests', () => {
    it('should parse basic SGF with minimal game information', async () => {
      const sgfContent = '(;FF[4]GM[1]SZ[19];B[dd];W[pd])'
      const result = await handleGetSgfInfo({ sgfContent })
      expect(result.content).toBeDefined()
      expect(result.content[0].type).toBe('text')
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(true)
      expect(response.data.metadata.boardSize).toBe(19)
      expect(response.data.metadata.totalMoves).toBe(2)
      expect(response.data.gameInfo.FF).toBe(4)
      expect(response.data.gameInfo.GM).toBe(1)
      expect(response.data.gameInfo.SZ).toBe(19)
    })
    it('should parse SGF with comprehensive game information', async () => {
      const sgfContent = `(;FF[4]CA[UTF-8]GM[1]DT[2023-12-25]
PC[Online]GN[Test Game]EV[Test Tournament]RO[Final]
PB[Black Player]BR[5d]PW[White Player]WR[6d]
KM[6.5]HA[0]SZ[19]TM[7200]OT[3x30 byo-yomi]
RU[Japanese]RE[B+0.5]AN[Test Annotator]
SO[Test Source]US[Test User]CP[Test Copyright]
;B[dd];W[pd];B[pp];W[dp])`
      const result = await handleGetSgfInfo({ sgfContent })
      expect(result.content).toBeDefined()
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(true)
      const gameInfo = response.data.gameInfo
      expect(gameInfo.GN).toBe('Test Game')
      expect(gameInfo.EV).toBe('Test Tournament')
      expect(gameInfo.RO).toBe('Final')
      expect(gameInfo.PB).toBe('Black Player')
      expect(gameInfo.BR).toBe('5d')
      expect(gameInfo.PW).toBe('White Player')
      expect(gameInfo.WR).toBe('6d')
      expect(gameInfo.KM).toBe(6.5)
      expect(gameInfo.SZ).toBe(19)
      expect(gameInfo.RE).toBe('B+0.5')
      expect(gameInfo.RU).toBe('Japanese')
      expect(gameInfo.DT).toBe('2023-12-25')
      expect(gameInfo.PC).toBe('Online')
      expect(response.data.metadata.totalMoves).toBe(4)
    })
    it('should handle SGF without board size (defaulting to 19)', async () => {
      const sgfContent = '(;FF[4]GM[1];B[dd];W[pd])'
      const result = await handleGetSgfInfo({ sgfContent })
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(true)
      expect(response.data.metadata.boardSize).toBe(19)
      expect(response.data.warnings).toContain('Board size (SZ) not specified, assuming 19x19')
    })
    it('should handle different board sizes', async () => {
      const sgfContent = '(;FF[4]GM[1]SZ[13];B[dd];W[pd])'
      const result = await handleGetSgfInfo({ sgfContent })
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(true)
      expect(response.data.metadata.boardSize).toBe(13)
      expect(response.data.gameInfo.SZ).toBe(13)
    })
    it('should handle handicap games', async () => {
      const sgfContent = '(;FF[4]GM[1]SZ[19]HA[4]AB[dd][pd][dp][pp];W[qf])'
      const result = await handleGetSgfInfo({ sgfContent })
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(true)
      expect(response.data.gameInfo.HA).toBe(4)
      expect(response.data.metadata.totalMoves).toBe(1) // Only count actual moves, not setup stones
    })
  })
  describe('Error Handling Tests', () => {
    it('should reject empty SGF content', async () => {
      const result = await handleGetSgfInfo({ sgfContent: '' })
      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(false)
      expect(response.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
    })
    it('should reject missing sgfContent parameter', async () => {
      // @ts-ignore - Testing runtime behavior
      const result = await handleGetSgfInfo({})
      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(false)
      expect(response.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
    })
    it('should reject invalid SGF format', async () => {
      const result = await handleGetSgfInfo({ sgfContent: 'invalid sgf content' })
      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(false)
      expect(response.error.type).toBe(SgfErrorType.INVALID_FORMAT)
    })
    it('should reject SGF without parentheses', async () => {
      const result = await handleGetSgfInfo({ sgfContent: 'FF[4]GM[1];B[dd]' })
      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(false)
      expect(response.error.type).toBe(SgfErrorType.INVALID_FORMAT)
    })
    it('should reject unsupported game types', async () => {
      const sgfContent = '(;FF[4]GM[2];B[aa])' // Chess (GM[2])
      const result = await handleGetSgfInfo({ sgfContent })
      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(false)
      expect(response.error.type).toBe(SgfErrorType.UNSUPPORTED_GAME)
    })
    it('should reject invalid board sizes', async () => {
      const sgfContent = '(;FF[4]GM[1]SZ[500];B[dd])' // Too large
      const result = await handleGetSgfInfo({ sgfContent })
      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(false)
      expect(response.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
    })
    it('should handle malformed SGF gracefully', async () => {
      const sgfContent = '(;FF[4]GM[1]SZ[19];B[dd];W[pd' // Missing closing bracket
      const result = await handleGetSgfInfo({ sgfContent })
      expect(result.isError).toBe(true)
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(false)
      expect(response.error.type).toBe(SgfErrorType.PARSING_ERROR)
    })
  })
  describe('Edge Cases', () => {
    it('should handle SGF with only root node', async () => {
      const sgfContent = '(;FF[4]GM[1]SZ[19])'
      const result = await handleGetSgfInfo({ sgfContent })
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(true)
      expect(response.data.metadata.totalMoves).toBe(0)
    })
    it('should handle SGF with variations', async () => {
      const sgfContent = '(;FF[4]GM[1]SZ[19];B[dd](;W[pd])(;W[dp]))'
      const result = await handleGetSgfInfo({ sgfContent })
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(true)
      expect(response.data.metadata.totalMoves).toBe(3) // Should count moves in all variations
    })
    it('should handle SGF with comments and special characters', async () => {
      const sgfContent =
        '(;FF[4]GM[1]SZ[19]GN[Test: Game \\] with [special\\] chars]C[Comment with \\] brackets];B[dd];W[pd])'
      const result = await handleGetSgfInfo({ sgfContent })
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(true)
      expect(response.data.gameInfo.GN).toBe('Test: Game ] with [special] chars')
    })
    it('should handle numeric properties correctly', async () => {
      const sgfContent = '(;FF[4]GM[1]SZ[19]KM[7.5]HA[2]TM[3600];B[dd];W[pd])'
      const result = await handleGetSgfInfo({ sgfContent })
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(true)
      expect(response.data.gameInfo.KM).toBe(7.5)
      expect(response.data.gameInfo.HA).toBe(2)
      expect(response.data.gameInfo.TM).toBe(3600)
    })
    it('should handle missing file format gracefully', async () => {
      const sgfContent = '(;GM[1]SZ[19];B[dd];W[pd])'
      const result = await handleGetSgfInfo({ sgfContent })
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(true)
      expect(response.data.warnings).toContain('File format (FF) not specified')
    })
  })
  describe('Performance Tests', () => {
    it('should process medium-sized SGF within time limit', async () => {
      // Generate SGF with many moves
      let sgfContent = '(;FF[4]GM[1]SZ[19]'
      const moves = ['dd', 'pd', 'dp', 'pp', 'qf', 'nq', 'jd', 'dj']
      for (let i = 0; i < 50; i++) {
        sgfContent += `;B[${moves[i % moves.length]}]`
        sgfContent += `;W[${moves[(i + 1) % moves.length]}]`
      }
      sgfContent += ')'
      const startTime = Date.now()
      const result = await handleGetSgfInfo({ sgfContent })
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(200) // Should complete within 200ms
      const response = JSON.parse(result.content[0].text)
      expect(response.success).toBe(true)
      expect(response.data.metadata.totalMoves).toBe(100)
    })
  })
})
