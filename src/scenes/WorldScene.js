import Phaser from "phaser";

const TILE = 32;
const center = (position) => ({
  x: position.x * TILE + 16,
  y: position.y * TILE + 16,
});

/** Phaser owns presentation only. All legal positions come from domain/world.js. */
export class WorldScene extends Phaser.Scene {
  constructor({ world, getState, onReady }) {
    super({ key: "World" });
    this.world = world;
    this.getState = getState;
    this.onReady = onReady;
    this.isMoving = false;
  }

  create() {
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.createTextures();
    this.drawWorld();
    const position = center(this.getState().position);
    this.heroShadow = this.add
      .ellipse(position.x, position.y + 11, 22, 9, 0x1c3829, 0.3)
      .setDepth(0.5);
    this.hero = this.add
      .image(position.x, position.y - 3, "hero-down")
      .setDepth(this.getState().position.y + 1);
    this.onReady();
  }

  texture(key, width, height, paint) {
    if (this.textures.exists(key)) return;
    const texture = this.textures.createCanvas(key, width, height);
    const ctx = texture.context;
    ctx.imageSmoothingEnabled = false;
    paint(ctx);
    texture.refresh();
  }

  createTextures() {
    for (let variant = 0; variant < 4; variant++) {
      this.texture(`grass-${variant}`, 32, 32, (ctx) => {
        ctx.fillStyle = ["#688453", "#6b8756", "#648151", "#6b8452"][variant];
        ctx.fillRect(0, 0, 32, 32);
        for (let i = 0; i < 10; i++) {
          const x = (i * 13 + variant * 7) % 30,
            y = (i * 19 + variant * 5) % 30;
          ctx.fillStyle = i % 2 ? "#809663" : "#587747";
          ctx.fillRect(x, y, 2, 2);
        }
      });
      this.texture(`meadow-${variant}`, 32, 32, (ctx) => {
        ctx.fillStyle = ["#799363", "#7d9665", "#769061", "#82986a"][variant];
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = "#8ba571";
        for (let i = 0; i < 8; i++)
          ctx.fillRect((i * 17 + 4) % 31, (i * 13 + 9) % 30, 2, 3);
        if (variant % 2) {
          ctx.fillStyle = "#c6cb91";
          ctx.fillRect(9, 12, 2, 2);
          ctx.fillRect(24, 25, 2, 2);
          ctx.fillStyle = "#d5b880";
          ctx.fillRect(10, 13, 1, 1);
        }
      });
    }
    this.texture("path", 32, 32, (ctx) => {
      ctx.fillStyle = "#b2a77a";
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = "#a69e70";
      for (let i = 0; i < 14; i++)
        ctx.fillRect((i * 19 + 3) % 30, (i * 11 + 9) % 30, 2, 1);
      ctx.fillStyle = "#c6b88b";
      ctx.fillRect(6, 8, 4, 2);
      ctx.fillRect(23, 22, 3, 2);
    });
    this.texture("water", 32, 32, (ctx) => {
      ctx.fillStyle = "#426f78";
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = "#598a89";
      ctx.fillRect(2, 5, 12, 1);
      ctx.fillRect(19, 23, 9, 1);
      ctx.fillStyle = "#365f70";
      ctx.fillRect(11, 13, 16, 2);
      ctx.fillStyle = "#6a9991";
      ctx.fillRect(4, 28, 7, 1);
    });
    this.texture("bridge", 32, 32, (ctx) => {
      ctx.fillStyle = "#3f6670";
      ctx.fillRect(0, 0, 32, 32);
      for (let x = 0; x < 32; x += 5) {
        ctx.fillStyle = x % 2 ? "#a38b60" : "#b09a6c";
        ctx.fillRect(x, 3, 4, 26);
        ctx.fillStyle = "#cfb788";
        ctx.fillRect(x, 4, 1, 23);
      }
      ctx.fillStyle = "#4c513d";
      ctx.fillRect(0, 2, 32, 3);
      ctx.fillRect(0, 27, 32, 3);
    });
    this.texture("birch", 40, 50, (ctx) => {
      ctx.fillStyle = "#243e3380";
      ctx.beginPath();
      ctx.ellipse(23, 44, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b8bda0";
      ctx.fillRect(18, 13, 6, 31);
      ctx.fillStyle = "#e2dcc1";
      ctx.fillRect(18, 12, 3, 32);
      ctx.fillStyle = "#4f6455";
      ctx.fillRect(18, 30, 4, 2);
      ctx.fillRect(21, 38, 3, 2);
      ctx.fillRect(18, 22, 2, 2);
      ctx.fillStyle = "#344f36";
      ctx.fillRect(5, 13, 30, 14);
      ctx.fillRect(10, 4, 21, 25);
      ctx.fillStyle = "#547544";
      ctx.fillRect(3, 10, 29, 10);
      ctx.fillRect(9, 3, 19, 23);
      ctx.fillRect(14, 0, 10, 25);
      ctx.fillStyle = "#75945a";
      ctx.fillRect(7, 10, 9, 6);
      ctx.fillRect(13, 5, 13, 7);
      ctx.fillRect(20, 17, 10, 5);
      ctx.fillStyle = "#91aa6a";
      ctx.fillRect(11, 8, 5, 3);
      ctx.fillRect(20, 3, 5, 3);
    });
    this.texture("pine", 42, 54, (ctx) => {
      ctx.fillStyle = "#1e3c3380";
      ctx.beginPath();
      ctx.ellipse(23, 47, 17, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#695b41";
      ctx.fillRect(19, 34, 5, 15);
      ctx.fillStyle = "#284a3b";
      ctx.beginPath();
      ctx.moveTo(21, 0);
      ctx.lineTo(38, 40);
      ctx.lineTo(4, 40);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#365f46";
      for (const [y, w] of [
        [8, 8],
        [18, 13],
        [28, 17],
      ]) {
        ctx.beginPath();
        ctx.moveTo(20, y - 8);
        ctx.lineTo(20 + w, y + 10);
        ctx.lineTo(20 - w, y + 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#4c7650";
      ctx.fillRect(17, 12, 3, 5);
      ctx.fillRect(13, 22, 5, 4);
      ctx.fillRect(8, 34, 7, 3);
    });
    this.texture("rock", 32, 32, (ctx) => {
      ctx.fillStyle = "#3f534188";
      ctx.fillRect(4, 22, 25, 7);
      ctx.fillStyle = "#798879";
      ctx.fillRect(6, 13, 23, 12);
      ctx.fillRect(10, 8, 15, 17);
      ctx.fillStyle = "#a2aa8f";
      ctx.fillRect(10, 8, 12, 3);
      ctx.fillRect(7, 14, 4, 6);
      ctx.fillStyle = "#5a6d61";
      ctx.fillRect(22, 13, 7, 12);
    });
    this.texture("signpost", 32, 36, (ctx) => {
      ctx.fillStyle = "#68553b";
      ctx.fillRect(14, 7, 5, 27);
      ctx.fillStyle = "#aa8f5b";
      ctx.fillRect(4, 7, 25, 10);
      ctx.fillStyle = "#c8b17c";
      ctx.fillRect(5, 7, 23, 2);
      ctx.fillStyle = "#524d35";
      ctx.fillRect(9, 11, 14, 2);
      ctx.fillRect(20, 10, 2, 5);
    });
    for (const facing of ["up", "down", "left", "right"]) {
      this.texture(`hero-${facing}`, 26, 34, (ctx) => {
        ctx.fillStyle = "#3b3f31";
        ctx.fillRect(7, 25, 5, 8);
        ctx.fillRect(15, 25, 5, 8);
        ctx.fillStyle = "#bfad83";
        ctx.fillRect(8, 26, 3, 4);
        ctx.fillRect(16, 26, 3, 4);
        ctx.fillStyle = "#924d37";
        ctx.fillRect(5, 13, 17, 14);
        ctx.fillRect(4, 18, 19, 9);
        ctx.fillStyle = "#b46a44";
        ctx.fillRect(6, 14, 4, 12);
        if (facing !== "up") {
          ctx.fillStyle = "#d5c394";
          ctx.fillRect(10, 15, 8, 10);
          ctx.fillStyle = "#876641";
          ctx.fillRect(13, 20, 7, 7);
          ctx.fillStyle = "#b39056";
          ctx.fillRect(14, 18, 5, 3);
        }
        ctx.fillStyle = "#d7b78b";
        ctx.fillRect(8, 5, 12, 10);
        ctx.fillStyle = "#373a2d";
        ctx.fillRect(7, 3, 14, 5);
        ctx.fillRect(7, 6, 3, 6);
        if (facing === "up") {
          ctx.fillRect(8, 7, 12, 6);
        } else {
          ctx.fillStyle = "#342f26";
          if (facing !== "right") ctx.fillRect(11, 10, 2, 2);
          if (facing !== "left") ctx.fillRect(17, 10, 2, 2);
        }
      });
    }
    this.texture("blud", 38, 52, (ctx) => {
      ctx.fillStyle = "#263f35";
      ctx.beginPath();
      ctx.moveTo(17, 7);
      ctx.lineTo(25, 9);
      ctx.lineTo(34, 45);
      ctx.lineTo(28, 40);
      ctx.lineTo(23, 50);
      ctx.lineTo(17, 44);
      ctx.lineTo(8, 49);
      ctx.lineTo(12, 21);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#3b5041";
      ctx.fillRect(14, 18, 5, 23);
      ctx.fillRect(9, 23, 5, 12);
      ctx.fillStyle = "#2d382d";
      ctx.fillRect(12, 4, 3, 16);
      ctx.fillRect(8, 0, 3, 8);
      ctx.fillRect(10, 5, 5, 3);
      ctx.fillRect(25, 2, 3, 16);
      ctx.fillRect(28, 0, 3, 8);
      ctx.fillStyle = "#d2c388";
      ctx.fillRect(16, 13, 3, 2);
      ctx.fillRect(23, 13, 3, 2);
      ctx.fillStyle = "#67775a";
      ctx.fillRect(17, 32, 2, 6);
      ctx.fillRect(23, 36, 2, 7);
    });
  }

  drawWorld() {
    const { world } = this;
    world.tiles.forEach((row, y) =>
      [...row].forEach((tile, x) => {
        const variant = (x * 17 + y * 7 + x * y) % 4;
        const texture =
          tile === "~"
            ? "water"
            : tile === "#"
              ? "bridge"
              : tile === "="
                ? "path"
                : tile === ","
                  ? `meadow-${variant}`
                  : `grass-${variant}`;
        this.add.image(x * TILE, y * TILE, texture).setOrigin(0);
        if (tile === "T")
          this.add
            .image(x * TILE + 16, y * TILE + 29, "birch")
            .setOrigin(0.5, 1)
            .setDepth(y + 1);
        if (tile === "P")
          this.add
            .image(x * TILE + 16, y * TILE + 29, "pine")
            .setOrigin(0.5, 1)
            .setDepth(y + 1);
        if (tile === "^")
          this.add
            .image(x * TILE, y * TILE, "rock")
            .setOrigin(0)
            .setDepth(y + 1);
        // A pale bank makes the deep, unwalkable river readable without a grid.
        if (tile === "~") {
          if (row[x - 1] !== "~")
            this.add
              .rectangle(x * TILE + 2, y * TILE + 16, 4, 32, 0x9cad79)
              .setAlpha(0.65);
          if (row[x + 1] !== "~")
            this.add
              .rectangle(x * TILE + 30, y * TILE + 16, 4, 32, 0x9cad79)
              .setAlpha(0.65);
        }
      }),
    );
    for (const entity of world.entities) {
      this.add
        .image(entity.x * TILE + 16, entity.y * TILE + 27, entity.id)
        .setOrigin(0.5, 1)
        .setDepth(entity.y + 1);
      if (entity.type === "enemy") {
        this.add
          .ellipse(
            entity.x * TILE + 16,
            entity.y * TILE + 23,
            36,
            13,
            0x53465a,
            0.22,
          )
          .setDepth(0.5);
        const marker = this.add
          .text(entity.x * TILE + 16, entity.y * TILE - 31, "◆", {
            fontSize: "11px",
            color: "#ded0a8",
          })
          .setOrigin(0.5)
          .setDepth(101);
        if (!this.reducedMotion)
          this.tweens.add({
            targets: marker,
            y: marker.y - 4,
            duration: 1300,
            yoyo: true,
            repeat: -1,
          });
      }
    }
    this.add
      .text(660, 75, "Д Е С Н А", {
        fontFamily: "Georgia",
        fontSize: "11px",
        color: "#d4e0bd",
      })
      .setRotation(Math.PI / 2)
      .setAlpha(0.65)
      .setDepth(100);
    // Subtle light motes, deterministic positions; no gameplay randomness here.
    if (!this.reducedMotion)
      for (let i = 0; i < 9; i++) {
        const mote = this.add
          .circle(70 + i * 61, 190 + (i % 4) * 46, 1, 0xf2e1ac, 0.45)
          .setDepth(600);
        this.tweens.add({
          targets: mote,
          x: mote.x + 20,
          y: mote.y - 14,
          alpha: 0.1,
          duration: 3200 + i * 120,
          yoyo: true,
          repeat: -1,
        });
      }
  }

  renderState(state, events) {
    this.hero.setTexture(`hero-${state.facing}`);
    if (!events.some((event) => event.type === "moved")) return;
    this.isMoving = true;
    const position = center(state.position);
    this.tweens.add({
      targets: this.heroShadow,
      x: position.x,
      y: position.y + 11,
      duration: this.reducedMotion ? 0 : 120,
    });
    this.tweens.add({
      targets: this.hero,
      x: position.x,
      y: position.y - 3,
      duration: this.reducedMotion ? 0 : 120,
      onUpdate: () => {
        this.hero.setDepth((this.hero.y + 3 - 16) / TILE + 1);
      },
      onComplete: () => {
        this.isMoving = false;
      },
    });
  }

  reset(state) {
    this.tweens.killTweensOf([this.hero, this.heroShadow]);
    this.isMoving = false;
    const position = center(state.position);
    this.hero
      .setPosition(position.x, position.y - 3)
      .setTexture(`hero-${state.facing}`)
      .setDepth(state.position.y + 1);
    this.heroShadow.setPosition(position.x, position.y + 11);
  }
}
