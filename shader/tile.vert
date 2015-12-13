attribute vec2 Pos;
attribute vec2 TexCoord;
attribute vec4 Color;

varying vec2 vPos;
varying vec2 vTexCoord;
varying vec4 vColor;

uniform mat4 MVP;

void main() {
    vPos = Pos;
    vTexCoord = TexCoord;
    vColor = Color;
    gl_Position = MVP * vec4(Pos, 0.0, 1.0);
}
