import Phaser from "phaser";
import "./style.css";
import "./gameplay.css";
import { CLEARING } from "./content/clearing.js";
import { INTRO, NARRATOR } from "./content/story.js";
import { STEP_INTERVAL_MS } from "./content/movement.js";
import { nearRock, planRockApproach } from "./domain/map-interactions.js";
import { createClearingState, attemptClearingMove, attemptClearingMoveTo, planRoute } from "./domain/clearing.js";
import { ClearingScene } from "./scenes/ClearingScene.js";
import { bindMovement } from "./input.js";
import { createAudio } from "./audio.js";
import { createBattle, preloadBattleAssets, DEFAULT_BATTLE_BACKGROUND } from "./battle.js";
import { playBattleTransition } from "./battle-transition.js";
import { mountReviewWorkshop } from "./review-workshop.js";

const $ = (selector) => document.querySelector(selector);
const dialog = $("#story-dialog"), host = $("#game-canvas");
const audio = createAudio();
const clearedWorld = { ...CLEARING, enemy: null };
let state = createClearingState(CLEARING);
let progress = { rockHintSeen: false, enemyDefeated: false };
let screen = "title", ready = false, loadFailed = false, input, route = [], battle, disposed = false, reviewing = false, mapVisible = false;
const currentWorld = () => progress.enemyDefeated ? clearedWorld : CLEARING;
for (const label of document.querySelectorAll("[data-narrator-name]")) label.textContent = NARRATOR.name;
$("#narrator-role").textContent = NARRATOR.role;

