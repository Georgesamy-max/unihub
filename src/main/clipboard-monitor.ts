import { clipboard, BrowserWindow } from 'electron'

export interface ClipboardChangeEvent {
  content: string
  timestamp: number
}

export class ClipboardMonitor {
  private lastContent: string = ''
  private interval: NodeJS.Timeout | null = null
  private windows: Set<BrowserWindow> = new Set()
  private isRunning: boolean = false

  /**
   * 启动剪贴板监控
   */
  start(): void {
    if (this.isRunning) {
      console.log('[ClipboardMonitor] 监控已在运行')
      return
    }

    console.log('[ClipboardMonitor] 启动剪贴板监控')

    // 初始化当前剪贴板内容
    try {
      this.lastContent = clipboard.readText()
    } catch (error) {
      console.error('[ClipboardMonitor] 初始化失败:', error)
      this.lastContent = ''
    }

    // 每500ms检查一次剪贴板变化
    this.interval = setInterval(() => {
      this.checkClipboard()
    }, 500)

    this.isRunning = true
  }

  /**
   * 停止剪贴板监控
   */
  stop(): void {
    if (!this.isRunning) return

    console.log('[ClipboardMonitor] 停止剪贴板监控')

    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }

    this.isRunning = false
  }

  /**
   * 检查剪贴板内容
   */
  private checkClipboard(): void {
    try {
      const currentContent = clipboard.readText()

      // 检测到内容变化
      if (currentContent && currentContent !== this.lastContent) {
        this.lastContent = currentContent

        const event: ClipboardChangeEvent = {
          content: currentContent,
          timestamp: Date.now()
        }

        // 通知所有订阅的窗口
        this.notifyWindows(event)
      }
    } catch (error) {
      console.error('[ClipboardMonitor] 读取剪贴板失败:', error)
    }
  }

  /**
   * 通知所有订阅的窗口
   */
  private notifyWindows(event: ClipboardChangeEvent): void {
    const destroyedWindows: BrowserWindow[] = []

    this.windows.forEach((win) => {
      if (win.isDestroyed()) {
        destroyedWindows.push(win)
      } else {
        try {
          win.webContents.send('clipboard-changed', event)
        } catch (error) {
          console.error('[ClipboardMonitor] 发送事件失败:', error)
        }
      }
    })

    // 清理已销毁的窗口
    destroyedWindows.forEach((win) => {
      this.windows.delete(win)
    })

    // 如果没有订阅者了，停止监控
    if (this.windows.size === 0) {
      this.stop()
    }
  }

  /**
   * 订阅剪贴板变化事件
   */
  subscribe(window: BrowserWindow): void {
    if (!window || window.isDestroyed()) {
      console.warn('[ClipboardMonitor] 无效的窗口')
      return
    }

    this.windows.add(window)
    console.log(`[ClipboardMonitor] 窗口已订阅，当前订阅数: ${this.windows.size}`)

    // 有订阅者时自动启动监控
    if (!this.isRunning) {
      this.start()
    }

    // 窗口关闭时自动取消订阅
    window.once('closed', () => {
      this.unsubscribe(window)
    })
  }

  /**
   * 取消订阅剪贴板变化事件
   */
  unsubscribe(window: BrowserWindow): void {
    this.windows.delete(window)
    console.log(`[ClipboardMonitor] 窗口已取消订阅，当前订阅数: ${this.windows.size}`)

    // 没有订阅者时自动停止监控
    if (this.windows.size === 0 && this.isRunning) {
      this.stop()
    }
  }

  /**
   * 获取当前订阅数
   */
  getSubscriberCount(): number {
    return this.windows.size
  }

  /**
   * 获取监控状态
   */
  isMonitoring(): boolean {
    return this.isRunning
  }
}

// 导出单例
export const clipboardMonitor = new ClipboardMonitor()
