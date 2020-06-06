import {
  RenderObject,
  Cube,
  Group,
  Sphere,
  Cylinder,
  Rectangle,
  Tetrahedron,
} from "./object";
import Color from "./color";
import Material from "./material";
import Camera from "./camera";
import Timer from "./timer";

export default class World {
  name: string;
  objects: Map<string, RenderObject> = new Map();
  vertices: Float32Array;
  meshes: ArrayBuffer;
  ambient: Color;

  baseMaterial: Material;
  camera: Camera;
  timer: Timer;

  constructor(
    name: string,
    camera: Camera,
    initializer: (world: World) => void,
    timer = new Timer()
  ) {
    this.name = name;
    this.camera = camera;
    this.baseMaterial = new Material()
      .setColor(Color.WHITE)
      .setSpecular((diffuse) => diffuse.mul(0.1))
      .setSpecularExponent(400);

    this.timer = timer;
    this.ambient = Color.BLACK;

    initializer.call(this, this);
    this.freeze();
  }

  freeze() {
    let n = 0;
    let m = 0;

    for (let [, o] of this.objects) {
      const counts = o.freeze(this.baseMaterial);
      n += counts[0];
      m += counts[1];
    }

    this.vertices = new Float32Array(n);
    this.meshes = new ArrayBuffer(m * 4);

    let offset = 0;

    for (let [, o] of this.objects) {
      offset = o.getVertices(this.vertices, offset);
    }

    offset = 0;

    for (let [, o] of this.objects) {
      offset = o.getMeshes(this.meshes, offset);
    }
  }

  addObject(obj: RenderObject) {
    this.objects.set(obj.name, obj);
  }

  addLight(obj: RenderObject) {
    this.objects.set(obj.name, obj);
  }
}

// function buildATAT() {
//   const baseColor = new Color(0.9, 0.9, 0.9);
//   const baseMaterial = new Material()
//     .setColor(baseColor)
//     .setSpecular(0.3)
//     .setSpecularExponent(4);
//   const cogColor = baseColor.mul(0.88);

//   const g = new Group().setMaterial(baseMaterial);

//   const window = new Cube().scale(0.005, 0.008, 0.015).commit();
//   const windowRow = new Group("windowRow")
//     .addChild(window.clone().translate(0, 0.3, 0))
//     .addChild(window.clone().translate(0, 0.25, 0))
//     .addChild(window.clone().translate(0, 0.23, 0))
//     .addChild(window.clone().translate(0, 0.16, 0))
//     .addChild(window.clone().translate(0, 0.11, 0))
//     .addChild(window.clone().translate(0, 0.07, 0))
//     .addChild(window.clone().translate(0, 0.05, 0))
//     .addChild(window.clone().translate(0, -0.05, 0))
//     .addChild(window.clone().translate(0, -0.07, 0))
//     .addChild(window.clone().translate(0, -0.12, 0))
//     .addChild(window.clone().translate(0, -0.17, 0))
//     .addChild(window.clone().translate(0, -0.23, 0))
//     .addChild(window.clone().translate(0, -0.21, 0))
//     .addChild(window.clone().translate(0, -0.28, 0))
//     .translate(0.15, 0, 0.1)
//     .setColor(baseColor.mul(0.3))
//     .commit();

//   const bodyHalf = new Group()
//     .addChild(
//       new Cube().translate(0, -0.22, -0.01).scale(1, 0.2, 0.28).commit()
//     )
//     .addChild(
//       new Cube()
//         .translate(0, 0.192, 0.075)
//         .rotate(-20, 1, 0, 0)
//         .scale(1, 0.2, 0.2)
//         .commit()
//     );
//   const body = new Group("body");
//   body
//     .addChild(new Cube().translate(0, 0, 0.039).scale(0.3, 0.3, 0.38).commit())
//     .addChild(bodyHalf.clone().scale(0.3, 1, 1))
//     .addChild(bodyHalf.clone().scale(0.3, -1, 1))
//     .addChild(windowRow)
//     .addChild(windowRow.clone().scale(-1, 1, 1))
//     // lower calf
//     .addChild(
//       new Cube()
//         .translate(0.054, 0, -0.18)
//         .rotate(20, 0, 1, 0)
//         .scale(0.15, 0.25, 0.15)
//         .setColor(baseColor.mul(0.9))
//     )
//     .addChild(
//       new Cube()
//         .translate(-0.054, 0, -0.18)
//         .rotate(-20, 0, 1, 0)
//         .scale(0.15, 0.25, 0.15)
//         .setColor(baseColor.mul(0.9))
//     )
//     .scale(1, 1.15, 1);

