import { vec3, mat4 } from "gl-matrix";
import BaseObject from "./base";
import Primitive from "./primitive";

export class BoundingBox extends BaseObject {
  max: vec3;
  min: vec3;

  constructor(object: Primitive) {
    super(`bounding-box-${object.name}`);
    this.modelMatrix = object.modelMatrix;

    this.max = [-Infinity, -Infinity, -Infinity];
    this.min = [Infinity, Infinity, Infinity];

    for (const p of object.rawPoints) {
      for (let i = 0; i < 3; i++) {
        if (p.location[i] > this.max[i]) {
          this.max[i] = p.location[i];
        }
        if (p.location[i] < this.min[i]) {
          this.min[i] = p.location[i];
        }
      }
    }
  }
}
