const fs = require('fs');
const express = require('express');
const mcUtil = require('minecraft-server-util');
const axios = require('axios');
require('dotenv').config();
const config = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

const reconnectDelay = config.reconnectDelayMs || 7000;
const checkInterval = config.checkIntervalMs || 10000;
const minimalLog = config.minimalLog || true;
const webhookUrl = process.env.URL;

// Logging helper
function log(type, ...args) {
  if (minimalLog && type === 'log') return;
  console[type](...args);
  if (webhookUrl && (type === 'warn' || type === 'error')) {
    axios.post(webhookUrl, {
      content: `[\`${type.toUpperCase()}\`] ${args.join(' ')}`
    }).catch(() => {});
  }
}

function notifyDiscord(content) {
  if (webhookUrl) {
    axios.post(webhookUrl, {
      content: `@everyone ${content}`
    }).catch(() => {});
  }
}

// Web giữ bot sống
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => res.send("✅ Bot is running"));
app.listen(PORT, () => log('log', `[🌐] Web server running on port ${PORT}`));

// === BEDROCK BOT ===
function startBedrockBot() {
  const { createClient } = require('bedrock-protocol');
  let client;
  let watchdogLoop;
  let isConnected = false;

  function setupWatchdog() {
    let lastActivity = Date.now();
    if (watchdogLoop) clearInterval(watchdogLoop);

    client.on('packet', () => {
      lastActivity = Date.now();
    });

    watchdogLoop = setInterval(() => {
      if (Date.now() - lastActivity > 60000) {
        log('warn', '[🛑] Không thấy hoạt động gần đây, khởi động lại kết nối...');
        notifyDiscord('⚠️ Bot mất kết nối quá 1 phút! Đang thử kết nối lại...');
        try { client.disconnect(); } catch {}
        clearInterval(watchdogLoop);
        isConnected = false;
      }
    }, 30000);
  }

  function connect() {
    if (isConnected) return;

    log('log', '[⏳] Kiểm tra trạng thái server Bedrock...');
    mcUtil.statusBedrock(config.host, config.port || 19132)
      .then(() => {
        log('log', '[🟢] Server đã mở! Kết nối ngay...');
        const randomName = config.username + Math.floor(Math.random() * 10000);
        log('log', `[🔄] Kết nối Bedrock tới ${config.host}:${config.port} với tên ${randomName}`);
        client = createClient({
          host: config.host,
          port: config.port || 19132,
          username: randomName,
          offline: true
        });

        isConnected = true;

        client.on('join', () => {
          log('log', '[✅] Đã vào server Bedrock.');
          notifyDiscord(`✅ Bot \`${randomName}\` đã vào server.`);
          setupWatchdog();
        });

        client.on('disconnect', reason => {
          log('warn', '[⚠️] Bị kick hoặc mất kết nối:', reason);
          notifyDiscord(`⚠️ Bot bị kick hoặc mất kết nối: \`${reason}\``);
          clearInterval(watchdogLoop);
          isConnected = false;
        });

        client.on('error', err => {
          log('error', '[❌] Lỗi kết nối:', err.message);
          clearInterval(watchdogLoop);
          isConnected = false;
        });
      })
      .catch(() => {
        log('warn', '[🚫] Server chưa mở hoặc không phản hồi, thử lại sau...');
      });
  }

  log('log', `[🔍] Bắt đầu kiểm tra trạng thái server mỗi ${checkInterval / 1000}s...`);
  setInterval(connect, checkInterval);
  connect();
}

// === KHỞI ĐỘNG ===
if (config.platform === 'bedrock') {
  startBedrockBot();
} else {
  console.error("❌ Cấu hình sai! Hãy đặt platform là 'bedrock'");
}
