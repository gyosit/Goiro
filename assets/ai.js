/***           ***
 *** Functions *** 
 ***           ***/
var margin = 100;

function detectXY(x, y, size, board_size){
  var xmin = 1e9;
  var ymin = 1e9;
  x -= margin/2;
  y -= margin/2;
  var res_x = 0;
  var res_y = 0;
  for(var i=0;i<board_size;i++){
    let dx = Math.abs(size*i/(board_size-1)-x);
    if(dx<xmin){
      xmin = dx;
      res_x = i;
    }
  }
  for(var j=0;j<board_size;j++){
    let dy = Math.abs(size*j/(board_size-1)-y);
    if(dy<ymin){
      ymin = dy;
      res_y = j;
    }
  }
  return {x: res_x, y: res_y};
}

function initGoban(app, size, texture, sengigan){
  var ds = size/(603-1);
  console.log(size);
  var stars = [];
  if (size == 9){
      stars = [2, 6];
  }else if(size==13){
    stars = [3, 9];
  }else{
    stars = [3, 9, 15];
  }
  let board_color;
  let line_color;
  if (sengigan){
    board_color = 0x2e2930;
    line_color = 0xdbd0e6;
  }else{
    board_color = 0xf5deb3;
    line_color = 0x302833;
  }

  let gobanSprite = new PIXI.Graphics();
  let clickarea = new PIXI.Rectangle(0, 0, 603+margin, 603+margin);
  gobanSprite.interactive = true;
  gobanSprite.hitArea = clickarea;
  gobanSprite.on('pointertap', putStone);
  gobanSprite.on('mousemove', huntDragon);
  app.stage.addChildAt(gobanSprite, 0);
  texture["board"].push(gobanSprite);

  var line = new PIXI.Graphics();
  var gap = 603/(size-1);
  for(var i=0;i<size;i++){
    line.lineStyle(2, line_color).moveTo(margin/2, gap*i+margin/2).lineTo(603+margin/2, gap*i+margin/2);
    app.stage.addChildAt(line, 0);
    texture["board"].push(line);
  }
  for(var i=0;i<size;i++){
    line.lineStyle(2, line_color).moveTo(gap*i+margin/2, margin/2).lineTo(gap*i+margin/2, 603+margin/2);
    app.stage.addChildAt(line, 0);
    texture["board"].push(line);
  }
  
  for(var i=0;i<stars.length;i++){
    for(var j=0;j<stars.length;j++){
      let material = new PIXI.Graphics()
      .beginFill(line_color, 1)
      .drawCircle(gap*stars[i]+margin/2, gap*stars[j]+margin/2, 10)
      .endFill();
      app.stage.addChildAt(material, 0);
      texture["board"].push(material);
    }
  }

  if(size == 9){
    let material = new PIXI.Graphics()
      .beginFill(line_color, 1)
      .drawCircle(gap*4+margin/2, gap*4+margin/2, 10)
      .endFill();
    app.stage.addChildAt(material, 0);
    texture["board"].push(material);
  }else if(size == 13){
    let material = new PIXI.Graphics()
    .beginFill(line_color, 1)
    .drawCircle(gap*6+margin/2, gap*6+margin/2, 10)
    .endFill();
    app.stage.addChildAt(material, 0);
    texture["board"].push(material);
  }
  

  let back = new PIXI.Graphics();
  back.beginFill(board_color);
  back.drawRect(0, 0, 603+margin, 603+margin);
  back.endFill();
  app.stage.addChildAt(back, 0);
  texture["board"].push(back);
}

function loadImage(x, y, app, color, type, size, board_size){
  x *= (size/(board_size-1))+margin/2;
  y *= (size/(board_size-1))+margin/2;
  path = "//localhost:8080/assets/";
  let stone = new PIXI.Texture.from(path + color + ".png");
  let stoneSprite = new PIXI.Sprite(stone);
  stoneSprite.anchor.x = 0.5;
  stoneSprite.anchor.y = 0.5;
  stoneSprite.x = x;
  stoneSprite.y = y;
  switch(type){
  case 4:
    stoneSprite.scale.x = 0.3;
    stoneSprite.scale.y = 0.3;
    break;
  case 3:
    stoneSprite.scale.x = 0.1;
    stoneSprite.scale.y = 0.1;
    break;
  case 2:
    stoneSprite.scale.x = 0.05;
    stoneSprite.scale.y = 0.05;
    stoneSprite.alpha = 0.5;
    break;
  case 1:
    stoneSprite.scale.x = 0.05;
    stoneSprite.scale.y = 0.05;
    stoneSprite.alpha = 0.1;
    break;
  }
  app.stage.addChild(stoneSprite);
  texture[type].push(stoneSprite);
}

