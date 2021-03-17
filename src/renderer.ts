import * as twgl from "twgl.js";
import opentype from "opentype.js";
import glyphMain from "./shaders/glyphMain";
import glyphQuad from "./shaders/glyphQuad";
import glyphPostProcess from "./shaders/glyphPostProcess";
import { transfrom } from ".";

interface Drawable {
  draw(): void;
}

interface PathInfo {
  positions: number[];
  indices: number[];
  quadPositions: number[];
  quadIndices: number[];
  barycentric: number[];
}

interface AAInfo {
  aaDeltas: number[];
  aaColors: number[];
}

class GlyphRenderer implements Drawable {
  gl: WebGL2RenderingContext;

  program: WebGLProgram;
  attribSetters: any;
  uniformSetters: any;
  vao: WebGLVertexArrayObject | null = null;
  count: number = 0;

  qprogram: WebGLProgram;
  qattribSetters: any;
  quniformSetters: any;
  qvao: WebGLVertexArrayObject | null = null;
  qcount: number = 0;

  factorMSAA: number = 3;

  inited: boolean = false;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = twgl.createProgramFromSources(gl, [
      glyphMain.vs,
      glyphMain.fs,
    ]);
    this.attribSetters = twgl.createAttributeSetters(gl, this.program);
    this.uniformSetters = twgl.createUniformSetters(gl, this.program);

    this.qprogram = twgl.createProgram(gl, [glyphQuad.vs, glyphQuad.fs]);
    this.qattribSetters = twgl.createAttributeSetters(gl, this.qprogram);
    this.quniformSetters = twgl.createUniformSetters(gl, this.qprogram);
  }

  genBuffer(pathInfo: PathInfo, aaInfo: AAInfo) {
    const { gl } = this;

    const {
      positions,
      indices,
      quadPositions,
      quadIndices,
      barycentric,
    } = pathInfo;

    this.count = indices.length;
    this.qcount = quadIndices.length;

    gl.deleteVertexArray(this.vao);
    gl.deleteVertexArray(this.qvao);

    const { aaDeltas, aaColors } = aaInfo;

    const aaDeltasBuffer = twgl.createBufferFromTypedArray(
      gl,
      new Float32Array(
        aaDeltas.map((v) => v / window.devicePixelRatio / transfrom.scale)
      )
    );
    const aaColorsBuffer = twgl.createBufferFromTypedArray(
      gl,
      new Float32Array(aaColors)
    );

    const posBuffer = twgl.createBufferFromTypedArray(
      gl,
      new Float32Array(positions)
    );
    const indBuffer = twgl.createBufferFromTypedArray(
      gl,
      new Uint16Array(indices),
      gl.ELEMENT_ARRAY_BUFFER
    );
    this.vao = (twgl.createVAOAndSetAttributes(
      gl,
      this.attribSetters,
      {
        vin_position: { buffer: posBuffer, numComponents: 2 },
        vin_aa_delta: {
          buffer: aaDeltasBuffer,
          numComponents: 2,
          divisor: 1,
          stride: 8,
        },
        vin_aa_color: {
          buffer: aaColorsBuffer,
          numComponents: 3,
          divisor: 1,
          stride: 12,
        },
      },
      indBuffer
    ) as unknown) as WebGLVertexArrayObject;

    const qposBuffer = twgl.createBufferFromTypedArray(
      gl,
      new Float32Array(quadPositions)
    );
    const baryBuffer = twgl.createBufferFromTypedArray(
      gl,
      new Float32Array(barycentric)
    );
    const qindBuffer = twgl.createBufferFromTypedArray(
      gl,
      new Uint16Array(quadIndices),
      gl.ELEMENT_ARRAY_BUFFER
    );

    this.qvao = (twgl.createVAOAndSetAttributes(
      gl,
      this.qattribSetters,
      {
        vin_position: { buffer: qposBuffer, numComponents: 2 },
        vin_barycentric: { buffer: baryBuffer, numComponents: 2 },
        vin_aa_delta: {
          buffer: aaDeltasBuffer,
          numComponents: 2,
          divisor: 1,
          stride: 8,
        },
        vin_aa_color: {
          buffer: aaColorsBuffer,
          numComponents: 3,
          divisor: 1,
          stride: 12,
        },
      },
      qindBuffer
    ) as unknown) as WebGLVertexArrayObject;

    this.inited = true;
  }

  draw(): void {
    if (!this.inited) return;

    const { gl } = this;
    const dpr = window.devicePixelRatio;
    const { width, height } = gl.canvas;
    const w = width / dpr;
    const h = height / dpr;

    // prettier-ignore
    const matrix = [
      2.0 / w * transfrom.scale, 0.0, 0.0, 0.0,
      0.0, -2.0 / h * transfrom.scale, 0.0, 0.0,
      0.0, 0.0, 1.0, 0.0,
      -1.0 + transfrom.x * 2 / w, 1.0 - transfrom.y * 2 / h, 0.0, 1.0,
    ];

    const uniform = {
      u_matrix: matrix,
    };

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(this.program);
    twgl.setUniforms(this.uniformSetters, uniform);
    gl.bindVertexArray(this.vao);
    gl.drawElementsInstanced(
      gl.TRIANGLE_FAN,
      this.count,
      gl.UNSIGNED_SHORT,
      0,
      this.factorMSAA
    );
    gl.bindVertexArray(null);

    gl.useProgram(this.qprogram);
    twgl.setUniforms(this.quniformSetters, uniform);
    gl.bindVertexArray(this.qvao);
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      this.qcount,
      gl.UNSIGNED_SHORT,
      0,
      this.factorMSAA
    );
    gl.bindVertexArray(null);
  }
}

