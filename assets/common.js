 /***      ***
  *** Main *** 
  ***      ***/
var scene = "home";
/* 
home: ホーム画面
play: プレイ画面
review: 検討画面
*/
var SIDE = 500;
var margin = 100;
var window_w = document.documentElement.clientWidth;
var window_h = document.documentElement.clientHeight;
if (window_w > window_h){
  var GAME_WIDTH = SIDE+margin*2+220;
  var GAME_HEIGHT = SIDE+margin;
}else{
  var GAME_WIDTH = SIDE+margin;
  var GAME_HEIGHT = SIDE+margin*2+240;
}

var rendererOptions = {
  antialiasing: false,
  transparent: false,
  resolution: window.devicePixelRatio,
  autoResize: true,
  preserveDrawingBuffer: true,
  backgroundColor : 0x1099bb
}
  
// Create the canvas in which the game will show, and a
// generic container for all the graphical objects
var renderer = PIXI.autoDetectRenderer(GAME_WIDTH, GAME_HEIGHT, rendererOptions, {preserveDrawingBuffer: true});
  
// Put the renderer on screen in the corner
renderer.view.style.position = "absolute";
renderer.view.style.top = "0px";
renderer.view.style.left = "0px";

window_w = document.documentElement.clientWidth;
window_h = document.documentElement.clientHeight;

//let app = new PIXI.Application({width: window_w-10, height: window_h-10})
//document.body.appendChild(app.view);
document.body.appendChild(renderer.view);
var stage = new PIXI.Container();
stage.sortableChildren = true;

var black = "";
var white = "";
var c_b = "0";
var c_w = "0";

var senrigan = false;
var stone_state = 0;
var link_visible = true;
let times = 0;
var review_times = 0;
var review_index = 0;

var pass_f = function() {
  console.log(mode);
  if(mode != "free")
    socket.send("pass_ai "+1);
  else
    socket.send("pass "+1);
}

var resign_f = function() {
  socket.send("resign");
}

var change_f = function() {
  switch(stone_state){
  case 0:
    link_visible = false;
    stone_state = 1;
    break;
  case 1:
    stone_state = 2;
    socket.send("show");
    break;
  case 2:
    link_visible = true;
    stone_state = 0;
    break;
  }
  deleteImage("board");
  initGoban(board_size);
  visibleLink(link_visible);
}

var senrigan_f = function() {
  socket.send("senrigan");
  senrigan = !senrigan;
  deleteImage("board");
  initGoban(board_size);
}

var back_f = function() {
  socket.send("back");
}
var forward_f = function() {
  socket.send("forward");
}
var resume_f = function() {
  socket.send("resume");
}
var override_f = function() {
  socket.send("override");
}
var head_f = function() {
  socket.send("head");
}
var end_f = function() {
  socket.send("end");
}
var vshuman_f = function(){

}
var vscom_f = function(){
  // AI対戦設定画面
  deleteImage("button");
  deleteImage("text");
  
  putText(0, 50, "強さ", font_style, "text");
  putText(350, 50, "普通", font_style, "level");
  makeButton(300, 50, "back", function(){
    let t = getText("level");
    switch(t){
      case "普通":
        editText("level", "強い");
        break;
      case "強い":
        editText("level", "普通");
        break;
    }
  });
  makeButton(550, 50, "forward", function(){
    let t = getText("level");
    switch(t){
      case "普通":
        editText("level", "強い");
        break;
      case "強い":
        editText("level", "普通");
        break;
    }
  });
  putText(0, 100, "盤のサイズ", font_style, "text");
  putText(350, 100, "9", font_style, "b_size");
  makeButton(300, 100, "back", function(){
    let t = getText("b_size");
    switch(t){
      case "19":
        editText("b_size", 13);
        break;
      case "13":
        editText("b_size", 9);
        break;
      case "9":
        editText("b_size", 19);
        break;
    }
  });
  makeButton(550, 100, "forward", function(){
    let t = getText("b_size");
    switch(t){
      case "19":
        editText("b_size", 9);
        break;
      case "13":
        editText("b_size", 19);
        break;
      case "9":
        editText("b_size", 13);
        break;
    }
  });
  putText(0, 150, "コミ(白が得る地)", font_style, "text");
  putText(350, 150, "6.5", font_style, "komi");
  makeButton(300, 150, "back", function(){
    let t = parseFloat(getText("komi"));
    switch(t){
      case 0.5:
        editText("komi", 0);
        break;
      case 0:
        editText("komi", -0.5);
        break;
      default:
        editText("komi", t-1);
        break;
    }
  });
  makeButton(550, 150, "forward", function(){
    let t = parseFloat(getText("komi"));
    switch(t){
      case -0.5:
        editText("komi", 0);
        break;
      case 0:
        editText("komi", 0.5);
        break;
      default:
        editText("komi", t+1);
        break;
    }
  });
  putText(0, 200, "手番", font_style, "text");
  putText(350, 200, "にぎり(ランダム)", font_style, "turn_set");
  makeButton(300, 200, "back", function(){
    let t = getText("turn_set");
    switch(t){
      case "黒番":
        editText("turn_set", "にぎり(ランダム)");
        break;
      case "白番":
        editText("turn_set", "黒番");
        break;
      case "にぎり(ランダム)":
        editText("turn_set", "白番");
        break;
    }
  });
  makeButton(550, 200, "forward", function(){
    let t = getText("turn_set");
    switch(t){
      case "黒番":
        editText("turn_set", "白番");
        break;
      case "白番":
        editText("turn_set", "にぎり(ランダム)");
        break;
      case "にぎり(ランダム)":
        editText("turn_set", "黒番");
        break;
    }
  });
  putText(0, 250, "ハンデ(黒が置く石の数)", font_style, "text");
  putText(350, 250, "0", font_style, "hande");
  makeButton(300, 250, "back", function(){
    let t = parseFloat(getText("hande"));
    if(t > 0) editText("hande", t-1);
  });
  makeButton(550, 250, "forward", function(){
    let t = parseFloat(getText("hande"));
    if(t < 9) editText("hande", t+1);
  });
  makeButton(100, 350, "backarrow", resize);
  makeButton(300, 350, "vscom_start", function(){
    scene = "play";
    let level = getText("level");
    board_size = getText("b_size");
    let komi = getText("komi");
    let turn_set = getText("turn_set");
    let hande = getText("hande");
    mode = "ai";
    socket.send("create_room "+
                  username+" "+
                  board_size+" "+
                  komi+" "+
                  turn_set+" "+
                  hande+" "+
                  mode+" "+
                  level);
    resize();
    socket.send("show");
  });
}
var vsfree_f = function(){
  // 自由碁盤設定画面
  deleteImage("button");
  deleteImage("text");
  putText(0, 100, "盤のサイズ", font_style, "text");
  putText(350, 100, "9", font_style, "b_size");
  makeButton(300, 100, "back", function(){
    let t = getText("b_size");
    switch(t){
      case "19":
        editText("b_size", 13);
        break;
      case "13":
        editText("b_size", 9);
        break;
      case "9":
        editText("b_size", 19);
        break;
    }
  });
  makeButton(550, 100, "forward", function(){
    let t = getText("b_size");
    switch(t){
      case "19":
        editText("b_size", 9);
        break;
      case "13":
        editText("b_size", 19);
        break;
      case "9":
        editText("b_size", 13);
        break;
    }
  });
  putText(0, 150, "コミ(白が得る地)", font_style, "text");
  putText(350, 150, "6.5", font_style, "komi");
  makeButton(300, 150, "back", function(){
    let t = parseFloat(getText("komi"));
    switch(t){
      case 0.5:
        editText("komi", 0);
        break;
      case 0:
        editText("komi", -0.5);
        break;
      default:
        editText("komi", t-1);
        break;
    }
  });
  makeButton(550, 150, "forward", function(){
    let t = parseFloat(getText("komi"));
    switch(t){
      case -0.5:
        editText("komi", 0);
        break;
      case 0:
        editText("komi", 0.5);
        break;
      default:
        editText("komi", t+1);
        break;
    }
  });
  putText(0, 200, "ハンデ(黒が置く石の数)", font_style, "text");
  putText(350, 200, "0", font_style, "hande");
  makeButton(300, 200, "back", function(){
    let t = parseFloat(getText("hande"));
    if(t > 0) editText("hande", t-1);
  });
  makeButton(550, 200, "forward", function(){
    let t = parseFloat(getText("hande"));
    if(t < 9) editText("hande", t+1);
  });
  makeButton(100, 300, "backarrow", resize);
  makeButton(300, 300, "vsfree_start", function(){
    scene = "play";
    board_size = getText("b_size");
    let komi = getText("komi");
    let hande = getText("hande");
    mode = "free";
    socket.send("create_room "+
                  username+" "+
                  board_size+" "+
                  komi+" "+
                  "ignore "+
                  hande+" "+
                  mode+" "+
                  1);
    resize();
    socket.send("show");
  });
}

