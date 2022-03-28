uniform sampler2D uImage;
uniform float uProgress;

varying vec2 vUv;
varying float vNoise;

void main() {
  vec2 uv = vUv;

  float x = uProgress;
  x = smoothstep(.0, 1., x * 2. + uv.y - 1.);
  vec4 f = mix(
    texture2D(uImage, (uv - .5) * (1. - x) + .5),
    texture2D(uImage, (uv - .5) * x + .5),
    x
  );

  gl_FragColor = f;
  gl_FragColor.rgb += .05 * vec3(vNoise);
}
