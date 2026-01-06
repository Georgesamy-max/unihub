<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useClipboardDB } from '@/composables/useClipboardDB'
import type { ClipboardItem } from '@/composables/useClipboardDB'
import {
  Clipboard,
  Copy,
  Trash2,
  Search,
  X,
  Clock,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Code,
  Pin,
  PinOff,
  RefreshCw
} from 'lucide-vue-next'

const { items, isLoading, addItem: addItemToDB, updateItem, deleteItem: deleteItemFromDB, clearUnpinned } = useClipboardDB()
const searchQuery = ref('')
const selectedType = ref<'all' | 'text' | 'url' | 'code' | 'image'>('all')
const showPinnedOnly = ref(false)
const lastClipboardContent = ref('')
const isRefreshing = ref(false)

const filteredItems = computed(() => {
  let filtered = items.value

  if (showPinnedOnly.value) {
    filtered = filtered.filter((item) => item.pinned)
  }

  if (selectedType.value !== 'all') {
    filtered = filtered.filter((item) => item.type === selectedType.value)
  }

  if (searchQuery.value) {
    filtered = filtered.filter((item) =>
      item.content.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  return filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.timestamp - a.timestamp
  })
})

const stats = computed(() => {
  return {
    total: items.value.length,
    pinned: items.value.filter((i) => i.pinned).length,
    text: items.value.filter((i) => i.type === 'text').length,
    url: items.value.filter((i) => i.type === 'url').length,
    code: items.value.filter((i) => i.type === 'code').length
  }
})

const detectType = (content: string): ClipboardItem['type'] => {
  const urlPattern = /^https?:\/\/.+/i
  const codePattern = /^(function|const|let|var|class|import|export|<\?php|def |public |private )/
  
  if (urlPattern.test(content.trim())) return 'url'
  if (codePattern.test(content.trim()) || content.includes('```')) return 'code'
  return 'text'
}

const addItem = async (content: string) => {
  const newItem: ClipboardItem = {
    id: Date.now().toString(),
    content,
    type: detectType(content),
    timestamp: Date.now(),
    pinned: false,
    favorite: false
  }

  await addItemToDB(newItem)
}

const copyToClipboard = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    lastClipboardContent.value = content
  } catch (err) {
    console.error('复制失败:', err)
  }
}

const deleteItem = async (id: string) => {
  await deleteItemFromDB(id)
}

const togglePin = async (id: string) => {
  const item = items.value.find((item) => item.id === id)
  if (item) {
    item.pinned = !item.pinned
    await updateItem(item)
  }
}

const clearAll = async () => {
  if (confirm('确定要清空所有历史记录吗？（已固定的项目将保留）')) {
    await clearUnpinned()
  }
}

const manualRefresh = async () => {
  isRefreshing.value = true
  try {
    const text = await window.unihub.clipboard.readText()
    if (text && text.trim().length > 0) {
      lastClipboardContent.value = text
      addItem(text)
    }
  } catch (error) {
    console.error('读取剪贴板失败:', error)
  }
  setTimeout(() => {
    isRefreshing.value = false
  }, 500)
}

const formatTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

const truncateText = (text: string, maxLength: number = 200): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const getTypeIcon = (type: ClipboardItem['type']) => {
  switch (type) {
    case 'url': return LinkIcon
    case 'code': return Code
    case 'image': return ImageIcon
    default: return FileText
  }
}

const handlePaste = async (e: ClipboardEvent) => {
  const text = e.clipboardData?.getData('text')
  if (text && text.trim().length > 0) {
    lastClipboardContent.value = text
    addItem(text)
  }
}

onMounted(async () => {
  // 订阅剪贴板变化（主进程实时监控）
  try {
    await window.unihub.clipboard.subscribe()
    
    // 监听剪贴板变化事件
    const unsubscribe = window.unihub.clipboard.onChange((data) => {
      if (data.content && data.content !== lastClipboardContent.value) {
        lastClipboardContent.value = data.content
        addItem(data.content)
      }
    })
    
    // 组件卸载时取消订阅
    onUnmounted(() => {
      unsubscribe()
      window.unihub.clipboard.unsubscribe()
    })
  } catch (error) {
    console.error('订阅剪贴板失败:', error)
  }
  
  // 监听粘贴事件（作为备用）
  window.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
  window.removeEventListener('paste', handlePaste)
})
</script>

