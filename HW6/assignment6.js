/*
ADDED FEATURES:

-Water line
-Flying camera
    -wasd to move around
    -space = up, shift = down
    -holding down enter increases speed
*/

var smoothVertexShader = `
attribute vec4 a_Position;
attribute vec3 a_Normal;
//attribute vec3 a_Random;

uniform mat4 u_Projection;
uniform mat4 u_View;
uniform mat4 u_Transform;

varying vec3 v_Position;
varying vec3 v_Normal;
//varying vec3 v_Random;

varying vec3 v_LightPosition;
varying float v_Height;

void main(){
  gl_PointSize = 10.0;
  gl_Position = u_Projection* u_View * u_Transform * a_Position;

  v_LightPosition = (u_View * u_Transform * vec4(0.0, 1.0, 5.0, 1.0)).xyz;

  v_Position = (u_View * u_Transform * a_Position).xyz;
  v_Normal = mat3(u_View * u_Transform) * a_Normal;
  //v_Random = a_Random;

  v_Height = a_Position.y;
}`;

var fragmentShader = `
precision mediump float;

uniform vec3 u_Ambient;
uniform vec3 u_Diffuse;
uniform vec3 u_Specular;
uniform vec3 u_Color;
uniform float u_Shininess;
uniform vec3 u_LightDirection;

varying vec3 v_Position;
varying vec3 v_Normal;
//varying vec3 v_Random;

varying float v_Height;

vec3 L, N, V, H, P;
vec3 ambient, diffuse, specular;

void main(){
  P = v_Position;
  N = normalize(v_Normal);
  L = normalize(u_LightDirection);
  V = normalize(-P);
  H = normalize(L+V);

  if (v_Height < 0.5) {
    vec3 color = vec3(0.109, 0.418, 0.625);

    //color = color * v_Random;

    ambient = color * u_Ambient;
    diffuse = color * max(dot(L, N), 0.0)* u_Diffuse;
    specular = max(color * pow(max(dot(N, H), 0.0), u_Shininess) * u_Specular, 0.0);

    gl_FragColor = vec4(ambient + diffuse , 1.0);
  }

  else {
    ambient = u_Color * u_Ambient;
    diffuse = u_Color * max(dot(L, N), 0.0)* u_Diffuse;
    specular = max(u_Color * pow(max(dot(N, H), 0.0), u_Shininess) * u_Specular, 0.0);

    gl_FragColor = vec4(ambient + diffuse  , 1.0);
  }
}`;



//generate a heightfield initialized to 0's
var createHeightfield = function(n) {
  var heightfield = new Array(Math.pow(2, n) + 1);
  for (i = 0; i < heightfield.length; i++) {
    let temp = new Array(Math.pow(2, n) + 1);
    for (j = 0; j < temp.length; j++) {
      temp[j] = 0;
    }
    heightfield[i] = temp;
  }
  return heightfield;
}

//calculate the average of the given vertices for a square
var square = function(a, b, c, d) {
  x = (a[0] + b[0])/2
  y = (b[1] + c[1])/2
  return [x, y];
}


/*
calculate the average of the given vertices for a diamond

@return
  if vertices == 3:
    return [vertex1, vertex2, vertex3, x of midpoint, y of midpoint]

  if vertices == 4:
    return [vertex1, vertex2, vertex3, vertex4, x of midpoint, y of midpoint]
*/
var diamond = function(a, b, c, d, max) {
  if(a[0] > max || a[0] < 0 || a[1] > max || a[1] < 0) {//if's check if one of the verticies of the diamond is outside the grid
    y = (a[1] + b[1])/2;
    x = a[0];
    return[b, c, d, x, y]
  }
  else if (b[0] > max || b[0] < 0 || b[1] > max || b[1] < 0) {
    y = (a[1] + b[1])/2;
    x = a[0];
    return [a, c, d, x, y];
  }
  else if (c[0] > max || c[0] < 0 || c[1] > max || c[1] < 0) {
    y = (a[1] + b[1])/2;
    x = a[0];
    return [a, b, d, x, y];
  }
  else if (d[0] > max || d[0] < 0 || d[1] > max || d[1] < 0) {
    y = (a[1] + b[1])/2;
    x = a[0];
    return [a, b, c, x, y];
  }
  else {//if all 4 vertices are in the grid
    y = (a[1] + b[1])/2;
    x = a[0];
    return [a, b, c, d, x, y];
  }
}

