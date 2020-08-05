import { mat4, vec3 } from "gl-matrix";
import { Face, PointFactory, UVFactory } from "../point";
import Material from "../material";
import RenderObject, { RenderCallback, RenderObjectBuffers } from "./render";
import Primitive from "./primitive";

export { RenderCallback };

// A virtual object that doesn't have any vertices
export class Group extends RenderObject {
  children: RenderObject[] = [];

  static count = 0;

  constructor(name: string = `Group ${Group.count++}`) {
    super(name);
  }

  addChild(child: RenderObject) {
    // TODO: Deal with duplicate children name
    child.parent = this as RenderObject;
    this.children.push(child);
    return this;
  }

  // Find a direct child by name
  child(name: string): RenderObject {
    // FIXME: ts won't complain and this is checked in runtime.
    return this.children.find((c) => c.name === name) as any;
  }

  render(cb: RenderCallback, material: Material, time: number): void;
  render(
    cb: RenderCallback,
    material: Material,
    matrix: mat4,
    time: number
  ): void;
  render(
    cb: RenderCallback,
    material: Material,
    matrix: mat4 | number,
    time?: number
  ) {
    let modelMatrix: mat4 | undefined = matrix as mat4;
    if (arguments.length === 3) {
      time = matrix as number;
      modelMatrix = void 0;
    }

    if (this.animateMatrix) {
      this.animateMatrix(time as number, this);
    }

    const isCascade = !!modelMatrix;

    if (isCascade && modelMatrix) {
      mat4.multiply(modelMatrix, modelMatrix, this.modelMatrix);
    } else {
      modelMatrix = this.modelMatrix;
    }

    this.children.forEach((c) =>
      c.render(
        cb,
        this.material.merge(material),
        modelMatrix as mat4,
        time as number
      )
    );

    if (isCascade) {
      mat4.invert(this.modelMatrix, this.modelMatrix);
      mat4.multiply(modelMatrix, modelMatrix, this.modelMatrix);
      mat4.invert(this.modelMatrix, this.modelMatrix);
    }
  }

  clone(preserveModelMatrix = false) {
    const s = new Group(this.name);
    s.parent = this.parent;
    s.animateMatrix = this.animateMatrix;
    // clone the shape matrix
    if (preserveModelMatrix) {
      s.modelMatrix = mat4.clone(this.modelMatrix);
    }
    // update all the direct child's parent to the cloned one
    s.children = this.children.map((c) => {
      const child = c.clone(true);
      child.parent = s;
      return child;
    });
    s.material = this.material;

    return s;
  }

  commit() {
    mat4.transpose(this.modelMatrix, this.modelMatrix);
    this.children.forEach((child) => {
      mat4.transpose(child.modelMatrix, child.modelMatrix);
      mat4.mul(child.modelMatrix, child.modelMatrix, this.modelMatrix);
      mat4.transpose(child.modelMatrix, child.modelMatrix);
    });
    mat4.identity(this.modelMatrix);
    return this;
  }

  freeze(material: Material) {
    const ret = [0, 0, 0];

    super.freeze(material);

    this.children.forEach((child) => {
      const counts = child.freeze(this.material);
      ret[0] += counts[0];
      ret[1] += counts[1];
      ret[2] += counts[2];
    });

    return ret as [number, number, number];
  }

  createData(buffers: RenderObjectBuffers) {
    for (let child of this.children) {
      child.createData(buffers);
    }
  }
}

export class Polygon extends Primitive {
  static count = 0;

  constructor(
    points: [number, number, number][],
    name: string = `Rectangle ${Rectangle.count++}`
  ) {
    if (points.length < 3) {
      throw new Error("Polygon must have a least 3 points");
    }

    const pf = new PointFactory();
    const faces = [];
    let o = pf.get(...points[0]);
    let a = pf.get(...points[1]);
    for (const p of points.slice(2)) {
      const b = pf.get(...p);
      faces.push(new Face(o, a, b));

      a = b;
    }

    super(name, faces, pf);
  }
}

export class Rectangle extends Polygon {
  static count = 0;

  constructor(name: string = `Rectangle ${Rectangle.count++}`) {
    super(
      [
        [-1, -1, 0],
        [1, -1, 0],
        [1, 1, 0],
        [-1, 1, 0],
      ],
      name
    );
  }
}

export class Cube extends Primitive {
  static count = 0;

  constructor(name: string = `Cube ${Cube.count++}`) {
    const pf = new PointFactory();
    const uv = new UVFactory();

    const a = pf.get(-0.5, -0.5, 0.5);
    const b = pf.get(-0.5, -0.5, -0.5);
    const c = pf.get(0.5, -0.5, -0.5);
    const d = pf.get(0.5, -0.5, 0.5);
    const e = pf.get(-0.5, 0.5, 0.5);
    const h = pf.get(0.5, 0.5, 0.5);
    const g = pf.get(0.5, 0.5, -0.5);
    const f = pf.get(-0.5, 0.5, -0.5);

    const u = uv.get(0, 0);
    const v = uv.get(0, 1);
    const w = uv.get(1, 1);
    const x = uv.get(1, 0);

    const t = [u, v, w, u, w, x];

    // prettier-ignore
    const faces = [
      new Face(a, b, c, u, v, w, true),
      new Face(a, c, d, u, w, x, true),
      new Face(d, c, g, u, v, w, true),
      new Face(d, g, h, u, w, x, true),
      new Face(h, g, f, u, v, w, true),
      new Face(h, f, e, u, w, x, true),
      new Face(e, f, b, u, v, w, true),
      new Face(e, b, a, u, w, x, true),
      new Face(b, f, g, u, v, w, true),
      new Face(b, g, c, u, w, x, true),
      new Face(e, a, d, u, v, w, true),
      new Face(e, d, h, u, w, x, true)
    ];

    super(name, faces, pf);
  }
}

