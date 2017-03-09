/*
Dungeon Crawler

Features added:
-bump maps for walls and floor/ceiling
-added entrance an exit to the maze denoted by doors

*/

let smoothShaders = {
  vertexShader : `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord;
  attribute vec3 a_Normal;
  attribute float a_Type;
  attribute vec3 a_Tangent;

  uniform mat4 u_Model;
  uniform mat4 u_View;
  uniform mat4 u_Projection;
  uniform vec3 u_LightPosition;
  uniform vec3 u_LightDirection;

  varying vec2 v_TexCoord;
  varying float v_Type;
  varying vec3 v_Position;
  varying vec3 v_LightPosition;
  varying vec3 v_Normal;
  varying vec3 v_LightDirection;
  varying vec3 v_Binormal;
	varying vec3 v_Tangent;

  void main(){
    gl_PointSize = 10.0;
    if (a_Type == 3.0) {
      gl_Position = a_Position;
    }
    else {
      gl_Position = u_Projection * u_View * u_Model * a_Position;
    }

    v_Position = (u_View * u_Model * a_Position).xyz;
    v_Normal = mat3(u_View * u_Model) * a_Normal;

    v_Type = a_Type;
    v_TexCoord = a_TexCoord;
    v_LightDirection = u_LightDirection;
    v_LightPosition = u_LightPosition;
    v_Tangent = mat3(u_View * u_Model) * a_Tangent;
		v_Binormal = cross(v_Normal, v_Tangent);

  }`,

  fragmentShader : `
  precision mediump float;

  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  uniform sampler2D u_NormalSampler1;
  uniform sampler2D u_NormalSampler2;

  uniform vec3 u_Ambient;
  uniform vec3 u_Diffuse;
  uniform vec3 u_Specular;
  uniform float u_Shininess;

  varying vec3 v_Position;
  varying vec3 v_Normal;
  varying vec2 v_TexCoord;
  varying float v_Type;
  varying vec3 v_LightDirection;
  varying vec3 v_LightPosition;
  varying vec3 v_Binormal;
	varying vec3 v_Tangent;

  vec3 L, N, V, H, P, L2, T, B;
  float D;
  vec3 ambient1, diffuse1, ambient2, diffuse2, specular1, specular2;

  float shininess;
  vec4 luminance1, luminance2;

  float angle;


  void main(){
    P = v_Position;
    N = normalize(v_Normal);
    L = v_LightPosition - P;
    V = normalize(-P);
    H = normalize(L+V);
    T = normalize(v_Tangent);
		B = normalize(v_Binormal);

    L = normalize(vec3(max(dot(L, v_Tangent), 0.0), max(dot(L, v_Binormal), 0.0), max(dot(L, v_Normal),0.0 )));

    vec3 bump1 = 2.0*vec3(texture2D(u_NormalSampler1, v_TexCoord))-1.0;
		vec3 color1 = texture2D(u_Sampler1, v_TexCoord).rgb;

    vec3 bump2 = 2.0*vec3(texture2D(u_NormalSampler2, v_TexCoord))-1.0;
    vec3 color2 = texture2D(u_Sampler2, v_TexCoord).rgb;

    L2 = v_LightPosition - P;
    D = sqrt(pow(L2.x, 2.0) + pow(L2.y, 2.0) + pow(L2.z, 2.0));

    L2 = normalize(L2);

    angle = acos(max(dot(-L2, normalize(v_LightDirection)), 0.0));

    shininess = u_Shininess;
    specular1 = u_Specular;
    specular2 = u_Specular - vec3(0.1, 0.1, 0.1);

    ambient1 = color1 * u_Ambient;
    diffuse1 = color1 * max(dot(L, bump1), 0.0)* u_Diffuse;// * 1.0/(1.0 + 1.0 * D * 0.01 * pow(D, 2.0));
    luminance1 = vec4(ambient1 + diffuse1 + specular1, 1.0);

    ambient2 = color2 * u_Ambient;
    diffuse2 = color2 * max(dot(L, N), 0.0) * u_Diffuse;// * 1.0/(1.0 + 1.0 * D * 0.01 * pow(D, 2.0));
    luminance2 = vec4(ambient2 + diffuse2 + specular2, 1.0);

    if (v_Type == 0.0) {
      //if (angle < 0.17) {
        gl_FragColor = texture2D(u_Sampler1, v_TexCoord) * luminance1 / vec4(1.0/0.01 * pow(angle, 2.0), 1.0/0.01 * pow(angle, 2.0), 1.0/0.01 * pow(angle, 2.0), 1.0);
      //}
      //else {
        //gl_FragColor = texture2D(u_Sampler1, v_TexCoord) * vec4(0.4 - max(2.0*angle - 0.17, 0.0), 0.4 - max(2.0*angle - 0.17, 0.0), 0.4 - max(2.0*angle - 0.17, 0.0), 1.0);
    //}
  }
    if (v_Type == 1.0) {
      //if (angle < 0.17) {
        gl_FragColor = texture2D(u_Sampler2, v_TexCoord) * luminance2 / vec4(1.0/0.01 * pow(angle, 2.0), 1.0/0.01 * pow(angle, 2.0), 1.0/0.01 * pow(angle, 2.0), 1.0);
      //}
      //else {
        //gl_FragColor = texture2D(u_Sampler2, v_TexCoord) * vec4(0.3 - max(1.5*angle - 0.17, 0.0), 0.3 - max(1.5*angle - 0.17, 0.0), 0.3 - max(1.5*angle - 0.17, 0.0), 1.0);
      //}
    }
    if (v_Type == 2.0) {
      gl_FragColor = texture2D(u_Sampler3, v_TexCoord) * luminance1 / vec4(1.0/0.01 * pow(angle, 2.0), 1.0/0.01 * pow(angle, 2.0), 1.0/0.01 * pow(angle, 2.0), 1.0);
    }
  }`,



  attributes: ['a_Position', 'a_TexCoord', 'a_Normal', 'a_Type'],
  uniforms: ['u_Model', 'u_View', 'u_Projection', 'u_Sampler1', 'u_Sampler2',
  'u_LightPosition', 'u_LightDirection', 'u_Ambient', 'u_Diffuse', 'u_Specular', 'u_Shininess',
  'u_NormalSampler1', 'u_NormalSampler2', 'u_Sampler3']
}


