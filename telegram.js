const TelegramBot = require('node-telegram-bot-api');

const db = require("croxydb")
db.setFolder("./database");

const config = require('./config');

const bot = new TelegramBot(config.telegramToken, { polling: true });

bot.onText(/\/id/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, chatId);
});

bot.onText(/\/ignore (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const coin = match[1].toUpperCase();
  db.push("ignoredCoins", `${coin}_USDT`)
  bot.sendMessage(chatId, `${coin} Engellenenler listesine eklendi`);
});

bot.onText(/\/activate (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const coin = match[1].toUpperCase();
  db.unpush("ignoredCoins", `${coin}_USDT`)
  bot.sendMessage(chatId, `${coin} Engellenenler listesinden kaldırıldı`);
});

function sendMessageToUser(userId, message) {
  bot.sendMessage(userId, message)
    .then(() => {
      console.log('Mesaj başarıyla gönderildi.');
    })
    .catch((error) => {
      console.error('Mesaj gönderilirken bir hata oluştu:', error);
    });
};

module.exports = {
    sendMessageToUser
}