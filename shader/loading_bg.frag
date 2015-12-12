precision mediump float;

const int N = 2;
uniform vec2 Scale;
uniform vec2 Offset;
uniform vec4 Color[N];
uniform vec4 Wave[N];
uniform float InvRadius[N];

void main() {
    vec3 acc = vec3(1.0);
    vec2 pos = gl_FragCoord.xy * Scale + Offset;
    float angle = atan(pos.y, pos.x);
    float r = length(pos);
    for (int i = 0; i < N; i++) {
        float wave = 0.5 + 0.5 * sin((angle + Wave[i].y) * Wave[i].x);
        float y = mix(Wave[i].z, Wave[i].w, wave) *
            abs(r * InvRadius[i] - 1.0) * 30.0;
        vec3 s = 1.0 / (1.0 + vec3(y) * Color[i].rgb);
        float t = smoothstep(0.0, 0.5, r) * Color[i].a;
        acc *= 1.0 - t * s;
    }
    gl_FragColor = vec4(1.0 - acc, 1.0);
}
