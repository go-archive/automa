import browser from 'webextension-polyfill';
import { sleep } from '@/utils/helper';
import { attachDebugger, injectPreloadScript } from '../helper';

async function activeTab(block) {
  try {
    const data = {
      data: '',
      nextBlockId: this.getBlockConnections(block.id),
    };

    if (this.activeTab.id) {
      await browser.tabs.update(this.activeTab.id, { active: true });

      return data;
    }

    const [tab] = await browser.tabs.query({
      active: true,
      url: '*://*/*',
    });

    if (!tab?.url.startsWith('http')) {
      const error = new Error('invalid-active-tab');
      error.data = { url: tab.url };

      throw error;
    }

    this.activeTab = {
      ...this.activeTab,
      frameId: 0,
      id: tab.id,
      url: tab.url,
    };
    this.windowId = tab.windowId;

    if (this.settings.debugMode) {
      await attachDebugger(tab.id, this.activeTab.id);
      this.debugAttached = true;
    }

    if (this.preloadScripts.length > 0) {
      const preloadScripts = this.preloadScripts.map((script) =>
        injectPreloadScript({
          script,
          frameSelector: this.frameSelector,
          target: {
            tabId: this.activeTab.id,
            frameIds: [this.activeTab.frameId || 0],
          },
        })
      );
      await Promise.allSettled(preloadScripts);
    }

    await browser.tabs.update(tab.id, { active: true });
    await browser.windows.update(tab.windowId, { focused: true });

    await sleep(200);

    return data;
  } catch (error) {
    console.error(error);
    error.data = error.data || {};

    throw error;
  }
}

export default activeTab;
