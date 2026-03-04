/**
 * Sefbot Chat Widget — Self-contained embeddable script.
 * Usage: <script src="https://app.sefbot.cz/embed/sefbot-widget.js" data-chatbot-id="xxx"></script>
 */
(function () {
  'use strict';

  // ── Detect script tag & config ──────────────────────────────
  var scriptTag =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf('sefbot-widget') !== -1) return scripts[i];
      }
      return null;
    })();

  if (!scriptTag) return;

  var chatbotId = scriptTag.getAttribute('data-chatbot-id');
  if (!chatbotId) {
    console.error('[Sefbot] Missing data-chatbot-id attribute');
    return;
  }

  var baseUrl = scriptTag.src.replace(/\/embed\/sefbot-widget\.js.*$/, '');
  var apiBase = baseUrl + '/api/chatbots/' + chatbotId;
  var sessionId = 'sefbot_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now();

  // ── Detect device ───────────────────────────────────────────
  function getDeviceType() {
    var ua = navigator.userAgent || '';
    if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) return 'mobile';
    if (/Tablet|iPad|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  // ── State ───────────────────────────────────────────────────
  var config = null;
  var steps = [];
  var currentStep = null;
  var messages = [];
  var isOpen = false;
  var isEnded = false;
  var host = null;
  var shadow = null;

  // ── Default colors ──────────────────────────────────────────
  var defaults = {
    theme: '#4A90D9',
    hover: '#3A7BC8',
    messageBg: '#F5F5F5',
    messageText: '#333333',
    inverse: '#FFFFFF',
    avatar: '#4A90D9',
    error: '#F44336',
  };

  function c(key) {
    if (!config || !config.settings || !config.settings.design || !config.settings.design.colors) return defaults[key];
    return config.settings.design.colors[key] || defaults[key];
  }

  // ── Fetch config ────────────────────────────────────────────
  function fetchConfig(cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiBase + '/runtime', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          cb(null, JSON.parse(xhr.responseText));
        } catch (e) {
          cb(e, null);
        }
      } else {
        cb(new Error('HTTP ' + xhr.status), null);
      }
    };
    xhr.onerror = function () { cb(new Error('Network error'), null); };
    xhr.send();
  }

  function postInteract(data, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', apiBase + '/runtime/interact', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          cb(null, JSON.parse(xhr.responseText));
        } catch (e) {
          cb(e, null);
        }
      } else {
        cb(new Error('HTTP ' + xhr.status), null);
      }
    };
    xhr.onerror = function () { cb(new Error('Network error'), null); };
    xhr.send(JSON.stringify(data));
  }

  // ── Build Shadow DOM ────────────────────────────────────────
  function init() {
    host = document.createElement('div');
    host.id = 'sefbot-widget-host';
    host.style.cssText = 'position:fixed;bottom:0;right:0;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
    document.body.appendChild(host);
    shadow = host.attachShadow({ mode: 'open' });

    fetchConfig(function (err, data) {
      if (err) {
        console.error('[Sefbot] Failed to load config:', err);
        return;
      }
      config = data;
      steps = data.steps || [];
      injectStyles();
      renderBubble();

      // Smart start
      var ss = (config.settings && config.settings.smartStart) || {};
      var delay = ss.delay || 0;
      if (ss.text) {
        setTimeout(function () {
          renderSmartStart(ss);
        }, delay);
      }
    });
  }

  // ── Styles ──────────────────────────────────────────────────
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = getCSS();
    shadow.appendChild(style);
  }

  function getCSS() {
    var theme = c('theme');
    var hover = c('hover');
    var msgBg = c('messageBg');
    var msgText = c('messageText');
    var inverse = c('inverse');

    return '\
* { box-sizing: border-box; margin: 0; padding: 0; }\
.sfb-bubble { position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px; border-radius: 50%; background: ' + theme + '; color: ' + inverse + '; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.2s, background 0.2s; }\
.sfb-bubble:hover { background: ' + hover + '; transform: scale(1.05); }\
.sfb-bubble svg { width: 28px; height: 28px; fill: ' + inverse + '; }\
.sfb-smart-start { position: fixed; bottom: 86px; right: 20px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.12); padding: 12px 16px; max-width: 260px; display: flex; align-items: center; gap: 10px; cursor: pointer; animation: sfb-fadein 0.3s ease; }\
.sfb-smart-start .sfb-ss-avatar { width: 36px; height: 36px; border-radius: 50%; background: ' + c('avatar') + '; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }\
.sfb-smart-start .sfb-ss-avatar img { width: 100%; height: 100%; object-fit: cover; }\
.sfb-smart-start .sfb-ss-text { font-size: 13px; color: #333; line-height: 1.4; }\
.sfb-smart-start .sfb-ss-close { position: absolute; top: 4px; right: 8px; font-size: 16px; color: #999; cursor: pointer; background: none; border: none; line-height: 1; }\
@keyframes sfb-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }\
@keyframes sfb-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }\
@keyframes sfb-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }\
@keyframes sfb-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }\
.sfb-anim-bounce { animation: sfb-bounce 0.6s ease 2; }\
.sfb-anim-pulse { animation: sfb-pulse 0.6s ease 3; }\
.sfb-anim-shake { animation: sfb-shake 0.4s ease 3; }\
.sfb-window { position: fixed; bottom: 20px; right: 20px; width: 370px; height: 520px; background: #fff; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.18); display: none; flex-direction: column; overflow: hidden; animation: sfb-fadein 0.25s ease; }\
.sfb-window.sfb-open { display: flex; }\
@media (max-width: 480px) { .sfb-window { width: 100vw; height: 100vh; bottom: 0; right: 0; border-radius: 0; } .sfb-bubble { bottom: 16px; right: 16px; } .sfb-smart-start { bottom: 80px; right: 16px; left: 16px; max-width: none; } }\
.sfb-header { background: ' + theme + '; color: ' + inverse + '; padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }\
.sfb-header-avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }\
.sfb-header-avatar img { width: 100%; height: 100%; object-fit: cover; }\
.sfb-header-avatar svg { width: 20px; height: 20px; fill: ' + inverse + '; }\
.sfb-header-name { font-size: 15px; font-weight: 600; flex: 1; }\
.sfb-header-btn { background: none; border: none; color: ' + inverse + '; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }\
.sfb-header-btn:hover { background: rgba(255,255,255,0.15); }\
.sfb-header-btn svg { width: 18px; height: 18px; fill: ' + inverse + '; }\
.sfb-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; background: ' + ((config && config.settings && config.settings.design && config.settings.design.background) || '#fafafa') + '; }\
.sfb-msg { display: flex; gap: 8px; max-width: 88%; animation: sfb-fadein 0.2s ease; }\
.sfb-msg-bot { align-self: flex-start; }\
.sfb-msg-user { align-self: flex-end; flex-direction: row-reverse; }\
.sfb-msg-avatar { width: 28px; height: 28px; border-radius: 50%; background: ' + c('avatar') + '; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px; color: ' + inverse + '; overflow: hidden; }\
.sfb-msg-avatar img { width: 100%; height: 100%; object-fit: cover; }\
.sfb-msg-bubble { padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5; word-break: break-word; }\
.sfb-msg-bot .sfb-msg-bubble { background: ' + msgBg + '; color: ' + msgText + '; border-bottom-left-radius: 4px; }\
.sfb-msg-user .sfb-msg-bubble { background: ' + theme + '; color: ' + inverse + '; border-bottom-right-radius: 4px; }\
.sfb-msg-bubble img { max-width: 100%; border-radius: 8px; margin: 4px 0; }\
.sfb-msg-info { background: #EBF5FB; color: #2471A3; padding: 8px 12px; border-radius: 8px; font-size: 12px; border-left: 3px solid #2471A3; }\
.sfb-msg-warning { background: #FEF9E7; color: #B7950B; padding: 8px 12px; border-radius: 8px; font-size: 12px; border-left: 3px solid #B7950B; }\
.sfb-typing { display: flex; gap: 4px; padding: 10px 14px; align-self: flex-start; }\
.sfb-typing-dot { width: 7px; height: 7px; border-radius: 50%; background: #bbb; animation: sfb-typing-bounce 1.2s infinite; }\
.sfb-typing-dot:nth-child(2) { animation-delay: 0.2s; }\
.sfb-typing-dot:nth-child(3) { animation-delay: 0.4s; }\
@keyframes sfb-typing-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }\
.sfb-input-area { border-top: 1px solid #eee; padding: 10px 12px; flex-shrink: 0; background: #fff; }\
.sfb-input-row { display: flex; gap: 8px; align-items: center; }\
.sfb-input-field { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; font-size: 13px; outline: none; font-family: inherit; }\
.sfb-input-field:focus { border-color: ' + theme + '; box-shadow: 0 0 0 2px ' + theme + '33; }\
.sfb-send-btn { width: 36px; height: 36px; border-radius: 50%; background: ' + theme + '; border: none; color: ' + inverse + '; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.2s; }\
.sfb-send-btn:hover { background: ' + hover + '; }\
.sfb-send-btn:disabled { opacity: 0.4; cursor: default; }\
.sfb-send-btn svg { width: 18px; height: 18px; fill: ' + inverse + '; }\
.sfb-buttons { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0; }\
.sfb-btn { padding: 8px 14px; border: 1px solid ' + theme + '; border-radius: 8px; background: #fff; color: ' + theme + '; font-size: 13px; cursor: pointer; transition: all 0.15s; font-family: inherit; }\
.sfb-btn:hover { background: ' + theme + '; color: ' + inverse + '; }\
.sfb-btn-highlighted { background: ' + theme + '; color: ' + inverse + '; }\
.sfb-btn-highlighted:hover { background: ' + hover + '; }\
.sfb-carousel { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0 8px; }\
.sfb-carousel::-webkit-scrollbar { height: 4px; }\
.sfb-carousel::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }\
.sfb-card { min-width: 180px; max-width: 200px; border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; background: #fff; flex-shrink: 0; }\
.sfb-card-img { width: 100%; height: 100px; object-fit: cover; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px; }\
.sfb-card-img img { width: 100%; height: 100%; object-fit: cover; }\
.sfb-card-body { padding: 10px; }\
.sfb-card-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }\
.sfb-card-desc { font-size: 11px; color: #666; margin-bottom: 8px; }\
.sfb-card-btn { width: 100%; padding: 6px; border: none; background: ' + theme + '; color: ' + inverse + '; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; }\
.sfb-card-btn:hover { background: ' + hover + '; }\
.sfb-stars { display: flex; gap: 4px; justify-content: center; padding: 8px 0; }\
.sfb-star { cursor: pointer; transition: transform 0.15s; background: none; border: none; padding: 2px; }\
.sfb-star:hover { transform: scale(1.2); }\
.sfb-star svg { width: 28px; height: 28px; }\
.sfb-rating-row { display: flex; align-items: center; gap: 8px; justify-content: center; margin-top: 6px; }\
.sfb-ended { text-align: center; padding: 16px; color: #999; font-size: 13px; }\
.sfb-ended button { margin-top: 8px; padding: 6px 16px; border: 1px solid #ddd; border-radius: 8px; background: #fff; cursor: pointer; font-size: 13px; font-family: inherit; }\
.sfb-ended button:hover { background: #f5f5f5; }\
.sfb-date-input { border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; font-size: 13px; outline: none; font-family: inherit; flex: 1; }\
.sfb-date-input:focus { border-color: ' + theme + '; }\
.sfb-file-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px dashed #ccc; border-radius: 8px; background: #fafafa; cursor: pointer; font-size: 13px; color: #666; flex: 1; font-family: inherit; }\
.sfb-file-btn:hover { border-color: ' + theme + '; color: ' + theme + '; }\
';
  }

  // ── SVG icons ───────────────────────────────────────────────
  var ICONS = {
    chat: '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
    minimize: '<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    bot: '<svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 14a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    starEmpty: '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 8V3.5L18.5 8H14z"/></svg>',
    restart: '<svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>',
  };

  // ── Render Bubble ───────────────────────────────────────────
  function renderBubble() {
    var bubble = el('div', 'sfb-bubble');
    bubble.innerHTML = ICONS.chat;
    bubble.onclick = function () {
      toggleWindow();
    };
    shadow.appendChild(bubble);
  }

  // ── Smart Start ─────────────────────────────────────────────
  var smartStartEl = null;
  function renderSmartStart(ss) {
    if (isOpen || smartStartEl) return;
    smartStartEl = el('div', 'sfb-smart-start');
    if (ss.animation && ss.animation !== 'none') {
      smartStartEl.classList.add('sfb-anim-' + ss.animation);
    }

    var avatarDiv = el('div', 'sfb-ss-avatar');
    if (ss.avatar) {
      avatarDiv.innerHTML = '<img src="' + escAttr(ss.avatar) + '" alt="avatar">';
    } else {
      avatarDiv.innerHTML = ICONS.bot;
    }
    smartStartEl.appendChild(avatarDiv);

    var textDiv = el('div', 'sfb-ss-text');
    textDiv.textContent = ss.text;
    smartStartEl.appendChild(textDiv);

    var closeBtn = el('button', 'sfb-ss-close');
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = function (e) {
      e.stopPropagation();
      removeSmartStart();
    };
    smartStartEl.appendChild(closeBtn);

    smartStartEl.onclick = function () {
      removeSmartStart();
      toggleWindow();
    };

    shadow.appendChild(smartStartEl);
  }

  function removeSmartStart() {
    if (smartStartEl && smartStartEl.parentNode) {
      smartStartEl.parentNode.removeChild(smartStartEl);
      smartStartEl = null;
    }
  }

  // ── Chat Window ─────────────────────────────────────────────
  var windowEl = null;
  var messagesContainer = null;
  var inputArea = null;

  function toggleWindow() {
    if (isOpen) {
      closeWindow();
    } else {
      openWindow();
    }
  }

  function openWindow() {
    removeSmartStart();
    if (!windowEl) {
      createWindow();
      // Start conversation with first step
      if (steps.length > 0 && messages.length === 0) {
        currentStep = steps[0];
        showTypingThenStep(currentStep);
      }
    }
    windowEl.classList.add('sfb-open');
    isOpen = true;
    updateBubbleIcon();
  }

  function closeWindow() {
    if (windowEl) windowEl.classList.remove('sfb-open');
    isOpen = false;
    updateBubbleIcon();
  }

  function updateBubbleIcon() {
    var bubble = shadow.querySelector('.sfb-bubble');
    if (bubble) {
      bubble.innerHTML = isOpen ? ICONS.close : ICONS.chat;
    }
  }

  function createWindow() {
    windowEl = el('div', 'sfb-window');

    // Header
    var header = el('div', 'sfb-header');

    var headerAvatar = el('div', 'sfb-header-avatar');
    var ss = (config.settings && config.settings.smartStart) || {};
    if (ss.mainAvatar) {
      headerAvatar.innerHTML = '<img src="' + escAttr(ss.mainAvatar) + '" alt="">';
    } else {
      headerAvatar.innerHTML = ICONS.bot;
    }
    header.appendChild(headerAvatar);

    var headerName = el('div', 'sfb-header-name');
    headerName.textContent = config.name || 'Chat';
    header.appendChild(headerName);

    var minimizeBtn = el('button', 'sfb-header-btn');
    minimizeBtn.innerHTML = ICONS.minimize;
    minimizeBtn.title = 'Minimize';
    minimizeBtn.onclick = function () { closeWindow(); };
    header.appendChild(minimizeBtn);

    var closeBtn = el('button', 'sfb-header-btn');
    closeBtn.innerHTML = ICONS.close;
    closeBtn.title = 'Close';
    closeBtn.onclick = function () { closeWindow(); };
    header.appendChild(closeBtn);

    windowEl.appendChild(header);

    // Messages area
    messagesContainer = el('div', 'sfb-messages');
    windowEl.appendChild(messagesContainer);

    // Input area
    inputArea = el('div', 'sfb-input-area');
    windowEl.appendChild(inputArea);

    shadow.appendChild(windowEl);
  }

  // ── Message Rendering ───────────────────────────────────────
  function addBotMessage(outputBlocks) {
    if (!outputBlocks || outputBlocks.length === 0) return;

    var msgDiv = el('div', 'sfb-msg sfb-msg-bot');

    var avatar = el('div', 'sfb-msg-avatar');
    var ss = (config.settings && config.settings.smartStart) || {};
    if (ss.mainAvatar) {
      avatar.innerHTML = '<img src="' + escAttr(ss.mainAvatar) + '" alt="">';
    } else {
      avatar.innerHTML = ICONS.bot;
    }
    msgDiv.appendChild(avatar);

    var bubble = el('div', 'sfb-msg-bubble');

    for (var i = 0; i < outputBlocks.length; i++) {
      var block = outputBlocks[i];
      if (block.type === 'text') {
        var p = el('div');
        p.style.whiteSpace = 'pre-wrap';
        p.textContent = block.content;
        bubble.appendChild(p);
      } else if (block.type === 'html') {
        var htmlDiv = el('div');
        htmlDiv.innerHTML = block.content;
        bubble.appendChild(htmlDiv);
      } else if (block.type === 'info') {
        var info = el('div', 'sfb-msg-info');
        info.textContent = block.content;
        bubble.appendChild(info);
      } else if (block.type === 'warning') {
        var warn = el('div', 'sfb-msg-warning');
        warn.textContent = block.content;
        bubble.appendChild(warn);
      } else if (block.type === 'image' && block.content) {
        var img = document.createElement('img');
        img.src = block.content;
        img.alt = 'Image';
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        bubble.appendChild(img);
      } else if (block.type === 'video' && block.content) {
        var videoDiv = el('div');
        videoDiv.style.cssText = 'font-size:12px;color:#666;font-style:italic;';
        videoDiv.textContent = '[Video: ' + block.content + ']';
        bubble.appendChild(videoDiv);
      }
    }

    msgDiv.appendChild(bubble);
    messagesContainer.appendChild(msgDiv);
    scrollToBottom();
  }

  function addUserMessage(text) {
    var msgDiv = el('div', 'sfb-msg sfb-msg-user');
    var bubble = el('div', 'sfb-msg-bubble');
    bubble.textContent = text;
    msgDiv.appendChild(bubble);
    messagesContainer.appendChild(msgDiv);
    messages.push({ type: 'user', content: text });
    scrollToBottom();
  }

  function showTyping() {
    var typing = el('div', 'sfb-typing');
    typing.id = 'sfb-typing-indicator';
    for (var i = 0; i < 3; i++) {
      typing.appendChild(el('div', 'sfb-typing-dot'));
    }
    messagesContainer.appendChild(typing);
    scrollToBottom();
    return typing;
  }

  function hideTyping() {
    var existing = shadow.getElementById ? null : null;
    // Query within shadow DOM
    var indicators = messagesContainer.querySelectorAll('.sfb-typing');
    for (var i = 0; i < indicators.length; i++) {
      indicators[i].parentNode.removeChild(indicators[i]);
    }
  }

  function showTypingThenStep(step) {
    showTyping();
    setTimeout(function () {
      hideTyping();
      addBotMessage(step.output);
      messages.push({ type: 'bot', stepId: step.id, output: step.output });
      currentStep = step;
      renderInputForStep(step);
    }, 800 + Math.random() * 400);
  }

  function scrollToBottom() {
    if (messagesContainer) {
      setTimeout(function () {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 50);
    }
  }

  // ── Input Rendering ─────────────────────────────────────────
  function renderInputForStep(step) {
    inputArea.innerHTML = '';

    if (isEnded) {
      renderEnded();
      return;
    }

    var type = step.type;
    var input = step.input || {};

    if (type === 'button') {
      renderButtonInput(input, step);
    } else if (type === 'carousel') {
      renderCarouselInput(input, step);
    } else if (type === 'stars') {
      renderStarsInput(input, step);
    } else if (type === 'email') {
      renderTextInput(input.placeholder || 'Enter your email...', 'email', step);
    } else if (type === 'phone') {
      renderTextInput(input.placeholder || 'Enter your phone...', 'tel', step);
    } else if (type === 'answer') {
      if (input.numbersOnly) {
        renderTextInput(input.placeholder || 'Enter a number...', 'number', step);
      } else {
        renderTextInput(input.placeholder || 'Type your answer...', 'text', step);
      }
    } else if (type === 'location') {
      renderTextInput(input.placeholder || 'Enter location...', 'text', step);
    } else if (type === 'calendar') {
      renderDateInput(input, step);
    } else if (type === 'file') {
      renderFileInput(input, step);
    } else if (type === 'logic') {
      // Auto-proceed for logic steps
      handleUserInput('auto', 'logic', step);
    } else {
      renderTextInput('Type here...', 'text', step);
    }
  }

  function renderButtonInput(input, step) {
    var buttons = input.buttons || [];
    var container = el('div', 'sfb-buttons');
    var displayMode = (buttons[0] && buttons[0].displayMode) || 'list';

    if (displayMode === 'grid') {
      container.style.display = 'grid';
      container.style.gridTemplateColumns = 'repeat(2, 1fr)';
    }

    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        var b = el('button', 'sfb-btn' + (btn.highlighted ? ' sfb-btn-highlighted' : ''));
        b.textContent = (btn.icon ? btn.icon + ' ' : '') + btn.text;
        b.onclick = function () {
          handleUserInput(btn.text, 'button', step);
        };
        container.appendChild(b);
      })(buttons[i]);
    }
    inputArea.appendChild(container);
  }

  function renderCarouselInput(input, step) {
    var items = input.items || [];
    // Add carousel to messages area for better display
    var carousel = el('div', 'sfb-carousel');

    for (var i = 0; i < items.length; i++) {
      (function (item) {
        var card = el('div', 'sfb-card');

        var imgDiv = el('div', 'sfb-card-img');
        if (item.image) {
          imgDiv.innerHTML = '<img src="' + escAttr(item.image) + '" alt="">';
        } else {
          imgDiv.textContent = 'No image';
        }
        card.appendChild(imgDiv);

        var body = el('div', 'sfb-card-body');
        var title = el('div', 'sfb-card-title');
        title.textContent = item.title;
        body.appendChild(title);

        if (item.description) {
          var desc = el('div', 'sfb-card-desc');
          desc.textContent = item.description;
          body.appendChild(desc);
        }

        var btn = el('button', 'sfb-card-btn');
        btn.textContent = item.buttonText || 'Select';
        btn.onclick = function () {
          handleUserInput(item.buttonText || item.title, 'carousel', step);
        };
        body.appendChild(btn);
        card.appendChild(body);
        carousel.appendChild(card);
      })(items[i]);
    }
    messagesContainer.appendChild(carousel);
    scrollToBottom();
  }

  function renderStarsInput(input, step) {
    var count = input.count || 5;
    var confirmText = input.confirmButtonText || 'Submit';
    var selectedRating = 0;

    var container = el('div');
    var starsRow = el('div', 'sfb-stars');

    function updateStars() {
      var starBtns = starsRow.querySelectorAll('.sfb-star');
      for (var j = 0; j < starBtns.length; j++) {
        var svg = starBtns[j].querySelector('svg');
        if (svg) {
          svg.style.fill = j < selectedRating ? '#FFD700' : '#ddd';
          svg.style.stroke = j < selectedRating ? '#FFD700' : '#bbb';
        }
      }
    }

    for (var i = 0; i < count; i++) {
      (function (idx) {
        var starBtn = el('button', 'sfb-star');
        starBtn.innerHTML = ICONS.star;
        var svg = starBtn.querySelector('svg');
        if (svg) {
          svg.style.fill = '#ddd';
          svg.style.stroke = '#bbb';
        }
        starBtn.onclick = function () {
          selectedRating = idx + 1;
          updateStars();
        };
        starsRow.appendChild(starBtn);
      })(i);
    }
    container.appendChild(starsRow);

    var ratingRow = el('div', 'sfb-rating-row');
    var submitBtn = el('button', 'sfb-btn sfb-btn-highlighted');
    submitBtn.textContent = confirmText;
    submitBtn.onclick = function () {
      if (selectedRating > 0) {
        handleUserInput(String(selectedRating), 'stars', step);
      }
    };
    ratingRow.appendChild(submitBtn);
    container.appendChild(ratingRow);

    inputArea.appendChild(container);
  }

  function renderTextInput(placeholder, inputType, step) {
    var row = el('div', 'sfb-input-row');
    var field = document.createElement('input');
    field.className = 'sfb-input-field';
    field.type = inputType;
    field.placeholder = placeholder;
    field.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && field.value.trim()) {
        handleUserInput(field.value.trim(), step.type, step);
      }
    });
    row.appendChild(field);

    var sendBtn = el('button', 'sfb-send-btn');
    sendBtn.innerHTML = ICONS.send;
    sendBtn.onclick = function () {
      if (field.value.trim()) {
        handleUserInput(field.value.trim(), step.type, step);
      }
    };
    row.appendChild(sendBtn);

    inputArea.appendChild(row);
    setTimeout(function () { field.focus(); }, 100);
  }

  function renderDateInput(input, step) {
    var row = el('div', 'sfb-input-row');
    var field = document.createElement('input');
    field.className = 'sfb-date-input';
    field.type = 'date';
    if (!input.allowPast) {
      field.min = new Date().toISOString().split('T')[0];
    }
    if (input.futureDaysLimit) {
      var maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + input.futureDaysLimit);
      field.max = maxDate.toISOString().split('T')[0];
    }
    row.appendChild(field);

    var sendBtn = el('button', 'sfb-send-btn');
    sendBtn.innerHTML = ICONS.send;
    sendBtn.onclick = function () {
      if (field.value) {
        handleUserInput(field.value, 'calendar', step);
      }
    };
    row.appendChild(sendBtn);

    inputArea.appendChild(row);
  }

  function renderFileInput(input, step) {
    var row = el('div', 'sfb-input-row');
    var fileBtn = el('button', 'sfb-file-btn');
    fileBtn.innerHTML = ICONS.file + ' Choose file...';

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    if (input.allowCamera) {
      fileInput.setAttribute('capture', 'environment');
    }
    fileInput.onchange = function () {
      if (fileInput.files && fileInput.files.length > 0) {
        handleUserInput(fileInput.files[0].name, 'file', step);
      }
    };

    fileBtn.onclick = function () { fileInput.click(); };
    row.appendChild(fileBtn);
    row.appendChild(fileInput);

    inputArea.appendChild(row);
  }

  function renderEnded() {
    var container = el('div', 'sfb-ended');
    container.textContent = 'Conversation ended.';
    var restartBtn = document.createElement('button');
    restartBtn.innerHTML = ICONS.restart + ' Restart';
    restartBtn.style.display = 'inline-flex';
    restartBtn.style.alignItems = 'center';
    restartBtn.style.gap = '6px';
    restartBtn.onclick = function () { restart(); };
    container.appendChild(restartBtn);
    inputArea.appendChild(container);
  }

  // ── Handle User Input ───────────────────────────────────────
  function handleUserInput(value, type, step) {
    if (type !== 'logic') {
      addUserMessage(value);
    }

    inputArea.innerHTML = '';

    // Send to interact API
    postInteract(
      {
        sessionId: sessionId,
        stepId: step.id,
        userInput: value,
        inputType: type,
        deviceType: getDeviceType(),
        pageUrl: window.location.href,
      },
      function (err, result) {
        if (err) {
          console.error('[Sefbot] Interaction error:', err);
          // Retry once after 2s
          setTimeout(function () {
            postInteract(
              {
                sessionId: sessionId,
                stepId: step.id,
                userInput: value,
                inputType: type,
                deviceType: getDeviceType(),
                pageUrl: window.location.href,
              },
              function (err2, result2) {
                if (err2) {
                  addBotMessage([{ type: 'text', content: 'Connection error. Please try again.' }]);
                  renderInputForStep(step);
                  return;
                }
                processInteractResult(result2);
              }
            );
          }, 2000);
          return;
        }
        processInteractResult(result);
      }
    );
  }

  function processInteractResult(result) {
    if (result.isEnd) {
      isEnded = true;
      if (result.redirectUrl) {
        addBotMessage([{ type: 'text', content: 'Redirecting...' }]);
        setTimeout(function () {
          window.open(result.redirectUrl, '_blank');
        }, 500);
      }
      renderEnded();
      return;
    }

    if (result.nextStep) {
      showTypingThenStep(result.nextStep);
    } else {
      isEnded = true;
      renderEnded();
    }
  }

  // ── Restart ─────────────────────────────────────────────────
  function restart() {
    messages = [];
    isEnded = false;
    currentStep = null;
    sessionId = 'sefbot_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now();

    if (messagesContainer) messagesContainer.innerHTML = '';
    if (inputArea) inputArea.innerHTML = '';

    if (steps.length > 0) {
      currentStep = steps[0];
      showTypingThenStep(currentStep);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────
  function el(tag, className) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    return e;
  }

  function escAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Boot ────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
