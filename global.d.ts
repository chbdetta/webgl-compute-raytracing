// Definition in https://www.khronos.org/registry/webgl/specs/latest/2.0-compute

interface WebGL2RenderingContext {
  readonly COMPUTE_SHADER: number;
  dispatchCompute(groupX: number, groupY: number, groupZ: number): void;
  memoryBarrier(barriersBit: number): void;

  getProgramResourceIndex(
    program: WebGLProgram,
    id: number,
    name: string
  ): number;
  getProgramResource(
    program: WebGLProgram,
    interface: number,
    index: number,
    props: number[]
  ): any;

  readonly WRITE_ONLY: number;
  readonly READ_ONLY: number;
  readonly READ_WRITE: number;
  readonly SHADER_STORAGE_BUFFER: number;
  readonly SHADER_STORAGE_BLOCK: number;
  readonly BUFFER_BINDING: number;

  bindImageTexture(
    unit: number,
    texture: WebGLTexture,
    level: number,
    layered: boolean,
    layer: number,
    access: number,
    format: number
  ): void;

  readonly SHADER_IMAGE_ACCESS_BARRIER_BIT: number;
  readonly TEXTURE_FETCH_BARRIER_BIT: number;
}

interface WebGL2Context extends WebGL2RenderingContext {
  program: WebGLProgram;
}
