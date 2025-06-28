const fs = require('fs');
const express = require('express');
const mcUtil = require('minecraft-server-util');
const config = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
const reconnectDelay = config.reconnectDelayMs || 7000;

// Web giữ bot sống
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => res.send("✅ Bot is running"));
app.listen(PORT, () => console.log(`[🌐] Web server running on port ${PORT}`));

// === BEDROCK BOT ===
function startBedrockBot() {
  const { createClient } = require('bedrock-protocol');
  let client;
  let watchdogLoop;

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
        setTimeout(connect, reconnectDelay);
      }
    }, 30000);
  }

  function connect() {
    console.log("[⏳] Kiểm tra trạng thái server Bedrock...");
    mcUtil.statusBedrock(config.host, config.port || 19132)
      .then(() => {
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
          setTimeout(connect, reconnectDelay);
        });

        client.on('error', err => {
          console.error('[❌] Lỗi kết nối:', err.message);
          clearInterval(watchdogLoop);
          setTimeout(connect, reconnectDelay);
        });
      })
      .catch(() => {
        console.warn('[🚫] Server chưa mở hoặc không phản hồi, thử lại sau...');
        setTimeout(connect, reconnectDelay);
      });
  }

  connect();
}

// === KHỞI ĐỘNG ===
if (config.platform === 'bedrock') {
  startBedrockBot();
} else {
  console.error("❌ Cấu hình sai! Hãy đặt platform là 'bedrock'");
}
