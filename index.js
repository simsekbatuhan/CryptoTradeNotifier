const axios = require('axios');

const config = require('./config')

const telegram = require('./telegram')

const coins = config.coins;

async function getCoinPrecision(symbol) {
    try {
        const response = await axios.get('https://contract.mexc.com/api/v1/contract/detail');
        const coinInfo = response.data.data.find(coin => coin.symbol === symbol);
        if (coinInfo) {
            return {
                priceScale: coinInfo.priceScale,
                amountScale: coinInfo.amountScale
            };
        }
        return null;
    } catch (error) {
        console.error('Hassasiyet bilgisi alınırken hata:', error);
        return null;
    }
}

async function getMarketDeals(symbol) {
    try {
        const precisionInfo = await getCoinPrecision(symbol);
        if (!precisionInfo) {
            console.error(`Hassasiyet bilgisi bulunamadı: ${symbol}`);
            return;
        }

        const { priceScale, amountScale } = precisionInfo;
        const url = `https://contract.mexc.com/api/v1/contract/deals/${symbol}`;
        
        const response = await axios.get(url);
        const deals = response.data.data;
        const groupedDeals = {};

        deals.forEach(deal => {
            const price = (deal.p / Math.pow(10, priceScale)).toFixed(priceScale);
            const volume = (deal.v / Math.pow(10, amountScale)).toFixed(amountScale);
            const time = new Date(deal.t);
            const timeKey = time.toLocaleTimeString('tr-TR');

            const type = deal.T === 1 ? 'buy' : 'sell';

            if (!groupedDeals[timeKey]) {
                groupedDeals[timeKey] = { buy: 0, sell: 0 };
            }
            groupedDeals[timeKey][type] += parseFloat(volume);
        });
        
        Object.entries(groupedDeals).forEach(([timeKey, volumes]) => {
            if (volumes.buy > config.volumeThreshold) {
                const message = `Coin: ${symbol}, Toplam Alım: ${volumes.buy.toFixed(4)}, Zaman: ${timeKey}`;
                console.log(message);
                telegram.sendMessageToUser(config.userId, message)
            }
            if (volumes.sell > config.volumeThreshold) {
                const message = `Coin: ${symbol}, Toplam Satım: ${volumes.sell.toFixed(4)}, Zaman: ${timeKey}`;
                console.log(message);
                telegram.sendMessageToUser(config.userId, message)
            }
        });
    } catch (error) {
        console.error('API hatası:', error);
    }
}

async function fetchMarketData() {
    while(true) {
        for (const coin of coins) {
            await getMarketDeals(coin);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

fetchMarketData();
