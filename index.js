const fs = require('fs');
const express = require('express');
const mcUtil = require('minecraft-server-util');
const config = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

const reconnectDelay = config.reconnectDelayMs || 7000;
const statusCheckInterval = config.statusCheckIntervalMs || 10000;

const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => res.send("✅ Bot is running"));
app.listen(PORT, () => console.log(`[🌐] Web server running on port ${PORT}`));

// === BEDROCK BOT ===
function startBedrockBot() {
  const { createClient } = require('bedrock-protocol');
  let client = null;
  let watchdogLoop = null;
  let statusInterval = null;

  function setupWatchdog() {
    let lastActivity = Date.now();
    if (watchdogLoop) clearInterval(watchdogLoop);

    client.on('packet', () => {
      lastActivity = Date.now();
    });

    watchdogLoop = setInterval(() => {
      if (Date.now() - lastActivity > 60000) {
        console.warn('[🛑] Không thấy hoạt động gần đây, khởi động lại kết nối...');
        try { client.disconnect(); } catch {}
        clearInterval(watchdogLoop);
        connect();
      }
    }, 30000);
  }

  function connect() {
    const randomName = config.username + Math.floor(Math.random() * 10000);
    console.log(`[🔄] Kết nối Bedrock tới ${config.host}:${config.port} với tên ${randomName}`);
    client = createClient({
      host: config.host,
      port: config.port || 19132,
      username: randomName,
      offline: true
    });

    client.on('join', () => {
      console.log('[✅] Đã vào server Bedrock.');
      setupWatchdog();
    });

    client.on('disconnect', reason => {
      console.warn('[⚠️] Bị kick hoặc mất kết nối:', reason);
      clearInterval(watchdogLoop);
      setTimeout(startStatusChecker, reconnectDelay);
    });

    client.on('error', err => {
      console.error('[❌] Lỗi kết nối:', err.message);
      clearInterval(watchdogLoop);
      setTimeout(startStatusChecker, reconnectDelay);
    });
  }

  function startStatusChecker() {
    if (statusInterval) clearInterval(statusInterval);
    console.log(`[🔍] Bắt đầu kiểm tra trạng thái server mỗi ${statusCheckInterval / 1000}s...`);

    statusInterval = setInterval(() => {
      console.log("[⏳] Kiểm tra trạng thái server Bedrock...");
      mcUtil.statusBedrock(config.host, config.port || 19132)
        .then(() => {
          console.log("[🟢] Server đã mở! Kết nối ngay...");
          clearInterval(statusInterval);
          connect();
        })
        .catch(() => {
          console.log("[🚫] Server chưa mở hoặc không phản hồi, sẽ thử lại...");
        });
    }, statusCheckInterval);
  }

  startStatusChecker();
}

// === KHỞI ĐỘNG ===
if (config.platform === 'bedrock') {
  startBedrockBot();
} else {
  console.error("❌ Cấu hình sai! Hãy đặt platform là 'bedrock'");
}