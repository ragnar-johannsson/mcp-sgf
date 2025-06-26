/**
 * SGF diagram rendering utilities using sgf-to-image
 */

import { SgfError, SgfErrorType, type DiagramParameters, type DiagramResult } from '../types/sgf.js'

// Type definitions for sgf-to-image (since it may not have proper TypeScript definitions)
interface SgfToImageOptions {
  sgf: string
  moveNumber?: number
  width?: number
  height?: number
  coordLabels?: boolean
  moveNumbers?: boolean
  theme?: string
}

// Type for the sgf-to-image library function
type SgfToImageFunction = (options: SgfToImageOptions) => Promise<Buffer>

// Types for potential module shapes
interface ESMModule {
  default?: unknown
}

interface NamedExportsModule {
  convertSgfToImage?: unknown
  renderDiagram?: unknown
}

interface ConvertSgfToImageParams {
  sgf: string
  size: string
  format: string
  move?: number
  theme?: string
  showCoordinates?: boolean
}

interface ConvertSgfToImageResult {
  imageBuffer?: Buffer
}

interface RenderDiagramOptions {
  size: string
  format: string
  showCoordinates: boolean
}

// Dynamic import for sgf-to-image since it might be CommonJS
let sgfToImage: SgfToImageFunction | null = null

/**
 * Type guard to check if value is a function
 */
function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function'
}

/**
 * Type guard to check if value is an object with properties
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Type guard to check if value is a Buffer
 */
function isBuffer(value: unknown): value is Buffer {
  return (
    value instanceof Buffer ||
    (isObject(value) && 'length' in value && typeof value.length === 'number')
  )
}

/**
 * Initialize sgf-to-image library
 */
async function initializeSgfToImage(): Promise<SgfToImageFunction> {
  if (!sgfToImage) {
    try {
      // Dynamically import the library (works for both ESM & CJS)
      const imported: unknown = await import('sgf-to-image')

      // Handle different module export patterns
      let candidateFunction: unknown = null

      // Try to extract function from various module shapes
      if (isObject(imported)) {
        const esmModule = imported as ESMModule & NamedExportsModule

        // Check for nested default (bundlers): { default: { default: fn } }
        if (isObject(esmModule.default) && 'default' in esmModule.default) {
          candidateFunction = (esmModule.default as ESMModule).default
        }
        // Check for ESM default export: { default: fn }
        else if (esmModule.default) {
          candidateFunction = esmModule.default
        }
        // Check for direct function (CJS): fn
        else if (isFunction(imported)) {
          candidateFunction = imported
        }
      }

      // If we found a direct function, use it
      if (isFunction(candidateFunction)) {
        sgfToImage = candidateFunction as SgfToImageFunction
      }
      // Otherwise, try named exports
      else if (isObject(imported)) {
        const namedModule = imported as NamedExportsModule

        if (isFunction(namedModule.convertSgfToImage)) {
          // Wrap convertSgfToImage to match our SgfToImageFunction signature
          sgfToImage = async (options: SgfToImageOptions): Promise<Buffer> => {
            // use size preset to avoid node-canvas binary requirement
            const sizePreset = (options.width ?? options.height ?? 600) <= 480 ? 'small' : 'medium'

            const params: ConvertSgfToImageParams = {
              sgf: options.sgf,
              size: sizePreset,
              format: 'png',
            }

            if (options.moveNumber !== undefined) {
              // convertSgfToImage expects 0-based index
              params.move = options.moveNumber
            }

            if (options.theme) params.theme = options.theme
            if (options.coordLabels !== undefined) params.showCoordinates = options.coordLabels

            const convertFn = namedModule.convertSgfToImage as (
              params: ConvertSgfToImageParams
            ) => Promise<ConvertSgfToImageResult | Buffer>
            const result = await convertFn(params)

            // Handle both Buffer and {imageBuffer: Buffer} return types
            if (isBuffer(result)) {
              return result
            } else if (
              isObject(result) &&
              'imageBuffer' in result &&
              isBuffer(result.imageBuffer)
            ) {
              return result.imageBuffer
            } else {
              throw new Error('convertSgfToImage did not return a valid image buffer')
            }
          }
        } else if (isFunction(namedModule.renderDiagram)) {
          sgfToImage = async (options: SgfToImageOptions): Promise<Buffer> => {
            // use size preset to avoid node-canvas binary requirement
            const sizePreset = (options.width ?? options.height ?? 600) <= 480 ? 'small' : 'medium'

            const renderOptions: RenderDiagramOptions = {
              size: sizePreset,
              format: 'png',
              showCoordinates: options.coordLabels !== false,
            }

            const renderFn = namedModule.renderDiagram as (
              sgf: string,
              moveNumber: number | undefined,
              options: RenderDiagramOptions
            ) => Promise<Buffer>
            const result = await renderFn(options.sgf, options.moveNumber, renderOptions)

            if (isBuffer(result)) {
              return result
            } else {
              throw new Error('renderDiagram did not return a valid Buffer')
            }
          }
        } else {
          throw new Error('sgf-to-image module did not export a compatible function')
        }
      } else {
        throw new Error('sgf-to-image module has unsupported export structure')
      }
    } catch (error) {
      throw new SgfError(
        SgfErrorType.PARSING_ERROR,
        'Failed to load sgf-to-image library',
        error instanceof Error ? { message: error.message } : error
      )
    }
  }
  return sgfToImage
}

