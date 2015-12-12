precision mediump float;

const int N = 2;
uniform vec2 Scale;
uniform vec2 Offset;
uniform float GridSize;
uniform vec4 Color[2];

void main() {
    vec2 pos = gl_FragCoord.xy * Scale + Offset;
    vec2 gpos = fract(pos + 0.5 * GridSize);
    vec2 gm = step(GridSize, gpos);
    float g = 1.0 - gm.x * gm.y;
    gl_FragColor = mix(Color[0], Color[1], g);
}
