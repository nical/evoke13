var _loader_resource_count = 0;
var _loader_all_loaded = null;

function loader_init(on_load) {
  if (_loader_resource_count==0) {
    if (DEBUG) {
      console.log("nothing to load");
    }
    on_load();
  } else {
    _loader_all_loaded = on_load;
  }
}

function load_resource(src, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", src);
  xhr.onload = function() {
    if (DEBUG) {
      console.log("loaded: " + src);
    }
    cb(xhr);
  };
  if (DEBUG) {
    xhr.onerror = function() {
      alert("load_resource error "+src);
    }
  }
  _loader_resource_count++
  xhr.send(null);
}

function resource_loaded() {
  --_loader_resource_count;
  if(_loader_resource_count == 0) {
    _loader_all_loaded();
  }
}

function load_audio(url, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url);
  xhr.onload = function() {
    if (DEBUG) {
      console.log("loaded: " + url);
    }
    demo.ac.decodeAudioData(xhr.response, function(data) {
      cb(data);
      resource_loaded();
    });
  };
  if (DEBUG) {
    xhr.onerror = function() {
      alert("load_resource error "+src);
    }
  }
  _loader_resource_count++
  xhr.responseType = "arraybuffer";
  xhr.send(null);
}

function load_text(url, cb) {
  load_resource("assets/"+url, function(xhr) {
    cb(xhr.responseText);
    resource_loaded();
  });
}

function load_image(url, cb) {
  var image = new Image();
  _loader_resource_count++;
  image.src = url;
  image.onload = function() {
    var cvs = document.createElement("canvas");
    cvs.width = image.width;
    cvs.height = image.height;
    var c = cvs.getContext("2d");
    c.drawImage(image, 0, 0, image.width, image.height);

    var b = c.getImageData(0, 0, image.width, image.height);

    cb(b);
    resource_loaded();
  }
  if (DEBUG) {
    image.onerror = function() {
      alert("failed to load the image");
    }
  }
}
