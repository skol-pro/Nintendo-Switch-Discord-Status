<script>
  import Select from 'svelte-select'
  
  const { ipcRenderer } = window.require('electron');
  
  export let selectedGame;
  export let games;
  export let customGame;
  export let searchResults = []; // Export so parent can access search results

  let localSelect = null;
  let isLoading = false;
  let searchTimeout;
  let selectRef;
  let isListOpen = false;
  
  // Initialize localSelect from games list
  $: {
    if (games && selectedGame && !localSelect) {
      localSelect = games.find(g => g.name === selectedGame);
    }
  }
  
  // Get current selected game for display - check both games and searchResults
  $: currentGame = games.find(g => g.name === selectedGame) || searchResults.find(g => g.name === selectedGame);
  
  // Handle escape key to blur the input
  function handleKeydown(event) {
    if (event.key === 'Escape' && selectRef) {
      const input = selectRef.querySelector('input');
      if (input) {
        input.blur();
      }
    }
  }

  // Debounced search function
  async function handleFilter(filterText) {
    if (!filterText || filterText.trim().length < 2) {
      return games; // Return default games if search is too short
    }

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    return new Promise((resolve) => {
      searchTimeout = setTimeout(async () => {
        try {
          isLoading = true;
          const result = await ipcRenderer.invoke('igdb-search', filterText.trim());
          
          if (result.success && result.games) {
            // Transform IGDB results to match our format
            const igdbGames = result.games.map(game => ({
              name: game.name,
              img: 'switch', // Fallback image for Discord RPC
              igdb_id: game.id,
              cover_url: game.cover_url
            }));
            // Store search results for later reference
            searchResults = igdbGames;
            resolve(igdbGames);
          } else {
            console.error('IGDB search failed:', result.error);
            resolve(games); // Fallback to default games
          }
        } catch (error) {
          console.error('Search error:', error);
          resolve(games); // Fallback to default games
        } finally {
          isLoading = false;
        }
      }, 300); // 300ms debounce
    });
  }

</script>

<main>
  <div class="select is-danger" bind:this={selectRef} on:keydown={handleKeydown} class:loading={isLoading}>
    <Select
      items={games}
      loadOptions={handleFilter}
      value={localSelect} 
      optionIdentifier="name"
      labelIdentifier="name"
      isClearable={false}
      isSearchable={true}
      placeholder="Search for a game..."
      containerStyles="width: 20rem;"
      floatingConfig={{ strategy: 'fixed' }}
      on:select="{(e) => {
        if (e.detail) {
          selectedGame = e.detail.name;
          localSelect = e.detail;
          isListOpen = false;
        }
      }}"
      on:focus="{() => isListOpen = true}"
      on:blur="{() => {
        isListOpen = false;
        // Reset to show current selection
        const lastSelected = games.find(g => g.name === selectedGame);
        if (lastSelected) {
          localSelect = lastSelected;
        }
      }}"
    >
      <div slot="item" let:item class="game-item">
        {#if item.cover_url}
          <img src={item.cover_url} alt={item.name} class="game-cover" />
        {/if}
        <span class="game-name">{item.name}</span>
      </div>
    </Select>
    
    <!-- Loading spinner overlay -->
    {#if isLoading}
      <div class="loading-spinner"></div>
    {/if}
    
    <!-- Show selected game with cover when not focused -->
    {#if currentGame && currentGame.cover_url && !isListOpen && selectedGame !== 'Home' && selectedGame !== 'Custom'}
      <div 
        class="selected-game-display"
        on:click="{() => {
          const input = selectRef?.querySelector('input');
          if (input) {
            isListOpen = true;
            input.focus();
          }
        }}"
      >
        <img src={currentGame.cover_url} alt={currentGame.name} />
        <span>{currentGame.name}</span>
      </div>
    {/if}
    
<!-- When "custom" is selected from the games list, this additional input field appears-->
    {#if selectedGame === 'Custom'}
      <input 
        class="input is-danger customName"
        type="text" 
        bind:value={customGame} 
        placeholder="Game's name"
      >
    {/if}
  </div>
</main>


<style>

.customName {
  margin: 1rem auto;
}

.select {
  --itemIsActiveBG: #e60012;
  --itemHoverBG: #ff9fa7;
  --borderFocusColor: rgba(255, 255, 255, 0.5);
  --border: 0.5px solid #fff;
  --borderRadius: 3px;
  --background: rgba(255, 255, 255, 0.1);
  --inputColor: #fff;
  --placeholderColor: rgba(255, 255, 255, 0.25);
  --height: 35px;
  position: relative;
}

/* Loading spinner positioned over chevron */
.loading-spinner {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border: 2px solid #e60012;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  pointer-events: none;
  z-index: 100;
}

@keyframes spin {
  to { transform: translateY(-50%) rotate(360deg); }
}

/* Hide chevron when loading */
.select.loading :global(.indicators) {
  opacity: 0 !important;
}

/* Hide svelte-select's built-in loading indicator */
.select :global(.spinner) {
  display: none !important;
}

/* Make dropdown list overflow window */
.select :global(.svelte-select-list) {
  z-index: 99999 !important;
  max-height: 400px !important;
}

/* Selected game display with cover */
.selected-game-display {
  position: absolute;
  top: 0;
  left: 0;
  right: 40px;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.75rem;
  background: white;
  border: 1px solid #e60012;
  border-radius: 4px;
  cursor: pointer;
  z-index: 50;
}

.selected-game-display img {
  width: 32px;
  height: 45px;
  object-fit: cover;
  border-radius: 3px;
}

.selected-game-display span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.95rem;
  color: #333;
}

.game-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  gap: 0.5rem;
}

.game-cover {
  width: 40px;
  height: 56px;
  object-fit: cover;
  border-radius: 4px;
}

.game-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

</style>