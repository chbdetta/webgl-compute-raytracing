import { Slab } from "./object/bounding-box";
import Color from "color";

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
  light?: LightBuffer;
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
  bindingPoint: number;

  constructor(bindingPoint: number) {
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
}

export class VertexBuffer extends Buffer {
  buffer: Float32Array;
  cursor = 0;

  constructor(length: number) {
    super(1);
    this.buffer = new Float32Array(length);
  }

  append(vertices: Float32Array) {
    // copy vertices data to the buffer
    for (const v of vertices) {
      this.buffer[this.cursor++] = v;
    }
  }
}

export class MeshBuffer extends Buffer {
  static byteLength = 20;

  buffer: ArrayBuffer;
  cursor = 0;

  constructor(length: number) {
    super(2);
    this.buffer = new ArrayBuffer(length);
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
    intBuffer[this.cursor++] = meshData.faceCount;
    // int offset;
    intBuffer[this.cursor++] = meshData.vertexOffset;
    // int slab_count
    intBuffer[this.cursor++] = meshData.slabCount ?? 0;
    // int slab_offset;
    intBuffer[this.cursor++] = meshData.slabOffset ?? 0;
    // alpha
    floatBuffer[this.cursor++] = meshData.specularExponent || 100;
    // paddings
    this.cursor += 3;

    // vec3 color;
    floatBuffer[this.cursor++] = meshData.diffuseColor?.r || 0;
    floatBuffer[this.cursor++] = meshData.diffuseColor?.g || 0;
    floatBuffer[this.cursor++] = meshData.diffuseColor?.b || 0;
    // padding
    this.cursor++;
    // vec3 specular
    floatBuffer[this.cursor++] = meshData.specularColor?.r || 0;
    floatBuffer[this.cursor++] = meshData.specularColor?.g || 0;
    floatBuffer[this.cursor++] = meshData.specularColor?.b || 0;
    // padding
    this.cursor++;
    // vec3 refraction;
    floatBuffer[this.cursor++] = meshData.refractionColor?.r || 0;
    floatBuffer[this.cursor++] = meshData.refractionColor?.g || 0;
    floatBuffer[this.cursor++] = meshData.refractionColor?.b || 0;
    // padding
    this.cursor++;
  }
}

// for the bounding box
export class SlabBuffer extends Buffer {
  buffer: Float32Array;
  cursor = 0;

  constructor(length: number) {
    super(3);
    this.buffer = new Float32Array(length);
  }

  append(slab: Slab) {
    this.buffer[this.cursor++] = slab.normal[0];
    this.buffer[this.cursor++] = slab.normal[1];
    this.buffer[this.cursor++] = slab.normal[2];
    this.buffer[this.cursor++] = slab.near;
    this.buffer[this.cursor++] = slab.far;
    this.cursor += 3;
  }
}

export class LightBuffer extends Buffer {
  buffer: ArrayBuffer;

  constructor(length: number) {
    super(4);
    this.buffer = new ArrayBuffer(length);
  }

  append(obj: {}) {}
}

export class StatsBuffer extends Buffer {
  buffer: Float32Array;

  constructor(length: number) {
    super(0);
    this.buffer = new Float32Array(length);
  }
}