var texture = {"board": [], 
              "stone": [],
              "territory": [],
              "bless": [],
              "last": [],
              "link1": [],
              "link2": [],
              "link3": [],
              "link4": [],
              "link5": [],
              "link6": [],
              "link7": [],
              "link8": [],
              "link9": [],
              "link10": [],
              "link11": [],
              "link12": [],
              "link13": [],
              "link14": [],
              "button": [],
              "player": [],
              "message": [],
              "txt_home": [],
              "score": [],
              "turn": [],
              "text": [],
              "button_home": []};
var links = [];
var info_y = {"button": 5,
              "button2": 7,
              "button3": 8,
              "player": 1,
              "message": 2,
              "txt_home": 1, 
              "score": 3,
              "turn": 4};
var b_events = {"pass": pass_f,
                "resign": resign_f,
                "senrigan": senrigan_f,
                "change": change_f,
                "head": head_f,
                "back": back_f,
                "forward": forward_f,
                "end": end_f,
                "resume": resume_f,
                "override": override_f,
                "vshuman": vshuman_f,
                "vscom": vscom_f,
                "vsfree": vsfree_f, };
var font_style = {font:'60pt Arial', fill:'black'};

var url = "wss://" + window.location.host + ":1780" + "/connect/" + username+ "/ws";
//var url = "ws://" + window.location.host + "/connect/" + username+ "/ws";
var socket = new WebSocket(url);
var xhr = new XMLHttpRequest();

// Disconnect event
socket.addEventListener("close", function(event){
  socket.send("disconnect " + window.location.pathname);
});
 