//initialize the given texture
function initializeTexture(gl, textureid, filename) {
  return new Promise(function(resolve, reject){
    var texture = gl.createTexture();

    var image = new Image();
    image.onload = function(){

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.activeTexture(textureid);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        resolve();
    }


    image.onerror = function(error){

        reject(Error(filename));
    }

    image.src = filename;
  });
}

//add walls function for building the maze
var addWalls = function(walls, maze,  i, j, size){
  if (i - 1 > 0 && maze[i-1][j] !== 1){
    walls.push([i-1, j]);
  }
  if (i + 1  < size - 1 && maze[i+1][j] !== 1){
    walls.push([i+1, j]);
  }

  if (j - 1 > 0 && maze[i][j-1] !== 1){
    walls.push([i, j-1]);
  }
  if (j + 1  < size - 1 && maze[i][j+1] !== 1){
    walls.push([i, j+1]);
  }

}

//builds the maze
var buildMaze = function(size){
  maze = new Array(size);

  // build the empty maze grid
  for  (var i = 0; i < size; i++){
    maze[i] = new Array(size);
    for (var j = 0; j < size; j++){
      maze[i][j] =  0;
    }
  }

  // initalize the walls list
  var walls = [];

  // pick a random start cell
  // it has to be a cell that has both odd indicies
  var i = Math.floor((Math.random() * (size - 1))/2) * 2 + 1;
  var j = Math.floor((Math.random() * (size - 1))/2) * 2 + 1;
  maze[i][j] = 1;

  // add the walls surrounding the cell to the frontier list
  addWalls(walls, maze, i, j, size);

  // while there are walls in the frontier list
  // pick one
  // if one side of the wall hasn't been visited, open up the wall and the cell on the far side
  // if we opened a new cell, add its walls to the frontier list
  while (walls.length > 0){
    // pick a wall
    var index = Math.floor(Math.random() * walls.length);
    var wall = walls[index];
    walls.splice(index, 1);

    // check if only one side is open
    // we can use the fact that the walls and cells alternate to tell which
    // direction the wall connects
    // for a given wall, there are four possibilities of which way we might burst through
    if (wall[0] % 2  === 1){ // vertical wall
      if (maze[wall[0]][wall[1] + 1]  === 0){
        maze[wall[0]][wall[1]] = 1; // open the wall
        maze[wall[0]][wall[1] + 1] = 1; // open the cell on the far side
        addWalls(walls, maze, wall[0], wall[1] + 1, size); // add the cell's walls
      }else if (maze[wall[0]][wall[1] - 1]  === 0){
        maze[wall[0]][wall[1]] = 1; // open the wall
        maze[wall[0]][wall[1] - 1] = 1; // open the cell on the far side
        addWalls(walls, maze, wall[0], wall[1] - 1, size); // add the cell's walls
      }
    }else{ // horizontal wall
      if (maze[wall[0] + 1][wall[1]]  === 0){
        maze[wall[0]][wall[1]] = 1; // open the wall
        maze[wall[0]+1][wall[1]] = 1; // open the cell on the far side
        addWalls(walls, maze, wall[0] + 1, wall[1], size); // add the cell's walls
      }else if (maze[wall[0] - 1][wall[1]]  === 0){
        maze[wall[0]][wall[1]] = 1; // open the wall
        maze[wall[0] - 1][wall[1]] = 1; // open the cell on the far side
        addWalls(walls, maze, wall[0] - 1, wall[1], size); // add the cell's walls
      }
    }
  }

  return maze;
}

