precision lowp float;

varying vec2 vPos;
varying vec2 vTexCoord;
varying vec4 vColor;

uniform sampler2D TexColor;
uniform sampler2D TexNormal;
uniform vec4 LightColor[8];
uniform vec4 LightPosition[8];
uniform vec3 BlockColor;

float lightMag(in vec3 norm, in vec3 light) {
    return dot(norm, light);
}

void main() {
    float c = texture2D(TexColor, vTexCoord).r;
    vec3 norm = normalize(texture2D(TexNormal, vTexCoord).rgb - 0.5);
    vec3 light = vec3(0.0);
    for (int i = 0; i < 4; i++) {
        light += LightColor[i].rgb * lightMag(norm, LightPosition[i].xyz);
    }
    vec3 lvec;
    float intensity;
    for (int i = 4; i < 8; i++) {
        lvec = LightPosition[i].xyz - vec3(vPos, 0.0);
        intensity = 1.0 / max(1.0, dot(lvec, lvec) * LightColor[i].a);
        light += LightColor[i].rgb * intensity *
            lightMag(norm, normalize(lvec));
    }
    gl_FragColor = vec4(light * mix(vColor.rgb, BlockColor, c), 1.0);
}
