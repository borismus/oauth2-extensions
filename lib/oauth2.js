/*
 * Copyright 2011 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Constructor.
 *
 * @param {String} adapterName The name of the adapter to use for this OAuth 2.
 * @param {Object|String} config Object containing clientId, clientSecret and
 * apiScope or alternatively, OAuth2.FINISH for the finish flow.
 */
var OAuth2 = function(adapterName, config) {
  this.adapterName = adapterName;
  var that = this;
  OAuth2.loadAdapter(adapterName, function() {
    that.adapter = OAuth2.adapters[adapterName];
    if (config === OAuth2.FINISH) {
      that.finishAuth();
      return;
    } else if (config) {
      that.set('clientId', config.client_id);
      that.set('clientSecret', config.client_secret);
      that.set('apiScope', config.api_scope);
    }
  });
};

/**
 * Indicate whether or not debug statements are logged in the console.
 */
OAuth2.debug = false;

/**
 * Pass instead of config to constructor to indicate end of the OAuth flow.
 */
OAuth2.FINISH = 'finish';

/**
 * OAuth 2.0 endpoint adapters known to the library.
 */
OAuth2.adapters = {};
OAuth2.adapterReverse = localStorage.oauth2_adapterReverse &&
    JSON.parse(localStorage.oauth2_adapterReverse) || {};

/**
 * Open up an authorization popup window, starting the OAuth 2.0 flow.
 *
 * @param {Function} callback The method to call when the auth has finished.
 */
OAuth2.prototype.openAuthorizationCodePopup = function(callback) {
  // Store a reference to the callback so that the newly opened window can call
  // it later.
  window['oauth-callback'] = callback;
  // Create a new tab with the OAuth 2.0 prompt.
  chrome.tabs.create({
    url: this.adapter.authorizationCodeURL(this.getConfig())
  }, function() {
    // 1. User grants permission for the application to access the OAuth 2.0
    // endpoint.
    // 2. Endpoint redirects to the redirect URL.
    // 3. Extension injects a script into that redirect URL.
    // 4. Content script redirects back to oauth2.html, while also passing the
    // redirect URL.
    // 5. oauth2.html uses redirect URL to know what OAuth 2.0 flow to finish
    // (if there are multiple OAuth 2.0 adapters).
    // 6. Finally, the flow is finished and client code can call
    // myAuth.getAccessToken() to get a valid access token.
  });
};

/**
 * Get access and refresh (if provided by endpoint) tokens.
 *
 * @param {String} authorizationCode The code retrieved from the first step in
 * the process.
 * @param {Function} callback The method called afterwards with these arguments;
 * access token, refresh token and expiry time
 */
OAuth2.prototype.getAccessAndRefreshTokens = function(authorizationCode, callback) {
  var that = this;
  // Make an XHR to get the token.
  var xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        // Callback with the data (incl. tokens).
        callback(that.adapter.parseAccessToken(xhr.responseText));
      }
    }
  });

  var method = that.adapter.accessTokenMethod();
  var items = that.adapter.accessTokenParams(authorizationCode, that.getConfig());
  var key = null;
  if (method === 'POST') {
    var formData = new FormData();
    for (key in items) {
      formData.append(key, items[key]);
    }
    xhr.open(method, that.adapter.accessTokenURL(), true);
    xhr.send(formData);
  } else if (method === 'GET') {
    var url = that.adapter.accessTokenURL();
    var params = '?';
    for (key in items) {
      params += encodeURIComponent(key) + '=' +
                encodeURIComponent(items[key]) + '&';
    }
    xhr.open(method, url + params, true);
    xhr.send();
  } else {
    throw method + ' is an unknown method';
  }
};

/**
 * Refresh the access token using the currently stored refresh token.
 *
 * Note: This only happens for the Google adapter since all other OAuth 2.0
 * endpoints don't implement refresh tokens.
 *
 * @param {String} refreshToken A valid refresh token.
 * @param {Function} callback The method to be called on success with the access
 * token and expiry time.
 */
