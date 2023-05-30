// MultiJointModel_segment.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Normal;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  // The followings are some shading calculation to make the arm look three-dimensional
  '  vec3 lightDirection = normalize(vec3(0.0, 0.5, 0.7));\n' + // Light direction
  '  vec4 color = vec4(0.30, 0.725, 0.05, 1.0);\n' +  // Robot color
  '  vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz);\n' +
  '  float nDotL = max(dot(normal, lightDirection), 0.0);\n' +
  '  v_Color = vec4(color.rgb * nDotL + vec3(0.1), color.a);\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Set the vertex information
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Set the clear color and enable the depth test
  gl.clearColor(0.0, 0.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Get the storage locations of attribute and uniform variables
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (a_Position < 0 || !u_MvpMatrix || !u_NormalMatrix) {
    console.log('Failed to get the storage location of attribute or uniform variable');
    return;
  }

  // Calculate the view projection matrix
  var viewProjMatrix = new Matrix4();
  viewProjMatrix.setPerspective(45.0, 2, 0.1, 1000.0);
  viewProjMatrix.lookAt(20.0, 20.0, 20.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

  // Register the event handler to be called on key press
  document.onkeydown = function(ev){ keydown(ev, gl, n, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); };

  draw(gl, n, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix);
}

var ANGLE_STEP = 3.0;     // The increments of rotation angle (degrees)
var g_shaftAngle = 90.0;   // The rotation angle of shaft (degrees)
var g_joint1Angle = 45.0; // The rotation angle of joint1 (degrees)
var g_joint2Angle = 0.0;  // The rotation angle of joint2 (degrees)
var g_joint3Angle = 0.0;  // The rotation angle of joint3 (degrees)

function keydown(ev, gl, o, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix) {
  switch (ev.keyCode) {
    case 40: // Up arrow key -> the positive rotation of joint1 around the z-axis
      if (g_joint1Angle < 135.0) g_joint1Angle += ANGLE_STEP;
      break;
    case 38: // Down arrow key -> the negative rotation of joint1 around the z-axis
      if (g_joint1Angle > -135.0) g_joint1Angle -= ANGLE_STEP;
      break;
    case 39: // Right arrow key -> the positive rotation of shaft around the y-axis
      g_shaftAngle = (g_shaftAngle + ANGLE_STEP) % 360;
      break;
    case 37: // Left arrow key -> the negative rotation of shaft around the y-axis
      g_shaftAngle = (g_shaftAngle - ANGLE_STEP) % 360;
      break;
    case 90: // 'ｚ'key -> the positive rotation of joint2
      g_joint2Angle = (g_joint2Angle + ANGLE_STEP) % 360;
      break;
    case 88: // 'x'key -> the negative rotation of joint2
      g_joint2Angle = (g_joint2Angle - ANGLE_STEP) % 360;
      break;
    case 86: // 'v'key -> the positive rotation of joint3
      if (g_joint3Angle < 60.0)  g_joint3Angle = (g_joint3Angle + ANGLE_STEP) % 360;
      break;
    case 67: // 'c'key -> the nagative rotation of joint3
      if (g_joint3Angle > -60.0) g_joint3Angle = (g_joint3Angle - ANGLE_STEP) % 360;
      break;
    default: return; // Skip drawing at no effective action
  }
  // Draw
  draw(gl, o, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix);
}

var g_baseBuffer = null;     // Buffer object for a base
var g_shaftBuffer = null;     // Buffer object for shaft
var g_generatorBuffer = null;     // Buffer object for generator
var g_generatorBlobBuffer = null;     // Buffer object for a generatorBlob
var g_rotorBuffer = null;   // Buffer object for rotors
var g_rotorBlobBuffer = null;   // Buffer object for rotorsBlob
var g_bladeBuffer = null;   // Buffer object for blade

function generateBoxVertices(width, height, depth) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;

  const vertices = [
    // Front face
    -halfWidth, halfHeight, halfDepth,
    halfWidth, halfHeight, halfDepth,
    halfWidth, -halfHeight, halfDepth,
    -halfWidth, -halfHeight, halfDepth,

    // Back face
    halfWidth, halfHeight, -halfDepth,
    -halfWidth, halfHeight, -halfDepth,
    -halfWidth, -halfHeight, -halfDepth,
    halfWidth, -halfHeight, -halfDepth,

    // Top face
    -halfWidth, halfHeight, -halfDepth,
    halfWidth, halfHeight, -halfDepth,
    halfWidth, halfHeight, halfDepth,
    -halfWidth, halfHeight, halfDepth,

    // Bottom face
    -halfWidth, -halfHeight, halfDepth,
    halfWidth, -halfHeight, halfDepth,
    halfWidth, -halfHeight, -halfDepth,
    -halfWidth, -halfHeight, -halfDepth,

    // Right face
    halfWidth, halfHeight, halfDepth,
    halfWidth, halfHeight, -halfDepth,
    halfWidth, -halfHeight, -halfDepth,
    halfWidth, -halfHeight, halfDepth,

    // Left face
    -halfWidth, halfHeight, -halfDepth,
    -halfWidth, halfHeight, halfDepth,
    -halfWidth, -halfHeight, halfDepth,
    -halfWidth, -halfHeight, -halfDepth,
  ];

  return new Float32Array(vertices);
}

