<script>
  const { shell } = window.require('electron');
  const version = window.require('../package.json').version;
  export let show;

  function closeModal() {
    show = false;
  }

  function openIssuesPage() {
    shell.openExternal('https://github.com/skol-pro/Nintendo-Switch-Discord-Status/issues');
  }

  function openGitHubRepo() {
    shell.openExternal('https://github.com/skol-pro/Nintendo-Switch-Discord-Status');
  }
</script>

<main>
  <div class=aboutHeader>
    <h1 class=left> About <span class="version">v{version}</span></h1>
    <button 
      on:click={closeModal}
      class="closeButton"
      title="Close"
      type="button"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>

  <div class="aboutContainer left">
      <p>
        Latest enhancements by <button class="linkButton" on:click={openGitHubRepo}>Skol</button>, introducing live game search with real-time access to the entire Nintendo Switch library.
        <br><br>
        <strong>What's New in v2:</strong>
        <br>• Real-time game search across the entire Nintendo Switch library
        <br>• Game cover art display
        <br>• Modern redesigned interface
        <br><br>
        Originally forked by hobby-grade from 'NS-RPC' developed by Da532.
        <br>Special thanks to Da532, Nora, and karei for their contributions.
        <br>Shout out to "Electron in Action" by Steve Kinney.
      </p>
      <div class="reportIssueContainer">
        <button class="reportIssueButton" on:click={openIssuesPage}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          Report an Issue
        </button>
      </div>
      <p style="margin-top: 1rem;margin-bottom: 1rem;">
        <small>IGDB API © Twitch Interactive Inc.</small>
      </p>
  </div>
</main>


<style>
main {
  background: linear-gradient(135deg, #e50012, #7289da);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.aboutContainer {
  padding: 1.5rem 2rem 2rem 2rem;
  color: white !important;
  overflow-y: auto;
  flex: 1;
  background: rgba(0, 0, 0, 0.2);
}

/* Custom Scrollbar */
.aboutContainer::-webkit-scrollbar {
  width: 6px;
}

.aboutContainer::-webkit-scrollbar-track {
  background: transparent;
}

.aboutContainer::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 3px;
}

.aboutContainer::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.7);
}

.aboutContainer p {
  line-height: 1.5;
  color: white !important;
}

.aboutContainer strong {
  color: white !important;
}

.linkButton {
  background: none;
  border: none;
  color: #ffd700 !important;
  text-decoration: none;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  display: inline;
}

.linkButton:hover {
  text-decoration: underline;
}

.aboutContainer small {
  color: rgba(255, 255, 255, 0.8) !important;
  font-size: 0.75rem;
}

.closeButton {
  background: none;
  border: none;
  color: white;
  width: 2rem;
  height: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  margin-left: auto;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
  -webkit-app-region: no-drag;
  pointer-events: auto;
}

.closeButton:hover {
  background: rgba(255, 255, 255, 0.2);
}

.closeButton:active {
  background: rgba(255, 255, 255, 0.3);
}
  
.left {
  text-align: left;
}

.aboutHeader {
  background: none;
  color: white !important;
  padding: 0.5rem 1.5rem;
  font-family: Roboto;
  font-weight: 900;
  display: flex;
  flex-direction: row;
  align-items: center;
}

.aboutHeader h1 {
  margin: 0;
  font-size: 1.1rem;
  color: white !important;
}

.version {
  font-weight: 400;
  opacity: 0.8;
  font-size: 0.9rem;
  margin-left: 0.5rem;
}

.reportIssueContainer {
  padding: 1rem 0 0 0;
  margin-top: 1rem;
}

.reportIssueButton {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  color: white !important;
  text-decoration: none !important;
  font-weight: 600;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.reportIssueButton:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.reportIssueButton svg {
  flex-shrink: 0;
}
</style>