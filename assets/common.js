window.addEventListener("resize", function() {
   window_w = window.innerWidth;
   window_h = window.innerHeight;
   app.renderer.resize(window_w-10, window_h-10);
   app.stage.removeChildren();
   if (window_w < window_h){
      SIDE = window_h/2;
   }else{
      SIDE = window_w/2;
   }
   SIDE -= 10;

   initGoban(app, board_size, texture, senrigan);
});

