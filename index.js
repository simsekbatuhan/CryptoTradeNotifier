const WebSocket = require('ws');
const axios = require('axios');
const db = require("croxydb");

db.setFolder("./database");

const config = require('./config');
const telegram = require('./telegram');

const wsUrl = 'wss://contract.mexc.com/edge';
let ws;

let coinVolumes = {}; 

var mexcSymbolDetails;

async function getCoinPrecision(symbol) {
    try {
        const coinInfo = mexcSymbolDetails.find(coin => coin.symbol === symbol);

        if (coinInfo) {
            return {
                contractSize: coinInfo.contractSize,
                amountScale: coinInfo.amountScale
            };
        }
        return null;
    } catch (error) {
        console.error('Hassasiyet bilgisi alınırken hata:', error);
        return null;
    }
}

async function connectWebSocket() {
    const response = await axios.get("https://contract.mexc.com/api/v1/contract/detail");
    mexcSymbolDetails = response.data.data.filter(symbol => symbol.symbol.includes("USDT"));

    ws = new WebSocket(wsUrl);

    ws.on('open', function open() {
        console.log('WebSocket connection opened.');
        const list = db.get("ignoredCoins");

        for (let coin of mexcSymbolDetails.map(symbol => symbol.symbol)) {
            if (list.includes(coin)) continue;
            ws.send(JSON.stringify({
                method: "sub.deal",
                param: { symbol: coin },
            }));
        }
    });

    ws.on('message', async function message(data) {
        const parsedData = JSON.parse(data);
        
        if (parsedData && parsedData.data) {
            const list = db.get("ignoredCoins");
            const symbol = parsedData.symbol;

            if (list.includes(symbol)) return;

            const precisionInfo = await getCoinPrecision(symbol);
            if (!precisionInfo) {
                console.error(`Hassasiyet bilgisi bulunamadı: ${symbol}`);
                return;
            }

            const { contractSize } = precisionInfo;
            const tradeType = parsedData.data.T === 1 ? 'buy' : 'sell';
            const price = parsedData.data.p; 
            const volume = parsedData.data.v * contractSize; 
            const volumeInUSDT = price * volume;

            const currentTime = new Date().toLocaleTimeString('tr-TR');

            if (!coinVolumes[symbol]) {
                coinVolumes[symbol] = {};
            }

            if (!coinVolumes[symbol][currentTime]) {
                coinVolumes[symbol][currentTime] = { buy: 0, sell: 0 };
            }

            coinVolumes[symbol][currentTime][tradeType] += volumeInUSDT;

            setTimeout(() => {
                const newTime = new Date().toLocaleTimeString('tr-TR');
                
                if (newTime !== currentTime) {
                    const accumulatedVolume = coinVolumes[symbol][currentTime];

                    if (accumulatedVolume) {
                        if (accumulatedVolume.buy > config.volumeThreshold) {
                            const message = `${currentTime} - ${symbol} Toplam Alış: ${accumulatedVolume.buy.toFixed(2)} USDT`;
                            console.log(message);
                            telegram.sendMessageToUser(config.userId, message);
                        }

                        if (accumulatedVolume.sell > config.volumeThreshold) {
                            const message = `${currentTime} - ${symbol} Toplam Satış: ${accumulatedVolume.sell.toFixed(2)} USDT`;
                            console.log(message);
                            telegram.sendMessageToUser(config.userId, message);
                        }

                        delete coinVolumes[symbol][currentTime];
                    }
                }
            }, 1000);
        }
    });

    ws.on('close', function close() {
        console.log('WebSocket connection closed. Reconnecting...');
        reconnectWebSocket();
    });

    ws.on('error', function error(err) {
        console.error('WebSocket error:', err);
        ws.close();
    });
}

function reconnectWebSocket() {
    setTimeout(() => {
        console.log('Reconnecting WebSocket...');
        connectWebSocket();
    }, 1000); 
}

connectWebSocket();
