import { mat4, vec3 } from "gl-matrix";
import { Face, PointFactory, UVFactory } from "../../point";
import Material from "../material";
import RenderObject, { type RenderCallback } from "./render";
import Primitive from "./primitive";
import type { BuffersLength, Buffers } from "../buffer";

export type { RenderCallback };

// A virtual object that doesn't have any vertices
export class Group extends RenderObject {
  children: RenderObject[] = [];

  static count = 0;

  constructor(name = `Group ${Group.count++}`) {
    super(name);
  }

  addChild(child: RenderObject): this {
    // TODO: Deal with duplicate children name
    child.parent = this;
    this.children.push(child);
    return this;
  }

  // Find a direct child by name
  child(name: string): RenderObject | undefined {
    return this.children.find((c) => c.name === name);
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
  ): void {
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

  clone(preserveModelMatrix = false): Group {
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

  freeze(): void {
    // do nothing for a group
  }

  commit(): this {
    mat4.transpose(this.modelMatrix, this.modelMatrix);
    this.children.forEach((child) => {
      mat4.transpose(child.modelMatrix, child.modelMatrix);
      mat4.mul(child.modelMatrix, child.modelMatrix, this.modelMatrix);
      mat4.transpose(child.modelMatrix, child.modelMatrix);
    });
    mat4.identity(this.modelMatrix);
    return this;
  }

  mergeMaterial(material: Material): void {
    super.mergeMaterial(material);

    this.children.forEach((child) => {
      child.mergeMaterial(material);
    });
  }

  bufferCount(): BuffersLength {
    const ret = {
      vertex: 0,
      mesh: 0,
      slab: 0,
    } satisfies BuffersLength;

    this.children.forEach((child) => {
      const counts = child.bufferCount();
      ret.vertex += counts.vertex ?? 0;
      ret.mesh += counts.mesh ?? 0;
      ret.slab += counts.slab ?? 0;
    });

    return ret;
  }

  bufferAppend(buffers: Buffers): void {
    for (const child of this.children) {
      child.bufferAppend(buffers);
    }
  }
}

export class Polygon extends Primitive {
  static count = 0;

  constructor(
    points: [number, number, number][],
    name = `Rectangle ${Rectangle.count++}`
  ) {
    if (points.length < 3) {
      throw new Error("Polygon must have a least 3 points");
    }

    const pf = new PointFactory();
    const faces = [];
    const o = pf.get(...points[0]);
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

  constructor(name = `Rectangle ${Rectangle.count++}`) {
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

  constructor(name = `Cube ${Cube.count++}`) {
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

    // const t = [u, v, w, u, w, x];

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
      new Face(e, d, h, u, w, x, true),
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

export class Cylinder extends Primitive {
  static count = 0;

  constructor(segments = 16, name = `Cylinder ${Cylinder.count++}`) {
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
  constructor(name = `Tetranhedron ${Tetrahedron.count++}`) {
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

function sphereCoord(r: number, theta: number, phi: number): vec3 {
  return [
    r * Math.cos(theta) * Math.cos(phi),
    r * Math.cos(theta) * Math.sin(phi),
    r * Math.sin(theta),
  ];
}

export class Sphere extends Primitive {
  static count = 0;
  constructor(name = `Sphere ${Sphere.count++}`, { segments = 6 } = {}) {
    const faces: Face[] = [];
    const r = 0.5;

    const pf = new PointFactory();

    const prevCol = [];
    for (let j = 0; j <= segments; j++) {
      const theta = j * (Math.PI / segments) - Math.PI / 2;

      prevCol.push(pf.get(sphereCoord(r, theta, 0)));
    }

    for (let i = 1; i <= segments * 2; i++) {
      const phi = i * ((2 * Math.PI) / segments / 2);
      let prev = pf.get(sphereCoord(r, -Math.PI / 2, phi));
      for (let j = 1; j <= segments; j++) {
        const theta = j * (Math.PI / segments) - Math.PI / 2;
        const cur = pf.get(sphereCoord(r, theta, phi));
        // prettier-ignore
        faces.splice((i - 1) * (j - 1) * 2, 0, new Face(prevCol[j - 1], cur, prevCol[j]), new Face(prevCol[j - 1], prev, cur));

        prevCol[j - 1] = prev;
        prev = cur;
      }
    }

    super(name, faces, pf);
  }
}
