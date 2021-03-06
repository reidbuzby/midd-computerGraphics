
var vertexShader = "attribute vec4 a_Position;"+
"varying vec4 v_Color;" +
"void main(){"+
  "gl_Position =  a_Position;"+
  "v_Color = a_Position;"+
"}";

var fragmentShader = "precision mediump float;"+
"varying vec4 v_Color;" +
"void main(){"+
  "gl_FragColor = v_Color;"+
  "if (((mod(v_Color[0], 0.4) < 0.2) && (mod(v_Color[1], 0.4) > 0.2)) || ((mod(v_Color[0], 0.4) > 0.2) && (mod(v_Color[1], 0.4) < 0.2))) {"+
    "gl_FragColor = vec4 (0.0, 0.0, 0.0, 1.0);"+
  "}"+
  "else {"+
    "gl_FragColor = vec4 (0.0, 0.0, 0.0, 0.0);"+
  "}"+
"}";


window.onload = function(){
  var canvas = document.getElementById('canvas');
  var gl;
  // catch the error from creating the context since this has nothing to do with the code
  try{
    gl = middUtils.initializeGL(canvas);
  } catch (e){
    alert('Could not create WebGL context');
    return;
  }

  // don't catch this error since any problem here is a programmer error
  var program = middUtils.initializeProgram(gl, vertexShader, fragmentShader);

  // grab a reference to the position attribute
  var a_Position = gl.getAttribLocation(program, "a_Position");
  var v_Color = gl.getAttribLocation(program, "v_Color");
  //var u_Color = gl.getUniformLocation(program, "u_Color");

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

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 5 * FSIZE, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.vertexAttribPointer(v_Color, 3, gl.FLOAT, false, 5 * FSIZE, 2 * FSIZE);
  gl.enableVertexAttribArray(v_Color);


  // set the background or clear color
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  //gl.uniform4f(u_Color, 0.0, 1.0, 0.3, 1.0);

  // clear the context for new content
  gl.clear(gl.COLOR_BUFFER_BIT);

  // set the position
  //gl.vertexAttrib2f(a_Position,0.0, 0.5);


  // tell the GPU to draw the point
  gl.drawArrays(gl.TRIANGLES, 0, 6);



};