//creates a 1x1 floor in given position
var createFloor = function(gl, x, y, z) {
  var floor = {
    vertices: new Float32Array([
      x+0.0, y+0.0, z+0.0,
      x+0.0, y+0.0, z+1.0,
      x+1.0, y+0.0, z+0.0,
      x+1.0, y+0.0, z+1.0
    ]),
    normals: new Float32Array([
      0.0, 1.0, 0.0,
      0.0, 1.0, 0.0,
      0.0, 1.0, 0.0,
      0.0, 1.0, 0.0
    ]),
    textureCoordinates: new Float32Array([
      1.0, 1.0,  0.0, 1.0, 0.0, 0.0, 1.0, 0.0
    ]),
    tangents: new Float32Array([
      0.0, 0.0,  1.0,  0.0, 0.0,  1.0,  0.0, 0.0,  1.0,  0.0, 0.0,  1.0
    ]),
    indices: new Uint8Array([
      0, 1, 2, 3
    ]),
    type: new Float32Array([1, 1, 1, 1])
  }

  floor.typeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, floor.typeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, floor.type, gl.STATIC_DRAW);

  floor.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, floor.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, floor.vertices, gl.STATIC_DRAW);

  floor.normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, floor.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, floor.normals, gl.STATIC_DRAW);

  floor.textureBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, floor.textureBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, floor.textureCoordinates, gl.STATIC_DRAW);

  floor.tangentBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, floor.tangentBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, floor.tangents, gl.STATIC_DRAW);

  floor.indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, floor.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, floor.indices, gl.STATIC_DRAW);

  return function(program) {
    gl.bindBuffer(gl.ARRAY_BUFFER, floor.typeBuffer);
    gl.vertexAttribPointer(program.a_Type, 1, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, floor.vertexBuffer);
    gl.vertexAttribPointer(program.a_Position, 3, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, floor.textureBuffer);
    gl.vertexAttribPointer(program.a_TexCoord, 2, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, floor.normalBuffer);
    gl.vertexAttribPointer(program.a_Normal, 3, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, floor.tangentBuffer);
    gl.vertexAttribPointer(program.a_Tangent, 3, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, floor.indexBuffer);
    gl.drawElements(gl.TRIANGLE_STRIP, floor.indices.length, gl.UNSIGNED_BYTE, 0);
  }
}

