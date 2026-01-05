#!/usr/bin/env node

/**
 * 图标生成脚本
 * 从 1024x1024 的源图标生成各平台所需的图标尺寸
 */

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SOURCE_IMAGE = path.join(__dirname, '../resources/1024.jpg')
const BUILD_DIR = path.join(__dirname, '../build')

// 确保 build 目录存在
if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR, { recursive: true })
}

// macOS 图标尺寸
const MAC_SIZES = [16, 32, 64, 128, 256, 512, 1024]
// Windows 图标尺寸
const WIN_SIZES = [16, 24, 32, 48, 64, 128, 256]
// Linux 图标尺寸
const LINUX_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024]

/**
 * 为 macOS 添加圆角和透明边缘
 * @param {number} size
 * @returns {Promise<import('sharp').Sharp>}
 */
async function createMacIcon(size) {
  const cornerRadius = Math.round(size * 0.18)
  const padding = Math.round(size * 0.085)
  const contentSize = size - padding * 2

  const roundedCorners = Buffer.from(
    `<svg width="${contentSize}" height="${contentSize}">
      <rect x="0" y="0" width="${contentSize}" height="${contentSize}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
    </svg>`
  )

  const resizedImage = await sharp(SOURCE_IMAGE)
    .resize(contentSize, contentSize, { fit: 'cover', position: 'center' })
    .ensureAlpha()
    .toBuffer()

  const roundedImage = await sharp(resizedImage)
    .composite([{ input: roundedCorners, blend: 'dest-in' }])
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: roundedImage, top: padding, left: padding }])
    .png()
}

/**
 * 创建标准图标
 * @param {number} size
 * @returns {Promise<import('sharp').Sharp>}
 */
async function createStandardIcon(size) {
  return sharp(SOURCE_IMAGE).resize(size, size, { fit: 'cover', position: 'center' }).png()
}

/**
 * 生成 macOS 图标
 * @returns {Promise<void>}
 */
async function generateMacIcons() {
  console.log('🍎 生成 macOS 图标...')

  const iconsetDir = path.join(BUILD_DIR, 'icon.iconset')
  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true })
  }

  for (const size of MAC_SIZES) {
    const icon = await createMacIcon(size)
    const filename = `icon_${size}x${size}.png`
    await icon.toFile(path.join(iconsetDir, filename))
    console.log(`  ✓ ${filename}`)

    if (size < 512) {
      const icon2x = await createMacIcon(size * 2)
      const filename2x = `icon_${size}x${size}@2x.png`
      await icon2x.toFile(path.join(iconsetDir, filename2x))
      console.log(`  ✓ ${filename2x}`)
    }
  }

  const macMainIcon = await createMacIcon(512)
  await macMainIcon.toFile(path.join(BUILD_DIR, 'icon-mac.png'))
  console.log('  ✓ icon-mac.png (512x512 圆角版本)')
}

/**
 * 生成 Windows 图标
 * @returns {Promise<void>}
 */
async function generateWinIcons() {
  console.log('🪟 生成 Windows 图标...')

  const iconDir = path.join(BUILD_DIR, 'icons/win')
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true })
  }

  for (const size of WIN_SIZES) {
    const icon = await createStandardIcon(size)
    const filename = `icon_${size}x${size}.png`
    await icon.toFile(path.join(iconDir, filename))
    console.log(`  ✓ ${filename}`)
  }
}

/**
 * 生成 Linux 图标
 * @returns {Promise<void>}
 */
async function generateLinuxIcons() {
  console.log('🐧 生成 Linux 图标...')

  const iconDir = path.join(BUILD_DIR, 'icons/linux')
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true })
  }

  for (const size of LINUX_SIZES) {
    const icon = await createStandardIcon(size)
    const filename = `${size}x${size}.png`
    await icon.toFile(path.join(iconDir, filename))
    console.log(`  ✓ ${filename}`)
  }
}

/**
 * 生成主图标
 * @returns {Promise<void>}
 */
async function generateMainIcons() {
  console.log('📦 生成主图标...')

  const icon512 = await createStandardIcon(512)
  await icon512.toFile(path.join(BUILD_DIR, 'icon.png'))
  console.log('  ✓ icon.png (512x512)')

  const icon256 = await createStandardIcon(256)
  await icon256.toFile(path.join(BUILD_DIR, 'icon-256.png'))
  console.log('  ✓ icon-256.png')

  await icon512.toFile(path.join(__dirname, '../resources/icon.png'))
  console.log('  ✓ resources/icon.png')
}

/**
 * 主函数
 * @returns {Promise<void>}
 */
async function main() {
  console.log('🎨 开始生成应用图标...\n')

  if (!fs.existsSync(SOURCE_IMAGE)) {
    console.error(`❌ 错误: 找不到源图标文件 ${SOURCE_IMAGE}`)
    console.error('   请将 1024x1024 的图标放在 resources/1024.jpg')
    process.exit(1)
  }

  try {
    await generateMainIcons()
    console.log()
    await generateMacIcons()
    console.log()
    await generateWinIcons()
    console.log()
    await generateLinuxIcons()
    console.log()

    console.log('🔨 尝试生成 .icns 文件...')
    try {
      const iconsetPath = path.join(BUILD_DIR, 'icon.iconset')
      const icnsPath = path.join(BUILD_DIR, 'icon.icns')
      execSync(`iconutil -c icns "${iconsetPath}" -o "${icnsPath}"`, { stdio: 'inherit' })
      console.log('  ✓ icon.icns 生成成功！')
    } catch {
      console.log('  ⚠️  iconutil 不可用，跳过 .icns 生成')
      console.log('  💡 electron-builder 会自动处理')
    }

    console.log()
    console.log('✅ 所有图标生成完成！')
  } catch (error) {
    console.error('❌ 生成图标时出错:', error)
    process.exit(1)
  }
}

main()
