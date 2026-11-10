const { ipcMain, app, shell, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const systemService = require('../../services/system.service');
const { requireAuth } = require('../auth.helper');

function registerPrintingHandlers(mainWindow) {
  // Printing
    ipcMain.handle('print-voucher', async (event) => {
      const options = {
        silent: false,
        printBackground: true,
        color: true,
        margin: {
          marginType: 'printableArea'
        },
        landscape: false,
        pagesPerSheet: 1,
        collate: false,
        copies: 1,
        header: 'مطعم حضرموت اليمن',
        footer: 'التقرير اليومي'
      };
      
      return new Promise((resolve) => {
        const targetWin = BrowserWindow.fromWebContents(event.sender) || mainWindow;
        targetWin.webContents.print(options, (success, failureReason) => {
          if (!success) {
             dialog.showErrorBox('خطأ في الطباعة', 'حدث خطأ أثناء محاولة الطباعة:\n' + failureReason);
             resolve({ success: false, reason: failureReason });
          } else {
             resolve({ success: true });
          }
        });
      });
    });
  
    ipcMain.handle('print-to-pdf', async (event) => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        const pdfData = await win.webContents.printToPDF({
          printBackground: true,
          margins: { marginType: 'printableArea' }
        });
        
        const tempPath = path.join(app.getPath('temp'), 'report_preview.pdf');
        fs.writeFileSync(tempPath, pdfData);
        shell.openPath(tempPath);
        return { success: true };
      } catch (err) {
        console.error('Print to PDF failed', err);
        dialog.showErrorBox('خطأ في استخراج PDF', 'حدث خطأ أثناء الطباعة كملف PDF:\n' + err.message);
        return { success: false, error: err.message };
      }
    });
  
    ipcMain.handle('print-html-to-pdf', async (event, htmlString, pageSize) => {
      let printWin = null;
      let tempHtmlPath = null;
      try {
        printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
        let fullHtml = '';
        if (htmlString.trim().startsWith('<html') || htmlString.trim().startsWith('<!DOCTYPE')) {
          fullHtml = htmlString;
        } else {
          fullHtml = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: white; color: black; }
                .print-voucher-row { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding: 5px 0; font-size: 14px; }
                .print-voucher-row.amount { font-weight: bold; font-size: 16px; border-bottom: 2px solid #000; margin-top: 10px; }
                .print-voucher-header { text-align: center; margin-bottom: 20px; }
                .print-voucher-title { font-size: 22px; font-weight: bold; }
              </style>
            </head>
            <body>${htmlString}</body>
            </html>
          `;
        }
        // Write HTML to a temp file so backgrounds render correctly via file:// URL
        tempHtmlPath = path.join(app.getPath('temp'), 'report_tmp_' + Date.now() + '.html');
        fs.writeFileSync(tempHtmlPath, fullHtml, 'utf8');
        await printWin.loadFile(tempHtmlPath);
        
        const nowStamp = new Date().toLocaleString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const pdfOptions = {
          printBackground: true,
          margins: { marginType: 'printableArea' },
          displayHeaderFooter: true,
          headerTemplate: '<div></div>',
          footerTemplate: `<div style="font-size:9px; width:100%; padding:0 14mm; display:flex; justify-content:space-between; align-items:center; color:#6b2d2d; font-family:tahoma,sans-serif; border-top:1px solid #e5d5c5; padding-top:2px;"><span>✦ نظام ثابت المالي المعتمد — توثيق رسمي (${nowStamp})</span><span><span class="pageNumber"></span> - <span class="totalPages"></span></span></div>`
        };
        if (pageSize) {
          pdfOptions.pageSize = pageSize;
          if (pageSize === 'A5') {
            pdfOptions.landscape = true;
          }
        }
        const pdfData = await printWin.webContents.printToPDF(pdfOptions);
        
        const tempPath = path.join(app.getPath('temp'), 'report_' + Date.now() + '.pdf');
        fs.writeFileSync(tempPath, pdfData);
        shell.openPath(tempPath);

        return { success: true, pdfGenerated: true };
      } catch (err) {
        console.error('Print HTML to PDF failed', err);
        dialog.showErrorBox('خطأ في الطباعة', 'حدث خطأ أثناء محاولة توليد أو فتح ملف الطباعة:\n' + err.message);
        return { success: false, error: err.message };
      } finally {
        // Always release the hidden window and remove the temp HTML, even on failure
        if (tempHtmlPath) {
          try { fs.unlinkSync(tempHtmlPath); } catch (_) {}
        }
        if (printWin && !printWin.isDestroyed()) {
          printWin.destroy();
        }
      }
    });
  
    ipcMain.handle('import-legacy-data', requireAuth({ role: 'manager' }, async (event, jsonString) => {
      return await systemService.importLegacyData(jsonString);
    }));
}

module.exports = { registerPrintingHandlers };
