var google = new OAuth2('google', {
  client_id: '952993494713-h12m6utvq8g8d8et8n2i68plbrr6cr4d.apps.googleusercontent.com',
  client_secret: 'IZ4hBSbosuhoWAX4lyAomm-R',
  api_scope: 'https://www.googleapis.com/auth/tasks'
});

google.authorize(function() {

  var TASK_CREATE_URL = 'https://www.googleapis.com/tasks/v1/lists/@default/tasks';

  var form = document.getElementById('form');
  var success = document.getElementById('success');

  // Hook up the form to create a new task with Google Tasks
  form.addEventListener('submit', function(event) {
    event.preventDefault();
    var input = document.getElementById('input');
    createTodo(input.value);
  });

  function createTodo(task) {
    // Make an XHR that creates the task
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(event) {
      if (xhr.readyState == 4) {
        if(xhr.status == 200) {
          // Great success: parse response with JSON
          var task = JSON.parse(xhr.responseText);
          document.getElementById('taskid').innerHTML = task.id;
          form.style.display = 'none';
          success.style.display = 'block';

        } else {
          // Request failure: something bad happened
        }
      }
    };

    var message = JSON.stringify({
      title: task
    });

    xhr.open('POST', TASK_CREATE_URL, true);

    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'OAuth ' + google.getAccessToken());

    xhr.send(message);
  }

});

