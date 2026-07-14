/* ---------- SLIME RUNES — WALLET CONNECT (MetaMask + WalletConnect) ---------- */
/* Real wallet connections:
   - Browser extension (MetaMask, Rabby, etc.) via window.ethereum
   - Mobile / any wallet via WalletConnect (QR code)
   Get a free Project ID at https://dashboard.reown.com
*/
(function(){
  const WC_PROJECT_ID = 'e725f12d78d54938fa04e77bb5b1b0de';
  const STORAGE_KEY = 'slimerunes_wallet';       // { address, type: 'injected' | 'walletconnect' }
  let wcProvider = null; // cached WalletConnect provider instance

  function shortAddr(addr){
    return addr.slice(0,6) + '…' + addr.slice(-4);
  }

  function getButtons(){
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

  function saveSession(address, type){
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ address, type }));
  }

  function clearSession(){
    localStorage.removeItem(STORAGE_KEY);
  }

  function getSession(){
    try{
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    }catch(e){
      return null;
    }
  }

  /* ---------- Choice Modal (extension vs WalletConnect) ---------- */
  function injectModalStyles(){
    if(document.getElementById('wc-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'wc-modal-styles';
    style.textContent = `
      .wc-overlay{
        position:fixed; inset:0; background:rgba(20,30,10,0.55);
        display:flex; align-items:center; justify-content:center;
        z-index:9999; padding:20px;
      }
      .wc-card{
        background:#fffdf6; border-radius:20px; padding:28px;
        max-width:340px; width:100%; text-align:center;
        font-family:'Trebuchet MS','Segoe UI',sans-serif;
        box-shadow:0 20px 60px rgba(0,0,0,0.3);
      }
      .wc-card h3{ margin-bottom:4px; color:#1f3d0f; font-size:18px; }
      .wc-card p{ color:#5a6b48; font-size:13px; margin-bottom:18px; }
      .wc-option{
        display:flex; align-items:center; gap:12px;
        width:100%; padding:14px 16px; margin-bottom:10px;
        background:#eef7db; border:1px solid #dbe9c2; border-radius:14px;
        font-weight:700; font-size:14px; color:#234015; cursor:pointer;
        text-align:left; transition:background .15s ease;
      }
      .wc-option:hover{ background:#dbe9c2; }
      .wc-option .wc-emoji{ font-size:20px; }
      .wc-close{
        margin-top:6px; background:none; border:none; color:#5a6b48;
        font-size:13px; cursor:pointer; text-decoration:underline;
      }
      .wc-qr-box{
        background:#fff; border-radius:14px; padding:14px;
        display:flex; align-items:center; justify-content:center;
        margin-bottom:14px; min-height:220px;
      }
      .wc-status{ font-size:12.5px; color:#5a6b48; }
    `;
    document.head.appendChild(style);
  }

  function openOverlay(innerHTML){
    closeOverlay();
    const overlay = document.createElement('div');
    overlay.className = 'wc-overlay';
    overlay.id = 'wcOverlay';
    overlay.innerHTML = `<div class="wc-card">${innerHTML}</div>`;
    overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeOverlay(); });
    document.body.appendChild(overlay);
    return overlay;
  }

  function closeOverlay(){
    const existing = document.getElementById('wcOverlay');
    if(existing) existing.remove();
  }

  function showChoiceModal(){
    injectModalStyles();
    const overlay = openOverlay(`
      <h3>Connect Wallet</h3>
      <p>Pilih cara connect ke Slime Runes</p>
      <div class="wc-option" id="wcOptExtension">
        <span class="wc-emoji">🦊</span> Browser Wallet (MetaMask, dll)
      </div>
      <div class="wc-option" id="wcOptWalletConnect">
        <span class="wc-emoji">📱</span> WalletConnect (scan QR / mobile)
      </div>
      <button class="wc-close" id="wcCloseBtn">Batal</button>
    `);
    overlay.querySelector('#wcOptExtension').addEventListener('click', connectExtension);
    overlay.querySelector('#wcOptWalletConnect').addEventListener('click', connectWalletConnect);
    overlay.querySelector('#wcCloseBtn').addEventListener('click', closeOverlay);
  }

  /* ---------- Path 1: Browser extension ---------- */
  async function connectExtension(){
    if(!window.ethereum){
      alert('Wallet extension gak kedetek. Install MetaMask dulu, atau pake opsi WalletConnect buat scan QR dari HP.');
      return;
    }
    try{
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if(accounts && accounts.length > 0){
        saveSession(accounts[0], 'injected');
        setConnectedUI(accounts[0]);
        closeOverlay();
      }
    }catch(err){
      if(err.code !== 4001) console.error('Extension connect error:', err);
    }
  }

  /* ---------- Path 2: WalletConnect (official modal — wallet list + QR) ---------- */
  let wcModal = null;

  async function getWcModal(){
    if(wcModal) return wcModal;
    const { WalletConnectModal } = await import('https://cdn.jsdelivr.net/npm/@walletconnect/modal@2/+esm');
    wcModal = new WalletConnectModal({
      projectId: WC_PROJECT_ID,
      chains: ['eip155:1']
    });
    return wcModal;
  }

  async function getWcProvider(){
    if(wcProvider) return wcProvider;
    const { EthereumProvider } = await import('https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2/+esm');
    wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      optionalChains: [1], // Ethereum mainnet; add more chain IDs if needed
      showQrModal: false,  // we drive @walletconnect/modal manually below
      metadata: {
        name: document.title || 'Slime Runes',
        description: 'a fantasy meme project',
        url: window.location.origin,
        icons: [window.location.origin + '/assets/overview/slimelogo.png']
      }
    });

    wcProvider.on('accountsChanged', (accounts)=>{
      if(!accounts || accounts.length === 0){
        clearSession();
        setDisconnectedUI();
      }else{
        saveSession(accounts[0], 'walletconnect');
        setConnectedUI(accounts[0]);
      }
    });
    wcProvider.on('disconnect', ()=>{
      clearSession();
      setDisconnectedUI();
    });

    return wcProvider;
  }

  async function connectWalletConnect(){
    closeOverlay(); // close our own choice modal; the official WalletConnectModal takes over
    try{
      const [provider, modal] = await Promise.all([getWcProvider(), getWcModal()]);

      provider.on('display_uri', (uri)=>{
        modal.openModal({ uri });
      });

      await provider.connect();
      modal.closeModal();

      const accounts = provider.accounts;
      if(accounts && accounts.length > 0){
        saveSession(accounts[0], 'walletconnect');
        setConnectedUI(accounts[0]);
      }
    }catch(err){
      if(wcModal) wcModal.closeModal();
      console.error('WalletConnect error:', err);
      if(err && err.message && err.message.toLowerCase().includes('user rejected')){
        // user closed the modal / rejected — no need to alert
        return;
      }
      alert('Gagal connect via WalletConnect. Coba lagi ya.');
    }
  }

  /* ---------- Disconnect ---------- */
  async function disconnectWallet(){
    const session = getSession();
    if(session && session.type === 'walletconnect' && wcProvider){
      try{ await wcProvider.disconnect(); }catch(e){ /* ignore */ }
    }
    clearSession();
    setDisconnectedUI();
  }

  /* ---------- Session restore on page load ---------- */
  async function restoreSession(){
    const session = getSession();
    if(!session) return;

    if(session.type === 'injected' && window.ethereum){
      try{
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if(accounts && accounts.length > 0 && accounts[0].toLowerCase() === session.address.toLowerCase()){
          setConnectedUI(accounts[0]);
        }else{
          clearSession();
        }
      }catch(e){ clearSession(); }
    }else if(session.type === 'walletconnect'){
      // Optimistically show as connected; provider re-inits lazily on next action.
      setConnectedUI(session.address);
    }
  }

  function handleClick(){
    const session = getSession();
    if(session){
      if(confirm('Disconnect wallet?')) disconnectWallet();
    }else{
      showChoiceModal();
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
        const session = getSession();
        if(!session || session.type !== 'injected') return;
        if(accounts.length === 0){
          clearSession();
          setDisconnectedUI();
        }else{
          saveSession(accounts[0], 'injected');
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
