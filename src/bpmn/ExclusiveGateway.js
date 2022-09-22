import Gateway from "./Gateway"
import {COLORS, CONSTANTS, STENCIL} from "./Constants";
import Shadows from "./Shadows";
import _ from "underscore";

class ExclusiveGateway extends Gateway {
    constructor(stage, properties) {
        properties.type = STENCIL.exclusiveGateway
        super(stage, properties)

        this.flowProperties.properties.name = ''
    }

    draw() {
        if (this.svgGroup) {
            this.svgGroup.remove()
        }
        this.svgGroup = this.stage.getSvgDraw().group()
            .attr('id', this.flowProperties.resourceId)
            .matrix(1, 0, 0, 1, this.box.x, this.box.y)

        let shapeGroup = this.svgGroup.group().addClass('e-shape')

        shapeGroup.polygon('25,0 50,25 25,50 0,25')
            .addClass('e-frame')
            .stroke({width: 1, color: COLORS.DEFAULT_COLOR})
            .fill({color: '#fff', opacity: 0.9})

        shapeGroup.line(15, 15, 35, 35).stroke({width: 2, color: COLORS.DEFAULT_COLOR}).addClass('e-cross')
        shapeGroup.line(35, 15, 15, 35).stroke({width: 2, color: COLORS.DEFAULT_COLOR}).addClass('e-cross')

        this.svgGroup.rect(CONSTANTS.GATEWAY_SIZE + 12, CONSTANTS.GATEWAY_SIZE + 12).addClass('e-outline')
            .x(-6).y(-6)
            .fill('none')

        return this
    }

    createShadow() {
        return Shadows.exclusiveGateway(this.stage, COLORS.HIGHLIGHT_COLOR)
    }

    setColor(color) {
        this.color = color ? color : COLORS.DEFAULT_COLOR
        this.svgGroup.findOne('polygon.e-frame').stroke({color: this.color})
        this.svgGroup.find('line.e-cross').stroke({color: this.color})
    }

    beforeEditText(e) {
        e.preventDefault()
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
            resourceId: this.flowProperties.resourceId,
            properties: {
                name: this.flowProperties.properties.name,
                documentation: this.flowProperties.properties.documentation,
                executionlisteners: {
                    executionListeners: []
                }
            },
            stencil: {
                id: this.flowProperties.stencil.id
            },
            childShapes: [],
            outgoing: this.getOutgoingJson(),
            bounds: this.getBounds(),
            dockers: []
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

export default ExclusiveGateway