//creates a wall in given position
var createWall = function(gl, x, z){
  var cube = {
      vertices: new Float32Array([
          x+1.0, 1.0, z+1.0,
          x+0.0, 1.0, z+1.0,
          x+0.0, 0.0, z+1.0,
          x+1.0, 0.0, z+1.0, // front face

          x+1.0, 1.0, z+1.0,
          x+1.0, 0.0, z+1.0,
          x+1.0, 0.0, z+0.0,
          x+1.0, 1.0, z+0.0, // right face

          x+1.0, 1.0, z+0.0,
          x+1.0, 0.0, z+0.0,
          x+0.0, 0.0, z+0.0,
          x+0.0, 1.0, z+0.0, // back face

          x+0.0, 1.0, z+0.0,
          x+0.0, 0.0, z+0.0,
          x+0.0, 0.0, z+1.0,
          x+0.0, 1.0, z+1.0 // left face
        ]),

      normals : new Float32Array([
        0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0, // front face
        1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0, // right face
        0.0, 0.0,-1.0,  0.0, 0.0,-1.0,  0.0, 0.0,-1.0,  0.0, 0.0,-1.0, // back face
       -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0 // left face
        // 0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0, // top face
        // 0.0,-1.0, 0.0,  0.0,-1.0, 0.0,  0.0,-1.0, 0.0,  0.0,-1.0, 0.0, // bottom face
      ]),

      textureCoordinates : new Float32Array([
       1.0, 1.0,  0.0, 1.0, 0.0, 0.0, 1.0, 0.0, // front face
       1.0, 1.0,  1.0, 0.0, 0.0, 0.0, 0.0, 1.0, // right face
       1.0, 1.0,  1.0, 0.0, 0.0, 0.0, 0.0, 1.0, // back face
       1.0, 1.0,  1.0, 0.0, 0.0, 0.0, 0.0, 1.0 // left face
      //  1.0, 1.0,  0.0, 1.0, 0.0, 0.0, 1.0, 0.0, // top face
      //  1.0, 1.0,  0.0, 1.0, 0.0, 0.0, 1.0, 0.0 // bottom face
     ]),
     tangents: new Float32Array([
       1.0, 0.0,  0.0,  1.0, 0.0,  0.0,  1.0, 0.0,  0.0,  1.0, 0.0,  0.0, // front face
       0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0, // right face
      -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, // back face
       0.0, 0.0,  1.0,  0.0, 0.0,  1.0,  0.0, 0.0,  1.0,  0.0, 0.0,  1.0 // left face
      //  0.0, 0.0,  1.0,  0.0, 0.0,  1.0,  0.0, 0.0,  1.0,  0.0, 0.0,  1.0, // top face
      //  0.0, 0.0,  1.0,  0.0, 0.0,  1.0,  0.0, 0.0,  1.0,  0.0, 0.0,  1.0, // bottom face
    ]),
    indices : new Uint8Array([
     0,1,2,  0,2,3, // front face
     4,5,6,  4,6,7,   // right face
     8,9,10, 8,10,11, // back face
     12,13,14,  12,14,15 // left face
    //  16,17,18, 16,18,19, // top face
    //  20,21,22, 20,22,23 // bottom face
   ]),
     type: new Float32Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])//,0,0,0,0,0,0,0,0])
    };

  cube.typeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cube.typeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cube.type, gl.STATIC_DRAW);

  cube.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cube.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cube.vertices, gl.STATIC_DRAW);

  cube.normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cube.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cube.normals, gl.STATIC_DRAW);

  cube.textureBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cube.textureBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cube.textureCoordinates, gl.STATIC_DRAW);

  cube.tangentBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cube.tangentBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cube.tangents, gl.STATIC_DRAW);

  cube.indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube.indices, gl.STATIC_DRAW);


  return function(program){
    gl.bindBuffer(gl.ARRAY_BUFFER, cube.typeBuffer);
    gl.vertexAttribPointer(program.a_Type, 1, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cube.vertexBuffer);
    gl.vertexAttribPointer(program.a_Position, 3, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cube.textureBuffer);
    gl.vertexAttribPointer(program.a_TexCoord, 2, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cube.normalBuffer);
    gl.vertexAttribPointer(program.a_Normal, 3, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cube.tangentBuffer);
    gl.vertexAttribPointer(program.a_Tangent, 3, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.indexBuffer);
    gl.drawElements(gl.TRIANGLES, cube.indices.length, gl.UNSIGNED_BYTE, 0);

  };
};

