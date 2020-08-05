// reference https://github.com/oktomus/web-experiments/blob/1e2d3bfbe6/webgl-compute/toy-raytracer/js/renderer.js

import computeShader from "./render.comp";
import blitShader from "./blit.comp";
import World from "./world";
import Stats from "./stats";
import Camera from "./camera";

// 2D local invocation
const LOCAL_X = 16;
const LOCAL_Y = 16;

type Buffer = {
  name: string;
  length: number;
  buffer: WebGLBuffer;
};

export default class Renderer {
  renderTimes: number = 0;

  stats: Stats;

  gl: WebGL2Context;
  renderProgram: WebGLProgram;
  blitProgram: WebGLProgram;
  width: number;
  height: number;
  uniforms: {
    [name: string]: WebGLUniformLocation;
  };
  buffers: {
    vertices: Buffer | null;
    meshes: Buffer | null;
    slabs: Buffer | null;
    stats: Buffer | null;
  } = {
    vertices: null,
    meshes: null,
    slabs: null,
    stats: null,
  };

  completed: boolean;

  frameTexture: WebGLTexture;
  accumulatedTexture: WebGLTexture;

  #world: World | null;

  get world() {
    return this.#world;
  }

  set world(world: World | null) {
    this.#world = world;
    if (this.#world) {
      this.#world.camera.addListener(Camera.CHANGE, () => {
        this.renderTimes = 0;
        this.completed = false;
      });

      this.#world.camera.update();

      this.sendBuffer();
    }
  }

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.gl = canvas.getContext("webgl2-compute", { antialias: false }) as any;

    this.width = Math.ceil(width / LOCAL_X) * LOCAL_X;
    this.height = Math.ceil(height / LOCAL_Y) * LOCAL_Y;

    canvas.width = this.width;
    canvas.height = this.height;

    if (!this.gl) {
      throw new Error("can not get webgl2 compute context");
    }

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

    return [program, blitProgram];
  }

  sendBuffer() {
    if (!this.#world) return;

    const buffers: ["stats", "vertices", "meshes", "slabs"] = [
      "stats",
      "vertices",
      "meshes",
      "slabs",
    ];

    // create and bind buffers
    const { gl } = this;

    for (const name of buffers) {
      const id = gl.createBuffer();
      const binding = buffers.indexOf(name);

      this.buffers[name] = {
        name,
        buffer: id as WebGLBuffer,
        length: 0,
      };

      gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, id);
      // Important! Tell the buffer to bind to a specific binding point
      gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, binding, id);

      let data;
      let mode;
      if (name === "stats") {
        data = this.stats.buffer;
        mode = gl.DYNAMIC_DRAW;
      } else {
        data = this.#world[name];
        mode = gl.STATIC_COPY;
      }
      gl.bufferData(gl.SHADER_STORAGE_BUFFER, data, mode);
      this.buffers[name]!.length = data.byteLength / 4;
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

    this.gl.bufferSubData(this.gl.SHADER_STORAGE_BUFFER, 0, this.stats.buffer);

    // dispatch compute work group number
    this.gl.dispatchCompute(this.width / LOCAL_X, this.height / LOCAL_Y, 1);

    // read the diff
    this.gl.getBufferSubData(
      this.gl.SHADER_STORAGE_BUFFER,
      0,
      this.stats.buffer
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
