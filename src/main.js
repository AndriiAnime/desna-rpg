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
import { UI_PREFERENCES, UI_COPY as t, applyInterfaceCopy } from "./ui-preferences.js";
import "./ui-fonts.css";
import { mountTitleScreen } from "./title-screen.js";
import "./immersive.css";

const $ = (selector) => document.querySelector(selector);
applyInterfaceCopy();
const titleScreen = mountTitleScreen($("#title-screen"), { language: UI_PREFERENCES.language });
const dialog = $("#story-dialog"), host = $("#game-canvas"), pauseDialog = $("#pause-dialog");
const audio = createAudio();
const clearedWorld = { ...CLEARING, enemy: null };
let state = createClearingState(CLEARING);
let progress = { rockHintSeen: false, enemyDefeated: false };
let screen = "title", ready = false, loadFailed = false, input, route = [], battle, disposed = false, mapVisible = false;
const currentWorld = () => progress.enemyDefeated ? clearedWorld : CLEARING;
for (const label of document.querySelectorAll("[data-narrator-name]")) label.textContent = t.lucky;
$("#narrator-role").textContent = t.narrator;
$("#start-button span").textContent = t.loading;
$("#game-screen").setAttribute("aria-label", UI_PREFERENCES.language === "en" ? "Exploration" : "Ігрова карта");
$("#battle-host").setAttribute("aria-label", UI_PREFERENCES.language === "en" ? "Battle by the crossing" : "Бій біля переправи");
$("#help-button").setAttribute("aria-label", t.howTo);
$("#menu-button").setAttribute("aria-label", t.menu);
$(".dpad").setAttribute("aria-label", t.controls);
$(".day-phase").setAttribute("aria-label", `${t.phase}: ${t.day}`);
for (const [index, button] of [...document.querySelectorAll("[data-direction]")].entries()) button.setAttribute("aria-label", t.directions[index]);

