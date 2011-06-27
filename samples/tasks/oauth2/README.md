OAuth 2.0 Library for Chrome Extensions

# Goals

1. Avoid background pages
2. Support a variety of OAuth 2.0 providers that implement the spec
3. Allow multiple applications to use different OAuth 2.0 endpoints from
   one chrome extension.

TODO:
* Proper error handling
* Unit tests based on Google's implementation at least

# Flow

1. Open popup to get an authorizationCode. Specify an implementation
   specific redirect (ex. google.com/robots.txt)
2. User fills out a form (or is already logged in) and then allows
   access to the Allow button
3. OAuth 2.0 server calls back with REDIRECT?code=THE_CODE which is
   intercepted by an injected script which then calls back to the
   extension itself. Also provided (along with code and/or errors) is
   the invoking URL.
4. Now in oauth2.html, look up which adapter we called (by doing a
   lookup based on the invoking URL)

# User setup

* Add oauth2_inject.js to http://www.oauth.net/robots.txt injected
  scripts in the manifest:

    "content_scripts": [
      {
        "matches": ["http://www.oauth.net/robots.txt*"],
        "js": ["oauth2_inject.js"]
      }
    ],

* Initialize the OAuth 2.0 sessions you care about:

    var myAuth = new OAuth2(adapterName, {
      clientId: foo,
      clientSecret: bar,
      apiScope: baz,
    });

  which may open an Allow dialog. Can also do

    var myAuth = new OAuth2(adapterName);

  if relying on previously saved credentials.

* Authorize the sessions

    myAuth.authorize(function() {
      // Successfully authorized
    });

* Get token via accessToken = myAuth.getAccessToken()

# Implementation-specific information

* Authorization Code URL format (authorizationCodeURLFormat)

    https://accounts.google.com/o/oauth2/auth?
      client_id={{CLIENT_ID}&
      redirect_uri={{REDIRECT_URI}}&
      scope={{SCOPE}}&
      response_type=code

or

https://www.facebook.com/dialog/oauth?
     client_id={{CLIENT_ID}}&redirect_uri={{REDIRECT_URI -- suffixed with ?type=code}}

* Redirect URL prefix (redirectURLPrefix)

    http://www.oauth.net/robots.txt

* A function to parse the response given by the URL and handle errors
  (parseAuthorizationCode)

    https://www.example.com/back?code=4/P7q7W91a-oMsCeLvIaQm6bTrgtp6

or

    http://www.example.com/foo?code=73iuhfHx98FKJr


* URL and params for fetching access tokens (accessTokenURL,
  accessTokenMethod, accessTokenParams)

    POST https://accounts.google.com/o/oauth2/token

    code={{AUTHORIZATION_CODE}}
    client_id={{CLIENT_ID}}
    client_secret={{CLIENT_SECRET}}
    redirect_uri={{REDIRECT_URI -- suffixed with ?type=token}}
    grant_type=authorization_code


or

    https://graph.facebook.com/oauth/access_token?
         client_id={{CLIENT_ID}}&redirect_uri={{REDIRECT_URI}}&
         client_secret={{CLIENT_SECRET}}&code={{AUTHORIZATION_CODE}}


* A function to parse the response given by the access token endpoint
  (parseAccessToken)

    {
      "access_token":"1/fFAGRNJru1FTz70BzhT3Zg",
      "expires_in":3920,
      "refresh_token":"1/6BMfW9j53gdGImsixUH6kU5RsR4zwI9lUVX-tqf8JXQ"
    }

or

    access_token=135198374987134|JKHASf7868v&expires=5108
