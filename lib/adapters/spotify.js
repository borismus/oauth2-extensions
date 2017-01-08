OAuth2.adapter('spotify', {

  authorizationCodeURL: function(config) {
    return ('https://accounts.spotify.com/authorize/?client_id={{CLIENT_ID}}&response_type=code&redirect_uri={{REDIRECT_URI}}&scope={{API_SCOPE}}')
        .replace('{{CLIENT_ID}}', config.clientId)
        .replace('{{REDIRECT_URI}}', this.redirectURL(config))
        .replace('{{API_SCOPE}}', config.apiScope);
  },

  redirectURL: function(config) {
    return 'https://www.spotify.com/robots.txt';
  },

  parseAuthorizationCode: function(url) {
    var error = url.match(/[&\?]error=([^&]+)/);
    if (error) {
      throw 'Error getting authorization code: ' + error[1];
    }
    return url.match(/[&\?]code=([^&]+)/)[1];
  },

  accessTokenURL: function() {
    return 'https://accounts.spotify.com/api/token';
  },

  accessTokenMethod: function() {
    return 'POST';
  },

  accessTokenParams: function(authorizationCode, config) {
    return {
      code: authorizationCode,
      redirect_uri: this.redirectURL(config),
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret
    };
  },

  accessTokenHeaders: function (config) {
    return {
      'Content-type': 'application/x-www-form-urlencoded'
    }
  },

  parseAccessToken: function(response) {
    console.log(response);
    response = JSON.parse(response);

    return {
      accessToken: response.access_token,
      expiresIn: response.expires_in,
      tokenType: response.token_type,
      refreshToken: response.refresh_token
    };
  }
});
