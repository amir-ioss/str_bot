// JavaScript
const log = require('./log')
const ohlcvs = require('./ohlcvs.json')
const {
  ohlcvs_gen,
  ohlcvs_gen_test,
  percDiff,
  getBySelSupport,
  Line,
  getProfit,
  getTime,
  timeDiff,
} = require('./fun_')

const ohlcvs_ = [
  [1657652400000, 0.0403, 0.0404, 0.0401, 0.0402, 41396.4],
  [1657653300000, 0.0403, 0.0403, 0.0401, 0.0401, 124476.3],
  [1657654200000, 0.0401, 0.0403, 0.0401, 0.0411, 70640.4],
  [1657655100000, 0.0401, 0.0406, 0.0401, 0.0403, 116042.5],
  [1657656000000, 0.0403, 0.0404, 0.0401, 0.0404, 48936.5],
  [1657656900000, 0.0404, 0.0404, 0.0403, 0.0413, 28672.1],
  [1657657800000, 0.0405, 0.0408, 0.0405, 0.0406, 49776.2],
  [1657658700000, 0.0405, 0.0405, 0.0402, 0.0405, 68214.8],
]

var key = 0
var backTestDelay = 10 // 700

var config = {
  _percDiff: 1, // 100%
  _stopLoss: 2.5, // 100%
  bearingLossOnCoin : 0.050, // 5rs
  bearingLoss : 0.13, // 10rs
  backSupport: 3,
  invest: 12,
  inr : 79.67
}

var totalPricePercDiffBuy = 0
var totalPricePercDiffSell = 0
var left = true // left (buy), right (sell)
var isShowBuy = false
var isShowSell = false
var lastBuySell = [0, 0]
var buySell = [[], []]
var buyTime = null
var trend = 0
var superLow = 0
var totalLoss = 0 


var periodProf = [0, 0]
var skip = true

var prevSupports = []

var is_place_order = false
var orderDetails = {
  buy_price: 0,
  sell_price: 0,
}
var final = []