<template>
  <div class="flex h-full bg-background">
    <!-- 侧边栏 -->
    <div class="w-52 bg-card border-r border-border flex flex-col flex-shrink-0">
      <div class="h-14 px-4 border-b border-border flex items-center flex-shrink-0">
        <h1 class="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clipboard :size="20" class="text-primary" />
          剪贴板历史
        </h1>
      </div>

      <div class="flex-1 overflow-y-auto p-3">
        <div class="space-y-0.5">
          <button
            :class="[
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
              selectedType === 'all' && !showPinnedOnly
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-accent text-foreground'
            ]"
            @click="selectedType = 'all'; showPinnedOnly = false"
          >
            <Clock :size="16" />
            <span class="flex-1 text-left font-medium">全部</span>
            <span class="text-xs font-semibold tabular-nums">{{ stats.total }}</span>
          </button>

          <button
            :class="[
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
              showPinnedOnly
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-accent text-foreground'
            ]"
            @click="showPinnedOnly = !showPinnedOnly; selectedType = 'all'"
          >
            <Pin :size="16" />
            <span class="flex-1 text-left font-medium">已固定</span>
            <span class="text-xs font-semibold tabular-nums">{{ stats.pinned }}</span>
          </button>

          <div class="h-px bg-border my-2"></div>

          <button
            :class="[
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
              selectedType === 'text' && !showPinnedOnly
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-accent text-foreground'
            ]"
            @click="selectedType = 'text'; showPinnedOnly = false"
          >
            <FileText :size="16" />
            <span class="flex-1 text-left font-medium">文本</span>
            <span class="text-xs font-semibold tabular-nums">{{ stats.text }}</span>
          </button>

          <button
            :class="[
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
              selectedType === 'url' && !showPinnedOnly
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-accent text-foreground'
            ]"
            @click="selectedType = 'url'; showPinnedOnly = false"
          >
            <LinkIcon :size="16" />
            <span class="flex-1 text-left font-medium">链接</span>
            <span class="text-xs font-semibold tabular-nums">{{ stats.url }}</span>
          </button>

          <button
            :class="[
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
              selectedType === 'code' && !showPinnedOnly
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-accent text-foreground'
            ]"
            @click="selectedType = 'code'; showPinnedOnly = false"
          >
            <Code :size="16" />
            <span class="flex-1 text-left font-medium">代码</span>
            <span class="text-xs font-semibold tabular-nums">{{ stats.code }}</span>
          </button>
        </div>
      </div>

      <div class="p-3 border-t border-border">
        <button
          class="w-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          @click="clearAll"
        >
          清空历史记录
        </button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 头部工具栏 -->
      <div class="h-14 bg-card border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
        <h2 class="text-base font-semibold text-foreground">
          {{ showPinnedOnly ? '已固定' : selectedType === 'all' ? '全部' : selectedType === 'text' ? '文本' : selectedType === 'url' ? '链接' : '代码' }}
        </h2>

        <div class="flex-1"></div>

        <button
          class="h-8 px-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          :disabled="isRefreshing"
          @click="manualRefresh"
          title="检查剪贴板"
        >
          <RefreshCw :size="14" :class="{ 'animate-spin': isRefreshing }" />
          刷新
        </button>

        <div class="relative w-64">
          <Search
            :size="14"
            class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索剪贴板内容..."
            class="w-full h-8 pl-8 pr-8 bg-input border-0 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            v-if="searchQuery"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            @click="searchQuery = ''"
          >
            <X :size="14" />
          </button>
        </div>
      </div>

      <!-- 剪贴板列表 -->
      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="isLoading" class="text-center py-12">
          <RefreshCw :size="48" class="mx-auto text-muted-foreground/30 mb-3 animate-spin" />
          <p class="text-sm text-muted-foreground">加载中...</p>
        </div>

        <div v-else-if="filteredItems.length === 0" class="text-center py-12">
          <Clipboard :size="48" class="mx-auto text-muted-foreground/30 mb-3" />
          <p class="text-sm text-muted-foreground">
            {{ searchQuery ? '没有找到匹配的内容' : '暂无剪贴板历史' }}
          </p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="group bg-card border border-border rounded-lg p-3 transition-all duration-200 hover:shadow-sm hover:border-primary/50"
          >
            <div class="flex items-start gap-3">
              <component
                :is="getTypeIcon(item.type)"
                :size="16"
                class="flex-shrink-0 mt-0.5 text-muted-foreground"
              />

              <div class="flex-1 min-w-0">
                <div class="flex items-start gap-2 mb-1">
                  <pre
                    class="flex-1 text-sm text-foreground font-mono whitespace-pre-wrap break-words"
                  >{{ truncateText(item.content) }}</pre>
                  
                  <div class="flex-shrink-0 flex items-center gap-1">
                    <button
                      :class="[
                        'p-1.5 rounded-md transition-colors',
                        item.pinned
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100'
                      ]"
                      :title="item.pinned ? '取消固定' : '固定'"
                      @click="togglePin(item.id)"
                    >
                      <component :is="item.pinned ? Pin : PinOff" :size="14" />
                    </button>

                    <button
                      class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="复制"
                      @click="copyToClipboard(item.content)"
                    >
                      <Copy :size="14" />
                    </button>

                    <button
                      class="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="删除"
                      @click="deleteItem(item.id)"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </div>

                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock :size="12" />
                  <span>{{ formatTime(item.timestamp) }}</span>
                  <span class="text-muted-foreground/50">·</span>
                  <span>{{ item.content.length }} 字符</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
