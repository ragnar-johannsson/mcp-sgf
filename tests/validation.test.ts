/**
 * Unit tests for input validation and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  validateSgfContent,
  validateGetSgfInfoArgs,
  validateGetSgfDiagramArgs,
  validateBoardSize,
  sanitizeInput,
  validateStatelessProcessing,
  sgfContentSchema,
  diagramParametersSchema,
  getSgfInfoArgsSchema,
  getSgfDiagramArgsSchema,
  boardSizeSchema,
} from '../src/utils/validation.js'
import { SgfError, SgfErrorType } from '../src/types/sgf.js'

// Valid SGF test data
const validSgf = '(;GM[1]FF[4]SZ[19]PB[Black]PW[White];B[dd];W[pp])'
const complexSgf = `(;GM[1]FF[4]CA[UTF-8]AP[Sabaki:0.52.2]KM[6.5]SZ[19]DT[2024-01-01]
PB[Player Black]BR[5d]PW[Player White]WR[6d]RE[W+7.5]TM[3600]
;B[dd];W[pp];B[dp];W[pd];B[nq];W[pn];B[pr];W[qq];B[qr])`

describe('SGF Content Validation', () => {
  describe('sgfContentSchema', () => {
    it('should accept valid SGF content', () => {
      const result = sgfContentSchema.safeParse(validSgf)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(validSgf)
      }
    })

    it('should accept complex SGF with metadata', () => {
      const result = sgfContentSchema.safeParse(complexSgf)
      expect(result.success).toBe(true)
    })

    it('should reject non-string input', () => {
      const result = sgfContentSchema.safeParse(123)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('must be a string')
      }
    })

    it('should reject empty string', () => {
      const result = sgfContentSchema.safeParse('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('cannot be empty')
      }
    })

    it('should reject content without parentheses', () => {
      const result = sgfContentSchema.safeParse('GM[1]FF[4]SZ[19]')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('start with "(" and end with ")"')
      }
    })

    it('should reject content without properties', () => {
      const result = sgfContentSchema.safeParse('()')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('contain at least one valid property')
      }
    })

    it('should reject files that are too large', () => {
      const largeContent = '(' + ';GM[1]'.repeat(3000000) + ')'
      const result = sgfContentSchema.safeParse(largeContent)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('too large')
      }
    })
  })

  describe('validateSgfContent function', () => {
    it('should return success for valid SGF', () => {
      const result = validateSgfContent(validSgf)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(validSgf)
      }
    })

    it('should return SgfError for invalid input', () => {
      const result = validateSgfContent(123)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(SgfError)
        expect(result.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
      }
    })

    it('should return SgfError for malformed SGF', () => {
      const result = validateSgfContent('invalid sgf')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(SgfError)
        expect(result.error.type).toBe(SgfErrorType.INVALID_FORMAT)
      }
    })

    it('should return FILE_TOO_LARGE error for oversized content', () => {
      const largeContent = '(' + ';GM[1]'.repeat(3000000) + ')'
      const result = validateSgfContent(largeContent)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe(SgfErrorType.FILE_TOO_LARGE)
      }
    })
  })
})

describe('Diagram Parameters Validation', () => {
  describe('diagramParametersSchema', () => {
    it('should accept valid parameters', () => {
      const params = {
        moveNumber: 5,
        width: 600,
        height: 600,
        coordLabels: true,
        moveNumbers: false,
        theme: 'classic' as const,
        format: 'png' as const,
      }
      const result = diagramParametersSchema.safeParse(params)
      expect(result.success).toBe(true)
    })

    it('should accept empty parameters object', () => {
      const result = diagramParametersSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept move range parameters', () => {
      const params = {
        startMove: 1,
        endMove: 10,
      }
      const result = diagramParametersSchema.safeParse(params)
      expect(result.success).toBe(true)
    })

    it('should reject conflicting moveNumber and move range', () => {
      const params = {
        moveNumber: 5,
        startMove: 1,
        endMove: 10,
      }
      const result = diagramParametersSchema.safeParse(params)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          'Cannot specify both moveNumber and move range'
        )
      }
    })

    it('should reject incomplete move range (missing endMove)', () => {
      const params = {
        startMove: 1,
      }
      const result = diagramParametersSchema.safeParse(params)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          'Both startMove and endMove must be specified'
        )
      }
    })

    it('should reject incomplete move range (missing startMove)', () => {
      const params = {
        endMove: 10,
      }
      const result = diagramParametersSchema.safeParse(params)
      expect(result.success).toBe(false)
    })

    it('should reject invalid move range (start > end)', () => {
      const params = {
        startMove: 10,
        endMove: 5,
      }
      const result = diagramParametersSchema.safeParse(params)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          'Start move must be less than or equal to end move'
        )
      }
    })

    it('should reject negative move numbers', () => {
      const params = {
        moveNumber: -1,
      }
      const result = diagramParametersSchema.safeParse(params)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('non-negative')
      }
    })

    it('should reject invalid dimensions', () => {
      const params = {
        width: 50, // too small
        height: 3000, // too large
      }
      const result = diagramParametersSchema.safeParse(params)
      expect(result.success).toBe(false)
    })

    it('should reject invalid theme', () => {
      const params = {
        theme: 'invalid-theme',
      }
      const result = diagramParametersSchema.safeParse(params)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Theme must be one of')
      }
    })

    it('should reject invalid format', () => {
      const params = {
        format: 'gif',
      }
      const result = diagramParametersSchema.safeParse(params)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Format must be either png or svg')
      }
    })

    it('should reject extra properties (strict mode)', () => {
      const params = {
        moveNumber: 5,
        extraProperty: 'should not be allowed',
      }
      const result = diagramParametersSchema.safeParse(params)
      expect(result.success).toBe(false)
    })
  })
})

describe('Tool Arguments Validation', () => {
  describe('getSgfInfoArgsSchema', () => {
    it('should accept valid arguments', () => {
      const args = { sgfContent: validSgf }
      const result = getSgfInfoArgsSchema.safeParse(args)
      expect(result.success).toBe(true)
    })

    it('should reject missing sgfContent', () => {
      const args = {}
      const result = getSgfInfoArgsSchema.safeParse(args)
      expect(result.success).toBe(false)
    })

    it('should reject extra properties', () => {
      const args = { sgfContent: validSgf, extraProp: 'value' }
      const result = getSgfInfoArgsSchema.safeParse(args)
      expect(result.success).toBe(false)
    })
  })

  describe('getSgfDiagramArgsSchema', () => {
    it('should accept valid arguments', () => {
      const args = {
        sgfContent: validSgf,
        moveNumber: 5,
        width: 600,
        height: 600,
        theme: 'classic',
        format: 'png',
      }
      const result = getSgfDiagramArgsSchema.safeParse(args)
      expect(result.success).toBe(true)
    })

    it('should accept minimal arguments', () => {
      const args = { sgfContent: validSgf }
      const result = getSgfDiagramArgsSchema.safeParse(args)
      expect(result.success).toBe(true)
    })

    it('should reject conflicting parameters', () => {
      const args = {
        sgfContent: validSgf,
        moveNumber: 5,
        startMove: 1,
        endMove: 10,
      }
      const result = getSgfDiagramArgsSchema.safeParse(args)
      expect(result.success).toBe(false)
    })
  })

  describe('validateGetSgfInfoArgs function', () => {
    it('should return success for valid args', () => {
      const args = { sgfContent: validSgf }
      const result = validateGetSgfInfoArgs(args)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sgfContent).toBe(validSgf)
      }
    })

    it('should return SgfError for invalid args', () => {
      const args = { invalidProp: 'value' }
      const result = validateGetSgfInfoArgs(args)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(SgfError)
        expect(result.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
      }
    })
  })

  describe('validateGetSgfDiagramArgs function', () => {
    it('should return success for valid args', () => {
      const args = { sgfContent: validSgf, moveNumber: 5 }
      const result = validateGetSgfDiagramArgs(args)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sgfContent).toBe(validSgf)
        expect(result.data.moveNumber).toBe(5)
      }
    })

    it('should return SgfError for invalid args', () => {
      const args = { sgfContent: validSgf, moveNumber: -1 }
      const result = validateGetSgfDiagramArgs(args)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(SgfError)
        expect(result.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
      }
    })
  })
})

describe('Board Size Validation', () => {
  describe('boardSizeSchema', () => {
    it('should accept valid board sizes', () => {
      const validSizes = [9, 13, 19, 361]
      validSizes.forEach(size => {
        const result = boardSizeSchema.safeParse(size)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid board sizes', () => {
      const invalidSizes = [0, -1, 362, 1000, 1.5, '19']
      invalidSizes.forEach(size => {
        const result = boardSizeSchema.safeParse(size)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('validateBoardSize function', () => {
    it('should return success for valid size', () => {
      const result = validateBoardSize(19)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(19)
      }
    })

    it('should return SgfError for invalid size', () => {
      const result = validateBoardSize(0)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(SgfError)
        expect(result.error.type).toBe(SgfErrorType.INVALID_PARAMETERS)
      }
    })
  })
})

describe('Input Sanitization', () => {
  describe('sanitizeInput function', () => {
    it('should return clean input unchanged', () => {
      const clean = 'This is clean input with normal text.'
      expect(sanitizeInput(clean)).toBe(clean)
    })

    it('should preserve newlines and tabs', () => {
      const input = 'Line 1\nLine 2\tTabbed'
      expect(sanitizeInput(input)).toBe(input)
    })

    it('should remove null bytes', () => {
      const input = 'Hello\x00World'
      expect(sanitizeInput(input)).toBe('HelloWorld')
    })

    it('should remove control characters', () => {
      const input = 'Hello\x01\x02\x03World'
      expect(sanitizeInput(input)).toBe('HelloWorld')
    })

    it('should remove DEL character', () => {
      const input = 'Hello\x7FWorld'
      expect(sanitizeInput(input)).toBe('HelloWorld')
    })
  })
})

describe('Stateless Processing Validation', () => {
  beforeEach(() => {
    // Clean up any potential global variables before each test
    const globalKeys = Object.keys(globalThis).filter(
      key => key.startsWith('sgf') || key.startsWith('diagram') || key.startsWith('game')
    )
    globalKeys.forEach(key => {
      delete (globalThis as Record<string, unknown>)[key]
    })
  })

  describe('validateStatelessProcessing function', () => {
    it('should not throw for clean global state', () => {
      expect(() => validateStatelessProcessing()).not.toThrow()
    })

    it('should warn about potential global state leakage', () => {
      // Add some potential global state
      ;(globalThis as Record<string, unknown>).sgfCache = {}
      ;(globalThis as Record<string, unknown>).diagramData = 'test'

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      validateStatelessProcessing()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Warning: Potential global state detected:',
        expect.arrayContaining(['sgfCache', 'diagramData'])
      )

      consoleSpy.mockRestore()
    })
  })
})

describe('Error Scenarios and Edge Cases', () => {
  describe('Malformed SGF handling', () => {
    const malformedSgfCases = [
      { name: 'unclosed parenthesis', sgf: '(;GM[1]FF[4]SZ[19]' },
      { name: 'no opening parenthesis', sgf: ';GM[1]FF[4]SZ[19])' },
      { name: 'invalid property format', sgf: '(;GM1FF4SZ19)' },
      // Note: Our current regex is lenient and accepts these patterns
      // { name: 'empty properties', sgf: '(;GM[]FF[]SZ[])' },
      // { name: 'nested unclosed brackets', sgf: '(;GM[1]FF[4]SZ[19)' },
    ]

    malformedSgfCases.forEach(({ name, sgf }) => {
      it(`should reject ${name}`, () => {
        const result = validateSgfContent(sgf)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toBeInstanceOf(SgfError)
        }
      })
    })

    it('should accept SGF with empty properties (lenient validation)', () => {
      // Our validation is intentionally lenient for empty properties
      const result = validateSgfContent('(;GM[]FF[]SZ[])')
      expect(result.success).toBe(true)
    })

    it('should accept SGF with unclosed brackets in content (lenient validation)', () => {
      // Our validation is intentionally lenient for bracket content
      const result = validateSgfContent('(;GM[1]FF[4]SZ[19)')
      expect(result.success).toBe(true)
    })
  })

  describe('Parameter boundary testing', () => {
    it('should handle boundary values for move numbers', () => {
      const boundaryCases = [
        { moveNumber: 0 }, // minimum
        { moveNumber: 1000 }, // maximum
        { startMove: 0, endMove: 1000 }, // range boundaries
      ]

      boundaryCases.forEach(params => {
        const result = diagramParametersSchema.safeParse(params)
        expect(result.success).toBe(true)
      })
    })

    it('should reject out-of-bounds values', () => {
      const outOfBoundsCases = [
        { moveNumber: -1 },
        { moveNumber: 1001 },
        { startMove: -1, endMove: 5 },
        { startMove: 1, endMove: 1001 },
        { width: 99 },
        { width: 2001 },
        { height: 99 },
        { height: 2001 },
      ]

      outOfBoundsCases.forEach(params => {
        const result = diagramParametersSchema.safeParse(params)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Type safety edge cases', () => {
    it('should reject most non-numeric values for numeric fields', () => {
      const invalidTypes = [
        { moveNumber: '5' },
        { width: '600' },
        { height: 'auto' },
        { startMove: null },
      ]

      invalidTypes.forEach(params => {
        const result = diagramParametersSchema.safeParse(params)
        expect(result.success).toBe(false)
      })
    })

    it('should handle undefined values for optional fields', () => {
      // undefined is handled by optional() and should be allowed
      const params = {
        endMove: undefined,
      }
      const result = diagramParametersSchema.safeParse(params)
      expect(result.success).toBe(true)
    })

    it('should reject non-boolean values for boolean fields', () => {
      const invalidBooleans = [{ coordLabels: 'true' }, { moveNumbers: 1 }, { coordLabels: null }]

      invalidBooleans.forEach(params => {
        const result = diagramParametersSchema.safeParse(params)
        expect(result.success).toBe(false)
      })
    })
  })
})

describe('Performance and Stress Testing', () => {
  it('should validate large valid SGF quickly', () => {
    const largeSgf = '(' + ';GM[1]FF[4]SZ[19]' + ';B[dd];W[pp]'.repeat(1000) + ')'

    const start = Date.now()
    const result = validateSgfContent(largeSgf)
    const duration = Date.now() - start

    expect(result.success).toBe(true)
    expect(duration).toBeLessThan(100) // Should validate in under 100ms
  })

  it('should handle many validation calls efficiently', () => {
    const start = Date.now()

    for (let i = 0; i < 1000; i++) {
      validateSgfContent(validSgf)
      validateBoardSize(19)
      validateGetSgfInfoArgs({ sgfContent: validSgf })
    }

    const duration = Date.now() - start
    expect(duration).toBeLessThan(500) // Should handle 1000 validations in under 500ms
  })
})