const bot = () => {
  setTimeout(() => {
    // for (const key in ohlcvs) {
    const k = ohlcvs[key]
    const kp = ohlcvs[key - 1] ? ohlcvs[key - 1] : ohlcvs[0]
    const close = k[4]
    var date = getTime(k[0])

    // buySell[0].push(close)

    // if (key > 1) {
    var isBull = close > kp[4]
    var pricePercDiff = percDiff(close, kp[4]).toFixed(1)
    var buyersSupport = getBySelSupport(k[1], k[2], k[3], close)

    left = isBull

    //  /////////////////////// %

    if (left) {
      totalPricePercDiffBuy += parseFloat(pricePercDiff)
    } else {
      totalPricePercDiffBuy = 0
    }

    if (!left) {
      totalPricePercDiffSell += parseFloat(pricePercDiff)
    } else {
      totalPricePercDiffSell = 0
    }

    if (key > config.backSupport) {
      for (let index = 0; index < config.backSupport; index++) {
        prevSupports[index] = getBySelSupport(
          ohlcvs[key - index][1],
          ohlcvs[key - index][2],
          ohlcvs[key - index][3],
          ohlcvs[key - index][4],
        )
          ? 1
          : 0
      }
    }



    if((superLow - -0.5) < trend ){
      // console.log(date[1], "catch", (superLow - -0.5) , '<',trend);
      // log(date[1], '~grn', "catch", '0.5% price increased');
      superLow = trend
      skip = false
     
    }

    // exit from trade when stoploss(%) match 
    if(is_place_order){
      price_perc_diff_after_buy = percDiff(close, orderDetails.buy_price).toFixed(1)
      // log(Math.abs((close - orderDetails.buy_price)*config.invest) > config.bearingLossOnCoin  ? '~rd': '~grn', Math.abs((close - orderDetails.buy_price)*config.invest))
      if(close < orderDetails.buy_price && Math.abs(getProfit(close , orderDetails.buy_price)) > config.bearingLossOnCoin){
        sell()
        totalLoss += getProfit(close,orderDetails.buy_price)
        log( config.bearingLossOnCoin, '>' , totalLoss," : stoploss exit ")
     }
    }


    // BUY
    if (!is_place_order 
      && !skip 
      && left && !isShowBuy 
      && lastBuySell[0] > config._percDiff) {
    buy()
    }
    isShowBuy = true
    if (!left) isShowBuy = false

    // SELL
    if (is_place_order && !left && !isShowSell && lastBuySell[1] > config._percDiff) {
     sell()
    }
    isShowSell = true
    if (left) isShowSell = false

    lastBuySell[0] = isBull ? totalPricePercDiffBuy : totalPricePercDiffSell
    lastBuySell[1] = isBull ? totalPricePercDiffBuy : totalPricePercDiffSell

    buySell[left ? 0 : 1].push(close)

    var new_trend = isBull ? trend+parseFloat(pricePercDiff) : trend-parseFloat(pricePercDiff)
    superLow = new_trend <= superLow ? new_trend : superLow  
    trend = new_trend

    // OUT
    1 &&
      log(
        '~cyn',
        date[1],
        close,
        isBull ? '~b_grn' : '~b_rd',
        pricePercDiff + '%',
        // "~wt",
        // "|",
        // isBull ? totalPricePercDiffBuy : totalPricePercDiffSell,
        '~reset',
        buyersSupport ? '~grn' : '~rd',
        prevSupports.length > 1 && Line(prevSupports.reduce((a, b) => a + b)),
        // lastBuySell[1].toFixed(1) + '%',
        trend > 0 ? '~grn' : '~rd',
        trend.toFixed(1)+'%',
        '~bl',
        superLow.toFixed(1)+'%',
        '~reset',
        // is_place_order && percDiff(close, orderDetails.buy_price).toFixed(1)+'%',
        is_place_order ? "ls "+totalLoss.toFixed(3) : '', 
      )

    // }
    // }

    function buy() {
        buySell = [[], []]

        log(
          '~b_bk',
          '                  ' + close,
          '~b_bl',
          lastBuySell[0].toFixed(1) + '%',
          '~b_rd',
          skip ? '__skip__' : 'enter',
        )

      if(!is_place_order)buyTime= k[0]
      is_place_order = true
      skip = true
      if (is_place_order) {
        orderDetails.buy_price = close  
      }

    }
    function sell() {
      log(
        '~b_bk',
        '                  ' + close,
        '~b_bl',
        lastBuySell[1].toFixed(1) + '%',
        '~b_grn',
        skip ? '__skip__' : 'exit',
      )

      if (is_place_order) {
        var buyTime_ = getTime(buyTime)
        var sellTime_ = getTime(k[0])
        // console.log("---------------",buyTime, sellTime_[2]);
        orderDetails.sell_price = close
        orderDetails.profit = getProfit(orderDetails.buy_price, close)
        // orderDetails.inrProfit= getProfit(undefined,  orderDetails.buy_price, close).toFixed(3)
        orderDetails.inrProfit = getProfit(orderDetails.buy_price, close)*config.inr
        orderDetails.date_time = date[0] + ' ' + date[1]
        orderDetails.hold_time = timeDiff(buyTime_[2], sellTime_[2])

        console.log(orderDetails)
        final.push(orderDetails.inrProfit)
        trend = 0
      }
      is_place_order = false
    }

    key++

    if (key < ohlcvs.length) {
      if(Math.abs(totalLoss) > config.bearingLoss){
        log('~b_rd',
          'TOTAL LOSS :(',
          final.reduce((a, b) => a + b)+'',
        )
      }else{
        bot()
      }
    } else {
      if(ohlcvs.length > 0)log('~b_yl',  "start", ohlcvs[0][4]+'', "end", ohlcvs[ohlcvs.length -1][4]+'');
      final.length > 0
        ? log(
            'day total profil on one coin :)',
            final.reduce((a, b) => a + b),
          )
        : log('no chances! :('+ is_place_order &&'can"t exit!!! :(')
    }

  }, backTestDelay)
}

// RAMP   41.964 

// ["NEAR", "DOT", "XLM", "FTT", "ALGO", "TRX", "UNI", "AAVE", "BTC", "DOGE", "MATIC", "FLOW" ]
ohlcvs_gen_test('RAMP',bot);
// bot()

// log('~b_mgnta', ((ohlcvs.length * 3) / 60 / 24).toFixed(), 'days kandles')
