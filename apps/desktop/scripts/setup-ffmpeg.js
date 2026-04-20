/**
 * Downloads the official proprietary ffmpeg build from Electron releases and
 * replaces node_modules/electron/dist/ffmpeg.dll for local dev/testing.
 *
 * Usage: npm run setup:codecs
 * Re-run after any `npm install` that updates the electron version.
 */
const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

const ELECTRON_VERSION = require('../node_modules/electron/package.json').version
const platform = process.platform

const PLATFORM_INFO = {
  win32:  { ffmpegFile: 'ffmpeg.dll',      archiveSuffix: 'win32-x64.zip'  },
  linux:  { ffmpegFile: 'libffmpeg.so',    archiveSuffix: 'linux-x64.zip'  },
  darwin: { ffmpegFile: 'libffmpeg.dylib', archiveSuffix: 'darwin-x64.zip' },
}

const info = PLATFORM_INFO[platform]
if (!info) { console.error(`Unsupported platform: ${platform}`); process.exit(1) }

const electronDist = path.join(__dirname, '..', 'node_modules', 'electron', 'dist')
const ffmpegDest = platform === 'darwin'
  ? path.join(electronDist, 'Electron.app', 'Contents', 'Frameworks',
      'Electron Framework.framework', 'Libraries', info.ffmpegFile)
  : path.join(electronDist, info.ffmpegFile)

if (!fs.existsSync(path.dirname(ffmpegDest))) {
  console.error(`Electron dist not found. Run npm install first.`)
  process.exit(1)
}

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.destroy(); try { fs.unlinkSync(dest) } catch {}
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        file.destroy(); try { fs.unlinkSync(dest) } catch {}
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', err => { try { fs.unlinkSync(dest) } catch {}; reject(err) })
  })
}

;(async () => {
  const archiveName = `ffmpeg-v${ELECTRON_VERSION}-${info.archiveSuffix}`
  const url = `https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/${archiveName}`
  const tmpArchive = path.join(os.tmpdir(), archiveName)
  const tmpDir = path.join(os.tmpdir(), `electron-ffmpeg-${Date.now()}`)

  console.log(`Downloading official Electron proprietary ffmpeg v${ELECTRON_VERSION}...`)

  try { await download(url, tmpArchive) }
  catch (e) { console.error(`Failed: ${e.message}`); process.exit(1) }

  fs.mkdirSync(tmpDir, { recursive: true })
  if (platform === 'win32') {
    execSync(`powershell -Command "Expand-Archive -Path '${tmpArchive}' -DestinationPath '${tmpDir}' -Force"`)
  } else {
    execSync(`unzip -o "${tmpArchive}" -d "${tmpDir}"`)
  }

  const extracted = path.join(tmpDir, info.ffmpegFile)
  if (!fs.existsSync(extracted)) {
    console.error(`${info.ffmpegFile} not found in archive`)
    process.exit(1)
  }

  fs.copyFileSync(extracted, ffmpegDest)
  console.log(`✓ Installed → ${ffmpegDest}`)
  console.log('MP3, H.264, AAC now available in Electron dev mode.')

  fs.unlinkSync(tmpArchive)
  fs.rmSync(tmpDir, { recursive: true, force: true })
})()
