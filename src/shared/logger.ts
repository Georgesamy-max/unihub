/**
 * 统一的日志工具 - 使用 pino
 */
import pino from 'pino'

// 创建主日志实例
export const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
            singleLine: false
          }
        }
      : undefined
})

// 标记日志系统是否正在关闭
let isClosing = false

// 创建带模块名的子日志实例，并包装以处理关闭时的错误
export function createLogger(module: string): pino.Logger {
  const childLogger = logger.child({ module })

  // 包装所有日志方法以捕获错误
  const safeLogger = new Proxy(childLogger, {
    get(target, prop) {
      const original = target[prop as keyof typeof target]

      // 如果是日志方法，包装它
      if (
        typeof original === 'function' &&
        ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(prop as string)
      ) {
        return function (...args: unknown[]) {
          // 如果正在关闭，忽略日志调用
          if (isClosing) {
            return
          }

          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (original as any).apply(target, args)
          } catch {
            // 静默忽略日志错误，避免崩溃
            if (process.env.NODE_ENV === 'development') {
              console.error('Logger error occurred')
            }
          }
        }
      }

      return original
    }
  })

  return safeLogger as pino.Logger
}

// 优雅关闭日志系统
export async function closeLogger(): Promise<void> {
  isClosing = true

  return new Promise((resolve) => {
    // 给日志系统一点时间来刷新缓冲区
    setTimeout(() => {
      try {
        // @ts-ignore flush方法存在但类型定义中没有
        if (logger.flush) {
          // @ts-ignore flush方法存在但类型定义中没有
          logger.flush()
        }
      } catch {
        // 忽略关闭错误
      }
      resolve()
    }, 100)
  })
}
