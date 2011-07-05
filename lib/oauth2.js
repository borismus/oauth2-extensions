/**
 * Constructor
 *
 * @param {String} adapterName  name of the adapter to use for this OAuth 2
 * @param {Object} config Containing clientId, clientSecret and apiScope
 * @param {String} config Alternatively, OAuth2.FINISH for the finish flow
 */
var OAuth2 = function(adapterName, config, callback) {
  this.adapterName = adapterName;
  var that = this;
  OAuth2.loadAdapter(adapterName, function() {
    that.adapter = OAuth2.adapters[adapterName];
    if (config == OAuth2.FINISH) {
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
 *
 */
OAuth2.FINISH = 'finish';

/**
 * OAuth 2.0 endpoint adapters known to the library
 */
OAuth2.adapters = {};
OAuth2.adapterReverse = localStorage.adapterReverse &&
    JSON.parse(localStorage.adapterReverse) || {};

/**
 * Opens up an authorization popup window. This starts the OAuth 2.0 flow.
 *
 * @param {Function} callback Method to call when the user finished auth.
 */
OAuth2.prototype.openAuthorizationCodePopup = function(callback) {
  // Store a reference to the callback so that the newly opened window can call
  // it later.
  window['oauth-callback'] = callback;

  // Create a new tab with the OAuth 2.0 prompt
  chrome.tabs.create({url: this.adapter.authorizationCodeURL(this.getConfig())},
  function(tab) {
    // 1. user grants permission for the application to access the OAuth 2.0
    // endpoint
    // 2. the endpoint redirects to the redirect URL.
    // 3. the extension injects a script into that redirect URL
    // 4. the injected script redirects back to oauth2.html, also passing
    // the redirect URL
    // 5. oauth2.html uses redirect URL to know what OAuth 2.0 flow to finish
    // (if there are multiple OAuth 2.0 adapters)
    // 6. Finally, the flow is finished and client code can call
    // myAuth.getAccessToken() to get a valid access token.
  });
};

/**
 * Gets access and refresh (if provided by endpoint) tokens
 *
 * @param {String} authorizationCode Retrieved from the first step in the process
 * @param {Function} callback Called back with 3 params:
 *                            access token, refresh token and expiry time
 */
OAuth2.prototype.getAccessAndRefreshTokens = function(authorizationCode, callback) {
  var that = this;
  // Make an XHR to get the token
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(event) {
    if (xhr.readyState == 4) {
      if(xhr.status == 200) {
        var obj = that.adapter.parseAccessToken(xhr.responseText);
        // Callback with the tokens
        callback(obj.accessToken, obj.refreshToken, obj.expiresIn);
      }
    }
  };

  var method = that.adapter.accessTokenMethod();
  var items = that.adapter.accessTokenParams(authorizationCode, that.getConfig());
  var key = null;
  if (method == 'POST') {
    var formData = new FormData();
    for (key in items) {
      formData.append(key, items[key]);
    }
    xhr.open(method, that.adapter.accessTokenURL(), true);
    xhr.send(formData);
  } else if (method == 'GET') {
    var url = that.adapter.accessTokenURL();
    var params = '?';
    for (key in items) {
      params += key + '=' + items[key] + '&';
    }
    xhr.open(method, url + params, true);
    xhr.send();
  } else {
    throw method + ' is an unknown method';
  }
};

/**
 * Refreshes the access token using the currently stored refresh token
 * Note: this only happens for the Google adapter since all other OAuth 2.0
 * endpoints don't implement refresh tokens.
 *
 * @param {String} refreshToken A valid refresh token
 * @param {Function} callback On success, called with access token and expiry time
 */
OAuth2.prototype.refreshAccessToken = function(refreshToken, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(event) {
    if (xhr.readyState == 4) {
      if(xhr.status == 200) {
        console.log(xhr.responseText);
        // Parse response with JSON
        obj = JSON.parse(xhr.responseText);
        // Callback with the tokens
        callback(obj.access_token, obj.expires_in);
      }
    }
  };

  var formData = new FormData();
  formData.append('client_id', localStorage.clientId);
  formData.append('client_secret', localStorage.clientSecret);
  formData.append('refresh_token', localStorage.refreshToken);
  formData.append('grant_type', 'refresh_token');
  xhr.open('POST', this.adapter.accessTokenURL(), true);
  xhr.send(formData);
};

/**
 * Extracts authorizationCode from the URL and makes a request to the last
 * leg of the OAuth 2.0 process.
*/
OAuth2.prototype.finishAuth = function() {
  var that = this;
  var authorizationCode = that.adapter.parseAuthorizationCode(window.location.href);
  console.log(authorizationCode);
  that.getAccessAndRefreshTokens(authorizationCode, function(at, rt, exp) {
    that.set('accessToken', at);
    that.set('expiresIn', exp);
    // Most OAuth 2.0 providers don't have a refresh token
    if (rt) {
      that.set('refreshToken', rt);
    }
    that.set('accessTokenDate', (new Date()).valueOf());

    // Loop through existing extension views and excute any stored callbacks.
    var views = chrome.extension.getViews();
    for (var i = 0, view; view = views[i]; i++) {
      if (view['oauth-callback']) {
        view['oauth-callback']();
        // TODO: Decide whether it's worth it to scope the callback or not.
        // Currently, every provider will share the same callback address, but
        // that's not such a big deal assuming that they check to see whether
        // the token exists instead of blindly trusting that it does.
      }
    };

    // Once we get here, close the current tab and we're good to go.
    window.open('', '_self', ''); //bug fix
    window.close();
  });
};

/**
 * @return True iff the current access token has expired
 */
OAuth2.prototype.isAccessTokenExpired = function() {
  return (new Date().valueOf() - this.get('accessTokenDate')) >
      this.get('expiresIn') * 1000;
};

/**
 * Wrapper around the localStorage object that gets variables prefixed
 * by the adapter name
 *
 * @param {String} key The key to use for lookup
 * @return {String} The value
 */
OAuth2.prototype.get = function(key) {
  return localStorage[this.adapterName + '_' + key];
};

/**
 * Wrapper around the localStorage object that sets variables prefixed
 * by the adapter name
 *
 * @param {String} key The key to store with
 * @param {String} value The value to store
 */
OAuth2.prototype.set = function(key, value) {
  localStorage[this.adapterName + '_' + key] = value;
};

/**
 * Wrapper around the localStorage object that clears values prefixed by the
 * adapter name
 *
 * @param {String} key The key to clear from localStorage
 */
OAuth2.prototype.clear = function(key) {
  delete localStorage[this.adapterName + '_' + key];
};

/**
 * The configuration parameters that are passed to the adapter
 *
 * @returns {Object} Containing clientId, clientSecret and apiScope
 */
OAuth2.prototype.getConfig = function() {
  return {
    clientId: this.get('clientId'),
    clientSecret: this.get('clientSecret'),
    apiScope: this.get('apiScope')
  }
};

/***********************************
 *
 * STATIC ADAPTER RELATED METHODS
 *
 ***********************************/

/**
 * Loads an OAuth 2.0 adapter and calls back when it's loaded
 *
 * @param adapterName {String} The name of the JS file
 * @param callback {Function} Called as soon as the adapter has been loaded
 */
OAuth2.loadAdapter = function(adapterName, callback) {
  // If it's already loaded, don't load it again
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
 * Registers an adapter with the library. This call is used by each adapter
 *
 * @param {String} name The adapter name
 * @param {Object} impl The adapter implementation
 *
 * @throws {String} If the specified adapter is invalid
 */
OAuth2.adapter = function(name, impl) {
  var implementing = 'authorizationCodeURL redirectURL \
    accessTokenURL accessTokenMethod accessTokenParams accessToken';

  // Check for missing methods
  implementing.split(' ').forEach(function(method, index) {
    if (!method in impl) {
      throw 'Invalid adapter! Missing method: ' + method;
    }
  });

  // Save the adapter in the adapter registry
  OAuth2.adapters[name] = impl;
  // Make an entry in the adapter lookup table
  OAuth2.adapterReverse[impl.redirectURL()] = name;
  // Store the the adapter lookup table in localStorage
  localStorage.adapterReverse = JSON.stringify(OAuth2.adapterReverse);
};

/**
 * Looks up the adapter name based on the redirect URL. Used by oauth2.html
 * in the second part of the OAuth 2.0 flow.
 *
 * @param {String} url The url that called oauth2.html
 * @return The adapter for the current page
 */
OAuth2.lookupAdapterName = function(url) {
  var adapterReverse = JSON.parse(localStorage.adapterReverse);
  return adapterReverse[url];
};

/***********************************
 *
 * PUBLIC API
 *
 ***********************************/

/**
 * Authorizes the OAuth authenticator instance.
 *
 * @param {Function} callback Tries to callback when auth is successful
 *                            Note: does not callback if grant popup required
 */
OAuth2.prototype.authorize = function(callback) {
  var that = this;
  OAuth2.loadAdapter(that.adapterName, function() {
  that.adapter = OAuth2.adapters[that.adapterName];
  if (!that.get('accessToken')) {
    // There's no access token yet. Start the authorizationCode flow
    that.openAuthorizationCodePopup(callback);
  } else if (that.isAccessTokenExpired()) {
    // There's an existing access token but it's expired
    if (that.get('refreshToken')) {
      that.refreshAccessToken(that.get('refreshToken'), function(at, exp) {
        that.set('accessToken', at);
        that.set('expiresIn', exp);
        that.set('accessTokenDate', (new Date()).valueOf());
        // Callback when we finish refreshing
        if (callback) {
          callback();
        }
      });
    } else {
      // No refresh token... just do the popup thing again
      that.openAuthorizationCodePopup(callback);
    }
  } else {
    // We have an access token, and it's not expired yet
    if (callback) {
      callback();
    }
  }
  });
}

/**
 * @returns A valid access token.
 */
OAuth2.prototype.getAccessToken = function() {
  return this.get('accessToken');
};

/**
 * Clears an access token, effectively "logging out" of the service.
 */
OAuth2.prototype.clearAccessToken = function() {
  this.clear('accessToken');
};
