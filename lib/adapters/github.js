OAuth2.adapter('github', {

  authorizationCodeURL: function(config) {
    return ('https://github.com/login/oauth/authorize?' +
      'client_id={{CLIENT_ID}}&' +
      'redirect_uri={{REDIRECT_URI}}')
        .replace('{{CLIENT_ID}}', config.clientId)
        .replace('{{REDIRECT_URI}}', this.redirectURL(config));
  },

  redirectURL: function(config) {
    return 'https://github.com/robots.txt';
  },

  parseAuthorizationCode: function(url) {
    var error = url.match(/\?error=([^&]*)/);
    if (error) throw 'Error getting authorization code: ' + error[1];
    return url.match(/\?code=([\w\/\-]+)/)[1];
  },

  accessTokenURL: function() {
    return 'https://github.com/login/oauth/access_token';
  },

  accessTokenMethod: function() {
    return 'POST';
  },

  accessTokenParams: function(authorizationCode, config) {
    return {
      code: authorizationCode,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: this.redirectURL(config),
      grant_type: 'authorization_code'
    };
  },

  parseAccessToken: function(response) {
    return {
      accessToken: response.match(/access_token=([^&]*)/)[1],
      expiresIn: Number.MAX_VALUE
    };
  }

});