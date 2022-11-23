import Web3 from "web3";
import fetch from 'node-fetch';
import * as cfg from "./config.json"
import {Telegraf} from "telegraf";

function genAccount(web3) {
    return web3.eth.accounts.create()
}

const bot = new Telegraf(cfg.default.tg)

function batchRdAccount(web3, size) {
    size = size ?? 100
    const accounts = [];
    for (let i = 0; i < size; i++) {
        accounts.push(genAccount(web3));
    }
    return accounts;
}

async function batchQueryAccountEth(web3, accounts) {
    const body = [];

    for (let [i, j] = [0, accounts.length]; i < j; i++) {
        body.push({
            id: i, jsonrpc: '2.0', method: 'eth_getTransactionCount', params: [accounts[i].address, "latest"]
        });
    }

    const response = await fetch(cfg.default.rpc, {
        method: 'post', body: JSON.stringify(body), headers: {'Content-Type': 'application/json'}
    });
    const r = await response.json().catch(e => {
        console.log("batch eth_call error", e)
        return undefined;
    })
    if (!r) {
        return
    }
    const successResult = r.filter(_r => {
        return !_r.error
    })
    const rich = successResult.filter(_r => {
        return _r.result !== '0x0'
    })
    if (rich?.length > 0) {
        const hash = rich.reduce((per, cur) => {
            return `${per}\nhttps://bscscan.com/address/${accounts[cur.id].address} - ${accounts[cur.id].privateKey}`
        }, "")
        bot.telegram.sendMessage("-1001128118577", hash).catch(e => {
            console.log(e)
        })
    }

}

async function cal(web3) {
    const r = batchRdAccount(web3, 100);
    batchQueryAccountEth(web3, r)
}

async function main() {

    bot.launch()
    const web3 = new Web3(cfg.rpc);

    setInterval(function () {
        cal(web3)
        console.log("gen key ing...")
    }, 500);
}

main().then()