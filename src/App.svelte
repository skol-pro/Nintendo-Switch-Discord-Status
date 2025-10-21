<script>
  import { onMount } from 'svelte';
  import About from './About.svelte';
  import CustomSelect from './CustomSelect.svelte';

  const electron = window.require('electron');
  const { ipcRenderer } = electron;
  const gameData = window.require('../games.json');
  const version = window.require('../package.json').version;

  const home = gameData.filter(e => e.name === 'Home')[0];
  const custom = gameData.filter(e => e.name === 'Custom')[0];
  
  // Start with fallback games from games.json
  let games = gameData.filter(e => e.name !== 'Home' && e.name !== 'Custom');
  games.sort();
  games.unshift(custom);
  games.unshift(home);

  let selectedGame = home.name;
  let statusMessage = '';
  let customGameName = '';
  let clicks = 0;
  let showAbout = false;
  let isLoadingPopular = true;
  let gameSearchResults = [];
  let persistedCoverUrl = null;
  let isIdle = false;
  let submitAnimating = false;
  let idleAnimating = false;

  // Load persisted game selection from localStorage
  const persistedGame = localStorage.getItem('lastSelectedGame');
  const persistedCover = localStorage.getItem('lastSelectedCover');
  const persistedStatus = localStorage.getItem('lastStatusMessage');
  const persistedCustomName = localStorage.getItem('lastCustomGameName');
  
  if (persistedGame) {
    selectedGame = persistedGame;
  }
  if (persistedCover) {
    persistedCoverUrl = persistedCover;
  }
  if (persistedStatus) {
    statusMessage = persistedStatus;
  }
  if (persistedCustomName) {
    customGameName = persistedCustomName;
  }

  // Handle Escape key to close modal
  function handleKeydown(event) {
    if (event.key === 'Escape' && showAbout) {
      showAbout = false;
    }
  }

  // Get current game cover for display
  $: currentGameData = games.find(g => g.name === selectedGame) 
                    || gameSearchResults.find(g => g.name === selectedGame);
  // Don't show cover for Custom game
  $: coverImage = selectedGame === 'Custom' ? null : (currentGameData?.cover_url || persistedCoverUrl || null);
  
  // Persist selected game and resize window when Custom is selected
  $: {
    // Save game name and cover URL to localStorage whenever selection changes
    localStorage.setItem('lastSelectedGame', selectedGame);
    
    const selectedGameData = games.find(g => g.name === selectedGame) 
                          || gameSearchResults.find(g => g.name === selectedGame);
    if (selectedGameData?.cover_url) {
      localStorage.setItem('lastSelectedCover', selectedGameData.cover_url);
      persistedCoverUrl = selectedGameData.cover_url;
    }
    
    if (selectedGame === 'Custom') {
      ipcRenderer.send('resize-window', { width: 625, height: 395 });
    } else {
      ipcRenderer.send('resize-window', { width: 625, height: 345 });
    }
  }

  // Load popular games from IGDB on startup
  onMount(async () => {
    try {
      const result = await ipcRenderer.invoke('igdb-popular');
      
      if (result.success && result.games && result.games.length > 0) {
        const igdbGames = result.games.map(game => ({
          name: game.name,
          img: 'switch',
          igdb_id: game.id,
          cover_url: game.cover_url
        }));
        
        games = [home, custom, ...igdbGames];
        
        // Check if games have covers (indicates IGDB vs fallback)
        const hasCover = igdbGames.some(g => g.cover_url);
        if (hasCover) {
          console.log(`✅ Loaded ${igdbGames.length} games from IGDB with covers`);
        } else {
          console.log(`⚠️ Loaded ${igdbGames.length} games from local fallback (no IGDB)`);
        }
      } else {
        console.log('⚠️ Using fallback games.json (IGDB unavailable)');
      }
    } catch (error) {
      console.error('Failed to load IGDB games:', error);
      console.log('⚠️ Using fallback games.json');
    } finally {
      isLoadingPopular = false;
      
      // Auto-submit if a game was restored from localStorage
      if (persistedGame && persistedGame !== 'Home') {
        handleSubmit();
      }
    }
  });

  function handleSubmit() {
    // Trigger animation immediately
    submitAnimating = true;
    setTimeout(() => {
      submitAnimating = false;
    }, 600);
    
    const selectedGameData = games.find(g => g.name === selectedGame) 
                          || gameSearchResults.find(g => g.name === selectedGame);
    const coverUrl = selectedGameData?.cover_url || persistedCoverUrl || '';
    console.log('[App] Submitting game:', selectedGame, 'with cover:', coverUrl);
    
    // Persist status and custom name
    localStorage.setItem('lastStatusMessage', statusMessage);
    localStorage.setItem('lastCustomGameName', customGameName);
    
    // User is no longer idle after submitting
    isIdle = false;
    
    ipcRenderer.send('game', selectedGame, statusMessage, customGameName, coverUrl);
  }

  function handleIdle() {
    // Trigger animation immediately
    idleAnimating = true;
    setTimeout(() => {
      idleAnimating = false;
    }, 600);
    
    clicks++;
    isIdle = true;
    
    ipcRenderer.send("idle", clicks);
  }

  function clearStatus() {
    statusMessage = '';
    localStorage.setItem('lastStatusMessage', '');
    if (!isIdle) {
      handleSubmit();
    }
  }

  function clearCustomName() {
    customGameName = '';
    localStorage.setItem('lastCustomGameName', '');
    if (!isIdle) {
      handleSubmit();
    }
  }

  function closeWindow() {
    ipcRenderer.send('close-window');
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<main>
  <!-- Header -->
  <header>
    <div class="header-left">
      <img src="../logo.png" alt="Nintendo Switch" class="logo" draggable="false" />
      <h1>
        Nintendo Switch <strong>Discord Status</strong>
      </h1>
    </div>
    
    <div class="header-right">
      <!-- Info Icon -->
      <button class="info-icon" on:click="{() => showAbout = !showAbout}" title="About">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </button>
      
      <!-- Close Icon -->
      <button class="close-icon" on:click="{closeWindow}" title="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  </header>

  <!-- About Modal -->
  {#if showAbout}
    <div class="about-fullscreen">
      <About bind:show={showAbout}/>
    </div>
  {/if}

  <!-- Main Content -->
  <div class="content">
    <!-- Left: Game Cover -->
    <div class="cover-container">
      {#if coverImage}
        <img src={coverImage} alt={selectedGame} class="game-cover" draggable="false" />
      {:else}
        <div class="game-cover placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
            <polyline points="17 2 12 7 7 2"></polyline>
          </svg>
        </div>
      {/if}
    </div>

    <!-- Right: Form -->
    <div class="form-container">
      <form on:submit|preventDefault={handleSubmit}>
        <!-- Game Selection -->
        <div class="form-group">
          <label for="game">Game</label>
          {#if isLoadingPopular}
            <span class="loading-text">Loading...</span>
          {/if}
          <CustomSelect 
            games={games}
            bind:selectedGame
            bind:searchResults={gameSearchResults}
          />
        </div>

        <!-- Status Input -->
        <div class="form-group">
          <label for="status">Status</label>
          <div class="input-with-clear">
            <input 
              type="text" 
              id="status" 
              class="form-input"
              placeholder="Online, Karting with friends, etc."
              bind:value={statusMessage}
            />
            {#if statusMessage}
              <button type="button" class="clear-btn" on:click={clearStatus} title="Clear">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            {/if}
          </div>
        </div>

        <!-- Custom Game Name (if Custom selected) -->
        {#if selectedGame === 'Custom'}
          <div class="form-group">
            <label for="customGame">Custom Game Name</label>
            <div class="input-with-clear">
              <input 
                type="text" 
                id="customGame" 
                class="form-input"
                placeholder="Enter game name"
                bind:value={customGameName}
              />
              {#if customGameName}
                <button type="button" class="clear-btn" on:click={clearCustomName} title="Clear">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Buttons -->
        <div class="button-group">
          <button type="button" class="btn btn-idle" class:animating={idleAnimating} on:click={handleIdle}><span>Idle</span></button>
          <button type="submit" class="btn btn-submit" class:animating={submitAnimating}><span>Submit</span></button>
        </div>
      </form>
    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    overflow: hidden;
  }

  /* Override Bulma's yellow focus color globally */
  :global(input:focus),
  :global(input.is-focused),
  :global(input:active),
  :global(input.is-active) {
    border-color: #fff !important;
    box-shadow: none !important;
  }

  :global(button),
  :global(.button) {
    outline: none !important;
  }

  :global(button:focus),
  :global(button.is-focused),
  :global(button:active),
  :global(.button:focus),
  :global(.button.is-focused),
  :global(.button:active),
  :global(.button.is-active) {
    border-color: rgba(255, 255, 255, 0.3) !important;
    box-shadow: none !important;
    outline: none !important;
  }

  main {
    width: 625px;
    height: 100%;
    min-height: 345px;
    padding: 45px 50px 10px 50px;
    box-sizing: border-box;
    background: linear-gradient(135deg, #e50012 0%, #7289da 100%);
    color: #fff;
    overflow: hidden;
    position: relative;
    -webkit-app-region: drag;
  }

  /* Header */
  header {
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 27px;
    position: relative;
    background: none !important;
    padding: 0 !important;
    -webkit-app-region: drag;
    user-select: none;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  h1 {
    margin: 0;
    font-size: 19px;
    font-weight: normal;
    font-style: normal;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff;
  }

  h1 strong {
    font-weight: 700;
    font-style: normal;
    color: #fff;
  }

  .header-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .info-icon,
  .close-icon {
    -webkit-app-region: no-drag;
    background: rgba(255, 255, 255, 0.15);
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #fff;
    transition: background 0.2s ease;
    z-index: 100;
  }

  .info-icon:hover,
  .close-icon:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  /* About Fullscreen */
  .about-fullscreen {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    pointer-events: auto;
    -webkit-app-region: no-drag;
  }

  /* Main Content */
  .content {
    display: flex;
    gap: 40px;
    align-items: flex-start;
    pointer-events: none;
  }

  /* Cover */
  .cover-container {
    flex-shrink: 0;
  }
  .game-cover {
    width: 135px;
    height: 190px;
    border-radius: 8px;
    object-fit: cover;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
    user-select: none;
  }

  .game-cover.placeholder {
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.5);
  }

  /* Form */
  .form-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    -webkit-app-region: no-drag;
    pointer-events: auto;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
  }

  label {
    font-size: 15px;
    color: #fff;
    font-weight: 500;
    text-align: left;
  }

  .loading-text {
    position: absolute;
    right: 0;
    top: 0;
    font-size: 11px;
    opacity: 0.7;
    font-style: italic;
  }

  .input-with-clear {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .input-with-clear .form-input {
    flex: 1;
    width: 100%;
    padding-right: 32px;
  }

  .clear-btn {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
  }

  .clear-btn:hover {
    color: rgba(255, 255, 255, 0.9);
  }

  .form-input {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-bottom: 0.5px solid #fff;
    border-radius: 3px;
    height: 35px;
    padding: 0 12px;
    color: #fff;
    font-size: 14px;
    font-family: 'Roboto', sans-serif;
    transition: background 0.2s ease;
  }

  .form-input::placeholder {
    color: rgba(255, 255, 255, 0.25);
  }

  .form-input:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.15);
  }

  /* Remove autofill yellow background */
  .form-input:-webkit-autofill,
  .form-input:-webkit-autofill:hover,
  .form-input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.1) inset !important;
    -webkit-text-fill-color: #fff !important;
    transition: background-color 5000s ease-in-out 0s;
  }

  /* Buttons */
  .button-group {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }

  .btn {
    flex: 1;
    background: rgba(255, 255, 255, 0.25);
    border: none;
    border-radius: 3px;
    height: 35px;
    color: #fff;
    font-size: 15px;
    font-weight: 500;
    font-family: 'Roboto', sans-serif;
    cursor: pointer;
    transition: all 0.15s ease;
    position: relative;
  }

  .btn:hover:not(.animating) {
    background: rgba(255, 255, 255, 0.35);
    transform: translateY(-1px);
  }

  .btn:active {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(1px) scale(0.98);
  }

  .btn.animating {
    /* Animation handled by ::after pseudo-element */
  }

  .btn.animating::after {
    content: '\f01e';
    font-family: 'Font Awesome 5 Free';
    font-weight: 900;
    position: absolute;
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
    font-size: 16px;
    color: #fff;
    animation: iconPopFade 0.6s ease-out forwards, iconRotate 0.6s linear forwards;
    pointer-events: none;
    transform-origin: center center;
  }

  .btn.animating::before {
    display: none;
  }

  .btn span {
    position: relative;
    z-index: 2;
  }

  @keyframes iconPopFade {
    0% {
      opacity: 0;
      transform: translateY(-50%) scale(0.5) rotate(0deg);
    }
    30% {
      opacity: 1;
      transform: translateY(-50%) scale(1.2) rotate(108deg);
    }
    100% {
      opacity: 0;
      transform: translateY(-50%) scale(1) rotate(360deg);
    }
  }

  @keyframes iconRotate {
    0% {
      transform: translateY(-50%) rotate(0deg);
    }
    100% {
      transform: translateY(-50%) rotate(360deg);
    }
  }

  /* Hide GameList's custom styles - it will be plain */
  :global(.select.is-danger) {
    width: 100%;
  }

  /* Responsive (if needed for narrow screens) */
  @media (max-width: 600px) {
    .content {
      flex-direction: column;
      gap: 20px;
    }
    
    .game-cover {
      width: 100px;
      height: 140px;
    }
  }
</style>
