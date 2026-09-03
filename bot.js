const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN не найден в Environment Variables');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply(
        '🤖 Привет! Я твой AI-бот!\n\n' +
        '💬 Напиши мне сообщение.\n' +
        '💎 PRO — 99 ₽/месяц'
    );
});

bot.on('text', (ctx) => {
    ctx.reply('✅ Сообщение получено!');
});

bot.launch();

console.log('🤖 Бот запущен!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
