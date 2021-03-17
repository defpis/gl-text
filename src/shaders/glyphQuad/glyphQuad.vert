#version 300 es
precision highp float;

in vec2 vin_position;
in vec2 vin_barycentric;
in vec2 vin_aa_delta;
in vec3 vin_aa_color;
uniform mat4 u_matrix;
out vec2 vout_barycentric;
flat out vec3 vout_color;

void main()
{
    vout_barycentric = vin_barycentric;
    vout_color = vin_aa_color;
    gl_Position = u_matrix * vec4(vin_position + vin_aa_delta, 0.0, 1.0);
}
