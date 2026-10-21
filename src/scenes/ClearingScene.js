import Phaser from "phaser";
import { advanceWalkCycle, HERO_WALK_ANIMATION_RATE, walkFrame } from "../domain/walk-cycle.js";
import { spriteLayout, frameOriginPixels } from "../domain/sprite-layout.js";
import { movementDuration } from "../content/movement.js";
import { noticesHero } from "../domain/map-interactions.js";
import { createHeroIdle, advanceHeroIdle, createLuckyIdle, advanceLuckyIdle, animationDuration, animationFrameAt } from "../domain/idle-behavior.js";

const ASSET_ROOT = `${import.meta.env.BASE_URL}assets/map-sprites/`;
const SPRITE_SCALE = 1.65;
const CAMERA_ZOOM = 1.5;
const DIRECTION_ROWS = { left: "SW", down: "SE", up: "NW", right: "NE", "up-left": "NW", "up-right": "NE", "down-left": "SW", "down-right": "SE" };
const FILES = { map: "map-v8.png", hero: "hero-walk-v2.png", blud: "blud-idle-v1.png", moth: "moth-idle-v2.png" };
const textureKey = (id) => `clearing-${id}`;
const IDLE_VARIANTS = ['heroIdleCorrected', 'heroQuiet', 'heroTap', 'luckyPerched', 'luckyCurious'];

