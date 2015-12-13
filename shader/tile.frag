precision lowp float;

varying vec2 vTexCoord;
varying mat2 vNormal;
varying vec4 vColor;

void main() {
    gl_FragColor = vec4(fract(vTexCoord), 0, 1.0);
}