OAuth2.prototype.refreshAccessToken = function(refreshToken, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        if (OAuth2.debug) console.log(xhr.responseText);
        // Parse response with JSON.
        var obj = JSON.parse(xhr.responseText);
        // Callback with the tokens.
        callback(obj.access_token, obj.expires_in);
      }
    }
  };

  var data = this.get();
  var formData = new FormData();
  formData.append('client_id', data.clientId);
  formData.append('client_secret', data.clientSecret);
  formData.append('refresh_token', refreshToken);
  formData.append('grant_type', 'refresh_token');
  xhr.open('POST', this.adapter.accessTokenURL(), true);
  xhr.send(formData);
};

/**
 * Extract the authorization code from the URL and make a request to the last
 * leg of the OAuth 2.0 process.
 */
OAuth2.prototype.finishAuth = function() {
  var authorizationCode = null;
  var that = this;

  // Loop through existing extension views and excute any stored callbacks.
  function callback(error) {
    var views = chrome.extension.getViews();
    for (var i = 0, view; view = views[i]; i++) {
      if (view['oauth-callback']) {
        view['oauth-callback'](error);
        // TODO: Decide whether it's worth it to scope the callback or not.
        // Currently, every provider will share the same callback address but
        // that's not such a big deal assuming that they check to see whether
        // the token exists instead of blindly trusting that it does.
      }
    }

    // Once we get here, close the current tab and we're good to go.
    // The following works around bug: crbug.com/84201
    window.open('', '_self', '');
    window.close();
  }

  try {
    authorizationCode = that.adapter.parseAuthorizationCode(window.location.href);
    if (OAuth2.debug) {
      console.log(authorizationCode);
    }
  } catch (e) {
    if (OAuth2.debug) {
      console.error(e);
    }
    callback(e);
  }

  that.getAccessAndRefreshTokens(authorizationCode, function(data) {
    that.set('accessTokenDate', (new Date()).valueOf());

    // Set all data supplied by the OAuth 2.0 provider.
    for (var name in data) {
      if (data.hasOwnProperty(name) && data[name]) {
        that.set(name, data[name]);
      }
    }

    callback();
  });
};

/**
 * Indicate whether or not the current access token has expired.
 *
 * @return {Boolean} True if the access token has expired; otherwise false.
 */
OAuth2.prototype.isAccessTokenExpired = function() {
  var data = this.get();
  return (new Date().valueOf() - data.accessTokenDate) > data.expiresIn * 1000;
};

/**
 * Get the persisted adapter data in localStorage. Optionally, provide a
 * property name to only retrieve its value.
 *
 * @param {String} [name] The name of the property to be retrieved.
 * @return The data object or property value if name was specified.
 */
OAuth2.prototype.get = function(name) {
  var src = this.source();
  var obj = src ? JSON.parse(src) : {};
  return name ? obj[name] : obj;
};

/**
 * Set the value of a named property on the persisted adapter data in
 * localStorage.
 *
 * @param {String} name The name of the property to change.
 * @param value The value to be set.
 */
OAuth2.prototype.set = function(name, value) {
  var obj = this.get();
  obj[name] = value;
  this.source(JSON.stringify(obj));
};

/**
 * Clear all persisted adapter data in localStorage. Optionally, provide a
 * property name to only clear its value.
 *
 * @param {String} [name] The name of the property to clear.
 */
OAuth2.prototype.clear = function(name) {
  if (name) {
    var obj = this.get();
    delete obj[name];
    this.source(JSON.stringify(obj));
  } else {
    delete localStorage['oauth2_' + this.adapterName];
  }
};

/**
 * Get the JSON string for the object stored in localStorage. Optionally,
 * provide a new string to be persisted.
 *
 * @param {String} [source] The new JSON string to be set.
 * @return {String} The source JSON string after any possible changes.
 */
OAuth2.prototype.source = function(source) {
  if (source) {
    localStorage['oauth2_' + this.adapterName] = source;
  }
  return localStorage['oauth2_' + this.adapterName];
};

/**
 * Get the configuration parameters to be passed to the adapter.
 *
 * @returns {Object} Contains clientId, clientSecret and apiScope.
 */
