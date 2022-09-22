import FlowElement from "./FlowElement"
import _ from "underscore"
import {COLORS, STENCIL} from "./Constants";

class FlowNode extends FlowElement {
    constructor(stage, properties) {
        super(stage, properties);
        this.flowProperties.properties.asynchronousdefinition = 'No'
        this.flowProperties.properties.exclusivedefinition = 'Yes'
        this.flowProperties.outgoing = [] //出口

        this.outgoing = [];
        this.incoming = [];
        this.parent = null;
        this.dockedItems = []
    }

    addOutgoing(element) {
        if (_.findWhere(this.outgoing, {id: element.id}) === undefined) {
            this.outgoing.push(element)
            this.flowProperties.outgoing.push({
                resourceId: element.flowProperties.resourceId,
                stencil: element.flowProperties.stencil.id
            })
        }
    }

    addIncoming(element) {
        if (_.findWhere(this.incoming, {id: element.id}) === undefined) {
            this.incoming.push(element)
        }
    }

    /**
     * 删除出口
     * @param sequenceFlow
     * @param keep 仅删除引用，保持连接线显示，用於修改连接线的起点和终点
     */
    removeOutgoing(sequenceFlow, keep) {
        let me = this;
        if (_.findWhere(this.outgoing, {id: sequenceFlow.id})) {
            let outgoing = []
            _.each(this.outgoing, function (out) {
                if (out.id !== sequenceFlow.id) {
                    outgoing.push(out)
                } else {
                    if (!keep) {
                        out.svgGroup.remove()
                    }
                }
            })
            this.outgoing = outgoing;
        }
    }

    /**
     * 删除入口
     * @param sequenceFlow
     * @param keep 仅删除引用，保持连接线显示
     */
    removeIncoming(sequenceFlow, keep) {
        let me = this;
        if (_.findWhere(this.incoming, {id: sequenceFlow.id})) {
            let incoming = []
            _.each(this.incoming, function (inc) {
                if (inc.id !== sequenceFlow.id) {
                    incoming.push(inc)
                } else {
                    if (!keep) {
                        inc.svgGroup.remove()
                    }
                }
            })
            this.incoming = incoming;
        }
    }

    /**
     * 添加一个可以停靠的element
     * @param docked
     */
    addDocked(docked) {
        if (!this.existsDocked(docked)) { // 不可重复添加
            this.dockedItems.push(docked);
        }
    };

    /**
     * 删除一个停靠的元素
     */
    removeDocked(docked) {
        if (!docked) {
            return
        }
        if (!this.existsDocked(docked)) {
            return
        }
        this.dockedItems = _.filter(this.dockedItems, function (item) {
            return item.id !== docked.id
        });

    };

    /**
     * 判断元素是否停靠
     */
    existsDocked(docked) {
        return !_.isUndefined(_.findWhere(this.dockedItems, {id: docked.id}))
    }

    move(x, y) {
        //记录原来的中心点，判断子流程内外范围
        const cx = this.box.cx;
        const cy = this.box.cy;

        this.box.x = x;
        this.box.y = y;
        this.box.cx = this.box.x + this.box.width / 2
        this.box.cy = this.box.y + this.box.height / 2

        this.svgGroup.matrix(1, 0, 0, 1, x, y)

        _.each(this.getOutgoing(), function (element, index) {
            element.redrawPath();
        })

        _.each(this.getIncoming(), function (element, index) {
            element.redrawPath();
        })
        //重画节点，确保当前节点在最前面
        //this.svgGroup.remove()
        //this.draw()

        //如果移动到subprocess之内
        let me = this;
        this.stage.elements.each(function (subprocess) {
            //当前节点是子流程，并且移动的节点<>当前节点
            if (subprocess.flowProperties.stencil.id === STENCIL.subProcess && subprocess.id !== me.id) {
                let isInside = subprocess.hitTest(cx, cy) // 移动前，当前节点是否在子流程之内
                let added = subprocess.addChild(me) // 移动后是否加入子流程

                if (isInside !== added) { //移入或者移出,删除连接线
                    _.each(me.outgoing, function (out) {
                        me.stage.remove(out)
                    })
                    _.each(me.incoming, function (inc) {
                        me.stage.remove(inc)
                    })
                }
            }
        })

        //如果包含DockedItem
        if (this.dockedItems) {
            _.each(this.dockedItems, function (item) {
                item.move(me.box.x + item.offsetX, me.box.y + item.offsetY)
            })
        }
    }

    setActive(active) {
        super.setActive(active);
        if (active) {
            this.setColor(COLORS.HIGHLIGHT_COLOR)
            this.showOutline()
        } else {
            this.setColor(COLORS.DEFAULT_COLOR)
            this.hideOutline()
        }
    }

