Array.prototype.equals = function (array) {
    if (!array)
        return false;

    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        if (this[i] instanceof Array && array[i] instanceof Array) {
            if (!this[i].equals(array[i]))
                return false;
        }
        else if (this[i] != array[i]) {
            return false;
        }
    }
    return true;
}
Object.defineProperty(Array.prototype, "equals", {enumerable: false});

function isItemInArray(array, item) {
    for (var i = 0; i < array.length; i++) {
        if (array[i][0] == item[0] && array[i][1] == item[1]) {
            return true;
        }
    }
    return false;
}

function removeElementFrom2DArray(array, element) {
  for (var i = 0; i < array.length; i++) {
    if (array[i].equals(element)) {
      array.splice(i, 1);
    }
  }
}

function buildMaze(size) {

  var wallsList = [];
  var openList = [];

  for (var i = 0.0; i < size; i++) {
    wallsList.push([0.0, i]);//add top row of border
  }

  for (var i = 0.0; i < size; i++) {
    wallsList.push([size-1, i]);//add bottom row of border
  }

  for (var i = 1.0; i < size-1; i++) {
    wallsList.push([i, 0.0]);//add left column of border
  }

  for (var i = 1.0; i < size-1; i++) {
    wallsList.push([i, size-1]);//add right column of border
  }

  //2D array with each element of the array representing a vertex. 1 is a wall 0 is open
  var BINARYMAZE = new Array(size);

  for (var i = 0; i < size; i++) {
    BINARYMAZE[i] = new Array(size)
  }

  //set every vertex in binary maze list to a wall(1)
  for (var i = 0; i < size; i++) {
    for (var j = 0; j < size; j++) {
      BINARYMAZE[i][j] = 1;
    }
  }

  //randomly choose a starting vertex and make it open
  var startnum = Math.floor((Math.random() * size - 1) + 1);
  if (startnum == 0) {
    startnum = 1;
  }

  if (startnum == size - 1) {
    startnum = size - 2;
  }
  var nextVert = [startnum, startnum];


  openList.push(nextVert);

  BINARYMAZE[nextVert[0]][nextVert[1]] = 0;

  var stop = false;
  var newWalls = []
  var lastVert;
  var first = 0;

  while (! stop) {
    //check wall one below nextVert
    if (! (isItemInArray(wallsList, [nextVert[0]+1, nextVert[1]])) && (!(isItemInArray(openList, [nextVert[0]+1, nextVert[1]])))) {
      if (isItemInArray(newWalls, [nextVert[0]+1, nextVert[1]])) {
        wallsList.push([nextVert[0]+1, nextVert[1]]);
        removeElementFrom2DArray(newWalls, [nextVert[0]+1, nextVert[1]]);
      }
      else {
        newWalls.push([nextVert[0]+1, nextVert[1]]);
      }
    }
    //check wall one above nextVert
    if (!(isItemInArray(wallsList, [nextVert[0]-1, nextVert[1]])) && (!(isItemInArray(openList, [nextVert[0]-1, nextVert[1]])))) {
      if (isItemInArray(newWalls, [nextVert[0]-1, nextVert[1]])) {
        wallsList.push([nextVert[0]-1, nextVert[1]]);
        removeElementFrom2DArray(newWalls, [nextVert[0]-1, nextVert[1]]);
      }
      else {
        newWalls.push([nextVert[0]-1, nextVert[1]]);
      }
    }
    //check wall one right nextVert
    if (!(isItemInArray(wallsList, [nextVert[0], nextVert[1]+1])) && (!(isItemInArray(openList, [nextVert[0], nextVert[1]+1])))) {
      if (isItemInArray(newWalls, [nextVert[0], nextVert[1]+1])) {
        wallsList.push([nextVert[0], nextVert[1]+1]);
        removeElementFrom2DArray(newWalls, [nextVert[0], nextVert[1]+1]);
      }
      else {
        newWalls.push([nextVert[0], nextVert[1]+1]);
      }
    }
    //check wall one left nextVert
    if (!(isItemInArray(wallsList, [nextVert[0], nextVert[1]-1])) && (!(isItemInArray(openList, [nextVert[0], nextVert[1]-1])))) {
      if (isItemInArray(newWalls, [nextVert[0], nextVert[1]-1])) {
        wallsList.push([nextVert[0], nextVert[1]-1]);
        removeElementFrom2DArray(newWalls, [nextVert[0], nextVert[1]-1]);
      }
      else {
        newWalls.push([nextVert[0], nextVert[1]-1]);
      }
    }
    //randomly choose next visited vertex from newWalls
    if (newWalls.length == 0) {
      stop = true;
    }
    else {
      lastVert = nextVert;
      var rand = Math.floor((Math.random() * newWalls.length - 1) + 1);
      nextVert = newWalls[rand];
      //remove that new vertex from newWalls
      removeElementFrom2DArray(newWalls, nextVert);
      //set the new vertex to visited in BINARYMAZE and openList
      try {
        BINARYMAZE[nextVert[0]][nextVert[1]] = 0

        openList.push(nextVert);
      }
      catch(err) {
      }
    }
  };
  return BINARYMAZE;
};