class GlyphPostProcessRenderer implements Drawable {
  gl: WebGL2RenderingContext;
  frameBufferInfo: twgl.FramebufferInfo;

  program: WebGLProgram;
  attribSetters: any;
  uniformSetters: any;
  vao: WebGLVertexArrayObject | null = null;
  count: number = 0;

  constructor(
    gl: WebGL2RenderingContext,
    frameBufferInfo: twgl.FramebufferInfo
  ) {
    this.gl = gl;
    this.frameBufferInfo = frameBufferInfo;
    this.program = twgl.createProgram(gl, [
      glyphPostProcess.vs,
      glyphPostProcess.fs,
    ]);
    this.attribSetters = twgl.createAttributeSetters(gl, this.program);
    this.uniformSetters = twgl.createUniformSetters(gl, this.program);

    // prettier-ignore
    const positions = new Float32Array([
			-1.0, -1.0,
			-1.0,  1.0,
			 1.0, -1.0,
			 1.0,  1.0,
		]);
    // prettier-ignore
    const tcords = new Float32Array([
			0.0, 0.0,
			0.0, 1.0,
			1.0, 0.0,
			1.0, 1.0,
		]);
    // prettier-ignore
    const indices = new Uint16Array([
			0, 1, 2,
			1, 2, 3,
		]);
    this.count = indices.length;

    const posBuffer = twgl.createBufferFromTypedArray(gl, positions);
    const tcsBuffer = twgl.createBufferFromTypedArray(gl, tcords);
    const indBuffer = twgl.createBufferFromTypedArray(
      gl,
      indices,
      gl.ELEMENT_ARRAY_BUFFER
    );

    this.vao = (twgl.createVAOAndSetAttributes(
      gl,
      this.attribSetters,
      {
        vin_position: { buffer: posBuffer, numComponents: 2 },
        vin_tcord: { buffer: tcsBuffer, numComponents: 2 },
      },
      indBuffer
    ) as unknown) as WebGLVertexArrayObject;
  }

  draw() {
    const { gl } = this;
    const { width, height } = gl.canvas;

    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    // prettier-ignore
    const matrix = [
      1.0, 0.0, 0.0, 0.0,
      0.0, 1.0, 0.0, 0.0,
      0.0, 0.0, 1.0, 0.0,
      0.0, 0.0, 0.0, 1.0,
    ];
    const [texture1, texture2] = this.frameBufferInfo.attachments;
    twgl.setUniforms(this.uniformSetters, {
      u_texture1: texture1,
      u_texture2: texture2,
      u_matrix: matrix,
    });

    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLE_STRIP, this.count, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }
}

// prettier-ignore
const aaDeltas1 = [
  -3/12, -5/12,
   1/12, -5/12,
   5/12, -3/12,
];
// prettier-ignore
const aaDeltas2 = [
  -1/12, 1/12,
   3/12, 1/12,
   7/12, 3/12,
];
// prettier-ignore
const aaColors = [
  1/255, 0, 0,
  0, 1/255, 0,
  0, 0, 1/255,
];

