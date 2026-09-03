
const { Telegraf } = require('telegraf');
const http = require('http');

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN не найден');
    process.exit(1);
}

if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY не найден');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

async function askAI(text) {
    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-5.6-luna',
            input: text
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }

    const data = await response.json();

    return data.output_text;
}

bot.start((ctx) => {
    ctx.reply(
        '🤖 Привет! Я AI-помощник!\n\n' +
        '💬 Напиши мне любой вопрос.\n' +
        '🧠 Я постараюсь помочь!'
    );
});

bot.on('text', async (ctx) => {
    try {
        await ctx.sendChatAction('typing');

        const answer = await askAI(ctx.message.text);

        await ctx.reply(answer || '❌ AI не вернул ответ.');

    } catch (error) {
        console.error('AI ERROR:', error);

        await ctx.reply(
            '❌ Произошла ошибка при обращении к AI.'
        );
    }
});

// Небольшой сервер для Render
http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    res.end('AI Telegram Bot is running!');
}).listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web server запущен на порту ${PORT}`);
});

bot.launch();

console.log('🤖 AI-бот запущен!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
