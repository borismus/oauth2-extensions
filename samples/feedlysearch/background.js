chrome.browserAction.onClicked.addListener(launch_main_page);

function launch_main_page() {
  chrome.tabs.create({'url': chrome.extension.getURL('index.html')});
}

var feedly = new OAuth2('feedly', {
  client_id: 'sandbox',
  client_secret: 'Z5ZSFRASVWCV3EFATRUY',
  api_scope: 'https://cloud.feedly.com/subscriptions',
});

if(!localStorage.oauth2_feedly)
  chrome.tabs.create({url: "index.html"});

function fetch(url, sendResponse) {
  xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.setRequestHeader("Authorization","OAuth "+feedly.getAccessToken());
  xhr.onreadystatechange = function() {
    if(xhr.readyState == 3){ 
      sendResponse({"text":xhr.responseText});     
    }
  }; 
  xhr.send();
}	