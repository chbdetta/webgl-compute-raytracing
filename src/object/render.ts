import { mat4 } from "gl-matrix";
import Material from "../material";
import BaseObject from "./base";
import Color from "../color";
import { BuffersLength, Buffers } from "../buffer";

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

  setColor(color: Color): this {
    this.material.setColor(color);
    return this;
  }

  setTexture(texture: number): this {
    this.material.setTexture(texture);
    return this;
  }

  setSpecular(specular: Color): this {
    this.material.setSpecular(specular);
    return this;
  }

  setSpecularExponent(exp: number): this {
    this.material.setSpecularExponent(exp);
    return this;
  }

  setRefraction(refraction: Color): this {
    this.material.setRefraction(refraction);
    return this;
  }

  setMaterial(material: Material): this {
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

  mergeMaterial(material: Material): void {
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

  child(name: string): RenderObject | undefined {
    return undefined;
  }

  abstract clone(preserveModelMatrix: boolean): RenderObject;

  abstract bufferAppend(buffers: Buffers): void;
  abstract bufferCount(): BuffersLength;
}
