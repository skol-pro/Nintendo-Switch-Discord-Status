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

  // Handle Escape key to close modal
  function handleKeydown(event) {
    if (event.key === 'Escape' && showAbout) {
      showAbout = false;
    }
  }

  // Get current game cover for display
  $: currentGameData = games.find(g => g.name === selectedGame) 
                    || gameSearchResults.find(g => g.name === selectedGame);
  $: coverImage = currentGameData?.cover_url || null;
  
  // Resize window when Custom is selected
  $: {
    if (selectedGame === 'Custom') {
      ipcRenderer.send('resize-window', { width: 615, height: 390 });
    } else {
      ipcRenderer.send('resize-window', { width: 615, height: 340 });
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
        console.log(`✅ Loaded ${igdbGames.length} games from IGDB`);
      } else {
        console.log('⚠️ Using fallback games.json (IGDB unavailable)');
      }
    } catch (error) {
      console.error('Failed to load IGDB games:', error);
      console.log('⚠️ Using fallback games.json');
    } finally {
      isLoadingPopular = false;
    }
  });

  function handleSubmit() {
    const selectedGameData = games.find(g => g.name === selectedGame) 
                          || gameSearchResults.find(g => g.name === selectedGame);
    const coverUrl = selectedGameData?.cover_url || '';
    console.log('[App] Submitting game:', selectedGame, 'with cover:', coverUrl);
    ipcRenderer.send('game', selectedGame, statusMessage, customGameName, coverUrl);
  }

  function handleIdle() {
    clicks++;
    ipcRenderer.send("idle", clicks);
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<main>
  <!-- Header -->
  <header>
    <div class="header-left">
      <img src="../logo.png" alt="Nintendo Switch" class="logo" />
      <h1>
        Nintendo Switch <strong>Discord Status</strong>
        <span class="version">v{version}</span>
      </h1>
    </div>
  </header>

  <!-- Info Icon - Positioned absolutely top-right -->
  <button class="info-icon" on:click="{() => showAbout = !showAbout}" title="About">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  </button>

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
        <img src={coverImage} alt={selectedGame} class="game-cover" />
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
          <input 
            type="text" 
            id="status" 
            class="form-input"
            placeholder="Online, Karting with friends, etc."
            bind:value={statusMessage}
          />
        </div>

        <!-- Custom Game Name (if Custom selected) -->
        {#if selectedGame === 'Custom'}
          <div class="form-group">
            <label for="customGame">Custom Game Name</label>
            <input 
              type="text" 
              id="customGame" 
              class="form-input"
              placeholder="Enter game name"
              bind:value={customGameName}
            />
          </div>
        {/if}

        <!-- Buttons -->
        <div class="button-group">
          <button type="button" class="btn btn-idle" on:click={handleIdle}>Idle</button>
          <button type="submit" class="btn btn-submit">Submit</button>
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
    width: 615px;
    height: 100%;
    min-height: 340px;
    padding: 25px 40px;
    box-sizing: border-box;
    background: linear-gradient(135deg, #e50012 0%, #7289da 100%);
    color: #fff;
    overflow: hidden;
    position: relative;
  }

  /* Header */
  header {
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin-bottom: 27px;
    position: relative;
    background: none !important;
    padding: 0 !important;
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

  .version {
    font-size: 10px;
    font-weight: 900 !important;
    margin-left: 8px;
    opacity: 0.85;
  }

  .info-icon {
    position: absolute;
    top: 25px;
    right: 40px;
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

  .info-icon:hover {
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
  }

  /* Main Content */
  .content {
    display: flex;
    gap: 40px;
    align-items: flex-start;
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
    transition: background 0.2s ease;
  }

  .btn:hover {
    background: rgba(255, 255, 255, 0.35);
  }

  .btn:active {
    background: rgba(255, 255, 255, 0.2);
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
