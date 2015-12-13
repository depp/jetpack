attribute vec2 Pos;
attribute vec2 TexCoord;
attribute vec4 Normal;
attribute vec4 Color;

varying vec2 vTexCoord;
varying mat2 vNormal;
varying vec4 vColor;

uniform mat4 MVP;

void main() {
    vTexCoord = TexCoord;
    vNormal = mat2(Normal.xy, Normal.zw);
    vColor = Color;
    gl_Position = MVP * vec4(Pos, 0.0, 1.0);
}
