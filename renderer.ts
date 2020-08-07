// reference https://github.com/oktomus/web-experiments/blob/1e2d3bfbe6/webgl-compute/toy-raytracer/js/renderer.js

import computeShader from "./render.comp";
import blitShader from "./blit.comp";
import World from "./world";
import Stats from "./stats";
import Camera from "./camera";
import { Buffers, Buffer } from "./buffer";

// 2D local invocation
const LOCAL_X = 16;
const LOCAL_Y = 16;

type BufferDescriptor = {
  name: string;
  length: number;
  buffer: WebGLBuffer;
};

type BufferDescriptors = {
  vertex: BufferDescriptor | null;
  mesh: BufferDescriptor | null;
  slab: BufferDescriptor | null;
  light: BufferDescriptor | null;
  stats: BufferDescriptor | null;
};

export default class Renderer {
  renderTimes: number = 0;

  stats: Stats;

  canvas: HTMLCanvasElement;
  gl: WebGL2Context;
  renderProgram: WebGLProgram;
  blitProgram: WebGLProgram;
  uniforms: {
    [name: string]: WebGLUniformLocation;
  };
  buffers: BufferDescriptors = {
    vertex: null,
    mesh: null,
    slab: null,
    light: null,
    stats: null,
  };

  completed: boolean;

  frameTexture: WebGLTexture;
  accumulatedTexture: WebGLTexture;

  #world: World;

  get world() {
    return this.#world;
  }

  set world(world: World) {
    this.#world?.camera.removeListener(
      Camera.CHANGE,
      this.onCameraChange.bind(this)
    );

    this.#world = world;

