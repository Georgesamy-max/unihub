/**
 * 性能监控工具
 * 用于跟踪和记录应用性能指标
 */

export class PerformanceMonitor {
  private marks = new Map<string, number>()
  private measures = new Map<string, number>()

  /**
   * 标记性能时间点
   */
  mark(name: string): void {
    this.marks.set(name, performance.now())
  }

  /**
   * 测量两个时间点之间的耗时
   */
  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark)
    if (!start) {
      console.warn(`[Performance] 未找到起始标记: ${startMark}`)
      return 0
    }

    const end = endMark ? this.marks.get(endMark) : performance.now()
    if (endMark && !end) {
      console.warn(`[Performance] 未找到结束标记: ${endMark}`)
      return 0
    }

    const duration = (end as number) - start
    this.measures.set(name, duration)
    return duration
  }

  /**
   * 记录并输出性能指标
   */
  log(name: string, startMark: string, endMark?: string): void {
    const duration = this.measure(name, startMark, endMark)
    console.log(`⚡ [Performance] ${name}: ${duration.toFixed(2)}ms`)
  }

  /**
   * 获取所有性能指标
   */
  getAll(): Record<string, number> {
    return Object.fromEntries(this.measures)
  }

  /**
   * 清除所有标记和测量
   */
  clear(): void {
    this.marks.clear()
    this.measures.clear()
  }
}

export const performanceMonitor = new PerformanceMonitor()
