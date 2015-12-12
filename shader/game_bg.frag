precision mediump float;

const int N = 2;
uniform vec4 Xform;
uniform vec2 Grid;
uniform vec4 Color[2];

void main() {
    vec2 pos = gl_FragCoord.xy * Xform.xy + Xform.zw;
    vec2 gm = step(Grid.x, fract(pos * Grid.y + 0.5 * Grid.x));
    float g = 1.0 - gm.x * gm.y;
    gl_FragColor = mix(Color[0], Color[1], g);
}
