import { mat4 } from "gl-matrix";
import type { ToBuffer, BuffersLength, Buffers } from "../buffer";

const toRad = (angle: number) => (angle / 180) * Math.PI;

/**
 * A BaseObject has only the basic location information
 */
export default abstract class BaseObject implements ToBuffer {
  name: string;
  modelMatrix = mat4.create();

  animateMatrix?: (time: number, object: BaseObject) => void;

  constructor(name: string) {
    this.name = name;
  }

  setName(name: string): this {
    this.name = name;
    return this;
  }

  animate(fn: (time: number, object: BaseObject) => void): this {
    this.animateMatrix = fn;
    return this;
  }

  setRotate(angle: number, x: number, y: number, z: number): this {
    mat4.identity(this.modelMatrix);
    mat4.rotate(this.modelMatrix, this.modelMatrix, toRad(angle), [x, y, z]);
    return this;
  }

  setTranslate(x: number, y: number, z: number): this {
    mat4.identity(this.modelMatrix);
    mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]);
    return this;
  }

  setScale(x: number, y?: number, z?: number): this {
    if (y == null || z == null) {
      y = z = x;
    }

    mat4.identity(this.modelMatrix);
    mat4.scale(this.modelMatrix, this.modelMatrix, [x, y, z]);

    return this;
  }

  rotate(angle: number, x: number, y: number, z: number): this {
    mat4.rotate(this.modelMatrix, this.modelMatrix, toRad(angle), [x, y, z]);
    return this;
  }

  translate(x: number, y: number, z: number): this {
    mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]);
    return this;
  }

  scale(x: number, y?: number, z?: number): this {
    if (y == null || z == null) {
      y = z = x;
    }

    mat4.scale(this.modelMatrix, this.modelMatrix, [x, y, z]);

    return this;
  }

  abstract bufferAppend(buffers: Buffers): void;
  abstract bufferCount(): BuffersLength;
}
