(function() {
  'use strict';

  let isPanelExpanded = false;
  let expandButtonReference;
  const questStateCache = new Map();

  const STYLES = {
    button: `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: white;
      color: black;
      border: none;
      border-radius: 10px;
      padding: 8px 16px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      font-family: "Inter", "Segoe UI", Tahoma, sans-serif;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      font-weight: 600;
      width: 180px;
      opacity: 0.6;
    `,
    icon: `
      width: 15px;
      height: 15px;
    `,
    text: `
      flex: 1;
      text-align: center;
    `,
    expandButton: `
      background: rgba(218, 218, 218, 0.1);
      border: 1px solid #eeededff;
      border-radius: 4px;
      color: black;
      cursor: pointer;
      font-size: 12px;
      padding: 2px 7px;
      margin-left: 4px;
      transition: transform 0.3s ease;
      transform: rotate(0deg);
    `,
    panel: `
      position: fixed;
      top: 65px;
      right: 20px;
      z-index: 9999;
      background: black;
      color: white;
      border-radius: 10px;
      padding: 16px;
      width: 250px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      font-family: "Inter", "Segoe UI", Tahoma, sans-serif;
    `,
    questList: `
      margin-bottom: 5px;
      max-height: 200px;
      overflow-y: auto;
    `,
    questItem: `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;
    `,
    questName: `
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-right: 8px;
      color: #eee;
    `,
    questProgress: `
      font-family: monospace;
      color: #aaa;
      font-size: 12px;
    `
  };

  function createQuestButton() {
    if (document.getElementById('DiscordQuestButton')) {return;}

    const button = document.createElement('div');
    button.id = 'DiscordQuestButton';
    button.style.cssText = STYLES.button;

    const icon = document.createElement('img');
    icon.src = 'https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d8014ea898f3a4b2156c_Symbol.svg';
    icon.alt = 'Quest Icon';
    icon.style.cssText = STYLES.icon;
    button.appendChild(icon);

    const textLabel = document.createElement('span');
    textLabel.textContent = 'Running Quests';
    textLabel.style.cssText = STYLES.text;
    button.appendChild(textLabel);

    const expandButton = document.createElement('button');
    const arrowIcon = document.createElement('img');
    arrowIcon.src = 'https://pic.onlinewebfonts.com/thumbnails/icons_378683.svg';
    arrowIcon.style.cssText = 'width: 10px; height: 10px; display: block; pointer-events: none;';
    expandButton.appendChild(arrowIcon);
    expandButton.style.cssText = STYLES.expandButton + ' padding: 4px; display: flex; align-items: center; justify-content: center;';
    expandButton.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });
    button.appendChild(expandButton);
    expandButtonReference = expandButton;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
      button.style.opacity = '1';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      button.style.opacity = '0.6';
    });

    button.addEventListener('click', () => handleButtonClick(button, textLabel, icon, expandButton));

    document.body.appendChild(button);

    if (isPanelExpanded) {
      createExpandedPanel();
    }
  }

  function autoAcceptDomQuests() {
    // Auto-click any "Accept Quest" / "Accepter la quête" buttons on the page
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      const text = btn.textContent || '';
      if (text.includes('Accept') || text.includes('Accepter') || text.includes('قبول')) {
        if (!btn.disabled) {
          btn.click();
          console.info('🖱️ Auto-clicked Quest Accept button on DOM');
        }
      }
    });
  }

  function handleButtonClick(button, textLabel, icon, expandButton) {
    autoAcceptDomQuests();
    const elements = { button, textLabel, icon, expandButton };

    if (typeof chrome === 'undefined' || !chrome.runtime) {
      updateButtonState(elements, { message: 'Extension Error', bgColor: '#ff4444', textColor: 'white', invertIcons: true });
      return;
    }

    chrome.runtime.sendMessage({ action: 'executeQuestCode' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Discord Auto Quest Error:', chrome.runtime.lastError);
        updateButtonState(elements, { message: 'Error', bgColor: 'black', textColor: 'white', invertIcons: true });
      } else if (response && response.success) {
        updateButtonState(elements, { message: 'Code Executed', bgColor: 'black', textColor: 'white', invertIcons: true });
      } else {
        updateButtonState(elements, { message: 'Error', bgColor: 'black', textColor: 'white', invertIcons: true });
      }
    });
  }

  function updateButtonState(elements, state) {
    const { button, textLabel, icon, expandButton } = elements;
    const { message, bgColor, textColor, invertIcons } = state;

    textLabel.textContent = message;
    button.style.background = bgColor;
    button.style.color = textColor;
    
    if (invertIcons) {
      icon.style.filter = 'brightness(0) invert(1)';
      expandButton.style.filter = 'brightness(0) invert(1)';
    }

    setTimeout(() => {
      textLabel.textContent = 'Running Quests';
      button.style.background = 'white';
      button.style.color = 'black';
      icon.style.filter = '';
      expandButton.style.filter = '';
    }, 2000);
  }

  function createExpandedPanel() {
    if (document.getElementById('DiscordQuestPanel')) {return;}

    const panel = document.createElement('div');
    panel.id = 'DiscordQuestPanel';
    panel.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      z-index: 9999;
      background: #111214;
      color: #dbdee1;
      border: 1px solid #2b2d31;
      border-radius: 14px;
      padding: 16px;
      width: 280px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.6);
      font-family: "Inter", "Segoe UI", Tahoma, sans-serif;
      backdrop-filter: blur(10px);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #2b2d31; padding-bottom: 8px;';
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d8014ea898f3a4b2156c_Symbol.svg" style="width: 18px; height: 18px;" />
        <span style="font-weight: 800; font-size: 13px; color: #fff; letter-spacing: 0.5px;">BEST-QUESTS <span style="color: #5865f2; font-size: 10px; font-weight: 900;">PRO</span></span>
      </div>
      <span style="font-size: 10px; background: #248046; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold;">ACTIVE</span>
    `;
    panel.appendChild(header);

    const questListContainer = document.createElement('div');
    questListContainer.id = 'DiscordQuestList';
    questListContainer.style.cssText = STYLES.questList;
    
    if (questStateCache.size > 0) {
      questStateCache.forEach(quest => updateQuestItemUI(questListContainer, quest));
    }
    panel.appendChild(questListContainer);

    // Action Grid (Icons + compact modern buttons)
    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;';

    // Enroll Button
    const enrollBtn = document.createElement('button');
    enrollBtn.style.cssText = 'background: #5865f2; border: none; border-radius: 8px; color: white; padding: 10px; cursor: pointer; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.2s;';
    enrollBtn.innerHTML = `
      <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
      Enroll All
    `;
    enrollBtn.addEventListener('mouseenter', () => enrollBtn.style.background = '#4752c4');
    enrollBtn.addEventListener('mouseleave', () => enrollBtn.style.background = '#5865f2');
    enrollBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'executeQuestCode' });
      enrollBtn.textContent = 'Enrolling...';
      setTimeout(() => enrollBtn.innerHTML = '<svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>Enroll All', 2000);
    });
    grid.appendChild(enrollBtn);

    // Claim Button
    const claimBtn = document.createElement('button');
    claimBtn.style.cssText = 'background: #248046; border: none; border-radius: 8px; color: white; padding: 10px; cursor: pointer; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.2s;';
    claimBtn.innerHTML = `
      <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      Claim All
    `;
    claimBtn.addEventListener('mouseenter', () => claimBtn.style.background = '#1a6535');
    claimBtn.addEventListener('mouseleave', () => claimBtn.style.background = '#248046');
    claimBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'executeQuestCode' });
      claimBtn.textContent = 'Claiming...';
      setTimeout(() => claimBtn.innerHTML = '<svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>Claim All', 2000);
    });
    grid.appendChild(claimBtn);

    panel.appendChild(grid);

    // Footer Links (Profitable / Support)
    const footer = document.createElement('div');
    footer.style.cssText = 'display: flex; gap: 8px; margin-top: 10px;';

    const supportBtn = document.createElement('a');
    supportBtn.href = 'https://discord.gg/6avqEupteU';
    supportBtn.target = '_blank';
    supportBtn.style.cssText = 'flex: 1; background: #2b2d31; color: #fff; text-decoration: none; padding: 8px; border-radius: 6px; text-align: center; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 5px; transition: background 0.2s;';
    supportBtn.innerHTML = `
      <svg style="width:12px;height:12px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
      Support
    `;
    supportBtn.addEventListener('mouseenter', () => supportBtn.style.background = '#35373c');
    supportBtn.addEventListener('mouseleave', () => supportBtn.style.background = '#2b2d31');
    footer.appendChild(supportBtn);

    const sponsorBtn = document.createElement('a');
    sponsorBtn.href = 'https://omg10.com/4/11633474';
    sponsorBtn.target = '_blank';
    sponsorBtn.style.cssText = 'flex: 1; background: #1e1f22; border: 1px dashed #5865f2; color: #dbdee1; text-decoration: none; padding: 8px; border-radius: 6px; text-align: center; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 5px; transition: all 0.2s;';
    sponsorBtn.innerHTML = `
      <svg style="width:12px;height:12px;color:#5865f2;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
      Sponsor
    `;
    sponsorBtn.addEventListener('mouseenter', () => { sponsorBtn.style.background = '#2b2d31'; sponsorBtn.style.color = '#fff'; });
    sponsorBtn.addEventListener('mouseleave', () => { sponsorBtn.style.background = '#1e1f22'; sponsorBtn.style.color = '#dbdee1'; });
    footer.appendChild(sponsorBtn);

    panel.appendChild(footer);

    const credit = document.createElement('div');
    credit.style.cssText = 'margin-top: 10px; font-size: 10px; color: #80848e; text-align: center; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;';
    credit.innerHTML = 'BEST-QUESTS // PRO EDITION';
    panel.appendChild(credit);

    document.body.appendChild(panel);
  }

  function showGuildGateOverlay(inviteUrl) {
    let overlay = document.getElementById('DiscordQuestGuildGate');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'DiscordQuestGuildGate';
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 20000; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-family: "Inter", "Segoe UI", sans-serif; text-align: center; padding: 20px; box-sizing: border-box; backdrop-filter: blur(5px);';
      
      const card = document.createElement('div');
      card.style.cssText = 'background: #1e1f22; border: 1px solid #5865f2; border-radius: 12px; padding: 30px; max-width: 400px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5);';
      
      const logo = document.createElement('img');
      logo.src = 'https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d8014ea898f3a4b2156c_Symbol.svg';
      logo.style.cssText = 'width: 60px; height: 60px; margin-bottom: 20px;';
      card.appendChild(logo);

      const title = document.createElement('h2');
      title.style.cssText = 'margin: 0 0 10px 0; font-size: 20px; font-weight: bold; color: #5865f2;';
      title.textContent = '🔒 Extension Activation Required!';
      card.appendChild(title);

      const desc = document.createElement('p');
      desc.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: #dbdee1; line-height: 1.5;';
      desc.textContent = 'To use BEST-Quests, you must join our support server and verify membership first.';
      card.appendChild(desc);

      const joinBtn = document.createElement('a');
      joinBtn.href = inviteUrl;
      joinBtn.target = '_blank';
      joinBtn.style.cssText = 'display: block; width: 100%; padding: 12px 0; background-color: #5865f2; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; margin-bottom: 12px; transition: background-color 0.2s;';
      joinBtn.textContent = 'Join Server';
      joinBtn.addEventListener('mouseenter', () => joinBtn.style.backgroundColor = '#4752c4');
      joinBtn.addEventListener('mouseleave', () => joinBtn.style.backgroundColor = '#5865f2');
      card.appendChild(joinBtn);

      const checkBtn = document.createElement('button');
      checkBtn.style.cssText = 'display: block; width: 100%; padding: 12px 0; background-color: #248046; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer; transition: background-color 0.2s;';
      checkBtn.textContent = 'Check Membership';
      checkBtn.addEventListener('mouseenter', () => checkBtn.style.backgroundColor = '#1a6535');
      checkBtn.addEventListener('mouseleave', () => checkBtn.style.backgroundColor = '#248046');
      checkBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'executeQuestCode' });
      });
      card.appendChild(checkBtn);

      overlay.appendChild(card);
      document.body.appendChild(overlay);
    }
  }

  function removeGuildGateOverlay() {
    const overlay = document.getElementById('DiscordQuestGuildGate');
    if (overlay) {
      overlay.remove();
    }
  }

  window.addEventListener('message', ({ source, data }) => {
    if (source !== window || !data || data.prefix !== 'DISCORD_QUEST_COMPLETER') { return; }

    const listContainer = document.getElementById('DiscordQuestList');

    if (data.type === 'GUILD_CHECK') {
      const { isInGuild, invite } = data.data;
      if (!isInGuild) {
        showGuildGateOverlay(invite);
      } else {
        removeGuildGateOverlay();
      }
    } else if (data.type === 'QUEST_LIST') {
      questStateCache.clear();
      data.data.forEach(q => questStateCache.set(q.id, q));
      if (listContainer) {
        listContainer.innerHTML = ''; 
        data.data.forEach(q => updateQuestItemUI(listContainer, q));
      }
    } else if (data.type === 'QUEST_UPDATE') {
      questStateCache.set(data.data.id, data.data);
      if (listContainer) { updateQuestItemUI(listContainer, data.data); }
    }
  });

  function updateQuestItemUI(container, quest) {
    let item = document.getElementById(`quest-item-${quest.id}`);
    
    if (!item) {
      item = document.createElement('div');
      item.id = `quest-item-${quest.id}`;
      item.style.cssText = STYLES.questItem;
      item.innerHTML = `
        <span style="${STYLES.questName}" title="${quest.name}">${quest.name}</span>
        <span id="quest-progress-${quest.id}" style="${STYLES.questProgress}"></span>
      `;
      container.appendChild(item);
    }

    const progressSpan = item.querySelector(`#quest-progress-${quest.id}`);
    if (progressSpan) {
      progressSpan.textContent = quest.completed ? 'DONE' : `${quest.progress}/${quest.target}`;
      progressSpan.style.color = quest.completed ? '#43b581' : '#aaa';
      item.style.opacity = quest.completed ? '0.5' : '1';
    }
  }

  function removeElements() {
    const existingButton = document.getElementById('DiscordQuestButton');
    if (existingButton) {existingButton.remove();}
    
    const existingPanel = document.getElementById('DiscordQuestPanel');
    if (existingPanel) {existingPanel.remove();}
  }

  function togglePanel() {
    isPanelExpanded = !isPanelExpanded;
    if (expandButtonReference) {
      expandButtonReference.style.transform = isPanelExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    }
    
    if (isPanelExpanded) {
      createExpandedPanel();
    } else {
      const panel = document.getElementById('DiscordQuestPanel');
      if (panel) {panel.remove();}
    }
  }

  function init() {
    createQuestButton();

    let lastUrl = window.location.href;
    new MutationObserver(() => {
      autoAcceptDomQuests();
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        createQuestButton();
      }
    }).observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
