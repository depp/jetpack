attribute vec2 Pos;
attribute vec4 Color;

varying vec4 vColor;

uniform mat4 MVP;
uniform vec2 Offset;
uniform vec4 BlendColor;
uniform float BlendAmount;


void main() {
    vColor = mix(Color, BlendColor * Color.a, BlendAmount);
    gl_Position = MVP * vec4(Pos + Offset, 0.0, 1.0);
}
