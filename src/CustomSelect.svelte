<script>
  import { onMount } from 'svelte';
  const { ipcRenderer } = window.require('electron');
  
  export let games = [];
  export let selectedGame = '';
  export let searchResults = [];
  
  let selectRef;
  
  // Get current selected game data
  $: currentGame = games.find(g => g.name === selectedGame) || searchResults.find(g => g.name === selectedGame);
  
  onMount(() => {
    // Listen for game selection from dropdown window
    ipcRenderer.on('game-selected', (event, game) => {
      selectedGame = game.name;
      // Add to searchResults if it's not in games list
      const existingGame = games.find(g => g.name === game.name);
      if (!existingGame && game.cover_url) {
        // Add to searchResults so cover is available
        const existing = searchResults.find(g => g.name === game.name);
        if (!existing) {
          searchResults = [...searchResults, game];
        }
      }
    });
    
    return () => {
      ipcRenderer.removeAllListeners('game-selected');
    };
  });
  
  function openDropdown() {
    if (!selectRef) return;
    
    const rect = selectRef.getBoundingClientRect();
    const bounds = {
      x: rect.left,
      y: rect.bottom + 4,
      width: rect.width,
    };
    
    ipcRenderer.send('open-dropdown', { bounds, games, selectedGame });
  }
</script>

<div class="custom-select" bind:this={selectRef}>
  <!-- Selected Display -->
  <button type="button" class="select-trigger" on:click={openDropdown}>
    <div class="selected-game">
      <span class="game-name">{selectedGame || 'Select a game...'}</span>
    </div>
    
    <div class="select-icons">
      <svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  </button>
</div>

<style>
  .custom-select {
    position: relative;
    width: 100%;
  }
  
  .select-trigger {
    width: 100%;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-bottom: 0.5px solid #fff;
    border-radius: 3px;
    height: 35px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: background 0.2s ease;
    color: #fff;
  }
  
  .select-trigger:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .select-trigger:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.15);
    border-bottom-color: #fff;
  }
  
  .selected-game {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    overflow: hidden;
  }
  
  .game-name {
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
  }
  
  .select-icons {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-left: 8px;
  }
  
  .chevron-icon {
    transition: transform 0.2s ease;
  }
</style>
