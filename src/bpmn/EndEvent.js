import Event from "./Event"
import {COLORS, CONSTANTS, STENCIL} from "./Constants";
import Shadows from "./Shadows";
import _ from "underscore";

class EndEvent extends Event {
    constructor(stage, properties) {
        properties.type = STENCIL.endEvent
        super(stage, properties)

        this.flowProperties.properties.name = properties.name ? properties.name : '结束'
    }

    draw() {
        if (this.svgGroup) {
            this.svgGroup.remove()
        }
        this.svgGroup = this.stage.getSvgDraw().group()
            .attr('id', this.flowProperties.resourceId)
            .matrix(1, 0, 0, 1, this.box.x, this.box.y)

        let shapeGroup = this.svgGroup.group().addClass('e-shape')
        let circle = shapeGroup.circle(CONSTANTS.EVENT_RADIUS * 2)
            .addClass('e-frame')
            .x(0)
            .y(0)
            .stroke({width: 2, color: COLORS.DEFAULT_COLOR})
            .fill({color: '#fff', opacity: 0.9})

        this.svgGroup.rect(48, 48).addClass('e-outline')
            .x(-6).y(-6)
            .fill('none')

        this.setText(this.svgGroup, this.flowProperties.properties.name, COLORS.DEFAULT_COLOR)
        return this
    }

    isIncoming() {
        return false
    }

    createShadow() {
        return Shadows.endEvent(this.stage, COLORS.HIGHLIGHT_COLOR)
    }

    addOutgoing(element) {
        throw "EndEvent can't add outgoing"
    }

    json(jsonData) {
        return jsonData ? this._setJson(jsonData) : this._getJson()
    }

    _setJson(json) {
        this.flowProperties = json;
        this.id = json.resourceId
        this.box = this.parseBounds(json.bounds)
        this.draw()

        return this;
    }

    _getJson() {
        let json = {
            bounds: this.getBounds(),
            childShapes: [],
            dockers: [],
            outgoing: [],
            properties: {
                documentation: this.flowProperties.properties.documentation,
                executionlisteners: {
                    executionListeners: []
                },
                name: this.flowProperties.properties.name
            },
            resourceId: this.flowProperties.resourceId,
            stencil: {
                id: this.flowProperties.stencil.id
            }
        }

        //合并属性：把节点属性完整的按照activity格式返回
        let keys = _.keys(this.flowProperties.properties)
        let me = this;
        _.each(keys, function(key) {
            json.properties[key] = me.flowProperties.properties[key]
        })

        return json;
    }

}

export default EndEvent