//   // neck
//   body.addChild(
//     new Cylinder(void 0, "neck")
//       .setColor(baseColor.mul(0.93))
//       .translate(0, 0.4, -0.08)
//       .scale(0.13, 0.3, 0.13)
//       .commit()
//   );

//   const gun = new Group("gun")
//     .addChild(
//       new Cylinder()
//         .translate(0, 0, 0)
//         .rotate(90, 1, 0, 0)
//         .scale(0.05, 0.8, 0.05)
//     )
//     // ring
//     .addChild(
//       new Cylinder()
//         .translate(0, 0, 0.3)
//         .rotate(90, 1, 0, 0)
//         .scale(0.1)
//         .setColor(baseColor.mul(0.6))
//     )
//     // hole
//     .addChild(
//       new Cylinder()
//         .translate(0, 0, 0.4)
//         .rotate(90, 1, 0, 0)
//         .scale(0.04, 0.02, 0.04)
//         .setColor(baseColor.mul(0.1))
//     )
//     .setColor(baseColor.mul(0.85))
//     .rotate(-90, 1, 0, 0)
//     .commit();

//   const head = new Group("head");
//   head
//     // face
//     .addChild(new Cube().translate(0, 0, -0.05).scale(0.8, 1, 0.5))
//     // forehead
//     .addChild(
//       new Cube().translate(0, 0, 0.16).rotate(-18, 1, 0, 0).scale(0.8, 0.9, 0.4)
//     )
//     // eyebrow
//     .addChild(
//       new Cube()
//         .setColor(baseColor.mul(1.05))
//         .translate(0, 0.53, 0.07)
//         .scale(0.8, 0.07, 0.2)
//         .commit()
//     )
//     // eye
//     .addChild(
//       new Cube()
//         .setColor(baseColor.mul(0.1))
//         .translate(0, 0.575, 0.08)
//         .scale(0.6, 0.01, 0.06)
//         .commit()
//     )
//     // ball
//     .addChild(
//       new Sphere()
//         .setColor(baseColor.mul(0.95))
//         .translate(0.3, 0.2, -0.03)
//         .scale(0.5, 0.5, 0.5)
//         .commit()
//     )
//     .addChild(
//       new Sphere()
//         .setColor(baseColor.mul(0.95))
//         .translate(-0.3, 0.2, -0.03)
//         .scale(0.5, 0.5, 0.5)
//         .commit()
//     )
//     // chin
//     .addChild(
//       new Cube()
//         .translate(0, -0.05, -0.15)
//         .rotate(-15, 1, 0, 0)
//         .scale(0.6)
//         .scale(1, 1, 0.8)
//         .setColor(baseColor.mul(0.9))
//     )
//     // small gun
//     .addChild(
//       gun
//         .clone()
//         .translate(0.5, 0.4, -0.1)
//         .scale(0.5, 0.5, 0.6)
//         .animate((t, m) => m.rotate(-t * 20, 1, 0, 0))
//     )
//     .addChild(
//       gun
//         .clone()
//         .translate(-0.5, 0.4, -0.1)
//         .scale(0.5, 0.5, 0.6)
//         .animate((t, m) => m.rotate(-t * 20, 1, 0, 0))
//     )
//     // large cannon
//     .addChild(gun.clone().translate(0.2, 0.4, -0.37))
//     .addChild(gun.clone().translate(-0.2, 0.4, -0.37))
//     .translate(0, 0.6, -0.06)
//     .scale(0.3)
//     .setColor(baseColor)
//     .animate((t, m) => m.rotate(20 * (t - 0.5), 0, 0, 1));

