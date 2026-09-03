const { Telegraf, Markup } = require('telegraf');
const { Pool } = require('pg');
const http = require('http');

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN не найден');
  process.exit(1);
}

if (!OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY не найден');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('DATABASE_URL не найден');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const FREE_LIMIT = 10;

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id BIGINT PRIMARY KEY,
      requests INTEGER DEFAULT 0,
      pro BOOLEAN DEFAULT FALSE,
      history JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  console.log('🗄 PostgreSQL подключён');
}

async function getUser(ctx) {
  const id = ctx.from.id;

  const result = await pool.query(
    'SELECT * FROM users WHERE telegram_id = $1',
    [id]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  const newUser = await pool.query(
    `INSERT INTO users (telegram_id, requests, pro, history)
     VALUES ($1, 0, false, '[]'::jsonb)
     RETURNING *`,
    [id]
  );

  return newUser.rows[0];
}

async function saveUser(user) {
  await pool.query(
    `UPDATE users
     SET requests = $1,
         pro = $2,
         history = $3,
         updated_at = NOW()
     WHERE telegram_id = $4`,
    [
      user.requests,
      user.pro,
      JSON.stringify(user.history || []),
      user.telegram_id
    ]
  );
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
  if (!user.history) {
    user.history = [];
  }

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
            content: 'Ты Kiril AI. Ты дружелюбный и полезный AI-помощник. Отвечай понятно и качественно. Если пользователь пишет на русском, отвечай на русском языке.'
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

  if (user.history.length > 10) {
    user.history = user.history.slice(-10);
  }

  return answer;
}

bot.start(async (ctx) => {
  const user = await getUser(ctx);

  await ctx.reply(
    '🤖 Добро пожаловать в Kiril AI!\n\n' +
    'Твой умный AI-помощник.\n\n' +
    '💬 Задавай вопросы\n' +
    '🧠 Получай ответы\n' +
    '⭐ Используй PRO для расширенных возможностей',
    mainMenu()
  );

  await saveUser(user);
});

bot.action('ask', async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.reply(
    '💬 Напиши свой вопрос следующим сообщением.'
  );
});

bot.action('profile', async (ctx) => {
  await ctx.answerCbQuery();

  const user = await

User(ctx);

  const status = user.pro ? '⭐ PRO' : '🆓 Бесплатный';

  await ctx.reply(
    '👤 Твой профиль\n\n' +
    `🆔 Telegram ID: ${user.telegram_id}\n` +
    `⭐ Статус: ${status}\n` +
    `💬 Запросов использовано: ${user.requests}`,
    mainMenu()
  );
});

bot.action('limit', async (ctx) => {
  await ctx.answerCbQuery();

  const user = await getUser(ctx);

  if (user.pro) {
    await ctx.reply(
      '📊 Твой лимит\n\n' +
      '⭐ PRO\n' +
      '♾ Без ограничений',
      mainMenu()
    );

    return;
  }

  const remaining = Math.max(0, FREE_LIMIT - user.requests);

  await ctx.reply(
    '📊 Твой лимит\n\n' +
    '🆓 Бесплатный тариф\n' +
    `💬 Использовано: ${user.requests}/${FREE_LIMIT}\n` +
    `🔹 Осталось: ${remaining}`,
    mainMenu()
  );
});

bot.action('pro', async (ctx) => {
  await ctx.answerCbQuery();

  const user = await getUser(ctx);

  if (user.pro) {
    await ctx.reply(
      '⭐ У тебя уже подключён Kiril AI PRO!\n\n' +
      '♾ Без ограничений',
      mainMenu()
    );

    return;
  }

  await ctx.reply(
    '⭐ Kiril AI PRO\n\n' +
    'Получай расширенные возможности:\n\n' +
    '♾ Без ограничений\n' +
    '🧠 Больше возможностей AI\n' +
    '💬 Больше запросов\n' +
    '🚀 Приоритетная обработка\n\n' +
    '💰 Стоимость: 99 ₽/месяц\n\n' +
    'Оплата будет подключена позже.',
    mainMenu()
  );
});

bot.action('new_chat', async (ctx) => {
  await ctx.answerCbQuery();

  const user = await getUser(ctx);

  user.history = [];

  await saveUser(user);

  await ctx.reply(
    '🧹 Новый диалог создан!\n\n' +
    'Теперь можешь задать новый вопрос.',
    mainMenu()
  );
});

bot.action('help', async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.reply(
    'ℹ️ Помощь\n\n' +
    '💬 Задать вопрос — отправить вопрос AI.\n\n' +
    '👤 Мой профиль — информация о твоём аккаунте.\n\n' +
    '📊 Мой лимит — посмотреть оставшиеся запросы.\n\n' +
    '⭐ Kiril AI PRO — расширенный тариф.\n\n' +
    '🧹 Новый диалог — очистить историю текущего диалога.',
    mainMenu()
  );
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;

  if (text.startsWith('/')) {
    return;
  }

  const user = await getUser(ctx);

  if (!user.pro && user.requests >= FREE_LIMIT) {
    await ctx.reply(
      '❌ Бесплатный лимит закончился.\n\n' +
      `Ты использовал ${FREE_LIMIT}/${FREE_LIMIT} запросов.\n\n` +
      '⭐ Подключи Kiril AI PRO за 99 ₽/месяц.',
      mainMenu()
    );

    return;
  }

  try {
    await ctx.sendChatAction('typing');

    const answer = await askAI(user, text);

    user.requests += 1;

    await saveUser(user);

    await ctx.reply(
      answer,
      mainMenu()
    );

  } catch (error) {
    console.error('Ошибка AI:', error);

    await ctx.reply(
      '❌ Произошла ошибка при обращении к AI.\n\n' +
      'Попробуй ещё раз через несколько секунд.',
      mainMenu()
    );
  }
});

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8'
  });

  res.end('Kiril AI работает!');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Web server запущен на порту ${PORT}`);
});

async function startBot() {
  try {
    await initDatabase();
    await bot.launch();

    console.log('🤖 Kiril AI запущен!');
  } catch (error) {
    console.error('❌ Ошибка запуска:', error);
    process.exit(1);
  }
}

startBot();

process.once('SIGINT', () => {
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
}); get
