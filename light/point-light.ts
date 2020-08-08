import Light, { LightOption } from "./light";
import { vec3 } from "gl-matrix";
import { BuffersLength, Buffers } from "../buffer";

interface PointLightOption extends LightOption {
  position: vec3;
}

export default class PointLight extends Light {
  position: vec3;

  constructor(name: string, options: PointLightOption) {
    super(name, options);
    this.position = options.position;
  }

  bufferAppend(buffers: Buffers) {
    buffers.light.append({
      intensity: this.intensity,
      position: this.position,
      color: this.color,
    });
  }
  bufferCount(): BuffersLength {
    return {
      light: 12,
    };
  }
}