//   const upper = new Group("upper");
//   upper
//     .addChild(head)
//     .addChild(body)
//     .translate(0, 0, 0.3)
//     .setColor(baseColor.mul(0.97));

//   const cog = new Group("cog")
//     .addChild(new Cylinder().scale(1, 0.35, 1).setColor(cogColor))
//     .addChild(
//       new Cylinder().scale(0.8, 0.36, 0.8).setColor(new Color(0.5, 0.5, 0.5, 1))
//     )
//     .addChild(new Cylinder().scale(0.7, 0.37, 0.7).setColor(cogColor))
//     .addChild(
//       new Cube().translate(0, 0, -0.2).scale(0.4, 0.38, 0.5).setColor(cogColor)
//     )
//     .scale(0.12)
//     .rotate(90, 0, 0, 1)
//     .commit();

//   const footNail = new Group()
//     .addChild(
//       new Cube().setColor(baseColor.mul(0.7)).scale(0.06, 0.04, 0.01).commit()
//     )
//     .addChild(
//       new Cube()
//         .setColor(baseColor.mul(0.1))
//         .translate(0, -0.015, 0.008)
//         .scale(0.07, 0.01, 0.023)
//         .commit()
//     )
//     .translate(0, 0.13, -0.1)
//     .commit();

//   const lock = new Group()
//     .addChild(
//       new Cube()
//         .translate(0, 0.06, 0.035)
//         .rotate(-90, 1, 0, 0)
//         .scale(0.04, 0.07, 0.02)
//         .commit()
//     )
//     .addChild(
//       new Cube()
//         .translate(0, 0.04, 0.08)
//         .rotate(-40, 1, 0, 0)
//         .scale(0.04, 0.06, 0.02)
//         .commit()
//     );

//   const footColor = baseColor.mul(0.9);
//   const foot = new Group("foot")
//     .setColor(footColor)
//     .translate(0, 0, -0.25)
//     .addChild(lock)
//     .addChild(lock.clone().rotate(180, 0, 0, 1))
//     .addChild(
//       new Cylinder()
//         .setColor(footColor.mul(0.9))
//         .rotate(90, 1, 0, 0)
//         .scale(0.1, 0.07, 0.1)
//         .commit()
//     )
//     .addChild(
//       new Cylinder()
//         .rotate(90, 1, 0, 0)
//         .translate(0, -0.07, 0)
//         .scale(0.24, 0.07, 0.24)
//         .commit()
//     )
//     .addChild(footNail)
//     .addChild(footNail.clone().rotate(90, 0, 0, 1))
//     .addChild(footNail.clone().rotate(180, 0, 0, 1))
//     .addChild(footNail.clone().rotate(270, 0, 0, 1));

//   const lowerLeg = new Group("lowerLeg");
//   lowerLeg
//     .addChild(cog)
//     .addChild(
//       new Cube().translate(0, 0, -0.08).scale(0.04, 0.085, 0.14).commit()
//     )
//     .addChild(
//       new Cube()
//         .setColor(baseColor)
//         .translate(0, 0, -0.16)
//         .scale(0.06, 0.11, 0.06)
//         .commit()
//     )
//     .addChild(foot);

//   const leg = new Group("leg");
//   leg
//     .addChild(cog.clone().scale(1.2, 1, 1))
//     .addChild(
//       new Cube()
//         .translate(0, 0, -0.1)
//         .scale(0.05, 0.09, 0.15)
//         .setColor(baseColor.mul(0.98))
//     )
//     .addChild(
//       new Cube().translate(0, 0, -0.25).scale(0.04, 0.085, 0.15).commit()
//     )
//     .addChild(lowerLeg.translate(0, 0, -0.35))
//     .setColor(baseColor.mul(0.95))
//     .commit();

//   g.addChild(upper);

