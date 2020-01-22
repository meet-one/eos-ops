#!/usr/bin/env node

/**
 * @author UMU618 <umu618@hotmail.com>
 * @copyright MEET.ONE 2019
 * @description Use block-always-using-brace npm-coding-style.
 * #editor.tabSize: 2
 */

'use strict'

const pkg = require('./package.json')
const fetch = require('node-fetch')
const bpContacts = require('./bp-contacts.json')
const BLOCK_TIME = 500
const BLOCKS_PER_BP = 12
const BASE_URL = (new URL(pkg.bp_monitor.url)).origin

function sendAlarm(text) {
  console.log(text)

  if (pkg.bp_monitor.alarm_type == 'telegram') {
    fetch('https://api.telegram.org/bot' + pkg.bp_monitor.telegram.token
      + '/sendMessage?' + require('querystring').stringify({
        chat_id: pkg.bp_monitor.telegram.chat_id, text: text
      }), { method: 'POST' })
      .then(function (res) {
        if (res.ok) {
          console.log('Telegram message sent!')
        } else {
          console.log('status = ' + res.status)
        }
      }, function (e) {
        console.log(e)
      })
  } else if (pkg.bp_monitor.alarm_type == 'dingtalk') {
    fetch('https://oapi.dingtalk.com/robot/send?access_token='
      + pkg.bp_monitor.dingtalk.token, {
        method: 'POST'
        , headers: {
          'Content-Type': 'application/json'
        }
        , body: JSON.stringify({
          "msgtype": "text"
          , "text": {
            "content": text
          }
        })
      })
      .then(function (res) {
        if (res.ok) {
          console.log('Dingtalk message sent!')
        } else {
          console.log('status = ' + res.status)
        }
      }, function (e) {
        console.log(e)
      })
  } else {
    // nothing
  }
}

function getBlockHeaderState(blockNum) {
  fetch(BASE_URL + '/v1/chain/get_block_header_state', {
    method: 'POST'
    , headers: {
      'Content-Type': 'application/json'
    }
    , body: JSON.stringify({"block_num_or_id": blockNum})
  })
  .then(function (res) {
    if (res.ok) {
      return res.json()
    } else {
      console.log('getBlockHeaderState() status = ' + res.status)
      return null
    }
  }, function (e) {
    console.error(e)
  })
  .then((jo) => {
    if (jo) {
      checkSchedule(jo)
    } else {
      console.error('no JSON.')
    }
  })
}

let lastHeadBlockProducer = ''

function checkHeadBlock() {
  fetch(BASE_URL + '/v1/chain/get_info', {method: 'POST'})
    .then((res) => {
      if (res.ok) {
        return res.json()
      } else {
        console.log('get_info() status = ' + res.status)
        return null
      }
    }, (e) => {
      console.error(e)
    })
    .then((jo) => {
      if (jo) {
        if (lastHeadBlockProducer != jo.head_block_producer) {
          // Avoid needless duplication
          lastHeadBlockProducer = jo.head_block_producer
          getBlockHeaderState(jo.head_block_num)
        }
      } else {
        console.error('no JSON.')
      }
    })
}

setInterval(checkHeadBlock, BLOCK_TIME * BLOCKS_PER_BP)

function getCurrentProducer(producers, block_num) {
  for (let i = 0; i < producers.length; ++i) {
    if (producers[i][1] == block_num) {
      return i
    }
  }
  throw new Error('Producer not found!')
}

function getProducer(producers, i) {
  if (i < 0) {
    i += producers.length
  } else if (i >= producers.length) {
    i -= producers.length
  }
  return producers[i]
}

function quantify(num, quantifier) {
  if (num > 1) {
    return num + ' ' + quantifier + 's'
  }
  return num + ' ' + quantifier
}

function getActiveProducers(state) {
  if (state.producer_to_last_produced.length
    == state.producer_to_last_implied_irb.length) {
    return state.producer_to_last_produced
  } else {
    let producers = []
    let j = 0
    for (let i = 0; i < state.producer_to_last_produced.length; ++i) {
      if (state.producer_to_last_produced[i][0]
        == state.active_schedule.producers[j].producer_name) {
        producers.push(state.producer_to_last_produced[i])
        ++j
      } else {
        // 2019-06-30, eosiosg.m 掉出前 21 名后，还一直存在于 producer_to_last_produced
        //console.log(state.producer_to_last_produced[i][0])
      }
    }
    return producers
  }
}

function checkSchedule(state) {
  let producers = getActiveProducers(state)
  let currentProducer = getCurrentProducer(producers, state.block_num)

  // check producers that lost all blocks
  let failedCount = 0
  let cp = currentProducer
  for (let i = 0; i < producers.length; ++i) {
    let lp = (cp == 0) ? producers.length - 1 : cp - 1
    if (producers[currentProducer][1] - producers[lp][1]
      > BLOCKS_PER_BP * (i + 1)) {
      ++failedCount
    } else {
      break
    }
    cp = lp
  }
  if (failedCount > 0) {
    let lastOk = getProducer(producers, currentProducer - failedCount - 1)
    let message = lastOk[0] + ' last produced ' + lastOk[1] + '.\n'
    for (let i = failedCount; i > 0; --i) {
      cp = getProducer(producers, currentProducer - i)
      message += cp[0] + ' missed 12 blocks, last produced ' + cp[1] + '.\n'
      if (bpContacts[cp[0]]) {
        meessage += bpContacts[cp[0]] + '\n'
      }
    }
    message += 'Next is ' + producers[currentProducer][0] + ' from block '
      + (lastOk[1] + 1) + '.'
    sendAlarm(message)
  } else {
    let lastProducer = (currentProducer == 0) ? producers.length - 1
      : currentProducer - 1
    let beforeLastProducer = (lastProducer == 0) ? producers.length - 1
      : lastProducer - 1
    let diff = producers[lastProducer][1] - producers[beforeLastProducer][1]
    if (diff < BLOCKS_PER_BP) {
      const message = producers[lastProducer][0] + ' ['
        + (producers[beforeLastProducer][1] + 1) + ', '
        + producers[lastProducer][1] + '] missed '
        + quantify(BLOCKS_PER_BP - diff, 'block') + '. Next is '
        + producers[currentProducer][0] + ' from block '
        + (producers[lastProducer][1] + 1) + '.\n'
      if (bpContacts[producers[lastProducer][0]]) {
        meessage += bpContacts[producers[lastProducer][0]]
      }
      sendAlarm(message)
    }
  }
}