//diamondSquare calculation
var diamondSquare = function(array, n) {
  let roughness = 0.3;
  let size = Math.pow(2, n)
  let max = Math.pow(2, n);
  let r = roughness * size;

  //initialize four corners
  array[0][0] = 1.0;
  array[size][0] = 1.0;
  array[0][size] = 1.0;
  array[size][size] = 1.0;


  //preform the first square step manually
  array[size/2][size/2] = (array[0][0] + array[size][0] + array[0][size] + array[size][size])/4 + Math.random()*2*r - r;//add random

  //preform the first diamond step manually
  array[0][size/2] = (array[0][0] + array[0][size] + array[size/2][size/2])/3+ Math.random()*2*r - r;//add random
  array[size/2][0] = (array[0][0] + array[size][0] + array[size/2][size/2])/3+ Math.random()*2*r - r;//add random
  array[size][size/2] = (array[size][0] + array[size][size] + array[size/2][size/2])/3+ Math.random()*2*r - r;//add random
  array[size/2][size] = (array[0][size] + array[size][size] + array[size/2][size/2])/3+ Math.random()*2*r - r;//add random


  size = size/2;

  let step = 1;
  let count = 1;
  while(size > 1) {
    r = roughness * size;

    //SQUARE LOOPS
    for (i = 0; i < step+1; i++) {
      for (j = 0; j < step+1; j++) {

        let squareMidpoint = square([0 + i*size, 0 +j*size],
                                    [size + i*size, 0 +j*size],
                                    [0 + i*size, size +j*size],
                                    [size + i*size, size +j*size]);

        let squareAverage = (array[0 + i*size][0 +j*size] + array[size + i*size][0 +j*size] +
                             array[0 + i*size][size +j*size] + array[size + i*size][size +j*size])/4 + Math.random()*2*r - r;

        array[squareMidpoint[0]][squareMidpoint[1]] = squareAverage;
      }
    }

    //DIAMOND LOOPS
    onetoomanydiamonds_count = 1;//to make sure there is not an extra diamond added at the end
    for (i = 0; i < Math.pow(2, step+1)+1; i++) {
      for (j = 0; j < step+1; j++) {

        //if vertex is even
        if (i % 2 == 0) {
          let diamondMidpoint = diamond([0 + i/2*size, 0 +j*size],
                                        [0 + i/2*size, size +j*size],
                                        [size/2 + i/2*size, size/2 +j*size],
                                        [size/2 + i/2*size - size, size/2 +j*size], max);

          if (diamondMidpoint.length == 5) {//if 3 vertices (ie one vertex is off the grid)
            average = (   array[diamondMidpoint[0][0]][diamondMidpoint[0][1]] +
                          array[diamondMidpoint[1][0]][diamondMidpoint[1][1]] +
                          array[diamondMidpoint[2][0]][diamondMidpoint[2][1]]
                        )/3 + Math.random()*2*r - r;

            array[diamondMidpoint[3]][diamondMidpoint[4]] = average;
          }
          else {//if 4 vertices
            average = (   array[diamondMidpoint[0][0]][diamondMidpoint[0][1]] +
                          array[diamondMidpoint[1][0]][diamondMidpoint[1][1]] +
                          array[diamondMidpoint[2][0]][diamondMidpoint[2][1]] +
                          array[diamondMidpoint[3][0]][diamondMidpoint[3][1]]
                        )/4 + Math.random()*2*r - r;

            array[diamondMidpoint[4]][diamondMidpoint[5]] = average;
          }

        }
        else {//if vertex is odd
          if ((0 + i/2*size) > max) {
            break;
          }

          let diamondMidpoint = diamond([0 + i/2*size, 0 +j*size -size/2],
                                        [0 + i/2*size, size +j*size -size/2],
                                        [size/2 + i/2*size, size/2 +j*size -size/2],
                                        [size/2 + i/2*size - size, size/2 +j*size -size/2], max);

          if (diamondMidpoint.length == 5) {//if 3 vertices (ie one vertex is off the grid)
            average = (   array[diamondMidpoint[0][0]][diamondMidpoint[0][1]] +
                          array[diamondMidpoint[1][0]][diamondMidpoint[1][1]] +
                          array[diamondMidpoint[2][0]][diamondMidpoint[2][1]]
                        )/3 + Math.random()*2*r - r;

            array[diamondMidpoint[3]][diamondMidpoint[4]] = average;
          }
          else {//if 4 vertices
            average = (   array[diamondMidpoint[0][0]][diamondMidpoint[0][1]] +
                          array[diamondMidpoint[1][0]][diamondMidpoint[1][1]] +
                          array[diamondMidpoint[2][0]][diamondMidpoint[2][1]] +
                          array[diamondMidpoint[3][0]][diamondMidpoint[3][1]]
                        )/4 + Math.random()*2*r - r;

            array[diamondMidpoint[4]][diamondMidpoint[5]] = average;
          }

        }
      }
      if (i%2 != 0) {
        if ((0 + i/2*size) > max) {
          break;
        }

        let diamondMidpoint = diamond([0 + i/2*size, 0 +j*size -size/2],
                                      [0 + i/2*size, size +j*size -size/2],
                                      [size/2 + i/2*size, size/2 +j*size -size/2],
                                      [size/2 + i/2*size - size, size/2 +j*size -size/2], max)

        if (diamondMidpoint.length == 5) {//if 3 vertices (ie one vertex is off the grid)
          average = (   array[diamondMidpoint[0][0]][diamondMidpoint[0][1]] +
                        array[diamondMidpoint[1][0]][diamondMidpoint[1][1]] +
                        array[diamondMidpoint[2][0]][diamondMidpoint[2][1]]
                      )/3 + Math.random()*2*r - r;

          array[diamondMidpoint[3]][diamondMidpoint[4]] = average;
        }
        else {//if 4 vertices
          average = (   array[diamondMidpoint[0][0]][diamondMidpoint[0][1]] +
                        array[diamondMidpoint[1][0]][diamondMidpoint[1][1]] +
                        array[diamondMidpoint[2][0]][diamondMidpoint[2][1]] +
                        array[diamondMidpoint[3][0]][diamondMidpoint[3][1]]
                      )/4 + Math.random()*2*r - r;

          array[diamondMidpoint[4]][diamondMidpoint[5]] = average;
        }
        onetoomanydiamonds_count++;
      }
    }
    size = size/2;
    step += Math.pow(2, count);
    count++;
  }
  return array;
}

