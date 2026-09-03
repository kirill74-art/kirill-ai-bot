const { Telegraf } = require('telegraf');
const http = require('http');

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN) {
    console.error('BOT_TOKEN не найден');
    process.exit(1);
}

if (!OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY не найден');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

async function askAI(text) {
    const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`
            },
            body: JSON.stringify({
                model: 'openrouter/free',
                messages: [
                    {
                        role: 'user',
                        content: text
                    }
                ]
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(JSON.stringify(data));
    }

    return data.choices[0].message.content;
}

bot.start((ctx) => {
    ctx.reply(
        '🤖 Привет! Я Kiril AI!\n\n' +
        'Напиши мне любой вопрос 💬'
    );
});

bot.on('text', async (ctx) => {
    try {
        await ctx.sendChatAction('typing');

        const answer = await askAI(ctx.message.text);

        await ctx.reply(answer);

    } catch (error) {
        console.error('AI ERROR:', error);

        await ctx.reply(
            '❌ AI временно недоступен.'
        );
    }
});

http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Kiril AI Bot is running!');
}).listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web server запущен на порту ${PORT}`);
});

bot.launch();

console.log('🤖 AI-бот запущен!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
