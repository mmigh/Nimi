const mineflayer = require('mineflayer');
const fs = require('fs');
const express = require('express');

// Đọc cấu hình
const config = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

let bot;
let reconnectAttempts = 0;
let chatInterval;

const randomMessages = [
  "Vẫn đang AFK 😴",
  "Bot gì đâu, tui người thật nè 😎",
  "Đừng kick tui nha 🥲",
  "Aternos hôm nay ổn áp quá!",
  "Lag nhẹ thôi mà 😅"
];

// Gửi chat mỗi 3 phút
function startChatLoop() {
  if (chatInterval) clearInterval(chatInterval);
  chatInterval = setInterval(() => {
    if (bot?.player?.uuid) {
      const msg = randomMessages[Math.floor(Math.random() * randomMessages.length)];
      bot.chat(msg);
      console.log(`[💬] Chat: ${msg}`);
    }
  }, 180000); // 3 phút
}

// Tạo bot
function startBot() {
  console.log(`[🔄] Kết nối tới ${config.host}:${config.port || 25565}...`);
  bot = mineflayer.createBot({
    host: config.host,
    port: config.port || 25565,
    username: config.username,
    password: config.password || undefined,
    version: config.version
  });

  bot.once('spawn', () => {
    console.log('[✅] Bot đã vào server.');
    reconnectAttempts = 0;
    startChatLoop();
  });

  bot.on('end', () => {
    console.warn('[⚠️] Bot bị ngắt kết nối.');
    reconnectWithBackoff();
  });

  bot.on('kicked', reason => {
    console.warn('[🚫] Bị kick:', reason);
  });

  bot.on('error', err => {
    console.error('[❌] Lỗi kết nối:', err.message);
    reconnectWithBackoff();
  });
}

// Reconnect thông minh
function reconnectWithBackoff() {
  reconnectAttempts++;
  clearInterval(chatInterval);
  const baseDelay = config.reconnectDelayMs || 3000;
  const jitter = Math.floor(Math.random() * 2000);
  const delay = Math.min(baseDelay * reconnectAttempts + jitter, 30000);
  console.log(`[⏳] Reconnect sau ${delay}ms (lần ${reconnectAttempts})...`);
  setTimeout(() => startBot(), delay);
}

startBot();

// Web server giữ bot sống (Render/Replit)
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => res.send("✅ Bot is running"));
app.listen(PORT, () => {
  console.log(`[🌐] Web server active tại port ${PORT}`);
});
