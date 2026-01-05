#!/usr/bin/env node

/**
 * 上传图标文件到腾讯云 COS
 * 使用方法：
 *   node scripts/upload-icon-to-cos.js <icon-file-path> <cos-path>
 *   例如：node scripts/upload-icon-to-cos.js official-plugins/ctool/dist/favicon.ico official-plugins/ctool/favicon.ico
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const { readFileSync, existsSync, statSync } = require('fs')
const { join, extname } = require('path')
const crypto = require('crypto')

// 手动加载 .env 文件
const envPath = join(__dirname, '../.env')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

// COS 配置
const COS_SECRET_ID = process.env.COS_SECRET_ID
const COS_SECRET_KEY = process.env.COS_SECRET_KEY
const COS_BUCKET = process.env.COS_BUCKET
const COS_REGION = process.env.COS_REGION

// Content-Type 映射
const CONTENT_TYPES = {
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.webp': 'image/webp'
}

/**
 * 生成 COS 签名
 */
function getAuthorization(method, pathname, host, secretId, secretKey) {
  const now = Math.floor(Date.now() / 1000)
  const expired = now + 3600

  const keyTime = `${now};${expired}`
  const signKey = crypto.createHmac('sha1', secretKey).update(keyTime).digest('hex')
  const httpString = `${method.toLowerCase()}\n${pathname}\n\nhost=${host}\n`
  const sha1HttpString = crypto.createHash('sha1').update(httpString).digest('hex')
  const stringToSign = `sha1\n${keyTime}\n${sha1HttpString}\n`
  const signature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex')

  return `q-sign-algorithm=sha1&q-ak=${secretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=host&q-url-param-list=&q-signature=${signature}`
}

/**
 * 上传文件到 COS
 */
async function uploadToCOS(filePath, cosPath) {
  const fileContent = readFileSync(filePath)
  const fileSize = statSync(filePath).size
  const ext = extname(filePath).toLowerCase()
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'

  const host = `${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com`
  const pathname = `/${cosPath}`
  const url = `https://${host}${pathname}`

  const authorization = getAuthorization('PUT', pathname, host, COS_SECRET_ID, COS_SECRET_KEY)

  console.log(`📤 正在上传到 COS: ${cosPath}`)
  console.log(`   文件大小: ${(fileSize / 1024).toFixed(2)} KB`)
  console.log(`   Content-Type: ${contentType}`)
  console.log(`   目标地址: ${url}`)

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      Host: host,
      'Content-Type': contentType,
      'Content-Length': fileSize.toString()
    },
    body: fileContent
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`COS 上传失败 (${response.status}): ${error}`)
  }

  console.log(`✅ 上传成功 (${response.status})`)
  return url
}

/**
 * 主函数
 */
async function main() {
  // 检查环境变量
  if (!COS_SECRET_ID || !COS_SECRET_KEY || !COS_BUCKET || !COS_REGION) {
    console.error('❌ 错误：缺少 COS 配置')
    console.error('   请在 .env 文件中配置 COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET, COS_REGION')
    process.exit(1)
  }

  // 获取参数
  const localPath = process.argv[2]
  const cosPath = process.argv[3]

  if (!localPath || !cosPath) {
    console.error('❌ 错误：请指定文件路径和 COS 路径')
    console.error('   使用方法：node scripts/upload-icon-to-cos.js <local-file> <cos-path>')
    console.error(
      '   例如：node scripts/upload-icon-to-cos.js official-plugins/ctool/dist/favicon.ico official-plugins/ctool/favicon.ico'
    )
    process.exit(1)
  }

  const filePath = join(__dirname, '..', localPath)
  if (!existsSync(filePath)) {
    console.error(`❌ 错误：文件不存在: ${localPath}`)
    process.exit(1)
  }

  try {
    const url = await uploadToCOS(filePath, cosPath)
    console.log('')
    console.log('✅ 上传成功！')
    console.log('')
    console.log('📋 访问链接：')
    console.log(`   ${url}`)
  } catch (error) {
    console.error('')
    console.error('❌ 上传失败:', error.message)
    process.exit(1)
  }
}

main()