/** Presentation only. Every foot position comes from the collision domain. */
export class ClearingScene extends Phaser.Scene {
  constructor(options) {
    super({ key: "Clearing" });
    Object.assign(this, options);
    this.isMoving = false;
    this.ready = false;
    this.inputAllowed = true;
    this.requestedPause = false;
    this.actors = new Map();
    this.variants = new Map();
    this.failedFiles = new Set();
  }
  preload() {
    this.load.on("loaderror", (file) => this.failedFiles.add(file.key));
    this.load.json("clearing-manifest", `${ASSET_ROOT}manifest.json`);
    this.load.once("filecomplete-json-character-states", (_key, _type, data) => {
      for (const [id, entry] of Object.entries(data.entries)) {
        if (entry.file && entry.columns) this.load.image(textureKey(id), `${import.meta.env.BASE_URL}assets/${entry.file}`);
      }
    });
    this.load.json("character-states", `${ASSET_ROOT}character-states-v1.json`);
    this.load.once("filecomplete-json-idle-candidates", (_key, _type, data) => {
      for (const id of IDLE_VARIANTS) this.load.image(textureKey(id), `${import.meta.env.BASE_URL}assets/${data.entries[id].file}`);
    });
    this.load.json("idle-candidates", `${ASSET_ROOT}idle-candidates-v1.json`);
    for (const [id, file] of Object.entries(FILES)) this.load.image(textureKey(id), `${ASSET_ROOT}${file}`);
  }
  create() {
    try {
      if (this.failedFiles.size) throw new Error(`Не завантажено: ${[...this.failedFiles].join(", ")}`);
      const manifest = this.cache.json.get("clearing-manifest");
      const states = this.cache.json.get("character-states").entries;
      this.motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
      this.reducedMotion = this.motionPreference.matches;
      this.add.image(0, 0, textureKey("map")).setOrigin(0).setDisplaySize(this.world.width, this.world.height);
      for (const id of ["hero", "blud", "moth"]) this.registerVariant(id, manifest.actors.find((actor) => actor.id === id));
      for (const id of ["heroWalkNE", "heroIdle", "bludCalm"]) this.registerVariant(id, states[id]);
      for (const id of IDLE_VARIANTS) this.registerVariant(id,this.cache.json.get('idle-candidates').entries[id]);
      const state = this.getState();
      this.heroPosition = { ...state.position };
      this.walkCycle = { distance: 0, position: { ...state.position } };
      this.facing = state.facing || "down";
      this.heroIdle = createHeroIdle(); this.luckyIdle = createLuckyIdle();
      this.playerActivity = false;
      this.actors.set("hero", this.createActor("hero", this.heroIdle.variant, this.heroPosition));
      this.actors.set("blud", this.createActor("blud", "bludCalm", this.world.enemy));
      this.actors.set("moth", this.createActor("moth", "luckyPerched", { x: this.world.rock.x - 3, y: this.world.rock.y - 54 }, .64 * 1.2));
      this.rockTarget=this.add.zone(this.world.rock.x,this.world.rock.y-24,174,148)
        .setDepth(this.world.rock.y+5).setInteractive({
          hitArea:new Phaser.Geom.Ellipse(87,74,174,148),hitAreaCallback:Phaser.Geom.Ellipse.Contains,
          cursor:`url('${import.meta.env.BASE_URL}assets/ui/cursor-question.svg') 4 3, help`,
        });
      this.setLuckyVisible(false);
      this.hero = this.actors.get("hero").sprite;
      this.enemySprite = this.actors.get("blud").sprite;
      const sword = `url('${import.meta.env.BASE_URL}assets/ui/cursor-sword.svg') 6 3, crosshair`;
      this.enemySprite.setInteractive({ pixelPerfect: true, alphaTolerance: 32, cursor: sword });
      this.input.setDefaultCursor(`url('${import.meta.env.BASE_URL}assets/ui/cursor-arrow.svg') 4 3, default`);
      this.cameras.main.setBounds(0, 0, this.world.width, this.world.height);
      this.resizeCamera(); this.focusHero(); this.bindMapPointer();
      this.scale.on("resize", this.resizeCamera, this);
      this.handleVisibility = () => this.syncPause();
      this.handleMotionPreference = () => { this.reducedMotion = this.motionPreference.matches; };
      document.addEventListener("visibilitychange", this.handleVisibility);
      this.motionPreference.addEventListener("change", this.handleMotionPreference);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.scale.off("resize", this.resizeCamera, this);
        document.removeEventListener("visibilitychange", this.handleVisibility);
        this.motionPreference.removeEventListener("change", this.handleMotionPreference);
        this.clearDestination(); this.ready = false; this.isMoving = false;
      });
      this.ready = true; this.syncPause();
    } catch (error) { this.ready = false; this.onError?.(error); return; }
    this.onReady?.();
  }
  registerVariant(id, config) {
    if (!config) throw new Error(`Немає опису анімації ${id}`);
    const texture = this.textures.get(textureKey(id));
    const image = texture.getSourceImage();
    const layout = spriteLayout(config, image.width, image.height);
    layout.frameRects.forEach((rect, index) => texture.add(index, 0, rect.x, rect.y, rect.width, rect.height));
    this.variants.set(id, { ...config, ...layout, key: textureKey(id), scale: config.displayHeight / (config.referenceFrameHeight || layout.frameHeight) * SPRITE_SCALE });
  }
  createActor(id, variant, position, size = 1) {
    const width = id === "blud" ? 94 : id === "moth" ? 34 : 66;
    const shadow = this.add.container(position.x, position.y, [
      this.add.ellipse(0, 0, width + 14, 24, 0x050b0b, .16),
      this.add.ellipse(0, 0, width, 17, 0x030b09, .28),
      this.add.ellipse(0, 0, width * .62, 10, 0x020706, .25),
    ]).setDepth(2);
    const actor = { id, position, elapsed: 0, frameIndex: 0, size, shadow, sprite: this.add.sprite(position.x, position.y, this.variants.get(variant).key, 0) };
    this.setVariant(actor, variant);
    return actor;
  }
  setVariant(actor, id) {
    if (actor.variant === id) return;
    actor.variant = id; actor.config = this.variants.get(id); actor.elapsed = 0; actor.frameIndex = -1;
    actor.sprite.setTexture(actor.config.key);
    this.applyActorFrame(actor, this.animationFrames(actor)[0]);
  }
  animationFrames(actor) {
    const animations = actor.config.animations;
    return actor.id === "hero" ? (animations[DIRECTION_ROWS[this.facing]] || animations.NE || animations.idle) : animations.idle;
  }
  applyActorFrame(actor, frame) {
    const config = actor.config;
    const origin = frameOriginPixels(config, frame);
    const offset = config.frameOffsets?.[frame] || config.offset || [0, 0];
    // Match the approved walk/standing SE height while leaving Lucky's body
    // scale constant (his changing antenna bounds must not resize the torso).
    const calmHero = actor.id === 'hero' && ['heroQuiet', 'heroTap'].includes(actor.variant);
    const heightCorrection = calmHero ? 85.52950558213716 / (config.frameRects[frame].height * config.displayHeight / config.referenceFrameHeight) : 1;
    const scale = config.scale * actor.size * (config.frameScaleMultipliers?.[frame] || 1) * heightCorrection;
    actor.frameIndex = frame;
    // The two approved front-facing idle sheets have one view. Mirror that view
    // toward the last horizontal direction; walking retains all four authored views.
    const flip = calmHero && ['SW', 'NW'].includes(DIRECTION_ROWS[this.facing]);
    const originX = flip ? config.frameRects[frame].width - origin[0] : origin[0];
    actor.sprite.setFlipX(flip).setFrame(frame).setScale(scale).setDisplayOrigin(originX,origin[1])
      .setPosition(actor.position.x + offset[0] * scale * (flip?-1:1), actor.position.y + offset[1] * scale)
      .setDepth(actor.position.y + 10);
    actor.shadow.setPosition(actor.position.x, actor.position.y + (actor.id === "moth" ? 8 : 0));
  }
  setLuckyVisible(visible) {
    const actor = this.actors.get("moth");
    if (actor) {
      if (!visible || !actor.sprite.visible) {
        this.luckyIdle = createLuckyIdle();
        this.setVariant(actor, 'luckyPerched'); actor.elapsed = 0;
        this.applyActorFrame(actor, this.animationFrames(actor)[0]);
      }
      actor.sprite.setVisible(visible); actor.shadow.setVisible(visible);
    }
    if(this.rockTarget?.input)this.rockTarget.input.enabled=!visible;
  }
  setEnemyDefeated(defeated) {
    this.enemyDefeated = defeated;
    const actor = this.actors.get("blud");
    if (actor) {
      actor.sprite.setVisible(!defeated); actor.shadow.setVisible(!defeated);
      if (actor.sprite.input) actor.sprite.input.enabled = !defeated;
    }
  }
  clearDestination() {
    this.markerTween?.stop(); this.markerTimeout?.remove(); this.marker?.destroy();
    this.marker = null; this.markerTween = null; this.markerTimeout = null;
  }
  completeDestination() { if (this.markerValid) this.clearDestination(); }
  markDestination(point, valid) {
    this.clearDestination();
    this.markerValid = valid;
    const graphic = this.add.graphics();
    graphic.fillStyle(valid ? 0xb6db8c : 0xe76a5d, .2);
    graphic.lineStyle(2, valid ? 0xd8edaf : 0xff8374, .95);
    graphic.fillCircle(0,0,42);
    graphic.strokeCircle(0,0,42);
    if (!valid) { graphic.lineBetween(-11,-11,11,11); graphic.lineBetween(-11,11,11,-11); }
    else { graphic.strokeCircle(0,0,34); graphic.fillStyle(0xe7f5c5, 1); graphic.fillCircle(0,0,3); }
    this.marker = this.add.container(point.x, point.y, [graphic]).setDepth(3);
    if (valid && !this.reducedMotion) this.markerTween = this.tweens.add({targets:this.marker,alpha:.6,scaleX:.92,scaleY:.92,duration:650,yoyo:true,repeat:-1});
    if (!valid) this.markerTimeout = this.time.delayedCall(850, () => this.clearDestination());
  }
  resizeCamera() {
    const camera = this.cameras.main;
    camera.setSize(this.scale.width, this.scale.height).setZoom(CAMERA_ZOOM * Phaser.Math.Clamp(this.scale.width / this.world.width, .5, 1));
    if (this.heroPosition) this.focusHero();
  }
  focusHero() {
    this.cameras.main.startFollow(this.heroPosition, true, 1, 1, 0, 94 * SPRITE_SCALE * .4);
  }
  bindMapPointer() {
    this.input.on("pointerdown", (pointer) => {
      if (!this.inputAllowed || this.paused || !pointer.primaryDown) return;
      this.pointerGesture = {id:pointer.id,x:pointer.x,y:pointer.y,dragged:false};
    });
    this.input.on("pointermove", (pointer) => {
      const gesture = this.pointerGesture;
      if (gesture?.id === pointer.id && Math.hypot(pointer.x-gesture.x,pointer.y-gesture.y)>8) gesture.dragged=true;
    });
    this.input.on("pointerup", (pointer, over = []) => {
      const gesture=this.pointerGesture; this.pointerGesture=null;
      if (!this.inputAllowed || this.paused || !gesture || gesture.id!==pointer.id || gesture.dragged || Math.hypot(pointer.x-gesture.x,pointer.y-gesture.y)>8) return;
      if(over.includes(this.rockTarget) && this.rockTarget.input.enabled){
        this.onMapClick?.({x:this.world.rock.x,y:this.world.rock.y,interaction:'rock'});return;
      }
      const point=!this.enemyDefeated && over.includes(this.enemySprite) ? this.world.enemy : this.cameras.main.getWorldPoint(pointer.x,pointer.y);
      this.onMapClick?.({x:point.x,y:point.y});
    });
    this.input.on("pointerupoutside",()=>{this.pointerGesture=null;});
  }
  setActiveInput(active) { this.inputAllowed=Boolean(active); if(!active)this.pointerGesture=null; }
  notePlayerActivity() { this.playerActivity = true; }
  setPaused(paused) { this.requestedPause=Boolean(paused); if(this.ready)this.syncPause(); }
  syncPause() {
    this.paused=this.requestedPause || document.hidden;
    if(this.paused) {this.pointerGesture=null;this.heroTween?.pause();this.markerTween?.pause();}
    else {this.heroTween?.resume();this.markerTween?.resume();}
  }
  renderState(state, events=[]) {
    if(!this.ready)return;
    this.facing=state.facing;
    const moved=events.find(event=>event.type==="moved");
    if(!moved)return;
    this.heroTween?.stop(); this.isMoving=true;
    this.heroTween=this.tweens.add({
      targets:this.heroPosition,x:state.position.x,y:state.position.y,
      duration:movementDuration(moved.from,moved.to),ease:"Linear",
      onComplete:()=>{
        this.heroTween=null;this.isMoving=false;
        // The callback may immediately chain another tile. Choose a resting
        // animation only when the whole route/held movement has actually stopped.
        this.onMoveComplete?.();
      },
    });
    if(this.paused)this.heroTween.pause();
  }
  reset(state) {
    if(!this.ready)return;
    this.heroTween?.stop();this.heroTween=null;this.isMoving=false;this.pointerGesture=null;this.clearDestination();
    this.facing=state.facing || "down";Object.assign(this.heroPosition,state.position);
    this.walkCycle={distance:0,position:{...state.position}};this.bludAlert=false;
    this.heroIdle=createHeroIdle();this.luckyIdle=createLuckyIdle();this.playerActivity=false;
    const hero=this.actors.get("hero");this.setVariant(hero,this.heroIdle.variant);hero.elapsed=0;this.applyActorFrame(hero,this.animationFrames(hero)[0]);this.focusHero();
  }
  update(_time,delta) {
    if(!this.ready || this.paused)return;
    const hero=this.actors.get("hero");
    const elapsed = Math.min(delta,100);
    this.heroIdle=advanceHeroIdle(this.heroIdle,delta,{moving:this.isMoving,activity:this.playerActivity});
    this.playerActivity=false;
    this.setVariant(hero,this.isMoving ? (DIRECTION_ROWS[this.facing]==="NE"?"heroWalkNE":"hero") : this.heroIdle.variant);
    const lucky=this.actors.get('moth'),curious=this.variants.get('luckyCurious');
    this.luckyIdle=advanceLuckyIdle(this.luckyIdle,delta,{visible:lucky.sprite.visible},animationDuration(curious.animations.idle,curious));
    this.setVariant(lucky,this.luckyIdle.variant);
    this.bludAlert=noticesHero(this.world,this.heroPosition,this.bludAlert);
    this.setVariant(this.actors.get("blud"),this.bludAlert?"blud":"bludCalm");
    this.walkCycle=advanceWalkCycle(this.walkCycle,this.heroPosition,this.isMoving);
    for(const actor of this.actors.values()) {
      if(!actor.sprite.visible)continue;
      const frames=this.animationFrames(actor);
      actor.elapsed+=elapsed;
      const frameTime=actor.id==='moth'?this.luckyIdle.animationMs:actor.id==='hero'&&!this.isMoving?this.heroIdle.animationMs:actor.elapsed;
      const frame=actor.id==="hero" && this.isMoving
        ? walkFrame(frames,this.walkCycle.distance,actor.config.strideDistance || 64,HERO_WALK_ANIMATION_RATE)
        : this.reducedMotion?frames[0]:animationFrameAt(frames,actor.config,frameTime,{loop:actor.variant!=='luckyCurious'});
      // Feet and shadow follow the tween each frame, even when the atlas frame does not change.
      this.applyActorFrame(actor,frame);
    }
  }
}
