import { mat4 } from "gl-matrix";
import Material from "../material";
import BaseObject from "./base";
import Color from "../color";

export type RenderCallback = (
  vertices: Float32Array,
  material: Material,
  model: mat4
) => void;

export type RenderObjectBuffers = {
  meshes: RenderObjectBuffer<ArrayBuffer>;
  vertices: RenderObjectBuffer<Float32Array>;
  slabs: RenderObjectBuffer<Float32Array>;
};

export type RenderObjectBuffer<T> = {
  buffer: T;
  offset: number;
};

export default abstract class RenderObject extends BaseObject {
  parent: RenderObject;
  material: Material;

  constructor(name: string) {
    super(name);
    this.material = new Material();
  }

  setColor(color: Color) {
    this.material.setColor(color);
    return this;
  }

  setTexture(texture: number) {
    this.material.setTexture(texture);
    return this;
  }

  setSpecular(specular: Color) {
    this.material.setSpecular(specular);
    return this;
  }

  setSpecularExponent(exp: number) {
    this.material.setSpecularExponent(exp);
    return this;
  }

  setRefraction(refraction: Color) {
    this.material.setRefraction(refraction);
    return this;
  }

  setMaterial(material: Material) {
    this.material = material;
    return this;
  }

  /**
   * Create data describing the render object.
   */
  abstract createData(buffers: RenderObjectBuffers): void;

  abstract render(
    cb: RenderCallback,
    material: Material | void,
    time: number
  ): void;
  abstract render(
    cb: RenderCallback,
    material: Material,
    matrix: mat4,
    time: number
  ): void;

  freeze(material: Material) {
    material = this.material.merge(material);

    if (
      !(
        material.color &&
        material.specularExponent &&
        material.specular != null
      )
    ) {
      throw new Error(
        "No material properties found. Did you forget to freeze the world with a base material?"
      );
    }

    this.material = material;
    return [-1, -1, -1] as [number, number, number];
  }

  child(name: string): RenderObject {
    return void 0 as any;
  }

  abstract clone(preserveModelMatrix: boolean): RenderObject;
}
