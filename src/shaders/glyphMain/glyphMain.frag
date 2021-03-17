#version 300 es
precision highp float;

flat in vec3 vout_color;
layout(location = 0) out vec4 fout_color1;
layout(location = 1) out vec4 fout_color2;

void main()
{
    fout_color1 = vec4(vout_color, 1.0);
    fout_color2 = vec4(vout_color, 1.0);
}