function makeImage(x, y, app, color, type, alpha, size, board_size){
  x = x * (size/(board_size-1))+margin/2;
  y = y * (size/(board_size-1))+margin/2;
  var ds = size/(board_size-1);

  switch(type){
  case "territory":
    var material = new PIXI.Graphics()
      .beginFill(color, alpha)
      .drawPolygon([
        x-ds, y-ds,
        x+ds, y-ds,
        x+ds, y+ds,
        x-ds, y+ds,
      ])
      .endFill();
    break;
  case "stone":
    let line_color;
    if(color == 0x000000){
      line_color = 0xffffff;
    }else{
      line_color = 0x000000;
    }
    var material = new PIXI.Graphics()
      .lineStyle(2, line_color, 1)
      .beginFill(color, alpha)
      .drawCircle(x, y, ds/2)
      .endFill();
    break;
  case "bless":
    var material = new PIXI.Graphics()
      .beginFill(color, alpha)
      .drawCircle(x, y, ds/6)
      .endFill();
    break;
  case "last":
    var material = new PIXI.Graphics()
      .beginFill(color, alpha)
      .drawCircle(x, y, ds/6)
      .endFill();
    break;
  case "link1":
    ds = ds/2;
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x-ds/2, y,
      x+ds/2, y,
      x+ds/2, y+ds*2,
      x-ds/2, y+ds*2,
    ])
    .endFill();
    break;
  case "link2":
    ds = ds/2;
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x, y-ds/2,
      x+ds*2, y-ds/2,
      x+ds*2, y+ds/2,
      x, y+ds/2,
    ])
    .endFill();
    break;
  case "link3":
    ds = ds/4;
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x+ds/4, y,
      x+ds*4, y+ds*4-ds/4,
      x+ds*4-ds/4, y+ds*4,
      x, y+ds/2,
    ])
    .endFill();
    break;
  case "link4":
    ds = ds/4;
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x-ds/4, y,
      x-ds*4, y+ds*4-ds/4,
      x-ds*4+ds/4, y+ds*4,
      x, y+ds/2,
    ])
    .endFill();
    break;
  }
  app.stage.addChild(material);
  texture[type].push(material);
}

function deleteImage(texture, type){
  texture[type].forEach(v => {
    app.stage.removeChild(v);
  })
  texture[type].splice(0);
}

function putStone(e) {
  let position = e.data.getLocalPosition(app.stage);
  let {x, y} = detectXY(position.x, position.y, 603, board_size);
  socket.send("coordinate_ai"+" "+(x+100*y)+" "+1);
}

function huntDragon(e) {
  times++;
  if(times % 10 == 0){
    let position = e.data.getLocalPosition(app.stage);
    let {x, y} = detectXY(position.x, position.y, 603, board_size);
    socket.send("dragon "+(x+100*y));
  }
}

document.getElementById("pass").onclick = function() {
  socket.send("pass_ai "+1);
}

document.getElementById("resign").onclick = function() {
  socket.send("resign");
}

document.getElementById("senrigan").onclick = function() {
  socket.send("senrigan");
  senrigan = !senrigan;
  deleteImage(texture, "board");
  initGoban(app, board_size, texture, senrigan);
}

/***      ***
 *** Main *** 
 ***      ***/
let score = new PIXI.Application({width: 603+margin, height: 10});
let app = new PIXI.Application({width: 603+margin, height: 603+margin});

var url = "ws://" + window.location.host + ":1780" + window.location.pathname + "/ws";
var socket = new WebSocket(url);
var black = "";
var white = "";
var c_b = "0";
var c_w = "0";
var senrigan = false;

