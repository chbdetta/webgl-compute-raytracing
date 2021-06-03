import { vec3 } from "gl-matrix";

export default class Color {
  static RED = new Color(1, 0, 0);
  static GREEN = new Color(0, 1, 0);
  static BLUE = new Color(0, 0, 1);
  static WHITE = new Color(1, 1, 1);
  static BLACK = new Color();
  static GRAY = new Color(0.8, 0.8, 0.8);

  data: vec3;
  alpha = 1;

  constructor(r?: number, g?: number, b?: number, a?: number) {
    this.data = [r || 0, g || 0, b || 0];
    this.alpha = a == null ? 1 : a;
  }

  get r(): number {
    return this.data[0];
  }
  get 0(): number {
    return this.data[0];
  }
  get g(): number {
    return this.data[1];
  }
  get 1(): number {
    return this.data[1];
  }
  get b(): number {
    return this.data[2];
  }
  get 2(): number {
    return this.data[2];
  }
  get a(): number {
    return this.alpha;
  }
  get 3(): number {
    return this.alpha;
  }

  setR(r: number): Color {
    return new Color(r, this.g, this.b, this.a);
  }

  setG(g: number): Color {
    return new Color(this.r, g, this.b, this.a);
  }

  setB(b: number): Color {
    return new Color(this.r, this.g, b, this.a);
  }

  setA(a: number): Color {
    return new Color(this.r, this.g, this.b, a);
  }

  mul(c: number): Color {
    const color = new Color();
    color.data = vec3.scale(vec3.clone(this.data), this.data, c);
    color.alpha = this.alpha;

    return color;
  }
}
