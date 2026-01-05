<script setup lang="ts">
import { onMounted } from 'vue'
import { toast } from 'vue-sonner'

let downloadingToastId: string | number | undefined
let checkingToastId: string | number | undefined
let isManualCheck = false

// 格式化日期
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

// 下载更新
const downloadUpdate = async (): Promise<void> => {
  await window.api.updater.download()
}

// 安装更新
const installUpdate = async (): Promise<void> => {
  await window.api.updater.install()
}

// 监听更新事件
onMounted(() => {
  // 检查更新中
  window.api.updater.onCheckingForUpdate(() => {
    // 只有手动检查时才显示 loading
    if (isManualCheck) {
      checkingToastId = toast.loading('正在检查更新...')
    }
  })

  // 发现新版本
  window.api.updater.onUpdateAvailable((_, info) => {
    // 关闭检查中的 toast
    if (checkingToastId) {
      toast.dismiss(checkingToastId)
      checkingToastId = undefined
    }

    toast.success(`发现新版本 ${info.version}`, {
      description: `发布日期: ${formatDate(info.releaseDate)}`,
      duration: 10000,
      action: {
        label: '立即下载',
        onClick: () => downloadUpdate()
      },
      cancel: {
        label: '稍后',
        onClick: () => {}
      }
    })
  })

  // 当前已是最新版本 - 仅手动检查时显示
  window.api.updater.onUpdateNotAvailable((_, info) => {
    // 关闭检查中的 toast
    if (checkingToastId) {
      toast.dismiss(checkingToastId)
      checkingToastId = undefined
    }

    if (isManualCheck) {
      toast.info('当前已是最新版本', {
        description: `版本 ${info.version}`,
        duration: 3000
      })
      isManualCheck = false
    }
  })

  // 下载进度
  window.api.updater.onDownloadProgress((_, progress) => {
    const percent = Math.round(progress.percent)
    const transferred = (progress.transferred / 1024 / 1024).toFixed(1)
    const total = (progress.total / 1024 / 1024).toFixed(1)

    if (downloadingToastId) {
      toast.loading(`正在下载更新... ${percent}%`, {
        id: downloadingToastId,
        description: `${transferred} MB / ${total} MB`
      })
    } else {
      downloadingToastId = toast.loading(`正在下载更新... ${percent}%`, {
        description: `${transferred} MB / ${total} MB`
      })
    }
  })

  // 下载完成
  window.api.updater.onUpdateDownloaded((_, info) => {
    if (downloadingToastId) {
      toast.dismiss(downloadingToastId)
      downloadingToastId = undefined
    }

    toast.success(`更新已就绪 - v${info.version}`, {
      description: '点击重启安装更新',
      duration: Infinity,
      action: {
        label: '立即重启',
        onClick: () => installUpdate()
      },
      cancel: {
        label: '稍后',
        onClick: () => {}
      }
    })
  })

  // 更新错误
  window.api.updater.onError((_, error) => {
    // 关闭检查中或下载中的 toast
    if (checkingToastId) {
      toast.dismiss(checkingToastId)
      checkingToastId = undefined
    }
    if (downloadingToastId) {
      toast.dismiss(downloadingToastId)
      downloadingToastId = undefined
    }

    toast.error('更新失败', {
      description: error.message,
      duration: 5000
    })
  })
})

// 暴露手动检查更新的方法
defineExpose({
  checkForUpdates: async () => {
    isManualCheck = true
    await window.api.updater.check()
  }
})
</script>

<template>
  <div style="display: none">
    <!-- 不需要任何 UI，完全使用 vue-sonner -->
  </div>
</template>
