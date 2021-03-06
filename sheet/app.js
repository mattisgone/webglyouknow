var app = function (_canvasId) {
  // Canvas, context, whether app is running
  var _canvas = document.getElementById(_canvasId);
  var _gl = _canvas.getContext("webgl");
  var _isRunning = false;

  // Controls : GUI stuff
  var _controls = {
    alpha : 0,
    color : [ 0, 0, 0, 1 ],
    rotate : 1.2,
    gui : new dat.GUI()
  };
  _controls.gui.add(_controls, "alpha", 0, 20.);
  _controls.gui.add(_controls, "rotate", 0., 2. * 3.14159);
  _controls.gui.addColor(_controls, "color");

  // Key handling
  var _pressedKeys = {};

  // Tangle
  var _tangle = Tangle(_gl);

  document.onkeyup = function (ev) {
    _pressedKeys[ev.keyCode] = false;
  }

  document.onkeydown = function (ev) {
    _pressedKeys[ev.keyCode] = true;
  }

  // Actual app object
  return {
    init : function () {
      setup();
      _gl.bindBuffer(_gl.ARRAY_BUFFER, null);
      _loop();
    },
    play : function () {
      _isRunning = true;
      loop();
    },
    stop : function () {
      _isRunning = false;
    },
    loop : function () {
      _isRunning = true;
      _loop();
    }
  };

  /**
   * Begin looping animation
   * @return {undefined} undefined
   */
  function _loop () {
    if (_isRunning) {
      requestAnimationFrame(_loop);
    }
    update();
    draw();
  }

  function setup() {
    _gl.clearColor(.25, .22, .2, 1);
    _gl.clearDepth(1.0);
    _gl.enable(_gl.DEPTH_TEST);
    _gl.enable(_gl.BLEND);
    _gl.blendFunc(_gl.SRC_ALPHA, _gl.ONE);
  }

  function update() {
    _tangle.update(_controls.rotate);
  }

  function draw() {
    _gl.viewport(0, 0, _canvas.width, _canvas.height);
    _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

    var t = getElapsedSeconds();

    // Perspective Matrix
    webgl.perspectiveMatrix({
      fieldOfView : 45,
      aspectRatio : 1,
      nearPlane : .1,
      farPlane : 100
    });

    // Model-view Matrix
    mat4.identity(webgl.mvMatrix);

    //
    _tangle.draw();
  }
}

var Tangle = (function (gl) {
  var _indices = [];
  var _positions = [];
  var _colors = [];

  var pos = { x : 0, y : 0, z : 0 };
  var center = { x : 0, y : 0, z : 0 };

  for (var i = 0; i < 10 * 10; i++) {
    var t = getElapsedSeconds();
    var x = i % 10;
    var y = Math.floor(i / 10);
    x = x/5 - 1;
    y = y/5 - 1;
    pos = {
      x : x + Math.cos(4 * pos.x) + Math.random()/3,
      y : y + Math.sin(2.5 * pos.y),
      z : 1 + 4 * Math.random()
    };
    /*
    pos = {
      x : x,
      y : y,
      z : 1. - Math.random()/2
    };
    */

    _positions.push(pos.x);
    _positions.push(pos.y);
    _positions.push(pos.z);

    center.x += pos.x;
    center.y += pos.y;
    center.z += pos.z;

    _colors.push(1. - i/100);
    _colors.push(1.);
    _colors.push(1.);
    _colors.push(i/100);
  }

  center.x /= 100;
  center.y /= 100;
  center.z /= 100;

  var pbuffer = gl.createBuffer();
  var cbuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, pbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(_positions), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, cbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(_colors), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  var _program;
  initShader();

  var _angle = 0;

  return {
    update : function (angle) {
      _angle = angle;
    },
    draw : function () {
      webgl.pushModelView();

      webgl.perspectiveMatrix({
        fieldOfView : 45,
        aspectRatio : 1,
        nearPlane : .1,
        farPlane : 100
      });
      mat4.identity(webgl.mvMatrix);
      mat4.translate(webgl.mvMatrix, [  0, 0, -15 ]);
      mat4.rotate(webgl.mvMatrix, _angle, [ 0, 1, 0 ]);

      gl.useProgram(_program);

      var aPosition = gl.getAttribLocation(_program, "aPosition");
      var aColor = gl.getAttribLocation(_program, "aColor");
      var uPMatrix = gl.getUniformLocation(_program, "uPMatrix");
      var uMVMatrix = gl.getUniformLocation(_program, "uMVMatrix");

      gl.enableVertexAttribArray(aPosition);
      gl.enableVertexAttribArray(aColor);

      gl.bindBuffer(gl.ARRAY_BUFFER, pbuffer);
      gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, cbuffer);
      gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0);

      gl.uniformMatrix4fv(uPMatrix, false, webgl.pMatrix);
      gl.uniformMatrix4fv(uMVMatrix, false, webgl.mvMatrix);

      gl.drawArrays(gl.LINE_STRIP, 0, 10 * 10);

      webgl.popModelView();
    }
  }

  function initShader() {
    var vCode = webgl.getShader("pass-vert");
    var fCode = webgl.getShader("pass-frag");
    var vShader = gl.createShader(gl.VERTEX_SHADER);
    var fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vShader, vCode);
    gl.shaderSource(fShader, fCode);
    gl.compileShader(vShader);
    gl.compileShader(fShader);
    _program = gl.createProgram();
    gl.attachShader(_program, vShader);
    gl.attachShader(_program, fShader);
    gl.linkProgram(_program);
  }
});
