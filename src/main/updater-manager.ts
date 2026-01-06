import { BrowserWindow, dialog, shell } from 'electron'
import { createLogger } from '../shared/logger'
import { app } from 'electron'

const logger = createLogger('updater')

export interface VersionInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
  downloadUrl: string
  isNewer: boolean
}

export class UpdaterManager {
  private mainWindow: BrowserWindow | null = null
  private isChecking = false
  private currentVersion: string

  constructor() {
    this.currentVersion = app.getVersion()
    logger.info(`当前版本: ${this.currentVersion}`)
  }

  /**
   * 设置主窗口引用
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /**
   * 检查版本更新（通过 GitHub API）
   */
  async checkForUpdates(silent = false): Promise<void> {
    if (this.isChecking) {
      logger.warn('版本检查已在进行中，跳过本次检查')
      return
    }

    this.isChecking = true

    try {
      logger.info({ silent }, '开始检查版本更新')
      this.sendToRenderer('checking-for-update')

      // 请求 GitHub API 获取最新 Release
      const response = await fetch('https://api.github.com/repos/t8y2/unihub/releases/latest')

      if (!response.ok) {
        throw new Error(`GitHub API 请求失败: ${response.status}`)
      }

      const releaseData = await response.json()
      const latestVersion = releaseData.tag_name.replace(/^v/, '') // 移除 v 前缀
      const isNewer = this.compareVersions(latestVersion, this.currentVersion) > 0

      const versionInfo: VersionInfo = {
        version: latestVersion,
        releaseDate: releaseData.published_at,
        releaseNotes: releaseData.body,
        downloadUrl: releaseData.html_url, // GitHub Release 页面
        isNewer
      }

      this.isChecking = false

      if (isNewer) {
        logger.info({ latestVersion, currentVersion: this.currentVersion }, '发现新版本')
        this.sendToRenderer('update-available', versionInfo)

        if (!silent) {
          this.showUpdateDialog(versionInfo)
        }
      } else {
        logger.info('当前已是最新版本')
        this.sendToRenderer('update-not-available', versionInfo)

        if (!silent) {
          this.showNoUpdateDialog()
        }
      }
    } catch (error) {
      this.isChecking = false
      const errorMessage = error instanceof Error ? error.message : '检查更新失败'
      logger.error({ err: error }, '版本检查失败')

      if (!silent) {
        this.sendToRenderer('update-error', { message: errorMessage })
        this.showErrorDialog(errorMessage)
      }
    }
  }

  /**
   * 比较版本号
   * @param version1 版本1
   * @param version2 版本2
   * @returns 1: version1 > version2, 0: 相等, -1: version1 < version2
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number)
    const v2Parts = version2.split('.').map(Number)
    const maxLength = Math.max(v1Parts.length, v2Parts.length)

    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0
      const v2Part = v2Parts[i] || 0

      if (v1Part > v2Part) return 1
      if (v1Part < v2Part) return -1
    }

    return 0
  }

  /**
   * 显示更新对话框
   */
  private showUpdateDialog(versionInfo: VersionInfo): void {
    if (!this.mainWindow) return

    const releaseNotes = versionInfo.releaseNotes
      ? `\n\n更新内容:\n${versionInfo.releaseNotes.substring(0, 200)}${versionInfo.releaseNotes.length > 200 ? '...' : ''}`
      : ''

    dialog
      .showMessageBox(this.mainWindow, {
        type: 'info',
        title: '发现新版本',
        message: `新版本 ${versionInfo.version} 可用`,
        detail: `当前版本: ${this.currentVersion}\n最新版本: ${versionInfo.version}${releaseNotes}\n\n点击"下载"将打开浏览器前往下载页面。`,
        buttons: ['下载', '稍后', '不再提醒'],
        defaultId: 0,
        cancelId: 1
      })
      .then((result) => {
        if (result.response === 0) {
          // 打开下载页面
          shell.openExternal(versionInfo.downloadUrl)
        } else if (result.response === 2) {
          // 用户选择不再提醒，可以在这里保存设置
          logger.info('用户选择不再提醒更新')
        }
      })
  }

  /**
   * 显示无更新对话框
   */
  private showNoUpdateDialog(): void {
    if (!this.mainWindow) return

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '检查更新',
      message: '当前已是最新版本',
      detail: `当前版本: ${this.currentVersion}`,
      buttons: ['确定']
    })
  }

  /**
   * 显示错误对话框
   */
  private showErrorDialog(message: string): void {
    if (!this.mainWindow) return

    dialog.showMessageBox(this.mainWindow, {
      type: 'error',
      title: '检查更新失败',
      message: '无法检查更新',
      detail: message,
      buttons: ['确定']
    })
  }

  /**
   * 获取当前状态
   */
  getUpdateStatus(): { isChecking: boolean } {
    return {
      isChecking: this.isChecking
    }
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
