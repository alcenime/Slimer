/* ---------- SLIME RUNES — WALLET CONNECT (EVM / MetaMask) ---------- */
(function(){
  const STORAGE_KEY = 'slimerunes_wallet';

  function shortAddr(addr){
    return addr.slice(0,6) + '…' + addr.slice(-4);
  }

  function getButtons(){
    // supports multiple buttons on a page (e.g. desktop navbar + mobile menu)
    return document.querySelectorAll('[data-wallet-btn]');
  }

  function setButtonState(text, connected){
    getButtons().forEach(btn=>{
      btn.textContent = text;
      btn.classList.toggle('wallet-connected', !!connected);
    });
  }

  function setDisconnectedUI(){
    setButtonState('connect wallet', false);
  }

  function setConnectedUI(address){
    setButtonState(shortAddr(address), true);
  }

  async function connectWallet(){
    if(!window.ethereum){
      alert('Wallet gak kedetek. Install MetaMask (atau wallet EVM lain) dulu ya.');
      window.open('https://metamask.io/download', '_blank');
      return;
    }
    try{
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if(accounts && accounts.length > 0){
        localStorage.setItem(STORAGE_KEY, accounts[0]);
        setConnectedUI(accounts[0]);
      }
    }catch(err){
      if(err.code === 4001){
        console.log('User menolak konek wallet.');
      }else{
        console.error('Wallet connect error:', err);
      }
    }
  }

  function disconnectWallet(){
    localStorage.removeItem(STORAGE_KEY);
    setDisconnectedUI();
  }

  async function restoreSession(){
    const saved = localStorage.getItem(STORAGE_KEY);
    if(!saved || !window.ethereum) return;
    try{
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if(accounts && accounts.length > 0 && accounts[0].toLowerCase() === saved.toLowerCase()){
        setConnectedUI(accounts[0]);
      }else{
        localStorage.removeItem(STORAGE_KEY);
      }
    }catch(err){
      console.error('Wallet restore error:', err);
    }
  }

  function handleClick(){
    const isConnected = localStorage.getItem(STORAGE_KEY);
    if(isConnected){
      if(confirm('Disconnect wallet?')) disconnectWallet();
    }else{
      connectWallet();
    }
  }

  function init(){
    getButtons().forEach(btn=>{
      btn.addEventListener('click', function(e){
        e.preventDefault();
        handleClick();
      });
    });
    restoreSession();

    if(window.ethereum){
      window.ethereum.on && window.ethereum.on('accountsChanged', (accounts)=>{
        if(accounts.length === 0){
          disconnectWallet();
        }else{
          localStorage.setItem(STORAGE_KEY, accounts[0]);
          setConnectedUI(accounts[0]);
        }
      });
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
