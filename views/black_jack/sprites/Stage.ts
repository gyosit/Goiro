interface Containers {
    [index: string]: PIXI.Container
}

export class Stage {
    stage
    renderer
    containers: Containers
    

    constructor(stage: PIXI.Container, renderer: PIXI.Renderer ) {
        this.stage = stage
        this.renderer = renderer
        this.containers = {}
    
        // canvasの描画
        // Create the canvas in which the game will show, and a
        // generic container for all the graphical objects
    
        // Put the renderer on screen in the corner
        renderer.view.style.position = "absolute";
        this.renderer.view.style.top = "0px"
        this.renderer.view.style.left = "0px"
    
        //let app = new PIXI.Application({width: window_w-10, height: window_h-10})
        //document.body.appendChild(app.view);
        document.body.appendChild(this.renderer.view)
    }
 
    public addObject(name: string, obj: PIXI.Container)  {
        this.stage.addChild(obj)
        this.containers[name] = obj
        this.renderer.render(this.stage)
    }

    public getPropaty(name: string, attr: string) {
        return this.containers[name][attr]
    }

    public changePropaty(name: string, attr: string, new_propaty: any) {
        this.containers[name][attr] = new_propaty
        this.renderer.render(this.stage)
    }

    public deleteObject(name: string) {
        if(!(name in this.containers)) return
        let obj: PIXI.Container = this.containers[name]
        this.stage.removeChild(obj)
        delete this.containers[name]
        this.renderer.render(this.stage)
    }
}