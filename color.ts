import { vec3, mat4 } from "gl-matrix";

export default class Color {
  static RED = new Color(1, 0, 0);
  static GREEN = new Color(0, 1, 0);
  static BLUE = new Color(0, 0, 1);
  static WHITE = new Color(1, 1, 1);
  static BLACK = new Color();
  static GRAY = new Color(0.8, 0.8, 0.8);

  data: vec3;
  alpha: number = 1;

  constructor(r?: number, g?: number, b?: number, a?: number) {
    this.data = [r || 0, g || 0, b || 0];
    this.alpha = a == null ? 1 : a;
  }

  get r() {
    return this.data[0];
  }
  get 0() {
    return this.data[0];
  }
  get g() {
    return this.data[1];
  }
  get 1() {
    return this.data[1];
  }
  get b() {
    return this.data[2];
  }
  get 2() {
    return this.data[2];
  }
  get a() {
    return this.alpha;
  }
  get 3() {
    return this.alpha;
  }

  setR(r: number) {
    return new Color(r, this.g, this.b, this.a);
  }

  setG(g: number) {
    return new Color(this.r, g, this.b, this.a);
  }

  setB(b: number) {
    return new Color(this.r, this.g, b, this.a);
  }

  setA(a: number) {
    return new Color(this.r, this.g, this.b, a);
  }

  mul(c: number) {
    const color = new Color();
    color.data = vec3.scale(vec3.clone(this.data), this.data, c);
    color.alpha = this.alpha;

    return color;
  }
}
