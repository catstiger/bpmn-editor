import FlowNode from "./FlowNode";
import {CONSTANTS} from "./Constants";

class Gateway extends FlowNode {
    constructor(stage, properties) {
        super(stage, properties);
        this._setSize(properties, CONSTANTS.GATEWAY_SIZE, CONSTANTS.GATEWAY_SIZE)
    }

    getJoinPoint(point) {
        //'25,0 50,25 25,50 0,25'
        let points = []
        points.push({
            x: this.box.x + 25,
            y: this.box.y
        })
        points.push({
            x: this.box.x + 50,
            y: this.box.y + 25
        })
        points.push({
            x: this.box.x + 25,
            y: this.box.y + 50
        })
        points.push({
            x: this.box.x,
            y: this.box.y + 25
        })
        points.push({
            x: this.box.x + 25,
            y: this.box.y
        })
        let center = this.getCenter();
        let dist = 1000000000, p;
        for (let i = 0; i < points.length - 1; i++) {
            let cross = this._calcCross(point, center, points[i], points[i + 1])
            if (cross.x < Math.min(points[i].x, points[i + 1].x)
                || cross.x > Math.max(points[i].x, points[i + 1].x)
                || cross.y < Math.min(points[i].y, points[i + 1].y)
                || cross.y > Math.max(points[i].y, points[i + 1].y)) {
                continue
            }

            let d = (point.x - cross.x) * (point.x - cross.x) + (point.y - cross.y) * (point.y - cross.y)
            if (d < dist) {
                dist = d
                p = cross
            }
        }

        return p
    }


    /**
     * 点击事件
     * @param e
     * @param target
     */
    onMouseDown(e, target) {
        let active = this.hitTest(e.offsetX, e.offsetY);
        this.setActive(active)

        return active
    }

    onMouseMove(e, target) {
        let hit = this.hitTest(e.offsetX, e.offsetY);
        if (this.disabled) {
            return;
        }
        if (hit) {
            this.showOutline()
        } else {
            if (!this.active) {
                this.hideOutline()
            }
        }

        return hit
    }


}

export default Gateway