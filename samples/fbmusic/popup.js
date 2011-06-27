var facebook = new OAuth2('facebook', {
  client_id: '177955888930840',
  client_secret: 'b42a5741bd3d6de6ac591c7b0e279c9f',
  api_scope: 'read_stream,user_likes'
});
facebook.authorize(function() {

//document.addEventListener('DOMContentLoaded', function() {

  // Make an XHR that creates the task
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(event) {
    if (xhr.readyState == 4) {
      if(xhr.status == 200) {
        // Great success: parse response with JSON
        var parsed = JSON.parse(xhr.responseText);
        var html = '';
        parsed.data.forEach(function(item, index) {
          html += '<li>' + item.name + '</li>';
        });
        document.querySelector('#music').innerHTML = html;
        return;

      } else {
        // Request failure: something bad happened
      }
    }
  };

  xhr.open('GET', 'https://graph.facebook.com/me/music', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', 'OAuth ' + facebook.getAccessToken());

  xhr.send();

});
