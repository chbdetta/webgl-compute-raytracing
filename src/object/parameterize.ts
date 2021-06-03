import RenderObject from "./render";
import { VertexBuffer, MeshBuffer, Buffers } from "../buffer";
import { vec3, vec4, mat4 } from "gl-matrix";

export class ParamSphere extends RenderObject {
  static count = 0;
  origin: vec3;
  normal: vec3;

  constructor(name = `Sphere ${ParamSphere.count++}`) {
    super(name);

    this.origin = [0, 0, 0];
    this.normal = [0, 0.5, 0];
  }

  render() {
    // pass
  }

  bufferCount() {
    this.freeze();

    return {
      vertex: 2 * VertexBuffer.bytes,
      mesh: MeshBuffer.bytes,
    };
  }

  bufferAppend(buffers: Buffers) {
    buffers.mesh.append({
      // -1 face number denotes a parameterized object
      faceCount: -1,
      vertexOffset: buffers.vertex.cursor / VertexBuffer.bytes,
      specularExponent: this.material.specularExponent!,
      specularColor: this.material.specular!,
      diffuseColor: this.material.color!,
      refractionColor: this.material.refraction!,
    });

    buffers.vertex.append(this.origin);
    buffers.vertex.append(this.normal);
  }

  freeze() {
    this.commit();
  }

  commit() {
    vec3.transformMat4(this.origin, this.origin, this.modelMatrix);

    const normalv4 = [...this.normal, 0] as vec4;
    vec4.transformMat4(normalv4, normalv4, this.modelMatrix);
    vec3.copy(this.normal, normalv4.slice(0, 3) as vec3);

    mat4.identity(this.modelMatrix);
    return this;
  }

  clone() {
    const s = new ParamSphere();
    s.origin = vec3.clone(this.origin);
    s.normal = vec3.clone(this.normal);

    return s;
  }
}
