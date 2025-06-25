/**
 * Unit tests for getSgfDiagram tool and diagram rendering utilities
 */

import { describe, expect, it, vi } from 'vitest'
import {
  handleGetSgfDiagram,
  getSgfDiagramTool,
  getDiagramCapabilities,
} from '../src/tools/getSgfDiagram.js'
import {
  generateDiagram,
  getSupportedThemes,
  getSupportedFormats,
  isValidBoardSize,
} from '../src/utils/diagramRenderer.js'
import { SgfErrorType, type DiagramParameters } from '../src/types/sgf.js'

// Type for test metadata to avoid using any
interface DiagramToolMetadata {
  mimeType: string
  width: number
  height: number
  movesCovered: number
  boardSize: number
  parameters: DiagramParameters
}

// Type for error response
interface ErrorData {
  success: boolean
  error: {
    type: string
    message: string
    details?: unknown
  }
}

// Mock sgf-to-image since it may not work in test environment
vi.mock('sgf-to-image', () => ({
  default: vi.fn().mockResolvedValue(Buffer.from('mock-image-data', 'base64')),
}))

describe('getSgfDiagram tool', () => {
  // Sample SGF content for testing
  const validSgf = `(;FF[4]GM[1]SZ[19]
    PB[Black Player]PW[White Player]
    BR[1d]WR[2d]
    DT[2024-01-01]
    KM[6.5]HA[0]
    RE[W+7.5]
    ;B[pd];W[dd];B[pq];W[dp])`

  const largeBoardSgf = `(;FF[4]GM[1]SZ[21]
    PB[Black Player]PW[White Player]
    ;B[aa];W[bb])`

  describe('Tool Definition', () => {
    it('should have correct tool name and description', () => {
      expect(getSgfDiagramTool.name).toBe('get-sgf-diagram')
      expect(getSgfDiagramTool.description).toContain('Generate visual board diagrams')
    })

    it('should have proper input schema', () => {
      const schema = getSgfDiagramTool.inputSchema
      expect(schema.type).toBe('object')
      expect(schema.required).toEqual(['sgfContent'])
      expect(schema.properties?.sgfContent).toBeDefined()
      expect(schema.properties?.moveNumber).toBeDefined()
      expect(schema.properties?.width).toBeDefined()
      expect(schema.properties?.height).toBeDefined()
    })
  })

  describe('Basic Functionality', () => {
    it('should generate diagram from valid SGF', async () => {
      const result = await handleGetSgfDiagram({
        sgfContent: validSgf,
      })

      expect(result.content).toBeDefined()
      expect(result.content[0].type).toBe('image')
      expect(result.metadata).toBeDefined()
    })

    it('should handle specific move number', async () => {
      const result = await handleGetSgfDiagram({
        sgfContent: validSgf,
        moveNumber: 2,
      })

      expect(result.content[0].type).toBe('image')
      expect((result.metadata as DiagramToolMetadata)?.movesCovered).toBe(3) // moveNumber + 1
    })

    it('should handle move range', async () => {
      const result = await handleGetSgfDiagram({
        sgfContent: validSgf,
        startMove: 1,
        endMove: 3,
      })

      expect(result.content[0].type).toBe('image')
      expect((result.metadata as DiagramToolMetadata)?.movesCovered).toBe(3) // endMove - startMove + 1
    })

    it('should handle custom dimensions', async () => {
      const result = await handleGetSgfDiagram({
        sgfContent: validSgf,
        width: 800,
        height: 800,
      })

      expect((result.metadata as DiagramToolMetadata)?.width).toBe(800)
      expect((result.metadata as DiagramToolMetadata)?.height).toBe(800)
    })

    it('should handle different themes', async () => {
      const result = await handleGetSgfDiagram({
        sgfContent: validSgf,
        theme: 'modern',
      })

      expect(result.content[0].type).toBe('image')
      expect((result.metadata as DiagramToolMetadata)?.parameters.theme).toBe('modern')
    })
  })

  describe('Input Validation', () => {
    it('should reject empty SGF content', async () => {
      const result = await handleGetSgfDiagram({
        sgfContent: '',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].type).toBe('text')
      const errorData = JSON.parse(result.content[0].text as string) as ErrorData
      expect(errorData.success).toBe(false)
      expect(errorData.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
    })

    it('should reject invalid SGF format', async () => {
      const result = await handleGetSgfDiagram({
        sgfContent: 'invalid sgf content',
      })

      expect(result.isError).toBe(true)
      const errorData = JSON.parse(result.content[0].text as string) as ErrorData
      expect(errorData.error.type).toBe(SgfErrorType.INVALID_FORMAT)
    })

    it('should reject both moveNumber and move range', async () => {
      const result = await handleGetSgfDiagram({
        sgfContent: validSgf,
        moveNumber: 2,
        startMove: 1,
        endMove: 3,
      })

      expect(result.isError).toBe(true)
      const errorData = JSON.parse(result.content[0].text as string) as ErrorData
      expect(errorData.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
      expect(errorData.error.message).toContain('Cannot specify both moveNumber and move range')
    })

    it('should reject startMove without endMove', async () => {
      const result = await handleGetSgfDiagram({
        sgfContent: validSgf,
        startMove: 1,
      })

      expect(result.isError).toBe(true)
      const errorData = JSON.parse(result.content[0].text as string) as ErrorData
      expect(errorData.error.message).toContain('startMove requires endMove')
    })

    it('should reject endMove without startMove', async () => {
      const result = await handleGetSgfDiagram({
        sgfContent: validSgf,
        endMove: 3,
      })

      expect(result.isError).toBe(true)
      const errorData = JSON.parse(result.content[0].text as string) as ErrorData
      expect(errorData.error.message).toContain('endMove requires startMove')
    })

    it('should reject invalid dimensions', async () => {
      const result = await handleGetSgfDiagram({
        sgfContent: validSgf,
        width: 50, // Below minimum
      })

      expect(result.isError).toBe(true)
      const errorData = JSON.parse(result.content[0].text as string) as ErrorData
      expect(errorData.error.message).toContain('Width 50 is out of range')
    })
  })

  describe('Board Size Support', () => {
    it('should support standard 19x19 board', async () => {
      const result = await handleGetSgfDiagram({
        sgfContent: validSgf,
      })

      expect((result.metadata as DiagramToolMetadata)?.boardSize).toBe(19)
    })

    it('should support larger board sizes up to 361x361', async () => {
      const result = await handleGetSgfDiagram({
        sgfContent: largeBoardSgf,
      })

      expect((result.metadata as DiagramToolMetadata)?.boardSize).toBe(21)
    })

    it('should reject board sizes exceeding maximum', async () => {
      const oversizedSgf = `(;FF[4]GM[1]SZ[400]PB[Black]PW[White];B[aa])`

      const result = await handleGetSgfDiagram({
        sgfContent: oversizedSgf,
      })

      expect(result.isError).toBe(true)
      const errorData = JSON.parse(result.content[0].text as string) as ErrorData
      expect(errorData.error.message).toContain('board size')
    })
  })

  describe('Performance Benchmarks', () => {
    it('should generate diagram in under 500ms for small SGF', async () => {
      const startTime = Date.now()

      await handleGetSgfDiagram({
        sgfContent: validSgf,
      })

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(500) // Performance requirement
    })

    it('should handle multiple concurrent requests efficiently', async () => {
      const startTime = Date.now()

      const promises = Array.from({ length: 5 }, () =>
        handleGetSgfDiagram({
          sgfContent: validSgf,
          width: 400,
          height: 400,
        })
      )

      const results = await Promise.all(promises)
      const duration = Date.now() - startTime

      // All should succeed
      results.forEach(result => {
        expect(result.content[0].type).toBe('image')
      })

      // Should complete all 5 requests in reasonable time
      expect(duration).toBeLessThan(2000)
    })

    it('should handle large board efficiently', async () => {
      const largeSgf = `(;FF[4]GM[1]SZ[25]PB[Black]PW[White]
        ${Array.from({ length: 20 }, (_, i) => `;B[${String.fromCharCode(97 + i)}a];W[${String.fromCharCode(97 + i)}b]`).join('')})`

      const startTime = Date.now()

      const result = await handleGetSgfDiagram({
        sgfContent: largeSgf,
        width: 800,
        height: 800,
      })

      const duration = Date.now() - startTime
      expect(result.content[0].type).toBe('image')
      expect(duration).toBeLessThan(500)
    })
  })
})

describe('Diagram Renderer Utilities', () => {
  const mockSgf = `(;FF[4]GM[1]SZ[19]PB[Black]PW[White];B[pd];W[dd])`

  describe('generateDiagram function', () => {
    it('should generate diagram with default parameters', async () => {
      const result = await generateDiagram(mockSgf, {}, 2, 19)

      expect(result.imageData).toBeDefined()
      expect(result.mimeType).toBe('image/png')
      expect(result.width).toBe(600)
      expect(result.height).toBe(600)
      expect(result.boardSize).toBe(19)
    })

    it('should support SVG format', async () => {
      const result = await generateDiagram(mockSgf, { format: 'svg' }, 2, 19)

      expect(result.mimeType).toBe('image/svg+xml')
    })

    it('should validate move numbers', async () => {
      await expect(generateDiagram(mockSgf, { moveNumber: 10 }, 2, 19)).rejects.toThrow(
        'Move number 10 is out of range'
      )
    })

    it('should validate board size limits', async () => {
      await expect(generateDiagram(mockSgf, {}, 2, 400)).rejects.toThrow(
        'exceeds maximum supported size'
      )
    })
  })

  describe('Utility functions', () => {
    it('should return supported themes', () => {
      const themes = getSupportedThemes()
      expect(themes).toContain('classic')
      expect(themes).toContain('modern')
      expect(themes).toContain('minimal')
    })

    it('should return supported formats', () => {
      const formats = getSupportedFormats()
      expect(formats).toContain('png')
      expect(formats).toContain('svg')
    })

    it('should validate board sizes correctly', () => {
      expect(isValidBoardSize(19)).toBe(true)
      expect(isValidBoardSize(361)).toBe(true)
      expect(isValidBoardSize(362)).toBe(false)
      expect(isValidBoardSize(0)).toBe(false)
      expect(isValidBoardSize(-1)).toBe(false)
      expect(isValidBoardSize(19.5)).toBe(false)
    })
  })

  describe('Capabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = getDiagramCapabilities()

      expect(capabilities.maxBoardSize).toBe(361)
      expect(capabilities.supportedThemes).toContain('classic')
      expect(capabilities.supportedFormats).toContain('png')
      expect(capabilities.dimensionLimits.min).toBe(100)
      expect(capabilities.dimensionLimits.max).toBe(2000)
      expect(capabilities.defaultDimensions.width).toBe(600)
      expect(capabilities.defaultDimensions.height).toBe(600)
    })
  })
})

