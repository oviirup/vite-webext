import Browser from 'webextension-polyfill';

Browser.runtime.onInstalled.addListener(() => {
  console.log('Extension installed successfully');
});
