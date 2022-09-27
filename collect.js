const { ethers, BigNumber } = require('ethers');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const doc = new GoogleSpreadsheet('1WMQQLnkmuLQnJ2sSUQnLj-yJh39YccfYp8HSdd4QkKc');
const creds = require("./data-collector-363809-010dcc67cd03.json")
const { abi } = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');
const ERC20ABI = require('./ERC20ABI.json')

const web3Provider = new ethers.providers.JsonRpcProvider('https://polygon-mainnet.g.alchemy.com/v2/muojdTYyYaJf-xV5w09L_uJVpXX5DNb4')

const timer = ms => new Promise(res => setTimeout(res, ms))

const token0Address = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
const token1Address = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
const poolAddress = '0x9B08288C3Be4F62bbf8d1C20Ac9C5e6f9467d8B7'
const token0Contract = new ethers.Contract(token0Address, ERC20ABI, web3Provider)
const token1Contract = new ethers.Contract(token1Address, ERC20ABI, web3Provider)
const poolContract = new ethers.Contract(poolAddress, abi, web3Provider)
const decimals0 = 18
const decimals1 = 6

function priceToTick(price) {
    val_to_log = price * 10 ** (decimals0 - decimals1)
    tick_id = Math.log(val_to_log) / Math.log(1.0001)
    return Math.round(tick_id, 0)
}

async function errCatcher(f, arguments) {
    doLoop = true
    do { 
        try {
            return await f.apply(this, arguments)
        } catch (err) {
            console.log(err)
            await timer(5000)
        }
    } while (doLoop)
}

async function getPoolState() {
    const liquidity = await poolContract.liquidity();
    const slot = await poolContract.slot0();
    const feeGrowthGlobal0X128 = await poolContract.feeGrowthGlobal0X128()
    const feeGrowthGlobal1X128 = await poolContract.feeGrowthGlobal1X128()
    const balanceToken0 = await token0Contract.balanceOf(poolAddress)
    const balanceToken1 = await token1Contract.balanceOf(poolAddress)

    return {
        liquidity: liquidity,
        sqrtPriceX96: slot[0],
        tick: slot[1],
        feeGrowthGlobal0X128: feeGrowthGlobal0X128,
        feeGrowthGlobal1X128: feeGrowthGlobal1X128,
        balanceToken0: balanceToken0,
        balanceToken1: balanceToken1
    };
}

async function collect(){
    await doc.useServiceAccountAuth(creds)
    const sheet = await doc.addSheet({ headerValues: [ 'liquidity', 'sqrtPriceX96', 'tick', 'feeGrowthGlobal0X128', 'feeGrowthGlobal1X128', 'balanceToken0', 'balanceToken1', 'UnixTime'] })

    while(true){
        let poolState = await errCatcher(getPoolState, [])
        await sheet.addRow({ liquidity: String(poolState.liquidity), sqrtPriceX96: String(poolState.sqrtPriceX96), tick: poolState.tick, feeGrowthGlobal0X128: String(poolState.feeGrowthGlobal0X128),
            feeGrowthGlobal1X128: String(poolState.feeGrowthGlobal1X128), balanceToken0: String(poolState.balanceToken0), balanceToken1: String(poolState.balanceToken1), UnixTime: Date.now() })
        await timer(30000)
    }
}

collect()