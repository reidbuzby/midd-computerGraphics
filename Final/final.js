/*
ADDED FEATURES:

-Rain
-Distance haze
-Skybox
-Camera follows the ground as you walk around
-Tiled terrain (3x3 grid)
-Textured terrain and water
-Steeper parts of mountains are covered with rock texture, flatter with grass texture

*/

var smoothVertexShader = `
attribute vec4 a_Position;
attribute vec3 a_Normal;
attribute float a_Type;
attribute float a_Cloud;
attribute vec2 a_TexCoord;

uniform mat4 u_Projection;
uniform mat4 u_View;
uniform mat4 u_Transform;
uniform float u_Rain1;
uniform float u_Rain2;
uniform vec3 u_CameraPos;

varying vec3 v_Position;
varying vec3 v_Normal;
varying vec3 v_LightPosition;
varying float v_Height;
varying float v_Type;
varying float v_Cloud;
varying vec2 v_TexCoord;

vec4 rain_pos;

void main(){
  gl_PointSize = 2.0;

  v_TexCoord = a_TexCoord;

  v_Position = (u_View * u_Transform * a_Position).xyz;

  if (a_Type == 2.0) {//rain type 1
    rain_pos = a_Position;
    rain_pos = vec4(rain_pos.x, rain_pos.y + u_Rain1, rain_pos.z, rain_pos.w);
    rain_pos = u_Projection * u_Transform * u_View * (rain_pos + vec4(u_CameraPos.x, 0.0, u_CameraPos.z, 0.0));

    v_Position = rain_pos.xyz;
    gl_Position = rain_pos;
  }
  else if (a_Type == 3.0) {//rain type 2
    rain_pos = a_Position;
    rain_pos = vec4(rain_pos.x, rain_pos.y + u_Rain2, rain_pos.z, rain_pos.w);
    rain_pos = u_Projection * u_Transform * u_View * (rain_pos + vec4(u_CameraPos.x, 0.0, u_CameraPos.z, 0.0));

    v_Position = rain_pos.xyz;
    gl_Position = rain_pos;
  }
  else if (a_Type == 0.0) {
    gl_Position = u_Projection * u_View * u_Transform * (a_Position + vec4(u_CameraPos.x, 0.0, u_CameraPos.z, 0.0));
  }
  else {
    gl_Position = u_Projection* u_View * u_Transform * a_Position;
  }

  v_LightPosition = (u_View * u_Transform * vec4(0.0, 1.0, 5.0, 1.0)).xyz;

  v_Type = a_Type;

  v_Cloud = a_Cloud;

  v_Normal = mat3(u_Transform) * a_Normal;

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
uniform sampler2D u_SamplerTerrain;
uniform sampler2D u_SamplerWater;
uniform sampler2D u_SamplerRock;


varying vec3 v_Position;
varying vec3 v_Normal;
varying float v_Type;
varying float v_Cloud;
varying float v_Height;
varying vec2 v_TexCoord;

vec3 L, N, V, H, P;
vec3 ambient, diffuse, specular, pointCamera;
float distance, fogFactor, fogDensity;
vec4 fogColor;

void main(){
  P = v_Position;
  N = normalize(v_Normal);
  L = normalize(u_LightDirection);
  V = normalize(-P);
  H = normalize(L+V);

  distance = length(v_Position);

  fogDensity = 0.02;
  fogColor = vec4(0.5, 0.5, 0.5, 1.0);
  fogFactor = 1.0 / exp(distance * fogDensity);
  fogFactor = clamp(fogFactor, 0.0, 1.0);




  if (v_Type == 2.0 || v_Type == 3.0) {
    gl_FragColor = mix(fogColor, vec4(0.011, 0.29, 0.925, 1.0), fogFactor*5.0);
  }
  else if (v_Type == 0.0) {
    if (v_Cloud < 2.0) {
      gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
    }
    else if (v_Cloud < 0.0) {
      gl_FragColor = vec4(0.0 + -1.0*v_Cloud / 35.0, 0.0 + -1.0*v_Cloud / 35.0, 0.0 + -1.0*v_Cloud, 1.0);
    }
    else {
      gl_FragColor = vec4(0.0 + v_Cloud / 35.0, 0.0 + v_Cloud / 35.0, 0.0 + v_Cloud, 1.0);
    }
  }

  else {
    if (v_Height < 0.1) {
      vec3 color = vec3(0.109, 0.418, 0.625);

      ambient = color * u_Ambient;
      diffuse = color * max(dot(L, N), 0.0) * u_Diffuse;
      specular = max(color * pow(max(dot(N, H), 0.0), u_Shininess) * u_Specular, 0.0);

      gl_FragColor = mix(fogColor, vec4(ambient + diffuse , 1.0) * texture2D(u_SamplerWater, v_TexCoord), fogFactor);
    }

    else {
      ambient = u_Color * u_Ambient;
      diffuse = u_Color * max(dot(L, N), 0.0)* u_Diffuse;
      specular = max(u_Color * pow(max(dot(N, H), 0.0), u_Shininess) * u_Specular, 0.0);

      if (acos(dot(N, vec3(0.0, 1.0, 0.0))) > 0.3) {
        gl_FragColor = mix(fogColor, vec4(ambient + diffuse , 1.0) * texture2D(u_SamplerRock, v_TexCoord), fogFactor);
      }
      else {
        gl_FragColor = mix(fogColor, vec4(ambient + diffuse , 1.0) * texture2D(u_SamplerTerrain, v_TexCoord), fogFactor);
      }
    }
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

var createScenegraph = function(gl, program){
  let stack = [];
  let currentMatrix = mat4.create();
  let u_Transform = gl.getUniformLocation(program, 'u_Transform');

  let createTransformationNode = function(matrix){
    let children = [];
    return {
      add: function(type, data){
        let node;
        if (type === "transformation"){
          node = createTransformationNode(data);
        }else if (type === "shape"){
          node = createShapeNode(data);
        }
        children.push(node);
        node.parent = this;
        return node;
      },
      apply: () => {
        //push
        stack.push(mat4.clone(currentMatrix));

        //update currentMatrix and push to card
        mat4.multiply(currentMatrix, currentMatrix, matrix);
        gl.uniformMatrix4fv(u_Transform, false, currentMatrix);

        //apply() on all children
        children.forEach(function(child) {
          child.apply();
        });

        //pop
        currentMatrix = stack.pop();
      }
    };
  };

  let createShapeNode = function(shapeFunc){
    return {
      apply: () =>{
        shapeFunc();
      }

    };
  };


  let root = createTransformationNode(mat4.create());

  return root;
};

//calculate the average of the given vertices for a square
var square = function(a, b, c, d) {
  x = (a[0] + b[0])/2
  y = (b[1] + c[1])/2
  return [x, y];
}

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
var diamondSquare = function(array, n, corners, top, bottom, left, right) {
  let roughness = 0.1;
  let size = Math.pow(2, n)
  let max = Math.pow(2, n);
  let r = roughness * size;

  if(top != null) {
    for (let i = 0; i < top.length; i++) {
      array[0][i] = top[i];
    }
  }
  if(bottom != null) {
    for (let i = 0; i < bottom.length; i++) {
      array[size][i] = bottom[i];
    }
  }
  if(left != null) {
    for (let i = 0; i < left.length; i++) {
      array[i][0] = left[i];
    }
  }
  if(right != null) {
    for (let i = 0; i < right.length; i++) {
      array[i][size] = right[i];
    }
  }

  //initialize four corners
  if (array[0][0] == 0) {
    array[0][0] = corners[0];
  }
  if (array[size][0] == 0) {
    array[size][0] = corners[1];
  }
  if (array[0][size] == 0) {
    array[0][size] = corners[2];
  }
  if (array[size][size] == 0) {
    array[size][size] = corners[3];
  }


  //preform the first square step manually
  if (array[size/2][size/2] == 0) {
    array[size/2][size/2] = (array[0][0] + array[size][0] + array[0][size] + array[size][size])/4 + Math.random()*2*r - r;//add random
  }

  //preform the first diamond step manually
  if (array[0][size/2] == 0) {
    array[0][size/2] = (array[0][0] + array[0][size] + array[size/2][size/2])/3+ Math.random()*2*r - r;//add random
  }
  if (array[size/2][0] == 0) {
    array[size/2][0] = (array[0][0] + array[size][0] + array[size/2][size/2])/3+ Math.random()*2*r - r;//add random
  }
  if (array[size][size/2] == 0) {
    array[size][size/2] = (array[size][0] + array[size][size] + array[size/2][size/2])/3+ Math.random()*2*r - r;//add random
  }
  if (array[size/2][size] == 0) {
    array[size/2][size] = (array[0][size] + array[size][size] + array[size/2][size/2])/3+ Math.random()*2*r - r;//add random
  }


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

        if (array[squareMidpoint[0]][squareMidpoint[1]] == 0) {
          array[squareMidpoint[0]][squareMidpoint[1]] = squareAverage;
        }
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

            if (array[diamondMidpoint[3]][diamondMidpoint[4]] == 0) {
              array[diamondMidpoint[3]][diamondMidpoint[4]] = average;
            }
          }
          else {//if 4 vertices
            average = (   array[diamondMidpoint[0][0]][diamondMidpoint[0][1]] +
                          array[diamondMidpoint[1][0]][diamondMidpoint[1][1]] +
                          array[diamondMidpoint[2][0]][diamondMidpoint[2][1]] +
                          array[diamondMidpoint[3][0]][diamondMidpoint[3][1]]
                        )/4 + Math.random()*2*r - r;
            if (array[diamondMidpoint[4]][diamondMidpoint[5]] == 0) {
              array[diamondMidpoint[4]][diamondMidpoint[5]] = average;
            }
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

            if (array[diamondMidpoint[3]][diamondMidpoint[4]] == 0) {
              array[diamondMidpoint[3]][diamondMidpoint[4]] = average;
            }
          }
          else {//if 4 vertices
            average = (   array[diamondMidpoint[0][0]][diamondMidpoint[0][1]] +
                          array[diamondMidpoint[1][0]][diamondMidpoint[1][1]] +
                          array[diamondMidpoint[2][0]][diamondMidpoint[2][1]] +
                          array[diamondMidpoint[3][0]][diamondMidpoint[3][1]]
                        )/4 + Math.random()*2*r - r;

            if (array[diamondMidpoint[4]][diamondMidpoint[5]] == 0) {
              array[diamondMidpoint[4]][diamondMidpoint[5]] = average;
            }
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

          if (array[diamondMidpoint[3]][diamondMidpoint[4]] == 0) {
            array[diamondMidpoint[3]][diamondMidpoint[4]] = average;
          }
        }
        else {//if 4 vertices
          average = (   array[diamondMidpoint[0][0]][diamondMidpoint[0][1]] +
                        array[diamondMidpoint[1][0]][diamondMidpoint[1][1]] +
                        array[diamondMidpoint[2][0]][diamondMidpoint[2][1]] +
                        array[diamondMidpoint[3][0]][diamondMidpoint[3][1]]
                      )/4 + Math.random()*2*r - r;

          if (array[diamondMidpoint[4]][diamondMidpoint[5]] == 0) {
            array[diamondMidpoint[4]][diamondMidpoint[5]] = average;
          }
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

//create skybox object
var createSkyBox = function(gl, ds, n, x, y, z, orientation, program){
  let clouds1 = [];
  let vertices1 = [];
  let type1 = [];
  let normals1 = [];

  if (orientation == 0) {//0 == flat plane
    for (let i = 0; i < n-1; i++) {
      for (let j = 0; j < n-1; j++) {
        vertices1.push(
          i+x, 50, j+z);
        clouds1.push(ds[i][j]);
      }
    }
  }
  if (orientation == 1) {//1 == vertical plane varying by x
    for (let i = 0; i < n-1; i++) {
      for (let j = 0; j < n-1; j++) {
        vertices1.push(
          i+x, y-j, z
        )
        clouds1.push(ds[i][j]);
      }
    }
  }
  if (orientation == 2) {//2 == vertical plane varying by z
    for (let i = 0; i < n-1; i++) {//n-1
      for (let j = 0; j < n-1; j++) {
        vertices1.push(
          x, y-i, z+j
        )
        clouds1.push(ds[i][j]);
      }
    }
  }

  let indices1 = []

  //generate indices array with degenerate triangles
  for (let i = 0; i < (n-1)*(n-1) - n+1; i+=2) {
    if ((i+1) % (n-1) == 0) {
      indices1.push(i, i+n-1, i+n-1, i+1, i+1)
      i--;
    }
    else {
      indices1.push(i, i+n-1, i+1, i+n)
    }
  }


  while(clouds1.length < vertices1.length) {
    clouds1.push(1.0)
  }

  for(let i = 0; i < vertices1.length/3; i++) {
    normals1.push(0, -1, 0);
  }

  for (let i = 0; i < vertices1.length; i++) {
    type1.push(0.0)
  }


  vertices1 = new Float32Array(vertices1)
  indices1 = new Uint16Array(indices1)
  type1 = new Float32Array(type1)
  clouds1 = new Float32Array(clouds1)
  normals1 = new Float32Array(normals1)

  var cube = {
      vertices: vertices1,
      indices : indices1,
      type: type1,
      clouds: clouds1,
      normals: normals1
    };

  cube.typeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cube.typeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cube.type, gl.STATIC_DRAW);

  cube.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cube.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cube.vertices, gl.STATIC_DRAW);

  cube.cloudsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cube.cloudsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cube.clouds, gl.STATIC_DRAW);

  cube.normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cube.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cube.normals, gl.STATIC_DRAW);

  cube.indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube.indices, gl.STATIC_DRAW);


  return function(){
    gl.bindBuffer(gl.ARRAY_BUFFER, cube.typeBuffer);
    gl.vertexAttribPointer(program.a_Type, 1, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cube.cloudsBuffer);
    gl.vertexAttribPointer(program.a_Cloud, 1, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cube.vertexBuffer);
    gl.vertexAttribPointer(program.a_Position, 3, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cube.normalBuffer);
    gl.vertexAttribPointer(program.a_Normal, 3, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.indexBuffer);
    gl.drawElements(gl.TRIANGLE_STRIP, cube.indices.length, gl.UNSIGNED_SHORT, 0);

  };
};

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

//create terrain object
var createTerrain = function(array, gl, program, max, n, x, z) {
  let vertices1 = []
  let indices1 = []

  //generate vertices array
  for (i = 0; i < max-1; i++) {
    for (j = 0; j < max-1; j++) {
      vertices1.push(
        i+x, array[i][j], j+z);
    }
  }

  //generate indices array with degenerate triangles
  for (i = 0; i < (max-1)*(max-1) - max+1; i+=2) {
    if ((i+1) % (max-1) == 0) {
      indices1.push(i, i+max-1, i+max-1, i+1, i+1)
      i--;
    }
    else {
      indices1.push(i, i+max-1, i+1, i+max)
    }
  }

  //generate normals array
  let normals1 = calculateNormals(array);

  normals1 = new Float32Array(normals1);
  vertices1 = new Float32Array(vertices1);
  indices1 = new Uint16Array(indices1);

  let type1 = [];
  let cloud1 = [];

  for (i = 0; i < vertices1.length; i++) {
    type1.push(1);
    cloud1.push(0);
  }

  type = new Float32Array(type1)

  let texCoords = [];
    for (let i = 0; i <= Math.pow(2, n); i++) {
      for (let j = 0; j <= Math.pow(2, n); j++) {
        texCoords.push(j/4, i/4);
      }
    }

  texCoords = new Float32Array(texCoords);
  cloud = new Float32Array(cloud1);

  var terrain = {
    vertices: vertices1,
    indices: indices1,
    dimensions: 3,
    normals: normals1,
    type: type,
    textureCoordinates: texCoords,
    cloud: cloud1
  }

  terrain.vertexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, terrain.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, terrain.vertices, gl.STATIC_DRAW);

  terrain.normalBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, terrain.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, terrain.normals, gl.STATIC_DRAW);

  terrain.typeBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, terrain.typeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, terrain.type, gl.STATIC_DRAW);

  terrain.textureBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, terrain.textureBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, terrain.textureCoordinates, gl.STATIC_DRAW);

  terrain.cloudBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, terrain.cloudBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, terrain.cloud, gl.STATIC_DRAW);

  terrain.indexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrain.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, terrain.indices, gl.STATIC_DRAW);

  return function(){
    gl.bindBuffer(gl.ARRAY_BUFFER, terrain.vertexBuffer);
    gl.vertexAttribPointer(program.a_Position, terrain.dimensions, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, terrain.normalBuffer);
    gl.vertexAttribPointer(program.a_Normal, terrain.dimensions, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, terrain.typeBuffer);
    gl.vertexAttribPointer(program.a_Type, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, terrain.textureBuffer);
    gl.vertexAttribPointer(program.a_TexCoord, 2, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, terrain.textureBuffer);
    gl.vertexAttribPointer(program.a_Cloud, 1, gl.FLOAT, false, 0,0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrain.indexBuffer);
    gl.drawElements(gl.TRIANGLE_STRIP, terrain.indices.length, gl.UNSIGNED_SHORT, 0);
  };
}

//create rain object 1
var createRain1 = function(gl, program, max) {
  let vertices = [];
  let type = [];

  for (let i = -46; i < 45; i++) {
    for(let j = -46; j < 45; j++) {
      let rand = Math.random() * 100;
      vertices.push(i, 51 + rand, j);
      vertices.push(i, 50.5 + rand, j);
    }
  }

  let cloud = [];
  for(let i = 0; i < vertices.length/3; i++) {
    type.push(2);
    cloud.push(0);
  }

  vertices1 = new Float32Array(vertices);
  type1 = new Float32Array(type);
  cloud1 = new Float32Array(cloud);

  var rain = {
    vertices: vertices1,
    type: type1,
    cloud: cloud1
  }

  rain.vertexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, rain.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, rain.vertices, gl.STATIC_DRAW);

  rain.typeBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, rain.typeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, rain.type, gl.STATIC_DRAW);

  rain.cloudBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, rain.cloudBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, rain.cloud, gl.STATIC_DRAW);


  return function() {
    gl.bindBuffer(gl.ARRAY_BUFFER, rain.vertexBuffer);
    gl.vertexAttribPointer(program.a_Position, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, rain.typeBuffer);
    gl.vertexAttribPointer(program.a_Type, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, rain.cloudBuffer);
    gl.vertexAttribPointer(program.a_Cloud, 1, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.LINES, 0, rain.vertices.length/3);
  }
}

//create second rain object so the rain will loop infinitely
var createRain2 = function(gl, program, max) {
  let vertices = [];
  let type = [];

  for (let i = -46; i < 45; i++) {
    for(let j = -46; j < 45; j++) {
      let rand = Math.random() * 100;
      vertices.push(i, 51 + rand, j);
      vertices.push(i, 50.5 + rand, j);
    }
  }

  let cloud = [];

  for(let i = 0; i < vertices.length/3; i++) {
    type.push(3);
    cloud.push(0)
  }

  vertices1 = new Float32Array(vertices);
  type1 = new Float32Array(type);
  cloud1 = new Float32Array(cloud);

  var rain2 = {
    vertices: vertices1,
    type: type1,
    cloud: cloud1
  }

  rain2.vertexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, rain2.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, rain2.vertices, gl.STATIC_DRAW);

  rain2.typeBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, rain2.typeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, rain2.type, gl.STATIC_DRAW);

  rain2.cloudBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, rain2.cloudBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, rain2.cloud, gl.STATIC_DRAW);


  return function() {
    gl.bindBuffer(gl.ARRAY_BUFFER, rain2.vertexBuffer);
    gl.vertexAttribPointer(program.a_Position, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, rain2.typeBuffer);
    gl.vertexAttribPointer(program.a_Type, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, rain2.cloudBuffer);
    gl.vertexAttribPointer(program.a_Cloud, 1, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.LINES, 0, rain2.vertices.length/3);
  }
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

  program.a_Type = gl.getAttribLocation(program, 'a_Type');
  if (program.a_Type < 0) {
      console.log('Failed to get storage location');
      return -1;
  }
  gl.enableVertexAttribArray(program.a_Type);

  program.a_Cloud = gl.getAttribLocation(program, 'a_Cloud');
  if (program.a_Cloud < 0) {
      console.log('Failed to get storage location');
      return -1;
  }
  gl.enableVertexAttribArray(program.a_Cloud);

  program.a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord');
  if (program.a_TexCoord < 0) {
      console.log('Failed to get storage location');
      return -1;
  }
  gl.enableVertexAttribArray(program.a_TexCoord);


  /** --------------------------------- **/


           //terrain generation//


  /** --------------------------------- **/


  n = 7;
  max = Math.pow(2, n) + 2

  let hf = createHeightfield(n);
  let terrainMiddle = diamondSquare(hf, n, [0,0,0,0], null, null, null, null);
  terrainMiddle = addWaterLine(terrainMiddle, -0.1, max);
  let drawTerrainMiddle = createTerrain(terrainMiddle, gl, program, max, n, max-2, max-2);

  let tmN = [], tmS = [], tmW = [], tmE = [];
  for (let i = 0; i < max - 2; i++) {
    tmN.push(terrainMiddle[0][i]);
    tmS.push(terrainMiddle[max-2][i]);
    tmW.push(terrainMiddle[i][0]);
    tmE.push(terrainMiddle[i][max-2]);
  }

  hf = createHeightfield(n);
  let terrainNorth = diamondSquare(hf, n, [0,0,0,0], tmS, null, null, null);
  terrainNorth = addWaterLine(terrainNorth, -0.1, max);
  let drawTerrainNorth = createTerrain(terrainNorth, gl, program, max, n, 2*(max-2), max-2);

  let tnW = [], tnE = [];
  for (let i = 0; i < max - 2; i++) {
    tnW.push(terrainNorth[i][0]);
    tnE.push(terrainNorth[i][max-2]);
  }

  hf = createHeightfield(n);
  let terrainSouth = diamondSquare(hf, n, [0,0,0,0], null, tmN, null, null);
  terrainSouth = addWaterLine(terrainSouth, -0.1, max);
  let drawTerrainSouth = createTerrain(terrainSouth, gl, program, max, n, 0, max-2);

  let tsW = [], tsE = [];
  for (let i = 0; i < max - 2; i++) {
    tsW.push(terrainSouth[i][0]);
    tsE.push(terrainSouth[i][max-2]);
  }

  hf = createHeightfield(n);
  let terrainEast = diamondSquare(hf, n, [0,0,0,0], null, null, tmE, null);
  terrainEast = addWaterLine(terrainEast, -0.1, max);
  let drawTerrainEast = createTerrain(terrainEast, gl, program, max, n, max-2, 2*(max-2));

  let teN = [], teS = [];
  for (let i = 0; i < max - 2; i++) {
    teN.push(terrainEast[0][i]);
    teS.push(terrainEast[max-2][i]);
  }

  hf = createHeightfield(n);
  let terrainWest = diamondSquare(hf, n, [0,0,0,0], null, null, null, tmW);
  terrainWest = addWaterLine(terrainWest, -0.1, max);
  let drawTerrainWest = createTerrain(terrainWest, gl, program, max, n, max-2, 0);

  let twN = [], twS = [];
  for (let i = 0; i < max - 2; i++) {
    twN.push(terrainWest[0][i]);
    twS.push(terrainWest[max-2][i]);
  }

  hf = createHeightfield(n);
  let terrainNorthEast = diamondSquare(hf, n, [0,0,0,0], teS, null, tnE, null);
  terrainNorthEast = addWaterLine(terrainNorthEast, -0.1, max);
  let drawTerrainNorthEast = createTerrain(terrainNorthEast, gl, program, max, n, 2*(max-2), 2*(max-2));

  hf = createHeightfield(n);
  let terrainNorthWest = diamondSquare(hf, n, [0,0,0,0], twS, null, null, tnW);
  terrainNorthWest = addWaterLine(terrainNorthWest, -0.1, max);
  let drawTerrainNorthWest = createTerrain(terrainNorthWest, gl, program, max, n, 2*(max-2), 0);

  hf = createHeightfield(n);
  let terrainSouthEast = diamondSquare(hf, n, [0,0,0,0], null, teN, tsE, null);
  terrainSouthEast = addWaterLine(terrainSouthEast, -0.1, max);
  let drawTerrainSouthEast = createTerrain(terrainSouthEast, gl, program, max, n, 0, 2*(max-2));

  hf = createHeightfield(n);
  let terrainSouthWest = diamondSquare(hf, n, [0,0,0,0], null, twN, null, tsW);
  terrainSouthWest = addWaterLine(terrainSouthWest, -0.1, max);
  let drawTerrainSouthWest = createTerrain(terrainSouthWest, gl, program, max, n, 0, 0);


  /** --------------------------------- **/


           //skybox generation//


  /** --------------------------------- **/


  let clouds_hf = createHeightfield(n);
  //diamondSquare(array, n, corners, tile, side)
  let cloudsMiddle = diamondSquare(clouds_hf, n, [30, 10, 20, 10], null, null, null, null);
  //loop thru the original diamond square (cloudsMiddle) and create
  //arrays for each side
  let middleTopEdge = [], middleRightEdge = [], middleBottomEdge = [], middleLeftEdge = [];
  for (let i = 0; i < max - 2; i++) {
    middleTopEdge.push(cloudsMiddle[0][i]);
    middleRightEdge.push(cloudsMiddle[i][max-2]);
    middleBottomEdge.push(cloudsMiddle[max-2][i]);
    middleLeftEdge.push(cloudsMiddle[i][0]);
  }
  //diamondSquare(array, n, corners, top, bottom, left, right)
  clouds_hf = createHeightfield(n);
  let cloudsRight = diamondSquare(clouds_hf, n, [30, 10, 20, 10], null, null, middleRightEdge, null);

  let rightTopEdge = [], rightBottomEdge = [], rightLeftEdge = [], rightRightEdge = [];
  for (let i = 0; i < max - 2; i++) {
    rightTopEdge.push(cloudsRight[0][i]);
    rightBottomEdge.push(cloudsRight[max-2][i]);
  }

  clouds_hf = createHeightfield(n);
  let cloudsBottom = diamondSquare(clouds_hf, n, [30, 10, 20, 10], middleBottomEdge, null, null, rightBottomEdge);

  let bottomLeftEdge = [];
  for (let i = 0; i < max - 2; i++) {
    bottomLeftEdge.push(cloudsBottom[i][0])
  }

  clouds_hf = createHeightfield(n);
  let cloudsLeft = diamondSquare(clouds_hf, n, [30, 10, 20, 10], null, bottomLeftEdge, middleLeftEdge, null);

  let leftTopEdge = [];
  for (let i = 0; i < max - 2; i++) {
    leftTopEdge.push(cloudsLeft[0][i]);
  }

  clouds_hf = createHeightfield(n);
  let cloudsTop = diamondSquare(clouds_hf, n, [30, 10, 20, 10], middleTopEdge, rightTopEdge, leftTopEdge, rightTopEdge);

  //(gl, program, ds, n, x, y, z, orientation)
  let drawSkyMiddle = createSkyBox(gl, cloudsMiddle, max,   -64,     50, -64,  0, program);
  let drawSkyRight = createSkyBox(gl, cloudsRight, max,     -64, 50, max-2-64,  1, program);
  let drawSkyLeft = createSkyBox(gl, cloudsLeft, max,       -64,     50, -64, 1, program);
  let drawSkyTop = createSkyBox(gl, cloudsTop, max,         -64,     50, -64, 2, program);
  let drawSkyBottom = createSkyBox(gl, cloudsBottom, max,   max-2-64, 50, -64, 2, program);

  //create rain
  let drawRain1 = createRain1(gl, program, max);
  let drawRain2 = createRain2(gl, program, max);

  /** --------------------------------- **/


                //camera//


  /** --------------------------------- **/

  var camera = {
    eye: vec3.fromValues(192.0, 2.0, 192.0),
    at: vec3.fromValues(200, 0, 200),
    up: vec3.fromValues(0.0, 1.0, 0.0),
    speed: 100,
    steps: 0,

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
      if (!flying) {
        e = this.eye;
        a = this.at;

        //check where the camera is in position to each mesh tile
        if ((this.eye[0] >= 0 && this.eye[0] < 127.5) && (this.eye[2] >= 0 && this.eye[2] < 127.5)) {//south west tile
          this.eye = vec3.fromValues(e[0], terrainSouthWest[Math.round(e[0])][Math.round(e[2])] + 1.0, e[2])
          this.at = vec3.fromValues(a[0], a[1] + this.eye[1] - e[1], a[2]);
        }

        if ((this.eye[0] >= 0 && this.eye[0] < 127.5) && (this.eye[2] >= 127.5 && this.eye[2] < 255.5)) {//south tile
          this.eye = vec3.fromValues(e[0], terrainSouth[Math.round(e[0])][Math.round(e[2] - 128)] + 1.0, e[2])
          this.at = vec3.fromValues(a[0], a[1] + this.eye[1] - e[1], a[2]);
        }

        if ((this.eye[0] >= 0 && this.eye[0] < 127.5) && (this.eye[2] >= 255.5 && this.eye[2] < 383.5)) {//south east tile
          this.eye = vec3.fromValues(e[0], terrainSouthEast[Math.round(e[0])][Math.round(e[2] - 256)] + 1.0, e[2])
          this.at = vec3.fromValues(a[0], a[1] + this.eye[1] - e[1], a[2]);
        }

        if ((this.eye[0] >= 127.5 && this.eye[0] < 255.5) && (this.eye[2] >= 0 && this.eye[2] < 127.5)) {//west tile
          this.eye = vec3.fromValues(e[0], terrainWest[Math.round(e[0] - 128)][Math.round(e[2])] + 1.0, e[2])
          this.at = vec3.fromValues(a[0], a[1] + this.eye[1] - e[1], a[2]);
        }

        if ((this.eye[0] >= 127.5 && this.eye[0] < 255.5) && (this.eye[2] >= 127.5 && this.eye[2] < 255.5)) {//middle tile
          this.eye = vec3.fromValues(e[0], terrainMiddle[Math.round(e[0] - 128)][Math.round(e[2] - 128)] + 1.0, e[2])
          this.at = vec3.fromValues(a[0], a[1] + this.eye[1] - e[1], a[2]);
        }

        if ((this.eye[0] >= 127.5 && this.eye[0] < 255.5) && (this.eye[2] >= 255.5 && this.eye[2] < 383.5)) {//east tile
          this.eye = vec3.fromValues(e[0], terrainEast[Math.round(e[0] - 128)][Math.round(e[2] - 256)] + 1.0, e[2])
          this.at = vec3.fromValues(a[0], a[1] + this.eye[1] - e[1], a[2]);
        }

        if ((this.eye[0] >= 255.5 && this.eye[0] < 383.5) && (this.eye[2] >= 0 && this.eye[2] < 127.5)) {//north west tile
          this.eye = vec3.fromValues(e[0], terrainNorthWest[Math.round(e[0] - 256)][Math.round(e[2])] + 1.0, e[2])
          this.at = vec3.fromValues(a[0], a[1] + this.eye[1] - e[1], a[2]);
        }

        if ((this.eye[0] >= 255.5 && this.eye[0] < 383.5) && (this.eye[2] >= 127.5 && this.eye[2] < 255.5)) {//north tile
          this.eye = vec3.fromValues(e[0], terrainNorth[Math.round(e[0] - 256)][Math.round(e[2] - 128)] + 1.0, e[2])
          this.at = vec3.fromValues(a[0], a[1] + this.eye[1] - e[1], a[2]);
        }

        if ((this.eye[0] >= 255.5 && this.eye[0] < 383.5) && (this.eye[2] >= 255.5 && this.eye[2] < 383.5)) {//north east tile
          this.eye = vec3.fromValues(e[0], terrainNorthEast[Math.round(e[0] - 256)][Math.round(e[2] - 256)] + 1.0, e[2])
          this.at = vec3.fromValues(a[0], a[1] + this.eye[1] - e[1], a[2]);
        }
      }
      let view = mat4.create();
      mat4.lookAt(view, this.eye, this.at, this.up);

      let u_View = gl.getUniformLocation(program, 'u_View');
      gl.uniformMatrix4fv(u_View, false, view);

      let u_CameraPos = gl.getUniformLocation(program, 'u_CameraPos');
      gl.uniform3f(u_CameraPos, this.eye[0], this.eye[1], this.eye[2]);
    }
  };

  //create scenegraph and add terrain, skybox, and rain objects
  let root = createScenegraph(gl, program);
  root.add("shape", drawTerrainWest);
  root.add("shape", drawTerrainNorth);
  root.add("shape", drawTerrainSouth);
  root.add("shape", drawTerrainEast);
  root.add("shape", drawTerrainMiddle);
  root.add("shape", drawTerrainNorthEast);
  root.add("shape", drawTerrainNorthWest);
  root.add("shape", drawTerrainSouthEast);
  root.add("shape", drawTerrainSouthWest);

  root.add("shape", drawSkyTop);
  root.add("shape", drawSkyMiddle);
  root.add("shape", drawSkyRight);
  root.add("shape", drawSkyLeft);
  root.add("shape", drawSkyBottom);

  root.add("shape", drawRain1);
  root.add("shape", drawRain2);

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

  let lightDirection = vec3.fromValues(0.38, 0.53, 0.76);
  let u_LightDirection = gl.getUniformLocation(program, 'u_LightDirection');
  gl.uniform3f(u_LightDirection, lightDirection[0], lightDirection[1], lightDirection[2]);

  let transform = mat4.create();
  let u_Transform = gl.getUniformLocation(program, 'u_Transform');
  gl.uniformMatrix4fv(u_Transform, false, transform);

  let projection = mat4.create();
  mat4.perspective(projection, Math.PI/6,1, 0.1, 400);

  let u_Projection = gl.getUniformLocation(program, 'u_Projection');
  gl.uniformMatrix4fv(u_Projection, false, projection);

  let u_SamplerTerrain = gl.getUniformLocation(program, 'u_SamplerTerrain');
  gl.uniform1i(u_SamplerTerrain, 0);

  let u_SamplerWater = gl.getUniformLocation(program, 'u_SamplerWater');
  gl.uniform1i(u_SamplerWater, 1);

  let u_SamplerRock = gl.getUniformLocation(program, 'u_SamplerRock');
  gl.uniform1i(u_SamplerRock, 2);

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.527,0.80,0.98,1);

  var keyMap = {};

  window.onkeydown = function(e){
      keyMap[e.which] = true;
  }

  window.onkeyup = function(e){
       keyMap[e.which] = false;
  }


  /** --------------------------------- **/


               // Render //


  /** --------------------------------- **/


  let last;
  let rain1 = 0;
  let rain2 = 0;
  var start = 0;
  let render = function() {


    //if rain is checked
    if (makeItRain) {
      //checks if the second rain object should start dropping
      if (start == 1) {
        rain2 -= 0.2;
        if (rain2 < -200) {
          rain2 = 0;
        }
      }

      //when the first rain object is about to reset, tell the second rain object to start dropping
      if (rain1 < -100 && start == 0) {
        start = 1;
      }

      //reset the first rain object
      if (rain1 < -200) {
        rain1 = 0;
      }
      rain1 -= 0.2;
      }
    else {
      rain1 = 0;
      rain2 = 0;
    }

    //push the rain uniforms
    let u_Rain1 = gl.getUniformLocation(program, 'u_Rain1');
    gl.uniform1f(u_Rain1, rain1);

    let u_Rain2 = gl.getUniformLocation(program, 'u_Rain2');
    gl.uniform1f(u_Rain2, rain2);

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


    // DRAW STUFF HERE
    camera.apply();
    root.apply();

    requestAnimationFrame(render);
  };


  /**toggle rain**/
  let rainToggle = document.getElementById('rain-toggle');
  var makeItRain = rainToggle.checked;

  rainToggle.onchange = function(){
      makeItRain = rainToggle.checked;
      if (!makeItRain) {
        start = 0;
      }
  }

  /**toggle flying**/
  let flyToggle = document.getElementById('fly-toggle');
  var flying = flyToggle.checked;

  flyToggle.onchange = function(){
    flying = flyToggle.checked;
  }

  /** load textures **/
  Promise.all([
    initializeTexture(gl, gl.TEXTURE0, 'grass.png'),
    initializeTexture(gl, gl.TEXTURE1, 'water.jpg'),
    initializeTexture(gl, gl.TEXTURE2, 'rock.jpg')
  ])
    .then(function () {render();})
    .catch(function (error) {alert('Failed to load texture '+  error.message);});
};