//adds waterline to given heightfield
var addWaterLine = function(array, waterline, n) {
  for (i = 0; i < n-1; i++) {
    for (j = 0; j < n-1; j++) {
      if(array[i][j] <= waterline) {
        array[i][j] = waterline;
      }
    }
  }
  return array;
}

//flatten an array
var flatten = function(array) {
    var final = [];
    for(var i = 0; i < array.length; i++) {
        if(Array.isArray(array[i])) {
            final = final.concat(flatten(array[i]));
        } else {
            final.push(array[i]);
        }
    }
    return final;
}

//average all the normals in the given list
var averageNormal = function(list) {
  final = vec3.create();
  for (i=0;i<list.length-1;i++) {
    if(i==0) {
      vec3.add(final, list[i], list[i+1]);
    }
    else {
      vec3.add(final, final, list[i]);
    }
  }
  vec3.scale(final, final, 1/list.length);
  return [final[0], final[1], final[2]];
}

//calculate the normal of the given triangle
var normalOf = function(a, b, c) {
  ab = vec3.create();
  vec3.subtract(ab, b, a);

  ac = vec3.create();
  vec3.subtract(ac, a, c);

  normal = vec3.create()
  vec3.cross(normal, ac, ab)
  vec3.normalize(normal, normal);

  return [normal[0], normal[1], normal[2]];
}

var createCube = function(gl, program){
  var cube = {
      vertices : new Float32Array([
           -200,  200,  0.0,
            0.0,  200,  0.0,
            0.0,  0.0,  0.0,
           -200,  0.0,  0.0,

            0.0,  0.0, -200,
            0.0,  200, -200,
           -200,  200, -200,
           -200,  0.0, -200
      ]),
      colors: new Float32Array([
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,

            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 1.0, 0.0]),

      indices: new Uint8Array([
         0,2,1,  0,3,2, // front face
         1,2,5,  2,4,5,   // right face
         0,3,6,  3,7,6, // left face
         0,1,6,  6,1,5, // top face
         3,2,7,  7,2,4, // bottom face
         6,7,4,  6,4,5 // back face

      ]),
      dimensions: 3,
      numPoints: 8
    };

  cube.vertexBuffer = gl.createBuffer();
  cube.colorBuffer = gl.createBuffer();
  cube.indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cube.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cube.vertices, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, cube.colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cube.colors, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube.indices, gl.STATIC_DRAW);

  return function(){
    gl.bindBuffer(gl.ARRAY_BUFFER, cube.vertexBuffer);
    // associate it with our position attribute
    gl.vertexAttribPointer(program.a_Position, cube.dimensions, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cube.colorBuffer);
    // associate it with our position attribute
    gl.vertexAttribPointer(program.a_Color, cube.dimensions, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.indexBuffer);
    gl.drawElements(gl.TRIANGLES, cube.indices.length, gl.UNSIGNED_BYTE, 0);
  };
};

