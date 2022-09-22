import BaseElement from "./BaseElement"
import {COLORS, CONSTANTS, STENCIL} from "./Constants";
import {SVG} from "@svgdotjs/svg.js";
import _ from "underscore"

class FlowElement extends BaseElement {
    constructor(stage, properties) {
        super(stage, properties);
        this.flowProperties.properties.name = properties.name
        this.flowProperties.properties.documentation = properties.documentation
    }


    showOutline() {
        let outline = this.svgGroup.findOne('rect.e-outline');
        if (outline) {
            outline.stroke({
                width: 1,
                color: COLORS.HIGHLIGHT_COLOR,
                dasharray: 3
            })//.radius(CONSTANTS.BORDER_RADIUS)
        }
    }

    hideOutline() {
        let outline = this.svgGroup.findOne('rect.e-outline');
        if (outline) {
            outline.stroke('none')
        }
    }

    /**
     * 准备编辑文本
     */
    beforeEditText(e) {
        let me = this;
        let text = me.flowProperties.properties.name ? me.flowProperties.properties.name : '';
        if (!this.text) {
            this.setText(null, text, COLORS.DEFAULT_COLOR)
        }
        me.setDisabled(true)
        me.hideOutline()

        let editor = SVG(this.stage.inputSelector).node;

        let w = text.length * 12 + 2 * 12;
        if (w < 50) w = 50
        editor.childNodes[0].style.fontSize = '12px'
        editor.childNodes[0].style.width = w + 'px'

        editor.style.width =  w + 'px'
        editor.style.display = 'block'
        editor.style.left = (e.clientX - e.offsetX) + this.box.x + this.box.width / 2 - editor.clientWidth / 2 + 'px'

        if (this.flowProperties.stencil.id === STENCIL.startEvent || this.flowProperties.stencil.id === STENCIL.endEvent) {
            editor.style.top = (e.clientY - e.offsetY) + this.box.y + this.box.height + 5 + 'px'
        } else if (this.flowProperties.stencil.id === STENCIL.sequenceFlow ) {
            let point = this.getSequenceFlowTextPoint(text)
            editor.style.top = (e.clientY - e.offsetY) + point.y - 12 + 'px'
            editor.style.left = (e.clientX - e.offsetX) + point.x + 'px'
        } else if (this.flowProperties.stencil.id === STENCIL.subProcess ) {
            editor.style.top = (e.clientY - e.offsetY) + this.box.y + 'px'
        } else {
            editor.style.top = (e.clientY - e.offsetY) + this.box.y + this.box.height / 2 - 12 + 'px'
        }

        let input = editor.children[0]
        input.value = text
        input.focus()

        //鼠标移开输入框
        const resetGroup = function () {
            editor.style.display = 'none'
            me.setDisabled(false)
            me.setActive(false);
            input.removeEventListener('blur', onBlur)
            input.removeEventListener('keydown', onKeyDown)

        }
        const onBlur = function (e) {
            me.flowProperties.properties.name = input.value
            me.setText(me.group, input.value)
            resetGroup()
            //通知外部应用
            if (_.isFunction(me.onTextChange)) {
                me.onTextChange(me.flowProperties.properties.name)
            }
        }

        //回车键确认输入
        const onKeyDown = function (e) {
            e.cancelBubble = true
            if (e.key === 'Enter') {
                onBlur(e);
            } else if (e.key === 'Escape') {
                resetGroup(e)
            }
        }
        input.addEventListener('blur', onBlur);
        input.addEventListener('keydown', onKeyDown)
    }

    /**
     * 计算连接线的文本位置
     */
    getSequenceFlowTextPoint(text) {
        let point1, point2, maxLen = 0
        for (let i = 0; i < this.points.length - 1; i++) {
            let p1 = this.points[i]
            let p2 = this.points[i + 1]
            let len = (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y);
            if (len > maxLen) {
                maxLen = len
                point1 = p1;
                point2 = p2
            }
        }
        let mx = (point2.x - point1.x) / 2;
        let my = (point2.y - point1.y) / 2;
        let point = {x: point1.x + mx, y: point1.y + my}
        let offsetX = 3;

        if (Math.abs(point1.x - point2.x) <= 3) {
            offsetX += (text.length * 12) / 2
        }

        let x = point.x - (text.length * 12) / 2 + offsetX;
        let y = point.y - 12 - 5
        return {
            x: x, y: y
        }
    }
}

export default FlowElement