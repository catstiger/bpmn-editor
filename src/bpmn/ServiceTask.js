import Activity from "./Activity"
import '@svgdotjs/svg.draggable.js'
import {COLORS, CONSTANTS, STENCIL} from "./Constants";
import Shadows from "./Shadows";
import _ from "underscore";

class ServiceTask extends Activity {
    constructor(stage, properties) {
        properties.type = STENCIL.serviceTask
        super(stage, properties)

        this._setSize(properties,
            properties.width ?? CONSTANTS.DEFAULT_WIDTH,
            properties.height ?? CONSTANTS.DEFAULT_HEIGHT)
    }

    draw() {
        if (this.svgGroup) {
            this.svgGroup.remove()
        }
        this.svgGroup = this.stage.getSvgDraw().group()
            .attr('id', this.flowProperties.resourceId)
            .matrix(1, 0, 0, 1, this.box.x, this.box.y)

        let shapeGroup = this.svgGroup.group().addClass('e-shape')

        let rect = shapeGroup.rect(this.box.width, this.box.height)
            .addClass('e-frame')
            .x(0)
            .y(0)
            .stroke({width: 1, color: COLORS.DEFAULT_COLOR})
            .radius(CONSTANTS.BORDER_RADIUS)
            .fill({color: '#fff', opacity: 0.9})
        this.setText(shapeGroup, this.flowProperties.properties.name)
        Shadows._serviceIcon(shapeGroup)

        this.svgGroup.rect(this.box.width + 12, this.box.height + 12).addClass('e-outline')
            .x(-6).y(-6)
            .fill('none')

        //如果包含DockedItem, 则重画，以确保在最前面
        if (this.dockedItems) {
            _.each(this.dockedItems, function (item) {
                item.svgGroup.remove()
                item.draw()
            })
        }

        return this;
    }

    createShadow() {
        return Shadows.serviceTask(this.stage, this, COLORS.HIGHLIGHT_COLOR)
    }

    /**
     * 获取或者设置JSON数据
     * @param jsonData JSON数据，如果为undefined,则返回JSON；否则为设则JSON，返回this
     * @return {{outgoing: [], resourceId: *, bounds: {upperLeft: {x: number, y: number}, lowerRight: {x, y}}, dockers: [], stencil: {id: *}, childShapes: [], properties: {formproperties: {formProperties: []}, loopmaximum: string, callacitivity: string, formkeydefinition: string, looptype: string, tasklisteners: string, executionlisteners: string, completioncondition: string, documentation: *, inputdataitem: string, prioritydefinition: string, usertaskassignment: {assignment: {}}, loopcardinality: string, bordercolor: string, exclusivedefinition: string, bgcolor: string, duedatedefinition: string, processid: string, asynchronousdefinition: string, loopcondition: string, name: *, isforcompensation: string, properties: string}}}
     */
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
            outgoing: this.getOutgoingJson(),
            properties: {
                asynchronousdefinition: "No",
                bgcolor: "#ffffff",
                bordercolor: "#000000",
                callacitivity: "",
                completioncondition: "",
                documentation: this.flowProperties.properties.documentation,
                duedatedefinition: "",
                exclusivedefinition: "Yes",
                executionlisteners: "",
                isforcompensation: "",
                loopcardinality: "",
                loopcondition: "",
                loopmaximum: "",
                looptype: "None",
                name: this.flowProperties.properties.name,
                prioritydefinition: "",
                processid: "",
                properties: "",
                tasklisteners: "",
                servicetaskclass: "",
                servicetaskdelegateexpression: "",
                servicetaskexpression: ""
            },
            resourceId: this.flowProperties.resourceId,
            stencil: {
                id:  this.flowProperties.stencil.id
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

export default ServiceTask
