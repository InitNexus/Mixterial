(function () {
  'use strict';

  const CONFIG = {
    keys: {
      mixpanel:       '#',
      amplitude:      '#',
      segment:        '#',
      heap:           '#',
      logrocket:      '#',
      fullstory:      '#',
      hotjar:         '#',
      posthog:        '#',
      posthogHost:    'https://app.posthog.com',
      clarity:        '#',
      ga4:            '#',
      gtm:            '#',
      matomo:         '#',
      matomoUrl:      '#',
      umami:          '#',
      umamiUrl:       '#',
      plausible:      '#',
      openreplay:     '#',
      openreplayIngest: '#',
      countly:        '#',
      countlyUrl:     '#',
      pirsch:         '#',
      sentry:         '#',
      datadog:        '#',
      datadogAppId:   '#',
      newrelic:       '#',
      newrelicAppId:  '#',
      ipinfo:         '#',
      ipapi:          '#',
      abstractapi:    '#',
    },
    endpoint:         '#',
    sessionTimeout:   30,
    heartbeatInterval:60000,
  };

  const store = {
    sessionId: null,
    userId: null,
    payload: {},
    startTime: Date.now(),
    lastActivity: Date.now(),
    pageviews: 0,
    events: [],
  };

  function uuid() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  }

  function getOrSet(key, fn) {
    let v = localStorage.getItem(key);
    if (!v) { v = fn(); localStorage.setItem(key, v); }
    return v;
  }

  function now() { return new Date().toISOString(); }

  function send(url, data) {
    if (navigator.sendBeacon) {
      try { navigator.sendBeacon(url, JSON.stringify(data)); return; } catch (_) {}
    }
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), keepalive: true }).catch(() => {});
  }

  function loadScript(src, id, cb) {
    if (id && document.getElementById(id)) { if (cb) cb(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    if (id) s.id = id;
    if (cb) s.onload = cb;
    document.head.appendChild(s);
  }

  function collectBrowser() {
    const ua = navigator.userAgent;
    const p = navigator.userAgentData;
    function parseUA() {
      const browsers = [
        { name: 'Edge', rx: /Edg\/(\S+)/ },
        { name: 'Chrome', rx: /Chrome\/(\S+)/ },
        { name: 'Firefox', rx: /Firefox\/(\S+)/ },
        { name: 'Safari', rx: /Version\/(\S+).*Safari/ },
        { name: 'Opera', rx: /OPR\/(\S+)/ },
        { name: 'Samsung', rx: /SamsungBrowser\/(\S+)/ },
        { name: 'UC', rx: /UCBrowser\/(\S+)/ },
        { name: 'IE', rx: /(?:MSIE |rv:)(\d+)/ },
      ];
      for (const b of browsers) {
        const m = ua.match(b.rx);
        if (m) return { name: b.name, version: m[1] };
      }
      return { name: 'Unknown', version: 'Unknown' };
    }
    const parsed = parseUA();
    const info = {
      userAgent: ua,
      name: parsed.name,
      version: parsed.version,
      language: navigator.language,
      languages: navigator.languages?.join(','),
      platform: navigator.platform,
      vendor: navigator.vendor,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      onLine: navigator.onLine,
      javaEnabled: typeof navigator.javaEnabled === 'function' ? navigator.javaEnabled() : false,
      pdfViewerEnabled: navigator.pdfViewerEnabled,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints,
      deviceMemory: navigator.deviceMemory,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      screenWidth: screen.width,
      screenHeight: screen.height,
      screenDepth: screen.colorDepth,
      screenPixelDepth: screen.pixelDepth,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      devicePixelRatio: window.devicePixelRatio,
      orientationType: screen.orientation?.type,
      orientationAngle: screen.orientation?.angle,
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      forcedColors: window.matchMedia('(forced-colors: active)').matches,
      hdr: window.matchMedia('(dynamic-range: high)').matches,
      pointer: window.matchMedia('(pointer: coarse)').matches ? 'coarse' : window.matchMedia('(pointer: fine)').matches ? 'fine' : 'none',
      hover: window.matchMedia('(hover: hover)').matches,
      displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : window.matchMedia('(display-mode: fullscreen)').matches ? 'fullscreen' : 'browser',
      webgl: (function () {
        try {
          const c = document.createElement('canvas');
          const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
          if (!gl) return null;
          const dbg = gl.getExtension('WEBGL_debug_renderer_info');
          return {
            vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
            renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
            version: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
          };
        } catch (_) { return null; }
      })(),
      canvas: (function () {
        try {
          const c = document.createElement('canvas');
          c.width = 200; c.height = 50;
          const ctx = c.getContext('2d');
          ctx.textBaseline = 'top';
          ctx.font = '14px Arial';
          ctx.fillStyle = '#f60';
          ctx.fillRect(125, 1, 62, 20);
          ctx.fillStyle = '#069';
          ctx.fillText('analytics', 2, 15);
          return c.toDataURL().slice(-50);
        } catch (_) { return null; }
      })(),
      plugins: Array.from(navigator.plugins || []).map(p => p.name).join(','),
      mimeTypes: Array.from(navigator.mimeTypes || []).map(m => m.type).join(','),
      sessionStorage: (function () { try { return !!window.sessionStorage; } catch (_) { return false; } })(),
      localStorage: (function () { try { return !!window.localStorage; } catch (_) { return false; } })(),
      indexedDB: !!window.indexedDB,
      openDatabase: !!window.openDatabase,
      serviceWorker: 'serviceWorker' in navigator,
      webWorker: !!window.Worker,
      webAssembly: typeof WebAssembly === 'object',
      webRTC: !!(window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection),
      bluetooth: !!navigator.bluetooth,
      usb: !!navigator.usb,
      serial: !!navigator.serial,
      nfc: !!navigator.nfc,
      geolocation: !!navigator.geolocation,
      notifications: 'Notification' in window,
      notificationPermission: 'Notification' in window ? Notification.permission : null,
      vibrate: !!navigator.vibrate,
      share: !!navigator.share,
      clipboard: !!navigator.clipboard,
      credentialsAPI: !!navigator.credentials,
      paymentRequest: !!window.PaymentRequest,
      speechSynthesis: !!window.speechSynthesis,
      speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      gamepads: !!navigator.getGamepads,
      xr: !!navigator.xr,
      fonts: (function () {
        try {
          const base = ['monospace', 'sans-serif', 'serif'];
          const test = ['Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact'];
          const c = document.createElement('canvas');
          const ctx = c.getContext('2d');
          const detected = [];
          for (const font of test) {
            for (const b of base) {
              ctx.font = `72px ${b}`;
              const w1 = ctx.measureText('mmmmmmmmmmlli').width;
              ctx.font = `72px '${font}',${b}`;
              const w2 = ctx.measureText('mmmmmmmmmmlli').width;
              if (w1 !== w2) { detected.push(font); break; }
            }
          }
          return detected.join(',');
        } catch (_) { return null; }
      })(),
    };
    if (p) {
      p.getHighEntropyValues(['architecture','bitness','model','platformVersion','uaFullVersion','fullVersionList'])
        .then(hi => {
          store.payload.browser = Object.assign({}, store.payload.browser, {
            architecture: hi.architecture,
            bitness: hi.bitness,
            model: hi.model,
            platformVersion: hi.platformVersion,
            uaFullVersion: hi.uaFullVersion,
            fullVersionList: hi.fullVersionList?.map(b => `${b.brand}/${b.version}`).join(','),
            brands: p.brands?.map(b => `${b.brand}/${b.version}`).join(','),
            mobile: p.mobile,
          });
          pushToAll();
        }).catch(() => {});
    }
    return info;
  }

  function collectDevice() {
    const mem = navigator.deviceMemory;
    const cores = navigator.hardwareConcurrency;
    const touch = navigator.maxTouchPoints;
    const ua = navigator.userAgent;
    function getOS() {
      const tests = [
        { name: 'Windows 11', rx: /Windows NT 10\.0.*Win64/ },
        { name: 'Windows 10', rx: /Windows NT 10\.0/ },
        { name: 'Windows 8.1', rx: /Windows NT 6\.3/ },
        { name: 'Windows 8', rx: /Windows NT 6\.2/ },
        { name: 'Windows 7', rx: /Windows NT 6\.1/ },
        { name: 'Android', rx: /Android (\d+[\.\d]*)/ },
        { name: 'iOS', rx: /(?:iPhone|iPad|iPod).*OS (\d+_\d+)/ },
        { name: 'macOS', rx: /Mac OS X ([\d_]+)/ },
        { name: 'Linux', rx: /Linux/ },
        { name: 'ChromeOS', rx: /CrOS/ },
      ];
      for (const t of tests) {
        const m = ua.match(t.rx);
        if (m) return { name: t.name, version: m[1] ? m[1].replace(/_/g, '.') : '' };
      }
      return { name: 'Unknown', version: '' };
    }
    function getManufacturerModel() {
      const patterns = [
        { rx: /\(([^;]+);\s*([^;)]+).*Android/, mfr: 1, mdl: 2 },
        { rx: /Samsung[- ](\S+)/, mfr: 0, mdl: 1, mfrName: 'Samsung' },
        { rx: /Pixel (\d+\w*)/, mfr: 0, mdl: 1, mfrName: 'Google' },
        { rx: /iPhone(\w*)/, mfr: 0, mdl: 0, mfrName: 'Apple', mdlName: 'iPhone' },
        { rx: /iPad(\w*)/, mfr: 0, mdl: 0, mfrName: 'Apple', mdlName: 'iPad' },
        { rx: /Macintosh/, mfr: 0, mdl: 0, mfrName: 'Apple', mdlName: 'Mac' },
      ];
      for (const p of patterns) {
        const m = ua.match(p.rx);
        if (m) {
          return {
            manufacturer: p.mfrName || (m[p.mfr] || '').trim(),
            model: p.mdlName || (m[p.mdl] || '').trim(),
          };
        }
      }
      return { manufacturer: 'Unknown', model: 'Unknown' };
    }
    const os = getOS();
    const mm = getManufacturerModel();
    const info = {
      manufacturer: mm.manufacturer,
      model: mm.model,
      os: os.name,
      osVersion: os.version,
      ram: mem ? `${mem}GB` : null,
      cpuCores: cores,
      touchPoints: touch,
      touchEnabled: touch > 0,
      type: touch > 0 ? (screen.width < 768 ? 'mobile' : 'tablet') : 'desktop',
      screenWidth: screen.width,
      screenHeight: screen.height,
      pixelRatio: window.devicePixelRatio,
      colorDepth: screen.colorDepth,
      orientation: screen.orientation?.type,
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      batteryCharging: null,
      batteryLevel: null,
      batteryChargingTime: null,
      batteryDischargingTime: null,
    };
    if (navigator.getBattery) {
      navigator.getBattery().then(b => {
        store.payload.device = Object.assign({}, store.payload.device, {
          batteryCharging: b.charging,
          batteryLevel: Math.round(b.level * 100),
          batteryChargingTime: b.chargingTime,
          batteryDischargingTime: b.dischargingTime,
        });
        b.addEventListener('levelchange', () => {
          store.payload.device.batteryLevel = Math.round(b.level * 100);
        });
        b.addEventListener('chargingchange', () => {
          store.payload.device.batteryCharging = b.charging;
        });
        pushToAll();
      }).catch(() => {});
    }
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(est => {
        store.payload.device = Object.assign({}, store.payload.device, {
          storageQuota: est.quota,
          storageUsage: est.usage,
          storageQuotaMB: est.quota ? Math.round(est.quota / 1048576) : null,
          storageUsageMB: est.usage ? Math.round(est.usage / 1048576) : null,
        });
        pushToAll();
      }).catch(() => {});
    }
    return info;
  }

  function collectPage() {
    return {
      url: location.href,
      path: location.pathname,
      hash: location.hash,
      search: location.search,
      referrer: document.referrer,
      title: document.title,
      encoding: document.characterSet,
      readyState: document.readyState,
      visibilityState: document.visibilityState,
      historyLength: history.length,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      loadTime: performance.timing ? performance.timing.loadEventEnd - performance.timing.navigationStart : null,
      domContentLoaded: performance.timing ? performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart : null,
      firstPaint: null,
      firstContentfulPaint: null,
      largestContentfulPaint: null,
      cumulativeLayoutShift: null,
      firstInputDelay: null,
      timeToInteractive: null,
    };
  }

  function collectNetwork() {
    const cn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const info = {
      effectiveType: cn?.effectiveType,
      downlink: cn?.downlink,
      downlinkMax: cn?.downlinkMax,
      rtt: cn?.rtt,
      saveData: cn?.saveData,
      type: cn?.type,
      online: navigator.onLine,
    };
    if (cn) {
      cn.addEventListener('change', () => {
        store.payload.network = Object.assign({}, store.payload.network, {
          effectiveType: cn.effectiveType,
          downlink: cn.downlink,
          rtt: cn.rtt,
          saveData: cn.saveData,
          type: cn.type,
        });
      });
    }
    return info;
  }

  function measureLatency(cb) {
    const t = performance.now();
    fetch('https://cloudflare.com/cdn-cgi/trace', { cache: 'no-store', mode: 'no-cors' })
      .then(() => cb(Math.round(performance.now() - t)))
      .catch(() => cb(null));
  }

  function collectWebVitals() {
    if (!('PerformanceObserver' in window)) return;
    try {
      new PerformanceObserver(list => {
        list.getEntries().forEach(e => {
          if (e.name === 'first-paint') store.payload.page.firstPaint = Math.round(e.startTime);
          if (e.name === 'first-contentful-paint') store.payload.page.firstContentfulPaint = Math.round(e.startTime);
        });
      }).observe({ type: 'paint', buffered: true });
    } catch (_) {}
    try {
      new PerformanceObserver(list => {
        list.getEntries().forEach(e => {
          store.payload.page.largestContentfulPaint = Math.round(e.startTime);
        });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_) {}
    try {
      let cls = 0;
      new PerformanceObserver(list => {
        list.getEntries().forEach(e => { if (!e.hadRecentInput) cls += e.value; });
        store.payload.page.cumulativeLayoutShift = Math.round(cls * 1000) / 1000;
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}
    try {
      new PerformanceObserver(list => {
        list.getEntries().forEach(e => {
          store.payload.page.firstInputDelay = Math.round(e.processingStart - e.startTime);
        });
      }).observe({ type: 'first-input', buffered: true });
    } catch (_) {}
    try {
      new PerformanceObserver(list => {
        list.getEntries().forEach(e => {
          if (e.entryType === 'longtask') {
            if (!store.payload.performance) store.payload.performance = {};
            if (!store.payload.performance.longTasks) store.payload.performance.longTasks = [];
            store.payload.performance.longTasks.push({ duration: Math.round(e.duration), startTime: Math.round(e.startTime) });
          }
        });
      }).observe({ type: 'longtask', buffered: true });
    } catch (_) {}
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        store.payload.performance = Object.assign(store.payload.performance || {}, {
          dnsLookup: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
          tcpConnect: Math.round(nav.connectEnd - nav.connectStart),
          tlsHandshake: Math.round(nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0),
          ttfb: Math.round(nav.responseStart - nav.requestStart),
          download: Math.round(nav.responseEnd - nav.responseStart),
          domParse: Math.round(nav.domInteractive - nav.responseEnd),
          domComplete: Math.round(nav.domComplete - nav.domInteractive),
          resourceCount: performance.getEntriesByType('resource').length,
        });
      }
    } catch (_) {}
  }

  function fetchIPData(cb) {
    const sources = [
      { url: `https://ipinfo.io/json?token=${CONFIG.keys.ipinfo}`, map: d => ({
        ip: d.ip, isp: d.org, city: d.city, region: d.region,
        country: d.country, postal: d.postal, timezone: d.timezone,
        loc: d.loc, hostname: d.hostname,
      })},
      { url: `https://api.ipapi.com/api/check?access_key=${CONFIG.keys.ipapi}`, map: d => ({
        ip: d.ip, isp: d.connection?.isp, asn: d.connection?.asn,
        city: d.city, region: d.region_name, country: d.country_name,
        countryCode: d.country_code, continent: d.continent_name,
        continentCode: d.continent_code, lat: d.latitude, lon: d.longitude,
        timezone: d.time_zone?.id, currency: d.currency?.code,
        callingCode: d.location?.calling_code, flag: d.location?.country_flag,
      })},
      { url: `https://api.abstractapi.com/v1/ip/?api_key=${CONFIG.keys.abstractapi}`, map: d => ({
        ip: d.ip_address, isp: d.connection?.isp_name, asn: d.connection?.asn,
        connectionType: d.connection?.connection_type,
        city: d.city?.name, region: d.region?.name, country: d.country?.name,
        countryCode: d.country?.code, continent: d.continent?.name,
        continentCode: d.continent?.code, lat: d.location?.latitude, lon: d.location?.longitude,
        timezone: d.timezone?.name, currency: d.currency?.currency_name,
        isVpn: d.security?.is_vpn, isTor: d.security?.is_tor,
        isProxy: d.security?.is_proxy, isCrawler: d.security?.is_crawler,
        threatScore: d.security?.threat_score,
      })},
      { url: 'https://ipwho.is/', map: d => ({
        ip: d.ip, isp: d.connection?.isp, asn: d.connection?.asn,
        city: d.city, region: d.region, country: d.country,
        countryCode: d.country_code, continent: d.continent,
        continentCode: d.continent_code, lat: d.latitude, lon: d.longitude,
        timezone: d.timezone?.id, postalCode: d.postal,
        isEU: d.is_eu, callingCode: d.calling_code, capital: d.capital,
        org: d.connection?.org, domain: d.connection?.domain,
      })},
      { url: 'https://freeipapi.com/api/json', map: d => ({
        ip: d.ipAddress, city: d.cityName, region: d.regionName,
        country: d.countryName, countryCode: d.countryCode,
        continent: d.continentCode, lat: d.latitude, lon: d.longitude,
        timezone: d.timeZone, currency: d.currency?.code,
        isProxy: d.isProxy,
      })},
    ];
    let done = false;
    let completed = 0;
    const results = {};
    sources.forEach((src, i) => {
      fetch(src.url, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
          const mapped = src.map(d);
          Object.assign(results, mapped);
          if (!done) { done = true; cb(results); }
          completed++;
          if (completed === sources.length) cb(results);
        })
        .catch(() => { completed++; if (completed === sources.length && !done) cb(results); });
    });
  }

  function fetchCloudflareMeta(cb) {
    fetch('https://cloudflare.com/cdn-cgi/trace')
      .then(r => r.text())
      .then(txt => {
        const map = {};
        txt.trim().split('\n').forEach(line => {
          const [k, ...v] = line.split('=');
          map[k] = v.join('=');
        });
        cb({
          cfIp: map['ip'],
          cfDatacenter: map['colo'],
          cfHttp: map['http'],
          cfTls: map['tls'],
          cfWarp: map['warp'],
          cfGateway: map['gateway'],
          cfRtt: map['rtt'],
        });
      })
      .catch(() => cb({}));
  }

  function initGA4() {
    if (!CONFIG.keys.ga4 || CONFIG.keys.ga4.startsWith('YOUR')) return;
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', CONFIG.keys.ga4, { send_page_view: false });
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${CONFIG.keys.ga4}`, 'ga4-script');
  }

  function initGTM() {
    if (!CONFIG.keys.gtm || CONFIG.keys.gtm.startsWith('YOUR')) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    loadScript(`https://www.googletagmanager.com/gtm.js?id=${CONFIG.keys.gtm}`, 'gtm-script');
  }

  function initMixpanel() {
    if (!CONFIG.keys.mixpanel || CONFIG.keys.mixpanel.startsWith('YOUR')) return;
    (function (c, a) {
      if (!a.__SV) {
        var b = window; try { var d, m, j, k = b.location, f = k.hash; d = function (a, b) { return (m = a.match(RegExp(b + '=([^&]*)'))) ? m[1] : null; }; f && d(f, 'state') && (j = JSON.parse(decodeURIComponent(d(f, 'state'))), 'mpeditor' === j.action && (b.sessionStorage.setItem('_mpcehash', f), history.replaceState(j.desiredHash || '', c.title, k.pathname + k.search))); } catch (n) {}
        var l, h; window.mixpanel = a; a._i = []; a.init = function (b, d, g) { function c(a, b) { var c = b.split('.'); 2 == c.length && (a = a[c[0]], b = c[1]); a[b] = function () { a.push([b].concat(Array.prototype.slice.call(arguments, 0))); }; } var e = a; 'undefined' !== typeof g ? e = a[g] = [] : g = 'mixpanel'; var f = ['disable', 'time_event', 'track', 'track_pageview', 'track_links', 'track_forms', 'track_with_groups', 'add_group', 'set_group', 'remove_group', 'register', 'register_once', 'unregister', 'identify', 'alias', 'set_config', 'reset', 'opt_in_tracking', 'opt_out_tracking', 'has_opted_in_tracking', 'has_opted_out_tracking', 'clear_opt_in_out_tracking', 'start_batch_senders', 'people.set', 'people.set_once', 'people.unset', 'people.increment', 'people.append', 'people.union', 'people.track_charge', 'people.clear_charges', 'people.delete_user', 'people.remove']; for (h = 0; h < f.length; h++) c(e, f[h]); a._i.push([b, d, g]); }; a.__SV = 1.2; b = c.createElement('script'); b.type = 'text/javascript'; b.async = !0; b.src = 'undefined' !== typeof MIXPANEL_CUSTOM_LIB_URL ? MIXPANEL_CUSTOM_LIB_URL : 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'; d = c.getElementsByTagName('script')[0]; d.parentNode.insertBefore(b, d);
      }
    })(document, window.mixpanel || []);
    window.mixpanel.init(CONFIG.keys.mixpanel, { persistence: 'localStorage' });
  }

  function initAmplitude() {
    if (!CONFIG.keys.amplitude || CONFIG.keys.amplitude.startsWith('YOUR')) return;
    loadScript('https://cdn.amplitude.com/libs/analytics-browser-2.3.8-min.js.gz', 'amplitude-script', () => {
      if (window.amplitude) window.amplitude.init(CONFIG.keys.amplitude, undefined, { defaultTracking: { sessions: true, pageViews: true, formInteractions: true, fileDownloads: true } });
    });
  }

  function initSegment() {
    if (!CONFIG.keys.segment || CONFIG.keys.segment.startsWith('YOUR')) return;
    var analytics = window.analytics = window.analytics || [];
    if (!analytics.initialize) {
      if (analytics.invoked) return;
      analytics.invoked = true;
      analytics.methods = ['trackSubmit','trackClick','trackLink','trackForm','pageview','identify','reset','group','track','ready','alias','debug','page','once','off','on','addSourceMiddleware','addIntegrationMiddleware','setAnonymousId','addDestinationMiddleware'];
      analytics.factory = function (e) { return function () { var t = Array.prototype.slice.call(arguments); t.unshift(e); analytics.push(t); return analytics; }; };
      for (var e = 0; e < analytics.methods.length; e++) { var key = analytics.methods[e]; analytics[key] = analytics.factory(key); }
      analytics.load = function (key) {
        var t = document.createElement('script'); t.type = 'text/javascript'; t.async = true;
        t.src = 'https://cdn.segment.com/analytics.js/v1/' + key + '/analytics.min.js';
        var n = document.getElementsByTagName('script')[0]; n.parentNode.insertBefore(t, n);
      };
      analytics.SNIPPET_VERSION = '4.15.3';
      analytics.load(CONFIG.keys.segment);
    }
  }

  function initHeap() {
    if (!CONFIG.keys.heap || CONFIG.keys.heap.startsWith('YOUR')) return;
    window.heap = window.heap || [];
    window.heap.appid = CONFIG.keys.heap;
    window.heap.config = { secureCookie: true };
    var s = document.createElement('script'); s.type = 'text/javascript'; s.async = true;
    s.src = 'https://cdn.heapanalytics.com/js/heap-' + CONFIG.keys.heap + '.js';
    document.head.appendChild(s);
  }

  function initHotjar() {
    if (!CONFIG.keys.hotjar || CONFIG.keys.hotjar.startsWith('YOUR')) return;
    (function (h, o, t, j, a, r) {
      h.hj = h.hj || function () { (h.hj.q = h.hj.q || []).push(arguments); };
      h._hjSettings = { hjid: CONFIG.keys.hotjar, hjsv: 6 };
      a = o.getElementsByTagName('head')[0];
      r = o.createElement('script'); r.async = 1;
      r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
      a.appendChild(r);
    })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');
  }

  function initPostHog() {
    if (!CONFIG.keys.posthog || CONFIG.keys.posthog.startsWith('YOUR')) return;
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split('.');2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement('script')).type='text/javascript',p.async=!0,p.src=s.api_host+'/static/array.js',(r=t.getElementsByTagName('script')[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a='posthog',u.people=u.people||[],u.toString=function(t){var e='posthog';return'posthog'!==a&&(e+='.'+a),t||(e+=' (stub)'),e},u.people.toString=function(){return u.toString(1)+'.people (stub)'},o='capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId'.split(' '),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    window.posthog.init(CONFIG.keys.posthog, { api_host: CONFIG.keys.posthogHost, capture_pageview: false, capture_pageleave: true, autocapture: true, session_recording: { maskAllInputs: false } });
  }

  function initClarity() {
    if (!CONFIG.keys.clarity || CONFIG.keys.clarity.startsWith('YOUR')) return;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CONFIG.keys.clarity);
  }

  function initMatomo() {
    if (!CONFIG.keys.matomo || CONFIG.keys.matomo.startsWith('YOUR')) return;
    window._paq = window._paq || [];
    window._paq.push(['trackPageView']);
    window._paq.push(['enableLinkTracking']);
    window._paq.push(['enableHeartBeatTimer']);
    window._paq.push(['setTrackerUrl', CONFIG.keys.matomoUrl + 'matomo.php']);
    window._paq.push(['setSiteId', CONFIG.keys.matomo]);
    loadScript(CONFIG.keys.matomoUrl + 'matomo.js', 'matomo-script');
  }

  function initUmami() {
    if (!CONFIG.keys.umami || CONFIG.keys.umami.startsWith('YOUR')) return;
    const s = document.createElement('script');
    s.async = true;
    s.defer = true;
    s.src = CONFIG.keys.umamiUrl + 'script.js';
    s.setAttribute('data-website-id', CONFIG.keys.umami);
    document.head.appendChild(s);
  }

  function initPlausible() {
    if (!CONFIG.keys.plausible || CONFIG.keys.plausible.startsWith('YOUR')) return;
    const s = document.createElement('script');
    s.async = true;
    s.defer = true;
    s.src = 'https://plausible.io/js/script.outbound-links.file-downloads.tagged-events.js';
    s.setAttribute('data-domain', CONFIG.keys.plausible);
    document.head.appendChild(s);
    window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
  }

  function initPirsch() {
    if (!CONFIG.keys.pirsch || CONFIG.keys.pirsch.startsWith('YOUR')) return;
    const s = document.createElement('script');
    s.src = 'https://api.pirsch.io/pa.js';
    s.id = 'pianjs';
    s.defer = true;
    s.setAttribute('data-code', CONFIG.keys.pirsch);
    document.head.appendChild(s);
  }

  function initCountly() {
    if (!CONFIG.keys.countly || CONFIG.keys.countly.startsWith('YOUR')) return;
    window.Countly = window.Countly || {};
    window.Countly.q = window.Countly.q || [];
    window.Countly.app_key = CONFIG.keys.countly;
    window.Countly.url = CONFIG.keys.countlyUrl;
    window.Countly.q.push(['track_sessions']);
    window.Countly.q.push(['track_pageview']);
    window.Countly.q.push(['track_clicks']);
    window.Countly.q.push(['track_scrolls']);
    window.Countly.q.push(['track_errors']);
    window.Countly.q.push(['track_links']);
    window.Countly.q.push(['track_forms']);
    window.Countly.q.push(['collect_from_forms']);
    loadScript(CONFIG.keys.countlyUrl + 'sdk-web/countly.min.js', 'countly-script');
  }

  function initOpenReplay() {
    if (!CONFIG.keys.openreplay || CONFIG.keys.openreplay.startsWith('YOUR')) return;
    loadScript('https://static.openreplay.com/latest/openreplay.js', 'openreplay-script', () => {
      if (window.OpenReplay) {
        const tracker = new window.OpenReplay({ projectKey: CONFIG.keys.openreplay, ingestPoint: CONFIG.keys.openreplayIngest });
        tracker.start();
      }
    });
  }

  function initSentry() {
    if (!CONFIG.keys.sentry || CONFIG.keys.sentry.startsWith('YOUR')) return;
    loadScript('https://browser.sentry-cdn.com/7.80.1/bundle.tracing.replay.min.js', 'sentry-script', () => {
      if (window.Sentry) {
        window.Sentry.init({
          dsn: CONFIG.keys.sentry,
          integrations: [new window.Sentry.BrowserTracing(), new window.Sentry.Replay()],
          tracesSampleRate: 1.0,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        });
      }
    });
  }

  function initDatadog() {
    if (!CONFIG.keys.datadog || CONFIG.keys.datadog.startsWith('YOUR')) return;
    loadScript('https://www.datadoghq-browser-agent.com/us1/v5/datadog-rum.js', 'datadog-script', () => {
      if (window.DD_RUM) {
        window.DD_RUM.init({
          clientToken: CONFIG.keys.datadog,
          applicationId: CONFIG.keys.datadogAppId,
          site: 'datadoghq.com',
          service: 'web',
          sessionSampleRate: 100,
          sessionReplaySampleRate: 20,
          trackUserInteractions: true,
          trackResources: true,
          trackLongTasks: true,
          defaultPrivacyLevel: 'mask-user-input',
        });
        window.DD_RUM.startSessionReplayRecording();
      }
    });
  }

  function pushEvent(name, data) {
    const enriched = Object.assign({}, data, {
      sessionId: store.sessionId,
      userId: store.userId,
      timestamp: now(),
      url: location.href,
    });
    store.events.push({ name, data: enriched });
    if (window.gtag) window.gtag('event', name, data);
    if (window.mixpanel && window.mixpanel.track) window.mixpanel.track(name, enriched);
    if (window.amplitude) window.amplitude.track(name, enriched);
    if (window.analytics && window.analytics.track) window.analytics.track(name, enriched);
    if (window.heap && window.heap.track) window.heap.track(name, enriched);
    if (window.posthog && window.posthog.capture) window.posthog.capture(name, enriched);
    if (window.Countly && window.Countly.q) window.Countly.q.push(['add_event', { key: name, segmentation: enriched }]);
    if (window.plausible) window.plausible(name, { props: enriched });
    if (window._paq) window._paq.push(['trackEvent', 'Analytics', name, JSON.stringify(data)]);
    if (window.clarity) window.clarity('event', name);
  }

  function pushPageview() {
    store.pageviews++;
    const data = { url: location.href, title: document.title, referrer: document.referrer, pageview: store.pageviews };
    if (window.gtag) window.gtag('event', 'page_view', { page_title: document.title, page_location: location.href });
    if (window.mixpanel) window.mixpanel.track('Page View', data);
    if (window.amplitude) window.amplitude.track('Page View', data);
    if (window.analytics) window.analytics.page(document.title, data);
    if (window.heap) window.heap.track('Page View', data);
    if (window.posthog) window.posthog.capture('$pageview', data);
    if (window._paq) { window._paq.push(['setCustomUrl', location.href]); window._paq.push(['setDocumentTitle', document.title]); window._paq.push(['trackPageView']); }
    if (window.Countly) window.Countly.q.push(['track_pageview', location.href]);
    if (window.plausible) window.plausible('pageview');
  }

  function pushIdentify(userId, traits) {
    store.userId = userId;
    if (window.mixpanel) { window.mixpanel.identify(userId); if (traits) window.mixpanel.people.set(traits); }
    if (window.amplitude) window.amplitude.setUserId(userId);
    if (window.analytics) window.analytics.identify(userId, traits);
    if (window.heap) { window.heap.identify(userId); if (traits) window.heap.addUserProperties(traits); }
    if (window.posthog) window.posthog.identify(userId, traits);
    if (window.Countly) { window.Countly.q.push(['change_id', userId]); if (traits) window.Countly.q.push(['user_details', traits]); }
  }

  function pushToAll() {
    const payload = Object.assign({}, store.payload, {
      sessionId: store.sessionId,
      userId: store.userId,
      timestamp: now(),
      sessionDuration: Math.round((Date.now() - store.startTime) / 1000),
    });
    if (CONFIG.endpoint && !CONFIG.endpoint.startsWith('https://YOUR')) {
      send(CONFIG.endpoint, payload);
    }
    if (window.mixpanel && window.mixpanel.register) window.mixpanel.register(flatten('', { device: store.payload.device, browser: store.payload.browser, network: store.payload.network, location: store.payload.location }));
    if (window.posthog && window.posthog.register) window.posthog.register({ device: store.payload.device, browser: store.payload.browser, location: store.payload.location });
    if (window.amplitude) {
      const id = new window.amplitude.Identify();
      const flat = flatten('', { device: store.payload.device, browser: store.payload.browser, location: store.payload.location });
      Object.entries(flat).forEach(([k, v]) => { if (v != null) id.set(k, String(v)); });
      window.amplitude.identify(id);
    }
    if (window.heap) {
      const flat = flatten('', { device: store.payload.device, browser: store.payload.browser, location: store.payload.location });
      window.heap.addUserProperties(flat);
    }
    if (window.DD_RUM) {
      window.DD_RUM.setGlobalContextProperty('device', store.payload.device);
      window.DD_RUM.setGlobalContextProperty('network', store.payload.network);
      window.DD_RUM.setGlobalContextProperty('location', store.payload.location);
    }
  }

  function flatten(prefix, obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj || {})) {
      const key = prefix ? `${prefix}_${k}` : k;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        Object.assign(out, flatten(key, v));
      } else {
        out[key] = v;
      }
    }
    return out;
  }

  function trackErrors() {
    window.addEventListener('error', e => {
      pushEvent('js_error', { message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno, stack: e.error?.stack?.slice(0, 500) });
    });
    window.addEventListener('unhandledrejection', e => {
      pushEvent('unhandled_rejection', { reason: String(e.reason).slice(0, 500) });
    });
  }

  function trackEngagement() {
    let maxScroll = 0;
    let hidden = false;
    let hiddenAt = null;
    window.addEventListener('scroll', () => {
      const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      if (pct > maxScroll) {
        maxScroll = pct;
        if (pct % 25 === 0) pushEvent('scroll_depth', { depth: pct });
      }
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        hidden = true;
        hiddenAt = Date.now();
        pushEvent('page_hidden', { timeOnPage: Math.round((Date.now() - store.startTime) / 1000) });
      } else {
        if (hidden && hiddenAt) {
          const away = Math.round((Date.now() - hiddenAt) / 1000);
          pushEvent('page_visible', { awaySeconds: away });
        }
        hidden = false;
        hiddenAt = null;
      }
    });
    window.addEventListener('beforeunload', () => {
      pushEvent('page_exit', {
        timeOnPage: Math.round((Date.now() - store.startTime) / 1000),
        maxScrollDepth: maxScroll,
        pageviews: store.pageviews,
      });
    });
    document.addEventListener('click', e => {
      const el = e.target;
      const tag = el.tagName.toLowerCase();
      if (tag === 'a') pushEvent('link_click', { href: el.href, text: el.textContent?.trim().slice(0, 100) });
      if (tag === 'button' || el.type === 'button' || el.type === 'submit') pushEvent('button_click', { text: el.textContent?.trim().slice(0, 100), id: el.id });
    });
    document.addEventListener('submit', e => {
      const form = e.target;
      pushEvent('form_submit', { id: form.id, name: form.name, action: form.action });
    });
  }

  function trackSPA() {
    let lastPath = location.pathname;
    const orig = history.pushState.bind(history);
    history.pushState = function (...args) {
      orig(...args);
      if (location.pathname !== lastPath) { lastPath = location.pathname; pushPageview(); }
    };
    window.addEventListener('popstate', () => {
      if (location.pathname !== lastPath) { lastPath = location.pathname; pushPageview(); }
    });
  }

  function heartbeat() {
    setInterval(() => {
      const idle = (Date.now() - store.lastActivity) / 1000;
      if (idle < CONFIG.sessionTimeout) {
        pushEvent('heartbeat', { timeOnPage: Math.round((Date.now() - store.startTime) / 1000), idle: Math.round(idle) });
      }
    }, CONFIG.heartbeatInterval);
    ['mousemove','keydown','scroll','click','touchstart'].forEach(ev => {
      window.addEventListener(ev, () => { store.lastActivity = Date.now(); }, { passive: true });
    });
  }

  function init() {
    store.sessionId = getOrSet('_analytics_sid', uuid);
    store.userId = localStorage.getItem('_analytics_uid') || null;

    store.payload.browser = collectBrowser();
    store.payload.device = collectDevice();
    store.payload.page = collectPage();
    store.payload.network = collectNetwork();
    store.payload.location = {};
    store.payload.performance = {};

    collectWebVitals();

    fetchIPData(ipData => {
      store.payload.location = ipData;
      fetchCloudflareMeta(cfData => {
        store.payload.location = Object.assign({}, store.payload.location, cfData);
        measureLatency(ms => {
          store.payload.network.latency = ms;
          pushToAll();
          pushPageview();
        });
      });
    });

    initGA4();
    initGTM();
    initMixpanel();
    initAmplitude();
    initSegment();
    initHeap();
    initHotjar();
    initPostHog();
    initClarity();
    initMatomo();
    initUmami();
    initPlausible();
    initPirsch();
    initCountly();
    initOpenReplay();
    initSentry();
    initDatadog();

    trackErrors();
    trackEngagement();
    trackSPA();
    heartbeat();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.Analytics = {
    event: pushEvent,
    pageview: pushPageview,
    identify: pushIdentify,
    getPayload: () => Object.assign({}, store.payload),
    getSession: () => store.sessionId,
    config: CONFIG,
  };

})();