// Get Message
socket.onmessage = function(msg){
  var obj = "";
  let i = 1, x = 0, y = 0;

  console.log(msg);

  switch(msg['data'].split(":")[0]){
  case "connected":
    console.log("Connected by web");
    //socket.send("show");
    break;
  case "board":{
    if(scene != "play") return;
    obj = msg['data'].split(":")[1].split(",");
    let size = Math.sqrt(obj.length);
    deleteImage("stone");
    deleteImage("territory");
    deleteImage("link1");
    deleteImage("link2");
    deleteImage("link3");
    deleteImage("link4");
    deleteImage("link5");
    deleteImage("link6");
    deleteImage("link7");
    deleteImage("link8");
    deleteImage("link9");
    deleteImage("link10");
    deleteImage("link11");
    deleteImage("link12");
    deleteImage("link13");
    deleteImage("link14");
    obj.forEach(v => {
      y = Math.floor(i / size);
      x = i % size - 1;
      if(x < 0){
        x = size-1;
        y -= 1;
      }
      if(stone_state == 2){
        var black_t = 0xff1b0f;
        var white_t = 0x921b96;
      }else{
        var black_t = 0xdc143c;
        var white_t = 0x87ceeb;
      }

      switch(v){
        case "-3":
          makeImage(x, y, black_t, "territory", 0.2, SIDE, board_size);
          break;
        case "-2":
          makeImage(x, y, black_t, "territory", 0.1, SIDE, board_size);
          break;
        case "-1":
          makeImage(x, y, black_t, "territory", 0.05, SIDE, board_size);
          break;
        case "3":
          makeImage(x, y, white_t, "territory", 0.2, SIDE, board_size);
          break;
        case "2":
          makeImage(x, y, white_t, "territory", 0.1, SIDE, board_size);
          break;
        case "1":
          makeImage(x, y, white_t, "territory", 0.05, SIDE, board_size);
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
          makeImage(x, y, black_s, "stone", 1, SIDE, board_size);
          break;
        case "4":
          makeImage(x, y, white_s, "stone", 1, SIDE, board_size);
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
      let skip = false;
      switch(v){
        case "-4":
          link_color = black_s;
          break;
        case "4":
          link_color = white_s;
          break;
        default:
          skip = true;
          break;
      }
      if(!skip){
        y = Math.floor(i / size);
        x = i % size - 1;
        if(x < 0){
          x = size-1;
          y -= 1;
        }
        //配置条件式
        //縦方向の直列
        vertical_line = obj[i-1] == obj[i+size-1];
        //横方向の直列
        horizontal_line = obj[i-1] == obj[i] && i % size != 0;
        //横方向(左)の直列
        left_line = obj[i-1] == obj[i-2];
        //右下コスミ・ハネ
        bottom_right = obj[i-1] == obj[i+size] && !(obj[i] == obj[i-1]*-1 && obj[i-1+size] == obj[i-1]*-1) && i % size != 0;
        //左下コスミ・ハネ
        bottom_left = obj[i-1] == obj[i+size-2] && !(obj[i-2] == obj[i-1]*-1 && obj[i-1+size] == obj[i-1]*-1) && i % size != 1;
        //右上コスミ・ハネ
        up_right = obj[i-1] == obj[i-size] && !(obj[i] == obj[i-1]*-1 && obj[i-1-size] == obj[i-1]*-1) && i % size != 0;
        //縦一間トビ
        vertical_one = obj[i-1] == obj[i+2*size-1] && Math.abs(obj[i+size-1]) != 4;
        //横一間トビ
        horizontal_one = obj[i-1] == obj[i+1] && Math.abs(obj[i]) != 4 && (i-1) % size < (size-2);
        //縦二間トビ
        vertical_two = obj[i-1] == obj[i+3*size-1] && Math.abs(obj[i+size-1]) != 4 && Math.abs(obj[i+2*size-1]) != 4;
        //横二間トビ
        horizontal_two = obj[i-1] == obj[i+2] && Math.abs(obj[i]) != 4 && Math.abs(obj[i+1]) != 4 && (i-1) % size < (size-3);
        //縦三間トビ
        vertical_three = obj[i-1] == obj[i+4*size-1] && Math.abs(obj[i+size-1]) != 4 && Math.abs(obj[i+2*size-1]) != 4 && Math.abs(obj[i+3*size-1]) != 4;
        //横三間トビ
        horizontal_three = obj[i-1] == obj[i+3] && Math.abs(obj[i]) != 4 && Math.abs(obj[i+1]) != 4 && Math.abs(obj[i+2]) != 4 && (i-1) % size < (size-4);
        //ケイマ (4時)
        keima_four = obj[i-1] == obj[i+1+size] && obj[i] != obj[i-1]*-1 && obj[i+size] != obj[i-1]*-1 && (i-1) % size < (size-2);
        //ケイマ (5時)
        keima_five = obj[i-1] == obj[i+2*size] && obj[i-1+size] != obj[i-1]*-1 && obj[i+size] != obj[i-1]*-1 && i % size != 0;
        //ケイマ (7時)
        keima_seven = obj[i-1] == obj[i-2+2*size] && obj[i-1+size] != obj[i-1]*-1 && obj[i-2+size] != obj[i-1]*-1 && i % size != 1;
        //ケイマ (8時)
        keima_eight = obj[i-1] == obj[i-3+size] && obj[i-2] != obj[i-1]*-1 && obj[i-2+size] != obj[i-1]*-1 && i % size != 1 && i % size != 2;

        if(vertical_line){
          //縦方向の直列
          makeImage(x, y, link_color, "link1", 1, SIDE, board_size);
        }
        if(horizontal_line){
          //横方向の直列
          makeImage(x, y, link_color, "link2", 1, SIDE, board_size);
        }
        if(bottom_right && !(horizontal_line || vertical_line)){
          //右下コスミ・ハネ
          makeImage(x, y, link_color, "link3", 1, SIDE, board_size);
        }
        if(bottom_left && !(left_line || vertical_line)){
          //左下コスミ・ハネ
          makeImage(x, y, link_color, "link4", 1, SIDE, board_size);
        }
        if(vertical_one && !(bottom_right || bottom_left)){
          //縦一間トビ
          makeImage(x, y, link_color, "link5", 1, SIDE, board_size);
        }
        if(horizontal_one && !(bottom_right || up_right)){
          //横一間トビ
          makeImage(x, y, link_color, "link6", 1, SIDE, board_size);
        }
        if(vertical_two){
          //縦二間トビ
          makeImage(x, y, link_color, "link7", 1, SIDE, board_size);
        }
        if(horizontal_two){
          //横ニ間トビ
          makeImage(x, y, link_color, "link8", 1, SIDE, board_size);
        }
        if(vertical_three){
          //縦三間トビ
          makeImage(x, y, link_color, "link9", 1, SIDE, board_size);
        }
        if(horizontal_three){
          //横三間トビ
          makeImage(x, y, link_color, "link10", 1, SIDE, board_size);
        }
        if(keima_four && !vertical_line && !horizontal_line && !bottom_right){
          //ケイマ (4時)
          makeImage(x, y, link_color, "link11", 1, SIDE, board_size);
        }
        if(keima_five && !vertical_line && !horizontal_line && !bottom_right && !vertical_one){
          //ケイマ (5時)
          makeImage(x, y, link_color, "link12", 1, SIDE, board_size);
        }
        if(keima_seven && !vertical_line && !left_line && !bottom_left && !vertical_one){
          //ケイマ (7時)
          makeImage(x, y, link_color, "link13", 1, SIDE, board_size);
        }
        if(keima_eight && !vertical_line && !left_line && !bottom_left){
          //ケイマ (8時)
          makeImage(x, y, link_color, "link14", 1, SIDE, board_size);
        }
      }
      i++;
    })
    deletelinks();
    deleteImage("message");
    console.log()
    visibleLink(link_visible);
    break;
  }case "pass":{
    if(scene != "play") return;
    deleteImage("message");
    makeText(SIDE+margin, "PASS", font_style, "message");
    break;
  }case "busy":{
    if(scene != "play") return;
    deleteImage("message");
    makeText(SIDE+margin, "処理中...", font_style, "message");
    break;
  }case "bless":{
    if(scene != "play") return;
    obj = msg['data'].split(":")[1].split(",");
    let size = Math.sqrt(obj.length);
    deleteImage("bless");
    obj.forEach(v => {
      y = Math.floor(v / 100);
      x = v - y*100;
      makeImage(x, y, 0xff0000, "bless", 1, SIDE, board_size);
    })
    break;
  }case "score":{
    if(scene != "play") return;
    obj = msg['data'].split(":")[1].split(" ")[0].split("+");
    let size = Math.sqrt(obj.length);
    deleteImage("score");
    makeText(SIDE+margin, msg['data'].split(":")[1].split(" ")[0], font_style, "score");
    obj[1] = parseFloat(obj[1]);
    if(obj[0]=="W"){
      obj[1] *= -1;
    }
    makeScorebar(obj[1]);
    break;
  }case "finalscore":{
    senrigan = false;
    if(scene != "play") return;
    obj = msg['data'].split(":")[1].split(" ")[0].split("+");
    let size = Math.sqrt(obj.length);
    deleteImage("score");
    makeText(SIDE+margin, "Good Game!" + msg['data'].split(":")[1].split(" ")[0], font_style, "score");
    scene = "home";
    makeButton(0, 0, "backarrow", function(){
      scene = "home";
      resize();
    });
    makeButton(50, 0, "tweet", function(){
      console.log("tweet");
      renderer.render(stage);
      let c = renderer.view.toDataURL("image/png", 1);
      let now_date = new Date();
      let jsondata = {'name': username,
                      'date': now_date.toLocaleString(),
                      'img': c
                    };
      let json_text = JSON.stringify(jsondata);
      xhr = new XMLHttpRequest;       //インスタンス作成
      xhr.onload = function(){        //レスポンスを受け取った時の処理（非同期）
          var res = xhr.responseText.split("\"")[3];
          window.open("https://twitter.com/share?hashtags=碁色&url=\n"+"https://goiro.net/html/"+res);
      };
      xhr.onerror = function(){       //エラーが起きた時の処理（非同期）
          alert("error!");
      }
      xhr.open('POST', 'save_image', true);
      xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
      xhr.send(json_text);
    });
    if(obj[1]=="R") obj[1] = 30;
    obj[1] = parseFloat(obj[1]);
    if(obj[0]=="W"){
      obj[1] *= -1;
    }
    makeScorebar(obj[1]);
    deleteImage("message");
    break;
  }case "captured":{
    if(scene != "play") return;
    obj = msg['data'].split(":")[1].split(",");
    c_b = obj[0];
    c_w = obj[1];
    deleteImage("player");
    makeText(SIDE+margin, "●"+black+"("+c_b+")"+"　○"+white+"("+c_w+")", font_style, "player");
    break;
  }case "turn":{
    if(scene != "play") return;
    obj = msg['data'].split(":")[1];
    let last_turn = obj.split(",")[0];
    let last_pos = obj.split(",")[1];
    let now_turn = "";
    if(last_turn == "B"){
      now_turn = "白番"
    }else{
      now_turn = "黒番"
    }
    deleteImage("turn");
    makeText(SIDE+margin, "現在"+now_turn+"です。", font_style, "turn");
    y = Math.floor(last_pos / 100);
    x = last_pos - y*100;
    deleteImage("last");
    makeImage(x, y, 0xff0000, "last", 1, SIDE, board_size);
    break;
  }case "player":{
    if(scene != "play") return;
    obj = msg['data'].split(":")[1];
    let black = obj.split(",")[0];
    let white = obj.split(",")[1];
    deleteImage("player");
    makeText(SIDE+margin, "●"+black+"("+c_b+")"+"　○"+white+"("+c_w+")", font_style, "player");
    break;
  }case "review":{
    objs = msg['data'].split("w:")[1];
    objs = objs.split("<cut>");
    for(let i=0;i<4;i++){
      obj = objs[i].split(",");
      let title = obj[0];
      let birth = obj[1];
      let size = obj[2];
      let komi = obj[3];
      let hande = obj[4];
      let black = obj[5];
      let white = obj[6];
      let winner = obj[7];
      let hash = obj[8];
      let img_path;
      if(winner[0]=="B" && black==username || winner[0]=="W" && white==username){
        img_path = "win_panel";
      }else if(winner[0]=="B" && white==username || winner[0]=="W" && black==username){
        img_path = "lose_panel";
      }else{
        img_path = "draw_panel";
      }
      let loader = new PIXI.Loader();
      let review_times_ = review_times
      review_times++;
      loader
        .add(img_path, "/assets/images/" + img_path + ".png")
        .load((loader, resources)=>{
          console.log(`LOADING... ${review_times_}, ${i}`);
          let objSprite = new PIXI.Sprite(PIXI.utils.TextureCache[img_path]);
          objSprite.x = 100;
          objSprite.y = review_times_*150;
          objSprite.scale.x = 0.4;
          objSprite.scale.y = 0.4;
          objSprite.interactive = true;
          objSprite.on('pointertap', function(){
            socket.send(`openreview ${hash}`);
            board_size = size;
            scene = "play";
            mode = "free";
            resize();
            socket.send("show");
          });
          stage.addChild(objSprite);
          texture["button"].push(objSprite);
          putText(110, review_times_*150+50, `${size}路盤/コミ${komi}目/ハンデ${hande}子\n●${black}/○${white}\n${winner}`);
          renderer.render(stage);
          console.log("complete!");
        });
    }
      //putText(100, review_times*200, "${size}路盤/コミ${komi}目/ハンデ${hande}子\n●${black}/○${white}");
      console.log(stage);
      break;
    }case "review_ind":{
      objs = msg['data'].split(":")[1];
      review_index = parseInt(objs, 10);
    }
  }
  renderer.render(stage);
}

resize();
window.addEventListener('load', resize);
window.addEventListener("resize", resize2);
 
/***           ***
 *** =>Functions *** 
***           ***/
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

function addTexture(key, obj, front=false){
  if(texture[key] == undefined) texture[key] = [];
  stage.addChild(obj);
  texture[key].push(obj);
  renderer.render(stage);
}
 
function initGoban(size){
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
  if (senrigan){
    board_color = 0x2e2930;
    line_color = 0x8d6449;
  }else{
    console.log(stone_state);
    if(stone_state == 2){
      board_color = 0x807b6c;
      line_color = 0xfff8eb;
    }else{
      board_color = 0xf5deb3;
      line_color = 0x8d6449;
    }
  }

  let gobanSprite = new PIXI.Graphics();
  let clickarea = new PIXI.Rectangle(0, 0, SIDE+margin, SIDE+margin);
  gobanSprite.interactive = true;
  gobanSprite.hitArea = clickarea;
  gobanSprite.on('pointertap', putStone);
  stage.addChildAt(gobanSprite, 0);
  texture["board"].push(gobanSprite);

  var line = new PIXI.Graphics();
  var gap = SIDE/(size-1);
  for(var i=0;i<size;i++){
    line.lineStyle(2, line_color).moveTo(margin/2, gap*i+margin/2).lineTo(SIDE+margin/2, gap*i+margin/2);
    stage.addChildAt(line, 0);
    texture["board"].push(line);
  }
  for(var i=0;i<size;i++){
    line.lineStyle(2, line_color).moveTo(gap*i+margin/2, margin/2).lineTo(gap*i+margin/2, SIDE+margin/2);
    stage.addChildAt(line, 0);
    texture["board"].push(line);
  }
  
  for(var i=0;i<stars.length;i++){
    for(var j=0;j<stars.length;j++){
      let material = new PIXI.Graphics()
      .beginFill(line_color, 1)
      .drawCircle(gap*stars[i]+margin/2, gap*stars[j]+margin/2, 10)
      .endFill();
      stage.addChildAt(material, 0);
      texture["board"].push(material);
    }
  }

  if(size == 9){
    let material = new PIXI.Graphics()
      .beginFill(line_color, 1)
      .drawCircle(gap*4+margin/2, gap*4+margin/2, 10)
      .endFill();
    stage.addChildAt(material, 0);
    texture["board"].push(material);
  }else if(size == 13){
    let material = new PIXI.Graphics()
    .beginFill(line_color, 1)
    .drawCircle(gap*6+margin/2, gap*6+margin/2, 10)
    .endFill();
    stage.addChildAt(material, 0);
    texture["board"].push(material);
  }

  let back = new PIXI.Graphics();
  back.beginFill(board_color);
  console.log(GAME_HEIGHT);
  back.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  back.endFill();
  stage.addChildAt(back, 0);
  texture["board"].push(back);

  //makeButton(SIDE+margin+10, "BUTTON", 0xff0000, "blue", "yellow");
  if(mode != "free"){
    loadImage(SIDE+margin+10, info_y["button"]*30, "pass");
    loadImage(SIDE+margin+90, info_y["button"]*30, "resign");
    loadImage(SIDE+margin+170, info_y["button"]*30, "senrigan");
    loadImage(SIDE+margin+260, info_y["button"]*30, "change");
  }else{
    loadImage(SIDE+margin+10, info_y["button"]*30, "pass");
    loadImage(SIDE+margin+10, info_y["button2"]*30, "head");
    loadImage(SIDE+margin+100, info_y["button2"]*30, "back");
    loadImage(SIDE+margin+160, info_y["button2"]*30, "forward");
    loadImage(SIDE+margin+220, info_y["button2"]*30, "end");
    loadImage(SIDE+margin+10, info_y["button3"]*30, "resume");
    loadImage(SIDE+margin+100, info_y["button3"]*30, "override");
    makeButton(0, 0, "backarrow", function(){
      scene = "home";
      socket.send("leave");
      resize();
    });
  }
  renderer.render(stage);
}

function inithome(){
  let background = new PIXI.Texture.from("/assets/images/background.png");
  let backSprit = new PIXI.Sprite(background);
  backSprit.x = 0;
  backSprit.y = 0;
  backSprit.width = 920;
  backSprit.height = 610;
  stage.addChildAt(backSprit, 0);
  addTexture("image", backSprit);
  putText(0, 0, "ようこそ "+ username + "さん!", font_style, "text");
  makeButton(0, 30, "review", function(){
    scene = "review";
    review_times = 0;
    review_index = 0;
    resize();
  });
  makeButton(60, 30, "history", function(){
    window.location.href = 'history';
  });
  makeButton(150, 30, "thanks", function(){
    window.location.href = 'thanks';
  });
  makeButton(280, 30, "twitter", function(){
    window.open('https://twitter.com/Mr_isoy', '_blank');
  });
  makeButton(390, 30, "message", function(){
    window.location.href = 'message';
  });
  makeButton(495, 30, "logout", function(){
    username = "";
    window.location.href = 'logout';
  });
  putText(0, 500, 
`本サイトはまだ試作段階です。
サーバーダウンやセキュリティ問題等に責任を負えません。
不具合・要望は作者に連絡いただけると幸いです。`, font_style, "text")
  makeButton(0, 140, "vshuman", vshuman_f);
  makeButton(0, 220, "vscom", vscom_f);
  makeButton(0, 300, "vsfree", vsfree_f);
  
  console.log(stage);
  renderer.render(stage);
}

function initLogin(){
  let background = new PIXI.Texture.from("/assets/images/background.png");
  let backSprit = new PIXI.Sprite(background);
  backSprit.x = 0;
  backSprit.y = 0;
  backSprit.width = 920;
  backSprit.height = 610;
  stage.addChildAt(backSprit, 0);
  addTexture("image", backSprit);
  putText(0, 0, "碁色へようこそ!\nここは新感覚囲碁サイトです。\nまずはユーザー登録かログインをお願いします！", font_style, "text");
  makeButton(0, 140, "regist", function(){
    window.location.href = 'regist';
  });
  makeButton(0, 220, "login", function(){
    window.location.href = 'login';
  });
  putText(0, 500, 
    `本サイトはまだ試作段階です。
サーバーダウンやセキュリティ問題等に責任を負えません。
不具合・要望は作者に連絡いただけると幸いです。`, font_style, "text")
}

function initReview(){
  let background = new PIXI.Texture.from("/assets/images/background.png");
  let backSprit = new PIXI.Sprite(background);
  backSprit.x = 0;
  backSprit.y = 0;
  backSprit.width = 920;
  backSprit.height = 610;
  addTexture("image", backSprit);
  makeButton(0, 0, "backarrow", function(){
    scene = "home";
    resize();
  });
  makeButton(10, 100, "uparrow", function(){
    review_times = 0;
    review_index = Math.max(review_index-4, 0);
    console.log(review_index);
    resize();
  });
  makeButton(10, 400, "downarrow", function(){
    review_times = 0;
    review_index += 4;
    console.log(review_index);
    resize();
  });
  socket.send(`review ${review_index}`);
}
 
function loadImage(x, y, name){
  let X, Y;
  if(window_w > window_h){
    X = x;
    Y = y;
  }else{
    X = x - SIDE;
    Y = SIDE + margin + y;
  }
  let path = "/assets/images/";
  let obj = new PIXI.Texture.from(path + name + ".png");
  let objSprite = new PIXI.Sprite(obj);
  objSprite.x = X;
  objSprite.y = Y;
  objSprite.scale.x = 0.4;
  objSprite.scale.y = 0.4;
  objSprite.interactive = true;
  objSprite.on('pointertap', b_events[name]);
  stage.addChild(objSprite);
  texture["button"].push(objSprite);
}

function putImage(x, y, name, type, height, width, alpha=1){
  let X, Y;
  X = x;
  Y = y;
  let path = "/assets/images/";
  let loader = new PIXI.Loader();
  loader
    .add(name, path + name + ".png")
    .load((loader, resources)=>{
      let objSprite = new PIXI.Sprite(PIXI.utils.TextureCache[name]);
      objSprite.x = x-width/2;
      objSprite.y = y-height/2;
      objSprite.height = height;
      objSprite.width = width;
      objSprite.alpha = alpha;
      stage.addChild(objSprite);
      addTexture(type, objSprite);
    });
}

function makeImage(x, y, color, type, alpha, size, board_size){
  x = x * (size/(board_size-1))+margin/2;
  y = y * (size/(board_size-1))+margin/2;
  let x1, x2, y1, y2;
  var ds = size/(board_size-1);
  let line_color; 
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
    // squid
    // if(true){
    //   break;
    // }
    // x -= ds;
    // y -= ds;
    // let tmp_color;
    // if(color == 0xdc143c){
    //   tmp_color = "inkb";
    // }else{
    //   tmp_color = "inkw";
    // }
    // putImage(x, y, tmp_color, type, alpha*8)
    break;
  case "stone":
    if(stone_state == 2){
      if(color == 0x000000){
        putImage(x, y, "pumpkin", type, height=ds, width=ds, alpha=0.9);
      }else{
        putImage(x, y, "ghost", type, height=ds, width=ds, alpha=0.9);
      }
    }else{
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
    }
    break;
  case "bless":
    var material = new PIXI.Graphics()
      .beginFill(color, alpha)
      .drawCircle(x, y, ds/6)
      .endFill();
    break;
  case "last":
    ds = ds/6;
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
  case "link1":
    ds = ds/2;
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x-ds, y,
      x+ds, y,
      x+ds, y+ds*2,
      x-ds, y+ds*2,
    ])
    .endFill();
    break;
  case "link2":
    ds = ds/2;
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x, y-ds,
      x+ds*2, y-ds,
      x+ds*2, y+ds,
      x, y+ds,
    ])
    .endFill();
    break;
  case "link3":
    ds = ds/4;
    [x1, x2, y1, y2] = [x+ds/1, x+ds*4-ds/1, y, y+ds*4];
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x+ds/1, y,
      x+ds*4, y+ds*4-ds/1,
      x+ds*4-ds/1, y+ds*4,
      x, y+ds/1,
    ])
    .endFill();
    break;
  case "link4":
    ds = ds/4;
    [x1, x2, y1, y2] = [x-ds/1, x-ds*4+ds/1, y, y+ds*4];
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x-ds/1, y,
      x-ds*4, y+ds*4-ds/1,
      x-ds*4+ds/1, y+ds*4,
      x, y+ds/1,
    ])
    .endFill();
    break;
  case "link5":
    ds = ds/2;
    x1 = x-ds/3;
    x2 = x+ds/3;
    y1 = y;
    y2 =  y+ds*4;
    [x1, x2, y1, y2] = [x-ds/3, x+ds/3, y, y+ds*4];
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x-ds/3, y,
      x+ds/3, y,
      x+ds/3, y+ds*4,
      x-ds/3, y+ds*4,
    ])
    .endFill();
    break;
  case "link6":
    ds = ds/2;
    [x1, x2, y1, y2] = [x, x+ds*4, y-ds/3, y+ds/3];
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x, y-ds/3,
      x+ds*4, y-ds/3,
      x+ds*4, y+ds/3,
      x, y+ds/3,
    ])
    .endFill();
    break;
  case "link7":
    ds = ds/2;
    [x1, x2, y1, y2] = [x-ds/6, x+ds/6, y, y+ds*6];
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x-ds/6, y,
      x+ds/6, y,
      x+ds/6, y+ds*6,
      x-ds/6, y+ds*6,
    ])
    .endFill();
    break;
  case "link8":
    ds = ds/2;
    [x1, x2, y1, y2] = [x, x+ds*6, y-ds/6, y+ds/6];
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x, y-ds/6,
      x+ds*6, y-ds/6,
      x+ds*6, y+ds/6,
      x, y+ds/6,
    ])
    .endFill();
    break;
  case "link9":
    ds = ds/2;
    [x1, x2, y1, y2] = [x-ds/9, x+ds/9, y, y+ds*8];
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x-ds/9, y,
      x+ds/9, y,
      x+ds/9, y+ds*8,
      x-ds/9, y+ds*8,
    ])
    .endFill();
    break;
  case "link10":
    ds = ds/2;
    [x1, x2, y1, y2] = [x, x+ds*8, y-ds/9, y+ds/9];
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x, y-ds/9,
      x+ds*8, y-ds/9,
      x+ds*8, y+ds/9,
      x, y+ds/9,
    ])
    .endFill();
    break;
  case "link11":
    ds = ds/16;
    [x1, x2, y1, y2] = [x+ds/1, x+ds*32-ds/1, y, y+ds*16];
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x+ds/1, y,
      x+ds*32, y+ds*16-ds/1,
      x+ds*32-ds/1, y+ds*16,
      x, y+ds/1,
    ])
    .endFill();
    break;
  case "link12":
    ds = ds/16;
    [x1, x2, y1, y2] = [x+ds/1, x+ds*16-ds/1, y, y+ds*32];
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x+ds/1, y,
      x+ds*16, y+ds*32-ds/1,
      x+ds*16-ds/1, y+ds*32,
      x, y+ds/1,
    ])
    .endFill();
    break;
  case "link13":
    ds = ds/16;
    [x1, x2, y1, y2] = [x-ds/1, x-ds*16+ds/1, y, y+ds*32];
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x-ds/1, y,
      x-ds*16, y+ds*32-ds/1,
      x-ds*16+ds/1, y+ds*32,
      x, y+ds/1,
    ])
    .endFill();
    break;
  case "link14":
    ds = ds/16;
    [x1, x2, y1, y2] = [x-ds/1, x-ds*32+ds/1, y, y+ds*16];
    var material = new PIXI.Graphics()
    .beginFill(color, alpha)
    .drawPolygon([
      x-ds/1, y,
      x-ds*32, y+ds*16-ds/1,
      x-ds*32+ds/1, y+ds*16,
      x, y+ds/1,
    ])
    .endFill();
    break;
  }
  if(material != undefined){
    if(type=="last"){
      material.zIndex = 10;
    }
    stage.addChild(material);
    texture[type].push(material);
  }
  if(type.indexOf("link") != -1 && type != "link1" && type != "link2" && type != "link3" && type != "link4"){
    links.push([x1, x2, y1, y2, type, texture[type].length-1]);
    console.log(texture[type]);
    console.log("links:", links);
  }
}

