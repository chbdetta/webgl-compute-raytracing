import { vec3, mat4 } from "gl-matrix";
import BaseObject from "./base";
import Primitive from "./primitive";
import { BuffersLength, Buffers } from "../buffer";

export class Slab extends BaseObject {
  far: number;
  near: number;
  normal: vec3;

  constructor(object: Primitive, normal: vec3) {
    super(`Slab-${object.name}`);
    this.modelMatrix = object.modelMatrix;

    this.far = -Infinity;
    this.near = Infinity;
    this.normal = normal;

    for (const p of object.rawPoints) {
      const d = vec3.dot(p.location, normal);
      this.near = Math.min(this.near, d);
      this.far = Math.max(this.far, d);
    }
  }

  bufferAppend(buffers: Buffers) {
    buffers.slab.append(this);
  }

  bufferCount(): BuffersLength {
    return {
      slab: 8,
    };
  }
}