/**
 * Validate diagram parameters
 * @param params - Diagram generation parameters
 * @param totalMoves - Total moves in the SGF
 * @param boardSize - Board size from SGF
 */
function validateDiagramParameters(
  params: DiagramParameters,
  totalMoves: number,
  boardSize: number
): void {
  // Validate board size limits
  const maxBoardSize = params.maxBoardSize ?? 361
  if (boardSize > maxBoardSize) {
    throw new SgfError(
      SgfErrorType.INVALID_PARAMETERS,
      `Board size ${boardSize} exceeds maximum supported size of ${maxBoardSize}`
    )
  }

  // Validate move numbers
  if (params.moveNumber !== undefined) {
    if (params.moveNumber < 1 || params.moveNumber > totalMoves) {
      throw new SgfError(
        SgfErrorType.INVALID_PARAMETERS,
        `Move number ${params.moveNumber} is out of range (1-${totalMoves})`
      )
    }
  }

  if (params.startMove !== undefined && params.endMove !== undefined) {
    if (params.startMove < 1 || params.startMove > totalMoves) {
      throw new SgfError(
        SgfErrorType.INVALID_PARAMETERS,
        `Start move ${params.startMove} is out of range (1-${totalMoves})`
      )
    }
    if (params.endMove < 1 || params.endMove > totalMoves) {
      throw new SgfError(
        SgfErrorType.INVALID_PARAMETERS,
        `End move ${params.endMove} is out of range (1-${totalMoves})`
      )
    }
    if (params.startMove > params.endMove) {
      throw new SgfError(
        SgfErrorType.INVALID_PARAMETERS,
        `Start move ${params.startMove} cannot be greater than end move ${params.endMove}`
      )
    }
  }

  // Validate dimensions
  if (params.width !== undefined && (params.width < 100 || params.width > 2000)) {
    throw new SgfError(
      SgfErrorType.INVALID_PARAMETERS,
      `Width ${params.width} is out of range (100-2000)`
    )
  }

  if (params.height !== undefined && (params.height < 100 || params.height > 2000)) {
    throw new SgfError(
      SgfErrorType.INVALID_PARAMETERS,
      `Height ${params.height} is out of range (100-2000)`
    )
  }
}

/**
 * Generate diagram from SGF content
 * @param sgfContent - Raw SGF content
 * @param params - Diagram generation parameters
 * @param totalMoves - Total moves in the SGF (for validation)
 * @param boardSize - Board size from SGF (for validation)
 * @returns Promise resolving to diagram result with image data
 */
export async function generateDiagram(
  sgfContent: string,
  params: DiagramParameters = {},
  totalMoves: number,
  boardSize: number
): Promise<DiagramResult> {
  try {
    // Validate parameters
    validateDiagramParameters(params, totalMoves, boardSize)

    // Initialize the library
    const renderer = await initializeSgfToImage()

    // Set up default parameters
    const options: SgfToImageOptions = {
      sgf: sgfContent,
      width: params.width ?? 600,
      height: params.height ?? 600,
      coordLabels: params.coordLabels !== false, // Default to true
      moveNumbers: params.moveNumbers !== false, // Default to true
      theme: params.theme ?? 'classic',
    }

    // sgf-to-image expects 0-based move index. Convert user-supplied 1-based values.
    if (params.moveNumber !== undefined) {
      options.moveNumber = params.moveNumber - 1
    } else if (params.endMove !== undefined) {
      // Use end move if range is specified (convert to 0-based)
      options.moveNumber = params.endMove - 1
    }

    // Generate the image
    const imageBuffer = await renderer(options)

    // Convert to base64
    let imageData: string
    let mimeType: string

    if (params.format === 'svg') {
      // For SVG, convert buffer to string
      imageData = imageBuffer.toString('base64')
      mimeType = 'image/svg+xml'
    } else {
      // Default to PNG
      imageData = imageBuffer.toString('base64')
      mimeType = 'image/png'
    }

    // Calculate moves covered
    let movesCovered = 0
    if (params.moveNumber !== undefined) {
      movesCovered = params.moveNumber
    } else if (params.startMove !== undefined && params.endMove !== undefined) {
      movesCovered = params.endMove - params.startMove + 1
    } else {
      movesCovered = totalMoves
    }

    return {
      imageData,
      mimeType,
      width: options.width ?? 600,
      height: options.height ?? 600,
      movesCovered,
      boardSize,
    }
  } catch (error) {
    if (error instanceof SgfError) {
      throw error
    }

    throw new SgfError(
      SgfErrorType.PARSING_ERROR,
      `Failed to generate diagram: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error
    )
  }
}

/**
 * Get supported themes for diagram generation
 * @returns Array of supported theme names
 */
export function getSupportedThemes(): string[] {
  return ['classic', 'modern', 'minimal']
}

/**
 * Get supported output formats
 * @returns Array of supported format names
 */
export function getSupportedFormats(): string[] {
  return ['png', 'svg']
}

/**
 * Validate board size against maximum limits
 * @param boardSize - Board size to validate
 * @param maxSize - Maximum allowed size (default: 361)
 * @returns True if valid, false otherwise
 */
export function isValidBoardSize(boardSize: number, maxSize: number = 361): boolean {
  return boardSize > 0 && boardSize <= maxSize && Number.isInteger(boardSize)
}
