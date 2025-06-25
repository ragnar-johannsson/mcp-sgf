/**
 * SGF (Smart Game Format) TypeScript type definitions
 */

/**
 * Complete SGF Game Information tags as per SGF specification
 * Covers all standard game information properties
 */
export interface SgfGameInfo {
  [key: string]: string | number | undefined

  // Game identification
  GN?: string | undefined // Game name
  GC?: string | undefined // Game comment
  EV?: string | undefined // Event
  RO?: string | undefined // Round
  DT?: string | undefined // Date
  PC?: string | undefined // Place
  SO?: string | undefined // Source
  US?: string | undefined // User (who entered the game)
  AN?: string | undefined // Annotator
  CP?: string | undefined // Copyright

  // Players
  PB?: string | undefined // Black player name
  PW?: string | undefined // White player name
  BR?: string | undefined // Black rank
  WR?: string | undefined // White rank
  BT?: string | undefined // Black team
  WT?: string | undefined // White team

  // Game rules and setup
  RU?: string | undefined // Rules used
  SZ?: number | undefined // Board size
  HA?: number | undefined // Handicap
  KM?: number | undefined // Komi
  TM?: number | undefined // Time limit
  OT?: string | undefined // Overtime system

  // Game result
  RE?: string | undefined // Result

  // Application and file format
  AP?: string | undefined // Application used to create SGF
  CA?: string | undefined // Character set
  FF?: number | undefined // File format (SGF version)
  GM?: number | undefined // Game type (1 = Go)
  ST?: number | undefined // Style of showing variations
  VW?: string | undefined // View part of board
}

/**
 * Parameters for diagram generation
 */
export interface DiagramParameters {
  moveNumber?: number // Specific move to show (0-based)
  startMove?: number // Start of move range
  endMove?: number // End of move range
  width?: number // Image width in pixels (default: 600)
  height?: number // Image height in pixels (default: 600)
  coordLabels?: boolean // Show coordinate labels (default: true)
  moveNumbers?: boolean // Show move numbers (default: true)
  theme?: 'classic' | 'modern' | 'minimal' // Visual theme (default: 'classic')
  format?: 'png' | 'svg' // Output format (default: 'png')
  maxBoardSize?: number // Maximum supported board size (default: 361)
}

/**
 * Diagram generation result
 */
export interface DiagramResult {
  imageData: string // Base64 encoded image data
  mimeType: string // MIME type (image/png or image/svg+xml)
  width: number // Actual image width
  height: number // Actual image height
  movesCovered: number // Number of moves shown in diagram
  boardSize: number // Board size used
}

/**
 * SGF parsing result containing game information
 */
export interface SgfParseResult {
  gameInfo: SgfGameInfo
  totalMoves: number
  boardSize: number
  hasValidStructure: boolean
  warnings?: string[] | undefined
}

/**
 * Error types for SGF processing
 */
export enum SgfErrorType {
  INVALID_FORMAT = 'INVALID_FORMAT',
  UNSUPPORTED_GAME = 'UNSUPPORTED_GAME',
  PARSING_ERROR = 'PARSING_ERROR',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
}

/**
 * Custom error class for SGF operations
 */
export class SgfError extends Error {
  constructor(
    public type: SgfErrorType,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'SgfError'
  }
}
