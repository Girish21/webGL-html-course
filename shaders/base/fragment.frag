uniform float uTime;
uniform sampler2D uTexture;

varying vec3 vPosition;
varying vec2 vUv;
varying float vNoise;

void main() {
  // vec3 color = mix(vec3(0.06, 0.42, 0.66), vec3(0.37, 0.75, 1), (vNoise + 1.) * .5);

  vec2 newUV = vUv;
  newUV.y += newUV.x * .1;
  vec4 color = texture2D(uTexture, newUV);

  gl_FragColor = color;
  gl_FragColor = vec4(vUv, 0., 1.);
}