function makeText(x, word, style, type){
  let X, Y;
  if(window_w > window_h){
    X = x;
    Y = info_y[type] * 30;
  }else{
    X = margin;
    Y = x + info_y[type] * 30;
  }
  y = info_y[type] * 30;
  let textobj = new PIXI.Text(word, style); // テキストオブジェクトの生成
  textobj.position.x = X;  // 表示位置(x)
  textobj.position.y = Y; // 表示位置(y)
  stage.addChild(textobj);
  texture[type].push(textobj);
}

function putText(x, y, word, style, type){
  let textobj = new PIXI.Text(word, style); // テキストオブジェクトの生成
  textobj.position.x = x;  // 表示位置(x)
  textobj.position.y = y; // 表示位置(y)
  addTexture(type, textobj);
}

function getText(type){
  let textobj = texture[type][0];
  return textobj.text;
}

function editText(type, word){
  let textobj = texture[type][0];
  textobj.text = word;
  deleteImage(type);
  addTexture(type, textobj);
}

function makeButton(x, y, name, func){
  let path = "/assets/images/";
  let loader = new PIXI.Loader();
  loader
    .add(name, path + name + ".png")
    .load((loader, resources)=>{
      let objSprite = new PIXI.Sprite(PIXI.utils.TextureCache[name]);
      objSprite.x = x;
      objSprite.y = y;
      objSprite.scale.x = 0.4;
      objSprite.scale.y = 0.4;
      objSprite.interactive = true;
      objSprite.on('pointertap', func);
      stage.addChild(objSprite);
      texture["button"].push(objSprite);
      renderer.render(stage);
    });
}