document.body.appendChild(score.view);
document.body.appendChild(app.view);

console.log(board_size);

let times = 0;
let texture = {"board": [], "stone": [], "territory": [], "bless": [], "last": [], "link1": [], "link2": [], "link3": [], "link4": []};

initGoban(app, board_size, texture, senrigan);

// Disconnect event
socket.addEventListener("close", function(event){
  socket.send("disconnect " + window.location.pathname);
});

// Get Message
socket.onmessage = function(msg){
  var obj = "";
  var size = 0;
  let i = 1, x = 0, y = 0;

  let w_ter = 0x87ceeb;
  let b_ter = 0xdc143c;
  console.log(msg);

  switch(msg['data'].split(":")[0]){
  case "connected":
    socket.send("show");
    break;
  case "board":
    obj = msg['data'].split(":")[1].split(",");
    size = Math.sqrt(obj.length);
    deleteImage(texture, "stone");
    deleteImage(texture, "territory");
    deleteImage(texture, "link1");
    deleteImage(texture, "link2");
    deleteImage(texture, "link3");
    deleteImage(texture, "link4");
    obj.forEach(v => {
      y = Math.floor(i / size);
      x = i % size - 1;
      if(x < 0){
        x = size-1;
        y -= 1;
      }
      var black_t = 0xdc143c;
      var white_t = 0x87ceeb;
      switch(v){
        case "-3":
          makeImage(x, y, app, black_t, "territory", 0.2, 603, board_size);
          break;
        case "-2":
          makeImage(x, y, app, black_t, "territory", 0.1, 603, board_size);
          break;
        case "-1":
          makeImage(x, y, app, black_t, "territory", 0.05, 603, board_size);
          break;
        case "3":
          makeImage(x, y, app, white_t, "territory", 0.2, 603, board_size);
          break;
        case "2":
          makeImage(x, y, app, white_t, "territory", 0.1, 603, board_size);
          break;
        case "1":
          makeImage(x, y, app, white_t, "territory", 0.05, 603, board_size);
          break;
        default:
          break;
      }
      i++;
    })
    i = 1;
    obj.forEach(v => {
      y = Math.floor(i / size);
      x = i % size - 1;
      if(x < 0){
        x = size-1;
        y -= 1;
      }
      var black_s = 0x000000;
      var white_s = 0xffffff;
      switch(v){
        case "-4":
          makeImage(x, y, app, black_s, "stone", 1, 603, board_size);
          break;
        case "4":
          makeImage(x, y, app, white_s, "stone", 1, 603, board_size);
          break;
        default:
          break;
      }
      i++;
    })
    i = 1;
    obj.forEach(v => {
      let black_s = 0x000000;
      let white_s = 0xffffff;
      let link_color;
      y = Math.floor(i / size);
      x = i % size - 1;
      if(x < 0){
        x = size-1;
        y -= 1;
      }
      if(obj[i-1] == obj[i+size-1]){
        switch(v){
          case "-4":
            link_color = black_s;
            makeImage(x, y, app, link_color, "link1", 1, 603, board_size);
            break;
          case "4":
            link_color = white_s;
            makeImage(x, y, app, link_color, "link1", 1, 603, board_size);
            break;
        }
      }
      if(obj[i-1] == obj[i] && i % size != 0){
        switch(v){
          case "-4":
            link_color = black_s;
            makeImage(x, y, app, link_color, "link2", 1, 603, board_size);
            break;
          case "4":
            link_color = white_s;
            makeImage(x, y, app, link_color, "link2", 1, 603, board_size);
            break;
        }
      }
      if(obj[i-1] == obj[i+size] && Math.abs(obj[i]) != 4 && Math.abs(obj[i-1+size]) != 4){
        switch(v){
          case "-4":
            link_color = black_s;
            makeImage(x, y, app, link_color, "link3", 1, 603, board_size);
            break;
          case "4":
            link_color = white_s;
            makeImage(x, y, app, link_color, "link3", 1, 603, board_size);
            break;
        }
      }
      if(obj[i-1] == obj[i+size-2] && Math.abs(obj[i-2]) != 4 && Math.abs(obj[i-1+size]) != 4){
        switch(v){
          case "-4":
            link_color = black_s;
            makeImage(x, y, app, link_color, "link4", 1, 603, board_size);
            break;
          case "4":
            link_color = white_s;
            makeImage(x, y, app, link_color, "link4", 1, 603, board_size);
            break;
        }
      }
      i++;
    })
    document.getElementById("play").innerHTML = "";
    break;
  case "pass":
    document.getElementById("play").innerHTML = "<font color=\"blue\">PASS</font>";
    break;
  case "busy":
    document.getElementById("play").innerHTML = "<font color=\"red\">処理中...</font>";
    break;
  case "bless":
    obj = msg['data'].split(":")[1].split(",");
    size = Math.sqrt(obj.length);
    deleteImage(texture, "bless");
    obj.forEach(v => {
      y = Math.floor(v / 100);
      x = v - y*100;
      makeImage(x, y, app, 0xff0000, "bless", 1, 603, board_size);
    })
    break;
  case "score":
    obj = msg['data'].split(":")[1].split(" ")[0].split("+");
    size = Math.sqrt(obj.length);
    document.getElementById("score").innerHTML = msg['data'].split(":")[1].split(" ")[0];
    obj[1] = parseFloat(obj[1]);
    if(obj[0]=="W"){
      obj[1] *= -1;
    }
    var boudary = (603+margin)/2 - obj[1]*15;
    var w_bar = new PIXI.Graphics()
      .beginFill(w_ter)
      .drawPolygon([
        0, 0,
        boudary, 0,
        boudary, 100,
        0, 100
      ])
    .endFill();
    var b_bar = new PIXI.Graphics()
    .beginFill(b_ter)
    .drawPolygon([
      boudary, 0,
      603+margin, 0,
      603+margin, 100,
      boudary, 100
    ])
  .endFill();
    score.stage.addChild(w_bar);
    score.stage.addChild(b_bar);
    break;
  case "finalscore":
    obj = msg['data'].split(":")[1].split(" ")[0].split("+");
    size = Math.sqrt(obj.length);
    document.getElementById("score").innerHTML = "<b>Good Game! "+msg['data'].split(":")[1].split(" ")[0]+"</b>";
    if(obj[1]=="R") obj[1] = 30;
    obj[1] = parseFloat(obj[1]);
    if(obj[0]=="W"){
      obj[1] *= -1;
    }
    var boudary = (603+margin)/2 - obj[1]*15;
    var w_bar = new PIXI.Graphics()
      .beginFill(w_ter)
      .drawPolygon([
        0, 0,
        boudary, 0,
        boudary, 100,
        0, 100
      ])
    .endFill();
    var b_bar = new PIXI.Graphics()
    .beginFill(b_ter)
    .drawPolygon([
      boudary, 0,
      603+margin, 0,
      603+margin, 100,
      boudary, 100
    ])
    .endFill();
    score.stage.addChild(w_bar);
    score.stage.addChild(b_bar);
    document.getElementById("play").innerHTML = "";
    break;
  case "captured":
    obj = msg['data'].split(":")[1].split(",");
    c_b = obj[0];
    c_w = obj[1];
    document.getElementById("player").innerHTML = "●"+black+"("+c_b+")"+"　○"+white+"("+c_w+")";
    break;
  case "turn":
    obj = msg['data'].split(":")[1];
    let last_turn = obj.split(",")[0];
    let last_pos = obj.split(",")[1];
    let now_turn = "";
    if(last_turn == "B"){
      now_turn = "白番"
    }else{
      now_turn = "黒番"
    }
    document.getElementById("turn").innerHTML = "現在"+now_turn+"です。";
    y = Math.floor(last_pos / 100);
    x = last_pos - y*100;
    deleteImage(texture, "last");
    makeImage(x, y, app, 0xff0000, "last", 1, 603, board_size);
    break;
  case "player":
    obj = msg['data'].split(":")[1];
    black = obj.split(",")[0];
    white = obj.split(",")[1];
    document.getElementById("player").innerHTML = "●"+black+"("+c_b+")"+"　○"+white+"("+c_w+")";
    break;
  }
}

