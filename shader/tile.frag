precision lowp float;

varying vec2 vTexCoord;
varying mat2 vNormal;
varying vec4 vColor;

void main() {
    gl_FragColor = vec4(
        mix(vec3(fract(vTexCoord), 0.0), vColor.rgb, 0.5),
        1.0);
}
