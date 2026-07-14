/* ---------- SLIME RUNES — WALLET CONNECT (Reown AppKit) ---------- */
/* Full wallet modal: detects installed browser extensions (MetaMask, Rabby, etc.)
   AND supports WalletConnect (QR / mobile) — all in one modal, like flap.sh.
   Project ID from https://dashboard.reown.com
*/
(function(){
  const WC_PROJECT_ID = 'e725f12d78d54938fa04e77bb5b1b0de';
  let modal = null;
  let readyPromise = null;

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

  async function initAppKit(){
    if(readyPromise) return readyPromise;

    readyPromise = (async () => {
      const [
        { createAppKit },
        { EthersAdapter },
        { mainnet }
      ] = await Promise.all([
        import('https://cdn.jsdelivr.net/npm/@reown/appkit/+esm'),
        import('https://cdn.jsdelivr.net/npm/@reown/appkit-adapter-ethers/+esm'),
        import('https://cdn.jsdelivr.net/npm/@reown/appkit/networks/+esm')
      ]);

      modal = createAppKit({
        adapters: [new EthersAdapter()],
        networks: [mainnet],
        projectId: WC_PROJECT_ID,
        metadata: {
          name: document.title || 'Slime Runes',
          description: 'a fantasy meme project',
          url: window.location.origin,
          icons: [window.location.origin + '/assets/overview/slimelogo.png']
        },
        features: {
          analytics: false,
          email: false,
          socials: false
        }
      });

      modal.subscribeAccount((account)=>{
        if(account && account.isConnected && account.address){
          setButtonState(shortAddr(account.address), true);
        }else{
          setButtonState('connect wallet', false);
        }
      });

      return modal;
    })();

    return readyPromise;
  }

  async function handleClick(){
    setButtonState('loading…', false);
    try{
      const m = await initAppKit();
      m.open(); // AppKit shows connect flow OR account/disconnect view automatically
      // restore correct label once modal is ready (in case "loading…" got stuck)
      const acc = m.getAccount ? m.getAccount() : null;
      if(acc && acc.isConnected && acc.address){
        setButtonState(shortAddr(acc.address), true);
      }else{
        setButtonState('connect wallet', false);
      }
    }catch(err){
      console.error('AppKit load error:', err);
      setButtonState('connect wallet', false);
      alert('Gagal load wallet connect. Cek koneksi internet / reload halaman.');
    }
  }

  function init(){
    getButtons().forEach(btn=>{
      btn.addEventListener('click', function(e){
        e.preventDefault();
        handleClick();
      });
    });
    // Pre-load AppKit in the background so the first click is instant
    // and so we can restore session state (connected wallets persist automatically).
    initAppKit().catch(err => console.error('AppKit preload error:', err));
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