export class Renderer {
  gl: WebGL2RenderingContext;
  private _tickId: number = -1;
  private _started: boolean = false;

  frameBufferInfo: twgl.FramebufferInfo;
  glyphRenderer: GlyphRenderer;
  glyphPostProcessRenderer: GlyphPostProcessRenderer;

  private _drawCalls: Array<(aaInfo: AAInfo) => void> = [];

  get attachments() {
    const { gl } = this;
    return [
      {
        internalFormat: gl.RGB,
        format: gl.RGB,
        type: gl.UNSIGNED_BYTE,
        min: gl.NEAREST,
        mag: gl.NEAREST,
      },
      {
        internalFormat: gl.RGB,
        format: gl.RGB,
        type: gl.UNSIGNED_BYTE,
        min: gl.NEAREST,
        mag: gl.NEAREST,
      },
    ];
  }

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.glyphRenderer = new GlyphRenderer(gl);
    this.frameBufferInfo = twgl.createFramebufferInfo(gl, this.attachments);
    twgl.bindFramebufferInfo(gl);

    this.glyphPostProcessRenderer = new GlyphPostProcessRenderer(
      gl,
      this.frameBufferInfo
    );
  }

  updateFrameBuffer() {
    const { gl } = this;
    const { width, height } = gl.canvas;

    twgl.resizeFramebufferInfo(
      gl,
      this.frameBufferInfo,
      this.attachments,
      width,
      height
    );
    twgl.bindFramebufferInfo(gl, this.frameBufferInfo);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this._drawCalls.forEach((draw) =>
      draw({
        aaDeltas: aaDeltas1,
        aaColors: aaColors,
      })
    );
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]);

    this._drawCalls.forEach((draw) =>
      draw({
        aaDeltas: aaDeltas2,
        aaColors: aaColors,
      })
    );
    gl.drawBuffers([gl.NONE, gl.COLOR_ATTACHMENT1]);

    twgl.bindFramebufferInfo(gl);
  }

  parsePath(path: opentype.Path): PathInfo {
    let box = path.getBoundingBox();
    const positions = [box.x1, box.y1];
    const indices = [0];
    let startIndex = 0;
    const quadPositions: number[] = [];

    path.commands.forEach((cmd) => {
      let index = positions.length / 2;
      switch (cmd.type) {
        case "Z": {
          indices.push(startIndex);
          indices.push(0xffff);
          indices.push(startIndex);
          startIndex = index;
          break;
        }
        case "Q": {
          quadPositions.push(positions[positions.length - 2]);
          quadPositions.push(positions[positions.length - 1]);
          quadPositions.push(cmd.x1);
          quadPositions.push(cmd.y1);
          quadPositions.push(cmd.x);
          quadPositions.push(cmd.y);
          // continue go to default
        }
        default: {
          positions.push(cmd.x);
          positions.push(cmd.y);
          indices.push(index);
        }
      }
    });

    const quadIndices = new Array(quadPositions.length / 2);
    const barycentric = new Array(quadPositions.length);
    for (let i = 0; i < quadPositions.length / 2; i++) {
      quadIndices[i] = i;
      barycentric[i * 2] = i % 3 == 0 ? 1.0 : 0.0;
      barycentric[i * 2 + 1] = i % 3 == 1 ? 1.0 : 0.0;
    }

    return {
      positions,
      indices,
      quadPositions,
      quadIndices,
      barycentric,
    };
  }

  render(paths: opentype.Path[]) {
    this._drawCalls = [];

    paths.forEach((path) => {
      const pathInfo = this.parsePath(path);

      this._drawCalls.push((aaInfo) => {
        this.glyphRenderer.genBuffer(pathInfo, aaInfo);
        this.glyphRenderer.draw();
      });
    });

    this.updateFrameBuffer();
    this.start();
  }

  tick = () => {
    this.glyphPostProcessRenderer.draw();
    if (this._started) {
      this._tickId = requestAnimationFrame(this.tick);
    }
  };

  start() {
    if (!this._started) {
      this._started = true;
      this.tick();
    }
  }

  stop() {
    if (this._started) {
      this._started = false;
      cancelAnimationFrame(this._tickId);
    }
  }
}
