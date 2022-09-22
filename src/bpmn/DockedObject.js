import Event from "./Event";
import {CONSTANTS} from "./Constants";
import _ from "underscore"

class DockedObject extends Event {
    constructor(stage, properties) {
        super(stage, properties)
        this.radius = CONSTANTS.DOCKED_RADIUS
        this._setSize(properties, this.radius * 2, this.radius  * 2)
        this.dockTarget = null
        this.posName = 'B'
    }

    /**
     * 判斷目標位置是否可以停靠
     * @param stage
     * @param target 目標Element
     * @param docked Docked Object, 必須包含box屬性
     */
    static isValidDock(stage, target, docked) {
        throw 'Not implementation'
    }

    dockIfPossible() {
        throw 'Not implementation'
    }

    dock(target) {
        if(!target || !_.isFunction(target.addDocked)) {
            return;
        }
        if(this.dockTarget) { //如果已经停靠，则取消
            this.dockTarget.removeDocked(this);
            this.dockTarget = null;
        }
        this.dockTarget = target;
        this.dockTarget.addDocked(this);
        this.docked = true;

        let posNames = ['L', 'R', 'T', 'B'];
        let dx = [0, 0, 0, 0];

        dx[0] = Math.abs(this.box.cx - this.dockTarget.box.x);
        dx[1] = Math.abs(this.box.cx - (this.dockTarget.box.x + this.dockTarget.box.width));
        dx[2] = Math.abs(this.box.cy - this.dockTarget.box.y);
        dx[3] = Math.abs(this.box.cy -  (this.dockTarget.box.y + this.dockTarget.box.height));

        let index = _.indexOf(dx, _.min(dx))

        this.posName = posNames[index];
        this.offsetX = this.box.x - this.dockTarget.box.x;
        this.offsetY = this.box.y - this.dockTarget.box.y;

    };
}
export default DockedObject