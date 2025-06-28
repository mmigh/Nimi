const fs = require('fs');
const express = require('express');
const mcUtil = require('minecraft-server-util');
const config = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
const reconnectDelay = config.reconnectDelayMs || 3000;

// Web giữ sống bot
const app = express();
const PORT = process.env.PORT || 10000;
app.get("/", (_, res) => res.send("✅ Bot is running"));
app.listen(PORT, () => console.log(`[🌐] Web server running on port ${PORT}`));

// Chat định kỳ
let chatLoop;
function startChat(sendFn) {
  if (chatLoop) clearInterval(chatLoop);
  const messages = [
    "Vẫn đang AFK ", "Đừng kick tui nha ",
    "Tôi là người thật mà ", "Aternos ổn áp", "Lag nhẹ thôi "
  ];
  chatLoop = setInterval(() => {
    const msg = messages[Math.floor(Math.random() * messages.length)];
    sendFn(msg);
    console.log("[💬] Chat:", msg);
  }, 180000);
}

// === BEDROCK BOT ===
function startBedrockBot() {
  const { createClient } = require('bedrock-protocol');

  function connect() {
    console.log('[⏳] Kiểm tra trạng thái server Bedrock...');
    mcUtil.statusBedrock(config.host, config.port || 19132)
      .then(() => {
        const randomName = config.username + Math.floor(Math.random() * 10000);
        console.log(`[🔄] Kết nối Bedrock tới ${config.host}:${config.port} với tên ${randomName}`);
        const client = createClient({
          host: config.host,
          port: config.port || 19132,
          username: randomName,
          offline: true
        });

        let isConnected = false;
        let lastChatTime = Date.now();

        client.on('join', () => {
          console.log('[✅] Đã vào server Bedrock.');
          isConnected = true;
          startChat(msg => {
            if (isConnected) {
              client.queue('chat', { message: msg });
              lastChatTime = Date.now();
            }
          });
        });

        // Watchdog: kiểm tra mỗi 30s
        const watchdog = setInterval(() => {
          if (!isConnected) return;
          const now = Date.now();
          if (now - lastChatTime > 60000) {
            console.warn('[🛑] Không thấy hoạt động gần đây, khởi động lại kết nối...');
            isConnected = false;
            try { client.disconnect(); } catch {}
            clearInterval(watchdog);
            setTimeout(connect, reconnectDelay);
          }
        }, 30000);

        client.on('disconnect', reason => {
          console.warn('[⚠️] Bedrock bị kick hoặc rớt:', reason);
          isConnected = false;
          clearInterval(watchdog);
          setTimeout(connect, reconnectDelay);
        });

        client.on('error', err => {
          console.error('[❌] Bedrock lỗi:', err.message);
          isConnected = false;
          clearInterval(watchdog);
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

// === JAVA BOT === (giữ nguyên nếu cần)
function startJavaBot() {
  const mineflayer = require('mineflayer');
  let bot;

  function connect() {
    console.log(`[🔄] Kết nối Java tới ${config.host}:${config.port || 25565}`);
    bot = mineflayer.createBot({
      host: config.host,
      port: config.port || 25565,
      username: config.username,
      password: config.password || undefined,
      version: config.version
    });

    bot.once('spawn', () => {
      console.log('[✅] Đã vào server Java.');
      startChat(msg => bot.chat(msg));
    });

    bot.on('end', () => {
      console.warn('[⚠️] Java Bot bị ngắt kết nối.');
      setTimeout(connect, reconnectDelay);
    });

    bot.on('error', err => {
      console.error('[❌] Java Bot lỗi:', err.message);
      setTimeout(connect, reconnectDelay);
    });
  }

  connect();
}

// === BẮT ĐẦU ===
if (config.platform === 'java') {
  startJavaBot();
} else if (config.platform === 'bedrock') {
  startBedrockBot();
} else {
  console.error("❌ Cấu hình sai! Hãy đặt platform là 'java' hoặc 'bedrock'");
}
