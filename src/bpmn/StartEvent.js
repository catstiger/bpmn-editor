import Event from "./Event";
import {COLORS, STENCIL} from "./Constants";
import Shadows from "./Shadows";
import _ from "underscore"

class StartEvent extends Event {
    constructor(stage, properties) {
        properties.type = STENCIL.startEvent
        super(stage, properties)

        this.flowProperties.properties.name = properties.name ? properties.name : '开始'
    }

    draw() {
        if (this.svgGroup) {
            this.svgGroup.remove()
        }
        this.svgGroup = this.stage.getSvgDraw().group()
            .attr('id', this.flowProperties.resourceId)
            .matrix(1, 0, 0, 1, this.box.x, this.box.y)

        let shapeGroup = this.svgGroup.group().addClass('e-shape')
        let circle = shapeGroup.circle(this.radius * 2)
            .addClass('e-frame')
            .x(0)
            .y(0)
            .stroke({width: 1, color: COLORS.DEFAULT_COLOR})
            .fill({color: '#fff', opacity: 0.9})

        this.svgGroup.rect(48, 48).addClass('e-outline')
            .x(-6).y(-6)
            .fill('none')

        this.setText(this.svgGroup, this.flowProperties.properties.name, COLORS.DEFAULT_COLOR)
        return this
    }

    isOutgoing() {
        return false;
    }

    createShadow() {
        return Shadows.startEvent(this.stage, COLORS.HIGHLIGHT_COLOR)
    }

    addIncoming(element) {
        throw "Start Event can't add Incoming."
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
            outgoing: this.getOutgoingJson(),
            bounds: this.getBounds(),
            childNodes: [],
            dockers: [],
            resourceId: this.flowProperties.resourceId,
            stencil: this.flowProperties.stencil,
            properties: {
                trigger: 'None',
                initiator: 'initiator',
                documentation: this.flowProperties.properties.documentation,
                name: this.flowProperties.properties.name,
                formkeydefinition: "",
                formproperties: {
                    formProperties: []
                },
                executionlisteners: {
                    executionListeners: []
                }
            }
        }

        //合并属性：把节点属性完整的按照activity格式返回
        let keys = _.keys(this.flowProperties.properties)
        let me = this;
        _.each(keys, function (key) {
            json.properties[key] = me.flowProperties.properties[key]
        })

        return json;
    }

}

export default StartEvent