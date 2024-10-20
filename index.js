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

            if (groupedDeals[timeKey]) {
                groupedDeals[timeKey].volume += parseFloat(volume);
            } else {
                groupedDeals[timeKey] = {
                    price: price,
                    volume: parseFloat(volume),
                    time: timeKey
                };
            }
        });
        
        Object.values(groupedDeals).forEach(group => {
            if (group.volume > 1) {
                telegram.sendMessageToUser(config.userId, `Coin: ${symbol}, Fiyat: ${group.price}, Toplam Miktar: ${group.volume.toFixed(amountScale)}, Zaman: ${group.time}`)
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