const rounded = (fn: (x: number) => number) => (x: number) => {
  if (parseFloat(fn(x).toFixed(10)) === 0) {
    return 0;
  } else {
    return fn(x);
  }
};

const cos = rounded(Math.cos);
const sin = rounded(Math.sin);

const meshBytes = 24;

export class Cylinder extends Primitive {
  static count = 0;

  constructor(segments = 16, name: string = `Cylinder ${Cylinder.count++}`) {
    if (segments < 3) {
      console.warn("The segments of a cylinder should be at least 3");
      segments = 3;
    }

    const pf = new PointFactory();

    const r = 0.5;
    const r0 = pf.get(0, 0.5, 0);
    const r1 = pf.get(0, -0.5, 0);

    const faces: Face[] = [];

    let prev1 = pf.get(0.5, 0.5, 0);
    let prev2 = pf.get(0.5, -0.5, 0);

    for (let i = 1; i <= segments; i++) {
      const theta = ((2 * Math.PI) / segments) * i;
      const cur1 = pf.get(r * cos(theta), 0.5, r * sin(theta));
      const cur2 = pf.get(r * cos(theta), -0.5, r * sin(theta));

      // prettier-ignore
      faces.splice((i - 1) * 12, 0,
        new Face(r0, cur1, prev1, true),
        new Face(r1, prev2, cur2, true),
        new Face(prev2, prev1, cur1),
        new Face(prev2, cur1, cur2)
      );

      prev1 = cur1;
      prev2 = cur2;
    }

    super(name, faces, pf);
  }
}

export class Tetrahedron extends Primitive {
  static count = 0;
  constructor(name: string = `Tetranhedron ${Tetrahedron.count++}`) {
    const pf = new PointFactory();

    const a = pf.get(-0.5, -1 / (2 * Math.sqrt(2)), 0);
    const b = pf.get(0.5, -1 / (2 * Math.sqrt(2)), 0);
    const c = pf.get(0, 1 / (2 * Math.sqrt(2)), -0.5);
    const d = pf.get(0, 1 / (2 * Math.sqrt(2)), 0.5);

    super(
      name,
      [
        new Face(a, c, b, true),
        new Face(b, c, d, true),
        new Face(b, d, a, true),
        new Face(a, d, c, true),
      ],
      pf
    );

    // this.rotate(
    //   (Math.atan(2 / Math.sqrt(2)) / Math.PI) * 180,
    //   1,
    //   0,
    //   0
    // ).commit();
  }
}

export class Sphere extends RenderObject {
  static count = 0;
  origin: vec3;
  normal: vec3;

  constructor(name = `Sphere ${Sphere.count++}`) {
    super(name);

    this.origin = [0, 0, 0];
    this.normal = [0, 0.5, 0];
  }

  render() {
    // pass
  }

  createData({ vertices: v, meshes: m }: RenderObjectBuffers) {
    const verticesStart = v.offset;

    v.buffer[v.offset++] = this.origin[0];
    v.buffer[v.offset++] = this.origin[1];
    v.buffer[v.offset++] = this.origin[2];
    v.offset++;
    v.buffer[v.offset++] = this.normal[0];
    v.buffer[v.offset++] = this.normal[1];
    v.buffer[v.offset++] = this.normal[2];
    v.offset++;

    const intBuffer = new Int32Array(m.buffer);
    const floatBuffer = new Float32Array(m.buffer);

    // padding required: https://twitter.com/9ballsyndrome/status/1178039885090848770
    // under std430 layout, a struct in an array use the largest alignment of its member.
    // we use face_count = -1 to denote a parameterized shape
    intBuffer[m.offset++] = -1;
    // int m.offset;
    intBuffer[m.offset++] = verticesStart / 4;
    // No bounding box for a sphere
    m.offset += 2;
    // alpha
    floatBuffer[m.offset++] = this.material.specularExponent || 100;
    // paddings
    m.offset += 3;

    // vec3 color;
    floatBuffer[m.offset++] = this.material.color?.r || 0;
    floatBuffer[m.offset++] = this.material.color?.g || 0;
    floatBuffer[m.offset++] = this.material.color?.b || 0;
    // padding
    m.offset++;
    // vec3 specular
    floatBuffer[m.offset++] = this.material.specular?.r || 0;
    floatBuffer[m.offset++] = this.material.specular?.g || 0;
    floatBuffer[m.offset++] = this.material.specular?.b || 0;
    // padding
    m.offset++;
    // vec3 refraction;
    floatBuffer[m.offset++] = this.material.refraction?.r || 0;
    floatBuffer[m.offset++] = this.material.refraction?.g || 0;
    floatBuffer[m.offset++] = this.material.refraction?.b || 0;
    // padding
    m.offset++;
  }

  freeze(material: Material) {
    super.freeze(material);
    return [8, meshBytes, 0] as [number, number, number];
  }

  commit() {
    vec3.transformMat4(this.origin, this.origin, this.modelMatrix);
    vec3.transformMat4(this.normal, this.normal, this.modelMatrix);
    vec3.sub(this.normal, this.normal, this.origin);

    mat4.invert(this.modelMatrix, this.modelMatrix);
    mat4.transpose(this.modelMatrix, this.modelMatrix);

    mat4.identity(this.modelMatrix);
    return this;
  }

  clone() {
    const s = new Sphere();
    s.origin = vec3.clone(this.origin);
    s.normal = vec3.clone(this.normal);

    return s;
  }
}