//   const thigh = new Group("thigh")
//     .addChild(cog.clone().translate(-0.05, 0, 0).scale(0.8, 0.8, 0.8))
//     .addChild(
//       new Cube()
//         .translate(-0.05, -0.15, 0.02)
//         .rotate(-5, 1, 0, 0)
//         .scale(0.03, 0.3, 0.08)
//         .setColor(baseColor.mul(0.8))
//     )
//     .addChild(leg);

//   const thighFrontRight = thigh.clone().translate(0.1, 0.25, 0);
//   const thighBackRight = thigh.clone().scale(1, -1, 1).translate(0.1, 0.25, 0);
//   const thighFrontLeft = thigh.clone().scale(-1, 1, 1).translate(0.1, 0.25, 0);
//   const thighBackLeft = thigh.clone().scale(-1, -1, 1).translate(0.1, 0.25, 0);

//   thighFrontRight
//     .child("leg")
//     .animate((t, m) => m.rotate(30 * t, 1, 0, 0))
//     .child("lowerLeg")
//     .animate((t, m) => m.rotate(-35 * t, 1, 0, 0))
//     .child("foot")
//     .animate((t, m) => m.rotate(-15 * t, 1, 0, 0));

//   thighBackLeft
//     .child("leg")
//     .animate((t, m) => {
//       return m.rotate(10 * t, 1, 0, 0);
//     })
//     .child("lowerLeg")
//     .animate((t, m) => {
//       return m.rotate(-25 * t, 1, 0, 0);
//     })
//     .child("foot")
//     .animate((t, m) => {
//       return m.rotate(15 * t, 1, 0, 0);
//     });

//   thighBackRight
//     .child("leg")
//     .animate((t, m) => m.rotate(8 * t, 1, 0, 0))
//     .child("lowerLeg")
//     .animate((t, m) => m.rotate(-8 * t, 1, 0, 0));
//   thighFrontLeft
//     .child("leg")
//     .animate((t, m) => m.rotate(-8 * t, 1, 0, 0))
//     .child("lowerLeg")
//     .animate((t, m) => m.rotate(8 * t, 1, 0, 0));

//   const lower = new Group()
//     .addChild(thighFrontLeft)
//     .addChild(thighFrontRight)
//     .addChild(thighBackLeft)
//     .addChild(thighBackRight)
//     .translate(0, 0, 0.1);
//   g.addChild(lower);
//   g.animate((t, m) => m.translate(0, 0, -t * 0.5))
//     .rotate(-90, 1, 0, 0)
//     .scale(10)
//     .commit();

//   return g;
// }

