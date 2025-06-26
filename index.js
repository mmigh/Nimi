const fs = require('fs');
const express = require('express');
const config = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
const reconnectDelay = config.reconnectDelayMs || 3000;

// Web giữ sống bot
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => res.send("✅ Bot is running"));
app.listen(PORT, () => console.log(`[🌐] Web server running on port ${PORT}`));

// Chat định kỳ
let chatLoop;
function startChat(sendFn) {
  if (chatLoop) clearInterval(chatLoop);
  const messages = [
    "Vẫn đang AFK ",
    "Đừng kick tui nha ",
    "Tôi là người thật mà ",
    "Aternos ổn áp",
    "Lag nhẹ thôi "
  ];
  chatLoop = setInterval(() => {
    const msg = messages[Math.floor(Math.random() * messages.length)];
    sendFn(msg);
    console.log("[💬] Chat:", msg);
  }, 180000);
}

// === JAVA (mineflayer) ===
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

// === BEDROCK (bedrock-protocol) ===
function startBedrockBot() {
  const { createClient } = require('bedrock-protocol');
  let client;

  function connect() {
    console.log(`[🔄] Kết nối Bedrock tới ${config.host}:${config.port}`);
    client = createClient({
      host: config.host,
      port: config.port || 48546,
      username: config.username,
      offline: true,
      profilesFolder: './bedrock_profiles',
      password: config.password
    });

    client.on('join', () => {
      console.log('[✅] Đã vào server Bedrock.');
      startChat(msg => client.queue('chat', { message: msg }));
    });

    client.on('disconnect', (reason) => {
      console.warn('[⚠️] Bedrock bị kick:', reason);
      setTimeout(connect, reconnectDelay);
    });

    client.on('error', err => {
      console.error('[❌] Bedrock lỗi:', err.message);
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
