precision lowp float;

varying vec2 vTexCoord;
varying vec4 vColor1;
varying vec4 vColor2;

uniform sampler2D SpriteSheet;

void main() {
    float a = texture2D(SpriteSheet, vTexCoord).r;
    gl_FragColor = a * mix(vColor1, vColor2, 0.5);
}