// This function is called once the page has finished loading
window.onload = function(){
  // set up the drawing context and perform any one time tasks here
  //this function is called when the button is clicked
  document.getElementById('drawButton').onclick = function(){
    // get the size from the user
    var size = parseInt(document.getElementById('size').value);
    var red = parseInt(document.getElementById('red').value);//.toFixed(1);
    var green = parseInt(document.getElementById('green').value);//.toFixed(1);
    var blue = parseInt(document.getElementById('blue').value);//.toFixed(1);

    // force the size to be odd, and add two to create the boundaries
    size = size % 2 === 0 ? size + 3 : size + 2;

    var pointSize = ((2.0 / size) / 2.0) * 500.0;
    var startOffset = (2.0 / size) / 2.0;

    pointSize = pointSize.toFixed(2);

    var vertexShader = "attribute vec4 a_Position;"+
    "void main(){"+
      "gl_Position =  a_Position;"+
      "gl_PointSize = " + pointSize + ";"+
    "}";

    var fragmentShader = "precision mediump float;"+
    "uniform vec4 u_Color;" +
    "void main(){"+
      "gl_FragColor = u_Color;"+
    "}";

    var maze = buildMaze(size);

    // code to test the result of maze generation -- assumes a 2D array of
    // 1s and 0s
    var s = "";
    for (var j = 0; j < size; j++){
      for  (var i = 0; i < size; i++){
        s = s + (maze[i][j] === 0 ? '#' : '.');
      }
      s = s + '\n';
    }

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

    var u_Color = gl.getUniformLocation(program, "u_Color");

    // create the points
    var dataTemp = [];

    for (var i = 0; i < maze.length; i++) {
      for (var j = 0; j < maze.length; j++) {
        if (maze[i][j] == 1) {
          dataTemp.push([-1 + startOffset + (j*(2/size)), 1 - startOffset - (i * (2/size))]);
        }
      }
    }

    var data = new Float32Array(dataTemp.length * 2);

    var count = 0;
    for (var i = 0; i < dataTemp.length; i++) {
      data[i + count] = dataTemp[i][0];
      data[i + 1 + count] = dataTemp[i][1];
      count++;
    }

    // make a buffer a push the points into it
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    // set the background or clear color
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    gl.uniform4f(u_Color, red, green, blue, 1.0);

    // clear the context for new content
    gl.clear(gl.COLOR_BUFFER_BIT);

    // set the position
    //gl.vertexAttrib2f(a_Position,0.0, 0.5);

    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);


    // tell the GPU to draw the point
    gl.drawArrays(gl.POINTS, 0, dataTemp.length);
  };
};
