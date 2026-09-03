const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
        '🤖 Привет!\n\n' +
        'Я AI-помощник.\n' +
        'Напиши мне любой вопрос, и я постараюсь помочь тебе! 💬\n\n' +
        '⭐ Скоро здесь появится PRO-подписка.'
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
            '❌ Не удалось получить ответ от AI.\n' +
            'Попробуй ещё раз через несколько секунд.'
        );
    }

});

bot.launch();

console.log('🤖 AI-бот запущен!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
