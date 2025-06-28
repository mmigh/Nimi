const fs = require('fs');
const express = require('express');
const mcUtil = require('minecraft-server-util');
const { createClient } = require('bedrock-protocol');

const config = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
const reconnectDelay = config.reconnectDelayMs || 3000;

// Tạo web giữ sống bot
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => res.send("✅ Bot is running"));
app.listen(PORT, () => console.log(`[🌐] Web server running on port ${PORT}`));

// === Chat định kỳ ===
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
  }, 180000); // 3 phút
}

// === Kết nối bot Bedrock ===
function startBedrockBot() {
  function connect() {
    console.log('[⏳] Kiểm tra trạng thái server Bedrock...');

    mcUtil.statusBedrock(config.host, config.port || 19132, { timeout: 5000 })
      .then(() => {
        const randomName = config.username + Math.floor(Math.random() * 10000);
        console.log(`[🔄] Kết nối Bedrock tới ${config.host}:${config.port} với tên ${randomName}`);

        const client = createClient({
          host: config.host,
          port: config.port || 19132,
          username: randomName,
          offline: true
        });

        let joined = false;

        client.on('join', () => {
          joined = true;
          console.log('[✅] Đã vào server Bedrock.');
          startChat(msg => {
            client.queue('chat', { message: msg });
          });
        });

        // Nếu sau 30s chưa join, force reconnect
        setTimeout(() => {
          if (!joined) {
            console.warn('[⌛] Không join được sau 30s, reconnect lại...');
            try {
              client.disconnect();
            } catch (e) {}
            setTimeout(connect, reconnectDelay);
          }
        }, 30000);

        client.on('disconnect', reason => {
          console.warn('[⚠️] Bedrock bị disconnect:', reason);
          setTimeout(connect, reconnectDelay);
        });

        client.on('error', err => {
          console.error('[❌] Bedrock lỗi:', err.message);
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

// === Bắt đầu bot ===
if (config.platform === 'bedrock') {
  startBedrockBot();
} else {
  console.error("❌ Cấu hình sai! Vui lòng đặt platform là 'bedrock' trong settings.json");
}
