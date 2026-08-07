(function (window, document) {
	"use strict";

	var Mixterial = window.Mixterial || {};

	var Configuration = {
		themeBaseUrl: "https://initnexus.github.io/Mixterial/core/styling/themes/",
		languageBaseUrl: "https://initnexus.github.io/Mixterial/data/languages/",
		iconBaseUrl: "https://initnexus.github.io/Mixterial/media/icons/",
		privacyPolicyUrl: "https://initnexus.github.io/Mixterial/information/documentation/pages/privacy-policy.html",
		defaultTheme: "midnight",
		defaultLanguage: "english",
		availableThemes: [
			"light.css", "dark.css", "midnight.css", "amoled.css",
			"frappe.css", "macchiato.css", "mocha.css", "latte.css",
			"aura.css", "azure.css", "bloody.css", "blossom.css",
			"clay.css", "forest.css", "sunrise.css", "volcano.css",
			"facebook.css", "messenger.css", "threads.css", "whatsapp.css",
			"x.css", "telegram.css", "snapchat.css", "tiktok.css",
			"discord.css", "youtube.css", "reddit.css", "pinterest.css",
			"twitch.css", "kik.css", "spotify.css", "soundcloud.css",
			"instagram.css"
		],
		availableLanguages: [
			"english.json", "french.json", "german.json", "spanish.json",
			"russian.json", "portuguese.json", "chinese.json", "japanese.json"
		],
		storageKeyPrefix: "mixterial:"
	};

	var StorageKeys = {
		selectedTheme: Configuration.storageKeyPrefix + "selected-theme",
		selectedLanguage: Configuration.storageKeyPrefix + "selected-language",
		consentChoiceMade: Configuration.storageKeyPrefix + "consent-choice-made",
		consentStatus: Configuration.storageKeyPrefix + "consent-status",
		consentTimestamp: Configuration.storageKeyPrefix + "consent-timestamp",
		translateProvider: Configuration.storageKeyPrefix + "translate-provider",
		translateTargetLanguageCode: Configuration.storageKeyPrefix + "translate-target-language-code"
	};

	var memoryStorageFallback = {};

	function isLocalStorageAvailable() {
		try {
			var testKey = Configuration.storageKeyPrefix + "storage-test";
			window.localStorage.setItem(testKey, "1");
			window.localStorage.removeItem(testKey);
			return true;
		} catch (error) {
			return false;
		}
	}

	var localStorageAvailable = isLocalStorageAvailable();

	var Storage = {
		get: function (key, fallbackValue) {
			var rawValue;
			if (localStorageAvailable) {
				rawValue = window.localStorage.getItem(key);
			} else {
				rawValue = Object.prototype.hasOwnProperty.call(memoryStorageFallback, key) ? memoryStorageFallback[key] : null;
			}
			if (rawValue === null || rawValue === undefined) {
				return fallbackValue !== undefined ? fallbackValue : null;
			}
			try {
				return JSON.parse(rawValue);
			} catch (error) {
				return rawValue;
			}
		},
		set: function (key, value) {
			var serialisedValue;
			try {
				serialisedValue = JSON.stringify(value);
			} catch (error) {
				serialisedValue = String(value);
			}
			if (localStorageAvailable) {
				try {
					window.localStorage.setItem(key, serialisedValue);
					return true;
				} catch (error) {
					memoryStorageFallback[key] = serialisedValue;
					return false;
				}
			}
			memoryStorageFallback[key] = serialisedValue;
			return false;
		},
		remove: function (key) {
			if (localStorageAvailable) {
				try {
					window.localStorage.removeItem(key);
				} catch (error) {}
			}
			delete memoryStorageFallback[key];
		},
		isAvailable: function () {
			return localStorageAvailable;
		}
	};

	function generateUniqueIdentifier(prefix) {
		var randomSegment = Math.random().toString(36).slice(2, 10);
		var timeSegment = Date.now().toString(36);
		return (prefix ? prefix + "-" : "") + timeSegment + "-" + randomSegment;
	}

	function debounce(callback, waitMilliseconds) {
		var timeoutHandle;
		return function () {
			var context = this;
			var argumentsList = arguments;
			window.clearTimeout(timeoutHandle);
			timeoutHandle = window.setTimeout(function () {
				callback.apply(context, argumentsList);
			}, waitMilliseconds);
		};
	}

	function throttle(callback, limitMilliseconds) {
		var isWaiting = false;
		return function () {
			var context = this;
			var argumentsList = arguments;
			if (!isWaiting) {
				callback.apply(context, argumentsList);
				isWaiting = true;
				window.setTimeout(function () {
					isWaiting = false;
				}, limitMilliseconds);
			}
		};
	}

	function onDocumentReady(callback) {
		if (document.readyState === "complete" || document.readyState === "interactive") {
			window.setTimeout(callback, 0);
		} else {
			document.addEventListener("DOMContentLoaded", callback);
		}
	}

	function dispatchCustomEvent(eventName, eventDetail) {
		var eventInstance;
		var CustomEventConstructor = window.CustomEvent || CustomEvent;
		try {
			eventInstance = new CustomEventConstructor(eventName, { detail: eventDetail, bubbles: true, cancelable: true });
		} catch (error) {
			eventInstance = document.createEvent("CustomEvent");
			eventInstance.initCustomEvent(eventName, true, true, eventDetail);
		}
		document.dispatchEvent(eventInstance);
	}

	function createElement(tagName, attributes, children) {
		var element = document.createElement(tagName);
		if (attributes) {
			Object.keys(attributes).forEach(function (attributeName) {
				var attributeValue = attributes[attributeName];
				if (attributeName === "className") {
					element.className = attributeValue;
				} else if (attributeName === "textContent") {
					element.textContent = attributeValue;
				} else if (attributeName === "innerHtml") {
					element.innerHTML = attributeValue;
				} else if (attributeName.indexOf("on") === 0 && typeof attributeValue === "function") {
					element.addEventListener(attributeName.slice(2).toLowerCase(), attributeValue);
				} else {
					element.setAttribute(attributeName, attributeValue);
				}
			});
		}
		if (children) {
			children.forEach(function (child) {
				if (child) {
					element.appendChild(child);
				}
			});
		}
		return element;
	}

	function fetchJson(url, options) {
		return window.fetch(url, options).then(function (response) {
			if (!response.ok) {
				throw new Error("Request failed with status " + response.status + " for url " + url);
			}
			return response.json();
		});
	}

	function safeFetch(url, options) {
		if (!url) {
			return Promise.resolve(null);
		}
		return window.fetch(url, options).catch(function (error) {
			return null;
		});
	}

	function loadStylesheet(url, elementId) {
		return new Promise(function (resolve, reject) {
			var existingLink = document.getElementById(elementId);
			if (existingLink && existingLink.getAttribute("href") === url) {
				resolve(existingLink);
				return;
			}
			var linkElement = existingLink || document.createElement("link");
			linkElement.rel = "stylesheet";
			linkElement.id = elementId;
			linkElement.addEventListener("load", function () {
				resolve(linkElement);
			});
			linkElement.addEventListener("error", function () {
				reject(new Error("Failed to load stylesheet at " + url));
			});
			linkElement.href = url;
			if (!existingLink) {
				document.head.appendChild(linkElement);
			}
		});
	}

	function getNestedValue(sourceObject, dotSeparatedPath) {
		if (!sourceObject || !dotSeparatedPath) {
			return undefined;
		}
		var pathSegments = dotSeparatedPath.split(".");
		var currentValue = sourceObject;
		for (var index = 0; index < pathSegments.length; index += 1) {
			if (currentValue === undefined || currentValue === null) {
				return undefined;
			}
			currentValue = currentValue[pathSegments[index]];
		}
		return currentValue;
	}

	var Utilities = {
		generateUniqueIdentifier: generateUniqueIdentifier,
		debounce: debounce,
		throttle: throttle,
		onDocumentReady: onDocumentReady,
		dispatchCustomEvent: dispatchCustomEvent,
		createElement: createElement,
		fetchJson: fetchJson,
		safeFetch: safeFetch,
		loadStylesheet: loadStylesheet,
		getNestedValue: getNestedValue
	};

	var themeStylesheetElementId = "mixterial-theme-stylesheet";
	var currentThemeName = null;

	function normaliseThemeName(themeName) {
		if (!themeName) {
			return null;
		}
		return themeName.replace(/\.css$/i, "").toLowerCase();
	}

	function isValidThemeName(themeName) {
		var normalisedName = normaliseThemeName(themeName);
		if (!normalisedName) {
			return false;
		}
		return Configuration.availableThemes.some(function (fileName) {
			return normaliseThemeName(fileName) === normalisedName;
		});
	}

	function getThemeFileUrl(themeName) {
		var normalisedName = normaliseThemeName(themeName);
		return Configuration.themeBaseUrl + normalisedName + ".css";
	}

	function getStoredThemeName() {
		return Storage.get(StorageKeys.selectedTheme, Configuration.defaultTheme);
	}

	function applyThemeAttribute(themeName) {
		document.documentElement.setAttribute("data-theme", normaliseThemeName(themeName));
	}

	function setTheme(themeName, options) {
		var settings = options || {};
		var normalisedName = normaliseThemeName(themeName);
		if (!isValidThemeName(normalisedName)) {
			normalisedName = normaliseThemeName(Configuration.defaultTheme);
		}
		applyThemeAttribute(normalisedName);
		var previousThemeName = currentThemeName;
		currentThemeName = normalisedName;
		return loadStylesheet(getThemeFileUrl(normalisedName), themeStylesheetElementId).then(function () {
			if (settings.persist !== false) {
				Storage.set(StorageKeys.selectedTheme, normalisedName);
			}
			dispatchCustomEvent("mixterial:themechange", {
				theme: normalisedName,
				previousTheme: previousThemeName
			});
			return normalisedName;
		});
	}

	function getCurrentThemeName() {
		return currentThemeName;
	}

	function getAvailableThemeNames() {
		return Configuration.availableThemes.map(normaliseThemeName);
	}

	function initialiseTheme() {
		var storedThemeName = getStoredThemeName();
		return setTheme(storedThemeName, { persist: false });
	}

	var Theme = {
		set: setTheme,
		get: getCurrentThemeName,
		getStored: getStoredThemeName,
		list: getAvailableThemeNames,
		isValid: isValidThemeName,
		getFileUrl: getThemeFileUrl,
		initialise: initialiseTheme
	};

	Mixterial.Theme = Theme;

	var loadedLanguageData = {};
	var currentLanguageName = null;
	var translateAttributeName = "data-mixterial-translate-key";
	var translateAttributeMappingName = "data-mixterial-translate-attributes";
	var translatePlaceholderAttributeName = "data-mixterial-translate-placeholder";

	function normaliseLanguageName(languageName) {
		if (!languageName) {
			return null;
		}
		return languageName.replace(/\.json$/i, "").toLowerCase();
	}

	function isValidLanguageName(languageName) {
		var normalisedName = normaliseLanguageName(languageName);
		if (!normalisedName) {
			return false;
		}
		return Configuration.availableLanguages.some(function (fileName) {
			return normaliseLanguageName(fileName) === normalisedName;
		});
	}

	function getLanguageFileUrl(languageName) {
		var normalisedName = normaliseLanguageName(languageName);
		return Configuration.languageBaseUrl + normalisedName + ".json";
	}

	function getStoredLanguageName() {
		return Storage.get(StorageKeys.selectedLanguage, Configuration.defaultLanguage);
	}

	function fetchLanguageData(languageName) {
		var normalisedName = normaliseLanguageName(languageName);
		if (loadedLanguageData[normalisedName]) {
			return Promise.resolve(loadedLanguageData[normalisedName]);
		}
		return fetchJson(getLanguageFileUrl(normalisedName)).then(function (languageData) {
			loadedLanguageData[normalisedName] = languageData;
			return languageData;
		});
	}

	function applyTranslationsToDocument(languageData) {
		var translatableElements = document.querySelectorAll("[" + translateAttributeName + "]");
		translatableElements.forEach(function (element) {
			var translationKey = element.getAttribute(translateAttributeName);
			var translatedValue = getNestedValue(languageData, translationKey);
			if (translatedValue !== undefined) {
				element.textContent = translatedValue;
			}
		});

		var placeholderElements = document.querySelectorAll("[" + translatePlaceholderAttributeName + "]");
		placeholderElements.forEach(function (element) {
			var translationKey = element.getAttribute(translatePlaceholderAttributeName);
			var translatedValue = getNestedValue(languageData, translationKey);
			if (translatedValue !== undefined) {
				element.setAttribute("placeholder", translatedValue);
			}
		});

		var attributeMappedElements = document.querySelectorAll("[" + translateAttributeMappingName + "]");
		attributeMappedElements.forEach(function (element) {
			var mappingRaw = element.getAttribute(translateAttributeMappingName);
			mappingRaw.split(";").forEach(function (mappingEntry) {
				var mappingParts = mappingEntry.split(":");
				if (mappingParts.length !== 2) {
					return;
				}
				var targetAttribute = mappingParts[0].trim();
				var translationKey = mappingParts[1].trim();
				var translatedValue = getNestedValue(languageData, translationKey);
				if (translatedValue !== undefined && targetAttribute) {
					element.setAttribute(targetAttribute, translatedValue);
				}
			});
		});
	}

	function translateElement(element, languageDataOverride) {
		var languageData = languageDataOverride || loadedLanguageData[currentLanguageName];
		if (!languageData || !element) {
			return;
		}
		var translationKey = element.getAttribute(translateAttributeName);
		if (translationKey) {
			var translatedValue = getNestedValue(languageData, translationKey);
			if (translatedValue !== undefined) {
				element.textContent = translatedValue;
			}
		}
	}

	function setLanguage(languageName, options) {
		var settings = options || {};
		var normalisedName = normaliseLanguageName(languageName);
		if (!isValidLanguageName(normalisedName)) {
			normalisedName = normaliseLanguageName(Configuration.defaultLanguage);
		}
		return fetchLanguageData(normalisedName).then(function (languageData) {
			var previousLanguageName = currentLanguageName;
			currentLanguageName = normalisedName;
			document.documentElement.setAttribute("lang", normalisedName);
			applyTranslationsToDocument(languageData);
			if (settings.persist !== false) {
				Storage.set(StorageKeys.selectedLanguage, normalisedName);
			}
			dispatchCustomEvent("mixterial:languagechange", {
				language: normalisedName,
				previousLanguage: previousLanguageName,
				languageData: languageData
			});
			return normalisedName;
		});
	}

	function getCurrentLanguageName() {
		return currentLanguageName;
	}

	function getAvailableLanguageNames() {
		return Configuration.availableLanguages.map(normaliseLanguageName);
	}

	function getTranslationValue(translationKey) {
		var languageData = loadedLanguageData[currentLanguageName];
		return getNestedValue(languageData, translationKey);
	}

	function initialiseLanguage() {
		var storedLanguageName = getStoredLanguageName();
		return setLanguage(storedLanguageName, { persist: false });
	}

	var Language = {
		set: setLanguage,
		get: getCurrentLanguageName,
		getStored: getStoredLanguageName,
		list: getAvailableLanguageNames,
		isValid: isValidLanguageName,
		getFileUrl: getLanguageFileUrl,
		translate: getTranslationValue,
		translateElement: translateElement,
		applyToDocument: applyTranslationsToDocument,
		initialise: initialiseLanguage
	};

	Mixterial.Language = Language;

	var TranslateProviders = {
		google: {
			label: "Google Cloud Translation",
			apiKey: "",
			endpoint: "https://translation.googleapis.com/language/translate/v2"
		},
		googleFree: {
			label: "Google Translate (unofficial free endpoint)",
			apiKey: "",
			endpoint: ""
		},
		libreTranslate: {
			label: "LibreTranslate",
			apiKey: "",
			endpoint: ""
		},
		deepl: {
			label: "DeepL",
			apiKey: "",
			endpoint: "https://api-free.deepl.com/v2/translate"
		},
		microsoftTranslator: {
			label: "Microsoft Azure Translator",
			apiKey: "",
			endpoint: "https://api.cognitive.microsofttranslator.com/translate",
			region: ""
		},
		yandexTranslate: {
			label: "Yandex Translate",
			apiKey: "",
			endpoint: "https://translate.api.cloud.yandex.net/translate/v2/translate"
		},
		amazonTranslate: {
			label: "Amazon Translate",
			apiKey: "",
			secretKey: "",
			region: "",
			endpoint: ""
		},
		lingva: {
			label: "Lingva Translate",
			apiKey: "",
			endpoint: ""
		},
		myMemory: {
			label: "MyMemory Translation Memory",
			apiKey: "",
			endpoint: "https://api.mymemory.translated.net/get"
		}
	};

	function getActiveTranslateProviderName() {
		return Storage.get(StorageKeys.translateProvider, "myMemory");
	}

	function setActiveTranslateProviderName(providerName) {
		if (!TranslateProviders[providerName]) {
			return false;
		}
		Storage.set(StorageKeys.translateProvider, providerName);
		return true;
	}

	function buildTranslateRequest(providerName, text, targetLanguageCode, sourceLanguageCode) {
		var providerConfiguration = TranslateProviders[providerName];
		if (!providerConfiguration) {
			return null;
		}
		var resolvedSourceLanguageCode = sourceLanguageCode || "auto";

		switch (providerName) {
			case "google":
				return {
					url: providerConfiguration.endpoint + "?key=" + providerConfiguration.apiKey,
					options: {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							q: text,
							target: targetLanguageCode,
							source: resolvedSourceLanguageCode === "auto" ? undefined : resolvedSourceLanguageCode,
							format: "text"
						})
					},
					parseResponse: function (responseBody) {
						return getNestedValue(responseBody, "data.translations.0.translatedText");
					}
				};
			case "deepl":
				return {
					url: providerConfiguration.endpoint,
					options: {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Authorization": "DeepL-Auth-Key " + providerConfiguration.apiKey
						},
						body: JSON.stringify({
							text: [text],
							target_lang: targetLanguageCode
						})
					},
					parseResponse: function (responseBody) {
						return getNestedValue(responseBody, "translations.0.text");
					}
				};
			case "microsoftTranslator":
				return {
					url: providerConfiguration.endpoint + "?api-version=3.0&to=" + targetLanguageCode,
					options: {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Ocp-Apim-Subscription-Key": providerConfiguration.apiKey,
							"Ocp-Apim-Subscription-Region": providerConfiguration.region
						},
						body: JSON.stringify([{ text: text }])
					},
					parseResponse: function (responseBody) {
						return getNestedValue(responseBody, "0.translations.0.text");
					}
				};
			case "yandexTranslate":
				return {
					url: providerConfiguration.endpoint,
					options: {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Authorization": "Api-Key " + providerConfiguration.apiKey
						},
						body: JSON.stringify({
							targetLanguageCode: targetLanguageCode,
							texts: [text]
						})
					},
					parseResponse: function (responseBody) {
						return getNestedValue(responseBody, "translations.0.text");
					}
				};
			case "libreTranslate":
				return {
					url: providerConfiguration.endpoint,
					options: {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							q: text,
							source: resolvedSourceLanguageCode,
							target: targetLanguageCode,
							format: "text",
							api_key: providerConfiguration.apiKey
						})
					},
					parseResponse: function (responseBody) {
						return getNestedValue(responseBody, "translatedText");
					}
				};
			case "lingva":
				return {
					url: providerConfiguration.endpoint
						? providerConfiguration.endpoint + "/" + resolvedSourceLanguageCode + "/" + targetLanguageCode + "/" + encodeURIComponent(text)
						: "",
					options: { method: "GET" },
					parseResponse: function (responseBody) {
						return getNestedValue(responseBody, "translation");
					}
				};
			case "myMemory":
				return {
					url: providerConfiguration.endpoint + "?q=" + encodeURIComponent(text) + "&langpair=" + resolvedSourceLanguageCode + "|" + targetLanguageCode
						+ (providerConfiguration.apiKey ? "&key=" + providerConfiguration.apiKey : ""),
					options: { method: "GET" },
					parseResponse: function (responseBody) {
						return getNestedValue(responseBody, "responseData.translatedText");
					}
				};
			default:
				return null;
		}
	}

	function translateText(text, targetLanguageCode, options) {
		var settings = options || {};
		var providerName = settings.provider || getActiveTranslateProviderName();
		var requestDetails = buildTranslateRequest(providerName, text, targetLanguageCode, settings.sourceLanguageCode);
		if (!requestDetails || !requestDetails.url) {
			return Promise.reject(new Error("Translate provider is not configured: " + providerName));
		}
		return fetchJson(requestDetails.url, requestDetails.options).then(function (responseBody) {
			return requestDetails.parseResponse(responseBody);
		});
	}

	function translatePageWithService(targetLanguageCode, options) {
		var settings = options || {};
		var elementSelector = settings.selector || "[" + translateAttributeName + "], p, span, h1, h2, h3, h4, h5, h6, a, button, label";
		var elementsToTranslate = document.querySelectorAll(elementSelector);
		var translationPromises = [];
		elementsToTranslate.forEach(function (element) {
			if (element.hasAttribute("data-mixterial-no-translate")) {
				return;
			}
			var originalText = element.textContent.trim();
			if (!originalText) {
				return;
			}
			var translationPromise = translateText(originalText, targetLanguageCode, settings).then(function (translatedText) {
				if (translatedText) {
					element.textContent = translatedText;
				}
			});
			translationPromises.push(translationPromise);
		});
		Storage.set(StorageKeys.translateTargetLanguageCode, targetLanguageCode);
		return Promise.all(translationPromises);
	}

	var Translate = {
		providers: TranslateProviders,
		getActiveProvider: getActiveTranslateProviderName,
		setActiveProvider: setActiveTranslateProviderName,
		translateText: translateText,
		translatePage: translatePageWithService
	};

	Mixterial.Translate = Translate;

	var ConsentServices = {
		googleAnalytics: {
			label: "Google Analytics 4",
			measurementId: "",
			apiSecret: "",
			endpoint: "https://www.google-analytics.com/mp/collect"
		},
		googleTagManager: {
			label: "Google Tag Manager",
			containerId: "",
			endpoint: ""
		},
		metaConversionsApi: {
			label: "Meta Conversions API",
			pixelId: "",
			accessToken: "",
			endpoint: ""
		},
		segment: {
			label: "Segment",
			writeKey: "",
			endpoint: "https://api.segment.io/v1/track"
		},
		mixpanel: {
			label: "Mixpanel",
			projectToken: "",
			endpoint: "https://api.mixpanel.com/track"
		},
		amplitude: {
			label: "Amplitude",
			apiKey: "",
			endpoint: "https://api2.amplitude.com/2/httpapi"
		},
		matomo: {
			label: "Matomo",
			siteId: "",
			apiToken: "",
			endpoint: ""
		},
		postHog: {
			label: "PostHog",
			apiKey: "",
			endpoint: "https://app.posthog.com/capture/"
		},
		plausible: {
			label: "Plausible Analytics",
			domain: "",
			endpoint: "https://plausible.io/api/event"
		},
		hotjar: {
			label: "Hotjar",
			siteId: "",
			endpoint: ""
		},
		logRocket: {
			label: "LogRocket",
			appId: "",
			endpoint: ""
		},
		sentry: {
			label: "Sentry",
			dsn: "",
			endpoint: ""
		},
		firebaseAnalytics: {
			label: "Firebase Analytics",
			apiKey: "",
			appId: "",
			measurementId: "",
			endpoint: ""
		},
		microsoftClarity: {
			label: "Microsoft Clarity",
			projectId: "",
			endpoint: ""
		},
		cloudflareWebAnalytics: {
			label: "Cloudflare Web Analytics",
			token: "",
			endpoint: ""
		},
		customWebhook: {
			label: "Custom Webhook",
			url: "",
			apiKey: ""
		}
	};

	function collectNetworkInformation() {
		var networkInformation = {};
		var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
		if (connection) {
			networkInformation.effectiveType = connection.effectiveType || null;
			networkInformation.downlinkMegabitsPerSecond = connection.downlink || null;
			networkInformation.downlinkMaximumMegabitsPerSecond = connection.downlinkMax || null;
			networkInformation.roundTripTimeMilliseconds = connection.rtt || null;
			networkInformation.saveDataEnabled = connection.saveData || false;
			networkInformation.connectionType = connection.type || null;
		}
		networkInformation.isOnline = navigator.onLine;
		networkInformation.currentUrl = window.location.href;
		networkInformation.currentHostname = window.location.hostname;
		networkInformation.currentProtocol = window.location.protocol;
		networkInformation.referrerUrl = document.referrer || null;
		networkInformation.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		networkInformation.timezoneOffsetMinutes = new Date().getTimezoneOffset();
		return networkInformation;
	}

	function collectBrowserInformation() {
		var browserInformation = {};
		browserInformation.userAgent = navigator.userAgent;
		browserInformation.appName = navigator.appName;
		browserInformation.appVersion = navigator.appVersion;
		browserInformation.vendor = navigator.vendor;
		browserInformation.product = navigator.product;
		browserInformation.language = navigator.language;
		browserInformation.languages = navigator.languages ? Array.prototype.slice.call(navigator.languages) : [];
		browserInformation.cookiesEnabled = navigator.cookieEnabled;
		browserInformation.doNotTrack = navigator.doNotTrack || window.doNotTrack || null;
		browserInformation.pdfViewerEnabled = navigator.pdfViewerEnabled || null;
		browserInformation.javaEnabled = typeof navigator.javaEnabled === "function" ? navigator.javaEnabled() : null;
		browserInformation.webdriver = navigator.webdriver || false;
		browserInformation.pluginsCount = navigator.plugins ? navigator.plugins.length : 0;
		browserInformation.mimeTypesCount = navigator.mimeTypes ? navigator.mimeTypes.length : 0;
		browserInformation.viewportWidth = window.innerWidth;
		browserInformation.viewportHeight = window.innerHeight;
		browserInformation.documentTitle = document.title;
		browserInformation.characterSet = document.characterSet;
		browserInformation.storageAvailable = Storage.isAvailable();

		var highEntropyPromise = Promise.resolve(null);
		if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === "function") {
			highEntropyPromise = navigator.userAgentData.getHighEntropyValues([
				"platform", "platformVersion", "architecture", "model", "uaFullVersion", "fullVersionList", "bitness"
			]).catch(function () {
				return null;
			});
		}

		return highEntropyPromise.then(function (highEntropyValues) {
			if (navigator.userAgentData) {
				browserInformation.userAgentDataBrands = navigator.userAgentData.brands || null;
				browserInformation.userAgentDataMobile = navigator.userAgentData.mobile || false;
				browserInformation.userAgentDataPlatform = navigator.userAgentData.platform || null;
			}
			if (highEntropyValues) {
				browserInformation.highEntropyValues = highEntropyValues;
			}
			return browserInformation;
		});
	}

	function collectDeviceInformation() {
		var deviceInformation = {};
		deviceInformation.platform = navigator.platform || null;
		deviceInformation.hardwareConcurrency = navigator.hardwareConcurrency || null;
		deviceInformation.deviceMemoryGigabytes = navigator.deviceMemory || null;
		deviceInformation.maximumTouchPoints = navigator.maxTouchPoints || 0;
		deviceInformation.screenWidth = window.screen.width;
		deviceInformation.screenHeight = window.screen.height;
		deviceInformation.screenAvailableWidth = window.screen.availWidth;
		deviceInformation.screenAvailableHeight = window.screen.availHeight;
		deviceInformation.screenColourDepth = window.screen.colorDepth;
		deviceInformation.screenPixelDepth = window.screen.pixelDepth;
		deviceInformation.devicePixelRatio = window.devicePixelRatio || 1;
		deviceInformation.screenOrientation = window.screen.orientation ? window.screen.orientation.type : null;
		deviceInformation.isTouchCapable = "ontouchstart" in window || navigator.maxTouchPoints > 0;
		deviceInformation.preferredColourScheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
		deviceInformation.preferredReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		deviceInformation.preferredContrast = window.matchMedia && window.matchMedia("(prefers-contrast: more)").matches ? "more" : "no-preference";

		var batteryPromise = Promise.resolve(null);
		if (typeof navigator.getBattery === "function") {
			batteryPromise = navigator.getBattery().then(function (batteryManager) {
				return {
					charging: batteryManager.charging,
					chargingTime: batteryManager.chargingTime,
					dischargingTime: batteryManager.dischargingTime,
					level: batteryManager.level
				};
			}).catch(function () {
				return null;
			});
		}

		return batteryPromise.then(function (batteryInformation) {
			if (batteryInformation) {
				deviceInformation.battery = batteryInformation;
			}
			return deviceInformation;
		});
	}

	function collectFullDataBundle() {
		return Promise.all([
			Promise.resolve(collectNetworkInformation()),
			collectBrowserInformation(),
			collectDeviceInformation()
		]).then(function (results) {
			return {
				network: results[0],
				browser: results[1],
				device: results[2],
				collectedAtIsoTimestamp: new Date().toISOString()
			};
		});
	}

	function sendBundleToConfiguredServices(dataBundle) {
		var dispatchPromises = [];

		if (ConsentServices.googleAnalytics.measurementId && ConsentServices.googleAnalytics.apiSecret) {
			var googleAnalyticsUrl = ConsentServices.googleAnalytics.endpoint
				+ "?measurement_id=" + ConsentServices.googleAnalytics.measurementId
				+ "&api_secret=" + ConsentServices.googleAnalytics.apiSecret;
			dispatchPromises.push(safeFetch(googleAnalyticsUrl, {
				method: "POST",
				body: JSON.stringify({
					client_id: generateUniqueIdentifier("client"),
					events: [{ name: "mixterial_consent_data", params: dataBundle }]
				})
			}));
		}

		if (ConsentServices.segment.writeKey) {
			dispatchPromises.push(safeFetch(ConsentServices.segment.endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": "Basic " + ConsentServices.segment.writeKey
				},
				body: JSON.stringify({ event: "Mixterial Consent Data", properties: dataBundle })
			}));
		}

		if (ConsentServices.mixpanel.projectToken) {
			dispatchPromises.push(safeFetch(ConsentServices.mixpanel.endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					event: "mixterial_consent_data",
					properties: Object.assign({ token: ConsentServices.mixpanel.projectToken }, dataBundle)
				})
			}));
		}

		if (ConsentServices.amplitude.apiKey) {
			dispatchPromises.push(safeFetch(ConsentServices.amplitude.endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					api_key: ConsentServices.amplitude.apiKey,
					events: [{ event_type: "mixterial_consent_data", event_properties: dataBundle }]
				})
			}));
		}

		if (ConsentServices.postHog.apiKey) {
			dispatchPromises.push(safeFetch(ConsentServices.postHog.endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					api_key: ConsentServices.postHog.apiKey,
					event: "mixterial_consent_data",
					properties: dataBundle
				})
			}));
		}

		if (ConsentServices.plausible.domain) {
			dispatchPromises.push(safeFetch(ConsentServices.plausible.endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					domain: ConsentServices.plausible.domain,
					name: "mixterial_consent_data",
					props: dataBundle
				})
			}));
		}

		if (ConsentServices.matomo.siteId && ConsentServices.matomo.endpoint) {
			dispatchPromises.push(safeFetch(ConsentServices.matomo.endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					idsite: ConsentServices.matomo.siteId,
					token_auth: ConsentServices.matomo.apiToken,
					data: dataBundle
				})
			}));
		}

		if (ConsentServices.metaConversionsApi.pixelId && ConsentServices.metaConversionsApi.accessToken) {
			dispatchPromises.push(safeFetch(ConsentServices.metaConversionsApi.endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					data: [{ event_name: "MixterialConsentData", custom_data: dataBundle }],
					access_token: ConsentServices.metaConversionsApi.accessToken
				})
			}));
		}

		if (ConsentServices.firebaseAnalytics.measurementId && ConsentServices.firebaseAnalytics.apiKey) {
			dispatchPromises.push(safeFetch(ConsentServices.firebaseAnalytics.endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					client_id: generateUniqueIdentifier("client"),
					events: [{ name: "mixterial_consent_data", params: dataBundle }]
				})
			}));
		}

		if (ConsentServices.customWebhook.url) {
			dispatchPromises.push(safeFetch(ConsentServices.customWebhook.url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": ConsentServices.customWebhook.apiKey ? "Bearer " + ConsentServices.customWebhook.apiKey : ""
				},
				body: JSON.stringify(dataBundle)
			}));
		}

		return Promise.all(dispatchPromises);
	}

	function hasConsentChoiceBeenMade() {
		return Storage.get(StorageKeys.consentChoiceMade, false) === true;
	}

	function getConsentStatus() {
		return Storage.get(StorageKeys.consentStatus, null);
	}

	function recordConsentDecline() {
		Storage.set(StorageKeys.consentChoiceMade, true);
		Storage.set(StorageKeys.consentStatus, "declined");
		Storage.set(StorageKeys.consentTimestamp, new Date().toISOString());
		dispatchCustomEvent("mixterial:consentchange", { status: "declined" });
	}

	function recordConsentAccept() {
		Storage.set(StorageKeys.consentChoiceMade, true);
		Storage.set(StorageKeys.consentStatus, "accepted");
		Storage.set(StorageKeys.consentTimestamp, new Date().toISOString());
		return collectFullDataBundle().then(function (dataBundle) {
			dispatchCustomEvent("mixterial:consentchange", { status: "accepted", dataBundle: dataBundle });
			return sendBundleToConfiguredServices(dataBundle);
		});
	}

	var consentPopupBackgroundColour = "#241b30";
	var consentPopupLinkColour = "#a78bfa";
	var consentPopupElements = null;

	function buildConsentPopupMarkup() {
		var backdropElement = createElement("div", {
			className: "modal-dialog-backdrop",
			id: "mixterial-consent-backdrop"
		});

		var containerElement = createElement("div", {
			className: "modal-dialog-container",
			id: "mixterial-consent-container"
		});

		var dialogElement = createElement("div", {
			className: "modal-dialog modal-dialog-size-small",
			id: "mixterial-consent-dialog",
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": "mixterial-consent-title"
		});
		dialogElement.style.backgroundColor = consentPopupBackgroundColour;

		var headerRowElement = createElement("div", { className: "modal-dialog-header" });

		var titleElement = createElement("span", {
			className: "modal-dialog-title",
			id: "mixterial-consent-title",
			textContent: "Cookies & Data"
		});
		titleElement.style.fontWeight = "700";

		var cancelIconCanvas = createElement("div", {
			className: "icon-canvas icon-canvas-small modal-dialog-close-button",
			id: "mixterial-consent-cancel-button",
			role: "button",
			tabindex: "0",
			"aria-label": "Close without saving preferences"
		});
		var cancelIconImage = createElement("img", {
			src: Configuration.iconBaseUrl + "cancel.png",
			alt: "Close"
		});
		cancelIconCanvas.appendChild(cancelIconImage);

		headerRowElement.appendChild(titleElement);
		headerRowElement.appendChild(cancelIconCanvas);

		var bodyTextElement = createElement("p", {
			className: "paragraph-medium margin-bottom-medium",
			textContent: "We collect information from your browser, device and network to help load everything faster for your next visit. This information is stored locally on your device as a cookie. We also use this information to improve all of our products, projects and services. Please check out out privacy policy for more information and guidance."
		});

		var privacyPolicyLink = createElement("a", {
			className: "link-standard display-inline-block",
			href: Configuration.privacyPolicyUrl,
			target: "_blank",
			rel: "noopener noreferrer",
			textContent: "Privacy policy"
		});
		privacyPolicyLink.style.color = consentPopupLinkColour;

		var buttonsContainerElement = createElement("div", {
			className: "display-flex flex-direction-column gap-small margin-top-large"
		});

		var acceptButton = createElement("button", {
			className: "button button-variant-filled button-full-width",
			type: "button",
			textContent: "Accept"
		});

		var declineButton = createElement("button", {
			className: "button button-variant-outlined button-full-width",
			type: "button",
			textContent: "Decline"
		});

		buttonsContainerElement.appendChild(acceptButton);
		buttonsContainerElement.appendChild(declineButton);

		dialogElement.appendChild(headerRowElement);
		dialogElement.appendChild(bodyTextElement);
		dialogElement.appendChild(privacyPolicyLink);
		dialogElement.appendChild(buttonsContainerElement);

		containerElement.appendChild(dialogElement);

		return {
			backdrop: backdropElement,
			container: containerElement,
			dialog: dialogElement,
			cancelButton: cancelIconCanvas,
			acceptButton: acceptButton,
			declineButton: declineButton
		};
	}

	function closeConsentPopup(elements) {
		document.body.style.overflow = "";
		elements.backdrop.classList.remove("modal-dialog-backdrop-open");
		elements.dialog.classList.remove("modal-dialog-open");
		window.setTimeout(function () {
			if (elements.backdrop.parentNode) {
				elements.backdrop.parentNode.removeChild(elements.backdrop);
			}
			if (elements.container.parentNode) {
				elements.container.parentNode.removeChild(elements.container);
			}
		}, 260);
	}

	function showConsentPopup() {
		if (consentPopupElements) {
			return;
		}
		var elements = buildConsentPopupMarkup();
		consentPopupElements = elements;
		document.body.appendChild(elements.backdrop);
		document.body.appendChild(elements.container);
		document.body.style.overflow = "hidden";

		window.requestAnimationFrame(function () {
			elements.backdrop.classList.add("modal-dialog-backdrop-open");
			elements.dialog.classList.add("modal-dialog-open");
		});

		elements.cancelButton.addEventListener("click", function () {
			closeConsentPopup(elements);
			consentPopupElements = null;
		});
		elements.cancelButton.addEventListener("keydown", function (keyboardEvent) {
			if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
				keyboardEvent.preventDefault();
				closeConsentPopup(elements);
				consentPopupElements = null;
			}
		});

		elements.acceptButton.addEventListener("click", function () {
			recordConsentAccept();
			closeConsentPopup(elements);
			consentPopupElements = null;
		});

		elements.declineButton.addEventListener("click", function () {
			recordConsentDecline();
			closeConsentPopup(elements);
			consentPopupElements = null;
		});
	}

	function initialiseConsent(options) {
		var settings = options || {};
		if (settings.forcePopup || !hasConsentChoiceBeenMade()) {
			showConsentPopup();
		}
	}

	var Consent = {
		services: ConsentServices,
		hasChoiceBeenMade: hasConsentChoiceBeenMade,
		getStatus: getConsentStatus,
		showPopup: showConsentPopup,
		accept: recordConsentAccept,
		decline: recordConsentDecline,
		collectNetworkInformation: collectNetworkInformation,
		collectBrowserInformation: collectBrowserInformation,
		collectDeviceInformation: collectDeviceInformation,
		collectFullDataBundle: collectFullDataBundle,
		initialise: initialiseConsent
	};

	Mixterial.Consent = Consent;

	var openSheetMenuStack = [];

	function openSheetMenu(sheetMenuId) {
		var sheetMenuElement = document.getElementById(sheetMenuId);
		if (!sheetMenuElement) {
			return;
		}
		var overlayElement = sheetMenuElement.previousElementSibling;
		if (!overlayElement || overlayElement.classList.contains("sheet-menu-overlay") === false) {
			overlayElement = document.querySelector('[data-mixterial-sheet-overlay-for="' + sheetMenuId + '"]');
		}
		if (overlayElement) {
			overlayElement.classList.add("sheet-menu-overlay-open");
		}
		sheetMenuElement.classList.remove("sheet-menu-container-closing");
		sheetMenuElement.classList.add("sheet-menu-container-open");
		document.body.style.overflow = "hidden";
		openSheetMenuStack.push(sheetMenuId);
		dispatchCustomEvent("mixterial:sheetmenuopen", { sheetMenuId: sheetMenuId });
	}

	function closeSheetMenu(sheetMenuId) {
		var sheetMenuElement = document.getElementById(sheetMenuId);
		if (!sheetMenuElement) {
			return;
		}
		var overlayElement = sheetMenuElement.previousElementSibling;
		if (!overlayElement || overlayElement.classList.contains("sheet-menu-overlay") === false) {
			overlayElement = document.querySelector('[data-mixterial-sheet-overlay-for="' + sheetMenuId + '"]');
		}
		if (overlayElement) {
			overlayElement.classList.remove("sheet-menu-overlay-open");
		}
		sheetMenuElement.classList.add("sheet-menu-container-closing");
		sheetMenuElement.classList.remove("sheet-menu-container-open");
		window.setTimeout(function () {
			sheetMenuElement.classList.remove("sheet-menu-container-closing");
		}, 260);
		openSheetMenuStack = openSheetMenuStack.filter(function (openId) {
			return openId !== sheetMenuId;
		});
		if (openSheetMenuStack.length === 0) {
			document.body.style.overflow = "";
		}
		dispatchCustomEvent("mixterial:sheetmenuclose", { sheetMenuId: sheetMenuId });
	}

	function initialiseSheetMenus() {
		document.querySelectorAll("[data-mixterial-sheet-target]").forEach(function (triggerElement) {
			triggerElement.addEventListener("click", function () {
				openSheetMenu(triggerElement.getAttribute("data-mixterial-sheet-target"));
			});
		});

		document.querySelectorAll(".sheet-menu-drag-handle-container").forEach(function (dragHandleElement) {
			var sheetMenuElement = dragHandleElement.closest(".sheet-menu-container");
			if (!sheetMenuElement) {
				return;
			}
			dragHandleElement.addEventListener("click", function () {
				closeSheetMenu(sheetMenuElement.id);
			});

			var isDragging = false;
			var dragStartY = 0;
			var currentTranslateY = 0;

			dragHandleElement.addEventListener("pointerdown", function (pointerEvent) {
				isDragging = true;
				dragStartY = pointerEvent.clientY;
				sheetMenuElement.style.transition = "none";
			});

			window.addEventListener("pointermove", function (pointerEvent) {
				if (!isDragging) {
					return;
				}
				var deltaY = pointerEvent.clientY - dragStartY;
				currentTranslateY = Math.max(0, deltaY);
				sheetMenuElement.style.transform = "translateY(" + currentTranslateY + "px)";
			});

			window.addEventListener("pointerup", function () {
				if (!isDragging) {
					return;
				}
				isDragging = false;
				sheetMenuElement.style.transition = "";
				sheetMenuElement.style.transform = "";
				if (currentTranslateY > 120) {
					closeSheetMenu(sheetMenuElement.id);
				}
				currentTranslateY = 0;
			});
		});

		document.querySelectorAll(".sheet-menu-overlay").forEach(function (overlayElement) {
			overlayElement.addEventListener("click", function () {
				var sheetMenuElement = overlayElement.nextElementSibling;
				if (sheetMenuElement && sheetMenuElement.classList.contains("sheet-menu-container")) {
					closeSheetMenu(sheetMenuElement.id);
				}
			});
		});
	}

	var openModalStack = [];

	function openModal(modalId) {
		var modalElement = document.getElementById(modalId);
		if (!modalElement) {
			return;
		}
		var backdropElement = modalElement.closest(".modal-dialog-container").previousElementSibling;
		if (backdropElement) {
			backdropElement.classList.add("modal-dialog-backdrop-open");
		}
		modalElement.classList.add("modal-dialog-open");
		document.body.style.overflow = "hidden";
		openModalStack.push(modalId);
		dispatchCustomEvent("mixterial:modalopen", { modalId: modalId });
	}

	function closeModal(modalId) {
		var modalElement = document.getElementById(modalId);
		if (!modalElement) {
			return;
		}
		var backdropElement = modalElement.closest(".modal-dialog-container").previousElementSibling;
		if (backdropElement) {
			backdropElement.classList.remove("modal-dialog-backdrop-open");
		}
		modalElement.classList.remove("modal-dialog-open");
		openModalStack = openModalStack.filter(function (openId) {
			return openId !== modalId;
		});
		if (openModalStack.length === 0) {
			document.body.style.overflow = "";
		}
		dispatchCustomEvent("mixterial:modalclose", { modalId: modalId });
	}

	function initialiseModals() {
		document.querySelectorAll("[data-mixterial-modal-target]").forEach(function (triggerElement) {
			triggerElement.addEventListener("click", function () {
				openModal(triggerElement.getAttribute("data-mixterial-modal-target"));
			});
		});

		document.querySelectorAll("[data-mixterial-modal-close]").forEach(function (closeElement) {
			closeElement.addEventListener("click", function () {
				var modalElement = closeElement.closest(".modal-dialog");
				if (modalElement) {
					closeModal(modalElement.id);
				}
			});
		});

		document.querySelectorAll(".modal-dialog-backdrop").forEach(function (backdropElement) {
			backdropElement.addEventListener("click", function () {
				var containerElement = backdropElement.nextElementSibling;
				var modalElement = containerElement ? containerElement.querySelector(".modal-dialog") : null;
				if (modalElement) {
					closeModal(modalElement.id);
				}
			});
		});
	}

	function initialiseDropdownMenus() {
		document.querySelectorAll("[data-mixterial-dropdown-target]").forEach(function (triggerElement) {
			triggerElement.addEventListener("click", function (clickEvent) {
				clickEvent.stopPropagation();
				var targetId = triggerElement.getAttribute("data-mixterial-dropdown-target");
				var targetElement = document.getElementById(targetId);
				if (!targetElement) {
					return;
				}
				var isCurrentlyOpen = targetElement.classList.contains("dropdown-menu-open") || targetElement.classList.contains("popover-panel-open");
				document.querySelectorAll(".dropdown-menu-open, .popover-panel-open").forEach(function (openElement) {
					openElement.classList.remove("dropdown-menu-open");
					openElement.classList.remove("popover-panel-open");
				});
				if (!isCurrentlyOpen) {
					targetElement.classList.add(targetElement.classList.contains("popover-panel") ? "popover-panel-open" : "dropdown-menu-open");
				}
			});
		});

		document.addEventListener("click", function () {
			document.querySelectorAll(".dropdown-menu-open, .popover-panel-open").forEach(function (openElement) {
				openElement.classList.remove("dropdown-menu-open");
				openElement.classList.remove("popover-panel-open");
			});
		});
	}

	function initialiseAccordions() {
		document.querySelectorAll(".accordion-trigger").forEach(function (triggerElement) {
			triggerElement.addEventListener("click", function () {
				var accordionItemElement = triggerElement.closest(".accordion-item");
				if (!accordionItemElement) {
					return;
				}
				var isExpanded = accordionItemElement.getAttribute("data-expanded") === "true";
				if (accordionItemElement.hasAttribute("data-mixterial-accordion-exclusive")) {
					var parentGroup = accordionItemElement.parentElement;
					parentGroup.querySelectorAll(".accordion-item").forEach(function (siblingItem) {
						siblingItem.setAttribute("data-expanded", "false");
					});
				}
				accordionItemElement.setAttribute("data-expanded", isExpanded ? "false" : "true");
			});
		});
	}

	function initialiseTabs() {
		document.querySelectorAll(".tabs-list").forEach(function (tabsListElement) {
			var tabItems = tabsListElement.querySelectorAll(".tabs-list-item");
			tabItems.forEach(function (tabItemElement) {
				tabItemElement.addEventListener("click", function () {
					tabItems.forEach(function (item) {
						item.classList.remove("tabs-list-item-active");
					});
					tabItemElement.classList.add("tabs-list-item-active");

					var targetPanelId = tabItemElement.getAttribute("data-mixterial-tab-target");
					if (!targetPanelId) {
						return;
					}
					var targetPanelElement = document.getElementById(targetPanelId);
					if (!targetPanelElement) {
						return;
					}
					var siblingPanels = targetPanelElement.parentElement.querySelectorAll(".tabs-panel");
					siblingPanels.forEach(function (panelElement) {
						panelElement.setAttribute("hidden", "");
					});
					targetPanelElement.removeAttribute("hidden");
				});
			});
		});
	}

	function showToastNotification(messageText, options) {
		var settings = options || {};
		var containerElement = document.querySelector(".toast-notification-container");
		if (!containerElement) {
			containerElement = createElement("div", { className: "toast-notification-container" });
			document.body.appendChild(containerElement);
		}
		var toastElement = createElement("div", {
			className: "toast-notification",
			id: generateUniqueIdentifier("toast")
		});
		var messageElement = createElement("span", { textContent: messageText });
		toastElement.appendChild(messageElement);
		containerElement.appendChild(toastElement);

		var durationMilliseconds = settings.duration || 4000;
		window.setTimeout(function () {
			toastElement.classList.add("toast-notification-exiting");
			window.setTimeout(function () {
				if (toastElement.parentNode) {
					toastElement.parentNode.removeChild(toastElement);
				}
			}, 260);
		}, durationMilliseconds);

		return toastElement.id;
	}

	function initialiseRangeSliderFillVisuals() {
		function updateRangeSliderFill(rangeInputElement) {
			var minimumValue = parseFloat(rangeInputElement.min || "0");
			var maximumValue = parseFloat(rangeInputElement.max || "100");
			var currentValue = parseFloat(rangeInputElement.value || "0");
			var fillPercentage = ((currentValue - minimumValue) / (maximumValue - minimumValue)) * 100;
			rangeInputElement.style.backgroundImage = "linear-gradient(to right, currentColor " + fillPercentage + "%, transparent " + fillPercentage + "%)";
		}

		document.querySelectorAll(".range-slider-field").forEach(function (rangeInputElement) {
			updateRangeSliderFill(rangeInputElement);
			rangeInputElement.addEventListener("input", function () {
				updateRangeSliderFill(rangeInputElement);
			});
		});
	}

	function initialiseNumberSteppers() {
		document.querySelectorAll(".number-stepper-field").forEach(function (stepperElement) {
			var inputElement = stepperElement.querySelector(".number-stepper-input");
			var decrementButton = stepperElement.querySelector('[data-mixterial-stepper-action="decrement"]');
			var incrementButton = stepperElement.querySelector('[data-mixterial-stepper-action="increment"]');
			if (!inputElement) {
				return;
			}
			function adjustValue(deltaAmount) {
				var stepAmount = parseFloat(inputElement.step || "1");
				var minimumValue = inputElement.min !== "" ? parseFloat(inputElement.min) : -Infinity;
				var maximumValue = inputElement.max !== "" ? parseFloat(inputElement.max) : Infinity;
				var currentValue = parseFloat(inputElement.value || "0");
				var nextValue = currentValue + (deltaAmount * stepAmount);
				nextValue = Math.min(maximumValue, Math.max(minimumValue, nextValue));
				inputElement.value = nextValue;
				dispatchCustomEvent("mixterial:numberstepperchange", { element: inputElement, value: nextValue });
			}
			if (decrementButton) {
				decrementButton.addEventListener("click", function () {
					adjustValue(-1);
				});
			}
			if (incrementButton) {
				incrementButton.addEventListener("click", function () {
					adjustValue(1);
				});
			}
		});
	}

	function initialiseFileUploadDropzones() {
		document.querySelectorAll(".file-upload-dropzone").forEach(function (dropzoneElement) {
			var inputElement = dropzoneElement.querySelector(".file-upload-dropzone-input");

			function handleFiles(fileList) {
				var listContainer = document.getElementById(dropzoneElement.getAttribute("data-mixterial-file-list-target"));
				if (!listContainer) {
					return;
				}
				listContainer.innerHTML = "";
				Array.prototype.slice.call(fileList).forEach(function (fileItem) {
					var listItemElement = createElement("div", {
						className: "file-upload-list-item",
						textContent: fileItem.name + " (" + Math.round(fileItem.size / 1024) + " KB)"
					});
					listContainer.appendChild(listItemElement);
				});
			}

			dropzoneElement.addEventListener("dragover", function (dragEvent) {
				dragEvent.preventDefault();
				dropzoneElement.classList.add("file-upload-dropzone-active");
			});
			dropzoneElement.addEventListener("dragleave", function () {
				dropzoneElement.classList.remove("file-upload-dropzone-active");
			});
			dropzoneElement.addEventListener("drop", function (dropEvent) {
				dropEvent.preventDefault();
				dropzoneElement.classList.remove("file-upload-dropzone-active");
				if (dropEvent.dataTransfer && dropEvent.dataTransfer.files) {
					handleFiles(dropEvent.dataTransfer.files);
					if (inputElement) {
						inputElement.files = dropEvent.dataTransfer.files;
					}
				}
			});
			if (inputElement) {
				inputElement.addEventListener("change", function () {
					handleFiles(inputElement.files);
				});
			}
		});
	}

	var Components = {
		openSheetMenu: openSheetMenu,
		closeSheetMenu: closeSheetMenu,
		openModal: openModal,
		closeModal: closeModal,
		showToast: showToastNotification,
		initialiseSheetMenus: initialiseSheetMenus,
		initialiseModals: initialiseModals,
		initialiseDropdownMenus: initialiseDropdownMenus,
		initialiseAccordions: initialiseAccordions,
		initialiseTabs: initialiseTabs,
		initialiseRangeSliderFillVisuals: initialiseRangeSliderFillVisuals,
		initialiseNumberSteppers: initialiseNumberSteppers,
		initialiseFileUploadDropzones: initialiseFileUploadDropzones
	};

	Mixterial.Components = Components;

	function hueSaturationLightnessToRgb(hueDegrees, saturationPercent, lightnessPercent) {
		var saturationFraction = saturationPercent / 100;
		var lightnessFraction = lightnessPercent / 100;
		var chroma = (1 - Math.abs(2 * lightnessFraction - 1)) * saturationFraction;
		var huePrime = hueDegrees / 60;
		var secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));
		var redComponent = 0;
		var greenComponent = 0;
		var blueComponent = 0;

		if (huePrime >= 0 && huePrime < 1) {
			redComponent = chroma; greenComponent = secondComponent; blueComponent = 0;
		} else if (huePrime >= 1 && huePrime < 2) {
			redComponent = secondComponent; greenComponent = chroma; blueComponent = 0;
		} else if (huePrime >= 2 && huePrime < 3) {
			redComponent = 0; greenComponent = chroma; blueComponent = secondComponent;
		} else if (huePrime >= 3 && huePrime < 4) {
			redComponent = 0; greenComponent = secondComponent; blueComponent = chroma;
		} else if (huePrime >= 4 && huePrime < 5) {
			redComponent = secondComponent; greenComponent = 0; blueComponent = chroma;
		} else if (huePrime >= 5 && huePrime < 6) {
			redComponent = chroma; greenComponent = 0; blueComponent = secondComponent;
		}

		var lightnessAdjustment = lightnessFraction - chroma / 2;
		return {
			red: Math.round((redComponent + lightnessAdjustment) * 255),
			green: Math.round((greenComponent + lightnessAdjustment) * 255),
			blue: Math.round((blueComponent + lightnessAdjustment) * 255)
		};
	}

	function rgbToHueSaturationLightness(redValue, greenValue, blueValue) {
		var redFraction = redValue / 255;
		var greenFraction = greenValue / 255;
		var blueFraction = blueValue / 255;
		var maximumValue = Math.max(redFraction, greenFraction, blueFraction);
		var minimumValue = Math.min(redFraction, greenFraction, blueFraction);
		var lightnessFraction = (maximumValue + minimumValue) / 2;
		var hueDegrees = 0;
		var saturationFraction = 0;
		var valueDelta = maximumValue - minimumValue;

		if (valueDelta !== 0) {
			saturationFraction = valueDelta / (1 - Math.abs(2 * lightnessFraction - 1));
			if (maximumValue === redFraction) {
				hueDegrees = 60 * (((greenFraction - blueFraction) / valueDelta) % 6);
			} else if (maximumValue === greenFraction) {
				hueDegrees = 60 * (((blueFraction - redFraction) / valueDelta) + 2);
			} else {
				hueDegrees = 60 * (((redFraction - greenFraction) / valueDelta) + 4);
			}
		}
		if (hueDegrees < 0) {
			hueDegrees += 360;
		}

		return {
			hue: hueDegrees,
			saturation: saturationFraction * 100,
			lightness: lightnessFraction * 100
		};
	}

	function rgbToHex(redValue, greenValue, blueValue) {
		function componentToHex(componentValue) {
			var hexString = Math.max(0, Math.min(255, Math.round(componentValue))).toString(16);
			return hexString.length === 1 ? "0" + hexString : hexString;
		}
		return "#" + componentToHex(redValue) + componentToHex(greenValue) + componentToHex(blueValue);
	}

	function hexToRgb(hexString) {
		var normalisedHex = hexString.replace("#", "");
		if (normalisedHex.length === 3) {
			normalisedHex = normalisedHex.split("").map(function (characterValue) {
				return characterValue + characterValue;
			}).join("");
		}
		var parsedValue = parseInt(normalisedHex, 16);
		return {
			red: (parsedValue >> 16) & 255,
			green: (parsedValue >> 8) & 255,
			blue: parsedValue & 255
		};
	}

	function createColorPickerController(rootElement) {
		var state = { hue: 265, saturation: 70, lightness: 62, alpha: 1 };

		var saturationLightnessCanvas = rootElement.querySelector(".color-picker-saturation-lightness-canvas");
		var saturationLightnessCursor = rootElement.querySelector(".color-picker-saturation-lightness-canvas-cursor");
		var hueSliderContainer = rootElement.querySelector(".color-picker-hue-slider-container");
		var hueSliderThumb = hueSliderContainer ? hueSliderContainer.querySelector(".color-picker-slider-thumb") : null;
		var alphaSliderContainer = rootElement.querySelector(".color-picker-alpha-slider-container");
		var alphaSliderThumb = alphaSliderContainer ? alphaSliderContainer.querySelector(".color-picker-slider-thumb") : null;
		var previewSwatch = rootElement.querySelector(".color-picker-preview-swatch");
		var hexInputField = rootElement.querySelector('[data-mixterial-color-field="hex"]');
		var redInputField = rootElement.querySelector('[data-mixterial-color-field="red"]');
		var greenInputField = rootElement.querySelector('[data-mixterial-color-field="green"]');
		var blueInputField = rootElement.querySelector('[data-mixterial-color-field="blue"]');
		var alphaInputField = rootElement.querySelector('[data-mixterial-color-field="alpha"]');

		function getCurrentRgb() {
			return hueSaturationLightnessToRgb(state.hue, state.saturation, state.lightness);
		}

		function render() {
			var currentRgb = getCurrentRgb();
			var currentHex = rgbToHex(currentRgb.red, currentRgb.green, currentRgb.blue);

			if (saturationLightnessCanvas) {
				var hueRgb = hueSaturationLightnessToRgb(state.hue, 100, 50);
				saturationLightnessCanvas.style.backgroundColor = "rgb(" + hueRgb.red + ", " + hueRgb.green + ", " + hueRgb.blue + ")";
				saturationLightnessCanvas.style.backgroundImage =
					"linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0) 50%, rgba(255,255,255,0) 50%, rgba(255,255,255,1)), linear-gradient(to right, rgba(255,255,255,1), rgba(255,255,255,0))";
			}
			if (saturationLightnessCursor) {
				saturationLightnessCursor.style.left = state.saturation + "%";
				saturationLightnessCursor.style.top = (100 - state.lightness) + "%";
				saturationLightnessCursor.style.backgroundColor = currentHex;
			}
			if (hueSliderThumb) {
				hueSliderThumb.style.left = (state.hue / 360 * 100) + "%";
				var thumbHueRgb = hueSaturationLightnessToRgb(state.hue, 100, 50);
				hueSliderThumb.style.backgroundColor = "rgb(" + thumbHueRgb.red + ", " + thumbHueRgb.green + ", " + thumbHueRgb.blue + ")";
			}
			if (alphaSliderThumb) {
				alphaSliderThumb.style.left = (state.alpha * 100) + "%";
				alphaSliderThumb.style.backgroundColor = currentHex;
			}
			if (previewSwatch) {
				previewSwatch.style.backgroundColor = "rgba(" + currentRgb.red + ", " + currentRgb.green + ", " + currentRgb.blue + ", " + state.alpha + ")";
			}
			if (hexInputField) {
				hexInputField.value = currentHex.replace("#", "");
			}
			if (redInputField) {
				redInputField.value = currentRgb.red;
			}
			if (greenInputField) {
				greenInputField.value = currentRgb.green;
			}
			if (blueInputField) {
				blueInputField.value = currentRgb.blue;
			}
			if (alphaInputField) {
				alphaInputField.value = state.alpha.toFixed(2);
			}

			dispatchCustomEvent("mixterial:colorpickerchange", {
				element: rootElement,
				hex: currentHex,
				rgb: currentRgb,
				alpha: state.alpha,
				hsl: { hue: state.hue, saturation: state.saturation, lightness: state.lightness }
			});
		}

		function attachDragBehaviour(targetElement, onPointerMove) {
			if (!targetElement) {
				return;
			}
			var isDragging = false;

			function handleMove(pointerEvent) {
				if (!isDragging) {
					return;
				}
				var boundingRectangle = targetElement.getBoundingClientRect();
				var relativeX = Math.min(1, Math.max(0, (pointerEvent.clientX - boundingRectangle.left) / boundingRectangle.width));
				var relativeY = Math.min(1, Math.max(0, (pointerEvent.clientY - boundingRectangle.top) / boundingRectangle.height));
				onPointerMove(relativeX, relativeY);
				render();
			}

			targetElement.addEventListener("pointerdown", function (pointerEvent) {
				isDragging = true;
				handleMove(pointerEvent);
			});
			window.addEventListener("pointermove", handleMove);
			window.addEventListener("pointerup", function () {
				isDragging = false;
			});
		}

		attachDragBehaviour(saturationLightnessCanvas, function (relativeX, relativeY) {
			state.saturation = relativeX * 100;
			state.lightness = (1 - relativeY) * 100;
		});

		attachDragBehaviour(hueSliderContainer, function (relativeX) {
			state.hue = relativeX * 360;
		});

		attachDragBehaviour(alphaSliderContainer, function (relativeX) {
			state.alpha = relativeX;
		});

		if (hexInputField) {
			hexInputField.addEventListener("change", function () {
				var rgbValue = hexToRgb(hexInputField.value);
				var hslValue = rgbToHueSaturationLightness(rgbValue.red, rgbValue.green, rgbValue.blue);
				state.hue = hslValue.hue;
				state.saturation = hslValue.saturation;
				state.lightness = hslValue.lightness;
				render();
			});
		}

		rootElement.querySelectorAll(".color-picker-swatch-tile[data-colour]").forEach(function (swatchElement) {
			swatchElement.addEventListener("click", function () {
				var rgbValue = hexToRgb(swatchElement.getAttribute("data-colour"));
				var hslValue = rgbToHueSaturationLightness(rgbValue.red, rgbValue.green, rgbValue.blue);
				state.hue = hslValue.hue;
				state.saturation = hslValue.saturation;
				state.lightness = hslValue.lightness;
				render();
			});
		});

		render();

		return {
			getState: function () {
				return Object.assign({}, state, { rgb: getCurrentRgb() });
			},
			setHex: function (hexValue) {
				var rgbValue = hexToRgb(hexValue);
				var hslValue = rgbToHueSaturationLightness(rgbValue.red, rgbValue.green, rgbValue.blue);
				state.hue = hslValue.hue;
				state.saturation = hslValue.saturation;
				state.lightness = hslValue.lightness;
				render();
			},
			render: render
		};
	}

	function initialiseColorPickers() {
		var controllers = [];
		document.querySelectorAll(".color-picker-container").forEach(function (rootElement) {
			controllers.push(createColorPickerController(rootElement));
		});
		return controllers;
	}

	var ColorPicker = {
		create: createColorPickerController,
		initialiseAll: initialiseColorPickers,
		hueSaturationLightnessToRgb: hueSaturationLightnessToRgb,
		rgbToHueSaturationLightness: rgbToHueSaturationLightness,
		rgbToHex: rgbToHex,
		hexToRgb: hexToRgb
	};

	Mixterial.ColorPicker = ColorPicker;

	function formatSecondsAsTimestamp(totalSeconds) {
		if (!isFinite(totalSeconds) || totalSeconds < 0) {
			totalSeconds = 0;
		}
		var hours = Math.floor(totalSeconds / 3600);
		var minutes = Math.floor((totalSeconds % 3600) / 60);
		var seconds = Math.floor(totalSeconds % 60);
		var paddedMinutes = minutes < 10 ? "0" + minutes : String(minutes);
		var paddedSeconds = seconds < 10 ? "0" + seconds : String(seconds);
		if (hours > 0) {
			var paddedMinutesWithHours = minutes < 10 ? "0" + minutes : String(minutes);
			return hours + ":" + paddedMinutesWithHours + ":" + paddedSeconds;
		}
		return paddedMinutes + ":" + paddedSeconds;
	}

	function createVideoPlayerController(rootElement) {
		var videoElement = rootElement.querySelector("video");
		if (!videoElement) {
			return null;
		}

		var playPauseButton = rootElement.querySelector(".video-player-play-pause-button");
		var centerPlayButton = rootElement.querySelector(".video-player-center-play-button");
		var seekBarContainer = rootElement.querySelector(".video-player-seek-bar-container");
		var seekBarProgress = rootElement.querySelector(".video-player-seek-bar-progress");
		var seekBarBuffered = rootElement.querySelector(".video-player-seek-bar-buffered");
		var seekBarThumb = rootElement.querySelector(".video-player-seek-bar-thumb");
		var currentTimeDisplay = rootElement.querySelector('[data-mixterial-video-time="current"]');
		var durationTimeDisplay = rootElement.querySelector('[data-mixterial-video-time="duration"]');
		var volumeSlider = rootElement.querySelector(".video-player-volume-container input[type=\"range\"]");
		var muteButton = rootElement.querySelector('[data-mixterial-video-action="mute"]');
		var fullscreenButton = rootElement.querySelector('[data-mixterial-video-action="fullscreen"]');
		var settingsButton = rootElement.querySelector(".video-player-settings-button");
		var settingsMenu = rootElement.querySelector(".video-player-settings-menu");
		var pictureInPictureButton = rootElement.querySelector('[data-mixterial-video-action="picture-in-picture"]');
		var captionsButton = rootElement.querySelector('[data-mixterial-video-action="captions"]');
		var loadingOverlay = rootElement.querySelector(".video-player-loading-overlay");

		function togglePlayback() {
			if (videoElement.paused) {
				videoElement.play();
			} else {
				videoElement.pause();
			}
		}

		function updatePlayPauseVisualState() {
			var isPaused = videoElement.paused;
			if (playPauseButton) {
				playPauseButton.setAttribute("data-playing", isPaused ? "false" : "true");
			}
			if (centerPlayButton) {
				centerPlayButton.style.display = isPaused ? "inline-flex" : "none";
			}
		}

		function updateSeekBarVisuals() {
			if (!videoElement.duration) {
				return;
			}
			var playedPercentage = (videoElement.currentTime / videoElement.duration) * 100;
			if (seekBarProgress) {
				seekBarProgress.style.inlineSize = playedPercentage + "%";
			}
			if (seekBarThumb) {
				seekBarThumb.style.left = playedPercentage + "%";
			}
			if (currentTimeDisplay) {
				currentTimeDisplay.textContent = formatSecondsAsTimestamp(videoElement.currentTime);
			}
			if (videoElement.buffered && videoElement.buffered.length > 0 && seekBarBuffered) {
				var bufferedEnd = videoElement.buffered.end(videoElement.buffered.length - 1);
				seekBarBuffered.style.inlineSize = ((bufferedEnd / videoElement.duration) * 100) + "%";
			}
		}

		function seekToRelativePosition(relativeX) {
			if (!videoElement.duration) {
				return;
			}
			videoElement.currentTime = relativeX * videoElement.duration;
			updateSeekBarVisuals();
		}

		if (playPauseButton) {
			playPauseButton.addEventListener("click", togglePlayback);
		}
		if (centerPlayButton) {
			centerPlayButton.addEventListener("click", togglePlayback);
		}
		videoElement.addEventListener("click", togglePlayback);
		videoElement.addEventListener("play", updatePlayPauseVisualState);
		videoElement.addEventListener("pause", updatePlayPauseVisualState);
		videoElement.addEventListener("timeupdate", updateSeekBarVisuals);
		videoElement.addEventListener("progress", updateSeekBarVisuals);
		videoElement.addEventListener("waiting", function () {
			if (loadingOverlay) {
				loadingOverlay.style.display = "flex";
			}
		});
		videoElement.addEventListener("playing", function () {
			if (loadingOverlay) {
				loadingOverlay.style.display = "none";
			}
		});
		videoElement.addEventListener("loadedmetadata", function () {
			if (durationTimeDisplay) {
				durationTimeDisplay.textContent = formatSecondsAsTimestamp(videoElement.duration);
			}
		});

		if (seekBarContainer) {
			var isSeeking = false;
			seekBarContainer.addEventListener("pointerdown", function (pointerEvent) {
				isSeeking = true;
				var boundingRectangle = seekBarContainer.getBoundingClientRect();
				var relativeX = Math.min(1, Math.max(0, (pointerEvent.clientX - boundingRectangle.left) / boundingRectangle.width));
				seekToRelativePosition(relativeX);
			});
			window.addEventListener("pointermove", function (pointerEvent) {
				if (!isSeeking) {
					return;
				}
				var boundingRectangle = seekBarContainer.getBoundingClientRect();
				var relativeX = Math.min(1, Math.max(0, (pointerEvent.clientX - boundingRectangle.left) / boundingRectangle.width));
				seekToRelativePosition(relativeX);
			});
			window.addEventListener("pointerup", function () {
				isSeeking = false;
			});
		}

		if (volumeSlider) {
			volumeSlider.addEventListener("input", function () {
				videoElement.volume = parseFloat(volumeSlider.value);
				videoElement.muted = videoElement.volume === 0;
			});
		}

		if (muteButton) {
			muteButton.addEventListener("click", function () {
				videoElement.muted = !videoElement.muted;
				muteButton.setAttribute("data-muted", videoElement.muted ? "true" : "false");
			});
		}

		if (fullscreenButton) {
			fullscreenButton.addEventListener("click", function () {
				if (document.fullscreenElement) {
					document.exitFullscreen();
					rootElement.classList.remove("video-player-container-fullscreen");
				} else if (rootElement.requestFullscreen) {
					rootElement.requestFullscreen();
					rootElement.classList.add("video-player-container-fullscreen");
				}
			});
		}

		if (settingsButton && settingsMenu) {
			settingsButton.addEventListener("click", function (clickEvent) {
				clickEvent.stopPropagation();
				settingsMenu.classList.toggle("video-player-settings-menu-open");
			});
			document.addEventListener("click", function () {
				settingsMenu.classList.remove("video-player-settings-menu-open");
			});
		}

		rootElement.querySelectorAll(".video-player-playback-speed-option").forEach(function (speedOptionElement) {
			speedOptionElement.addEventListener("click", function () {
				var playbackRateValue = parseFloat(speedOptionElement.getAttribute("data-mixterial-playback-rate"));
				if (!isNaN(playbackRateValue)) {
					videoElement.playbackRate = playbackRateValue;
				}
			});
		});

		if (pictureInPictureButton && document.pictureInPictureEnabled) {
			pictureInPictureButton.addEventListener("click", function () {
				if (document.pictureInPictureElement) {
					document.exitPictureInPicture();
				} else {
					videoElement.requestPictureInPicture();
				}
			});
		}

		if (captionsButton) {
			captionsButton.addEventListener("click", function () {
				var textTracks = videoElement.textTracks;
				if (textTracks && textTracks.length > 0) {
					var isCurrentlyShowing = textTracks[0].mode === "showing";
					textTracks[0].mode = isCurrentlyShowing ? "hidden" : "showing";
					captionsButton.setAttribute("data-captions-enabled", isCurrentlyShowing ? "false" : "true");
				}
			});
		}

		updatePlayPauseVisualState();

		return {
			play: function () { videoElement.play(); },
			pause: function () { videoElement.pause(); },
			togglePlayback: togglePlayback,
			seekTo: function (seconds) { videoElement.currentTime = seconds; },
			setVolume: function (volumeValue) { videoElement.volume = volumeValue; },
			element: videoElement
		};
	}

	function initialiseVideoPlayers() {
		var controllers = [];
		document.querySelectorAll(".video-player-container").forEach(function (rootElement) {
			var controller = createVideoPlayerController(rootElement);
			if (controller) {
				controllers.push(controller);
			}
		});
		return controllers;
	}

	var VideoPlayer = {
		create: createVideoPlayerController,
		initialiseAll: initialiseVideoPlayers,
		formatTimestamp: formatSecondsAsTimestamp
	};

	Mixterial.VideoPlayer = VideoPlayer;

	function initialiseLazyLoadedImages() {
		var lazyImageElements = document.querySelectorAll("[data-mixterial-lazy-src]");
		if (lazyImageElements.length === 0) {
			return;
		}
		if (!("IntersectionObserver" in window)) {
			lazyImageElements.forEach(function (imageElement) {
				imageElement.src = imageElement.getAttribute("data-mixterial-lazy-src");
			});
			return;
		}
		var observerInstance = new IntersectionObserver(function (entries, observer) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					var targetElement = entry.target;
					targetElement.src = targetElement.getAttribute("data-mixterial-lazy-src");
					targetElement.removeAttribute("data-mixterial-lazy-src");
					observer.unobserve(targetElement);
				}
			});
		}, { rootMargin: "200px 0px" });
		lazyImageElements.forEach(function (imageElement) {
			observerInstance.observe(imageElement);
		});
	}

	function initialiseExternalLinkSafety() {
		document.querySelectorAll('a[href^="http"]').forEach(function (linkElement) {
			try {
				var linkUrl = new URL(linkElement.href);
				if (linkUrl.hostname !== window.location.hostname && !linkElement.hasAttribute("data-mixterial-no-external-safety")) {
					if (!linkElement.hasAttribute("target")) {
						linkElement.setAttribute("target", "_blank");
					}
					var existingRelAttribute = linkElement.getAttribute("rel") || "";
					if (existingRelAttribute.indexOf("noopener") === -1) {
						linkElement.setAttribute("rel", (existingRelAttribute + " noopener noreferrer").trim());
					}
				}
			} catch (error) {}
		});
	}

	function copyTextToClipboard(textToCopy) {
		if (navigator.clipboard && navigator.clipboard.writeText) {
			return navigator.clipboard.writeText(textToCopy);
		}
		return new Promise(function (resolve, reject) {
			var temporaryTextArea = document.createElement("textarea");
			temporaryTextArea.value = textToCopy;
			temporaryTextArea.style.position = "fixed";
			temporaryTextArea.style.opacity = "0";
			document.body.appendChild(temporaryTextArea);
			temporaryTextArea.focus();
			temporaryTextArea.select();
			try {
				document.execCommand("copy");
				resolve();
			} catch (error) {
				reject(error);
			} finally {
				document.body.removeChild(temporaryTextArea);
			}
		});
	}

	function initialiseCopyToClipboardTriggers() {
		document.querySelectorAll("[data-mixterial-copy-value]").forEach(function (triggerElement) {
			triggerElement.addEventListener("click", function () {
				var valueToCopy = triggerElement.getAttribute("data-mixterial-copy-value");
				copyTextToClipboard(valueToCopy).then(function () {
					dispatchCustomEvent("mixterial:clipboardcopy", { value: valueToCopy });
				});
			});
		});
	}

	function initialiseConnectivityMonitoring() {
		window.addEventListener("online", function () {
			dispatchCustomEvent("mixterial:connectivitychange", { isOnline: true });
		});
		window.addEventListener("offline", function () {
			dispatchCustomEvent("mixterial:connectivitychange", { isOnline: false });
		});
	}

	function initialiseGlobalKeyboardHandling() {
		document.addEventListener("keydown", function (keyboardEvent) {
			if (keyboardEvent.key !== "Escape") {
				return;
			}
			if (openSheetMenuStack.length > 0) {
				closeSheetMenu(openSheetMenuStack[openSheetMenuStack.length - 1]);
				return;
			}
			if (openModalStack.length > 0) {
				closeModal(openModalStack[openModalStack.length - 1]);
				return;
			}
			document.querySelectorAll(".dropdown-menu-open, .popover-panel-open").forEach(function (openElement) {
				openElement.classList.remove("dropdown-menu-open");
				openElement.classList.remove("popover-panel-open");
			});
		});
	}

	function initialiseSmoothAnchorScrolling() {
		document.querySelectorAll('a[href^="#"]').forEach(function (anchorElement) {
			anchorElement.addEventListener("click", function (clickEvent) {
				var targetId = anchorElement.getAttribute("href").slice(1);
				if (!targetId) {
					return;
				}
				var targetElement = document.getElementById(targetId);
				if (!targetElement) {
					return;
				}
				clickEvent.preventDefault();
				targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
				if (window.history && window.history.pushState) {
					window.history.pushState(null, "", "#" + targetId);
				}
			});
		});
	}

	var Miscellaneous = {
		initialiseLazyLoadedImages: initialiseLazyLoadedImages,
		initialiseExternalLinkSafety: initialiseExternalLinkSafety,
		copyTextToClipboard: copyTextToClipboard,
		initialiseCopyToClipboardTriggers: initialiseCopyToClipboardTriggers,
		initialiseConnectivityMonitoring: initialiseConnectivityMonitoring,
		initialiseGlobalKeyboardHandling: initialiseGlobalKeyboardHandling,
		initialiseSmoothAnchorScrolling: initialiseSmoothAnchorScrolling
	};

	Mixterial.Miscellaneous = Miscellaneous;

	function initialiseMixterial(options) {
		var settings = options || {};

		return Promise.all([
			Theme.initialise().catch(function (error) {
				dispatchCustomEvent("mixterial:themeloaderror", { error: error });
				return null;
			}),
			Language.initialise().catch(function (error) {
				dispatchCustomEvent("mixterial:languageloaderror", { error: error });
				return null;
			})
		]).then(function () {
			Components.initialiseSheetMenus();
			Components.initialiseModals();
			Components.initialiseDropdownMenus();
			Components.initialiseAccordions();
			Components.initialiseTabs();
			Components.initialiseRangeSliderFillVisuals();
			Components.initialiseNumberSteppers();
			Components.initialiseFileUploadDropzones();
			ColorPicker.initialiseAll();
			VideoPlayer.initialiseAll();
			Miscellaneous.initialiseLazyLoadedImages();
			Miscellaneous.initialiseExternalLinkSafety();
			Miscellaneous.initialiseCopyToClipboardTriggers();
			Miscellaneous.initialiseConnectivityMonitoring();
			Miscellaneous.initialiseGlobalKeyboardHandling();
			Miscellaneous.initialiseSmoothAnchorScrolling();

			if (settings.skipConsent !== true) {
				Consent.initialise();
			}

			dispatchCustomEvent("mixterial:ready", {
				theme: Theme.get(),
				language: Language.get()
			});
		});
	}

	Mixterial.init = initialiseMixterial;

	Mixterial.Configuration = Configuration;
	Mixterial.StorageKeys = StorageKeys;
	Mixterial.Storage = Storage;
	Mixterial.Utilities = Utilities;

	window.Mixterial = Mixterial;

	onDocumentReady(function () {
		if (window.MixterialNoAutoInit === true) {
			return;
		}
		initialiseMixterial();
	});
})(window, document);