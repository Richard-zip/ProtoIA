import { app, BrowserWindow, Menu, shell, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import child_process from 'node:child_process'

createRequire(import.meta.url)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

if (process.platform === 'win32') {
  const cacheDir = path.join(app.getPath('userData'), 'cache')
  app.setPath('cache', cacheDir)
}

let win: BrowserWindow | null

function createWindow() {
  Menu.setApplicationMenu(null)

  win = new BrowserWindow({
    title: 'Agnes',
    icon: path.join(process.env.VITE_PUBLIC, 'images/agnes.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.removeMenu()

  // Bloquear navegación interna a sitios web externos y abrirlos en el navegador predeterminado del sistema
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const isDevServer = VITE_DEV_SERVER_URL && navigationUrl.startsWith(VITE_DEV_SERVER_URL)
    if (!isDevServer && (navigationUrl.startsWith('https:') || navigationUrl.startsWith('http:'))) {
      event.preventDefault()
      shell.openExternal(navigationUrl)
    }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Renderer failed to load (${errorCode}): ${errorDescription} - ${validatedURL}`)
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Canal IPC seguro para abrir enlaces externos desde el proceso de renderizado
ipcMain.handle('open-external-url', async (_event, url: string) => {
  if (typeof url === 'string' && (url.startsWith('https:') || url.startsWith('http:'))) {
    await shell.openExternal(url)
  }
})

// Canal IPC nativo para cargar plantillas de Word de forma local y segura (compatible con app.asar y AppImage)
ipcMain.handle('load-template', async (_event, templatePathOrName: string) => {
  try {
    const rawName = typeof templatePathOrName === 'string' ? templatePathOrName : ''
    const cleanName = path.basename(decodeURIComponent(rawName))

    const searchDirs = [
      path.join(RENDERER_DIST, 'templates'),
      path.join(process.env.APP_ROOT, 'dist', 'templates'),
      path.join(process.env.APP_ROOT, 'public', 'templates'),
      path.join(process.resourcesPath || '', 'templates'),
      path.join(process.resourcesPath || '', 'app.asar', 'dist', 'templates'),
      path.join(app.getAppPath(), 'dist', 'templates'),
      path.join(app.getAppPath(), 'templates'),
    ]

    for (const dir of searchDirs) {
      const candidate = path.join(dir, cleanName)
      if (fs.existsSync(candidate)) {
        const buffer = await fs.promises.readFile(candidate)
        return { success: true, bufferBase64: buffer.toString('base64') }
      }
    }

    return {
      success: false,
      error: `No se encontró la plantilla "${cleanName}" en las rutas de la aplicación.`,
    }
  } catch (err) {
    console.error('[Main] Error al cargar plantilla de Word:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
})

interface LibreOfficeBinary {
  executable: string
  argsPrefix: string[]
}

function resolveLibreOfficeBinary(): LibreOfficeBinary | null {
  // 1. Prioridad: Binario portable integrado en el paquete de la aplicación (100% autocontenido)
  const isDev = !app.isPackaged
  const projectRoot = isDev ? path.join(__dirname, '..') : process.resourcesPath

  const candidateDirs = [
    path.join(projectRoot, 'bin', 'libreoffice'),
    path.join(process.resourcesPath || '', 'bin', 'libreoffice'),
    path.join(__dirname, '..', 'bin', 'libreoffice'),
  ]

  for (const dir of candidateDirs) {
    if (!dir) continue

    // Windows portable
    const winExe = path.join(dir, 'program', 'soffice.exe')
    if (process.platform === 'win32' && fs.existsSync(winExe)) {
      return { executable: winExe, argsPrefix: [] }
    }
    const winExeApp = path.join(dir, 'App', 'libreoffice', 'program', 'soffice.exe')
    if (process.platform === 'win32' && fs.existsSync(winExeApp)) {
      return { executable: winExeApp, argsPrefix: [] }
    }
    const winExeDirect = path.join(dir, 'soffice.exe')
    if (process.platform === 'win32' && fs.existsSync(winExeDirect)) {
      return { executable: winExeDirect, argsPrefix: [] }
    }

    // Script wrapper / ejecutable soffice portable Linux/macOS
    const wrapper = path.join(dir, 'soffice')
    if (fs.existsSync(wrapper)) {
      return { executable: wrapper, argsPrefix: [] }
    }

    // AppRun si existiera
    const appRun = path.join(dir, 'squashfs-root', 'AppRun')
    if (fs.existsSync(appRun)) {
      return { executable: appRun, argsPrefix: [] }
    }
  }

  // 2. Fallback: Rutas estándar del sistema si no se encuentra en bin/libreoffice
  if (process.platform === 'win32') {
    const winPaths = [
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'LibreOffice', 'program', 'soffice.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'LibreOffice', 'program', 'soffice.exe'),
    ]
    for (const p of winPaths) {
      if (fs.existsSync(p)) return { executable: p, argsPrefix: [] }
    }

    try {
      const output = child_process.execSync('where soffice.exe || where soffice', { encoding: 'utf-8' }).split(/\r?\n/)[0].trim()
      if (output && fs.existsSync(output)) {
        return { executable: output, argsPrefix: [] }
      }
    } catch {
      // No en PATH
    }
  } else if (process.platform === 'darwin') {
    const macPath = '/Applications/LibreOffice.app/Contents/MacOS/soffice'
    if (fs.existsSync(macPath)) return { executable: macPath, argsPrefix: [] }
  } else {
    // Linux nativo
    const linuxPaths = ['/usr/bin/soffice', '/usr/bin/libreoffice', '/usr/local/bin/soffice']
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) return { executable: p, argsPrefix: [] }
    }

    try {
      const output = child_process.execSync('which soffice || which libreoffice', { encoding: 'utf-8' }).trim()
      if (output && fs.existsSync(output)) {
        return { executable: output, argsPrefix: [] }
      }
    } catch {
      // No en PATH
    }
  }

  return null
}

async function runLibreOfficeConversion(
  binary: LibreOfficeBinary,
  inputDocxPath: string,
  outputDir: string
): Promise<void> {
  const args = [
    ...binary.argsPrefix,
    '--headless',
    '--invisible',
    '--nodefault',
    '--view',
    '--nolockcheck',
    '--nologo',
    '--norestore',
    '--convert-to',
    'pdf:writer_pdf_Export',
    '--outdir',
    outputDir,
    inputDocxPath,
  ]

  return new Promise((resolve, reject) => {
    child_process.execFile(
      binary.executable,
      args,
      {
        timeout: 90000,
        env: {
          ...process.env,
          // Perfil de usuario aislado para evitar conflictos de bloqueo de archivos
          UserInstallation: `file://${path.join(outputDir, '.lo-profile').replace(/\\/g, '/')}`,
          HOME: outputDir,
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error('[LibreOffice] Error en conversión a PDF:', error, stderr, stdout)
          reject(error)
        } else {
          resolve()
        }
      }
    )
  })
}