//calculate the normals for each vertex in the given array
var calculateNormals = function(ds) {

  //create vertices array
  vertices = []
  for (i = 0; i < max-1; i++) {
    for (j = 0; j < max-1; j++) {
      vertices.push(
        [i, ds[i][j], j]
      )
    }
  }

  //create indices array
  vec3s = [];
  vectorIndices = [];
  for (j=0;j<(max-1)*(max-1)-max;j+=max-1) {
    for (i = j; i < j+max-1; i+=2) {
      if (i+1 >= j+max-1) {
        vectorIndices.push(i, i+max-1)
      }
      else {
        vectorIndices.push(i, i+max-1, i+1, i+max)
      }
    }
    for(k=0;k<vectorIndices.length;k++){
      vec3s.push(vertices[vectorIndices[k]])
    }
    vectorIndices = []
  }

  //generate normal vectors for each triangle face
  normals = [];
  for (i=0; i < max-2; i++) {
     for (j=0; j < (max-1)*2 - 2;j++) {
       if(j%2==0) {
         normals.push(normalOf(vec3s[i*(max-1)*2+2+j], vec3s[i*(max-1)*2+1+j], vec3s[i*(max-1)*2+j]));
       }
       else {
         normals.push(normalOf(vec3s[i*(max-1)*2+j], vec3s[i*(max-1)*2+1+j], vec3s[i*(max-1)*2+2+j]));
       }
     }
  }


  //generate normals for each point
  //avgNormals = normals for each point (item at represents x,y coords. value there is the vector)
  //normals = normals for faces ordered by how they were pushed
  let avgNormals = createHeightfield(n);
  let len = avgNormals.length

  //normals for top left and bottom right (points with one face)
  avgNormals[0][0] = normals[0]//top left
  avgNormals[len-1][len-1] = normals[normals.length-1];//bottom right

  //normals for top right and bottom left (points with two faces)
  avgNormals[0][len-1] = averageNormal([normals[Math.pow(2, n)], normals[Math.pow(2, n)+1]]);//top right
  avgNormals[len-1][0] = averageNormal([normals[normals.length-2-Math.pow(2, n)], normals[normals.length-2-Math.pow(2, n)+1]])//bottom left

  //normals for edge points that are not corners (points with 3 faces)

  //loop through the top points not including corners
  for (let i = 1; i < Math.pow(2, n); i++) {
    let temp = i
    if (temp % 2 == 0) {
      avgNormals[0][temp] = averageNormal([normals[temp*2-2], normals[2*temp-1], normals[2*temp]]);
    }
    else {
      avgNormals[0][temp] = averageNormal([normals[2*temp-2], normals[2*temp-1], normals[2*temp]]);
    }
  }

  //loop through the bottom points not including corners
  for (let i = 1; i<Math.pow(2, n);i++) {
    if (i % 2 == 0) {
      avgNormals[Math.pow(2, n)][i] = averageNormal( [ normals[i + Math.pow(2, n)*2*(Math.pow(2, n)-1)], normals[i+1+Math.pow(2, n)*2*(Math.pow(2, n)-1)], normals[i+2+Math.pow(2, n)*2*(Math.pow(2, n)-1)] ] );
    }
    else {
      avgNormals[Math.pow(2, n)][i] = averageNormal( [ normals[i-1+Math.pow(2, n)*2*(Math.pow(2, n)-1)], normals[i+Math.pow(2, n)*2*(Math.pow(2, n)-1)], normals[i+1+Math.pow(2, n)*2*(Math.pow(2, n)-1)] ] );
    }
  }

  //loop through left points not including corners
  for (let i = 1; i<Math.pow(2, n); i++) {
    avgNormals[i][0] = averageNormal([normals[(i-1)*Math.pow(2, n)*2], normals[(i-1)*Math.pow(2, n)*2+1]]);
  }

  //loop through right points not including corners
  for (let i = 1; i<Math.pow(2, n);i++) {
    avgNormals[i][Math.pow(2, n)] = averageNormal([
      normals[(Math.pow(2, n)-1)*2+(i-1)*Math.pow(2, n)*2+1],
      normals[(Math.pow(2, n)-1)*2+(i-1)*Math.pow(2, n)*2+Math.pow(2, n)*2],
      normals[(Math.pow(2, n)-1)*2+(i-1)*Math.pow(2, n)*2+Math.pow(2, n)*2+1]]);
  }


  //loop through all non-edge points
  for (let i = 1; i<Math.pow(2, n);i++) {
    let count = 0;
    for (let j = 1; j<Math.pow(2, n);j++) {
      avgNormals[i][j] = averageNormal([
        normals[Math.pow(2, n)*2*(i-1)+j+count],
        normals[Math.pow(2, n)*2*(i-1)+j+count+1],
        normals[Math.pow(2, n)*2*(i-1)+j+count+2],
        normals[Math.pow(2, n)*2*(i-1)+j+count+(2*Math.pow(2, n)-1)],
        normals[Math.pow(2, n)*2*(i-1)+j+count+2+(2*Math.pow(2, n)-1)]
    ])
      count++;
    }
  }
  return flatten(avgNormals);
}

