const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply(
        '🤖 Привет! Я твой AI-бот!\n\n' +
        '💬 Напиши мне сообщение, и я отвечу.\n\n' +
        '💎 PRO — 99 ₽/месяц'
    );
});

bot.on('text', (ctx) => {
    ctx.reply('✅ Сообщение получено! AI подключим следующим шагом.');
});

bot.launch();

console.log('🤖 Бот запущен!');