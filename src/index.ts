#!/usr/bin/env node

/**
 * MCP SGF Server - Entry point for MCP-compatible API server
 * Provides tools for parsing SGF (Smart Game Format) files
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

// Import tools
import { getSgfInfoTool, handleGetSgfInfo } from './tools/getSgfInfo.js'
import { getSgfDiagramTool, handleGetSgfDiagram } from './tools/getSgfDiagram.js'

/**
 * Create and configure MCP server
 */
function createServer(): Server {
  const server = new Server(
    {
      name: 'mcp-sgf',
      version: '0.1.0',
    },
    {
      // Expose available tools in the initial capabilities handshake so clients
      // can discover them without sending an explicit tools/list request.
      capabilities: {
        tools: {
          'get-sgf-info': getSgfInfoTool,
          'get-sgf-diagram': getSgfDiagramTool,
        },
      },
    }
  )

  // Register list_tools handler
  server.setRequestHandler(ListToolsRequestSchema, () =>
    Promise.resolve({
      tools: [getSgfInfoTool, getSgfDiagramTool],
    })
  )

  // Register call_tool handler
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params

    switch (name) {
      case 'get-sgf-info':
        return handleGetSgfInfo(args as { sgfContent: string })

      case 'get-sgf-diagram':
        return await handleGetSgfDiagram(
          args as {
            sgfContent: string
            moveNumber?: number
            startMove?: number
            endMove?: number
            width?: number
            height?: number
            coordLabels?: boolean
            moveNumbers?: boolean
            theme?: 'classic' | 'modern' | 'minimal'
            format?: 'png' | 'svg'
          }
        )

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  })

  return server
}

/**
 * Main function to start the MCP server
 */
async function main(): Promise<void> {
  const server = createServer()
  const transport = new StdioServerTransport()

  await server.connect(transport)

  // Keep the process running
  process.on('SIGINT', () => {
    void server.close().then(() => {
      process.exit(0)
    })
  })
}

// Start server if this file is run directly
// Check if this module is being executed directly (works with both node and npx)
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` || process.argv[1].includes('mcp-sgf')

if (isMainModule) {
  void main().catch((error: unknown) => {
    console.error('Server error:', error)
    process.exit(1)
  })
}
