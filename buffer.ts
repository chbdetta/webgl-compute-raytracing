import { Slab } from "./object/bounding-box";
import Color from "color";
import { vec3 } from "gl-matrix";

/**
 * ToBuffer denotes the object that can serialize itself
 * into different webgl buffer object
 */
export interface ToBuffer {
  bufferCount(): BuffersLength;
  bufferAppend(buffer: Buffers): void;
}

export interface BuffersLength {
  mesh?: number;
  vertex?: number;
  slab?: number;
  light?: number;
}

export interface Buffers {
  mesh: MeshBuffer;
  vertex: VertexBuffer;
  slab: SlabBuffer;
  light: LightBuffer;
}

export interface Buffer {
  buffer: ArrayBuffer;
  append(obj: any): void;
}

export class Buffer implements Buffer {
  cursor = 0;
  buffer: ArrayBuffer;
  bindingPoint: number;
  i32: Int32Array;
  f32: Float32Array;

  constructor(bindingPoint: number, length: number) {
    // we only use Int32 and Float32, so 4 bytes for each item
    this.buffer = new ArrayBuffer(length * 4);
    this.i32 = new Int32Array(this.buffer);
    this.f32 = new Float32Array(this.buffer);
    this.bindingPoint = bindingPoint;
  }

  createWebGLBuffer(gl: WebGL2Context) {
    const id = gl.createBuffer();

    gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, id);
    // Important! Tell the buffer to bind to a specific binding point
    gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, this.bindingPoint, id);

    return {
      name,
      buffer: id as WebGLBuffer,
      length: 0,
    };
  }

  appendF(n: number) {
    this.f32[this.cursor++] = n;
  }
  appendI(n: number) {
    this.i32[this.cursor++] = n;
  }
  pad(n: number) {
    this.cursor += n;
  }
}

export class VertexBuffer extends Buffer {
  static bytes = 4;

  constructor(length: number) {
    super(1, length);
  }

  append(v: vec3) {
    // copy vertices data to the buffer
    this.appendF(v[0]);
    this.appendF(v[1]);
    this.appendF(v[2]);
    this.pad(1);
  }
}

export class MeshBuffer extends Buffer {
  static bytes = 20;

  constructor(length: number) {
    super(2, length);
  }

  append(meshData: {
    faceCount: number;
    // the starting index in the vertex buffer
    vertexOffset: number;
    slabCount?: number;
    slabOffset?: number;
    specularExponent: number;
    diffuseColor: Color;
    specularColor: Color;
    refractionColor: Color;
  }) {
    // TODO: define the structure here and generate the glsl struct string
    const intBuffer = new Int32Array(this.buffer);
    const floatBuffer = new Float32Array(this.buffer);

    // padding required: https://twitter.com/9ballsyndrome/status/1178039885090848770
    // under std430 layout, a struct in an array use the largest alignment of its member.
    // int face_count;
    this.appendI(meshData.faceCount);
    // int offset;
    this.appendI(meshData.vertexOffset);
    // int slab_count
    this.appendI(meshData.slabCount ?? 0);
    // int slab_offset;
    this.appendI(meshData.slabOffset ?? 0);
    // alpha
    this.appendF(meshData.specularExponent ?? 100);
    // paddings
    this.pad(3);

    // vec3 color;
    this.appendF(meshData.diffuseColor?.r ?? 0);
    this.appendF(meshData.diffuseColor?.g ?? 0);
    this.appendF(meshData.diffuseColor?.b ?? 0);
    // padding
    this.pad(1);
    // vec3 specular
    this.appendF(meshData.specularColor?.r ?? 0);
    this.appendF(meshData.specularColor?.g ?? 0);
    this.appendF(meshData.specularColor?.b ?? 0);
    // padding
    this.pad(1);
    // vec3 refraction;
    this.appendF(meshData.refractionColor?.r ?? 0);
    this.appendF(meshData.refractionColor?.g ?? 0);
    this.appendF(meshData.refractionColor?.b ?? 0);
    // padding
    this.pad(1);
  }
}

// for the bounding box
export class SlabBuffer extends Buffer {
  static bytes = 8;

  constructor(length: number) {
    super(3, length);
  }

  append(slab: Slab) {
    this.appendF(slab.normal[0]);
    this.appendF(slab.normal[1]);
    this.appendF(slab.normal[2]);
    this.appendF(slab.near);
    this.appendF(slab.far);
    this.pad(3);
  }
}

export class LightBuffer extends Buffer {
  static bytes = 8;

  constructor(length: number) {
    super(4, length);
  }

  append(lightData: {
    position: vec3;
    color: Color;
    intensity: number;
    radius: number;
  }) {
    this.appendF(lightData.position[0]);
    this.appendF(lightData.position[1]);
    this.appendF(lightData.position[2]);
    this.appendF(lightData.radius);
    this.appendF(lightData.color[0]);
    this.appendF(lightData.color[1]);
    this.appendF(lightData.color[2]);
    this.appendF(lightData.intensity);
  }
}

export class StatsBuffer extends Buffer {
  constructor(length: number) {
    super(0, length);
  }
}
