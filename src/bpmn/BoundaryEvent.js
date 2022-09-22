import DockedObject from "./DockedObject";
import FlowNode from "./FlowNode";
import Event from "./Event";
import Gateway from "./Gateway";
import _ from "underscore";

/**
 * 边界事件基类
 */
class BoundaryEvent extends DockedObject {
    constructor(stage, properties) {
        super(stage, properties)
        this.flowProperties.properties.name = ''
    }

    static isValidDock(stage, target, docked) {
        if (!target) {
            return false;
        }
        if (target instanceof FlowNode && !(target instanceof Event) && !(target instanceof Gateway)) {
            if (stage.boxCrossed(target.getBox(), docked.box) && !stage.boxContains(target.getBox(), docked.box)) {
                return true
            }
        }
        return false
    }

    move(x, y) {
        super.move(x, y);
        this.dockIfPossible() //Move之后要停靠
    }

    dockIfPossible() {
        let me = this
        let dockSuccess = false

        let oldTargetId = me.dockTarget ? me.dockTarget.id : null;
        let oldX = me.offsetX
        let oldY = me.offsetY

        this.stage.elements.each(function (element) {
            if (BoundaryEvent.isValidDock(me.stage, element, me)) {
                if (me.dockTarget) {
                    me.dockTarget.removeDocked(this);
                }
                me.dock(element)
                dockSuccess = true
            }
        })
        console.log(dockSuccess ? 'Dock succeed' : 'Dock failed')
        //如果停靠失败，并且之前有停靠对象，则回复到原来的位置
        if (!dockSuccess && oldTargetId) {
            let target = me.stage.getById(oldTargetId)
            super.move(target.box.x + oldX, target.box.y + oldY)
        }
    }
}
export default BoundaryEvent