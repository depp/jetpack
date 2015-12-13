attribute vec2 Pos;
attribute vec2 TexCoord;
attribute vec4 Color1;
attribute vec4 Color2;

varying vec2 vTexCoord;
varying vec4 vColor1;
varying vec4 vColor2;

uniform mat4 MVP;

const vec2 TexScale = vec2(0.125, 0.25);

void main() {
    vTexCoord = TexCoord * TexScale;
    vColor1 = Color1;
    vColor2 = Color2;
    gl_Position = MVP * vec4(Pos, 0.0, 1.0);
}