OAuth2.prototype.getConfig = function() {
  var data = this.get();
  return {
    clientId: data.clientId,
    clientSecret: data.clientSecret,
    apiScope: data.apiScope
  };
};

/***********************************
 *
 * STATIC ADAPTER RELATED METHODS
 *
 ***********************************/

/**
 * Load an OAuth 2.0 adapter and invoke the callback method when it's finished
 * loading.
 *
 * @param {String} adapterName The name of the JS file for the adapter (without
 * the extension).
 * @param {Function} callback The method to be called once the adapter has been
 * loaded.
 */
OAuth2.loadAdapter = function(adapterName, callback) {
  // If it's already loaded, don't load it again.
  if (OAuth2.adapters[adapterName]) {
    callback();
    return;
  }
  var head = document.querySelector('head');
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = '/oauth2/adapters/' + adapterName + '.js';
  script.addEventListener('load', function() {
    callback();
  });
  head.appendChild(script);
};

/**
 * Register an adapter with the library. This method is used by all adapter
 * implementations.
 *
 * @param {String} name The name of the adapter.
 * @param {Object} impl The adapter implementation.
 * @throws {String} If the specified adapter is invalid.
 */
OAuth2.adapter = function(name, impl) {
  var implementing = 'authorizationCodeURL redirectURLaccessTokenURL ' +
    'accessTokenMethod accessTokenParams accessToken';

  // Check for missing methods.
  implementing.split(' ').forEach(function(method) {
    if (!method in impl) {
      throw 'Invalid adapter! Missing method: ' + method;
    }
  });

  // Save the adapter in the adapter registry.
  OAuth2.adapters[name] = impl;
  // Make an entry in the adapter lookup table.
  OAuth2.adapterReverse[impl.redirectURL()] = name;
  // Store the the adapter lookup table in localStorage.
  localStorage.oauth2_adapterReverse = JSON.stringify(OAuth2.adapterReverse);
};

/**
 * Look up the adapter name based on the redirect URL. This method is used by
 * oauth2.html in the second part of the OAuth 2.0 flow.
 *
 * @param {String} url The URL that called oauth2.html.
 * @return {String} The name of the adapter for the current page.
 */
OAuth2.lookupAdapterName = function(url) {
  var adapterReverse = JSON.parse(localStorage.oauth2_adapterReverse);
  return adapterReverse[url];
};

/***********************************
 *
 * PUBLIC API
 *
 ***********************************/

/**
 * Authorize the OAuth authenticator instance.
 *
 * @param {Function} [callback] The method called when authorization is
 * successful except when grant popup required.
 */
OAuth2.prototype.authorize = function(callback) {
  var that = this;
  OAuth2.loadAdapter(that.adapterName, function() {
    that.adapter = OAuth2.adapters[that.adapterName];
    var data = that.get();
    if (!data.accessToken) {
      // There's no access token yet. Start the authorizationCode flow.
      that.openAuthorizationCodePopup(callback);
    } else if (that.isAccessTokenExpired()) {
      // There's an existing access token but it's expired.
      if (data.refreshToken) {
        that.refreshAccessToken(data.refreshToken, function(at, exp) {
          that.set('accessToken', at);
          that.set('expiresIn', exp);
          that.set('accessTokenDate', (new Date()).valueOf());
          // Invoke the callback method when we finish refreshing.
          if (callback) callback();
        });
      } else {
        // No refresh token so just do the popup thing again.
        that.openAuthorizationCodePopup(callback);
      }
    } else {
      // We have an access token and it's not expired... yet.
      if (callback) callback();
    }
  });
};

/**
 * Get a valid access token.
 *
 * @returns {String} The access token.
 */
OAuth2.prototype.getAccessToken = function() {
  return this.get('accessToken');
};

/**
 * Indicate whether or not a valid access token exists.
 *
 * @returns {Boolean} True if an access token exists; otherwise false.
 */
OAuth2.prototype.hasAccessToken = function() {
  return !!this.get('accessToken');
};

/**
 * Clear an access token, effectively "logging out" of the service.
 */
OAuth2.prototype.clearAccessToken = function() {
  this.clear('accessToken');
};