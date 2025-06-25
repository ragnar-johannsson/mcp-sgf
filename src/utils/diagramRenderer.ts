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

// Dynamic import for sgf-to-image since it might be CommonJS
let sgfToImage: SgfToImageFunction | null = null

/**
 * Initialize sgf-to-image library
 */
async function initializeSgfToImage(): Promise<SgfToImageFunction> {
  if (!sgfToImage) {
    try {
      // Try dynamic import for ES modules
      const module = await import('sgf-to-image')
      sgfToImage =
        (module as { default?: SgfToImageFunction }).default ??
        (module as unknown as SgfToImageFunction)
    } catch (error) {
      // Fallback for CommonJS modules
      try {
        const fallbackModule = await import('sgf-to-image')
        sgfToImage = fallbackModule as unknown as SgfToImageFunction
      } catch (fallbackError) {
        throw new SgfError(SgfErrorType.PARSING_ERROR, 'Failed to load sgf-to-image library', {
          originalError: error,
          fallbackError,
        })
      }
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
    if (params.moveNumber < 0 || params.moveNumber > totalMoves) {
      throw new SgfError(
        SgfErrorType.INVALID_PARAMETERS,
        `Move number ${params.moveNumber} is out of range (0-${totalMoves})`
      )
    }
  }

  if (params.startMove !== undefined && params.endMove !== undefined) {
    if (params.startMove < 0 || params.startMove > totalMoves) {
      throw new SgfError(
        SgfErrorType.INVALID_PARAMETERS,
        `Start move ${params.startMove} is out of range (0-${totalMoves})`
      )
    }
    if (params.endMove < 0 || params.endMove > totalMoves) {
      throw new SgfError(
        SgfErrorType.INVALID_PARAMETERS,
        `End move ${params.endMove} is out of range (0-${totalMoves})`
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

    // Set move number if specified
    if (params.moveNumber !== undefined) {
      options.moveNumber = params.moveNumber
    } else if (params.endMove !== undefined) {
      // Use end move if range is specified
      options.moveNumber = params.endMove
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
      movesCovered = params.moveNumber + 1
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
