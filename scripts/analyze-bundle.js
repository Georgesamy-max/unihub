#!/usr/bin/env node

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path')

function getDirectorySize(dirPath) {
  let totalSize = 0

  function calculateSize(currentPath) {
    const stats = fs.statSync(currentPath)

    if (stats.isDirectory()) {
      const files = fs.readdirSync(currentPath)
      files.forEach((file) => {
        calculateSize(path.join(currentPath, file))
      })
    } else {
      totalSize += stats.size
    }
  }

  try {
    calculateSize(dirPath)
    return totalSize
  } catch {
    return 0
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function analyzeBundle() {
  console.log('📊 Bundle Size Analysis\n')

  // 分析 out 目录
  const outDir = path.join(__dirname, '../out')
  if (fs.existsSync(outDir)) {
    const outSize = getDirectorySize(outDir)
    console.log(`📦 Build Output (out/): ${formatBytes(outSize)}`)

    // 分析各个部分
    const rendererSize = getDirectorySize(path.join(outDir, 'renderer'))
    const mainSize = getDirectorySize(path.join(outDir, 'main'))
    const preloadSize = getDirectorySize(path.join(outDir, 'preload'))

    console.log(`  ├── Renderer: ${formatBytes(rendererSize)}`)
    console.log(`  ├── Main: ${formatBytes(mainSize)}`)
    console.log(`  └── Preload: ${formatBytes(preloadSize)}\n`)

    // 分析 renderer assets
    const assetsDir = path.join(outDir, 'renderer/assets')
    if (fs.existsSync(assetsDir)) {
      console.log('🎨 Renderer Assets:')
      const assets = fs.readdirSync(assetsDir)
      const assetSizes = assets
        .map((asset) => {
          const assetPath = path.join(assetsDir, asset)
          const size = fs.statSync(assetPath).size
          return { name: asset, size }
        })
        .sort((a, b) => b.size - a.size)

      assetSizes.forEach((asset) => {
        console.log(`  ├── ${asset.name}: ${formatBytes(asset.size)}`)
      })
      console.log()
    }
  }

  // 分析 dist 目录
  const distDir = path.join(__dirname, '../dist')
  if (fs.existsSync(distDir)) {
    console.log('📱 Distribution Files:')
    const distFiles = fs.readdirSync(distDir)
    distFiles.forEach((file) => {
      const filePath = path.join(distDir, file)
      const stats = fs.statSync(filePath)
      if (
        stats.isFile() &&
        (file.endsWith('.dmg') || file.endsWith('.exe') || file.endsWith('.AppImage'))
      ) {
        console.log(`  ├── ${file}: ${formatBytes(stats.size)}`)
      }
    })
  }
}

analyzeBundle()
