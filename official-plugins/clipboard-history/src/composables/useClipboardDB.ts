import { ref, onMounted } from 'vue'

export interface ClipboardItem {
  id: string
  content: string
  type: 'text' | 'url' | 'code' | 'image'
  timestamp: number
  pinned: boolean
  favorite: boolean
}

const DB_NAME = 'clipboard-history'
const STORE_NAME = 'items'
const DB_VERSION = 1

class ClipboardDB {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('pinned', 'pinned', { unique: false })
          store.createIndex('content', 'content', { unique: false })
        }
      }
    })
  }

  async getAll(): Promise<ClipboardItem[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async add(item: ClipboardItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.add(item)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async update(item: ClipboardItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(item)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async delete(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async findByContent(content: string): Promise<ClipboardItem | undefined> {
    const items = await this.getAll()
    return items.find((item) => item.content === content)
  }

  async deleteUnpinned(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const items = await this.getAll()
    const unpinned = items.filter((item) => !item.pinned)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      let completed = 0
      unpinned.forEach((item) => {
        const request = store.delete(item.id)
        request.onsuccess = () => {
          completed++
          if (completed === unpinned.length) resolve()
        }
        request.onerror = () => reject(request.error)
      })

      if (unpinned.length === 0) resolve()
    })
  }

  async limitItems(maxCount: number): Promise<void> {
    const items = await this.getAll()
    const pinned = items.filter((item) => item.pinned)
    const unpinned = items
      .filter((item) => !item.pinned)
      .sort((a, b) => b.timestamp - a.timestamp)

    if (unpinned.length > maxCount) {
      const toDelete = unpinned.slice(maxCount)
      for (const item of toDelete) {
        await this.delete(item.id)
      }
    }
  }
}

export function useClipboardDB() {
  const db = new ClipboardDB()
  const items = ref<ClipboardItem[]>([])
  const isLoading = ref(true)

  const loadItems = async () => {
    try {
      items.value = await db.getAll()
      items.value.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return b.timestamp - a.timestamp
      })
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  const addItem = async (item: ClipboardItem) => {
    try {
      const existing = await db.findByContent(item.content)
      if (existing) {
        existing.timestamp = Date.now()
        await db.update(existing)
        await loadItems()
        return
      }

      await db.add(item)
      await db.limitItems(100)
      await loadItems()
    } catch (error) {
      console.error('添加数据失败:', error)
    }
  }

  const updateItem = async (item: ClipboardItem) => {
    try {
      await db.update(item)
      await loadItems()
    } catch (error) {
      console.error('更新数据失败:', error)
    }
  }

  const deleteItem = async (id: string) => {
    try {
      await db.delete(id)
      await loadItems()
    } catch (error) {
      console.error('删除数据失败:', error)
    }
  }

  const clearUnpinned = async () => {
    try {
      await db.deleteUnpinned()
      await loadItems()
    } catch (error) {
      console.error('清空数据失败:', error)
    }
  }

  onMounted(async () => {
    try {
      await db.init()
      await loadItems()
    } catch (error) {
      console.error('初始化数据库失败:', error)
    } finally {
      isLoading.value = false
    }
  })

  return {
    items,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    clearUnpinned,
    loadItems
  }
}
