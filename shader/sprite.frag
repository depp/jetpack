precision lowp float;

varying vec2 vTexCoord;
varying vec4 vColor;

uniform sampler2D SpriteSheet;

void main() {
    float a = texture2D(SpriteSheet, vTexCoord).r;
    gl_FragColor = a * vColor;
}