    setDisabled(disabled) {
        super.setDisabled(disabled);
        if (disabled) {
            this.setColor(COLORS.DISABLED_COLOR)
        } else {
            this.setColor(COLORS.DEFAULT_COLOR)
        }
    }

    setColor(color) {
        this.color = color ? color : COLORS.DEFAULT_COLOR

        this.svgGroup.findOne('rect.e-frame').stroke({color: this.color})
        let text = this.svgGroup.findOne('text');
        if (text) {
            text.fill(this.color)
        }

        this.svgGroup.find('path').fill(this.color)
    }


    /**
     * 点击事件
     * @param e
     * @param target
     */
    onClick(e, target) {
        //TODO:暂时什么都不做
        return true
    }

    onDblClick(e, target) {
        let element = this.getHitElement(e)
        let bubble;
        if (element) {
            if (element.id === this.id) {
                this.beforeEditText(e)
                bubble = true;
            } else {
                element.onDblClick(e, element)
                bubble = false;
            }
        }
        return bubble
    }

    /**
     * 点击事件
     * @param e
     * @param target
     */
    onMouseDown(e, target) {
        let element = this.getHitElement(e) //获取命中的element,如果命中子流程中的节点，则返回子节点
        let bubble;
        if (element) {
            if (element.id === this.id) { //本节点
                this.setActive(true)
                bubble = true;
            } else { //子节点
                element.onMouseDown(e, element)
                bubble = false;
            }
        }
        return bubble
    }

    onMouseMove(e, target) {
        let element = this.getHitElement(e)
        let bubble;
        if (element) {
            if (element.id === this.id) {
                this.mouseOver(true)
                bubble = true;
            } else {
                element.onMouseMove(e, element)
                bubble = false;
            }
        }
        return bubble
    }

    mouseOver(isOver) {
        if (isOver) {
            this.showOutline()
        } else {
            if (!this.active) {
                this.hideOutline()
            }
        }
    }

    /**
     * 返回命中的Element，如果没有childShapes则返回this，否则返回子节点element.
     * @param e
     */
    getHitElement(e) {
        let hitChild = false
        let me = this;
        let element = null;
        //如果有子节点，则先判断子节点是否命中
        _.each(this.childShapes, function (child) {
            //let child = me.stage.getById(c.id)
            if (child != null && child.hitTest(e.offsetX, e.offsetY)) {
                element = child;
            }
        });
        if (!element) {
            if (this.hitTest(e.offsetX, e.offsetY)) {
                element = this;
            }
        }
        return element;
    }

    getBounds() {
        let bounds = super.getBounds();
        if (this.parent) {
            bounds.upperLeft = {
                x: this.getBox().x - this.parent.getBox().x,
                y: this.getBox().y - this.parent.getBox().y
            }
            bounds.lowerRight = {
                x: this.getBox().x - this.parent.getBox().x + this.box.width,
                y: this.getBox().y - this.parent.getBox().y + this.box.height
            }
        }
        return bounds
    }

    parseBounds(bounds) {
        return {
            x: bounds.upperLeft.x,
            y: bounds.upperLeft.y,
            width: Math.abs(bounds.lowerRight.x - bounds.upperLeft.x),
            height: Math.abs(bounds.lowerRight.y - bounds.upperLeft.y),
            cx: bounds.upperLeft.x + Math.round(Math.abs(bounds.lowerRight.x - bounds.upperLeft.x) / 2),
            cy: bounds.upperLeft.y + Math.round(Math.abs(bounds.lowerRight.y - bounds.upperLeft.y) / 2)
        }
    }

    getOutgoing() {
        return this.outgoing
    }

    getIncoming() {
        return this.incoming
    }

    /**
     * 删除节点
     */
    remove() {
        _.each(this.outgoing, function (out) {
            out.remove()
        })
        _.each(this.incoming, function (inc) {
            inc.remove()
        })

        this.svgGroup.remove()
        this.stage.elements.remove(this)
    }

    getOutgoingJson() {
        let outgoingJson = [];
        if (this.outgoing) {
            _.each(this.outgoing, function (o) {
                outgoingJson.push({
                    resourceId: o.flowProperties.resourceId
                })
            })
        }

        if (this.dockedItems) {
            _.each(this.dockedItems, function (o) {
                outgoingJson.push({
                    resourceId: o.flowProperties.resourceId
                })
            })
        }
        return outgoingJson
    }


    /**
     * 用给定的json数据更新节点属性，并重绘节点
     * @param json
     */
    update(json) {
        if (this.stage.readonly || !this.stage.getById(this.id)) { //如果本节点不存在，则退出
            return;
        }
        this.flowProperties.properties = json.properties;
        this.draw()
        _.each(this.getOutgoing(), function (element, index) {
            element.redrawPath();
        })

        _.each(this.getIncoming(), function (element, index) {
            element.redrawPath();
        })
        this.setActive(this.active)
    }
}

export default FlowNode