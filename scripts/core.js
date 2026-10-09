(function () {
  'use strict';

  const doc = document;
  const body = doc.body;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || doc).querySelectorAll(sel)); }
  function on(el, ev, fn, opts) { el.addEventListener(ev, fn, opts); }
  function off(el, ev, fn) { el.removeEventListener(ev, fn); }
  function addClass(el, ...cls) { el && el.classList.add(...cls); }
  function removeClass(el, ...cls) { el && el.classList.remove(...cls); }
  function toggleClass(el, cls, force) { el && el.classList.toggle(cls, force); }
  function hasClass(el, cls) { return el && el.classList.contains(cls); }
  function attr(el, name, val) {
    if (val === undefined) return el && el.getAttribute(name);
    el && el.setAttribute(name, val);
  }
  function emit(el, name, detail) {
    el.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: true, detail }));
  }
  function trapFocus(el) {
    const focusable = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const nodes = () => $$(focusable, el).filter(n => !n.closest('[hidden]'));
    function handler(e) {
      if (e.key !== 'Tab') return;
      const items = nodes();
      if (!items.length) return e.preventDefault();
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey) { if (doc.activeElement === first) { e.preventDefault(); last.focus(); } }
      else { if (doc.activeElement === last) { e.preventDefault(); first.focus(); } }
    }
    on(el, 'keydown', handler);
    return () => off(el, 'keydown', handler);
  }
  function lockScroll() { body.style.overflow = 'hidden'; }
  function unlockScroll() { body.style.overflow = ''; }
  function nextFrame(fn) { requestAnimationFrame(() => requestAnimationFrame(fn)); }
  function uid() { return Math.random().toString(36).slice(2, 9); }

  const Theme = (function () {
    const KEY = 'core-theme';
    const BASE = 'https://initnexus.github.io/Mixterial/styling/themes/';
    const THEMES = {
      'default/light': 'default/light.css',
      'default/dark': 'default/dark.css',
      'default/midnight': 'default/midnight.css',
      'default/amoled': 'default/amoled.css',
      'catppuccin/latte': 'catppuccin/latte.css',
      'catppuccin/frappe': 'catppuccin/frappe.css',
      'catppuccin/macchiato': 'catppuccin/macchiato.css',
      'catppuccin/mocha': 'catppuccin/mocha.css',
      'nexusbyte/aura': 'nexusbyte/aura.css',
      'nexusbyte/azure': 'nexusbyte/azure.css',
      'nexusbyte/bloody': 'nexusbyte/bloody.css',
      'nexusbyte/blossom': 'nexusbyte/blossom.css',
      'nexusbyte/clay': 'nexusbyte/clay.css',
      'nexusbyte/forest': 'nexusbyte/forest.css',
      'nexusbyte/sunrise': 'nexusbyte/sunrise.css',
      'nexusbyte/volcano': 'nexusbyte/volcano.css',
      'gradient/black-white': 'gradient/black-white.css',
      'gradient/black-yellow': 'gradient/black-yellow.css',
      'gradient/orange-yellow': 'gradient/orange-yellow.css',
      'gradient/purple-blue': 'gradient/purple-blue.css',
      'gradient/purple-green': 'gradient/purple-green.css',
      'gradient/purple-pink': 'gradient/purple-pink.css'
    };
    const DEFAULT_THEME = 'default/light';
    function getLink(name) { return $(`link[data-theme="${name}"]`); }
    function inject(name) {
      if (!THEMES[name] || getLink(name)) return;
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.setAttribute('data-theme', name);
      link.href = `${BASE}${THEMES[name]}`;
      link.disabled = true;
      doc.head.appendChild(link);
    }
    const THEME_NAMES = Object.keys(THEMES);
    function set(name) {
      if (!THEMES[name]) return;
      inject(name);
      $$('link[data-theme]').forEach(l => { l.disabled = true; });
      const link = getLink(name);
      if (link) link.disabled = false;
      localStorage.setItem(KEY, name);
      doc.documentElement.setAttribute('data-theme', name);
      emit(doc.documentElement, 'themechange', { theme: name });
    }
    function get() { return localStorage.getItem(KEY) || DEFAULT_THEME; }
    function list() { return THEME_NAMES.slice(); }
    function init() {
      THEME_NAMES.forEach(inject);
      set(get());
    }
    function toggle(a, b) { set(get() === a ? b : a); }
    function next() {
      const idx = THEME_NAMES.indexOf(get());
      set(THEME_NAMES[(idx + 1) % THEME_NAMES.length]);
    }
    return { set, get, list, init, toggle, next };
  })();

  
  const Navbar = (function () {
    function init() {
      on(doc, 'click', function (e) {
        const btn = e.target.closest('.navbar-toggle');
        if (!btn) return;
        const nav = btn.closest('nav, .navbar');
        if (!nav) return;
        const menu = $('.navbar-nav', nav) || $('[data-navbar-menu]', nav);
        if (!menu) return;
        const open = hasClass(menu, 'is-open');
        toggleClass(menu, 'is-open', !open);
        attr(btn, 'aria-expanded', String(!open));
        emit(nav, open ? 'navbarclose' : 'navbaropen');
      });
      on(doc, 'click', function (e) {
        $$('.navbar-nav.is-open').forEach(menu => {
          const nav = menu.closest('nav, .navbar');
          if (nav && !nav.contains(e.target)) {
            removeClass(menu, 'is-open');
            const btn = $('.navbar-toggle', nav);
            if (btn) attr(btn, 'aria-expanded', 'false');
          }
        });
      });
    }
    return { init };
  })();

  
  const Sidebar = (function () {
    const overlays = new WeakMap();
    function createOverlay(sidebar) {
      let ov = doc.createElement('div');
      addClass(ov, 'modal-backdrop', 'is-open');
      ov.style.cssText = 'position:fixed;inset:0;z-index:1039;';
      on(ov, 'click', () => close(sidebar));
      doc.body.appendChild(ov);
      overlays.set(sidebar, ov);
    }
    function removeOverlay(sidebar) {
      const ov = overlays.get(sidebar);
      if (ov) { ov.remove(); overlays.delete(sidebar); }
    }
    function open(sidebar) {
      addClass(sidebar, 'is-open');
      attr(sidebar, 'aria-hidden', 'false');
      if (hasClass(sidebar, 'sidebar-overlay')) { createOverlay(sidebar); lockScroll(); }
      emit(sidebar, 'sidebaropen');
    }
    function close(sidebar) {
      removeClass(sidebar, 'is-open');
      attr(sidebar, 'aria-hidden', 'true');
      removeOverlay(sidebar);
      unlockScroll();
      emit(sidebar, 'sidebarclose');
    }
    function toggle(sidebar) { hasClass(sidebar, 'is-open') ? close(sidebar) : open(sidebar); }
    function collapse(sidebar) {
      toggleClass(sidebar, 'sidebar-collapsed');
      const layout = $('.layout-with-sidebar');
      if (layout) toggleClass(layout, 'sidebar-collapsed');
      emit(sidebar, 'sidebartoggle', { collapsed: hasClass(sidebar, 'sidebar-collapsed') });
    }
    function init() {
      on(doc, 'click', function (e) {
        const trigger = e.target.closest('[data-sidebar-toggle]');
        if (trigger) {
          const target = $(attr(trigger, 'data-sidebar-toggle')) || $('.sidebar');
          if (target) toggle(target);
          return;
        }
        const colTrigger = e.target.closest('[data-sidebar-collapse]');
        if (colTrigger) {
          const target = $(attr(colTrigger, 'data-sidebar-collapse')) || $('.sidebar');
          if (target) collapse(target);
          return;
        }
        const closeBtn = e.target.closest('[data-sidebar-close]');
        if (closeBtn) {
          const target = closeBtn.closest('.sidebar') || $('.sidebar');
          if (target) close(target);
        }
      });
      on(doc, 'keydown', function (e) {
        if (e.key === 'Escape') $$('.sidebar.is-open').forEach(close);
      });
    }
    return { init, open, close, toggle, collapse };
  })();

  
  const Dropdown = (function () {
    let current = null;
    function openMenu(menu, trigger) {
      if (current && current !== menu) closeMenu(current);
      addClass(menu, 'is-open');
      attr(trigger, 'aria-expanded', 'true');
      current = menu;
      emit(menu, 'dropdownopen');
    }
    function closeMenu(menu) {
      if (!menu) return;
      removeClass(menu, 'is-open');
      const trigger = $(`[aria-controls="${attr(menu, 'id')}"]`) ||
        menu.previousElementSibling;
      if (trigger) attr(trigger, 'aria-expanded', 'false');
      if (current === menu) current = null;
      emit(menu, 'dropdownclose');
    }
    function closeAll() { $$('.dropdown-menu.is-open').forEach(closeMenu); current = null; }
    function init() {
      on(doc, 'click', function (e) {
        const trigger = e.target.closest('[data-dropdown]');
        if (trigger) {
          e.stopPropagation();
          const sel = attr(trigger, 'data-dropdown');
          const menu = sel ? $(sel) : trigger.nextElementSibling;
          if (!menu) return;
          hasClass(menu, 'is-open') ? closeMenu(menu) : openMenu(menu, trigger);
          return;
        }
        const item = e.target.closest('.dropdown-item');
        if (item && !item.dataset.keepOpen) {
          const menu = item.closest('.dropdown-menu');
          if (menu) closeMenu(menu);
          return;
        }
        if (!e.target.closest('.dropdown-menu')) closeAll();
      });
      on(doc, 'keydown', function (e) {
        if (e.key === 'Escape') { closeAll(); }
        if (!current) return;
        const items = $$('.dropdown-item:not([disabled])', current);
        const idx = items.indexOf(doc.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0])?.focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1])?.focus(); }
      });
    }
    return { init, open: openMenu, close: closeMenu, closeAll };
  })();

  
  const Modal = (function () {
    const stack = [];
    const releases = new WeakMap();
    function open(modal) {
      const backdrop = modal.closest('.modal-backdrop') || modal.parentElement;
      addClass(backdrop, 'is-open');
      addClass(modal, 'is-open');
      attr(modal, 'aria-hidden', 'false');
      modal.removeAttribute('hidden');
      lockScroll();
      stack.push(modal);
      nextFrame(() => {
        const release = trapFocus(modal);
        releases.set(modal, release);
        const first = modal.querySelector('[autofocus]') ||
          modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        first && first.focus();
      });
      emit(modal, 'modalopen');
    }
    function close(modal) {
      const backdrop = modal.closest('.modal-backdrop') || modal.parentElement;
      removeClass(backdrop, 'is-open');
      removeClass(modal, 'is-open');
      attr(modal, 'aria-hidden', 'true');
      const release = releases.get(modal);
      if (release) { release(); releases.delete(modal); }
      const idx = stack.indexOf(modal);
      if (idx > -1) stack.splice(idx, 1);
      if (!stack.length) unlockScroll();
      emit(modal, 'modalclose');
      const opener = $(`[data-modal-open="${attr(modal, 'id')}"]`);
      opener && opener.focus();
    }
    function closeTop() { if (stack.length) close(stack[stack.length - 1]); }
    function init() {
      on(doc, 'click', function (e) {
        const openBtn = e.target.closest('[data-modal-open]');
        if (openBtn) {
          const target = $(attr(openBtn, 'data-modal-open'));
          if (target) open(target);
          return;
        }
        const closeBtn = e.target.closest('[data-modal-close], .modal-close');
        if (closeBtn) {
          const modal = closeBtn.closest('.modal');
          if (modal) close(modal);
          return;
        }
        if (hasClass(e.target, 'modal-backdrop')) {
          const modal = $('.modal', e.target);
          if (modal && !modal.dataset.static) close(modal);
        }
      });
      on(doc, 'keydown', function (e) {
        if (e.key === 'Escape') closeTop();
      });
    }
    return { init, open, close };
  })();

  
  const Drawer = (function () {
    const releases = new WeakMap();
    function open(drawer) {
      addClass(drawer, 'is-open');
      attr(drawer, 'aria-hidden', 'false');
      lockScroll();
      nextFrame(() => {
        const release = trapFocus(drawer);
        releases.set(drawer, release);
        const first = drawer.querySelector('[autofocus]') ||
          drawer.querySelector('button, [href], input, select, textarea');
        first && first.focus();
      });
      emit(drawer, 'draweropen');
    }
    function close(drawer) {
      removeClass(drawer, 'is-open');
      attr(drawer, 'aria-hidden', 'true');
      const release = releases.get(drawer);
      if (release) { release(); releases.delete(drawer); }
      unlockScroll();
      emit(drawer, 'drawerclose');
    }
    function init() {
      on(doc, 'click', function (e) {
        const openBtn = e.target.closest('[data-drawer-open]');
        if (openBtn) { const t = $(attr(openBtn, 'data-drawer-open')); if (t) open(t); return; }
        const closeBtn = e.target.closest('[data-drawer-close], .drawer-close');
        if (closeBtn) { const t = closeBtn.closest('.drawer, .sheet'); if (t) close(t); return; }
        const toggleBtn = e.target.closest('[data-drawer-toggle]');
        if (toggleBtn) {
          const t = $(attr(toggleBtn, 'data-drawer-toggle'));
          if (t) hasClass(t, 'is-open') ? close(t) : open(t);
        }
      });
      on(doc, 'keydown', function (e) {
        if (e.key === 'Escape') $$('.drawer.is-open, .sheet.is-open').forEach(close);
      });
    }
    return { init, open, close };
  })();

  
  const Tabs = (function () {
    function activate(trigger) {
      const tabsList = trigger.closest('.tabs-list');
      if (!tabsList) return;
      const tabsRoot = tabsList.closest('.tabs');
      if (!tabsRoot) return;
      $$('.tab-trigger', tabsList).forEach(t => {
        removeClass(t, 'is-active');
        attr(t, 'aria-selected', 'false');
        attr(t, 'tabindex', '-1');
      });
      addClass(trigger, 'is-active');
      attr(trigger, 'aria-selected', 'true');
      attr(trigger, 'tabindex', '0');
      const panelId = attr(trigger, 'aria-controls') || attr(trigger, 'data-tab');
      $$('.tab-panel', tabsRoot).forEach(p => removeClass(p, 'is-active'));
      if (panelId) {
        const panel = $(`#${panelId}`, tabsRoot) || $(`.tab-panel[data-tab="${panelId}"]`, tabsRoot);
        if (panel) addClass(panel, 'is-active');
      }
      emit(trigger, 'tabchange', { tab: panelId });
    }
    function init() {
      on(doc, 'click', function (e) {
        const trigger = e.target.closest('.tab-trigger');
        if (trigger && !hasClass(trigger, 'is-active')) activate(trigger);
      });
      on(doc, 'keydown', function (e) {
        const trigger = e.target.closest('.tab-trigger');
        if (!trigger) return;
        const list = trigger.closest('.tabs-list');
        if (!list) return;
        const triggers = $$('.tab-trigger:not([disabled])', list);
        const idx = triggers.indexOf(trigger);
        const vertical = !!trigger.closest('.tabs-vertical');
        const prev = vertical ? 'ArrowUp' : 'ArrowLeft';
        const next = vertical ? 'ArrowDown' : 'ArrowRight';
        if (e.key === next) { e.preventDefault(); const t = triggers[idx + 1] || triggers[0]; t.focus(); activate(t); }
        if (e.key === prev) { e.preventDefault(); const t = triggers[idx - 1] || triggers[triggers.length - 1]; t.focus(); activate(t); }
        if (e.key === 'Home') { e.preventDefault(); triggers[0].focus(); activate(triggers[0]); }
        if (e.key === 'End') { e.preventDefault(); triggers[triggers.length - 1].focus(); activate(triggers[triggers.length - 1]); }
      });
      $$('.tabs').forEach(root => {
        const active = $('.tab-trigger.is-active', root);
        if (!active) {
          const first = $('.tab-trigger:not([disabled])', root);
          if (first) activate(first);
        }
      });
    }
    return { init, activate };
  })();

  
  const Accordion = (function () {
    function open(item) {
      addClass(item, 'is-open');
      const content = item.querySelector('.accordion-content');
      if (content) content.style.maxHeight = content.scrollHeight + 'px';
      const trigger = item.querySelector('.accordion-trigger');
      if (trigger) attr(trigger, 'aria-expanded', 'true');
      emit(item, 'accordionopen');
    }
    function close(item) {
      removeClass(item, 'is-open');
      const content = item.querySelector('.accordion-content');
      if (content) content.style.maxHeight = '0';
      const trigger = item.querySelector('.accordion-trigger');
      if (trigger) attr(trigger, 'aria-expanded', 'false');
      emit(item, 'accordionclose');
    }
    function toggle(item) { hasClass(item, 'is-open') ? close(item) : open(item); }
    function init() {
      on(doc, 'click', function (e) {
        const trigger = e.target.closest('.accordion-trigger');
        if (!trigger) return;
        const item = trigger.closest('.accordion-item');
        if (!item) return;
        const accordion = item.closest('.accordion');
        const exclusive = accordion && !accordion.dataset.multi;
        if (exclusive && !hasClass(item, 'is-open')) {
          $$('.accordion-item.is-open', accordion).forEach(close);
        }
        toggle(item);
      });
      on(doc, 'keydown', function (e) {
        const trigger = e.target.closest('.accordion-trigger');
        if (!trigger) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger.click(); }
      });
    }
    return { init, open, close, toggle };
  })();

  
  const Tooltip = (function () {
    function show(el) {
      const tip = el.querySelector('.tooltip-content');
      if (!tip) return;
      tip.style.display = '';
    }
    function hide(el) {
      const tip = el.querySelector('.tooltip-content');
      if (!tip) return;
      tip.style.display = '';
    }
    function init() {
      on(doc, 'keydown', function (e) {
        if (e.key === 'Escape') {
          $$('.tooltip').forEach(t => {
            const tip = t.querySelector('.tooltip-content');
            if (tip) tip.style.removeProperty('display');
          });
        }
      });
      on(doc, 'focusin', function (e) {
        const tooltip = e.target.closest('.tooltip');
        if (tooltip) show(tooltip);
      });
      on(doc, 'focusout', function (e) {
        const tooltip = e.target.closest('.tooltip');
        if (tooltip) hide(tooltip);
      });
    }
    return { init };
  })();

  
  const Popover = (function () {
    function open(content, trigger) {
      addClass(content, 'is-open');
      attr(trigger, 'aria-expanded', 'true');
      emit(content, 'popoveropen');
    }
    function close(content, trigger) {
      removeClass(content, 'is-open');
      if (trigger) attr(trigger, 'aria-expanded', 'false');
      emit(content, 'popoverclose');
    }
    function init() {
      on(doc, 'click', function (e) {
        const trigger = e.target.closest('[data-popover]');
        if (trigger) {
          e.stopPropagation();
          const target = $(attr(trigger, 'data-popover')) ||
            trigger.closest('.popover')?.querySelector('.popover-content');
          if (!target) return;
          hasClass(target, 'is-open') ? close(target, trigger) : open(target, trigger);
          return;
        }
        $$('.popover-content.is-open').forEach(p => {
          if (!p.contains(e.target)) close(p);
        });
      });
      on(doc, 'keydown', function (e) {
        if (e.key === 'Escape') $$('.popover-content.is-open').forEach(p => close(p));
      });
    }
    return { init, open, close };
  })();

  
  const Toast = (function () {
    const defaults = { duration: 4000, position: 'toast-top-right' };
    function getContainer(position) {
      let c = $(`.toast-container.${position}`);
      if (!c) {
        c = doc.createElement('div');
        addClass(c, 'toast-container', position);
        doc.body.appendChild(c);
      }
      return c;
    }
    function dismiss(toast) {
      addClass(toast, 'toast-leaving');
      on(toast, 'animationend', () => toast.remove(), { once: true });
      setTimeout(() => toast.remove(), 300);
    }
    function show(opts) {
      if (typeof opts === 'string') opts = { message: opts };
      const o = Object.assign({}, defaults, opts);
      const container = getContainer(o.position);
      const toast = doc.createElement('div');
      addClass(toast, 'toast');
      if (o.type) addClass(toast, `toast-${o.type}`);
      toast.innerHTML = `<div class="toast-content">
        ${o.title ? `<div class="toast-title">${o.title}</div>` : ''}
        <div class="toast-description">${o.message || ''}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss">&times;</button>`;
      const closeBtn = toast.querySelector('.toast-close');
      on(closeBtn, 'click', () => dismiss(toast));
      container.appendChild(toast);
      if (o.duration > 0) setTimeout(() => dismiss(toast), o.duration);
      emit(toast, 'toastshow');
      return toast;
    }
    function success(msg, opts) { return show(Object.assign({ message: msg, type: 'success' }, opts)); }
    function error(msg, opts) { return show(Object.assign({ message: msg, type: 'error' }, opts)); }
    function warning(msg, opts) { return show(Object.assign({ message: msg, type: 'warning' }, opts)); }
    function info(msg, opts) { return show(Object.assign({ message: msg, type: 'info' }, opts)); }
    function init() {
      on(doc, 'click', function (e) {
        const btn = e.target.closest('.toast-close');
        if (btn) dismiss(btn.closest('.toast'));
      });
      on(doc, 'click', function (e) {
        const btn = e.target.closest('[data-toast]');
        if (!btn) return;
        show({
          message: attr(btn, 'data-toast'),
          type: attr(btn, 'data-toast-type') || undefined,
          title: attr(btn, 'data-toast-title') || undefined,
          duration: parseInt(attr(btn, 'data-toast-duration') || '4000'),
          position: attr(btn, 'data-toast-position') || defaults.position,
        });
      });
    }
    return { init, show, dismiss, success, error, warning, info };
  })();

  
  const Command = (function () {
    let current = null;
    let selectedIdx = -1;
    function getItems(palette) {
      return $$('.command-item:not([disabled])', palette);
    }
    function setSelected(palette, idx) {
      const items = getItems(palette);
      items.forEach(i => removeClass(i, 'is-selected'));
      if (idx >= 0 && idx < items.length) {
        addClass(items[idx], 'is-selected');
        items[idx].scrollIntoView({ block: 'nearest' });
        selectedIdx = idx;
      }
    }
    function open(palette) {
      addClass(palette, 'is-open');
      attr(palette, 'aria-hidden', 'false');
      current = palette;
      selectedIdx = -1;
      lockScroll();
      nextFrame(() => {
        const inp = $('input, .command-input', palette);
        if (inp) inp.focus();
      });
      emit(palette, 'commandopen');
    }
    function close(palette) {
      if (!palette) return;
      removeClass(palette, 'is-open');
      attr(palette, 'aria-hidden', 'true');
      current = null;
      selectedIdx = -1;
      unlockScroll();
      emit(palette, 'commandclose');
    }
    function filter(palette, query) {
      const q = query.toLowerCase().trim();
      $$('.command-item', palette).forEach(item => {
        const label = (item.querySelector('.command-item-label') || item).textContent.toLowerCase();
        item.hidden = q.length > 0 && !label.includes(q);
      });
      setSelected(palette, q ? 0 : -1);
    }
    function init() {
      on(doc, 'keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          const palette = $('.command-palette');
          if (palette) hasClass(palette, 'is-open') ? close(palette) : open(palette);
        }
        if (!current) return;
        const items = getItems(current).filter(i => !i.hidden);
        const count = items.length;
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(current, (selectedIdx + 1) % count); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(current, (selectedIdx - 1 + count) % count); }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (selectedIdx >= 0 && items[selectedIdx]) items[selectedIdx].click();
        }
        if (e.key === 'Escape') close(current);
      });
      on(doc, 'click', function (e) {
        const btn = e.target.closest('[data-command-open]');
        if (btn) {
          const t = $(attr(btn, 'data-command-open')) || $('.command-palette');
          if (t) open(t);
          return;
        }
        if (current && e.target === current) close(current);
      });
      on(doc, 'input', function (e) {
        const inp = e.target;
        if (hasClass(inp, 'command-input') || (inp.closest && inp.closest('.command-input-wrapper'))) {
          const palette = inp.closest('.command-palette');
          if (palette) filter(palette, inp.value);
        }
      });
    }
    return { init, open, close };
  })();

  
  const SidebarNav = (function () {
    function toggle(item) {
      const open = hasClass(item, 'is-open');
      toggleClass(item, 'is-open', !open);
      const sub = item.nextElementSibling;
      if (sub && hasClass(sub, 'sidebar-sub-nav')) {
        sub.style.maxHeight = open ? '0' : sub.scrollHeight + 'px';
      }
      attr(item.querySelector('.sidebar-item-chevron'), 'aria-expanded', String(!open));
    }
    function init() {
      on(doc, 'click', function (e) {
        const item = e.target.closest('.sidebar-item[data-submenu], .sidebar-link[data-submenu]');
        if (item) { e.preventDefault(); toggle(item); }
      });
    }
    return { init };
  })();

  
  const Carousel = (function () {
    const state = new WeakMap();
    function getState(carousel) {
      if (!state.has(carousel)) {
        state.set(carousel, { index: 0, timer: null, total: 0 });
      }
      return state.get(carousel);
    }
    function slides(carousel) { return $$('.carousel-slide', carousel); }
    function goTo(carousel, idx) {
      const s = slides(carousel);
      const st = getState(carousel);
      st.total = s.length;
      st.index = ((idx % s.length) + s.length) % s.length;
      const track = $('.carousel-track', carousel);
      if (track) track.style.transform = `translateX(-${st.index * 100}%)`;
      $$('.carousel-dot', carousel).forEach((d, i) => toggleClass(d, 'is-active', i === st.index));
      $$('.carousel-thumbnail', carousel).forEach((t, i) => toggleClass(t, 'is-active', i === st.index));
      emit(carousel, 'carouselchange', { index: st.index });
    }
    function next(carousel) { const st = getState(carousel); goTo(carousel, st.index + 1); }
    function prev(carousel) { const st = getState(carousel); goTo(carousel, st.index - 1); }
    function startAuto(carousel) {
      const st = getState(carousel);
      const interval = parseInt(attr(carousel, 'data-autoplay') || '0');
      if (!interval) return;
      st.timer = setInterval(() => next(carousel), interval);
      on(carousel, 'mouseenter', () => clearInterval(st.timer));
      on(carousel, 'mouseleave', () => { st.timer = setInterval(() => next(carousel), interval); });
    }
    function init() {
      $$('.carousel').forEach(carousel => {
        goTo(carousel, 0);
        startAuto(carousel);
        let startX = 0;
        on(carousel, 'touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
        on(carousel, 'touchend', e => {
          const dx = e.changedTouches[0].clientX - startX;
          if (Math.abs(dx) > 40) dx < 0 ? next(carousel) : prev(carousel);
        });
      });
      on(doc, 'click', function (e) {
        const btn = e.target.closest('[data-carousel-next]');
        if (btn) { const c = btn.closest('.carousel') || $(attr(btn, 'data-carousel-next')); if (c) next(c); return; }
        const prevBtn = e.target.closest('[data-carousel-prev]');
        if (prevBtn) { const c = prevBtn.closest('.carousel') || $(attr(prevBtn, 'data-carousel-prev')); if (c) prev(c); return; }
        const dot = e.target.closest('.carousel-dot');
        if (dot) {
          const carousel = dot.closest('.carousel');
          if (carousel) goTo(carousel, $$('.carousel-dot', carousel).indexOf(dot));
          return;
        }
        const thumb = e.target.closest('.carousel-thumbnail');
        if (thumb) {
          const carousel = thumb.closest('[data-carousel-id]') ||
            doc.querySelector(`.carousel[data-id="${attr(thumb, 'data-carousel-id')}"]`);
          const thumbs = $$('.carousel-thumbnail');
          if (carousel) goTo(carousel, thumbs.indexOf(thumb));
        }
      });
    }
    return { init, next, prev, goTo };
  })();

  
  const Progress = (function () {
    function set(bar, value) {
      const fill = bar.querySelector('.progress-bar-fill');
      if (!fill) return;
      const pct = Math.min(100, Math.max(0, value));
      fill.style.width = pct + '%';
      attr(bar, 'aria-valuenow', String(pct));
      emit(bar, 'progresschange', { value: pct });
    }
    function init() {
      $$('.progress-bar[data-value]').forEach(bar => {
        set(bar, parseFloat(attr(bar, 'data-value') || '0'));
      });
      $$('.progress-circular[data-value]').forEach(el => {
        const val = parseFloat(attr(el, 'data-value') || '0');
        const fill = el.querySelector('.progress-circular-fill');
        const r = parseFloat(attr(fill, 'r') || '18');
        const circ = 2 * Math.PI * r;
        if (fill) {
          fill.style.strokeDasharray = circ;
          fill.style.strokeDashoffset = circ - (circ * val / 100);
        }
        const label = el.querySelector('.progress-circular-label');
        if (label) label.textContent = Math.round(val) + '%';
      });
    }
    return { init, set };
  })();

  
  const Toggle = (function () {
    function init() {
      on(doc, 'change', function (e) {
        const input = e.target.closest('.toggle input[type="checkbox"]');
        if (!input) return;
        emit(input, 'togglechange', { checked: input.checked });
      });
      on(doc, 'click', function (e) {
        const wrapper = e.target.closest('.toggle-wrapper');
        if (wrapper && e.target === wrapper) {
          const input = wrapper.querySelector('input[type="checkbox"]');
          if (input) input.click();
        }
      });
    }
    return { init };
  })();

  
  const Rating = (function () {
    function update(stars, value) {
      stars.forEach((star, i) => toggleClass(star, 'is-active', i < value));
    }
    function init() {
      $$('.rating:not(.rating-readonly)').forEach(rating => {
        const stars = $$('.rating-star', rating);
        let current = stars.filter(s => hasClass(s, 'is-active')).length;
        stars.forEach((star, i) => {
          on(star, 'mouseenter', () => update(stars, i + 1));
          on(star, 'mouseleave', () => update(stars, current));
          on(star, 'click', () => {
            current = i + 1;
            update(stars, current);
            const input = rating.querySelector('input[type="hidden"]');
            if (input) input.value = current;
            emit(rating, 'ratingchange', { value: current });
          });
          on(star, 'keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); star.click(); }
            if (e.key === 'ArrowRight' && i < stars.length - 1) stars[i + 1].focus();
            if (e.key === 'ArrowLeft' && i > 0) stars[i - 1].focus();
          });
        });
      });
    }
    return { init };
  })();

  
  const Segmented = (function () {
    function activate(item) {
      const control = item.closest('.segmented-control, .segmented-control-full');
      if (!control) return;
      $$('.segmented-item', control).forEach(i => {
        removeClass(i, 'is-active');
        attr(i, 'aria-pressed', 'false');
      });
      addClass(item, 'is-active');
      attr(item, 'aria-pressed', 'true');
      emit(control, 'segmentchange', { value: attr(item, 'data-value') || item.textContent.trim() });
    }
    function init() {
      on(doc, 'click', function (e) {
        const item = e.target.closest('.segmented-item');
        if (item) activate(item);
      });
      on(doc, 'keydown', function (e) {
        const item = e.target.closest('.segmented-item');
        if (!item) return;
        const control = item.closest('.segmented-control, .segmented-control-full');
        if (!control) return;
        const items = $$('.segmented-item', control);
        const idx = items.indexOf(item);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0]).focus(); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1]).focus(); }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(item); }
      });
    }
    return { init, activate };
  })();

  
  const TreeView = (function () {
    function toggle(item) {
      const open = hasClass(item, 'is-open');
      toggleClass(item, 'is-open', !open);
      const children = item.querySelector('.tree-children');
      if (children) children.style.display = open ? 'none' : '';
      emit(item, 'treeitemtoggle', { open: !open });
    }
    function init() {
      $$('.tree-item .tree-children').forEach(c => { c.style.display = 'none'; });
      on(doc, 'click', function (e) {
        const toggle_btn = e.target.closest('.tree-item-toggle');
        if (toggle_btn) {
          e.stopPropagation();
          const item = toggle_btn.closest('.tree-item');
          if (item) toggle(item);
          return;
        }
        const row = e.target.closest('.tree-item-row');
        if (row) {
          const item = row.closest('.tree-item');
          if (item && item.querySelector('.tree-children')) toggle(item);
          $$('.tree-item-row.is-active').forEach(r => removeClass(r, 'is-active'));
          addClass(row, 'is-active');
        }
      });
    }
    return { init, toggle };
  })();

  
  const SpeedDial = (function () {
    function open(dial) { addClass(dial, 'is-open'); emit(dial, 'speeddialopen'); }
    function close(dial) { removeClass(dial, 'is-open'); emit(dial, 'speeddialclose'); }
    function toggle(dial) { hasClass(dial, 'is-open') ? close(dial) : open(dial); }
    function init() {
      on(doc, 'click', function (e) {
        const fab = e.target.closest('.speed-dial > .fab');
        if (fab) { const dial = fab.closest('.speed-dial'); if (dial) toggle(dial); return; }
        $$('.speed-dial.is-open').forEach(d => { if (!d.contains(e.target)) close(d); });
      });
      on(doc, 'keydown', function (e) {
        if (e.key === 'Escape') $$('.speed-dial.is-open').forEach(close);
      });
    }
    return { init, open, close, toggle };
  })();

  
  const ContextMenu = (function () {
    let current = null;
    function show(menu, x, y) {
      hide();
      addClass(menu, 'is-open');
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
      if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';
      current = menu;
      emit(menu, 'contextmenuopen');
    }
    function hide() {
      if (current) { removeClass(current, 'is-open'); emit(current, 'contextmenuclose'); current = null; }
    }
    function init() {
      on(doc, 'contextmenu', function (e) {
        const trigger = e.target.closest('[data-context-menu]');
        if (!trigger) return;
        const menu = $(attr(trigger, 'data-context-menu'));
        if (!menu) return;
        e.preventDefault();
        show(menu, e.clientX, e.clientY);
      });
      on(doc, 'click', function (e) {
        if (current && !current.contains(e.target)) hide();
      });
      on(doc, 'keydown', function (e) { if (e.key === 'Escape') hide(); });
      on(doc, 'scroll', hide, true);
    }
    return { init, show, hide };
  })();

  
  const Lightbox = (function () {
    let box = null;
    let imgs = [];
    let idx = 0;
    function build() {
      if (box) return;
      box = doc.createElement('div');
      addClass(box, 'lightbox');
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.innerHTML = `<button class="lightbox-close" aria-label="Close">&times;</button>
        <button class="lightbox-nav lightbox-nav-prev" aria-label="Previous">&#8249;</button>
        <div class="lightbox-content"><img alt="" /></div>
        <button class="lightbox-nav lightbox-nav-next" aria-label="Next">&#8250;</button>`;
      doc.body.appendChild(box);
      on(box.querySelector('.lightbox-close'), 'click', close);
      on(box.querySelector('.lightbox-nav-prev'), 'click', () => navigate(-1));
      on(box.querySelector('.lightbox-nav-next'), 'click', () => navigate(1));
      on(box, 'click', e => { if (e.target === box) close(); });
    }
    function open(items, startIdx) {
      build();
      imgs = items;
      idx = startIdx || 0;
      render();
      addClass(box, 'is-open');
      lockScroll();
      box.focus();
      emit(box, 'lightboxopen');
    }
    function close() {
      if (!box) return;
      removeClass(box, 'is-open');
      unlockScroll();
      emit(box, 'lightboxclose');
    }
    function render() {
      const img = box.querySelector('img');
      const src = typeof imgs[idx] === 'string' ? imgs[idx] : imgs[idx]?.src || imgs[idx]?.dataset?.src;
      if (img && src) img.src = src;
      const prev = box.querySelector('.lightbox-nav-prev');
      const next = box.querySelector('.lightbox-nav-next');
      if (prev) prev.hidden = imgs.length <= 1;
      if (next) next.hidden = imgs.length <= 1;
    }
    function navigate(dir) {
      idx = ((idx + dir) + imgs.length) % imgs.length;
      render();
      emit(box, 'lightboxnavigate', { index: idx });
    }
    function init() {
      on(doc, 'click', function (e) {
        const item = e.target.closest('.gallery-item[data-lightbox], [data-lightbox-src]');
        if (!item) return;
        const group = attr(item, 'data-lightbox');
        const sources = group
          ? $$(`[data-lightbox="${group}"]`).map(el => attr(el, 'data-lightbox-src') || el.querySelector('img')?.src).filter(Boolean)
          : [attr(item, 'data-lightbox-src') || item.querySelector('img')?.src].filter(Boolean);
        const startIdx = group
          ? $$(`[data-lightbox="${group}"]`).indexOf(item)
          : 0;
        if (sources.length) open(sources, startIdx);
      });
      on(doc, 'keydown', function (e) {
        if (!box || !hasClass(box, 'is-open')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowRight') navigate(1);
        if (e.key === 'ArrowLeft') navigate(-1);
      });
    }
    return { init, open, close, navigate };
  })();

  
  const Autocomplete = (function () {
    function open(list) { addClass(list, 'is-open'); }
    function close(list) { removeClass(list, 'is-open'); }
    function init() {
      on(doc, 'input', function (e) {
        const inp = e.target;
        if (!inp.closest('.autocomplete')) return;
        const list = inp.closest('.autocomplete')?.querySelector('.autocomplete-list');
        if (!list) return;
        const q = inp.value.toLowerCase().trim();
        let any = false;
        $$('.autocomplete-item', list).forEach(item => {
          const match = !q || item.textContent.toLowerCase().includes(q);
          item.hidden = !match;
          if (match) any = true;
        });
        any ? open(list) : close(list);
      });
      on(doc, 'click', function (e) {
        const item = e.target.closest('.autocomplete-item');
        if (item) {
          const ac = item.closest('.autocomplete');
          if (ac) {
            const inp = ac.querySelector('input');
            if (inp) inp.value = item.dataset.value || item.textContent.trim();
            close(ac.querySelector('.autocomplete-list'));
            emit(ac, 'autocompleteselect', { value: inp?.value });
          }
          return;
        }
        $$('.autocomplete-list.is-open').forEach(list => {
          if (!list.closest('.autocomplete').contains(e.target)) close(list);
        });
      });
      on(doc, 'keydown', function (e) {
        const inp = e.target;
        const ac = inp.closest?.('.autocomplete');
        if (!ac) return;
        const list = ac.querySelector('.autocomplete-list');
        if (!list) return;
        const items = $$('.autocomplete-item:not([hidden])', list);
        const focused = list.querySelector('.is-focused');
        const idx = items.indexOf(focused);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (focused) removeClass(focused, 'is-focused');
          (items[idx + 1] || items[0])?.classList.add('is-focused');
          open(list);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (focused) removeClass(focused, 'is-focused');
          (items[idx - 1] || items[items.length - 1])?.classList.add('is-focused');
        }
        if (e.key === 'Enter' && focused) { e.preventDefault(); focused.click(); }
        if (e.key === 'Escape') close(list);
      });
      on(doc, 'focusout', function (e) {
        const ac = e.target.closest?.('.autocomplete');
        if (ac) setTimeout(() => { if (!ac.contains(doc.activeElement)) close(ac.querySelector('.autocomplete-list')); }, 150);
      });
    }
    return { init, open, close };
  })();

  
  const DatePicker = (function () {
    const state = new WeakMap();
    function render(picker) {
      const st = state.get(picker);
      if (!st) return;
      const grid = picker.querySelector('.date-picker-grid');
      const title = picker.querySelector('.date-picker-title');
      if (!grid || !title) return;
      const { year, month, selected } = st;
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      title.textContent = `${months[month]} ${year}`;
      const days = ['Su','Mo','Tu','We','Th','Fr','Sa'];
      const first = new Date(year, month, 1).getDay();
      const total = new Date(year, month + 1, 0).getDate();
      const today = new Date();
      let html = days.map(d => `<div class="date-picker-day-label">${d}</div>`).join('');
      for (let i = 0; i < first; i++) html += '<div></div>';
      for (let d = 1; d <= total; d++) {
        const date = new Date(year, month, d);
        const iso = date.toISOString().slice(0, 10);
        const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        const isSel = selected && iso === selected;
        html += `<button class="date-picker-cell${isToday ? ' is-today' : ''}${isSel ? ' is-selected' : ''}" data-date="${iso}" tabindex="${isSel || (!selected && isToday) ? 0 : -1}">${d}</button>`;
      }
      grid.innerHTML = html;
    }
    function init() {
      $$('.date-picker-wrapper').forEach(picker => {
        const today = new Date();
        state.set(picker, { year: today.getFullYear(), month: today.getMonth(), selected: null });
        render(picker);
      });
      on(doc, 'click', function (e) {
        const prev = e.target.closest('[data-datepicker-prev]');
        if (prev) {
          const picker = prev.closest('.date-picker-wrapper');
          if (!picker) return;
          const st = state.get(picker);
          st.month--; if (st.month < 0) { st.month = 11; st.year--; }
          render(picker); return;
        }
        const next = e.target.closest('[data-datepicker-next]');
        if (next) {
          const picker = next.closest('.date-picker-wrapper');
          if (!picker) return;
          const st = state.get(picker);
          st.month++; if (st.month > 11) { st.month = 0; st.year++; }
          render(picker); return;
        }
        const cell = e.target.closest('.date-picker-cell');
        if (cell) {
          const picker = cell.closest('.date-picker-wrapper');
          if (!picker) return;
          const st = state.get(picker);
          st.selected = attr(cell, 'data-date');
          render(picker);
          const inp = $(`input[data-datepicker-for]`) ||
            picker.parentElement?.querySelector('input');
          if (inp) { inp.value = st.selected; emit(inp, 'change'); }
          emit(picker, 'dateselect', { date: st.selected });
        }
      });
    }
    return { init, render };
  })();

  
  const OtpInput = (function () {
    function init() {
      $$('.input-otp').forEach(otp => {
        const inputs = $$('input', otp);
        inputs.forEach((inp, i) => {
          on(inp, 'input', e => {
            const val = inp.value.replace(/\D/g, '').slice(0, 1);
            inp.value = val;
            if (val && inputs[i + 1]) inputs[i + 1].focus();
            if (inputs.every(f => f.value)) emit(otp, 'otpcomplete', { value: inputs.map(f => f.value).join('') });
          });
          on(inp, 'keydown', e => {
            if (e.key === 'Backspace' && !inp.value && inputs[i - 1]) inputs[i - 1].focus();
            if (e.key === 'ArrowRight' && inputs[i + 1]) inputs[i + 1].focus();
            if (e.key === 'ArrowLeft' && inputs[i - 1]) inputs[i - 1].focus();
          });
          on(inp, 'paste', e => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
            paste.split('').forEach((ch, j) => { if (inputs[i + j]) inputs[i + j].value = ch; });
            const next = inputs[Math.min(i + paste.length, inputs.length - 1)];
            if (next) next.focus();
          });
        });
      });
    }
    return { init };
  })();

  
  const Dropzone = (function () {
    function init() {
      $$('.dropzone').forEach(zone => {
        on(zone, 'dragover', e => { e.preventDefault(); addClass(zone, 'drag-over'); });
        on(zone, 'dragleave', e => { if (!zone.contains(e.relatedTarget)) removeClass(zone, 'drag-over'); });
        on(zone, 'drop', e => {
          e.preventDefault();
          removeClass(zone, 'drag-over');
          const files = Array.from(e.dataTransfer.files);
          emit(zone, 'dropzonefiles', { files });
        });
        on(zone, 'click', () => {
          const inp = zone.querySelector('input[type="file"]') || (() => {
            const i = doc.createElement('input');
            i.type = 'file'; i.hidden = true; zone.appendChild(i); return i;
          })();
          inp.click();
          on(inp, 'change', () => emit(zone, 'dropzonefiles', { files: Array.from(inp.files) }), { once: true });
        });
      });
    }
    return { init };
  })();

  
  const Clipboard = (function () {
    function copy(text, btn) {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(() => {
        if (btn) {
          const orig = btn.innerHTML;
          btn.innerHTML = btn.dataset.copiedLabel || 'Copied';
          addClass(btn, 'copied');
          setTimeout(() => { btn.innerHTML = orig; removeClass(btn, 'copied'); }, 2000);
        }
      });
    }
    function init() {
      on(doc, 'click', function (e) {
        const btn = e.target.closest('[data-copy], .code-block-copy');
        if (!btn) return;
        const target = attr(btn, 'data-copy');
        const text = target
          ? ($(target)?.value || $(target)?.textContent || target)
          : btn.closest('.code-block')?.querySelector('pre')?.textContent || '';
        copy(text, btn);
      });
    }
    return { init, copy };
  })();

  
  const ScrollSpy = (function () {
    function init() {
      const navLinks = $$('[data-scrollspy]');
      if (!navLinks.length) return;
      const sections = navLinks.map(l => $(attr(l, 'data-scrollspy'))).filter(Boolean);
      if (!sections.length) return;
      const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            navLinks.forEach(l => removeClass(l, 'is-active'));
            const link = navLinks.find(l => $(attr(l, 'data-scrollspy')) === entry.target);
            if (link) addClass(link, 'is-active');
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      sections.forEach(s => obs.observe(s));
    }
    return { init };
  })();

  
  const StickyNav = (function () {
    function init() {
      const navbar = $('.navbar.navbar-sticky, nav.navbar-sticky');
      if (!navbar) return;
      let lastY = window.scrollY;
      on(window, 'scroll', () => {
        const y = window.scrollY;
        toggleClass(navbar, 'is-scrolled', y > 0);
        toggleClass(navbar, 'is-hidden', y > lastY && y > 80);
        lastY = y;
      }, { passive: true });
    }
    return { init };
  })();

  
  const SmoothScroll = (function () {
    function init() {
      on(doc, 'click', function (e) {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;
        const id = attr(link, 'href').slice(1);
        if (!id) return;
        const target = doc.getElementById(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', '#' + id);
      });
    }
    return { init };
  })();

  
  const Skeleton = (function () {
    function remove(el) { removeClass(el, 'skeleton'); }
    function init() {
      $$('[data-skeleton-src]').forEach(el => {
        const img = new Image();
        img.src = attr(el, 'data-skeleton-src');
        img.onload = () => {
          el.src = img.src;
          remove(el.closest('.skeleton') || el);
        };
      });
    }
    return { init, remove };
  })();

  
  const Stepper = (function () {
    function goTo(stepper, targetIdx) {
      const steps = $$('.step', stepper);
      const connectors = $$('.step-connector', stepper);
      steps.forEach((step, i) => {
        removeClass(step, 'is-active', 'is-completed');
        if (i < targetIdx) addClass(step, 'is-completed');
        if (i === targetIdx) addClass(step, 'is-active');
      });
      connectors.forEach((c, i) => toggleClass(c, 'is-completed', i < targetIdx));
      attr(stepper, 'data-step', String(targetIdx));
      emit(stepper, 'stepchange', { step: targetIdx });
    }
    function next(stepper) {
      const cur = parseInt(attr(stepper, 'data-step') || '0');
      const total = $$('.step', stepper).length;
      if (cur < total - 1) goTo(stepper, cur + 1);
    }
    function prev(stepper) {
      const cur = parseInt(attr(stepper, 'data-step') || '0');
      if (cur > 0) goTo(stepper, cur - 1);
    }
    function init() {
      $$('.stepper').forEach(s => {
        const active = $$('.step', s).findIndex(st => hasClass(st, 'is-active'));
        goTo(s, active >= 0 ? active : 0);
      });
      on(doc, 'click', function (e) {
        const btn = e.target.closest('[data-stepper-next]');
        if (btn) { const s = btn.closest('.stepper') || $(attr(btn, 'data-stepper-next')); if (s) next(s); return; }
        const pb = e.target.closest('[data-stepper-prev]');
        if (pb) { const s = pb.closest('.stepper') || $(attr(pb, 'data-stepper-prev')); if (s) prev(s); return; }
        const step = e.target.closest('.step[data-step-index]');
        if (step) {
          const stepper = step.closest('.stepper');
          if (stepper) goTo(stepper, parseInt(attr(step, 'data-step-index')));
        }
      });
    }
    return { init, next, prev, goTo };
  })();

  
  const BottomNav = (function () {
    function init() {
      on(doc, 'click', function (e) {
        const item = e.target.closest('.bottom-nav-item');
        if (!item) return;
        const nav = item.closest('.bottom-nav');
        if (!nav) return;
        $$('.bottom-nav-item', nav).forEach(i => removeClass(i, 'is-active'));
        addClass(item, 'is-active');
        emit(nav, 'bottomnavchange', { value: attr(item, 'data-value') || item.textContent.trim() });
      });
    }
    return { init };
  })();

  
  const Alert = (function () {
    function dismiss(alert) {
      addClass(alert, 'animate-fade-out');
      on(alert, 'animationend', () => alert.remove(), { once: true });
      setTimeout(() => alert.remove(), 300);
      emit(alert, 'alertdismiss');
    }
    function init() {
      on(doc, 'click', function (e) {
        const btn = e.target.closest('.alert-close, [data-alert-close]');
        if (btn) {
          const alert = btn.closest('.alert');
          if (alert) dismiss(alert);
        }
      });
    }
    return { init, dismiss };
  })();

  
  const Chip = (function () {
    function init() {
      on(doc, 'click', function (e) {
        const btn = e.target.closest('.chip-remove, .tag-remove');
        if (!btn) return;
        const chip = btn.closest('.chip, .tag');
        if (chip) {
          emit(chip, 'chipremove');
          chip.remove();
        }
      });
    }
    return { init };
  })();

  
  const Banner = (function () {
    function dismiss(banner) {
      banner.style.maxHeight = banner.offsetHeight + 'px';
      requestAnimationFrame(() => { banner.style.transition = 'max-height .3s'; banner.style.maxHeight = '0'; });
      on(banner, 'transitionend', () => banner.remove(), { once: true });
      emit(banner, 'bannerdismiss');
    }
    function init() {
      on(doc, 'click', function (e) {
        const btn = e.target.closest('[data-banner-close]');
        if (btn) {
          const banner = btn.closest('.notification-banner');
          if (banner) dismiss(banner);
        }
      });
    }
    return { init, dismiss };
  })();

  
  const Range = (function () {
    function update(inp) {
      const output = doc.querySelector(`output[for="${inp.id}"]`) ||
        inp.parentElement?.querySelector('output');
      if (output) output.value = inp.value;
      emit(inp, 'rangeinput', { value: inp.value });
    }
    function init() {
      on(doc, 'input', function (e) {
        if (e.target.type === 'range') update(e.target);
      });
      $$('input[type="range"]').forEach(update);
    }
    return { init };
  })();

  
  const ScrollTop = (function () {
    function init() {
      on(doc, 'click', function (e) {
        const btn = e.target.closest('[data-scroll-top]');
        if (btn) window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      const btns = $$('[data-scroll-top-show]');
      if (!btns.length) return;
      on(window, 'scroll', () => {
        const show = window.scrollY > 300;
        btns.forEach(b => toggleClass(b, 'is-visible', show));
      }, { passive: true });
    }
    return { init };
  })();

  
  const AnimateOnScroll = (function () {
    function init() {
      const els = $$('[data-aos]');
      if (!els.length) return;
      const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const anim = attr(el, 'data-aos') || 'animate-fade-in';
            addClass(el, anim);
            obs.unobserve(el);
          }
        });
      }, { threshold: 0.1 });
      els.forEach(el => obs.observe(el));
    }
    return { init };
  })();

  
  function init() {
    Theme.init();
    Navbar.init();
    Sidebar.init();
    SidebarNav.init();
    Dropdown.init();
    Modal.init();
    Drawer.init();
    Tabs.init();
    Accordion.init();
    Tooltip.init();
    Popover.init();
    Toast.init();
    Command.init();
    Carousel.init();
    Progress.init();
    Toggle.init();
    Rating.init();
    Segmented.init();
    TreeView.init();
    SpeedDial.init();
    ContextMenu.init();
    Lightbox.init();
    Autocomplete.init();
    DatePicker.init();
    OtpInput.init();
    Dropzone.init();
    Clipboard.init();
    ScrollSpy.init();
    StickyNav.init();
    SmoothScroll.init();
    Skeleton.init();
    Stepper.init();
    BottomNav.init();
    Alert.init();
    Chip.init();
    Banner.init();
    Range.init();
    ScrollTop.init();
    AnimateOnScroll.init();
  }

  if (doc.readyState === 'loading') {
    on(doc, 'DOMContentLoaded', init);
  } else {
    init();
  }

  window.Core = {
    Theme, Navbar, Sidebar, SidebarNav, Dropdown, Modal, Drawer, Tabs,
    Accordion, Tooltip, Popover, Toast, Command, Carousel, Progress,
    Toggle, Rating, Segmented, TreeView, SpeedDial, ContextMenu,
    Lightbox, Autocomplete, DatePicker, OtpInput, Dropzone, Clipboard,
    ScrollSpy, StickyNav, SmoothScroll, Skeleton, Stepper, BottomNav,
    Alert, Chip, Banner, Range, ScrollTop, AnimateOnScroll,
  };

})();
