import Activity from "./Activity"
import '@svgdotjs/svg.draggable.js'
import {COLORS, CONSTANTS, STENCIL} from "./Constants";
import Shadows from "./Shadows";
import _ from "underscore";

class UserTask extends Activity {
    constructor(stage, properties) {
        properties.type = STENCIL.userTask
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
        UserTask._userIcon(shapeGroup)

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
        return Shadows.userTask(this.stage, this, COLORS.HIGHLIGHT_COLOR)
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
                formkeydefinition: "",
                formproperties: {
                    formProperties: []
                },
                inputdataitem: "",
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
                usertaskassignment: {
                    assignment: {

                    }
                }
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


    static _userIcon(container, color) {
        const d = "M491.52 901.12H61.44c0-253.44 286.72-307.2 286.72-307.2l81.92 204.8 40.96-20.48v-61.44h-20.48v-40.96h20.48v-20.48h40.96v20.48h20.48v40.96h-20.48v61.44l40.96 20.48 81.92-204.8s286.72 53.76 286.72 307.2H491.52z m0-286.72c-61.44 0-184.32-119.1936-184.32-266.24a85.79072 85.79072 0 0 1 2.048-18.432c0.69632-6.90176-3.01056-97.77152-2.048-104.448 17.05984-108.3392 84.45952-127.97952 162.11968-141.45536C476.59008 82.57536 504.48384 61.44 512 61.44s-5.5296 21.13536 1.76128 22.40512C591.0528 97.25952 658.45248 117.6576 675.84 225.28c1.16736 7.20896-0.75776 94.96576 0 102.4a109.42464 109.42464 0 0 1 0 20.48c0 147.0464-121.26208 266.24-184.32 266.24z"
        return container.path(d)
            .size(16, 16)
            .x(5)
            .y(5)
            .fill(color ? color : COLORS.DEFAULT_COLOR)
    }

}

export default UserTask