function feedback(text) { if ($("#walk-feedback").textContent !== text) $("#walk-feedback").textContent = text; }
function stopWalking() { route = []; input?.releaseAll(); scene.clearDestination(); }
function canMove() { return ready && mapVisible && screen === "world" && !dialog.open && !reviewing && !document.hidden && !document.activeElement?.closest('#review-workshop'); }
function updatePause() { scene.setPaused(!canMove()); }
function updateAudioButton() {
  const button = $("#audio-toggle");
  const label = audio.muted ? "Увімкнути музику" : "Вимкнути музику";
  button.setAttribute("aria-label", label); button.title = label;
  button.setAttribute("aria-pressed", String(!audio.muted));
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>${audio.muted ? '<path d="m17 9 5 6m0-6-5 6"/>' : '<path d="M17 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/>'}</svg>`;
}
updateAudioButton();
$("#audio-toggle").addEventListener("click", async () => { if(canMove())scene.notePlayerActivity(); await audio.setMuted(!audio.muted); updateAudioButton(); });

function showDialog({ speaker, eyebrow, title, paragraphs = [], aside }, closeLabel = "Продовжити", rock = false) {
  stopWalking();
  const isNarrator = speaker === NARRATOR.id;
  dialog.classList.toggle("narrated-dialog", isNarrator);
  dialog.classList.toggle("rock-conversation", rock);
  $("#dialog-speaker").hidden = !isNarrator;
  $("#dialog-speaker img").src = rock ? `${import.meta.env.BASE_URL}assets/portraits/lucky-dialogue-v1.png` : `${import.meta.env.BASE_URL}assets/moth-narrator-v1.png`;
  $("#dialog-ornament").hidden = isNarrator;
  $("#dialog-eyebrow").textContent = eyebrow;
  $("#dialog-title").textContent = title;
  $("#dialog-body").replaceChildren();
  for (const text of paragraphs) { const p = document.createElement("p"); p.textContent = text; $("#dialog-body").append(p); }
  if (aside) { const p = document.createElement("p"); p.className = "dialog-aside"; p.textContent = aside; $("#dialog-body").append(p); }
  $("#dialog-close").textContent = closeLabel;
  dialog.showModal(); updatePause();
}
function checkRock() {
  if (progress.rockHintSeen || !canMove()) return false;
  if (!nearRock(CLEARING,state.position)) return false;
  progress.rockHintSeen = true;
  scene.setLuckyVisible(true);
  showDialog({speaker:NARRATOR.id,eyebrow:"ЛАКІ",title:"Тут не пройти."}, "Зрозуміло →", true);
  return true;
}
function handleResult(result) {
  state = result.state;
  scene.renderState(state, result.events);
  $("#step-count").textContent = `Кроків: ${state.steps}`;
  const event = result.events[0];
  if (event?.type === "encounter") beginBattle();
  else if (event?.type === "blocked") {
    route=[]; scene.clearDestination();
    if (!checkRock()) feedback(event.reason === "rock" ? "Камінь перекрив дорогу. Обійди нижньою стежкою." : "Тут не пройти. Тримайся стежки.");
  }
}
function move(direction) {
  // A held key cancels a click destination even while the previous short step finishes.
  route=[]; scene.clearDestination();
  if (!canMove()) return false;
  scene.notePlayerActivity();
  if (scene.isMoving) return false;
  handleResult(attemptClearingMove(state,direction,currentWorld(),{slide:true}));
  return true;
}
function advanceRoute() {
  if (!canMove() || scene.isMoving) return;
  if (!route.length) {
    if(scene.marker && scene.markerValid)feedback("Ти на місці. Обери наступну точку або рушай стрілками.");
    scene.completeDestination(); return;
  }
  const target=route.shift();
  handleResult(attemptClearingMoveTo(state,target,currentWorld()));
  if (!scene.isMoving && screen === "world" && !route.length) scene.completeDestination();
}
function onMoveComplete() {
  if (!canMove() || checkRock()) return;
  if (input?.getHeldDirection()) input.continueHeld();
  else advanceRoute();
}
function walkTo(point) {
  if (!canMove()) return;
  scene.notePlayerActivity();
  input?.releaseAll();
  const rockClick=point.interaction==='rock' && !progress.rockHintSeen;
  if (rockClick && checkRock()) return;
  const result=rockClick ? planRockApproach(currentWorld(),state.position) : planRoute(currentWorld(),state.position,point);
  route=result.path;
  scene.markDestination(rockClick ? result.target : point,result.status === "accepted");
  if(result.status !== "accepted") { audio.sound("block"); feedback(result.status === "invalid" ? "Тут не пройти. Обери стежку." : "До цього місця зараз немає проходу."); return; }
  feedback(rockClick ? "Підійду ближче й огляну камінь." : "Ціль позначено. Натисни інше місце, щоб змінити маршрут.");
  if (!route.length) scene.clearDestination();
  else advanceRoute();
}
async function beginBattle() {
  if (screen !== "world" || progress.enemyDefeated) return;
  screen="transition"; stopWalking(); updatePause();
  workshop.setTrialEnabled(false);
  $("#journal-button").disabled=true; $("#home-link").setAttribute("aria-disabled","true");
  // Attach the error handler immediately, while the map transition is playing.
  const assets=preloadBattleAssets().then(()=>null,error=>error);
  let cleanup;
  try {
    cleanup=await playBattleTransition(game,host);
    const assetError=await assets;
    if(assetError)throw assetError;
    if (disposed) return;
    $("#exploration-view").hidden=true; $("#battle-host").hidden=false;
    screen="battle"; audio.setMode("battle");
    battle=createBattle({host:$("#battle-host"),onSound:audio.sound,language:"uk",background:DEFAULT_BATTLE_BACKGROUND,intro:true});
    const finished=battle.start(); cleanup(); cleanup=null;
    const result=await finished;
    if (disposed) return;
    battle.destroy(); battle=null;
    if(result.outcome === "victory") {
      progress.enemyDefeated=true; scene.setEnemyDefeated(true);
      host.setAttribute("aria-label","Лісова галявина. Блуд переможений. Міст відкритий. Рухайтесь стрілками, WASD або натисніть на стежку.");
      feedback("Блуд розвіявся. Переправа вільна — можна пройти до мосту.");
      $(".objective").textContent="Блуд зник. Дорога до переправи відкрита.";
    } else feedback("Ти знову на стежці. Переведи подих і спробуй ще раз — здоров’я відновлено.");
  } catch(error) {
    console.error("Battle could not start",error);
    feedback("Не вдалося відкрити бій. Підійди до Блуда ще раз.");
    battle?.destroy(); battle=null;
  } finally {
    cleanup?.();
    if (!disposed) {
      screen="world"; audio.setMode("field");
      workshop.setTrialEnabled(true);
      $("#battle-host").hidden=true; $("#exploration-view").hidden=false;
      $("#journal-button").disabled=false; $("#home-link").removeAttribute("aria-disabled");
      stopWalking(); scene.notePlayerActivity(); resizeGame(); updatePause(); host.focus({preventScroll:true}); window.scrollTo(0,0);
    }
  }
}
const scene=new ClearingScene({world:CLEARING,getState:()=>state,onMapClick:walkTo,onMoveComplete,
  onReady:()=>{ready=true;$("#start-button").disabled=false;$("#start-button span").textContent="Почати гру";updatePause();},
  onError:(error)=>{console.error(error);loadFailed=true;ready=false;$("#start-button").disabled=false;$("#start-button span").textContent="Спробувати ще раз";$(".title-hint").textContent="Не вдалося завантажити мапу. Натисни, щоб повторити.";},
});
const game=new Phaser.Game({type:Phaser.AUTO,parent:"game-canvas",width:900,height:600,backgroundColor:"#060c0b",pixelArt:false,roundPixels:true,antialias:true,scale:{mode:Phaser.Scale.RESIZE},scene:[scene],input:{keyboard:false},banner:false,callbacks:{postBoot:instance=>instance.canvas.setAttribute("aria-hidden","true")}});
function resizeGame() {
  if(screen!=="world")return;
  const {width,height}=host.getBoundingClientRect();
  if(width>0 && height>0)game.scale.resize(Math.round(width),Math.round(height));
}
const observer=new ResizeObserver(resizeGame);observer.observe(host);
const mapVisibility=new IntersectionObserver(([entry])=>{
  mapVisible=entry.isIntersecting;
  if(!mapVisible)stopWalking();
  updatePause();
});
mapVisibility.observe(host);
input=bindMovement({buttons:[...document.querySelectorAll("[data-direction]")],canMove,move,repeatMs:STEP_INTERVAL_MS});
function resetWalk() {
  stopWalking();state=createClearingState(CLEARING);progress={rockHintSeen:false,enemyDefeated:false};
  scene.reset(state);scene.setLuckyVisible(false);scene.setEnemyDefeated(false);
  host.setAttribute("aria-label","Лісова галявина. Рухайтесь стрілками, WASD або натисніть на стежку. Обійдіть камінь нижньою стежкою. Блуд стоїть біля мосту.");
  $("#step-count").textContent="Кроків: 0";
  $(".objective").textContent="Камінь перекрив коротку стежку. Знайди обхід нижньою дорогою та підійди до Блуда біля мосту.";
  feedback("Камінь попереду. Обійди його нижньою стежкою та знайди Блуда біля мосту.");
}
$("#start-button").addEventListener("click",()=>{
  if(loadFailed){location.reload();return;} if(!ready)return;
  audio.unlock();screen="world";$("#title-screen").hidden=true;$("#game-screen").hidden=false;
  resizeGame();resetWalk();window.scrollTo(0,0);showDialog(INTRO,"Вирушити");
});
$("#dialog-close").addEventListener("click",()=>dialog.close());
dialog.addEventListener("close",()=>{stopWalking();scene.notePlayerActivity();updatePause();host.focus({preventScroll:true});$("#status").textContent="Карту відкрито. Рухайтесь стрілками, WASD або натисніть на стежку.";});
$("#journal-button").addEventListener("click",()=>{if(screen==="world")showDialog(INTRO,"Закрити нотатки");});
$("#restart-walk").addEventListener("click",()=>{if(canMove()){resetWalk();host.focus({preventScroll:true});}});
$("#home-link").addEventListener("click",event=>{
  event.preventDefault();if(screen!=="world")return;
  stopWalking();screen="title";updatePause();$("#game-screen").hidden=true;$("#title-screen").hidden=false;$("#start-button").focus();
});
function onBlur(){stopWalking();}
function onVisibility(){stopWalking();updatePause();}
window.addEventListener("blur",onBlur);document.addEventListener("visibilitychange",onVisibility);
const workshop=mountReviewWorkshop({host:$("#review-workshop"),canOpen:()=>['title','world'].includes(screen)&&!dialog.open,onOpen:()=>{reviewing=true;stopWalking();updatePause();},onClose:()=>{reviewing=false;scene.notePlayerActivity();updatePause();},onSound:audio.sound});
if(import.meta.hot)import.meta.hot.dispose(()=>{
  disposed=true;observer.disconnect();mapVisibility.disconnect();window.removeEventListener("blur",onBlur);document.removeEventListener("visibilitychange",onVisibility);
  input.destroy();workshop.destroy();battle?.destroy();audio.destroy();game.destroy(true);
});
