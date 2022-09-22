import FlowNode from "./FlowNode";
import {COLORS, CONSTANTS} from "./Constants";

/**
 * StartEvent, EndEvent等element的基类
 */
class Event extends FlowNode {
    radius = CONSTANTS.EVENT_RADIUS

    constructor(stage, properties) {
        super(stage, properties);
        this._setSize(properties, this.radius * 2, this.radius * 2)
    }


    getJoinPoint(point) {
        let center = this.getCenter()
        let k = (point.y - center.y) / (point.x - center.x) //(point.y - c) / point.x; //斜率
        let angle = Math.atan(k)

        let x1 = center.x + this.radius * Math.cos(angle)
        let y1 = center.y + this.radius * Math.sin(angle);
        let dist1 = (point.x - x1) * (point.x - x1) + (point.y - y1) * (point.y - y1)

        let x2 = center.x - this.radius * Math.cos(angle)
        let y2 = center.y - this.radius * Math.sin(angle);
        let dist2 = (point.x - x2) * (point.x - x2) + (point.y - y2) * (point.y - y2)

        return {
            x: dist1 < dist2 ? x1 : x2,
            y: dist1 < dist2 ? y1 : y2
        }
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

    setColor(color) {
        this.color = color ? color : COLORS.DEFAULT_COLOR

        this.svgGroup.findOne('circle.e-frame').stroke({color: this.color})
        let text = this.svgGroup.findOne('text.e-text')
        if (text) {
            text.fill(this.color)
        }
    }

    setText(parent, text, color) {
        super.setText(parent, text, color);
        if (!parent) {
            parent = this.svgGroup;
        }
        //删除现存的text
        let svgText = parent.findOne('text.e-text')
        if (svgText) {
            svgText.remove()
        }
        //创建新的text
        svgText = parent.text(text)
            .addClass('e-text')
            .font({
                'font-size': '12px',
                'weight': 'normal',
                'leading': '1.5em',
                'text-anchor': 'middle',
                'pointer-events': 'none'
            })
            .fill(color ? color : COLORS.DEFAULT_COLOR)
        let x = this.box.width / 2 - (text.length * 12 / 2)
        let y = this.box.height + 5
        svgText.x(x).y(y)

        this.text = svgText
    }
}

export default Event