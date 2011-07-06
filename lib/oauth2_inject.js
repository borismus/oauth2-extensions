// This script servers as an intermediary between oauth2.js and
// oauth2.html

// Get all ? params from this URL
var url = window.location.href;
var params = url.substring(url.indexOf('?'));

// Also append the current URL to the params
params += '&from=' + encodeURIComponent(url);

// Redirect back to the extension itself so that we have priveledged
// access again
var redirect = chrome.extension.getURL('oauth2/oauth2.html');
window.location = redirect + params;
