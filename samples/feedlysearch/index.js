  feedly = chrome.extension.getBackgroundPage().feedly;
  
  function clearAuthorized() {
    feedly.clearAccessToken();
    checkAuthorized();
  }

  function checkAuthorized() {
    if (feedly.hasAccessToken()) {
      //printing user data
      feedly.authorize(function () { chrome.extension.getBackgroundPage().fetch("https://sandbox.feedly.com/v3/profile", print_user_info); });      
      displayFeedlyInfo(true);
    } else {
      displayFeedlyInfo(false);
    }
  }

  function displayFeedlyInfo(show) {
    var button = document.querySelector('#feedly');
    var myElements = document.querySelectorAll('#user-info, #form, #results');
    
    if(show) {
      button.classList.add('authorized');
      visibility = 'visible';
    }
    else {
      button.classList.remove('authorized');
      visibility = 'hidden';
    }

    for(var i = 0; i < myElements.length; i++)
      myElements[i].style.visibility = visibility;
  }

  function print_results(response){
    response = JSON.parse(response.text);
    document.querySelector('#results').innerHTML = "<h1>Results</h1>";

    if(response.results.length == 0)
      document.querySelector('#results').innerHTML += "No results.";
    else {
      if(response.hint)
        document.querySelector('#results').innerHTML += "No results. Showing results for <b>" +response.hint+ "</b> instead.<br/>";

      for(var i=0; i<response.results.length; i++) 
        document.querySelector('#results').innerHTML += 
          '<a href="{{URL}}" target="_blank"><b>{{TITLE}}</a></b> - <i>{{DESCRIPTION}}</i><br/>'
          .replace('{{URL}}',response.results[i].website)
          .replace('{{TITLE}}',response.results[i].title)
          .replace('{{DESCRIPTION}}',response.results[i].description || "");
    }
  }

  function print_user_info(response){
    response = JSON.parse(response.text);
    document.querySelector('#user-info').innerHTML = "<h1>User data</h1>";
    for(var data in response)
      document.querySelector('#user-info').innerHTML += data +' : ' + response[data] +'</br>';
  }

document.addEventListener('DOMContentLoaded', function () {
  document.querySelector('button#feedly').addEventListener('click', function() { feedly.authorize(checkAuthorized); });
  document.querySelector('button#search-topic').addEventListener('click', function() { feedly.authorize(function () { chrome.extension.getBackgroundPage().fetch("https://sandbox.feedly.com/v3/search/feeds?q="+ document.querySelector('input').value, print_results); });})
  document.querySelector('button#clear').addEventListener('click', function() { clearAuthorized() });

  checkAuthorized();
});

  