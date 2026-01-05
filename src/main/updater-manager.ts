import { autoUpdater } from 'electron-updater'
import { BrowserWindow, dialog } from 'electron'
import { createLogger } from '../shared/logger'
import { is } from '@electron-toolkit/utils'

const logger = createLogger('updater')

export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
}

export interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export class UpdaterManager {
  private mainWindow: BrowserWindow | null = null
  private isChecking = false
  private isDownloading = false

  constructor() {
    this.setupAutoUpdater()
  }

  /**
   * 设置主窗口引用
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /**
   * 配置 autoUpdater
   */
  private setupAutoUpdater(): void {
    // 开发环境配置
    if (is.dev) {
      autoUpdater.updateConfigPath = 'dev-app-update.yml'
      autoUpdater.forceDevUpdateConfig = true
    }

    // 自动下载更新（静默下载）
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    // 监听更新事件
    this.registerUpdateEvents()

    logger.info('UpdaterManager 已初始化')
  }

  /**
   * 注册更新事件监听器
   */
  private registerUpdateEvents(): void {
    // 检查更新出错
    autoUpdater.on('error', (error) => {
      logger.error({ err: error }, '更新检查失败')
      this.isChecking = false
      this.isDownloading = false
      this.sendToRenderer('update-error', { message: error.message })
    })

    // 检查更新中
    autoUpdater.on('checking-for-update', () => {
      logger.info('正在检查更新...')
      this.isChecking = true
      this.sendToRenderer('checking-for-update')
    })

    // 发现新版本
    autoUpdater.on('update-available', (info) => {
      logger.info({ version: info.version }, '发现新版本')
      this.isChecking = false
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      })
    })

    // 当前已是最新版本
    autoUpdater.on('update-not-available', (info) => {
      logger.info({ version: info.version }, '当前已是最新版本')
      this.isChecking = false
      this.sendToRenderer('update-not-available', {
        version: info.version
      })
    })

    // 下载进度
    autoUpdater.on('download-progress', (progress) => {
      const percent = Math.round(progress.percent)
      logger.info({ percent }, `下载进度: ${percent}%`)
      this.sendToRenderer('download-progress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      })
    })

    // 下载完成
    autoUpdater.on('update-downloaded', (info) => {
      logger.info({ version: info.version }, '更新下载完成')
      this.isDownloading = false
      this.sendToRenderer('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      })

      // 显示安装提示对话框
      this.showInstallDialog(info.version)
    })
  }

  /**
   * 检查更新
   */
  async checkForUpdates(silent = false): Promise<void> {
    if (this.isChecking) {
      logger.warn('更新检查已在进行中')
      return
    }

    try {
      logger.info({ silent }, '开始检查更新')
      await autoUpdater.checkForUpdates()
    } catch (error) {
      logger.error({ err: error }, '检查更新失败')
      if (!silent) {
        this.sendToRenderer('update-error', {
          message: error instanceof Error ? error.message : '检查更新失败'
        })
      }
    }
  }

  /**
   * 下载更新
   */
  async downloadUpdate(): Promise<void> {
    if (this.isDownloading) {
      logger.warn('更新下载已在进行中')
      return
    }

    try {
      logger.info('开始下载更新')
      this.isDownloading = true
      await autoUpdater.downloadUpdate()
    } catch (error) {
      logger.error({ err: error }, '下载更新失败')
      this.isDownloading = false
      this.sendToRenderer('update-error', {
        message: error instanceof Error ? error.message : '下载更新失败'
      })
    }
  }

  /**
   * 安装更新并重启
   */
  quitAndInstall(): void {
    logger.info('准备安装更新并重启应用')
    autoUpdater.quitAndInstall(false, true)
  }

  /**
   * 显示安装对话框
   */
  private showInstallDialog(version: string): void {
    if (!this.mainWindow) return

    dialog
      .showMessageBox(this.mainWindow, {
        type: 'info',
        title: '更新已就绪',
        message: `新版本 ${version} 已下载完成`,
        detail: '是否立即重启应用以安装更新？',
        buttons: ['立即重启', '稍后'],
        defaultId: 0,
        cancelId: 1
      })
      .then((result) => {
        if (result.response === 0) {
          this.quitAndInstall()
        }
      })
  }

  /**
   * 发送消息到渲染进程
   */
  private sendToRenderer(channel: string, data?: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(`updater:${channel}`, data)
    }
  }
}

// 导出单例
export const updaterManager = new UpdaterManager()
