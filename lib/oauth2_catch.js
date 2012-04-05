var url = unescape(window.location.href.match(/from=([^&]+)/)[1]);
var adapterName = OAuth2.lookupAdapterName(url.substring(0, url.indexOf('?')));
var finisher = new OAuth2(adapterName, OAuth2.FINISH);