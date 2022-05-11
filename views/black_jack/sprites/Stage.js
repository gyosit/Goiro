export class Stage {
    constructor(stage, renderer) {
        this.stage = stage;
        this.renderer = renderer;
        this.containers = {};
        // canvasの描画
        // Create the canvas in which the game will show, and a
        // generic container for all the graphical objects
        // Put the renderer on screen in the corner
        renderer.view.style.position = "absolute";
        this.renderer.view.style.top = "0px";
        this.renderer.view.style.left = "0px";
        //let app = new PIXI.Application({width: window_w-10, height: window_h-10})
        //document.body.appendChild(app.view);
        document.body.appendChild(this.renderer.view);
    }
    addObject(name, obj) {
        this.stage.addChild(obj);
        this.containers[name] = obj;
        this.renderer.render(this.stage);
    }
    getPropaty(name, attr) {
        return this.containers[name][attr];
    }
    changePropaty(name, attr, new_propaty) {
        this.containers[name][attr] = new_propaty;
        this.renderer.render(this.stage);
    }
    deleteObject(name) {
        if (!(name in this.containers))
            return;
        let obj = this.containers[name];
        this.stage.removeChild(obj);
        delete this.containers[name];
        this.renderer.render(this.stage);
    }
}
