const size = 2;

const stats = {
  buffer: new Float32Array(size),
  get diff() {
    return stats.buffer[0];
  },
  set diff(v: number) {
    stats.buffer[0] = v;
  },

  get rayCount() {
    return stats.buffer[1];
  },
  set rayCount(v: number) {
    stats.buffer[1] = v;
  },

  prev: 0,
  delta: 0,
  get fps() {
    return 1000 / stats.delta;
  },
};

export default stats;
