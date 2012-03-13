OAuth2.adapter('sample', {

  /**
   * @param {Object} config Object containing the clientId, clientSecret and
   * apiScode.
   * @return {String} The endpoint URL to retrieve the authorization code.
   */
  authorizationCodeURL: function(config) {
    return '';
  },

  /**
   * @param {Object} config Object containing the clientId, clientSecret and
   * apiScode.
   * @return {String} The URL of the page to inject the content script into.
   */
  redirectURL: function(config) {
    return '';
  },

  /**
   * @param {String} url The URL of oauth2.html (including the returned
   * parameters).
   * @return {String} The authorization code to be used to fetch the access
   * token.
   */
  parseAuthorizationCode: function(url) {
    return '';
  },

  /**
   * @return {String} The endpoint URL to retrieve the access token.
   */
  accessTokenURL: function() {
    return '';
  },

  /**
   * @return {String} The HTTP method to use to get access tokens.
   */
  accessTokenMethod: function() {
    return 'POST';
  },

  /**
   * @param {String} authorizationCode The code retrieved from the first step in
   * the process.
   * @param {Object} config Object containing the clientId, clientSecret and
   * apiScode.
   * @return {Object} The payload parameters to use to get access tokens.
   */
  accessTokenParams: function(authorizationCode, config) {
    return {};
  },

  /**
   * @param {String} response The response text returned.
   * @return {Object} The accessToken (string), refreshToken (string), expiresIn
   * (integer) and potentially more.
   */
  parseAccessToken: function(response) {
    return {
      accessToken: '',
      refreshToken: '',
      expiresIn: Number.MAX_VALUE
    };
  }

});