function deleteImage(type){
  links = [];
  if(type == "all"){
    Object.keys(texture).forEach(v => {
      texture[v].forEach(vv => {
        stage.removeChild(vv);
      })
      texture[v].splice(0);
    })
  }else{
    texture[type].forEach(v => {
      stage.removeChild(v);
    })
    texture[type].splice(0);
  }
  renderer.render(stage);
}

function visibleImage(type, sw){
  if(type == "all"){
    Object.keys(texture).forEach(v => {
      texture[v].forEach(vv => {
        vv.visible = sw;
      })
    })
  }else{
    texture[type].forEach(v => {
      v.visible = sw;
      console.log(v);
    })
  }
  renderer.render(stage);
}

function visibleLink(sw){
  for(let i=1;i<=14;i++){
    visibleImage("link"+i, sw);
  }
}

function overLink(v1, v2){
      if(v1 == v2){
        return false;
      }
      if(v1[4] == "link1" || v1[4] == "link2" || v2[4] == "link1" || v2[4] == "link2"){
        return false;
      }
      s = (v1[0] - v1[0]) * (v2[2] - v1[0]) - (v1[2] - v1[3]) * (v2[0] - v1[0]);
      t = (v1[0] - v1[1]) * (v2[3] - v1[2]) - (v1[2] - v1[3]) * (v2[1] - v1[0]);
      if(s * t > 0){
        return false;
      }
      s = (v2[0] - v2[1]) * (v1[2] - v2[2]) - (v2[2] - v2[3]) * (v1[0] - v2[0]);
      t = (v2[0] - v2[1]) * (v1[3] - v2[2]) - (v2[2] - v2[3]) * (v1[1] - v2[0]);
      if (s * t > 0){
        return false;
      }
      return true;
}

