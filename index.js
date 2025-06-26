const fs = require('fs');
const express = require('express');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const config = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
const reconnectDelay = config.reconnectDelayMs || 3000;
const randomName = () => `minib${Math.floor(Math.random() * 9999)}`;
const messages = [
  "Vẫn đang AFK ", "Đừng kick tui nha ", "Tôi là người thật mà ", "Aternos ổn áp", "Lag nhẹ thôi "
];

const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => res.send("✅ Bot is running"));
app.listen(PORT, () => console.log(`[🌐] Web server running on port ${PORT}`));

let bot = null;
let clientBedrock = null;
let chatLoop;
function startChat(sendFn) {
  if (chatLoop) clearInterval(chatLoop);
  chatLoop = setInterval(() => {
    const msg = messages[Math.floor(Math.random() * messages.length)];
    sendFn(msg);
    console.log("[💬] Chat:", msg);
  }, 180000);
}

function startJavaBot() {
  const mineflayer = require('mineflayer');
  function connect() {
    const username = randomName();
    console.log(`[🔄] Kết nối Java tới ${config.host}:${config.port || 25565} với tên ${username}`);
    bot = mineflayer.createBot({
      host: config.host,
      port: config.port || 25565,
      username,
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

function startBedrockBot() {
  const { createClient } = require('bedrock-protocol');
  function connect() {
    const username = randomName();
    console.log(`[🔄] Kết nối Bedrock tới ${config.host}:${config.port} với tên ${username}`);
    clientBedrock = createClient({
      host: config.host,
      port: config.port || 48546,
      username,
      offline: true,
      profilesFolder: './bedrock_profiles',
      password: config.password
    });

    clientBedrock.on('join', () => {
      console.log('[✅] Đã vào server Bedrock.');
      startChat(msg => clientBedrock.queue('chat', { message: msg }));
    });

    clientBedrock.on('disconnect', (reason) => {
      console.warn('[⚠️] Bedrock bị kick:', reason);
      setTimeout(connect, reconnectDelay);
    });

    clientBedrock.on('error', err => {
      console.error('[❌] Bedrock lỗi:', err.message);
      setTimeout(connect, reconnectDelay);
    });
  }

  connect();
}

// === Discord Bot ===
const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });

discordClient.once('ready', () => {
  console.log(`[🤖] Discord bot sẵn sàng (${discordClient.user.tag})`);
});

discordClient.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'reconnect') {
    await interaction.reply('♻️ Đang reconnect...');
    if (config.platform === 'java' && bot) bot.quit();
    else if (config.platform === 'bedrock' && clientBedrock) clientBedrock.close();
    else await interaction.followUp('❌ Không tìm thấy bot để reconnect.');
  }

  if (interaction.commandName === 'check_online') {
    if (config.platform === 'java' && bot && bot.players) {
      const names = Object.keys(bot.players);
      await interaction.reply(`👥 Online (${names.length}): ${names.join(', ')}`);
    } else if (config.platform === 'bedrock' && clientBedrock) {
      await interaction.reply('👤 Bedrock không hỗ trợ danh sách online trực tiếp.');
    } else {
      await interaction.reply('❌ Bot chưa kết nối hoặc không khả dụng.');
    }
  }
});

(async () => {
  const commands = [
    new SlashCommandBuilder().setName('reconnect').setDescription('🔄 Reconnect bot Minecraft'),
    new SlashCommandBuilder().setName('check_online').setDescription('👀 Xem danh sách người chơi online')
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('[📡] Đăng ký lệnh slash...');
    await rest.put(Routes.applicationCommands(config.discordClientId), { body: commands });
    console.log('[✅] Slash command đã được đăng ký.');
    await discordClient.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('❌ Không thể đăng ký lệnh:', error);
  }
})();

// === Khởi động bot Minecraft ban đầu ===
if (config.platform === 'java') startJavaBot();
else if (config.platform === 'bedrock') startBedrockBot();
else console.error("❌ Cấu hình sai! Hãy đặt platform là 'java' hoặc 'bedrock'");
