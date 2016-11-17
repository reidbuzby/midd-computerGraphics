
var vertexShader = "attribute vec4 a_Position;"+
"varying vec4 v_Position;" +
"uniform vec4 u_Position;"+
"uniform float u_Scale;"+
"void main(){"+
  "gl_Position =  a_Position;"+
  "v_Position = (a_Position + u_Position)/u_Scale;"+
"}";

var fragmentShader = "precision highp float;"+
"varying vec4 v_Position;" +

"float cx;"+
"float cy;"+
"float dx;"+
"float dy;"+
"float tmp;"+
"int bored;"+
"float dwell;"+

"void main(){"+
  "cx = v_Position[0];"+
  "cy = v_Position[1];"+
  "dx = cx;"+
  "dy = cy;"+
  "bored = 1;"+

  "gl_FragColor = v_Position;"+

  "for (int i = 0;i < 50000;i += 1) {"+
    "dwell = float(i);"+
    "if (dx*dx + dy*dy >= 4.0) {"+
      "bored = 0;"+
      "break;"+
    "}"+
    "else {"+
      "tmp = dx;"+
	    "dx = dx * dx - dy*dy+cx;"+
	    "dy = 2.0 * tmp * dy + cy;"+
    "}"+
  "}"+

  "if (bored == 1) {"+
    "gl_FragColor = vec4 (0.3, 0.1, 0.1, 1.0);"+
  "}"+

  "else {"+
    "gl_FragColor = vec4 (dwell/30.0, dwell/500.0, 0.0, 1.0);"+
  "}"+
"}";


window.onload = function(){
  var canvas = document.getElementById('canvas');
  var center = [-0.5,0.0];
  var scale = 1.0;


  var gl;
  // catch the error from creating the context since this has nothing to do with the code
  try{
    gl = middUtils.initializeGL(canvas);
  } catch (e){
    alert('Could not create WebGL context');
    return;
  }

  var context = canvas.getContext("2d");
      // prevent the context menu from appearing when we right click in the canvas
  canvas.oncontextmenu = function(ev){
      ev.preventDefault();
  };



  function draw() {
    // don't catch this error since any problem here is a programmer error
    var program = middUtils.initializeProgram(gl, vertexShader, fragmentShader);

    // grab a reference to the position attribute
    var a_Position = gl.getAttribLocation(program, "a_Position");

    // create the points
    var data = new Float32Array([
      -1.0,  1.0,  1.0, 0.0, 0.0,
      -1.0, -1.0,  1.0, 0.0, 0.0,
       1.0, -1.0,  1.0, 0.0, 0.0,
       1.0, -1.0,  1.0, 0.0, 0.0,
       1.0,  1.0,  1.0, 0.0, 0.0,
      -1.0,  1.0,  1.0, 0.0, 0.0
       ]);

    // make a buffer a push the points into it
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    var FSIZE = data.BYTES_PER_ELEMENT;

    var u_Scale = gl.getUniformLocation(program, "u_Scale");
    gl.uniform1f(u_Scale, scale);

    var u_Position = gl.getUniformLocation(program, "u_Position");
    gl.uniform4f(u_Position, center[0], center[1], 0.0, 0.0);

    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 5 * FSIZE, 0);
    gl.enableVertexAttribArray(a_Position);

    // set the background or clear color
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // clear the context for new content
    gl.clear(gl.COLOR_BUFFER_BIT);

    // tell the GPU to draw the point
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  draw()

  // handle mouse clicks in the canvas
  canvas.onmousedown = function(ev){
    // the x and y are in browser space, so we want to
    // convert them to canvas space using the bounding rect

    // get the click location in browser space
    var x = ev.clientX;
    var y = ev.clientY;

    // convert to canvas space
    var rect = ev.target.getBoundingClientRect();
    x = ((x - rect.left) - canvas.width/2) / (canvas.width/2);
    y = (canvas.height/2 - (y - rect.top)) / (canvas.height/2);

    //console.log("x: ", x, "y: ", y);

    if (ev.button == 0) { // left button
      center = [center[0] + x, center[1] + y];
      scale *= 1.1;
      draw()
    }else{ // right button
      center = [center[0] + x, center[1] + y];
      scale *= 0.9;
      draw()
    }
  };


};
