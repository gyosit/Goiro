import { Stage } from "./sprites/Stage.js";
export class DrawStage {
    constructor() {
        this.scene = "";
        this.CARDDESIGN = { x: 30, y: 40, line: 0x000000, fill: 0xffffff };
        this.MARK = ["", "♣", "♠", "♦", "♥"];
        const rendererOptions = {
            width: window.innerWidth / 2,
            height: window.innerHeight / 2,
            antialiasing: false,
            transparent: false,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoResize: true,
            preserveDrawingBuffer: true,
            backgroundColor: 0xeeeeee
        };
        const pixi_stage = new PIXI.Container();
        const renderer = PIXI.autoDetectRenderer(rendererOptions);
        this.stage = new Stage(pixi_stage, renderer);
    }
    //watch(() => this.scene, (new_scene: string, old_scene: string) => changeScene(new_scene, old_scene))
    initialize() {
        var square = new PIXI.Graphics();
        square.beginFill(0xff0000);
        square.drawRect(0, 0, 50, 50);
        square.endFill();
        square.x = 100;
        square.y = 100;
        this.stage.addObject("square", square);
    }
    changeState() {
        this.stage.changePropaty("square", "x", 200);
        this.stage.deleteObject("square");
    }
    changeScene(new_scene, old_scene) {
        console.log(new_scene);
        if (new_scene == "init") {
            this.initialize();
        }
    }
    drawCard(card, x, y) {
        let square = new PIXI.Graphics();
        square.lineStyle(2, this.CARDDESIGN.line, 1, 1);
        square.beginFill(card.mark == 0 ? this.CARDDESIGN.line : this.CARDDESIGN.fill);
        square.drawRect(0, 0, this.CARDDESIGN.x, this.CARDDESIGN.y);
        square.endFill();
        square.x = x;
        square.y = y;
        this.stage.addObject(`square${card.mark}_${card.num}`, square);
        let text = new PIXI.Text(`${this.MARK[card.mark]} ${card.num}`, { fontFamily: 'Noto Sans JP', fontSize: 12, fill: 0xf000000, align: 'center' });
        text.x = x;
        text.y = y;
        this.stage.addObject(`card${card.mark}_${card.num}`, text);
    }
    deleteCard(card) {
        this.stage.deleteObject(`square${card.mark}_${card.num}`);
        this.stage.deleteObject(`card${card.mark}_${card.num}`);
    }
}