//creates a door in given position
var createDoor = function(gl, x, z) {
  var door = {
      vertices: new Float32Array([
          x+1.0, 1.0, z+1.0,
          x+1.0, 0.0, z+1.0,
          x+1.0, 0.0, z+0.0,
          x+1.0, 1.0, z+0.0, // front face
        ]),
      normals : new Float32Array([
        1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0 // front face
        ]),
      textureCoordinates : new Float32Array([
       1.0, 1.0,  1.0, 0.0, 0.0, 0.0, 0.0, 1.0, // front face
        ]),
      tangents: new Float32Array([
        0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0 // front face
        ]),
      indices : new Uint8Array([
        0,1,2,  0,2,3, // front face
        ]),
      type: new Float32Array([2,2,2,2])
    };

  door.typeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, door.typeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, door.type, gl.STATIC_DRAW);

  door.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, door.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, door.vertices, gl.STATIC_DRAW);

  door.normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, door.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, door.normals, gl.STATIC_DRAW);

  door.textureBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, door.textureBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, door.textureCoordinates, gl.STATIC_DRAW);

  door.indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, door.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, door.indices, gl.STATIC_DRAW);


  return function(program){
    gl.bindBuffer(gl.ARRAY_BUFFER, door.typeBuffer);
    gl.vertexAttribPointer(program.a_Type, 1, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, door.vertexBuffer);
    gl.vertexAttribPointer(program.a_Position, 3, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, door.textureBuffer);
    gl.vertexAttribPointer(program.a_TexCoord, 2, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, door.normalBuffer);
    gl.vertexAttribPointer(program.a_Normal, 3, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, door.indexBuffer);
    gl.drawElements(gl.TRIANGLES, door.indices.length, gl.UNSIGNED_BYTE, 0);

  };
}

//returns a list of where all the walls and ceilings should be to enclose the start and end of the maze
var createStartEndWalls = function(gl, doorX, doorY) {
  let drawStartWall1 = createWall(gl, -1, 0);
  let drawStartWall2 = createWall(gl, -3, 1);
  let drawStartWall3 = createWall(gl, -1, 2);
  let drawStartWall4 = createWall(gl, -2, 0);
  let drawStartWall5 = createWall(gl, -2, 2);

  let drawStartFloor1 = createFloor(gl, -1, 0, 1);
  let drawStartCeiling1 = createFloor(gl, -1, 1, 1);
  let drawStartFloor2 = createFloor(gl, -2, 0, 1);
  let drawStartCeiling2 = createFloor(gl, -2, 1, 1);

  let drawEndWall1 = createWall(gl, doorX, doorY);
  let drawEndWall3 = createWall(gl, doorX, doorY+2);
  let drawEndWall4 = createWall(gl, doorX+1, doorY);
  let drawEndWall5 = createWall(gl, doorX+1, doorY+2);

  let drawEndFloor1 = createFloor(gl, doorX, 0, doorY+1);
  let drawEndCeiling1 = createFloor(gl, doorX, 1, doorY+1);
  let drawEndFloor2 = createFloor(gl, doorX+1, 0, doorY+1);
  let drawEndCeiling2 = createFloor(gl, doorX+1, 1, doorY+1);

  return [drawStartWall1,
          drawStartWall2,
          drawStartWall3,
          drawStartWall4,
          drawStartWall5,

          drawStartFloor1,
          drawStartCeiling1,
          drawStartFloor2,
          drawStartCeiling2,

          drawEndWall1,
          drawEndWall3,
          drawEndWall4,
          drawEndWall5,

          drawEndFloor1,
          drawEndCeiling1,
          drawEndFloor2,
          drawEndCeiling2]
}