// Función auxiliar para recortar páginas finales vacías/en blanco si existen
async function removeTrailingBlankPagesFromPdf(pdfPath: string): Promise<void> {
  try {
    let hasPdftotext = false
    let hasPdfinfo = false
    try {
      child_process.execSync('which pdftotext', { stdio: 'ignore' })
      hasPdftotext = true
    } catch {
      // pdftotext no disponible en el sistema
    }
    try {
      child_process.execSync('which pdfinfo', { stdio: 'ignore' })
      hasPdfinfo = true
    } catch {
      // pdfinfo no disponible en el sistema
    }

    if (!hasPdftotext || !hasPdfinfo) return

    let checkAgain = true
    while (checkAgain) {
      checkAgain = false
      const infoOutput = child_process.execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' })
      const match = infoOutput.match(/Pages:\s+(\d+)/)
      if (!match) break
      const totalPages = parseInt(match[1], 10)
      if (totalPages <= 1) break

      const pageText = child_process.execFileSync(
        'pdftotext',
        ['-f', String(totalPages), '-l', String(totalPages), pdfPath, '-'],
        { encoding: 'utf8' }
      )

      if (!pageText || pageText.trim().length === 0) {
        const trimmedPath = `${pdfPath}.trimmed.pdf`
        let trimmed = false

        // Intentar con Ghostscript primero si está disponible
        try {
          child_process.execSync('which gs', { stdio: 'ignore' })
          child_process.execFileSync(
            'gs',
            [
              '-sDEVICE=pdfwrite',
              '-dNOPAUSE',
              '-dBATCH',
              '-dSAFER',
              '-dFirstPage=1',
              `-dLastPage=${totalPages - 1}`,
              `-sOutputFile=${trimmedPath}`,
              pdfPath,
            ],
            { stdio: 'ignore' }
          )
          if (fs.existsSync(trimmedPath)) {
            await fs.promises.rename(trimmedPath, pdfPath)
            trimmed = true
            checkAgain = true
          }
        } catch {
          // gs falló o no disponible
        }

        // Fallback a pdfseparate / pdfunite si gs no estuvo disponible
        if (!trimmed) {
          try {
            if (totalPages === 2) {
              child_process.execFileSync('pdfseparate', ['-f', '1', '-l', '1', pdfPath, trimmedPath])
              if (fs.existsSync(trimmedPath)) {
                await fs.promises.rename(trimmedPath, pdfPath)
                checkAgain = true
              }
            } else {
              const tempDir = path.dirname(pdfPath)
              const partPrefix = path.join(tempDir, `blank-trim-%d-${Date.now()}.pdf`)
              child_process.execFileSync('pdfseparate', ['-f', '1', '-l', String(totalPages - 1), pdfPath, partPrefix])
              const parts: string[] = []
              for (let i = 1; i < totalPages; i++) {
                parts.push(partPrefix.replace('%d', String(i)))
              }
              child_process.execFileSync('pdfunite', [...parts, trimmedPath])
              for (const p of parts) {
                fs.promises.unlink(p).catch(() => {})
              }
              if (fs.existsSync(trimmedPath)) {
                await fs.promises.rename(trimmedPath, pdfPath)
                checkAgain = true
              }
            }
          } catch {
            // pdfseparate/pdfunite falló
          }
        }
      }
    }
  } catch (err) {
    console.warn('[removeTrailingBlankPagesFromPdf] Error al recortar páginas en blanco:', err)
  }
}

