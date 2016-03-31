OAuth2.adapter('salesforce', {

  authorizationCodeURL: function(config) {
      return ('https://login.salesforce.com/services/oauth2/authorize?' +
      'response_type=code&' +
      'client_id={{CLIENT_ID}}&' +
      'scope={{API_SCOPE}}&' +
      'display=touch&' + 
      'redirect_uri={{REDIRECT_URI}}')
        .replace('{{CLIENT_ID}}', config.clientId)
        .replace('{{API_SCOPE}}', config.apiScope)
        .replace('{{REDIRECT_URI}}', this.redirectURL(config));
  },

  redirectURL: function(config) {
    return 'https://login.salesforce.com/services/oauth2/success';
  },

  parseAuthorizationCode: function(url) {
    var error = url.match(/[&\?]error=([^&]+)/);
    if (error) {
      throw 'Error getting authorization code: ' + error[1];
    }

    url = decodeURIComponent(url);
    return url.match(/[&\?]code=([\w\/\-\=\.]+)/)[1];
  },

  accessTokenURL: function() {
    return 'https://login.salesforce.com/services/oauth2/token';
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
    var values = JSON.parse(response);
    return {
      accessToken: values.access_token,
      refreshToken: values.refresh_token,

      // We don't get this info in the response from the salesforce
      // server, the value depends on what the admin of the org set
      expiresIn: null,

      instanceUrl: values.instance_url
    };
  }
});