function deletelinks(){
  let over = false;
  let i = 0;
  links.forEach(v1 => {
    console.log("v2:", links.slice(i+1));
    links.slice(i+1).forEach(v2 => {
      over = overLink(v1, v2);
      console.log("over:", over);
      if(over){
        texture[v1[4]][v1[5]].visible = false;
        texture[v2[4]][v2[5]].visible = false;
      }
    })
    i++;
  })
  
  renderer.render(stage);
}
 
function putStone(e) {
  let position = e.data.getLocalPosition(stage);
  let {x, y} = detectXY(position.x, position.y, SIDE, board_size);
  if(mode != "free")
    socket.send("coordinate_ai"+" "+(x+100*y)+" "+1);
  else
    socket.send("coordinate"+" "+(x+100*y)+" "+1);
  socket.send("dragon "+(x+100*y));
 }
 
 function makeScorebar(score) {
   let X, Y;
   if(window_w > window_h){
     X = SIDE + margin;
     Y = 10;
   }else{
     X = 0;
     Y = SIDE + margin;
   }
   let w_ter = 0x87ceeb;
   let b_ter = 0xdc143c;
   let left = X;
   let base_len = (GAME_WIDTH - left)/2;
   let b_len = Math.max(0, base_len+score*10);
   let w_len = Math.max(0, base_len-score*10);
   var w_bar = new PIXI.Graphics()
     .beginFill(w_ter)
     .drawRect(left+b_len, Y, w_len, 10)
     .endFill();
   var b_bar = new PIXI.Graphics()
     .beginFill(b_ter)
     .drawRect(left, Y, b_len, 10)
     .endFill();
   addTexture("scorebar", w_bar);
   addTexture("scorebar", b_bar);
   stage.addChild(w_bar);
   stage.addChild(b_bar);
 }
  