/**
  This function handles the details of initializing a shader from our shader objects.
  It iterates over all of the attributes and uniforms and saves their locations.
**/
let makeProgram = function(gl, shaders){
  let program = middUtils.initializeProgram(gl, shaders.vertexShader, shaders.fragmentShader);

  shaders.attributes.forEach((attribute)=>{
    let attribLocation = gl.getAttribLocation(program, attribute);
    if (attribLocation < 0) {
        console.warn(attribute + " does not exist in current program");
    }else{
      program[attribute] = attribLocation;

    }
  });

  program.attributes = shaders.attributes;

  shaders.uniforms.forEach((uniform)=>{
    let uniformLocation = gl.getUniformLocation(program, uniform);
    if (uniformLocation < 0) {
        console.warn(uniform + " does not exist in current program");
    }else{
      program[uniform] = uniformLocation;
    }
  });

  return program;
};


/**
  This function switches to the passed in shader, making it the active program.

  The current program is stored in gl.program.
**/
let enableProgram = function(gl, program){
  // if there was a different active program, turn off its attributes
  // need this f the new program has fewer/different attributes
  if (gl.program && gl.program !== program){
    gl.program.attributes.forEach((attribute)=>{
      gl.disableVertexAttribArray(program[attribute]);
    });
  }

  gl.useProgram(program);

  // load the various stable uniforms
  gl.uniformMatrix4fv(program.u_View, false, gl.viewMatrix);
  gl.uniformMatrix4fv(program.u_Projection, false, gl.projectionMatrix);
  gl.uniform1i(program.u_Sampler1, 0);
  gl.uniform1i(program.u_Sampler2, 1);
  gl.uniform1i(program.u_NormalSampler1, 2);
  gl.uniform1i(program.u_NormalSampler2, 3);
  gl.uniform1i(program.u_Sampler3, 4);

  let ambient = vec3.fromValues(0.2, 0.2, 0.2);
  let u_Ambient = gl.getUniformLocation(program, 'u_Ambient');
  gl.uniform3f(program.u_Ambient, ambient[0], ambient[1], ambient[2]);

  let diffuse = vec3.fromValues(0.4, 0.4, 0.4);
  let u_Diffuse = gl.getUniformLocation(program, 'u_Diffuse');
  gl.uniform3f(program.u_Diffuse, diffuse[0], diffuse[1], diffuse[2]);

  let specular = vec3.fromValues(0.2, 0.2, 0.2);
  let u_Specular = gl.getUniformLocation(program, 'u_Specular');
  gl.uniform3f(program.u_Specular, specular[0], specular[1], specular[2]);


  // enable the relevant attributes
  program.attributes.forEach((attribute)=>{
    gl.enableVertexAttribArray(program[attribute]);
  });


  gl.program = program;

}

