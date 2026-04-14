/**
 * 新数网络调试工具 (NetCommand)
 * Copyright (c) 2026 四川新数科技有限公司. All rights reserved.
 *
 * Electron 主进程入口
 */
import { app, BrowserWindow } from 'electron'
import { join } from 'path'

// 开发环境加载 Vite 开发服务器
const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    title: '新数网络调试工具',
    icon: join(__dirname, '../public/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    frame: true,
    backgroundColor: '#1a1a2e'
  })

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // 标题栏自定义
  if (!isDev) {
    mainWindow.removeMenu()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
