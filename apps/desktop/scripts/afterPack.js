/**
 * Replaces Electron's default ffmpeg (no proprietary codecs) with the
 * official proprietary build from Electron's own GitHub releases.
 * Ref: https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules
 */
const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

const ELECTRON_VERSION = require('../node_modules/electron/package.json').version

const PLATFORM_INFO = {
  win32:  { ffmpegFile: 'ffmpeg.dll',       archiveSuffix: 'win32-x64.zip',   extract: 'zip'    },
  linux:  { ffmpegFile: 'libffmpeg.so',      archiveSuffix: 'linux-x64.zip',   extract: 'zip'    },
  darwin: { ffmpegFile: 'libffmpeg.dylib',   archiveSuffix: 'darwin-x64.zip',  extract: 'zip'    },
}

function ffmpegDestPath(platform, appOutDir) {
  if (platform === 'darwin') {
    return path.join(appOutDir, 'Vertex.app', 'Contents', 'Frameworks',
      'Electron Framework.framework', 'Libraries', 'libffmpeg.dylib')
  }
  return path.join(appOutDir, PLATFORM_INFO[platform].ffmpegFile)
}

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const request = https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.destroy(); fs.unlinkSync(dest)
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        file.destroy(); fs.unlinkSync(dest)
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    })
    request.on('error', err => { try { fs.unlinkSync(dest) } catch {} ; reject(err) })
  })
}

exports.default = async function afterPack(context) {
  const platform = context.electronPlatformName
  const info = PLATFORM_INFO[platform]
  if (!info) return

  const dest = ffmpegDestPath(platform, context.appOutDir)
  if (!fs.existsSync(path.dirname(dest))) {
    console.warn(`[afterPack] ffmpeg destination dir not found, skipping`)
    return
  }

  // Official Electron proprietary codec build
  const archiveName = `ffmpeg-v${ELECTRON_VERSION}-${info.archiveSuffix}`
  const url = `https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/${archiveName}`
  const tmpArchive = path.join(os.tmpdir(), archiveName)
  const tmpDir = path.join(os.tmpdir(), `electron-ffmpeg-${Date.now()}`)

  console.log(`[afterPack] Fetching official proprietary ffmpeg v${ELECTRON_VERSION} for ${platform}...`)

  try {
    await download(url, tmpArchive)
  } catch (e) {
    console.warn(`[afterPack] Download failed: ${e.message} — skipping codec replacement`)
    return
  }

  fs.mkdirSync(tmpDir, { recursive: true })
  if (platform === 'win32') {
    execSync(`powershell -Command "Expand-Archive -Path '${tmpArchive}' -DestinationPath '${tmpDir}' -Force"`)
  } else {
    execSync(`unzip -o "${tmpArchive}" -d "${tmpDir}"`)
  }

  const extracted = path.join(tmpDir, info.ffmpegFile)
  if (!fs.existsSync(extracted)) {
    console.warn(`[afterPack] ${info.ffmpegFile} not found in archive`)
    return
  }

  fs.copyFileSync(extracted, dest)
  console.log(`[afterPack] ✓ Proprietary ffmpeg installed → ${dest}`)

  fs.unlinkSync(tmpArchive)
  fs.rmSync(tmpDir, { recursive: true, force: true })
}