var createTerrain = function(array, gl, program, n) {
  let vertices1 = []
  let indices1 = []

  //generate vertices array
  for (i = 0; i < n-1; i++) {
    for (j = 0; j < n-1; j++) {
      vertices1.push(
        i, array[i][j], j);
    }
  }

  //generate indices array with degenerate triangles
  for (i = 0; i < (n-1)*(n-1) - n+1; i+=2) {
    if ((i+1) % (n-1) == 0) {
      indices1.push(i, i+n-1, i+n-1, i+1, i+1)
      i--;
    }
    else {
      indices1.push(i, i+n-1, i+1, i+n)
    }
  }

  //generate normals array
  let normals1 = calculateNormals(array);

  normals1 = new Float32Array(normals1);
  vertices1 = new Float32Array(vertices1);
  indices1 = new Uint16Array(indices1);

  // let random1 = [];
  //
  // for (i = 0; i < vertices1.length; i++) {
  //   random1.push(Math.random(), Math.random(), Math.random());
  // }
  //
  // random1 = new Float32Array(random1);

  var terrain = {
    vertices: vertices1,
    indices: indices1,
    dimensions: 3,
    normals: normals1,
    // random: random1
  }

  terrain.vertexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, terrain.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, terrain.vertices, gl.STATIC_DRAW);

  terrain.normalBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, terrain.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, terrain.normals, gl.STATIC_DRAW);

  // terrain.randomBuffer = gl.createBuffer();
  //
  // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrain.randomBuffer);
  // gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, terrain.random, gl.STATIC_DRAW);

  terrain.indexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrain.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, terrain.indices, gl.STATIC_DRAW);

  return function(){
    gl.bindBuffer(gl.ARRAY_BUFFER, terrain.vertexBuffer);
    gl.vertexAttribPointer(program.a_Position, terrain.dimensions, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, terrain.normalBuffer);
    gl.vertexAttribPointer(program.a_Normal, terrain.dimensions, gl.FLOAT, false, 0, 0);

    // gl.bindBuffer(gl.ARRAY_BUFFER, terrain.randomBuffer);
    // gl.vertexAttribPointer(program.a_Random, terrain.dimensions, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrain.indexBuffer);
    gl.drawElements(gl.TRIANGLE_STRIP, terrain.indices.length, gl.UNSIGNED_SHORT, 0);
  };
}


