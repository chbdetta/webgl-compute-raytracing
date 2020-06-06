import { mat4, vec3 } from "gl-matrix";
import { Face, PointData, PointFactory, UVFactory } from "./point";
import Color from "./color";
import Material from "./material";

const toRad = (angle: number) => (angle / 180) * Math.PI;

export type RenderCallback = (
  vertices: Float32Array,
  material: Material,
  model: mat4
) => void;

export abstract class BaseObject {
  name: string;
  modelMatrix = mat4.create();
  bufferOffset?: number;

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

  abstract freeze(baseMaterial: Material): [number, number];
  abstract getVertices(vertices: Float32Array, offset: number): number;
  abstract getMeshes(meshes: ArrayBuffer, offset: number): number;
  abstract commit(): BaseObject;
}

export abstract class RenderObject extends BaseObject {
  parent: RenderObject;
  material: Material;

  constructor(name: string) {
    super(name);
    this.material = new Material();
  }

  setEmission(color: Color) {
    this.material.setEmission(color);
    return this;
  }

  setEmissionIntensity(n: number) {
    this.material.setEmissionIntensity(n);
    return this;
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
    return [-1, -1] as [number, number];
  }

  child(name: string): RenderObject {
    return void 0 as any;
  }
}

/**
 * We make some assumptions to improve the performance
 * 1. The vertices number of a shape is invariant.
 * 2. The
 */
class Primitive extends RenderObject {
  // The point coordinate information
  // It contains location vertices and uv coordinates
  data: Float32Array;
  // The id of a texture
  faces: Readonly<Face[]>;
  rawPoints: PointFactory;

  constructor(name: string, faces: Readonly<Face[]>, pf: PointFactory) {
    super(name);

    this.faces = faces;
    this.rawPoints = pf;
  }

  invertNormal() {
    const mat = mat4.create();
    mat4.scale(mat, mat, [-1, -1, -1]);

    if (this.rawPoints && this.faces) {
      for (let point of this.rawPoints) {
        point.transformNormal(mat);
      }

      for (let face of this.faces) {
        face.transformNormal(mat);
      }
    } else {
      console.warn("Modifying the object after freezing");
    }

    return this;
  }

  clone(preserveModelMatrix = false) {
    if (!this.faces) {
      console.warn("Modifying the object after freezing");
      return this;
    }

    // The faces array can not be shared because they are modified in commit()
    const pf = new PointFactory();
    const faces = this.faces.map((face) => face.clone(pf));

    const s = new Primitive(this.name, faces, pf);
    s.animateMatrix = this.animateMatrix;
    // We don't clone the model matrix by default so the cloning behavior is more
    // predictable.
    if (preserveModelMatrix) {
      s.modelMatrix = mat4.clone(this.modelMatrix);
    }

    s.material = this.material;

    return s;
  }

  /**
   * Commit the model matrix into shape matrix. Persist the change into the shape
   * itself. Remember when cloning a object, only the shapeMatrix is copied over
   * by default.
   * It should only be called during the modeling stage.
   */
  commit() {
    if (!this.faces || !this.rawPoints) {
      console.warn("Modifying the object after freezing");
      return this;
    }

    for (let point of this.rawPoints) {
      point.transform(this.modelMatrix);
    }

    mat4.invert(this.modelMatrix, this.modelMatrix);
    mat4.transpose(this.modelMatrix, this.modelMatrix);

    for (let face of this.faces) {
      face.transformNormal(this.modelMatrix);
    }

    mat4.identity(this.modelMatrix);
    return this;
  }

  freeze(material: Material) {
    if (!this.faces || !this.rawPoints) {
      console.warn("Modifying the object after freezing");
      return [0, 1] as [number, number];
    }

    const size = 4;
    const data = (this.data = new Float32Array(
      this.faces.length * Face.pointCount * size
    ));

    super.freeze(material);

    for (const [i, face] of this.faces.entries()) {
      for (let j = 0; j < 3; j++) {
        let ii = (i * Face.pointCount + j) * size;

        const p = face.point(j);
        // location
        data[ii++] = p.location[0];
        data[ii++] = p.location[1];
        data[ii++] = p.location[2];
        // padding
        ii++;
        // uv
        // data[ii++] = p.uv[0];
        // data[ii++] = p.uv[1];
      }
    }

    // 48 is the size after alignment
    return [data.length, meshBytes] as [number, number];
  }

  getVertices(vertices: Float32Array, offset: number) {
    // copy vertices data to the buffer
    // TODO: do a centralized buffer creation
    this.bufferOffset = offset / 4;
    for (let i = 0; i < this.data.length; i++) {
      vertices[offset++] = this.data[i];
    }
    return offset;
  }