function resize() {
  deleteImage("all");
  window_w = document.documentElement.clientWidth;
  window_h = document.documentElement.clientHeight;
  if (window_w > window_h){
    GAME_WIDTH = SIDE+margin*2+220;
    GAME_HEIGHT = SIDE+margin;
  }else{
    GAME_WIDTH = SIDE+margin;
    GAME_HEIGHT = SIDE+margin*2+240;
  }
  // Determine which screen dimension is most constrained
  ratio = Math.min(window.innerWidth/GAME_WIDTH,
                  window.innerHeight/GAME_HEIGHT);
  console.log("RATIO");
  console.log(window.innerWidth);
  console.log(window.innerHeight);
  console.log(GAME_WIDTH);
  console.log(GAME_HEIGHT);
  console.log(ratio);

  // Scale the view stageropriately to fill that dimension
  stage.scale.x = stage.scale.y = ratio;

  // Update the renderer dimensions
  renderer.resize(Math.ceil(GAME_WIDTH * ratio),
                  Math.ceil(GAME_HEIGHT * ratio));
  switch(scene){
    case "home":
      senrigan = false;
      if(username != "")
        inithome();
      else
        initLogin();
      break;
    case "play":
      initGoban(board_size);
      break;
    case "review":
      initReview();
      break;
  }
  renderer.render(stage);
}

function resize2(){
  window_w = document.documentElement.clientWidth;
  window_h = document.documentElement.clientHeight;
  if (window_w > window_h){
    GAME_WIDTH = SIDE+margin*2+220;
    GAME_HEIGHT = SIDE+margin;
  }else{
    GAME_WIDTH = SIDE+margin;
    GAME_HEIGHT = SIDE+margin*2+240;
  }
  // Determine which screen dimension is most constrained
  ratio = Math.min(window.innerWidth/GAME_WIDTH,
    window.innerHeight/GAME_HEIGHT);
  console.log("RATIO");
  console.log(window.innerWidth);
  console.log(window.innerHeight);
  console.log(GAME_WIDTH);
  console.log(GAME_HEIGHT);
  console.log(ratio);

  // Scale the view stageropriately to fill that dimension
  console.log(texture);
  stage.scale.x = stage.scale.y = ratio;

  // Update the renderer dimensions
  renderer.resize(Math.ceil(GAME_WIDTH * ratio),
                  Math.ceil(GAME_HEIGHT * ratio));
  switch(scene){
    case "home":
      inithome();
      break;
    case "play":
      initGoban(board_size);
      socket.send("show");
      break;
  }
  renderer.render(stage);
}
