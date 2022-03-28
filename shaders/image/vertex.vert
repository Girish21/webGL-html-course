uniform float uTime;
uniform vec2 uMouse;
uniform float uHovered;

varying vec2 vUv;
varying float vNoise;

void main() {
  vec3 newPosition = position;
  float dist = distance(uv, uMouse);

  newPosition.z += uHovered * 20. *  sin(dist * 10. + uTime);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.);

  vUv = uv;
  vNoise = uHovered * sin(dist * 20. - uTime);
}