  getMeshes(meshes: ArrayBuffer, offset: number) {
    if (this.bufferOffset == null) {
      throw new Error("buffer offset is not available");
    }

    const intArray = new Int32Array(meshes);
    const floatArray = new Float32Array(meshes);

    // padding required: https://twitter.com/9ballsyndrome/status/1178039885090848770
    // under std430 layout, a struct in an array use the largest alignment of its member.
    // int face_count;
    intArray[offset++] = this.faces.length;
    // int offset;
    intArray[offset++] = this.bufferOffset;
    // emission intensity
    floatArray[offset++] = this.material.emissionIntensity || 0;
    // alpha
    floatArray[offset++] = this.material.specularExponent || 100;

    // vec3 emission; // 14 Bytes but 16 Bytes alignment
    floatArray[offset++] = this.material.emission?.r || 0;
    floatArray[offset++] = this.material.emission?.g || 0;
    floatArray[offset++] = this.material.emission?.b || 0;
    // padding
    offset++;
    // vec3 color;
    floatArray[offset++] = this.material.color?.r || 0;
    floatArray[offset++] = this.material.color?.g || 0;
    floatArray[offset++] = this.material.color?.b || 0;
    // padding
    offset++;
    // vec3 specular
    floatArray[offset++] = this.material.specular?.r || 0;
    floatArray[offset++] = this.material.specular?.g || 0;
    floatArray[offset++] = this.material.specular?.b || 0;
    // padding
    offset++;

    return offset;
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
    let modelMatrix: mat4 | undefined = matrix as any;

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

    cb(this.data, this.material.merge(material), modelMatrix);

    if (isCascade) {
      mat4.invert(this.modelMatrix, this.modelMatrix);
      mat4.multiply(modelMatrix, modelMatrix, this.modelMatrix);
      mat4.invert(this.modelMatrix, this.modelMatrix);
    }
  }
}

// A virtual object that doesn't have any vertices
export class Group extends RenderObject {
  children: (Group | Primitive)[] = [];

  static count = 0;

  constructor(name: string = `Group ${Group.count++}`) {
    super(name);
  }

  addChild(child: Group | Primitive) {
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
    let n = 0;
    let m = 0;

    super.freeze(material);

    this.children.forEach((child) => {
      const counts = child.freeze(this.material);
      n += counts[0];
      m += counts[1];
    });

    return [n, m] as [number, number];
  }

  getVertices(buffer: Float32Array, offset: number) {
    for (let child of this.children) {
      offset = child.getVertices(buffer, offset);
    }
    return offset;
  }

  getMeshes(buffer: Float32Array, offset: number) {
    for (let child of this.children) {
      offset = child.getMeshes(buffer, offset);
    }
    return offset;
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

const meshBytes = 16;

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

function sphereCoord(
  r: number,
  theta: number,
  phi: number
): [number, number, number] {
  return [r * cos(theta) * cos(phi), r * cos(theta) * sin(phi), r * sin(theta)];
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

  // no vertices
  getVertices(buffer: Float32Array, offset: number) {
    this.bufferOffset = offset / 4;
    buffer[offset++] = this.origin[0];
    buffer[offset++] = this.origin[1];
    buffer[offset++] = this.origin[2];
    offset++;
    buffer[offset++] = this.normal[0];
    buffer[offset++] = this.normal[1];
    buffer[offset++] = this.normal[2];
    offset++;

    return offset;
  }

  getMeshes(meshes: ArrayBuffer, offset: number) {
    if (this.bufferOffset == null) {
      throw new Error("buffer offset is not available");
    }

    const intArray = new Int32Array(meshes);
    const floatArray = new Float32Array(meshes);

    // padding required: https://twitter.com/9ballsyndrome/status/1178039885090848770
    // under std430 layout, a struct in an array use the largest alignment of its member.
    // we use face_count = -1 to denote a sphere
    intArray[offset++] = -1;
    // int offset;
    intArray[offset++] = this.bufferOffset;
    // emission intensity
    floatArray[offset++] = this.material.emissionIntensity || 0;
    // alpha
    floatArray[offset++] = this.material.specularExponent || 100;
    // vec3 emission; // 14 Bytes but 16 Bytes alignment
    floatArray[offset++] = this.material.emission?.r || 0;
    floatArray[offset++] = this.material.emission?.g || 0;
    floatArray[offset++] = this.material.emission?.b || 0;
    // padding
    offset++;
    // vec3 color;
    floatArray[offset++] = this.material.color?.r || 0;
    floatArray[offset++] = this.material.color?.g || 0;
    floatArray[offset++] = this.material.color?.b || 0;
    // padding
    offset++;
    // vec3 specular
    floatArray[offset++] = this.material.specular?.r || 0;
    floatArray[offset++] = this.material.specular?.g || 0;
    floatArray[offset++] = this.material.specular?.b || 0;
    // padding
    offset++;

    return offset;
  }

  freeze(material: Material) {
    super.freeze(material);
    return [8, meshBytes] as [number, number];
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
}
