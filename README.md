# Deprecated
[WebGL 2.0 Compute Shader](https://www.khronos.org/registry/webgl/specs/latest/2.0-compute/) is deprecated in favor of the [WebGPU Proposal](https://gpuweb.github.io/gpuweb/) and as a result. The demo no longer works

Will move to WebGPU implementation once the proposal is stable.

# WebGL 2.0 Compute Ray-tracing - [Demo](https://people.ucsc.edu/~hchen222/cse160-hw5/)

![demo](example/demo.gif)

### Prerequisite

1. Check browser support: [Can I use](https://caniuse.com/#feat=mdn-api_webgl2computerenderingcontext)
1. WebGL 2.0 compute shader is supported as an experimental feature on Windows / Linux.
1. Using chrome: turn on `WebGl 2.0 Compute` and `Choose ANGLE render backend: OpenGL` in Chrome experimental features. Access experimental features in chrome://flags
1. Having a good graphic card can give smoother FPS

## Build & Develop

- `npm run build`
- `npm run dev`

## Reference

- http://three-eyed-games.com/2018/05/03/gpu-ray-tracing-in-unity-part-1/
- https://blog.thomaspoulet.fr/uniform-sampling-on-unit-hemisphere/
- https://github.com/oktomus/web-experiments/tree/1e2d3bfbe637a0e5e109bc368c826e025e666d99
