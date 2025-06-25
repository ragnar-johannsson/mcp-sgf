/**
 * Input validation utilities using Zod for SGF content and parameters
 */

import { z } from 'zod'
import { SgfError, SgfErrorType } from '../types/sgf.js'

/**
 * Schema for validating SGF content
 */
export const sgfContentSchema = z
  .string({
    required_error: 'SGF content is required',
    invalid_type_error: 'SGF content must be a string',
  })
  .min(1, 'SGF content cannot be empty')
  .max(10 * 1024 * 1024, 'SGF file too large (max 10MB)')
  .refine(
    content => {
      const trimmed = content.trim()
      return trimmed.startsWith('(') && trimmed.endsWith(')')
    },
    {
      message: 'SGF content must start with "(" and end with ")"',
    }
  )
  .refine(
    content => {
      // Basic SGF structure validation - must contain at least one property
      const propertyPattern = /;[A-Z]{1,2}\[.*?\]/
      return propertyPattern.test(content)
    },
    {
      message: 'SGF content must contain at least one valid property',
    }
  )

/**
 * Schema for validating diagram parameters
 */
export const diagramParametersSchema = z
  .object({
    moveNumber: z
      .number()
      .int('Move number must be an integer')
      .min(0, 'Move number must be non-negative')
      .max(1000, 'Move number too large (max 1000)')
      .optional(),
    startMove: z
      .number()
      .int('Start move must be an integer')
      .min(0, 'Start move must be non-negative')
      .max(1000, 'Start move too large (max 1000)')
      .optional(),
    endMove: z
      .number()
      .int('End move must be an integer')
      .min(0, 'End move must be non-negative')
      .max(1000, 'End move too large (max 1000)')
      .optional(),
    width: z
      .number()
      .int('Width must be an integer')
      .min(100, 'Width must be at least 100 pixels')
      .max(2000, 'Width must be at most 2000 pixels')
      .optional(),
    height: z
      .number()
      .int('Height must be an integer')
      .min(100, 'Height must be at least 100 pixels')
      .max(2000, 'Height must be at most 2000 pixels')
      .optional(),
    coordLabels: z.boolean().optional(),
    moveNumbers: z.boolean().optional(),
    theme: z
      .enum(['classic', 'modern', 'minimal'], {
        errorMap: () => ({ message: 'Theme must be one of: classic, modern, minimal' }),
      })
      .optional(),
    format: z
      .enum(['png', 'svg'], {
        errorMap: () => ({ message: 'Format must be either png or svg' }),
      })
      .optional(),
    maxBoardSize: z
      .number()
      .int('Max board size must be an integer')
      .min(1, 'Max board size must be at least 1')
      .max(361, 'Max board size cannot exceed 361')
      .optional(),
  })
  .strict() // Don't allow extra properties
  .refine(
    data => {
      // Validate move range logic
      if (data.startMove !== undefined && data.endMove !== undefined) {
        return data.startMove <= data.endMove
      }
      return true
    },
    {
      message: 'Start move must be less than or equal to end move',
      path: ['startMove'],
    }
  )
  .refine(
    data => {
      // Validate move number vs move range exclusivity
      if (
        data.moveNumber !== undefined &&
        (data.startMove !== undefined || data.endMove !== undefined)
      ) {
        return false
      }
      return true
    },
    {
      message: 'Cannot specify both moveNumber and move range (startMove/endMove)',
      path: ['moveNumber'],
    }
  )
  .refine(
    data => {
      // Validate incomplete move range
      if (data.startMove !== undefined && data.endMove === undefined) {
        return false
      }
      if (data.endMove !== undefined && data.startMove === undefined) {
        return false
      }
      return true
    },
    {
      message: 'Both startMove and endMove must be specified for move range',
      path: ['startMove'],
    }
  )

/**
 * Schema for validating get-sgf-info tool arguments
 */
export const getSgfInfoArgsSchema = z
  .object({
    sgfContent: sgfContentSchema,
  })
  .strict()

/**
 * Schema for validating get-sgf-diagram tool arguments
 */
export const getSgfDiagramArgsSchema = z
  .object({
    sgfContent: sgfContentSchema,
    moveNumber: z
      .number()
      .int('Move number must be an integer')
      .min(0, 'Move number must be non-negative')
      .max(1000, 'Move number too large (max 1000)')
      .optional(),
    startMove: z
      .number()
      .int('Start move must be an integer')
      .min(0, 'Start move must be non-negative')
      .max(1000, 'Start move too large (max 1000)')
      .optional(),
    endMove: z
      .number()
      .int('End move must be an integer')
      .min(0, 'End move must be non-negative')
      .max(1000, 'End move too large (max 1000)')
      .optional(),
    width: z
      .number()
      .int('Width must be an integer')
      .min(100, 'Width must be at least 100 pixels')
      .max(2000, 'Width must be at most 2000 pixels')
      .optional(),
    height: z
      .number()
      .int('Height must be an integer')
      .min(100, 'Height must be at least 100 pixels')
      .max(2000, 'Height must be at most 2000 pixels')
      .optional(),
    coordLabels: z.boolean().optional(),
    moveNumbers: z.boolean().optional(),
    theme: z
      .enum(['classic', 'modern', 'minimal'], {
        errorMap: () => ({ message: 'Theme must be one of: classic, modern, minimal' }),
      })
      .optional(),
    format: z
      .enum(['png', 'svg'], {
        errorMap: () => ({ message: 'Format must be either png or svg' }),
      })
      .optional(),
  })
  .strict()
  .refine(
    data => {
      // Validate move range logic
      if (data.startMove !== undefined && data.endMove !== undefined) {
        return data.startMove <= data.endMove
      }
      return true
    },
    {
      message: 'Start move must be less than or equal to end move',
      path: ['startMove'],
    }
  )
  .refine(
    data => {
      // Validate move number vs move range exclusivity
      if (
        data.moveNumber !== undefined &&
        (data.startMove !== undefined || data.endMove !== undefined)
      ) {
        return false
      }
      return true
    },
    {
      message: 'Cannot specify both moveNumber and move range (startMove/endMove)',
      path: ['moveNumber'],
    }
  )
  .refine(
    data => {
      // Validate incomplete move range
      if (data.startMove !== undefined && data.endMove === undefined) {
        return false
      }
      if (data.endMove !== undefined && data.startMove === undefined) {
        return false
      }
      return true
    },
    {
      message: 'Both startMove and endMove must be specified for move range',
      path: ['startMove'],
    }
  )

