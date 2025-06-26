const mineflayer = require('mineflayer');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

let bot;
let reconnectAttempts = 0;
let chatInterval;

const randomMessages = [
  "Tôi vẫn đang trong server nhé!",
  "Đừng tưởng tôi là bot 😏",
  "Mạng chập chờn tí thôi...",
  "Hôm nay trời đẹp để AFK!",
  "Đang chill 😎"
];

function startChatLoop() {
  if (chatInterval) clearInterval(chatInterval);

  chatInterval = setInterval(() => {
    if (bot?.player && bot.player.uuid) {
      const msg = randomMessages[Math.floor(Math.random() * randomMessages.length)];
      bot.chat(msg);
      console.log(`[💬] Chat: ${msg}`);
    }
  }, 180000); // mỗi 3 phút
}

function startBot() {
  console.log(`[🔄] Đang kết nối tới server ${config.host}...`);

  bot = mineflayer.createBot({
    host: config.host,
    username: config.username,
    password: config.password || undefined,
    version: config.version
  });

  bot.once('spawn', () => {
    console.log('[✅] Bot đã kết nối thành công.');
    reconnectAttempts = 0;
    startChatLoop();
  });

  bot.on('end', () => {
    console.warn('[⚠️] Bot bị ngắt kết nối khỏi server.');
    reconnectWithBackoff();
  });

  bot.on('kicked', reason => {
    console.warn('[🚫] Bot bị kick:', reason);
  });

  bot.on('error', err => {
    console.error('[❌] Lỗi kết nối:', err.message);
    reconnectWithBackoff();
  });
}

function reconnectWithBackoff() {
  reconnectAttempts++;
  clearInterval(chatInterval);

  const baseDelay = config.reconnectDelayMs || 3000;
  const jitter = Math.floor(Math.random() * 2000);
  const delay = Math.min(baseDelay * reconnectAttempts + jitter, 30000);

  console.log(`[⏳] Đang đợi ${delay}ms trước khi reconnect (lần ${reconnectAttempts})...`);

  setTimeout(() => {
    startBot();
  }, delay);
}

startBot();
