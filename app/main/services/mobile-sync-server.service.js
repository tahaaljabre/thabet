const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

let serverInstance = null;
let currentPort = 4850;

function getLocalIpAddresses() {
  const ifaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(ifaces)) {
    for (const details of ifaces[name]) {
      if (details.family === 'IPv4' && !details.internal) {
        ips.push(details.address);
      }
    }
  }
  return ips;
}

function startMobileSyncServer() {
  if (serverInstance) return { port: currentPort, ips: getLocalIpAddresses() };

  const mobileHtmlPath = path.join(__dirname, '..', '..', 'mobile-notes.html');
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');

  serverInstance = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, 'http://localhost');
    const pathname = parsedUrl.pathname;

    if (pathname === '/' || pathname === '/mobile-notes.html') {
      fs.readFile(mobileHtmlPath, (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Error loading mobile notes page');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache'
        });
        res.end(data);
      });
      return;
    }

    if (pathname === '/assets/icon.png') {
      fs.readFile(iconPath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end();
          return;
        }
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(data);
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  serverInstance.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      currentPort++;
      serverInstance.listen(currentPort, '0.0.0.0');
    }
  });

  serverInstance.listen(currentPort, '0.0.0.0', () => {
    currentPort = serverInstance.address().port;
  });

  return { port: currentPort, ips: getLocalIpAddresses() };
}

function getMobileSyncServerInfo() {
  if (!serverInstance) {
    startMobileSyncServer();
  }
  return {
    port: currentPort,
    ips: getLocalIpAddresses()
  };
}

module.exports = {
  startMobileSyncServer,
  getMobileSyncServerInfo
};