/**
 * Schema for validating board size constraints
 */
export const boardSizeSchema = z
  .number()
  .int('Board size must be an integer')
  .min(1, 'Board size must be at least 1')
  .max(361, 'Board size cannot exceed 361 (maximum supported)')

/**
 * Validate SGF content and return detailed error information
 * @param content - Raw SGF content to validate
 * @returns Validation result with detailed error information
 */
export function validateSgfContent(
  content: unknown
): { success: true; data: string } | { success: false; error: SgfError } {
  const result = sgfContentSchema.safeParse(content)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const firstError = result.error.issues[0]
  let errorType: SgfErrorType

  if (firstError?.code === 'invalid_type') {
    errorType = SgfErrorType.INVALID_PARAMETERS
  } else if (firstError?.code === 'too_small' && firstError.message.includes('empty')) {
    errorType = SgfErrorType.INVALID_PARAMETERS
  } else if (firstError?.message.includes('too large')) {
    errorType = SgfErrorType.FILE_TOO_LARGE
  } else {
    errorType = SgfErrorType.INVALID_FORMAT
  }

  return {
    success: false,
    error: new SgfError(errorType, firstError?.message ?? 'Invalid SGF content', {
      zodError: result.error,
      issues: result.error.issues,
    }),
  }
}

/**
 * Validate get-sgf-info tool arguments
 * @param args - Arguments to validate
 * @returns Validation result with detailed error information
 */
export function validateGetSgfInfoArgs(
  args: unknown
): { success: true; data: { sgfContent: string } } | { success: false; error: SgfError } {
  // First validate the argument structure
  if (!args || typeof args !== 'object') {
    return {
      success: false,
      error: new SgfError(SgfErrorType.INVALID_PARAMETERS, 'Arguments must be an object', { args }),
    }
  }

  const typedArgs = args as Record<string, unknown>

  // Check if sgfContent is present
  if (!('sgfContent' in typedArgs)) {
    return {
      success: false,
      error: new SgfError(
        SgfErrorType.INVALID_PARAMETERS,
        'Missing required parameter: sgfContent',
        { args }
      ),
    }
  }

  // Validate sgfContent using the detailed validation function
  const sgfValidation = validateSgfContent(typedArgs.sgfContent)
  if (!sgfValidation.success) {
    return { success: false, error: sgfValidation.error }
  }

  // Check for extra properties
  const allowedKeys = ['sgfContent']
  const extraKeys = Object.keys(typedArgs).filter(key => !allowedKeys.includes(key))
  if (extraKeys.length > 0) {
    return {
      success: false,
      error: new SgfError(
        SgfErrorType.INVALID_PARAMETERS,
        `Unexpected properties: ${extraKeys.join(', ')}`,
        { extraKeys }
      ),
    }
  }

  return { success: true, data: { sgfContent: sgfValidation.data } }
}

/**
 * Validate get-sgf-diagram tool arguments
 * @param args - Arguments to validate
 * @returns Validation result with detailed error information
 */
export function validateGetSgfDiagramArgs(
  args: unknown
):
  | { success: true; data: z.infer<typeof getSgfDiagramArgsSchema> }
  | { success: false; error: SgfError } {
  const result = getSgfDiagramArgsSchema.safeParse(args)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const firstError = result.error.issues[0]
  return {
    success: false,
    error: new SgfError(
      SgfErrorType.INVALID_PARAMETERS,
      firstError?.message ?? 'Invalid arguments',
      {
        zodError: result.error,
        issues: result.error.issues,
        path: firstError?.path,
      }
    ),
  }
}

/**
 * Validate board size constraints
 * @param size - Board size to validate
 * @returns Validation result
 */
export function validateBoardSize(
  size: unknown
): { success: true; data: number } | { success: false; error: SgfError } {
  const result = boardSizeSchema.safeParse(size)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const firstError = result.error.issues[0]
  return {
    success: false,
    error: new SgfError(
      SgfErrorType.INVALID_PARAMETERS,
      firstError?.message ?? 'Invalid board size',
      {
        zodError: result.error,
        issues: result.error.issues,
      }
    ),
  }
}

/**
 * Sanitize user input by removing potentially dangerous content
 * @param input - Raw input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  // Remove null bytes and control characters except newlines and tabs
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
}

/**
 * Validate that the process remains stateless by checking for global state
 * This is a development utility to ensure no data leakage between requests
 */
export function validateStatelessProcessing(): void {
  // Check for potential global state leakage
  const globalKeys = Object.keys(globalThis).filter(
    key => key.startsWith('sgf') || key.startsWith('diagram') || key.startsWith('game')
  )

  if (globalKeys.length > 0) {
    console.warn('Warning: Potential global state detected:', globalKeys)
  }
}