    this.#world.camera.addListener(
      Camera.CHANGE,
      this.onCameraChange.bind(this)
    );
    this.#world.camera.setRatio(this.width / this.height);
    this.#world.camera.update();

    this.sendWorldBuffer();
  }

  #width: number;
  get width() {
    return this.#width;
  }
  set width(w) {
    this.#width = Math.ceil(w / LOCAL_X) * LOCAL_X;
    this.canvas.width = this.#width;
  }

  #height: number;
  get height() {
    return this.#height;
  }
  set height(h) {
    this.#height = Math.ceil(h / LOCAL_Y) * LOCAL_Y;
    this.canvas.height = this.#height;
  }

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2-compute", { antialias: false }) as any;

    if (!this.gl) {
      throw new Error("can not get webgl2 compute context");
    }

    this.width = width;
    this.height = height;

    this.stats = new Stats(LOCAL_X, LOCAL_Y);

    this.completed = false;

    [this.renderProgram, this.blitProgram] = this.init({
      computeShader,
      blitShader,
    }) as any;
    this.gl.useProgram(this.renderProgram);
    this.gl.program = this.renderProgram;
  }

  init(options: { computeShader: string; blitShader: string }) {
    const gl = this.gl;

    const program = gl.createProgram();

    if (!program) {
      throw new Error("can not create a webgl program");
    }

    const computeShader = gl.createShader(gl.COMPUTE_SHADER);
    if (!computeShader) return;

    // compile the shader
    gl.shaderSource(computeShader, options.computeShader);
    gl.compileShader(computeShader);

    if (!gl.getShaderParameter(computeShader, gl.COMPILE_STATUS)) {
      console.error(`compiling ${name} shader fails`);
      console.log(gl.getShaderInfoLog(computeShader));
      return;
    }

    // attach the shader
    gl.attachShader(program, computeShader);

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.log(gl.getProgramInfoLog(program));
      throw new Error("can not create a webgl program");
    }

    const blitProgram = gl.createProgram();

    if (!blitProgram) {
      throw new Error("can not create a webgl program");
    }

    const blitShader = gl.createShader(gl.COMPUTE_SHADER);
    if (!blitShader) return;

    // compile the shader
    gl.shaderSource(blitShader, options.blitShader);
    gl.compileShader(blitShader);

    if (!gl.getShaderParameter(blitShader, gl.COMPILE_STATUS)) {
      console.error(`compiling ${name} shader fails`);
      console.log(gl.getShaderInfoLog(blitShader));
      return;
    }

    // attach the shader
    gl.attachShader(blitProgram, blitShader);

    gl.linkProgram(blitProgram);

    if (!gl.getProgramParameter(blitProgram, gl.LINK_STATUS)) {
      console.log(gl.getProgramInfoLog(blitProgram));
      throw new Error("can not create a webgl program");
    }

    // create texture for ComputeShader write to
    const frameTexture = (this.frameTexture = gl.createTexture() as WebGLTexture);
    gl.bindTexture(gl.TEXTURE_2D, frameTexture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, this.width, this.height);

    const accumulatedTexture = (this.accumulatedTexture = gl.createTexture() as WebGLTexture);
    gl.bindTexture(gl.TEXTURE_2D, accumulatedTexture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, this.width, this.height);

    // create frameBuffer to read from texture
    const frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, frameBuffer);
    gl.framebufferTexture2D(
      gl.READ_FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      accumulatedTexture,
      0
    );

    gl.bindImageTexture(
      0,
      this.frameTexture,
      0,
      false,
      0,
      gl.READ_WRITE,
      gl.RGBA8
    );
    gl.bindImageTexture(
      1,
      this.accumulatedTexture,
      0,
      false,
      0,
      gl.READ_WRITE,
      gl.RGBA8
    );

    // get uniforms
    this.uniforms = {
      uSeed: gl.getUniformLocation(program, "uSeed")!,
      uViewInverse: gl.getUniformLocation(program, "uViewInverse")!,
      uProjectionInverse: gl.getUniformLocation(program, "uProjectionInverse")!,
      uScreenToNID: gl.getUniformLocation(program, "uScreenToNID")!,
      uRenderTimes: gl.getUniformLocation(program, "uRenderTimes")!,
      uAmbient: gl.getUniformLocation(program, "uAmbient")!,
      frameTex: gl.getUniformLocation(program, "frameTex")!,
      accumulatedTex: gl.getUniformLocation(program, "accumulatedTex")!,
    };

    this.sendStatsBuffer();

    return [program, blitProgram];
  }

  onCameraChange() {
    this.renderTimes = 0;
    this.completed = false;
  }

  sendBuffer(name: keyof BufferDescriptors, buffer: Buffer) {
    const { gl } = this;
    this.buffers[name] = buffer.createWebGLBuffer(gl);
    gl.bufferData(gl.SHADER_STORAGE_BUFFER, buffer.buffer, gl.STATIC_COPY);
    this.buffers[name]!.length = buffer.buffer.byteLength / 4;
  }

  sendStatsBuffer() {
    this.sendBuffer("stats", this.stats.buffer);
  }

  sendWorldBuffer() {
    if (!this.#world) return;

    // create and bind buffers
    const { gl } = this;

    for (const [name, buffer] of Object.entries(this.#world.buffers) as [
      keyof Buffers,
      Buffer
    ][]) {
      this.sendBuffer(name, buffer);
    }
  }

  render() {
    if (!this.#world || this.completed) return;

    const gl = this.gl;

    this.gl.useProgram(this.renderProgram);

    this.gl.uniform1f(this.uniforms.uSeed, Math.random());
    this.gl.uniform1i(this.uniforms.uRenderTimes, this.renderTimes);
    this.gl.uniform3f(
      this.uniforms.uAmbient,
      this.#world.ambient.r,
      this.#world.ambient.g,
      this.#world.ambient.b
    );

    // set camera matrixes
    this.gl.uniformMatrix4fv(
      this.uniforms.uViewInverse,
      false,
      this.#world.camera.invertView
    );
    this.gl.uniformMatrix4fv(
      this.uniforms.uProjectionInverse,
      false,
      this.#world.camera.invertPerspective
    );

    // reset diff to 0
    this.gl.bindBuffer(
      this.gl.SHADER_STORAGE_BUFFER,
      this.buffers.stats!.buffer
    );

    this.stats.reset();

    // for fps
    this.stats.prev = performance.now();

    this.gl.bufferSubData(
      this.gl.SHADER_STORAGE_BUFFER,
      0,
      this.stats.buffer.buffer
    );

    // dispatch compute work group number
    this.gl.dispatchCompute(this.width / LOCAL_X, this.height / LOCAL_Y, 1);

    // read the diff
    this.gl.getBufferSubData(
      this.gl.SHADER_STORAGE_BUFFER,
      0,
      this.stats.buffer.buffer
    );

    this.stats.reduce();

    // wait
    this.gl.memoryBarrier(
      this.gl.TEXTURE_FETCH_BARRIER_BIT | this.gl.BUFFER_UPDATE_BARRIER_BIT
    );

    this.stats.delta = performance.now() - this.stats.prev;

    // When the difference between frame is small enough, the image is completed.
    if (this.stats.diff < this.width * this.height * 0.0000001) {
      console.log("complete with frame difference:", this.stats.diff);
      this.completed = true;
    }

    this.gl.useProgram(this.blitProgram);
    // dispatch compute work group number
    this.gl.dispatchCompute(this.width / LOCAL_X, this.height / LOCAL_Y, 1);
    this.gl.memoryBarrier(this.gl.TEXTURE_FETCH_BARRIER_BIT);

    // show computed texture to Canvas
    this.gl.blitFramebuffer(
      0,
      0,
      this.width,
      this.height,
      0,
      0,
      this.width,
      this.height,
      this.gl.COLOR_BUFFER_BIT,
      this.gl.NEAREST
    );

    this.renderTimes++;
  }
}
