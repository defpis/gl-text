#version 300 es
#extension GL_EXT_gpu_shader4: enable
precision highp float;

in vec2 vout_tcord;
uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
out vec4 fout_color;

void main()
{
    vec2 tcord = vout_tcord / 1.0;

    uvec3 val1 = uvec3(texture(u_texture1, tcord).xyz * 255.0);
    uvec2 nval1 = uvec2(texture(u_texture1, tcord + vec2(dFdx(vout_tcord.x), 0.0)).yz * 255.0);

    uvec3 val2 = uvec3(texture(u_texture2, tcord).xyz * 255.0);
    uvec2 nval2 = uvec2(texture(u_texture2, tcord + vec2(dFdx(vout_tcord.x), 0.0)).yz * 255.0);

    vec3 abc = vec3(val1 & 1u) + vec3(val2 & 1u);
    vec2 de = vec2(nval1 & 1u) + vec2(nval2 & 1u);

    vec3 res = vec3(
        abc.r + abc.g + abc.b, 
        de.y + abc.r + abc.g,
        de.x + de.y + abc.r
    ) / 6.0;

    if (res.r == 0.0 && res.g == 0.0 && res.b == 0.0) {
        discard;
    }

    fout_color = vec4(1.0 - res, 1.0);
}
