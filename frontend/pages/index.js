import { BigNumber, providers, utils } from "ethers";
import Head from "next/head";
import React, {useEffect, useRef, useState} from "react";
import Web3Modal from "web3modal";
import styles from "../styles/Home.module.css";
import { addLiquidity, calculateCD } from "../utils/addLiquidity";
import {
  getCDTokensBalance,
  getEtherBalance,
  getLPTokensBalance,
  getReserveOfCDTokens
} from "../utils/getAmounts";
import {
  getTokensAfterRemove,
  removeLiquidity
} from "../utils/removeLiquidity"
import { swapTokens, getAmountOfTokensReceivedFromSwap } from "../utils/swap";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [liquidityTab, setLiquidityTab] = useState(true);
  const zero = BigNumber.from(0);
  const [ethBalance, setEthBalance] = useState(zero);
  const [reservedCD, setReservedCD] = useState(zero);
  const [etherBalanceContract, setEtherBalanceContract] = useState(zero);
  const [cdBalance, setCdBalance] = useState(zero);
  const [lpBalance, setLpBalance] = useState(zero);
  
  // Variables to keep track of liquidity to be added or removed
  const [addEther, setAddEther] = useState(zero);
  const [addCDTokens, setAddCDTokens] = useState(zero);
  const [removeEther, setRemoveEther] = useState(zero);
  const [removeCD, setRemoveCD] = useState(zero);
  const [removeLPTokens, setRemoveLPTokens] = useState(zero);

  // Variables to keep track of Swap functionality
  const [swapAmount, setSwapAmount] = useState(zero);
  const [tokenToBeReceivedAfterSwap, setTokenToBeReceivedAfterSwap] = useState(zero);
  const [ethSelected, setEthSelected] = useState(zero);

  const web3ModelRef = useRef();
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(()=> {
    if (!walletConnected) {
      web3ModelRef.current = new Web3Modal({
        network:"rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getAmounts();
    }
  }, [walletConnected])

  const getAmounts = async() => {
    try{
      const provider = await getProviderOrSigner();
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();

      const _ethBalance = await getEtherBalance(provider, address)
      setEthBalance(_ethBalance)
      const _cdBalance = await getCDTokensBalance(provider, address);
      setCdBalance(_cdBalance)
      const _lpBalance = await getLPTokensBalance(provider, address);
      setLpBalance(_lpBalance)
      const _reserveCD = await getReserveOfCDTokens(provider);
      setReservedCD(_reserveCD)
      const _ethBalanceContract = await getEtherBalance(provider, null, true);
      setEtherBalanceContract(_ethBalanceContract)
    }catch(err){
      console.error(err);
    }
  }

  const _addLiquidity = async() => {
    try{
      const addEtherWei = utils.parseEther(addEther.toString());
      if(!addCDTokens.eq(zero) && !addEtherWei.eq(zero)) {
        const signer = await getProviderOrSigner(true);
        setLoading(true);
        await addLiquidity(signer, addCDTokens, addEtherWei);
        setLoading(false);
        setAddCDTokens(zero);
        await getAmounts();
      } else {
        setAddCDTokens(zero);
      }
    }catch(err){
      console.error(err)
    }
  }

  const _removeLiquidity = async() => {
    try{
      const signer = await getProviderOrSigner(true);
      const removeLPTokensWei = utils.parseEther(removeLPTokens);
      setLoading(true);
      await removeLiquidity(signer, removeLPTokensWei);
      setLoading(false);
      await getAmounts();
      setRemoveCD(zero);
      setRemoveEther(zero);
    }catch(err){
      console.error(err)
      setLoading(false);
      setRemoveCD(zero)
      setRemoveEther(zero)
    }
  }

  const _getTokensAfterRemove = async(_removeLPTokens) => {
    try{
      const provider = await getProviderOrSigner();
      const removeLPTokenWei = utils.parseEther(_removeLPTokens)
      const _ethBalance = await getEtherBalance(provider, null, true);
      const cryptoDevTokenReserve = await getReserveOfCDTokens(provider);
      const {_removeEther, _removeCD} = await getTokensAfterRemove(
        provider,
        removeLPTokenWei,
        _ethBalance,
        cryptoDevTokenReserve
      )
      setRemoveEther(zero);
      setRemoveCD(zero);
    }catch(err){
      console.error(err)
    }
  }

  const getProviderOrSigner = async(needSigner = false) => {
    const provider = await web3ModelRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const {chainId} = await web3Provider.getNetwork();
    if (chainId != 4) {
      window.alert("Change network to rinkeby");
      throw new Error("Change network to rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  }

  const connectWallet = async() => {
    try{
      await getProviderOrSigner();
      setWalletConnected(true);
    }catch(err){
      console.error(err);
    }
  }

  const renderButton = () => {
    if (!walletConnected) {
      return(
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      )
    }

    if(loading) {
      return <button className={styles.button}>Loading...</button>
    }

    if (liquidityTab) {
      return (
        <div>
          <div className={styles.description}>
            You have:
            <br />
            {utils.formatEther(cdBalance)} Crypto Dev Tokens
            <br />
            {utils.formatEther(ethBalance)} Ether
            <br />
            {utils.formatEther(lpBalance)} Crypto Dev LP Tokens
          </div>
          <div>
            {utils.parseEther(reservedCD.toString()).eq(zero) ? (
              <div>
                <input 
                  type={"number"}
                  placeholder="Amount of ether"
                  onChange={(e) =>  setAddEther(e.target.value || "0")}
                  className={styles.input}
                  />
                <input 
                  type={"number"}
                  placeholder="Amount of CryptoDev Tokens"
                  onChange={(e) =>  setAddCDTokens(BigNumber.from(utils.parseEther(e.target.value || "0")))}
                  className={styles.input}
                  />
                  <button className={styles.button} onClick={_addLiquidity}>
                    Add
                  </button>
              </div>
            ):(
              <div>
                <div>
                  <input
                    type={"number"}
                    placeholder="Amount of Ether"
                    onChange={async(e) => {
                      setAddEther(e.target.value || "0");
                      const _addCDTokens = await calculateCD(
                        e.target.value || "0",
                        etherBalanceContract,
                        reservedCD
                      )
                      setAddCDTokens(_addCDTokens)
                    }}
                    className={styles.input}
                    />
                    <div className={styles.inputDiv}>
                      {`You will need ${utils.formatEther(addCDTokens)} Crypto Dev Tokens`}
                    </div>
                    <button className={styles.button}>
                      Add
                    </button>
                </div>
                <div>
                  <input 
                    type={"number"}
                    placeholder="Amount of LP tokens"
                    onChange={async(e)=> {
                      setRemoveLPTokens(e.target.value || "0")
                      await _getTokensAfterRemove(e.target.value || "0")
                    }}
                    className={styles.input}
                    />
                  <div className={styles.inputDiv}>
                    {`You will get ${utils.formatEther(removeCD)} CryptoDev Tokens and 
                      ${utils.formatEther(removeEther)} Eth}`}
                  </div>
                  <button className={styles.button} onClick={_removeLiquidity}>
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }
  }
  return (
    <div>
      <Head>
        <title>Crypt Devs</title>
        <meta name="description" content="Defi-Exchange" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}> Welcome to Crypto Devs Exchange</h1>
          <div className={styles.description}>
            Exchange Ethereum &#60;&#62; Crypto Dev Tokens
          </div>
          <div>
            <button className={styles.button}
            onClick={()=> {
              console.log("set liquidity tab button")
            }}>
              Liquidity
            </button>
            <button className={styles.button}
            onClick={()=> {
              console.log("set swap tab button")
            }}>
              Swap
            </button>
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodev.svg"/>
        </div>
      </div>
      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  )
}