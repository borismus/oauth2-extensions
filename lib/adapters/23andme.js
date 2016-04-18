/*
  With OAuth 2.0, you include a space-delimited list of scopes in your requests to access certain user data. The user must consent to each scope. For example, if you wanted SNPs rs123 and rs456, and a user's health reports, your scope would be rs123 rs456 analyses.

  --scope--     --grants access to--
  basic         Id and genotyping status for the user and his or her profiles.
  names         First and last names of the user and his or her profiles.
  haplogroups   Maternal and paternal haplogroups for the user's profiles.
  ancestry      Computed ancestry for all the user's profiles.
  relatives     All computed relative matches for all the user's profiles.
  analyses      The analyzed genome (not raw genetic data) for all the user's profiles. That includes all of your health and disease risks, drug sensitivities, your traits, and your carrier status for diseases.
  rsXX or iXX   Access to the genotype at rsXX or iXX for all the user's profiles. You can string these together to get access to multiple genes. This list of SNPs (29MB) shows which SNPs our customers are genotyped for; all of these SNPs are valid scopes.
  genomes       Access to the entire genome for all the user's profiles. Each genome is approximately 2MB of packed base pairs (which you can deciper using this key.
*/

OAuth2.adapter('23andme', {
  /**
   * @return {URL} URL to the page that returns the authorization code
   */
  authorizationCodeURL: function(config) {
    return ('https://api.23andme.com/authorize/?' +
      'client_id={{CLIENT_ID}}&' +
      'redirect_uri={{REDIRECT_URI}}&' +
      'response_type=code&' +
      'scope={{API_SCOPE}}')
        .replace('{{CLIENT_ID}}', config.clientId)
        .replace('{{REDIRECT_URI}}', this.redirectURL(config))
        .replace('{{API_SCOPE}}', config.apiScope);
  },

  /**
   * @return {URL} URL to the page that we use to inject the content
   * script into
   */
  redirectURL: function(config) {
    return 'http://api.23andme.com/robots.txt';
  },

  /**
   * @return {String} Authorization code for fetching the access token
   */
  parseAuthorizationCode: function(url) {
    var error = url.match(/[&\?]error=([^&]+)/);
    if (error) {
      var error_description = url.match(/[&\?]error_description=([^&]+)/);
      throw 'Error getting authorization code: ' + error[1] + ': ' + error_description[1];
    }
    return url.match(/[&\?]code=([\w\/\-]+)/)[1];
  },

  /**
   * @return {URL} URL to the access token providing endpoint
   */
  accessTokenURL: function() {
    return 'https://api.23andme.com/token/';
  },

  /**
   * @return {String} HTTP method to use to get access tokens
   */
  accessTokenMethod: function() {
    return 'POST';
  },

  /**
   * @return {Object} The payload to use when getting the access token
   */
  accessTokenParams: function(authorizationCode, config) {
    return {
      code: authorizationCode,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: this.redirectURL(config),
      scope: config.apiScope,
      grant_type: "authorization_code"
    };
  },

  /**
   * @return {Object} Object containing accessToken {String},
   * refreshToken {String} and expiresIn {Int}
   */
  parseAccessToken: function(response) {
    var parsedResponse = JSON.parse(response);
    return {
      accessToken: parsedResponse.access_token,
      refreshToken: parsedResponse.refresh_token,
      expiresIn: parsedResponse.expires_in,
      tokenType: parsedResponse.token_type,
      scope: parsedResponse.scope
    };
  }
});
