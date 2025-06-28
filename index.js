const fs = require('fs');
const express = require('express');
const fetch = require('node-fetch');
const { createClient } = require('bedrock-protocol');

const config = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
const reconnectDelay = config.reconnectDelayMs || 5000;

// 🌐 Web giữ bot sống
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => res.send("✅ Bot is running"));
app.listen(PORT, () => console.log(`[🌐] Web server running on port ${PORT}`));

// ⏰ Auto ping chính mình mỗi 5 phút để Render không ngủ
setInterval(() => {
  fetch(`http://localhost:${PORT}`).catch(() => {});
}, 5 * 60 * 1000);

// 💬 Chat định kỳ
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

// 🤖 BEDROCK BOT SIÊU TRỤ VỮNG
function startBedrockBot() {
  let client;

  function reconnect() {
    const randomName = (config.username || "AFKBot") + Math.floor(Math.random() * 10000);
    console.log(`[🔄] Thử kết nối Bedrock: ${config.host}:${config.port} với tên ${randomName}`);

    try {
      client = createClient({
        host: config.host,
        port: config.port || 19132,
        username: randomName,
        offline: true
      });

      client.on('join', () => {
        console.log('[✅] Bot đã vào server Bedrock!');
        startChat(msg => client.queue('chat', { message: msg }));
      });

      client.on('disconnect', reason => {
        console.warn(`[⚠️] Bot bị kick: ${reason}`);
        retryLater();
      });

      client.on('error', err => {
        console.error('[❌] Lỗi bot:', err.message);
        retryLater();
      });
    } catch (err) {
      console.error('[❌] Lỗi khởi tạo bot:', err.message);
      retryLater();
    }
  }

  function retryLater() {
    setTimeout(() => {
      reconnect();
    }, reconnectDelay);
  }

  reconnect();
}

// BẮT ĐẦU CHẠY BOT
if (config.platform === 'bedrock') {
  startBedrockBot();
} else {
  console.error("❌ Vui lòng đặt platform là 'bedrock' trong settings.json");
}
