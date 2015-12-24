precision mediump float;

const int N = 4;

uniform vec4 Xform;
uniform float Time;
uniform vec4 Layer[N];
uniform vec4 Color[N];
uniform vec2 Offset;

const float TwoPi = 6.283185307179586;

float rand(float n) {
    return fract(sin(n) * 43758.5453123);
}

float rand(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

vec2 hash2(vec2 p) {
    return fract(
        sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) *
        43758.5453);
}

float voronoi(in vec2 x) {
    vec2 xi = floor(x), xf = fract(x);
    float minD2 = 16.0;
    for (int cx = -2; cx <= 2; cx++) {
        for (int cy = -2; cy <= 2; cy++) {
            vec2 ci = vec2(float(cx), float(cy));
            float t = (fract(Time) + rand(xi + ci)) * TwoPi;
            vec2 vpt = hash2(xi + ci) + 0.25 * vec2(cos(t), sin(t));
            vec2 dpos = vpt + ci - xf;
            float d2 = dot(dpos, dpos);
            minD2 = min(d2, minD2);
        }
    }
    return minD2 * 0.25;
}

vec4 layer(in vec2 x, in vec4 layer, in vec4 color) {
    return color * voronoi(x * layer.z + layer.xy + Offset * layer.w);
}

void main() {
    vec2 p = Xform.xy * gl_FragCoord.xy + Xform.zw;
    float a;
    vec4 acc =
        layer(p, Layer[0], Color[0]) +
        layer(p, Layer[1], Color[1]) +
        layer(p, Layer[2], Color[2]) +
        layer(p, Layer[3], Color[3]);
    /*
    a = voronoi(p + Layer[0].xy + Offset * Layer[0].z);
    acc += a * LayerColor[0];
    a = voronoi(p + Layer[1].xy + Offset * Layer[1].z);
    acc += a * LayerColor[1];
    a = voronoi(p + Layer[2].xy + Offset * Layer[2].z);
    acc += a * LayerColor[2];
    a = voronoi(p + Layer[3].xy + Offset * Layer[3].z);
    acc += a * LayerColor[3];
    */
    gl_FragColor = vec4(acc.rgb, 1.0);
}
