import { describe, it, expect } from 'vitest'
import { handleGetSgfInfo } from '../src/tools/getSgfInfo.js'

describe('Performance Tests', () => {
  // Helper function to measure execution time
  function measureTime<T>(fn: () => T): { result: T; duration: number } {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    return { result, duration: end - start }
  }

  // Sample SGF content for testing (realistic game)
  const smallSgf = '(;FF[4]GM[1]SZ[19]PB[Black]PW[White];B[pd];W[dp];B[pq])'

  const mediumSgf = `(;FF[4]GM[1]SZ[19]PB[Black Player]PW[White Player]BR[5d]WR[6d]
DT[2024-01-01]KM[6.5]HA[0]RE[W+2.5]
;B[pd];W[dp];B[pq];W[dd];B[fq];W[cn];B[kq];W[qf];B[nc];W[rd];B[qc];W[qi];B[qk]
;W[oi];B[ok];W[fc];B[cj];W[cl];B[cf];W[fd];B[bd];W[cc];B[ci];W[en];B[fo];W[kp]
;B[lq];W[jp];B[iq];W[mo];B[mq];W[no];B[oq];W[qm];B[pm];W[pl];B[pk];W[ql];B[ol]
;W[qn];B[po];W[pn];B[on];W[om];B[nm];W[oo];B[pl];W[qo];B[pp];W[rm];B[mm];W[km])`

  // Generate SGF content of specific size
  const generateSgf = (moves: number): string => {
    let sgf = '(;FF[4]GM[1]SZ[19]PB[Black Player]PW[White Player]'
    for (let i = 0; i < moves; i++) {
      const color = i % 2 === 0 ? 'B' : 'W'
      const x = String.fromCharCode(97 + (i % 19))
      const y = String.fromCharCode(97 + ((i + 3) % 19))
      sgf += `;${color}[${x}${y}]`
    }
    sgf += ')'
    return sgf
  }

  describe('getSgfInfo Performance', () => {
    it('should process small SGF files (≤100 kB) in ≤200ms', () => {
      const { duration, result } = measureTime(() => handleGetSgfInfo({ sgfContent: smallSgf }))

      expect(duration).toBeLessThan(200)
      expect(result.content[0]?.text).toContain('"success": true')
    })

    it('should process medium SGF files efficiently', () => {
      const { duration, result } = measureTime(() => handleGetSgfInfo({ sgfContent: mediumSgf }))

      expect(duration).toBeLessThan(200)
      expect(result.content[0]?.text).toContain('"success": true')
    })

    it('should process large SGF files within reasonable time', () => {
      const largeSgf = generateSgf(200) // 200 moves

      const { duration, result } = measureTime(() => handleGetSgfInfo({ sgfContent: largeSgf }))

      // Large files should still be reasonably fast
      expect(duration).toBeLessThan(500)
      expect(result.content[0]?.text).toContain('"success": true')
    })

    it('should handle multiple consecutive requests efficiently', () => {
      const durations: number[] = []

      // Run multiple requests and track timing
      for (let i = 0; i < 10; i++) {
        const { duration } = measureTime(() => handleGetSgfInfo({ sgfContent: smallSgf }))
        durations.push(duration)
      }

      // Each request should be fast
      durations.forEach(duration => {
        expect(duration).toBeLessThan(200)
      })

      // Average should also be good
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
      expect(avgDuration).toBeLessThan(100)
    })
  })

  describe('Memory and Resource Management', () => {
    it('should not leak memory with repeated operations', () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Perform many operations
      for (let i = 0; i < 50; i++) {
        handleGetSgfInfo({ sgfContent: mediumSgf })
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    it('should handle error cases without performance degradation', () => {
      const invalidSgf = 'invalid sgf content'
      const durations: number[] = []

      for (let i = 0; i < 10; i++) {
        const { duration } = measureTime(() => {
          const result = handleGetSgfInfo({ sgfContent: invalidSgf })
          return result
        })
        durations.push(duration)
      }

      // Error handling should still be fast
      durations.forEach(duration => {
        expect(duration).toBeLessThan(100)
      })
    })
  })

  describe('File Size Performance Benchmarks', () => {
    const fileSizes = [
      { name: '1KB equivalent', moves: 20 },
      { name: '5KB equivalent', moves: 100 },
      { name: '10KB equivalent', moves: 200 },
    ]

    it.each(fileSizes)('should handle $name files efficiently', ({ moves }) => {
      const content = generateSgf(moves)

      const { duration } = measureTime(() => handleGetSgfInfo({ sgfContent: content }))

      // All file sizes should be processed quickly
      expect(duration).toBeLessThan(200)
    })
  })

  describe('Stress Testing', () => {
    it('should maintain performance under concurrent-like load', () => {
      const startTime = performance.now()

      // Run 30 operations in sequence (simulating load)
      for (let i = 0; i < 30; i++) {
        handleGetSgfInfo({ sgfContent: smallSgf })
      }

      const totalTime = performance.now() - startTime
      const avgTimePerOperation = totalTime / 30

      // Average time per operation should be reasonable
      expect(avgTimePerOperation).toBeLessThan(50)
      expect(totalTime).toBeLessThan(1500) // Total under 1.5 seconds
    })
  })
})