export const worlds = {
  test: new World(
    "test",
    new Camera(12 / 8, [0, 0, -10], [0, 0, 0]),
    function () {
      this.ambient = new Color(0, 0.1, 0.2);

      this.addObject(
        new Rectangle("wall-light")
          .translate(0, 0, 5)
          .rotate(180, 0, 1, 0)
          .scale(3)
          .setEmission(new Color(1, 1, 0.9))
          .setEmissionIntensity(2)
          .commit()
      );
      this.addObject(
        new Tetrahedron()
          .translate(-2, 0, -8)
          .rotate(80, 0, 1, 0.5)
          .scale(2)
          .setColor(Color.WHITE)
          .setEmission(new Color(0.1, 0.2, 1))
          .setEmissionIntensity(5)
          .commit()
      );
      this.addObject(new Sphere().translate(-2, 1, 4).commit());

      // objects
      this.addObject(
        new Sphere()
          .translate(-2, 0, -4)
          .setSpecular(Color.GRAY)
          .setSpecularExponent(Material.MIRROR)
          .setRefraction(Color.WHITE)
          .commit()
      );
      this.addObject(
        new Sphere()
          .translate(-3, 2, -2)
          .scale(3)
          .commit()
          .setColor(new Color(0.5, 0.4, 0))
          .setSpecular(new Color(1, 0.8, 0.6))
          .setSpecularExponent(Material.MIRROR)
      );
      this.addObject(
        new Sphere()
          .translate(-6, 0, 0)
          .setColor(new Color(1, 0.8, 0.5))
          .setSpecularExponent(50)
          .commit()
          .setSpecular(Color.WHITE)
      );
      this.addObject(
        new Cube()
          .translate(-4, 0, 0)
          .rotate(45, 0, 1, 0)
          .setColor(Color.WHITE)
          .commit()
          .setSpecular(Color.WHITE)
      );
      this.addObject(
        new Cylinder(20)
          .scale(1.5)
          .translate(1, 1, -1)
          .rotate(50, 1, 0.2, 0.4)
          // .setColor(new Color(0.6, 0.7, 1))
          .setSpecular(Color.WHITE.mul(0.1))
          .setRefraction(Color.WHITE)
          .commit()
      );
      this.addObject(
        new Cylinder(20)
          .setColor(new Color(0.6, 0.7, 1))
          .setSpecular(Color.WHITE)
          .commit()
      );
      this.addObject(
        new Tetrahedron()
          .translate(1, 0, -1.5)
          .rotate(50, 1, 0.2, 0.4)
          .setRefraction(Color.WHITE)
          .setSpecular(Color.WHITE.mul(0.1))
          .commit()
      );
      this.addObject(
        new Cube()
          .translate(0, 0.5, -2)
          .scale(0.5)
          .setEmission(Color.RED)
          .setEmissionIntensity(2)
          .commit()
      );
      this.addObject(
        new Cube()
          .translate(-2, 0, 1)
          .commit()
          .setRefraction(new Color(1, 0.8, 0.5))
          .setColor(new Color(0.8, 0.6, 0.3))
      );
      this.addObject(
        new Rectangle("ground")
          .translate(0, -0.5, 0)
          .rotate(-90, 1, 0, 0)
          .scale(100)
          .setSpecular(Color.WHITE)
          .setSpecularExponent(5000)
          .commit()
      );
      this.addObject(
        new Rectangle("wall")
          .translate(0, 0, -12)
          .scale(8)
          .setSpecular(Color.WHITE)
          .setSpecularExponent(Material.MIRROR)
          .commit()
      );
    }
  ),
  // at: new World("AT-AT", new Camera(1, [-10, 1, -10], [0, 5, -2]), function () {
  //   // sunlight
  //   this.addLight(
  //     new Light(Light.Type.Directional, "sunlight")
  //       .setDirection(new Vector3([-8, -30, -8]))
  //       .setIntensity(0.8)
  //       .setColor(new Color(1, 0.8, 0.6))
  //       .animate((t, m) => m.rotate(360 * t, 0, 1, 1))
  //   );
  //   // ground reflective
  //   this.addLight(
  //     new Light(Light.Type.Directional, "ground reflect 1")
  //       .setDirection(new Vector3([1, 1, 1]))
  //       .setIntensity(0.4)
  //       .setColor(new Color(1, 0.75, 0.4))
  //   );
  //   this.addLight(
  //     new Light(Light.Type.Directional, "ground reflect 2")
  //       .setDirection(new Vector3([-1, 1, 1]))
  //       .setIntensity(0.4)
  //       .setColor(new Color(1, 0.75, 0.4))
  //   );

  //   // sun
  //   this.addLight(
  //     new Light(Light.Type.Point, "sun")
  //       .translate(80, 300, 80)
  //       .setIntensity(10000)
  //       .animate((t, m) => m.rotate(360 * t, 0, 1, 1))
  //   );

  //   // ground
  //   this.addObject(
  //     new Cube()
  //       .scale(400, 1, 400)
  //       .translate(0, 0, 0)
  //       .setColor(new Color(1, 0.9, 0.6))
  //       .setSpecular(0.005)
  //       .setSpecularExponent(4)
  //   );
  //   // sky
  //   this.addObject(
  //     new Sphere()
  //       .translate(0, 230, 0)
  //       .scale(500)
  //       .invertNormal()
  //       .setColor(new Color(0.6, 0.8, 1))
  //   );

  //   this.addObject(buildATAT().translate(0, 6.7, 0));
  // }),
};