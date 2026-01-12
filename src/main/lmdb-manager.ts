import { app } from 'electron'
import { join } from 'path'
import { open, RootDatabase, Database } from 'lmdb'

export interface FavoritePlugin {
  pluginId: string
  addedAt: number
}

export interface RecentPlugin {
  pluginId: string
  lastAccessedAt: number
  accessCount: number
}

export interface CachedApp {
  id: string
  name: string
  displayName?: string
  path: string
  icon?: string
  version?: string
  bundleId?: string
  category?: string
  lastModified: number
  cachedAt: number
}

interface FavoriteValue {
  addedAt: number
}

interface RecentValue {
  lastAccessedAt: number
  accessCount: number
}

export class LMDBManager {
  private db: RootDatabase
  private favoritesDb: Database<FavoriteValue, string>
  private recentsDb: Database<RecentValue, string>
  private cachedAppsDb: Database<CachedApp, string>

  constructor() {
    const userDataPath = app.getPath('userData')
    const dbPath = join(userDataPath, 'unihub-lmdb')

    // 打开主数据库
    this.db = open({
      path: dbPath,
      compression: true, // 启用压缩
      cache: true, // 启用缓存
      useVersions: false // 不需要版本控制
    })

    // 创建子数据库
    this.favoritesDb = this.db.openDB({ name: 'favorites' })
    this.recentsDb = this.db.openDB({ name: 'recents' })
    this.cachedAppsDb = this.db.openDB({ name: 'cached_apps' })
  }

  // ========== 收藏相关 ==========

  addFavorite(pluginId: string): void {
    this.favoritesDb.put(pluginId, { addedAt: Date.now() })
  }

  removeFavorite(pluginId: string): void {
    this.favoritesDb.remove(pluginId)
  }

  isFavorite(pluginId: string): boolean {
    return this.favoritesDb.get(pluginId) !== undefined
  }

  getFavorites(): FavoritePlugin[] {
    const favorites: FavoritePlugin[] = []
    for (const { key, value } of this.favoritesDb.getRange()) {
      favorites.push({
        pluginId: key,
        addedAt: value.addedAt
      })
    }
    // 按添加时间倒序排序
    return favorites.sort((a, b) => b.addedAt - a.addedAt)
  }

  // ========== 最近使用相关 ==========

  addRecent(pluginId: string): void {
    const existing = this.recentsDb.get(pluginId)
    const now = Date.now()

    if (existing) {
      this.recentsDb.put(pluginId, {
        lastAccessedAt: now,
        accessCount: existing.accessCount + 1
      })
    } else {
      this.recentsDb.put(pluginId, {
        lastAccessedAt: now,
        accessCount: 1
      })
    }
  }