let feedbackTimer, typingTimer, dialogLines = [], dialogPage = 0, dialogFinalLabel = t.next, typing = false;
function feedback(text) {
  clearTimeout(feedbackTimer);
  const label = $("#walk-feedback");
  label.textContent = text;
  label.classList.toggle("is-visible", Boolean(text));
  feedbackTimer = setTimeout(() => label.classList.remove("is-visible"), 3500);
}
function stopWalking() { route = []; input?.releaseAll(); scene.clearDestination(); }
function canMove() { return ready && mapVisible && screen === "world" && !dialog.open && !pauseDialog.open && !document.hidden; }
function updatePause() { scene.setPaused(!canMove()); }
function updateAudioButton() {
  const button = $("#audio-toggle");
  const label = audio.muted ? t.unmute : t.mute;
  button.setAttribute("aria-label", label); button.title = label;
  button.setAttribute("aria-pressed", String(!audio.muted));
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>${audio.muted ? '<path d="m17 9 5 6m0-6-5 6"/>' : '<path d="M17 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/>'}</svg>`;
}
updateAudioButton();
$("#audio-toggle").addEventListener("click", async () => { if(canMove())scene.notePlayerActivity(); await audio.setMuted(!audio.muted); updateAudioButton(); });

function finishTyping() {
  clearInterval(typingTimer); typing = false;
  $("#dialog-body [aria-hidden]").textContent = dialogLines[dialogPage] || "";
}
function renderDialogPage() {
  clearInterval(typingTimer);
  const text = dialogLines[dialogPage] || "";
  const p = document.createElement("p");
  $("#dialog-body").replaceChildren(p);
  $("#dialog-count").textContent = dialogLines.length > 1 ? `${dialogPage + 1} / ${dialogLines.length}` : "";
  $("#dialog-close").textContent = `${dialogPage === dialogLines.length - 1 ? dialogFinalLabel : t.next} →`;
  // Screen readers receive the full line; visual typing does not announce each letter.
  const accessible = document.createElement("span"); accessible.className = "dialog-accessible"; accessible.textContent = text; p.append(accessible);
  const visual = document.createElement("span"); visual.setAttribute("aria-hidden", "true"); p.append(visual);
  let length = 0;
  typing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!typing) { visual.textContent = text; return; }
  typingTimer = setInterval(() => {
    visual.textContent = text.slice(0, ++length);
    if (length >= text.length) { clearInterval(typingTimer); typing = false; }
  }, 24);
}
function showDialog({ speaker, title, paragraphs = [], aside, tutorial = false }, closeLabel = t.next, rock = false) {
  stopWalking();
  if (pauseDialog.open) pauseDialog.close();
  const isNarrator = speaker === NARRATOR.id;
  dialog.classList.toggle("narrated-dialog", isNarrator);
  dialog.classList.toggle("rock-conversation", rock);
  dialog.classList.toggle("tutorial-dialog", tutorial);
  $("#dialog-speaker").hidden = !isNarrator;
  $("#dialog-speaker img").src = `${import.meta.env.BASE_URL}assets/portraits/lucky-dialogue-v1.png`;
  $("#dialog-ornament").hidden = true;
  $("#dialog-eyebrow").textContent = tutorial ? t.tutorialEyebrow : t.lucky;
  $("#dialog-title").textContent = title || "";
  $("#dialog-title").hidden = !tutorial;
  dialog.setAttribute("aria-labelledby", tutorial ? "dialog-title" : "dialog-eyebrow");
  dialogLines = [...paragraphs, ...(aside ? [aside] : [])];
  if (!dialogLines.length) dialogLines = [title || ""];
  dialogPage = 0; dialogFinalLabel = closeLabel;
  renderDialogPage();
  dialog.showModal(); updatePause();
}
const localizedIntro = UI_PREFERENCES.language === "uk" ? INTRO : {
  speaker: NARRATOR.id,
  paragraphs: [
    "Your grandfather asked for just one thing: to return to the Desna, to the old burial mound where the wind remembers the voices of your family.",
    "Your mother handed you a clay urn and asked: ‘Scatter his ashes before dawn, so his soul can find peace.’",
    "I will stay by your side and guide you. A forest path, a river crossing, and a long night lie ahead. Shall we take the first step?"
  ],
  aside: "Look for the bridge on the eastern edge of the clearing. There is no timer, so explore at your own pace."
};
function showTutorial() {
  if (screen === "world") showDialog({tutorial:true,title:t.tutorialTitle,paragraphs:t.tutorialLines},t.understood);
}
function checkRock() {
  if (progress.rockHintSeen || !canMove()) return false;
  if (!nearRock(CLEARING,state.position)) return false;
  progress.rockHintSeen = true;
  scene.setLuckyVisible(true);
  showDialog({speaker:NARRATOR.id,title:t.rock}, t.understood, true);
  return true;
}
function handleResult(result) {
  state = result.state;
  scene.renderState(state, result.events);
  $("#step-count").textContent = `${t.steps}: ${state.steps}`;
  const event = result.events[0];
  if (event?.type === "encounter") beginBattle();
  else if (event?.type === "blocked") {
    route=[]; scene.clearDestination();
    if (!checkRock()) feedback(event.reason === "rock" ? t.rockBlocked : t.groundBlocked);
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
    if(scene.marker && scene.markerValid)feedback(t.arrived);
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
  if(result.status !== "accepted") { audio.sound("block"); feedback(result.status === "invalid" ? t.invalid : t.unreachable); return; }
  feedback(rockClick ? t.approaching : t.destination);
  if (!route.length) scene.clearDestination();
  else advanceRoute();
}
async function beginBattle() {
  if (screen !== "world" || progress.enemyDefeated) return;
  screen="transition"; stopWalking(); updatePause();
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
    screen="battle"; $("#game-screen").dataset.scene="battle"; audio.setMode("battle");
    battle=createBattle({host:$("#battle-host"),onSound:audio.sound,language:UI_PREFERENCES.language,feedback:UI_PREFERENCES.feedback,background:DEFAULT_BATTLE_BACKGROUND,intro:true});
    const finished=battle.start(); cleanup(); cleanup=null;
    const result=await finished;
    if (disposed) return;
    battle.destroy(); battle=null;
    if(result.outcome === "victory") {
      progress.enemyDefeated=true; scene.setEnemyDefeated(true);
      host.setAttribute("aria-label",`${t.map} ${t.clearedObjective}`);
      feedback(t.victory);
      $(".objective").textContent=t.clearedObjective;
    } else feedback(t.defeat);
  } catch(error) {
    console.error("Battle could not start",error);
    feedback(t.battleError);
    battle?.destroy(); battle=null;
  } finally {
    cleanup?.();
    if (!disposed) {
      screen="world"; $("#game-screen").dataset.scene="world"; audio.setMode("field");
      $("#battle-host").hidden=true; $("#exploration-view").hidden=false;
      $("#journal-button").disabled=false; $("#home-link").removeAttribute("aria-disabled");
      stopWalking(); scene.notePlayerActivity(); resizeGame(); updatePause(); host.focus({preventScroll:true}); window.scrollTo(0,0);
    }
  }
}
const scene=new ClearingScene({world:CLEARING,getState:()=>state,onMapClick:walkTo,onMoveComplete,
  onReady:()=>{ready=true;$("#start-button").disabled=false;$("#start-button span").textContent=t.start;updatePause();},
  onError:(error)=>{console.error(error);loadFailed=true;ready=false;$("#start-button").disabled=false;$("#start-button span").textContent=t.retry;$(".title-hint").textContent=t.loadError;},
});
const game=new Phaser.Game({type:Phaser.AUTO,parent:"game-canvas",width:900,height:600,transparent:true,pixelArt:false,roundPixels:true,antialias:true,scale:{mode:Phaser.Scale.RESIZE},scene:[scene],input:{keyboard:false},banner:false,callbacks:{postBoot:instance=>instance.canvas.setAttribute("aria-hidden","true")}});
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
  host.setAttribute("aria-label",t.map);
  $("#step-count").textContent=`${t.steps}: 0`;
  $(".objective").textContent=t.objective;
  feedback("");
}
$("#start-button").addEventListener("click",()=>{
  if(loadFailed){location.reload();return;} if(!ready)return;
  audio.unlock();screen="world";$("#title-screen").hidden=true;$("#game-screen").hidden=false;
  resizeGame();resetWalk();window.scrollTo(0,0);showDialog(localizedIntro,t.go);
});
$("#dialog-close").addEventListener("click",()=>{
  if (typing) { finishTyping(); return; }
  if (dialogPage < dialogLines.length - 1) { dialogPage++; renderDialogPage(); }
  else dialog.close();
});
dialog.addEventListener("close",()=>{clearInterval(typingTimer);typing=false;stopWalking();scene.notePlayerActivity();updatePause();host.focus({preventScroll:true});$("#status").textContent=t.map;});
$("#journal-button").addEventListener("click",showTutorial);
$("#help-button").addEventListener("click",showTutorial);
$("#menu-button").addEventListener("click",()=>{ if (screen !== "world") return; stopWalking();pauseDialog.showModal();updatePause(); });
$("#resume-button").addEventListener("click",()=>pauseDialog.close());
pauseDialog.addEventListener("close",()=>{stopWalking();scene.notePlayerActivity();updatePause();if(!dialog.open && screen === "world")host.focus({preventScroll:true});});
$("#restart-walk").addEventListener("click",()=>{if(screen === "world"){pauseDialog.close();resetWalk();host.focus({preventScroll:true});}});
$("#home-link").addEventListener("click",event=>{
  event.preventDefault();if(screen!=="world")return;
  stopWalking();screen="title";pauseDialog.close();updatePause();$("#game-screen").hidden=true;$("#title-screen").hidden=false;$("#start-button").focus();
});
function onBlur(){stopWalking();}
function onVisibility(){stopWalking();updatePause();}
window.addEventListener("blur",onBlur);document.addEventListener("visibilitychange",onVisibility);
if(import.meta.hot)import.meta.hot.dispose(()=>{
  disposed=true;observer.disconnect();mapVisibility.disconnect();window.removeEventListener("blur",onBlur);document.removeEventListener("visibilitychange",onVisibility);
  clearTimeout(feedbackTimer);clearInterval(typingTimer);input.destroy();titleScreen.destroy();battle?.destroy();audio.destroy();game.destroy(true);
});
