import { mat4 } from "gl-matrix";

const toRad = (angle: number) => (angle / 180) * Math.PI;

export default abstract class BaseObject {
  name: string;
  modelMatrix = mat4.create();

  animateMatrix: (time: number, object: BaseObject) => void;

  constructor(name: string) {
    this.name = name;
  }

  setName(name: string) {
    this.name = name;
    return this;
  }

  animate(fn: (time: number, object: BaseObject) => void) {
    this.animateMatrix = fn;
    return this;
  }

  setRotate(angle: number, x: number, y: number, z: number) {
    mat4.identity(this.modelMatrix);
    mat4.rotate(this.modelMatrix, this.modelMatrix, toRad(angle), [x, y, z]);
    return this;
  }

  setTranslate(x: number, y: number, z: number) {
    mat4.identity(this.modelMatrix);
    mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]);
    return this;
  }

  setScale(x: number, y?: number, z?: number) {
    if (y == null || z == null) {
      y = z = x;
    }

    mat4.identity(this.modelMatrix);
    mat4.scale(this.modelMatrix, this.modelMatrix, [x, y, z]);

    return this;
  }

  rotate(angle: number, x: number, y: number, z: number) {
    mat4.rotate(this.modelMatrix, this.modelMatrix, toRad(angle), [x, y, z]);
    return this;
  }

  translate(x: number, y: number, z: number) {
    mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]);
    return this;
  }

  scale(x: number, y?: number, z?: number) {
    if (y == null || z == null) {
      y = z = x;
    }

    mat4.scale(this.modelMatrix, this.modelMatrix, [x, y, z]);

    return this;
  }
}