  getRecents(limit = 10): RecentPlugin[] {
    const recents: RecentPlugin[] = []
    for (const { key, value } of this.recentsDb.getRange()) {
      recents.push({
        pluginId: key,
        lastAccessedAt: value.lastAccessedAt,
        accessCount: value.accessCount
      })
    }
    // 按最后访问时间倒序排序并限制数量
    return recents.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt).slice(0, limit)
  }

  clearRecents(): void {
    this.recentsDb.clearAsync()
  }

  // ========== 应用缓存相关 ==========

  /**
   * 缓存应用信息
   */
  cacheApps(apps: CachedApp[]): void {
    // 使用事务批量写入
    this.cachedAppsDb.transactionSync(() => {
      for (const app of apps) {
        this.cachedAppsDb.put(app.id, app)
      }
    })
  }

  /**
   * 获取缓存的应用
   */
  getCachedApps(): CachedApp[] {
    const apps: CachedApp[] = []
    for (const { value } of this.cachedAppsDb.getRange()) {
      apps.push(value)
    }
    // 按名称排序
    return apps.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * 获取缓存的应用（不包含图标，减少内存占用）
   */
  getCachedAppsWithoutIcons(): Omit<CachedApp, 'icon'>[] {
    const apps: Omit<CachedApp, 'icon'>[] = []
    for (const { value } of this.cachedAppsDb.getRange()) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { icon, ...appWithoutIcon } = value
      apps.push(appWithoutIcon)
    }
    return apps.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * 获取单个应用的图标
   */
  getAppIcon(appPath: string): string | null {
    // 需要遍历查找，因为 key 是 id 不是 path
    for (const { value } of this.cachedAppsDb.getRange()) {
      if (value.path === appPath) {
        return value.icon || null
      }
    }
    return null
  }

  /**
   * 检查应用是否需要更新（基于文件修改时间）
   */
  getAppsNeedingUpdate(pathModifiedMap: Map<string, number>): string[] {
    const needUpdate: string[] = []
    const cachedPaths = new Set<string>()

    for (const { value } of this.cachedAppsDb.getRange()) {
      cachedPaths.add(value.path)
      const currentModified = pathModifiedMap.get(value.path)
      if (currentModified && currentModified > value.lastModified) {
        needUpdate.push(value.path)
      }
    }

    // 检查是否有新应用
    for (const [path] of pathModifiedMap) {
      if (!cachedPaths.has(path)) {
        needUpdate.push(path)
      }
    }

    return needUpdate
  }

  /**
   * 删除不存在的应用缓存
   */
  removeDeletedApps(existingPaths: string[]): void {
    const existingPathsSet = new Set(existingPaths)
    const toRemove: string[] = []

    for (const { key, value } of this.cachedAppsDb.getRange()) {
      if (!existingPathsSet.has(value.path)) {
        toRemove.push(key)
      }
    }

    this.cachedAppsDb.transactionSync(() => {
      for (const id of toRemove) {
        this.cachedAppsDb.remove(id)
      }
    })
  }

  /**
   * 清除应用缓存
   */
  clearAppCache(): void {
    this.cachedAppsDb.clearAsync()
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { appCount: number; oldestCache: number; newestCache: number } {
    let appCount = 0
    let oldestCache = Infinity
    let newestCache = 0

    for (const { value } of this.cachedAppsDb.getRange()) {
      appCount++
      if (value.cachedAt < oldestCache) oldestCache = value.cachedAt
      if (value.cachedAt > newestCache) newestCache = value.cachedAt
    }

    return {
      appCount,
      oldestCache: oldestCache === Infinity ? 0 : oldestCache,
      newestCache
    }
  }

  // ========== 插件存储相关 ==========

  /**
   * 获取插件存储的子数据库
   */
  private getPluginStorageDb(pluginId: string): Database<unknown, string> {
    return this.db.openDB({ name: `plugin_${pluginId}` })
  }

  /**
   * 获取插件存储的值
   */
  getPluginStorage(pluginId: string, key: string): unknown {
    const pluginDb = this.getPluginStorageDb(pluginId)
    return pluginDb.get(key)
  }

  /**
   * 设置插件存储的值
   */
  setPluginStorage(pluginId: string, key: string, value: unknown): void {
    const pluginDb = this.getPluginStorageDb(pluginId)
    pluginDb.put(key, value)
  }

  /**
   * 删除插件存储的值
   */
  deletePluginStorage(pluginId: string, key: string): void {
    const pluginDb = this.getPluginStorageDb(pluginId)
    pluginDb.remove(key)
  }

  /**
   * 获取插件存储的所有键
   */
  getPluginStorageKeys(pluginId: string): string[] {
    const pluginDb = this.getPluginStorageDb(pluginId)
    const keys: string[] = []
    for (const { key } of pluginDb.getRange()) {
      keys.push(key)
    }
    return keys
  }

  /**
   * 清空插件存储
   */
  clearPluginStorage(pluginId: string): void {
    const pluginDb = this.getPluginStorageDb(pluginId)
    pluginDb.clearAsync()
  }

  // ========== 清理相关 ==========

  close(): void {
    this.db.close()
  }
}

export const lmdbManager = new LMDBManager()
