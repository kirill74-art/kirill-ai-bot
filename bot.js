const { Telegraf, Markup } = require('telegraf');
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

const users = new Map();
const FREE_LIMIT = 10;

function getUser(ctx) {
    const id = ctx.from.id;

    if (!users.has(id)) {
        users.set(id, {
            requests: 0,
            pro: false,
            history: []
        });
    }

    return users.get(id);
}

function mainMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('💬 Задать вопрос', 'ask')
        ],
        [
            Markup.button.callback('👤 Мой профиль', 'profile'),
            Markup.button.callback('📊 Мой лимит', 'limit')
        ],
        [
            Markup.button.callback('⭐ Kiril AI PRO', 'pro')
        ],
        [
            Markup.button.callback('🧹 Новый диалог', 'new_chat')
        ],
        [
            Markup.button.callback('ℹ️ Помощь', 'help')
        ]
    ]);
}

async function askAI(user, text) {

    user.history.push({
        role: 'user',
        content: text
    });

    if (user.history.length > 10) {
        user.history = user.history.slice(-10);
    }

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
                        role: 'system',
                        content:
                            'Ты Kiril AI. Ты дружелюбный и полезный AI-помощник. ' +
                            'Отвечай понятно и качественно. ' +
                            'Если пользователь пишет на русском, отвечай на русском языке.'
                    },

                    ...user.history
                ]
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(JSON.stringify(data));
    }

    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
        throw new Error('AI не вернул ответ');
    }

    user.history.push({
        role: 'assistant',
        content: answer
    });

    return answer;
}

bot.start(async (ctx) => {

    getUser(ctx);

    await ctx.reply(
        '🤖 Добро пожаловать в *Kiril AI*!\n\n' +
        'Твой персональный AI-помощник 🚀\n\n' +
        'Я могу отвечать на вопросы, помогать с идеями, текстами, кодом и многим другим.\n\n' +
        '👇 Выбери действие:',
        {
            parse_mode: 'Markdown',
            ...mainMenu()
        }
    );
});

bot.action('ask', async (ctx) => {

    await ctx.answerCbQuery();

    await ctx.reply(
        '💬 Напиши свой вопрос следующим сообщением.\n\n' +
        'Например:\n' +
        '• Придумай название для игры\n' +
        '• Напиши текст песни\n' +
        '• Объясни JavaScript'
    );
});

bot.action('profile', async (ctx) => {

    await ctx.answerCbQuery();

    const user = getUser(ctx);

    const status = user.pro
        ? '⭐ PRO'
        : '🆓 Бесплатный';

    await ctx.reply(
        '👤 *Твой профиль*\n\n' +
        `🆔 ID: \`${ctx.from.id}\`\n` +
        `⭐ Статус: ${status}\n` +
        `📨 Запросов: ${user.requests}/${FREE_LIMIT}`,

        {
            parse_mode: 'Markdown',
            ...mainMenu()
        }
    );
});

bot.action('limit', async (ctx) => {

    await ctx.answerCbQuery();

    const user = getUser(ctx);

    let remaining;

    if (user.pro) {
        remaining = 'Без ограничений';
    } else {
        remaining =
            String(Math.max(0, FREE_LIMIT - user.requests)) +
            ' запросов';
    }

wait ctx.reply(
        '📊 *Твой лимит*\n\n' +
        `Использовано: ${user.requests}\n` +
        `Осталось: ${remaining}\n\n` +
        '⭐ PRO даст больше возможностей.',

        {
            parse_mode: 'Markdown',
            ...mainMenu()
        }
    );
});

bot.action('pro', async (ctx) => {

    await ctx.answerCbQuery();

    await ctx.reply(
        '⭐ *Kiril AI PRO*\n\n' +
        '🚀 Больше запросов\n' +
        '🧠 Расширенная память\n' +
        '⚡ Приоритетная обработка\n' +
        '✨ Дополнительные функции\n\n' +
        '💰 Цена: 99 ₽ / месяц\n\n' +
        '🔜 Оплата будет подключена следующим этапом.',

        {
            parse_mode: 'Markdown',
            ...mainMenu()
        }
    );
});

bot.action('new_chat', async (ctx) => {

    await ctx.answerCbQuery();

    const user = getUser(ctx);

    user.history = [];

    await ctx.reply(
        '🧹 *Новый диалог создан!*\n\n' +
        'История предыдущего разговора очищена.',

        {
            parse_mode: 'Markdown',
            ...mainMenu()
        }
    );
});

bot.action('help', async (ctx) => {

    await ctx.answerCbQuery();

    await ctx.reply(
        'ℹ️ *Помощь по Kiril AI*\n\n' +
        '💬 Нажми «Задать вопрос» и отправь сообщение.\n\n' +
        '🧠 Я запоминаю последние сообщения текущего диалога.\n\n' +
        '🧹 «Новый диалог» очищает историю.\n\n' +
        '📊 В разделе «Мой лимит» можно посмотреть количество запросов.\n\n' +
        '⭐ PRO — расширенная версия Kiril AI.',

        {
            parse_mode: 'Markdown',
            ...mainMenu()
        }
    );
});

bot.on('text', async (ctx) => {

    const text = ctx.message.text;

    if (text.startsWith('/')) {
        return;
    }

    const user = getUser(ctx);

    if (!user.pro && user.requests >= FREE_LIMIT) {

        await ctx.reply(
            '🚫 *Лимит на сегодня закончился.*\n\n' +
            `Ты использовал ${FREE_LIMIT} бесплатных запросов.\n\n` +
            '⭐ Перейди на Kiril AI PRO или попробуй завтра.',

            {
                parse_mode: 'Markdown',
                ...mainMenu()
            }
        );

        return;
    }

    try {

        await ctx.sendChatAction('typing');

        const answer = await askAI(user, text);

        user.requests++;

        await ctx.reply(
            answer,
            mainMenu()
        );

    } catch (error) {

        console.error('AI ERROR:', error);

        if (
            user.history.length > 0 &&
            user.history[user.history.length - 1].role === 'user'
        ) {
            user.history.pop();
        }

        await ctx.reply(
            '❌ Не удалось получить ответ от AI.\n\n' +
            'Попробуй отправить сообщение ещё раз.'
        );
    }
});

http.createServer((req, res) => {

    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    res.end('Kiril AI Bot is running!');

}).listen(PORT, '0.0.0.0', () => {

    console.log(
        `🌐 Web server запущен на порту ${PORT}`
    );

});

bot.launch();

console.log('🤖 Kiril AI запущен!');

process.once('SIGINT', () => {
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
}); a