//when window loads:
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

  // don't catch this error since any problem here is a programmer error
  let program = middUtils.initializeProgram(gl, smoothVertexShader, fragmentShader);

  // load referneces to the vertex attributes as properties of the program
  program.a_Position = gl.getAttribLocation(program, 'a_Position');
  if (program.a_Position < 0) {
      console.log('Failed to get storage location');
      return -1;
  }
  gl.enableVertexAttribArray(program.a_Position);

 // specify the association between the VBO and the a_Normal attribute
  program.a_Normal = gl.getAttribLocation(program, 'a_Normal');
  if (program.a_Normal < 0) {
      console.log('Failed to get storage location');
      return -1;
  }
  gl.enableVertexAttribArray(program.a_Normal);


  //camera object
  var camera = {
    eye: vec3.fromValues(4, 2.0, -10.0),
    at: vec3.fromValues(4, 0, 4),
    up: vec3.fromValues(0.0, 1.0, 0.0),
    speed: 100,

    turnRight: function() {
      vec3.rotateY(this.at, this.at, this.eye, -4/180);
    },
    turnLeft: function() {
      vec3.rotateY(this.at, this.at, this.eye, 4/180);
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
    down: function() {
      eyeY = this.eye[1];
      atY = this.at[1];
      this.eye = vec3.fromValues(this.eye[0], eyeY - 1/this.speed * 4, this.eye[2]);
      this.at = vec3.fromValues(this.at[0], atY - 1/this.speed * 4, this.at[2]);
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
      let u_View = gl.getUniformLocation(program, 'u_View');
      gl.uniformMatrix4fv(u_View, false, view);
    }
  };

  //generate the terrain
  n = 7;
  max = Math.pow(2, n) + 2
  let hf = createHeightfield(n);
  let ds = diamondSquare(hf, n);
  ds = addWaterLine(ds, 0, max)
  let drawTerrain = createTerrain(ds, gl, program, max);

  //pass down all uniforms
  let ambient = vec3.fromValues(0.5, 0.5, 0.5);
  let u_Ambient = gl.getUniformLocation(program, 'u_Ambient');
  gl.uniform3f(u_Ambient, ambient[0], ambient[1], ambient[2]);

  let diffuse = vec3.fromValues(0.4, 0.4, 0.4);
  let u_Diffuse = gl.getUniformLocation(program, 'u_Diffuse');
  gl.uniform3f(u_Diffuse, diffuse[0], diffuse[1], diffuse[2]);

  let specular = vec3.fromValues(0.9, 0.9, 0.9);
  let u_Specular = gl.getUniformLocation(program, 'u_Specular');
  gl.uniform3f(u_Specular, specular[0], specular[1], specular[2]);

  let color = vec3.fromValues(0.96, 0.64, 0.38);
  let u_Color = gl.getUniformLocation(program, 'u_Color');
  gl.uniform3f(u_Color, color[0], color[1], color[2]);

  let shininess = 80.0;
  let u_Shininess = gl.getUniformLocation(program, 'u_Shininess');
  gl.uniform1f(u_Shininess, shininess);

  let lightDirection = vec3.fromValues(1, 1, 1);
  let u_LightDirection = gl.getUniformLocation(program, 'u_LightDirection');
  gl.uniform3f(u_LightDirection, lightDirection[0], lightDirection[1], lightDirection[2]);

  let transform = mat4.create();
  let u_Transform = gl.getUniformLocation(program, 'u_Transform');
  gl.uniformMatrix4fv(u_Transform, false, transform);

  let projection = mat4.create();
  mat4.perspective(projection, Math.PI/3,1, 0.1, 183);

  let u_Projection = gl.getUniformLocation(program, 'u_Projection');
  gl.uniformMatrix4fv(u_Projection, false, projection);

  //let program2 = middUtils.initializeProgram(gl, smoothVertexShader, oldFragmentShader);

  //let drawCube = createCube(gl, program2);

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.527,0.80,0.98,1);


  /*
  The conventional key handler detects when a key is held down for repeat actions, but it has a pause before it detects the repeat and it is flaky with two keys held down simultaneously. This avoids this by maintaining a mapping of the keys that are currently pressed.
  */
  var keyMap = {};

  window.onkeydown = function(e){
      keyMap[e.which] = true;
  }

  window.onkeyup = function(e){
       keyMap[e.which] = false;
  }


  // the render function
  let render = function(){

    // check which keys that we care about are down
    if  (keyMap['W'.charCodeAt(0)]){
        camera.forward();


    }else if (keyMap['S'.charCodeAt(0)]){
        camera.backward();
    }

    if  (keyMap['A'.charCodeAt(0)]){
        camera.turnLeft();

    }else if (keyMap['D'.charCodeAt(0)]){
        camera.turnRight();
    }

    if (keyMap[' '.charCodeAt(0)]){
      camera.upward();
    }
    else if (keyMap[16]){
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


    // DRAW STUFF HERE
    camera.apply();
    drawTerrain();

    requestAnimationFrame(render);
  };

  render();

};
