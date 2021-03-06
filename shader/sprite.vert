attribute vec2 Pos;
attribute vec2 TexCoord;
attribute vec4 Color;

varying vec2 vTexCoord;
varying vec4 vColor;

uniform mat4 MVP;
uniform vec2 Offset;
uniform vec4 BlendColor;
uniform float BlendAmount;

const vec2 TexScale = vec2(0.125, 0.25);

void main() {
    vTexCoord = TexCoord * TexScale;
    vColor = mix(Color, BlendColor * Color.a, BlendAmount);
    gl_Position = MVP * vec4(Pos + Offset, 0.0, 1.0);
}
