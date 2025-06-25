/**
 * Type declarations for @sabaki/sgf
 */

declare module '@sabaki/sgf' {
  export type Property = string[]

  export interface GameTree {
    data?: { [key: string]: Property }
    children?: GameTree[]
  }

  export type NodeArray = GameTree[]

  export function parseOne(sgfContent: string): NodeArray
  export function parse(sgfContent: string): NodeArray[]
}
