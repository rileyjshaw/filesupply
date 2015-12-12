(function () {
  var waiting = document.querySelector('.waiting p');
  var uploader = document.querySelector('.uploader');
  var filePicker = uploader.querySelector('input');
  var setupForms = Array.prototype.slice.call(document.querySelectorAll('.fields form'));
  var lastIdx = setupForms.length - 1;
  var inputs = [];
  var responses = [];
  var peer;

  setupForms.forEach(function (el, idx) {
    inputs.push(el.querySelector('input'));
    if (idx === lastIdx) {
      // when the last input is submitted,
      el.addEventListener('submit', function () {
        // hide the list & make an id out of the responses
        var partnerName = inputs.shift().value;
        responses.push(partnerName);
        waiting.textContent = 'waiting on ' + partnerName + '...';
        this.parentElement.parentElement.style.display = 'none';
        // (this is possible since every human goes by a unique name)
        var hopefullyUniqueId = responses.join('');
        var reversedHopefullyUniqueId = responses.reverse().join('');

        // create a new peer out of the generated id
        peer = new Peer(hopefullyUniqueId, {key: KEY_REDACTED});

        // and create the connection
        var conn = peer.connect(reversedHopefullyUniqueId, {reliable: true});

        conn.on('data', function (data) {
          if (data === 'connected') initializeUploader(conn);
          else console.log('data recieved:', data);
        });

        // if it returns an error,
        peer.on('error', function (err) {
          if (err.type === 'peer-unavailable') {
            console.log('you were the first!');
          } else if (err.type === 'unavailable-id') {
            console.log('these names are already in use.');
            peer.destroy();
          } else console.log('WTF ERROR?', err);
        });

        // otherwise, wait for the other client to connect
        peer.on('connection', function (conn) {
          var i = 0;
          conn.on('open', function () { this.send('connected'); });
          initializeUploader(conn);
        });
      }, false);
    } else {
      // if it's not the last input, just push the response and hide the li
      el.addEventListener('submit', function () {
        responses.push(inputs.shift().value);
        this.parentElement.style.display = 'none';
        inputs[0].focus();
      }, false);
    }
  });

  function initializeUploader (conn) {
    waiting.parentElement.style.display = 'none';
    uploader.ondragenter = function () { this.className = 'uploader icon-arrow-down'; };
    uploader.ondragleave = function () { this.className = 'uploader icon-plus'; };
    uploader.ondragover = function (e) { return false; };
    uploader.onclick = function () { filePicker.click() };
    uploader.ondrop = function (e) {
      var file = e.dataTransfer.files[0];
      var reader = new FileReader();
      this.className = 'uploader icon-checkmark';

      reader.onload = function (event) {
        conn.send(event.target.result);
      };

      reader.readAsDataURL(file);
      return false;
    };
  }
})();
