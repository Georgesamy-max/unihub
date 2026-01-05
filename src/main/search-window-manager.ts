import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { createLogger } from '../shared/logger'
import { webContentsViewManager } from './webcontents-view-manager'

const logger = createLogger('search-window')

/**
 * 搜索窗口管理器
 * 管理独立的 Spotlight 风格搜索窗口
 */
export class SearchWindowManager {
  private searchWindow: BrowserWindow | null = null
  private mainWindow: BrowserWindow | null = null
  private shouldShowMainWindow = false // 标志：是否应该显示主窗口
  private mainWindowWasFocused = false // 记录主窗口在打开搜索前是否聚焦
  private isClosingByUser = false // 标志：是否是用户主动关闭（ESC 键）

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /**
   * 创建搜索窗口
   */
  createSearchWindow(): void {
    if (this.searchWindow && !this.searchWindow.isDestroyed()) {
      this.showSearchWindow()
      return
    }

    // 获取主显示器
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    // 窗口尺寸 - 紧凑型，类似 Raycast/Spotlight
    const windowWidth = 640
    const windowHeight = 480

    // 居中位置，稍微靠上
    const x = Math.floor((width - windowWidth) / 2)
    const y = Math.floor(height * 0.2) // 距离顶部 20%

    this.searchWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      minWidth: windowWidth,
      minHeight: windowHeight,
      maxWidth: windowWidth,
      maxHeight: windowHeight,
      x,
      y,
      show: false,
      frame: false,
      transparent: false,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: true,
      backgroundColor: '#ffffff',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    // 加载搜索页面
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.searchWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/search`)
    } else {
      this.searchWindow.loadFile(join(__dirname, '../renderer/index.html'), {
        hash: '/search'
      })
    }

    this.searchWindow.on('ready-to-show', () => {
      this.searchWindow?.show()
      this.searchWindow?.focus()

      // 等待窗口完全显示后再通知渲染进程聚焦搜索框
      setTimeout(() => {
        if (this.searchWindow && !this.searchWindow.isDestroyed()) {
          this.searchWindow.webContents.send('focus-search-input')
          logger.info('窗口创建完成，已发送聚焦事件')
        }
      }, 150)
    })

    // 失去焦点时隐藏（但需要防止激活主窗口）
    this.searchWindow.on('blur', () => {
      // 延迟执行，让其他操作有机会设置标志
      setTimeout(() => {
        if (this.searchWindow && !this.searchWindow.isDestroyed()) {
          this.hideSearchWindow()
        }
      }, 100)
    })

    logger.info('搜索窗口已创建')
  }

  /**
   * 显示搜索窗口
   */
  showSearchWindow(): void {
    // 检查主窗口是否已销毁
    if (this.mainWindow && this.mainWindow.isDestroyed()) {
      logger.error('主窗口已销毁，无法显示搜索窗口')
      return
    }

    // 记录主窗口在打开搜索前是否聚焦和可见
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      const wasFocused = this.mainWindow.isFocused()
      const wasVisible = this.mainWindow.isVisible()
      logger.info({ wasFocused, wasVisible }, '记录主窗口状态')
      this.mainWindowWasFocused = wasFocused

      // 如果主窗口可见但不聚焦，先隐藏它，防止搜索窗口关闭时被激活
      if (wasVisible && !wasFocused) {
        this.mainWindow.hide()
        logger.info('主窗口可见但未聚焦，先隐藏')
      }
    }

    // 临时隐藏当前活动的插件视图
    webContentsViewManager.hideCurrentPluginForSearch()

    if (!this.searchWindow || this.searchWindow.isDestroyed()) {
      this.createSearchWindow()
      return
    }

    // 显示并聚焦窗口
    this.searchWindow.show()
    this.searchWindow.focus()

    // 等待窗口完全显示后再通知渲染进程聚焦搜索框
    setTimeout(() => {
      if (this.searchWindow && !this.searchWindow.isDestroyed()) {
        this.searchWindow.webContents.send('focus-search-input')
        logger.info('已发送聚焦事件到渲染进程')
      }
    }, 100)

    logger.info('👁搜索窗口已显示')
  }

  /**
   * 隐藏搜索窗口
   */
  hideSearchWindow(): void {
    if (this.searchWindow && !this.searchWindow.isDestroyed()) {
      logger.info(
        {
          wasFocused: this.mainWindowWasFocused,
          shouldShow: this.shouldShowMainWindow,
          isClosingByUser: this.isClosingByUser
        },
        '隐藏搜索窗口前的状态'
      )

      this.searchWindow.hide()
      logger.info('搜索窗口已隐藏')

      // 只有在需要打开插件时才显示主窗口
      if (this.shouldShowMainWindow && this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.show()
        this.mainWindow.focus()
        logger.info('👁显示主窗口（打开插件）')
      } else if (this.mainWindowWasFocused && this.mainWindow && !this.mainWindow.isDestroyed()) {
        // 如果主窗口之前是聚焦的，恢复显示
        this.mainWindow.show()
        this.mainWindow.focus()
        logger.info('👁恢复主窗口（之前是聚焦状态）')
        // 恢复被隐藏的插件视图
        webContentsViewManager.restorePluginAfterSearch()
      } else {
        // 其他情况：不显示主窗口，但仍然恢复插件视图（如果主窗口可见）
        if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.isVisible()) {
          webContentsViewManager.restorePluginAfterSearch()
        }
        logger.info('不显示主窗口')
      }

      // 重置标志
      this.shouldShowMainWindow = false
      this.mainWindowWasFocused = false
      this.isClosingByUser = false
    }
  }

  /**
   * 打开插件并隐藏搜索窗口
   */
  openPluginAndHide(pluginId: string): void {
    // 检查主窗口是否已销毁
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      logger.error('主窗口已销毁，无法打开插件')
      this.hideSearchWindow()
      return
    }

    // 设置标志：需要显示主窗口
    this.shouldShowMainWindow = true

    // 隐藏搜索窗口（会自动显示主窗口）
    this.hideSearchWindow()

    // 等待窗口显示后再通知打开插件
    setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('open-plugin-from-search', pluginId)
      }
    }, 100)

    logger.info({ pluginId }, '从搜索窗口打开插件')
  }

  /**
   * 销毁搜索窗口
   */
  destroy(): void {
    if (this.searchWindow && !this.searchWindow.isDestroyed()) {
      this.searchWindow.destroy()
      this.searchWindow = null
      logger.info('🗑搜索窗口已销毁')
    }
  }
}

export const searchWindowManager = new SearchWindowManager()
