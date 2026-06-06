const { app, BrowserWindow, Menu, shell } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let staticServer = null;

const writeBootLog = (message) => {
  try {
    const logFile = path.join(app.getPath('userData'), 'boot.log');
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`, 'utf8');
  } catch {
    // Keep boot resilient even if the log path is not writable.
  }
};

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
};

const safeJoin = (root, requestPath) => {
  const decodedPath = decodeURIComponent(requestPath.split('?')[0]);
  const normalized = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const resolved = path.join(root, normalized === '/' ? 'index.html' : normalized);
  return resolved.startsWith(root) ? resolved : path.join(root, 'index.html');
};

const startStaticServer = () =>
  new Promise((resolve, reject) => {
    const distRoot = path.join(app.getAppPath(), 'dist');
    const server = http.createServer((req, res) => {
      const requestUrl = req.url || '/';
      const filePath = safeJoin(distRoot, requestUrl);
      const finalPath = fs.existsSync(filePath) && fs.statSync(filePath).isFile()
        ? filePath
        : path.join(distRoot, 'index.html');
      const ext = path.extname(finalPath).toLowerCase();

      fs.readFile(finalPath, (error, data) => {
        if (error) {
          writeBootLog(`static read failed ${finalPath}: ${error.message}`);
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(`Factory Takt Simulator failed to read ${path.basename(finalPath)}`);
          return;
        }

        res.writeHead(200, {
          'Content-Type': mimeTypes[ext] || 'application/octet-stream',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(data);
      });
    });

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      staticServer = server;
      const address = server.address();
      const url = `http://127.0.0.1:${address.port}/index.html`;
      writeBootLog(`static server ${url} serving ${distRoot}`);
      resolve(url);
    });
  });

const createMainWindow = (appUrl) => {
  const iconPath = path.join(app.getAppPath(), 'dist', 'brand', 'app-icon.png');
  const win = new BrowserWindow({
    width: 1480,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    title: 'Factory Takt Simulator',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#020617',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  Menu.setApplicationMenu(null);

  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    writeBootLog(`did-fail-load ${errorCode} ${errorDescription} ${validatedURL}`);
    win.show();
    win.webContents.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(`
        <body style="margin:0;background:#020617;color:#e2e8f0;font-family:Segoe UI,Arial,sans-serif;display:grid;place-items:center;height:100vh">
          <div style="max-width:720px;padding:28px;border:1px solid #334155;background:#0f172a;border-radius:8px">
            <h1 style="margin:0 0 12px;color:#67e8f9">Factory Takt Simulator 启动失败</h1>
            <p>本地资源没有正确加载。请把程序放到英文路径或重新运行便携版。</p>
            <p style="color:#94a3b8;font-size:13px">错误：${errorCode} ${errorDescription}</p>
          </div>
        </body>
      `)}`,
    );
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    writeBootLog(`render-process-gone ${details.reason}`);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  writeBootLog(`loading ${appUrl}`);
  win.loadURL(appUrl).catch((error) => {
    writeBootLog(`loadURL failed ${error.message}`);
    win.loadURL(pathToFileURL(path.join(app.getAppPath(), 'dist', 'index.html')).toString());
  });
};

app.whenReady().then(async () => {
  const appUrl = await startStaticServer();
  createMainWindow(appUrl);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow(appUrl);
  });
});

app.on('before-quit', () => {
  if (staticServer) staticServer.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
