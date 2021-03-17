#version 300 es
precision highp float;

in vec2 vin_position;
in vec2 vin_tcord;
uniform mat4 u_matrix;
out vec2 vout_tcord;

void main()
{
    vout_tcord = vin_tcord;
    gl_Position = u_matrix * vec4(vin_position, 0.0, 1.0);
}