// Canal IPC para conversión de DOCX nativo a PDF idéntico usando LibreOffice
ipcMain.handle('convert-docx-to-pdf', async (_event, { docxBase64 }: { docxBase64: string; title: string }) => {
  const binary = resolveLibreOfficeBinary()
  if (!binary) {
    throw new Error('LIBREOFFICE_NOT_FOUND')
  }

  const tempId = `agnes-lo-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const tempDir = path.join(app.getPath('temp'), tempId)
  await fs.promises.mkdir(tempDir, { recursive: true })

  const inputDocxPath = path.join(tempDir, 'documento.docx')
  const docxBuffer = Buffer.from(docxBase64, 'base64')
  await fs.promises.writeFile(inputDocxPath, docxBuffer)

  try {
    await runLibreOfficeConversion(binary, inputDocxPath, tempDir)

    const outputPdfPath = path.join(tempDir, 'documento.pdf')
    if (!fs.existsSync(outputPdfPath)) {
      throw new Error('No se encontró el archivo PDF resultante de la exportación.')
    }

    await removeTrailingBlankPagesFromPdf(outputPdfPath)

    const pdfBuffer = await fs.promises.readFile(outputPdfPath)
    return pdfBuffer
  } finally {
    fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
})

// Canal IPC para renderizar páginas individuales del protocolo con LibreOffice para la vista previa
ipcMain.handle('render-protocol-pages', async (_event, { docxBase64 }: { docxBase64: string }) => {
  const binary = resolveLibreOfficeBinary()
  if (!binary) {
    return { success: false, error: 'LIBREOFFICE_NOT_FOUND' }
  }

  const tempId = `agnes-lo-pages-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const tempDir = path.join(app.getPath('temp'), tempId)
  await fs.promises.mkdir(tempDir, { recursive: true })

  const inputDocxPath = path.join(tempDir, 'documento.docx')
  const docxBuffer = Buffer.from(docxBase64, 'base64')
  await fs.promises.writeFile(inputDocxPath, docxBuffer)

  try {
    await runLibreOfficeConversion(binary, inputDocxPath, tempDir)

    const outputPdfPath = path.join(tempDir, 'documento.pdf')
    if (!fs.existsSync(outputPdfPath)) {
      return { success: false, error: 'OUTPUT_PDF_NOT_FOUND' }
    }

    await removeTrailingBlankPagesFromPdf(outputPdfPath)

    const pdfBuffer = await fs.promises.readFile(outputPdfPath)
    const pdfBase64 = pdfBuffer.toString('base64')

    // Intentar extraer imágenes de página con pdftoppm si está disponible en el entorno
    const pageImages: string[] = []
    let hasPdftoppm = false
    try {
      child_process.execSync('which pdftoppm', { stdio: 'ignore' })
      hasPdftoppm = true
    } catch {
      hasPdftoppm = false
    }

    if (hasPdftoppm) {
      try {
        const pagePrefix = path.join(tempDir, 'page')
        child_process.execFileSync('pdftoppm', ['-png', '-r', '150', outputPdfPath, pagePrefix], {
          timeout: 15000,
        })

        const files = await fs.promises.readdir(tempDir)
        const pageFiles = files
          .filter((f) => f.startsWith('page-') && f.endsWith('.png'))
          .sort((a, b) => {
            const numA = parseInt(a.replace('page-', '').replace('.png', ''), 10) || 0
            const numB = parseInt(b.replace('page-', '').replace('.png', ''), 10) || 0
            return numA - numB
          })

        for (const file of pageFiles) {
          const imgBuffer = await fs.promises.readFile(path.join(tempDir, file))
          pageImages.push(`data:image/png;base64,${imgBuffer.toString('base64')}`)
        }
      } catch (ppmErr) {
        console.warn('[render-protocol-pages] pdftoppm no disponible o falló:', ppmErr)
      }
    }

    return {
      success: true,
      pdfBase64,
      pageImages,
      totalPages: pageImages.length,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, error: msg }
  } finally {
    fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
})

// Canal IPC para renderizado e impresión de protocolo a PDF de alta resolución

ipcMain.handle('generate-pdf-from-html', async (_event, { html, title }: { html: string; title: string }) => {
  const workerWin = new BrowserWindow({
    show: false,
    width: 850,
    height: 1100,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  const tempHtmlPath = path.join(
    app.getPath('temp'),
    `agnes-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.html`
  )

  try {
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title || 'Protocolo Académico'}</title>
  <style>
    @page {
      size: letter portrait;
      margin-top: 16mm;
      margin-bottom: 16mm;
      margin-left: 0;
      margin-right: 0;
    }

    @page :first {
      margin-top: 0;
      margin-bottom: 0;
      margin-left: 0;
      margin-right: 0;
    }

    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box !important;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: "Times New Roman", Times, "Liberation Serif", serif !important;
      -webkit-font-smoothing: antialiased !important;
      text-rendering: optimizeLegibility !important;
    }

    .docx-wrapper {
      background: #ffffff !important;
      padding: 0 !important;
      margin: 0 !important;
      display: block !important;
    }

    /* Contenedor de páginas de Word: paginación natural sin deformar anchos ni márgenes */
    section.docx {
      box-shadow: none !important;
      margin: 0 auto !important;
      background: #ffffff !important;
      display: block !important;
      position: relative !important;
      overflow: visible !important;
      min-height: auto !important;
      height: auto !important;
    }

    /* Encabezado institucional: contiene el fondo/banner en la primera página sin invadir páginas posteriores */
    header {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 792pt !important;
      max-height: 792pt !important;
      overflow: hidden !important;
      pointer-events: none !important;
      z-index: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    header p {
      margin: 0 !important;
      padding: 0 !important;
    }

    header svg {
      margin-top: 0 !important;
      max-height: 792pt !important;
      height: 792pt !important;
    }

    /* Contenedor principal de la tabla institucional */
    article {
      position: relative !important;
      z-index: 1 !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* Formato de tabla: bordes nítidos, evita filas divididas y desalineación */
    table {
      border-collapse: collapse !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
      table-layout: fixed !important;
      width: 100% !important;
    }

    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    td, th {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      vertical-align: top !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
    }

    /* Párrafos y protección contra líneas huérfanas y viudas */
    p {
      orphans: 2 !important;
      widows: 2 !important;
    }

    /* Pie de página institucional */
    footer {
      position: relative !important;
      z-index: 1 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* Máxima nitidez y fidelidad para logos y gráficos raster/vectoriales */
    img, image, svg {
      image-rendering: -webkit-optimize-contrast !important;
      image-rendering: high-quality !important;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`

    await fs.promises.writeFile(tempHtmlPath, fullHtml, 'utf-8')
    await workerWin.loadFile(tempHtmlPath)

    // Breve espera para que los estilos, fuentes e imágenes vectoriales se decodifiquen completamente
    await new Promise((resolve) => setTimeout(resolve, 500))

    const pdfBuffer = await workerWin.webContents.printToPDF({
      pageSize: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: 'none' },
    })

    return pdfBuffer
  } finally {
    workerWin.close()
    fs.promises.unlink(tempHtmlPath).catch(() => {})
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
