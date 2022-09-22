import {COLORS, CONSTANTS, STENCIL} from "./Constants";
import Shadows from "./Shadows";
import _ from "underscore";
import BoundaryEvent from "./BoundaryEvent";

class BoundaryTimerEvent extends BoundaryEvent {
    constructor(stage, properties) {
        properties.type = STENCIL.boundaryTimerEvent
        super(stage, properties)
        this.flowProperties.properties.name = ''
        this.dockIfPossible()
    }

    draw() {
        if (this.svgGroup) {
            this.svgGroup.remove()
        }
        this.svgGroup = this.stage.getSvgDraw().group()
            .attr('id', this.flowProperties.resourceId)
            .matrix(1, 0, 0, 1, this.box.x, this.box.y)

        let cx = this.box.width / 2
        let cy = this.box.height / 2

        let shapeGroup = this.svgGroup.group().addClass('e-shape')
        //外圈
        shapeGroup.circle(this.radius * 2)
            .addClass('e-frame')
            .cx(cx)
            .cy(cy)
            .stroke({width: 1, color: COLORS.DEFAULT_COLOR, dasharray: 3})
            .fill({color: '#fff'})
        //内圈
        shapeGroup.circle(this.radius * 2 - 4)
            .addClass('e-frame')
            .cx(cx)
            .cy(cy)
            .stroke({width: 1, color: COLORS.DEFAULT_COLOR})
            .fill({color: '#fff'})

        shapeGroup.line(cx, cy, cx, 5)
            .stroke({width: 2, color: COLORS.DEFAULT_COLOR})
            .fill('none')

        shapeGroup.line(cx, cy, cx + this.box.width / 4 - 3, cy + this.box.height / 4 - 3)
            .stroke({width: 2, color: COLORS.DEFAULT_COLOR})
            .fill('none')

        this.svgGroup.rect(this.radius * 2 + 12, this.radius * 2 + 12).addClass('e-outline')
            .x(-6).y(-6)
            .fill('none')


        return this
    }

    setColor(color) {
        this.color = color ? color : COLORS.DEFAULT_COLOR

        this.svgGroup.find('circle.e-frame').stroke({color: this.color})
        this.svgGroup.find('line').stroke({color: this.color})
    }

    createShadow() {
        return Shadows.boundaryTimerEvent(this.stage, COLORS.HIGHLIGHT_COLOR)
    }

    setText(parent, text, color) {

    }

    json(jsonData) {
        return jsonData ? this._setJson(jsonData) : this._getJson();
    }

    _setJson(json) {
        this.flowProperties = json;
        this.id = json.resourceId
        this.box = this.parseBounds(json.bounds)
        this.dockIfPossible()
        this.draw()

        return this;
    }

    _getJson() {
        if (!this.dockTarget) {
            return;
        }
        let outgoing = []

        if (this.outgoing) {
            _.each(this.outgoing, function(o) {
                outgoing.push({
                    resourceId: o.flowProperties.resourceId
                })
            })
        }

        let json = {
            bounds: this.getBounds(),
            childShapes: [],
            dockers: [
                {
                    x: this.dockTarget.box.width / 2,
                    y: this.dockTarget.box.height / 2
                }
            ],
            outgoing: outgoing,
            properties: {
                cancelactivity: 'no',
                documentation: '',
                name: '',
                overrideid: this.flowProperties.resourceId,
                timerdatedefinition: '', //固定时间
                timerdurationdefinition: '',//时间间隔
                timercycledefinition: '', //时间周期
                executionlisteners: {
                    executionListeners: []
                }
            },
            resourceId: this.flowProperties.resourceId,
            stencil: {
                id: this.flowProperties.stencil.id
            }
        }
        //合并属性：把节点属性完整的按照activity格式返回
        let me = this;
        let keys = _.keys(this.flowProperties.properties)
        _.each(keys, function(key) {
            json.properties[key] = me.flowProperties.properties[key]
        })

        return json;
    }

}
export default BoundaryTimerEvent