import { mat4 } from "gl-matrix";
import Material from "../material";
import BaseObject from "./base";
import Color from "../color";
import { ToBuffer, BuffersLength, Buffers } from "../buffer";

export type RenderCallback = (
  vertices: Float32Array,
  material: Material,
  model: mat4
) => void;

/**
 * A RenderObject would be rendered into the scene, it can have material
 */
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

  mergeMaterial(material: Material) {
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
  }

  /**
   * Freeze the object and generate a static data.
   * Frozen objects can't be updated anymore
   */
  abstract freeze(): void;

  child(name: string): RenderObject {
    return void 0 as any;
  }

  abstract clone(preserveModelMatrix: boolean): RenderObject;

  abstract bufferAppend(buffers: Buffers): void;
  abstract bufferCount(): BuffersLength;
}
