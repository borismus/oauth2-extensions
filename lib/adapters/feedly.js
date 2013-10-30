OAuth2.adapter('feedly', {
  authorizationCodeURL: function(config) {
    return ('https://cloud.feedly.com/v3/auth/auth?' +
      'response_type=code&' +
      'client_id={{CLIENT_ID}}&' +
      'redirect_uri={{REDIRECT_URI}}&' +
      'scope={{API_SCOPE}}')
        .replace('{{CLIENT_ID}}', config.clientId)
        .replace('{{REDIRECT_URI}}', this.redirectURL(config))
        .replace('{{API_SCOPE}}', config.apiScope);
  },

  redirectURL: function(config) {
    return 'http://www.feedly.com/robots.txt';
  },

  parseAuthorizationCode: function(url) {
    return url.match(/[&\?]code=([^&]+)/)[1];
  },

  accessTokenURL: function() {
    return 'https://cloud.feedly.com/v3/auth/token';
  },

  accessTokenMethod: function() {
    return 'POST';
  },

  accessTokenParams: function(authorizationCode, config) {
    return {
      code: authorizationCode,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      redirect_uri: this.redirectURL(config)
    };
  },

  parseAccessToken: function(response) {
    var parsedResponse = JSON.parse(response);
    return {
      userId: parsedResponse.id,
      accessToken: parsedResponse.access_token,
      refreshToken: parsedResponse.refresh_token,
      expiresIn: parsedResponse.expires_in
    };
  }
});
