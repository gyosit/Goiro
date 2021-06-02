SIDE = 500;
margin = 100;
window_w = document.documentElement.clientWidth;
window_h = document.documentElement.clientHeight;
if (window_w > window_h){
  GAME_WIDTH = SIDE+margin*2+220;
  GAME_HEIGHT = SIDE+margin;
}else{
  GAME_WIDTH = SIDE+margin;
  GAME_HEIGHT = SIDE+margin*2+240;
}

var rendererOptions = {
  antialiasing: false,
  transparent: false,
  resolution: window.devicePixelRatio,
  autoResize: true,
  preserveDrawingBuffer: true
}
  
// Create the canvas in which the game will show, and a
// generic container for all the graphical objects
renderer = PIXI.autoDetectRenderer(GAME_WIDTH, GAME_HEIGHT, rendererOptions);
const loader = new PIXI.Loader();
  
// Put the renderer on screen in the corner
renderer.view.style.position = "absolute";
renderer.view.style.top = "0px";
renderer.view.style.left = "0px";

//let app = new PIXI.Application({width: window_w-10, height: window_h-10})
//document.body.appendChild(app.view);
document.body.appendChild(renderer.view);
stage = new PIXI.Container();
renderer.render(stage);

let path = "/assets/images/";
makeButton("back");

function makeButton(name){
  loader
  .add(name, path + name + ".png")
  .load((loader, resources)=>{
    let objSprite = new PIXI.Sprite(PIXI.utils.TextureCache[name]);
    objSprite.x = 100;
    objSprite.y = 0;
    objSprite.scale.x = 0.4;
    objSprite.scale.y = 0.4;
    stage.addChild(objSprite);
    renderer.render(stage);
  });
}
