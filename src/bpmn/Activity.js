import FlowNode from "./FlowNode"
import {COLORS, CONSTANTS} from "./Constants";

class Activity extends FlowNode {
    constructor(stage, properties) {
        super(stage, properties);
    }

    setText(parent, text, color) {
        if (!text) text = ''
        //super.setText(parent, text, color);
        this.flowProperties.properties.name = text
        if (!parent) {
            parent = this.svgGroup.findOne('.e-shape');
        }
        //删除现存的text
        let existed = parent.findOne('text.e-text')
        if (existed) {
            existed.remove()
        }
        //创建新的text
        let svgText = parent.text(text)
            .addClass('e-text')
            .font({
                'font-size': '12px',
                'weight': 'normal',
                'leading': '1.5em',
                'text-anchor': 'middle',
                'pointer-events': 'none'
            })
            .fill(color ? color : COLORS.DEFAULT_COLOR)
        //根据文字长度重置Element宽度
        let width = this.box.width;
        if (text.length > 6) {
            this.box.width = text.length * 12 + 28//(CONSTANTS.DEFAULT_WIDTH - 6 * 12)
        } else {
            this.box.width = CONSTANTS.DEFAULT_WIDTH
        }
        this.svgGroup.findOne('rect.e-frame').width(this.box.width)
        //文字居中
        svgText.cy(this.box.height / 2).cx(this.box.width / 2)
        //重置outline宽度
        let outline = this.svgGroup.findOne('rect.e-outline')

        if (outline) {
            outline.width(this.box.width + 12)
        }
        this.text = svgText

        return svgText;
    }

    /**
     * 计算一点与中心线的连线与图形的交叉点
     * @param point
     * @returns {null|{x: number, y: number}}
     */
    getJoinPoint(point) {
        var crosses = [];
        if (!point) {
            trace("参考点不存在！");
            return null;
        }
        let box = this.box;
        const x1 = point.x;
        const y1 = point.y;
        //Box中心点
        const x2 = box.x + box.width / 2;
        const y2 = box.y + box.height / 2;

        let p1 = {x: x1, y: y1}
        let p2 = {x: x2, y: y2}

        //计算与四边型的4个交叉点
        let p3 = {x: box.x, y: box.y}
        let p4 = {x: box.x + box.width, y: box.y}
        crosses.push(this._calcCross(p1, p2, p3, p4));

        p4 = {x: box.x, y: box.y + box.height}
        crosses.push(this._calcCross(p1, p2, p3, p4));

        p3 = {x: box.x + box.width, y: box.y}
        p4 = {x: box.x + box.width, y: box.y + box.height}
        crosses.push(this._calcCross(p1, p2, p3, p4));

        p3 = {x: box.x, y: box.y + box.height}
        p4 = {x: box.x + box.width, y: box.y + box.height}
        crosses.push(this._calcCross(p1, p2, p3, p4));

        let minDist = 1000000000, nearestPoint;
        //取在Box范围内的交叉点，并计算交叉点与相邻拐点的距离
        for (let i = 0; i < crosses.length; i++) {
            if (!crosses[i]) {
                continue
            }
            let c = {
                x: Math.round(crosses[i].x),
                y: Math.round(crosses[i].y)
            }
            if (c.x >= box.x && c.x <= box.x + box.width && c.y >= box.y && c.y <= box.y + box.height) {
                let d = (c.x - point.x) * (c.x - point.x) + (c.y - point.y) * (c.y - point.y);
                if (d < minDist) {
                    minDist = d;
                    nearestPoint = c
                }
            }
        }

        return nearestPoint;
    }

    /**
     * 文字自动换行
     */
    _wrapText(svgText, text, centralized) {
        svgText.clear()
        svgText.build(true)
        const maxLength = 6

        if (text.length <= maxLength) {
            let tspan = svgText.tspan(text)
        } else {
            let start = 0;
            do {
                let end = start + maxLength > text.length ? text.length : start + maxLength
                let span = text.slice(start, end);
                svgText.tspan(span).newLine();
                start += maxLength
                if (end >= text.length) {
                    break;
                }
            } while (true)
        }
        svgText.build(false)

        if (centralized) {
            svgText.cy(this.box.height/2)
            svgText.find('tspan').cx(this.box.width/2)
        }

        return svgText;
    }


}

export default Activity