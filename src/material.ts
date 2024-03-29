import Color from "./color";

export default class Material {
  texture?: number;
  specularExponent?: number;
  color?: Color;
  refraction?: Color;
  private _specular?: Color;
  private specularFn?: (diffuse: Color) => Color;

  static MIRROR = 1000 ** 10;

  get specular(): Color | undefined {
    if (this._specular) {
      return this._specular;
    } else if (this.specularFn) {
      return this.color && this.specularFn(this.color);
    }
  }

  setColor(color: Color): this {
    this.color = color;
    return this;
  }

  setTexture(textureId: number): this {
    this.texture = textureId;
    return this;
  }

  setRefraction(refraction: Color): this {
    this.refraction = refraction;
    return this;
  }

  setSpecular(specular: Color | ((color: Color) => Color)): this {
    if (specular instanceof Color) {
      this._specular = specular;
    } else {
      this.specularFn = specular;
    }
    return this;
  }

  setSpecularExponent(e: number): this {
    if (e <= 0) {
      throw new Error("Specular Exponent must be larger than 0");
    }
    this.specularExponent = e;
    return this;
  }

  merge(mat?: this): this {
    if (mat) {
      return Object.assign(new Material(), mat, this);
    } else {
      return this;
    }
  }
}