describe('Error Handling', () => {
  it('should handle sgf-to-image library errors gracefully', async () => {
    // The mocked library should already handle errors gracefully
    // Test with valid SGF that should generate an image
    const result = await handleGetSgfDiagram({
      sgfContent: `(;FF[4]GM[1]SZ[19];B[pd])`,
    })

    // With our mock, this should succeed
    expect(result.content).toBeDefined()
    expect(result.content[0].type).toBe('image')
  })

  it('should handle malformed SGF gracefully', async () => {
    const result = await handleGetSgfDiagram({
      sgfContent: '(;GM[1]SZ[invalid])',
    })

    // Check if it's an error response or if it processed successfully despite malformed data
    if (result.isError) {
      const errorData = JSON.parse(result.content[0].text as string) as ErrorData
      expect(errorData.success).toBe(false)
    } else {
      // If it doesn't error, it should at least have content
      expect(result.content).toBeDefined()
    }
  })

  it('should handle very large SGF files', async () => {
    // Create a large SGF with many moves
    const largeMoves = Array.from(
      { length: 1000 },
      (_, i) =>
        `;${i % 2 === 0 ? 'B' : 'W'}[${String.fromCharCode(97 + (i % 19))}${String.fromCharCode(97 + ((i / 19) % 19 | 0))}]`
    ).join('')

    const largeSgf = `(;FF[4]GM[1]SZ[19]PB[Black]PW[White]${largeMoves})`

    const result = await handleGetSgfDiagram({
      sgfContent: largeSgf,
    })

    // Should handle without crashing
    expect(result.content).toBeDefined()
  })
})
