const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

const bot = new TelegramBot(config.telegramToken, { polling: true });

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

