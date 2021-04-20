/***           ***
 *** Functions *** 
 ***           ***/
 var margin = 100;
 var SIDE = 703;
 
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
   var ds = size/(SIDE-1);
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
   let clickarea = new PIXI.Rectangle(0, 0, SIDE+margin, SIDE+margin);
   gobanSprite.interactive = true;
   gobanSprite.hitArea = clickarea;
   gobanSprite.on('pointertap', putStone);
   gobanSprite.on('mousemove', huntDragon);
   app.stage.addChildAt(gobanSprite, 0);
   texture["board"].push(gobanSprite);
 
   var line = new PIXI.Graphics();
   var gap = SIDE/(size-1);
   for(var i=0;i<size;i++){
     line.lineStyle(2, line_color).moveTo(margin/2, gap*i+margin/2).lineTo(SIDE+margin/2, gap*i+margin/2);
     app.stage.addChildAt(line, 0);
     texture["board"].push(line);
   }
   for(var i=0;i<size;i++){
     line.lineStyle(2, line_color).moveTo(gap*i+margin/2, margin/2).lineTo(gap*i+margin/2, SIDE+margin/2);
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
   back.drawRect(0, 0, window_w, window_h);
   back.endFill();
   app.stage.addChildAt(back, 0);
   texture["board"].push(back);
 
   //makeButton(SIDE+margin+10, app, "BUTTON", 0xff0000, "blue", "yellow");
   if(mode != "free"){
     loadImage(SIDE+margin+10, info_y["button"]*30, app, "pass")
     loadImage(SIDE+margin+100, info_y["button"]*30, app, "resign")
     loadImage(SIDE+margin+190, info_y["button"]*30, app, "senrigan")
   }else{
     loadImage(SIDE+margin+10, info_y["button"]*30, app, "pass")
     loadImage(SIDE+margin+10, info_y["button2"]*30, app, "head")
     loadImage(SIDE+margin+100, info_y["button2"]*30, app, "back")
     loadImage(SIDE+margin+160, info_y["button2"]*30, app, "forward")
     loadImage(SIDE+margin+220, info_y["button2"]*30, app, "end")
     loadImage(SIDE+margin+10, info_y["button3"]*30, app, "resume")
     loadImage(SIDE+margin+100, info_y["button3"]*30, app, "override")
 
   }
 }
 
 function initInfo(app, texture){
   let infoSprite = new PIXI.Graphics()
     .beginFill("white")
     .drawRect(SIDE+margin, 0, window_w-SIDE-margin, window_h)
     .endFill();
   app.stage.addChildAt(infoSprite, 0);
   texture["board"].push(infoSprite);
 }
 
 function loadImage(x, y, app, name){
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
   app.stage.addChild(objSprite);
   texture["button"].push(objSprite);
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
 
 function makeText(x, app, word, style, type){
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
   app.stage.addChild(textobj);
   texture[type].push(textobj);
 }
 
 function makeButton(x, app, word, color, color2, color3){
   let X, Y;
   if(window_w > window_h){
     X = x;
     Y = info_y["button"] * 30;
   }else{
     X = margin;
     Y = x + info_y["button"] * 30;
   }
   let back = new PIXI.Graphics()
     .beginFill(color)
     .drawRect(X, Y, 100, 100)
     .endFill();
   app.stage.addChild(back);
   texture["button"].push(back);
   
   let button_style = {fontSize:10, fill:'white', wordWrapWidth: 100, align: 'center'};
   let textobj = new PIXI.Text("word", button_style) // テキストオブジェクトの生成
     .position.x = X  // 表示位置(x)
     .position.y = Y // 表示位置(y)
     .anchor.set(0.5);
   app.stage.addChild(textobj);
   texture["button"].push(textobj);
 }
 
 function deleteImage(texture, type){
   texture[type].forEach(v => {
     app.stage.removeChild(v);
   })
   texture[type].splice(0);
 }
 
 function putStone(e) {
   let position = e.data.getLocalPosition(app.stage);
   let {x, y} = detectXY(position.x, position.y, SIDE, board_size);
   if(mode != "free")
     socket.send("coordinate_ai"+" "+(x+100*y)+" "+1);
   else
     socket.send("coordinate"+" "+(x+100*y)+" "+1);
 }
 
 function makeScorebar(app, score) {
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
   let base_len = (window_w - left)/2;
   let b_len = Math.max(0, base_len+score*15);
   let w_len = Math.max(0, base_len-score*15);
   var w_bar = new PIXI.Graphics()
     .beginFill(w_ter)
     .drawRect(left+b_len, Y, w_len, 10)
     .endFill();
   var b_bar = new PIXI.Graphics()
     .beginFill(b_ter)
     .drawRect(left, Y, b_len, 10)
     .endFill();
   app.stage.addChild(w_bar);
   app.stage.addChild(b_bar);
 }
 
 function huntDragon(e) {
   times++;
   if(times % 10 == 0){
     let position = e.data.getLocalPosition(app.stage);
     let {x, y} = detectXY(position.x, position.y, SIDE, board_size);
     socket.send("dragon "+(x+100*y));
   }
 }
 
 var pass_f = function() {
   if(mode != "free")
     socket.send("pass_ai "+1);
   else
     socket.send("pass "+1);
 }
 
 var resign_f = function() {
   socket.send("resign");
 }
 
 var senrigan_f = function() {
   socket.send("senrigan");
   senrigan = !senrigan;
   deleteImage(texture, "board");
   initGoban(app, board_size, texture, senrigan);
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
 
 /***      ***
  *** Main *** 
  ***      ***/
  window_w = window.innerWidth;
  window_h = window.innerHeight;
  mode = "ai";
  if (window_w < window_h){
    SIDE = window_h/2;
  }else{
    SIDE = window_w/2;
  }
 let app = new PIXI.Application({width: window_w-10, height: window_h-10});
 app.renderer.resize(window_w, window_h);
 
 //var url = "ws://" + window.location.host + ":1780" + window.location.pathname + "/ws";
 var url = "ws://" + window.location.host + window.location.pathname + "/ws";
 var socket = new WebSocket(url);
 var black = "";
 var white = "";
 var c_b = "0";
 var c_w = "0";
 
 var senrigan = false;
 
 document.body.appendChild(app.view);
 
 console.log(board_size);
 
 let times = 0;
 let texture = {"board": [], 
                "stone": [],
                "territory": [],
                "bless": [],
                "last": [],
                "link1": [],
                "link2": [],
                "link3": [],
                "link4": [],
                "button": [],
                "player": [],
                "message": [],
                "score": [],
                "turn": []};
 let info_y = {"button": 5,
               "button2": 7,
               "button3": 8,
               "player": 1,
               "message": 2,
               "score": 3,
               "turn": 4};
 let b_events = {"pass": pass_f,
                 "resign": resign_f,
                 "senrigan": senrigan_f,
                 "head": head_f,
                 "back": back_f,
                 "forward": forward_f,
                 "end": end_f,
                 "resume": resume_f,
                 "override": override_f};
 font_style = {font:'60pt Arial', fill:'black'};
 
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
           makeImage(x, y, app, black_t, "territory", 0.2, SIDE, board_size);
           break;
         case "-2":
           makeImage(x, y, app, black_t, "territory", 0.1, SIDE, board_size);
           break;
         case "-1":
           makeImage(x, y, app, black_t, "territory", 0.05, SIDE, board_size);
           break;
         case "3":
           makeImage(x, y, app, white_t, "territory", 0.2, SIDE, board_size);
           break;
         case "2":
           makeImage(x, y, app, white_t, "territory", 0.1, SIDE, board_size);
           break;
         case "1":
           makeImage(x, y, app, white_t, "territory", 0.05, SIDE, board_size);
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
           makeImage(x, y, app, black_s, "stone", 1, SIDE, board_size);
           break;
         case "4":
           makeImage(x, y, app, white_s, "stone", 1, SIDE, board_size);
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
             makeImage(x, y, app, link_color, "link1", 1, SIDE, board_size);
             break;
           case "4":
             link_color = white_s;
             makeImage(x, y, app, link_color, "link1", 1, SIDE, board_size);
             break;
         }
       }
       if(obj[i-1] == obj[i] && i % size != 0){
         switch(v){
           case "-4":
             link_color = black_s;
             makeImage(x, y, app, link_color, "link2", 1, SIDE, board_size);
             break;
           case "4":
             link_color = white_s;
             makeImage(x, y, app, link_color, "link2", 1, SIDE, board_size);
             break;
         }
       }
       if(obj[i-1] == obj[i+size] && Math.abs(obj[i]) != 4 && Math.abs(obj[i-1+size]) != 4){
         switch(v){
           case "-4":
             link_color = black_s;
             makeImage(x, y, app, link_color, "link3", 1, SIDE, board_size);
             break;
           case "4":
             link_color = white_s;
             makeImage(x, y, app, link_color, "link3", 1, SIDE, board_size);
             break;
         }
       }
       if(obj[i-1] == obj[i+size-2] && Math.abs(obj[i-2]) != 4 && Math.abs(obj[i-1+size]) != 4){
         switch(v){
           case "-4":
             link_color = black_s;
             makeImage(x, y, app, link_color, "link4", 1, SIDE, board_size);
             break;
           case "4":
             link_color = white_s;
             makeImage(x, y, app, link_color, "link4", 1, SIDE, board_size);
             break;
         }
       }
       i++;
     })
     deleteImage(texture, "message");
     break;
   case "pass":
     deleteImage(texture, "message");
     makeText(SIDE+margin, app, "PASS", font_style, "message");
     break;
   case "busy":
     deleteImage(texture, "message");
     makeText(SIDE+margin, app, "処理中...", font_style, "message");
     break;
   case "bless":
     obj = msg['data'].split(":")[1].split(",");
     size = Math.sqrt(obj.length);
     deleteImage(texture, "bless");
     obj.forEach(v => {
       y = Math.floor(v / 100);
       x = v - y*100;
       makeImage(x, y, app, 0xff0000, "bless", 1, SIDE, board_size);
     })
     break;
   case "score":
     obj = msg['data'].split(":")[1].split(" ")[0].split("+");
     size = Math.sqrt(obj.length);
     deleteImage(texture, "score");
     makeText(SIDE+margin, app, msg['data'].split(":")[1].split(" ")[0], font_style, "score");
     obj[1] = parseFloat(obj[1]);
     if(obj[0]=="W"){
       obj[1] *= -1;
     }
     makeScorebar(app, obj[1]);
     break;
   case "finalscore":
     obj = msg['data'].split(":")[1].split(" ")[0].split("+");
     size = Math.sqrt(obj.length);
     deleteImage(texture, "score");
     makeText(SIDE+margin, app, "Good Game!" + msg['data'].split(":")[1].split(" ")[0], font_style, "score");
     if(obj[1]=="R") obj[1] = 30;
     obj[1] = parseFloat(obj[1]);
     if(obj[0]=="W"){
       obj[1] *= -1;
     }
     makeScorebar(app, obj[1]);
     deleteImage(texture, "message");
     break;
   case "captured":
     obj = msg['data'].split(":")[1].split(",");
     c_b = obj[0];
     c_w = obj[1];
     deleteImage(texture, "player");
     makeText(SIDE+margin, app, "●"+black+"("+c_b+")"+"　○"+white+"("+c_w+")", font_style, "player");
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
     deleteImage(texture, "turn");
     makeText(SIDE+margin, app, "現在"+now_turn+"です。", font_style, "turn");
     y = Math.floor(last_pos / 100);
     x = last_pos - y*100;
     deleteImage(texture, "last");
     makeImage(x, y, app, 0xff0000, "last", 1, SIDE, board_size);
     break;
   case "player":
     obj = msg['data'].split(":")[1];
     black = obj.split(",")[0];
     white = obj.split(",")[1];
     deleteImage(texture, "player");
     makeText(SIDE+margin, app, "●"+black+"("+c_b+")"+"　○"+white+"("+c_w+")", font_style, "player");
     break;
   }
 }
 
 