function initVertexBuffers(gl){
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3
  var vertices_base = generateBoxVertices(6.0, 0.5, 6.0);
  var vertices_shaft = generateBoxVertices(2.0,25.0,2.0)
  var vertices_generator = generateBoxVertices(4.0, 3.0, 6.0);
  var vertices_generatorBlob = generateBoxVertices(0.5,0.3,0.8)
  var vertices_rotor = generateBoxVertices(1.5,1.5,1.5)
  var vertices_rotorBlob = generateBoxVertices(0.5,0.5,0.5)
  var vertices_blade = generateBoxVertices(1.0,20.0,0.3)

  // Normal
  var normals = new Float32Array([
     0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0, // v0-v1-v2-v3 front
     1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0, // v0-v3-v4-v5 right
     0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0, // v0-v5-v6-v1 up
    -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, // v1-v6-v7-v2 left
     0.0,-1.0, 0.0,  0.0,-1.0, 0.0,  0.0,-1.0, 0.0,  0.0,-1.0, 0.0, // v7-v4-v3-v2 down
     0.0, 0.0,-1.0,  0.0, 0.0,-1.0,  0.0, 0.0,-1.0,  0.0, 0.0,-1.0  // v4-v7-v6-v5 back
  ]);

  // Indices of the vertices
  var indices = new Uint8Array([
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
  ]);

  // Write coords to buffers, but don't assign to attribute variables
  g_baseBuffer = initArrayBufferForLaterUse(gl, vertices_base, 3, gl.FLOAT);
  g_shaftBuffer = initArrayBufferForLaterUse(gl, vertices_shaft, 3, gl.FLOAT);
  g_generatorBuffer = initArrayBufferForLaterUse(gl, vertices_generator, 3, gl.FLOAT);
  g_generatorBlobBuffer = initArrayBufferForLaterUse(gl, vertices_generatorBlob, 3, gl.FLOAT);
  g_rotorBuffer = initArrayBufferForLaterUse(gl, vertices_rotor, 3, gl.FLOAT);
  g_rotorBlobBuffer = initArrayBufferForLaterUse(gl, vertices_rotorBlob, 3, gl.FLOAT);
  g_bladeBuffer = initArrayBufferForLaterUse(gl, vertices_blade, 3, gl.FLOAT);
  if (!g_baseBuffer || !g_shaftBuffer || !g_generatorBuffer || !g_generatorBlobBuffer
    || !g_rotorBuffer || !g_rotorBlobBuffer || !g_bladeBuffer) return -1;

  // Write normals to a buffer, assign it to a_Normal and enable it
  if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;

  // Write the indices to the buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

function initArrayBufferForLaterUse(gl, data, num, type){
  var buffer = gl.createBuffer();   // Create a buffer object
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // Store the necessary information to assign the object to the attribute variable later
  buffer.num = num;
  buffer.type = type;

  return buffer;
}

function initArrayBuffer(gl, attribute, data, num, type){
  var buffer = gl.createBuffer();   // Create a buffer object
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // Assign the buffer object to the attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);

  return true;
}


// Coordinate transformation matrix
var g_modelMatrix = new Matrix4(), g_mvpMatrix = new Matrix4();

function draw(gl, n, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix) {
  // Clear color and depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Draw a base
  var baseHeight = 10;
  g_modelMatrix.setTranslate(0.0, -17.5, 0.0);
  drawSegment(gl, n, g_baseBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix);

  // shaft
  var shaftLength = 12.5;
  g_modelMatrix.translate(0.0, baseHeight, 0.0);     // Move onto the base
  g_modelMatrix.rotate(g_shaftAngle, 0.0, 1.0, 0.0);  // Rotate around the y-axis
  drawSegment(gl, n, g_shaftBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw

  // generator
  var generatorLength = 3.0;
  g_modelMatrix.translate(0.0, shaftLength, 0.0);       // Move to joint1
  g_modelMatrix.rotate(g_joint1Angle, 0.0, 1.0, 0.0);  // Rotate around the z-axis
  drawSegment(gl, n, g_generatorBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix); // Draw

  // A generatorBlob
  var generatorBlobLength = 2.0;
  g_modelMatrix.translate(0.0, generatorLength, 0.0);       // Move to generatorBlob
  g_modelMatrix.rotate(g_joint2Angle, 0.0, 1.0, 0.0);  // Rotate around the y-axis
  drawSegment(gl, n, g_generatorBlobBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix);  // Draw

  // Move to the center of the tip of the generatorBlob
  g_modelMatrix.translate(0.0, generatorBlobLength, 0.0);

  // Draw rotor1
  g_modelMatrix.translate(0.0, 0.0, 2.0);
  g_modelMatrix.rotate(g_joint3Angle, 1.0, 0.0, 0.0);  // Rotate around the x-axis
  drawSegment(gl, n, g_rotorBuffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix);

}

var g_normalMatrix = new Matrix4();  // Coordinate transformation matrix for normals

// Draw segments
function drawSegment(gl, n, buffer, viewProjMatrix, a_Position, u_MvpMatrix, u_NormalMatrix) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // Assign the buffer object to the attribute variable
  gl.vertexAttribPointer(a_Position, buffer.num, buffer.type, false, 0, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_Position);

  // Calculate the model view project matrix and pass it to u_MvpMatrix
  g_mvpMatrix.set(viewProjMatrix);
  g_mvpMatrix.multiply(g_modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, g_mvpMatrix.elements);
  // Calculate matrix for normal and pass it to u_NormalMatrix
  g_normalMatrix.setInverseOf(g_modelMatrix);
  g_normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, g_normalMatrix.elements);
  // Draw
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}