window.onload = function(){
  let canvas = document.getElementById('canvas');
  let gl;
  // catch the error from creating the context since this has nothing to do with the code
  try{
    gl = middUtils.initializeGL(canvas);
  } catch (e){
    alert('Could not create WebGL context');
    return;
  }

  //create the program
  let flatProgram = makeProgram(gl, smoothShaders);

  //camera object
  var camera = {
    eye: vec3.fromValues(-1.0,0.6,1.5),
    at: vec3.fromValues(8,0,1.5),
    up: vec3.fromValues(0.0, 1.0, 0.0),
    speed: 50,

    turnRight: function() {
      vec3.rotateY(this.at, this.at, this.eye, -8/180);
    },
    turnLeft: function() {
      vec3.rotateY(this.at, this.at, this.eye, 8/180);
    },
    forward: function() {
      eyeX = this.eye[0];
      eyeZ = this.eye[2];
      atX = this.at[0];
      atZ = this.at[2];
      this.eye = vec3.fromValues((atX-eyeX)/this.speed+eyeX, this.eye[1], (atZ-eyeZ)/this.speed+eyeZ);
      this.at = vec3.fromValues((atX-eyeX)/this.speed+atX, this.at[1], (atZ-eyeZ)/this.speed+atZ);
    },
    backward: function() {
      eyeX = this.eye[0];
      eyeZ = this.eye[2];
      atX = this.at[0];
      atZ = this.at[2];
      this.eye = vec3.fromValues(eyeX - (atX-eyeX)/this.speed, this.eye[1], eyeZ - (atZ-eyeZ)/this.speed);
      this.at = vec3.fromValues(atX - (atX-eyeX)/this.speed, this.at[1], atZ - (atZ-eyeZ)/this.speed);
      },
    upward: function() {
      eyeY = this.eye[1];
      atY = this.at[1];
      this.eye = vec3.fromValues(this.eye[0], eyeY + 1/this.speed * 4, this.eye[2]);
      this.at = vec3.fromValues(this.at[0], atY + 1/this.speed * 4, this.at[2]);
    },
    downward: function() {
      eyeY = this.eye[1];
      atY = this.at[1];
      this.eye = vec3.fromValues(this.eye[0], eyeY - 1/this.speed * 4, this.eye[2]);
      this.at = vec3.fromValues(this.at[0], atY - 1/this.speed * 4, this.at[2]);
    },
    up1: function() {
      atY = this.at[1];
      this.at = vec3.fromValues(this.at[0], atY + 0.1, this.at[2]);
    },
    down: function() {
      atY = this.at[1];
      this.at = vec3.fromValues(this.at[0], atY - 0.1, this.at[2]);
    },
    sprint: function() {
      this.speed = 10;
    },
    notSprint: function() {
      this.speed = 100;
    },
    apply: function() {
          let view = mat4.create();
          mat4.lookAt(view, this.eye, this.at, this.up);
          gl.viewMatrix = view;
          flatProgram.u_View = gl.getUniformLocation(flatProgram, 'u_View');
          gl.uniformMatrix4fv(flatProgram.u_View, false, view);

          flatProgram.u_LightPosition = gl.getUniformLocation(flatProgram, 'u_LightPosition');
          gl.uniform3f(flatProgram.u_LightPosition, 0, 0.05, 0);

          flatProgram.u_LightDirection = gl.getUniformLocation(flatProgram, 'u_LightDirection');
          gl.uniform3f(flatProgram.u_LightDirection, 0.0,-0.05,-1.0);
        }
    };

  camera.apply();

  let projection = mat4.create();
  mat4.perspective(projection, Math.PI/6, canvas.width / canvas.height, 0.05, 50.0);
  gl.projectionMatrix = projection;

  enableProgram(gl, flatProgram);

  let transform = mat4.create();
  gl.uniformMatrix4fv(gl.program.u_Model, false, transform);

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0,0,0,1);


  //initialize the maze
  let size = 11;
  let maze = buildMaze(size);

  //create the start door
  let drawDoor1 = createDoor(gl, -1, 1);

  //randomly pick an exit door
  doorX = size;
  doorZ = Math.round(Math.random() * (size-2)) + 1;

  if (maze[doorX-2][doorZ-1] == 0) {
    if (doorZ == size) {
      doorZ -= 1;
    }
    else {
      doorZ += 1;
    }
  }

  let drawDoor2 = createDoor(gl, doorX-1, doorZ-1);

  let extraWalls = createStartEndWalls(gl, doorX, doorZ-2);

  //create all the walls
  drawWallsArray = []
  for (i=0; i < size; i++) {
      temp = new Array(size);
      drawWallsArray[i] = temp;
  }

  for (i = 0; i < size; i++) {
    for (j = 0; j < size; j++) {
      if (i == 0 & j == 1) {
        drawWallsArray[i][j] = 0;
      }
      else if (i == doorX -1 & j == doorZ-1) {
        drawWallsArray[i][j] = 0;
      }
      else if (maze[i][j] == 0) {
        drawWallsArray[i][j] = createWall(gl, i, j);
      }
      else {
        drawWallsArray[i][j] = 0;
      }
    }
  }

  //create all the floors
  drawFloorArray = []
  for (i=0; i < size; i++) {
      temp = new Array(size);
      drawFloorArray[i] = temp;
  }

  for (i = 0; i < size; i++) {
    for (j = 0; j < size; j++) {
      if (i == 0 & j == 1) {
        drawFloorArray[i][j] = createFloor(gl, i, 0, j);
      }
      else if (i == doorX -1 & j == doorZ-1) {
        drawFloorArray[i][j] = createFloor(gl, i, 0, j);
      }
      else if (maze[i][j] == 1) {
        drawFloorArray[i][j] = createFloor(gl, i, 0, j);
      }
      else {
        drawFloorArray[i][j] = 0;
      }
    }
  }

  //create all the ceilings
  drawCeilingArray = [];
  for (i=0; i < size; i++) {
      temp = new Array(size);
      drawCeilingArray[i] = temp;
  }

  for (i = 0; i < size; i++) {
    for (j = 0; j < size; j++) {
      if (i == 0 & j == 1) {
        drawCeilingArray[i][j] = createFloor(gl, i, 1, j);
      }
      else if (i == doorX -1 & j == doorZ-1) {
        drawCeilingArray[i][j] = createFloor(gl, i, 1, j);
      }
      else if (maze[i][j] == 1) {
        drawCeilingArray[i][j] = createFloor(gl, i, 1, j);
      }
      else {
        drawCeilingArray[i][j] = 0;
      }
    }
  }



  var keyMap = {};

  window.onkeydown = function(e){
      keyMap[e.which] = true;
  }

  window.onkeyup = function(e){
       keyMap[e.which] = false;
  }

  /************* Main render function **************/

  let render = function() {


    // check which keys that we care about are down
    if  (keyMap['W'.charCodeAt(0)]){
        camera.forward();

    }else if (keyMap['S'.charCodeAt(0)]){
        camera.backward();
    }

    if  (keyMap[37]){
        camera.turnLeft();

    }else if (keyMap[39]){
        camera.turnRight();
    }

    if (keyMap[' '.charCodeAt(0)]){
      camera.upward();
    }
    else if (keyMap[16]){
      camera.downward();
    }

    if (keyMap[38]){
      camera.up1();
    }
    else if (keyMap[40]){
      camera.down();
    }

    if(keyMap[13]) {
      camera.sprint();
    }
    else {
      camera.notSprint();
    }

    // clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    camera.apply();

    //draw all walls
    for (i = 0; i < size; i++) {
      for (j = 0; j < size; j++) {
        if (drawWallsArray[i][j] != 0) {
          drawWallsArray[i][j](gl.program);
        }
      }
    }

    //draw all floors
    for (i = 0; i < size; i++) {
      for (j = 0; j < size; j++) {
        if (drawFloorArray[i][j] != 0) {
          drawFloorArray[i][j](gl.program);
        }
      }
    }

    //draw all ceilings
    for (i = 0; i < size; i++) {
      for (j = 0; j < size; j++) {
        if (drawCeilingArray[i][j] != 0) {
          drawCeilingArray[i][j](gl.program);
        }
      }
    }

    //draw all extra walls
    for (i = 0; i < extraWalls.length; i++) {
      extraWalls[i](gl.program);
    }

    //draw doors
    drawDoor1(gl.program);
    drawDoor2(gl.program);

    requestAnimationFrame(render);
  };


  /********** Load the texture ***************/
  Promise.all([
    initializeTexture(gl, gl.TEXTURE0, 'wall.png'),
    initializeTexture(gl, gl.TEXTURE1,'floor.jpg'),
    initializeTexture(gl, gl.TEXTURE2, 'wall_normal.png'),
    initializeTexture(gl, gl.TEXTURE3, 'floor_normal.jpg'),
    initializeTexture(gl, gl.TEXTURE4, 'door.png')
  ])
    .then(function () {render();})
    .catch(function (error) {alert('Failed to load texture '+  error.message);});


};
