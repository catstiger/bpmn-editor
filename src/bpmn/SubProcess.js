import {COLORS, CONSTANTS, OPERATIONS, STENCIL} from "./Constants";
import '@svgdotjs/svg.draggable.js'
import _ from "underscore"
import Activity from "./Activity";
import Shadows from "./Shadows";
import BoundaryEvent from "./BoundaryEvent";
import Stage from "./Stage"

class SubProcess extends Activity {
    constructor(stage, properties) {
        properties.type = STENCIL.subProcess
        super(stage, properties)
        this._setSize(properties,
            properties.width ?? CONSTANTS.DEFAULT_SUBPROCESS_WIDTH,
            properties.height ?? CONSTANTS.DEFAULT_SUBPROCESS_HEIGHT)
    }

    /**
     * 添加一个子element，如果子节点位置在subProcess之内
     * @param element
     * @return boolean
     */
    addChild(element) {
        //TODO: 暫不支持子流程嵌套
        if (element instanceof SubProcess) {
            return false;
        }
        //邊界時間不能作爲子流程的節點
        if (element instanceof BoundaryEvent) {
            //return false
        }

        if (this.isInside(element)) {
            if (!this.existsChild(element)) {
                this.childShapes.push(element)
                element.parent = this
            }
            return true
        } else {
            this.removeChild(element)
            return false
        }
    }

    removeChild(element) {
        if (this.existsChild(element)) {
            element.parent = null
        }
        this.childShapes = _.filter(this.childShapes, function (child) {
            return child.id !== element.id
        });

    }

    existsChild(element) {
        return !_.isUndefined(_.findWhere(this.childShapes, {id: element.id}))
    }

    /**
     * 判断一个Element是否在Subprocess内部
     * @param element
     */
    isInside(element) {
        if (!element) {
            throw '缺少参数'
        }
        //如果连接线的两端都在subprocess之内，则认为连接线在subprocess之内
        if (element.flowProperties.stencil.id === STENCIL.sequenceFlow) {
            return (_.isObject(element.incoming) && this.isInside(element.incoming))
                && (_.isObject(element.outgoing) && this.isInside(element.outgoing))
        } else {
            let center = element.getCenter();
            return super.hitTest(center.x, center.y) //只要坐标在内则为inside，不考虑坐标在子节点上
        }
    }

    /**
     * 判断一个element是否在SubProcess
     * @param element
     * @return {boolean}
     */
    isOutside(element) {
        if (!element) {
            throw '缺少参数'
        }
        return !this.isInside(element)
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
            .fill('none')
        this.setText(shapeGroup, this.flowProperties.properties.name, COLORS.DEFAULT_COLOR)

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

    justMove(x, y) {
        super.move(x, y);
    }

    move(x, y) {
        //相对位置的移动
        const deltaX = x - this.box.x
        const deltaY = y - this.box.y
        //移动本节点
        this.justMove(x, y);
        //移动子节点
        for (let i = 0; i < this.childShapes.length; i++) {
            let child = this.childShapes[i]//this.stage.getById(this.childShapes[i].id);
            if (!child) continue

            if (child.flowProperties.stencil.id !== STENCIL.sequenceFlow) {
                child.box.x += deltaX
                child.box.y += deltaY
                child.box.cx = child.box.x + child.box.width / 2
                child.box.cy = child.box.y + child.box.height / 2
                //不能直接用move方法，因为会导致连接线的调整
                child.svgGroup.matrix(1, 0, 0, 1, child.box.x, child.box.y)
            }
        }
        //移动子节点连接线
        for (let i = 0; i < this.childShapes.length; i++) {
            let child = this.childShapes[i]//this.stage.getById(this.childShapes[i].id);
            if (!child) continue
            if (child.flowProperties.stencil.id === STENCIL.sequenceFlow) {
                for (let j = 0; j < child.points.length; j++) {
                    child.points[j].x += deltaX
                    child.points[j].y += deltaY
                }
                child._drawPath(COLORS.DEFAULT_COLOR)
                child.redrawText()
            }
        }
    }

    setText(parent, text, color) {
        if (!text) text = ''
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
        svgText.cx(this.box.width / 2).cy(15)
    }

    createShadow() {
        return Shadows.subProcess(this.stage, this, COLORS.HIGHLIGHT_COLOR)
    }

    setActive(active) {
        this.active = active
        if (active) {
            this.setColor(COLORS.HIGHLIGHT_COLOR)
            this.showOutline()
            if (!this.stage.readonly) {
                this._initResizeBar() //初始化bars
            }

        } else {
            this.setColor(COLORS.DEFAULT_COLOR)
            this.hideOutline()
            if (!this.stage.readonly) {
                this._hideResizeBar() //隐藏bars
            }
        }
    }

    remove() {
        _.each(this.childShapes, function (child) {
            child.remove();
        })
        super.remove()
    }

    /**
     * 点击判断，如果命中子流程中的节点，则返回false
     * @param x
     * @param y
     * @return {boolean}
     */
    hitTestNested(x, y) {
        if (!super.hitTest(x, y)) {
            return false;
        }
        let hitted = false;
        _.each(this.childShapes, function (child) {
            if (child.hitTest(x, y)) {
                hitted = true
            }
        })
        return !hitted
    }


    _initResizeBar() {
        if (this.svgGroup.find('rect.e-bar').length > 0) {
            this.svgGroup.find('rect.e-bar').fill({
                opacity: 0.6
            }).width(10).height(10)
            return;
        }
        //let outline = this.svgGroup.findOne('rect.e-outline')
        let bars = this._drawBars() //绘制bars
        this._bindBarsDragEvents(bars) //绑定事件
    }

    _hideResizeBar() {
        //this.svgGroup.find('rect.e-bar').remove()
        this.svgGroup.find('rect.e-bar')
            .width(0)
            .height(0)
            .fill({opacity: 0})
    }

    /**
     * 绘制Bars,如果已经存在则返回bars
     * @returns {*}
     * @private
     */
    _drawBars() {
        let outline = this.svgGroup.findOne('rect.e-outline')
        let bars = this.svgGroup.find('rect.e-bar')
        const size = CONSTANTS.BAR_SIZE
        if (bars.length > 0) { //如果存在bars,则显示
            this.svgGroup.find('rect.e-bar')
                .width(size)
                .height(size)
                .fill({opacity: 0.6})
            return bars;
        }

        //左上角
        this.svgGroup.rect(size, size).addClass('e-bar').addClass('e-tl')
            .attr('cursor', 'nw-resize')
        //右上角
        this.svgGroup.rect(size, size).addClass('e-bar').addClass('e-tr')
            .attr('cursor', 'ne-resize')
        //右下角
        this.svgGroup.rect(size, size).addClass('e-bar').addClass('e-br')
            .attr('cursor', 'se-resize')
        //左下角
        this.svgGroup.rect(size, size).addClass('e-bar').addClass('e-bl')
            .attr('cursor', 'sw-resize')
        //左边
        this.svgGroup.rect(size, size).addClass('e-bar').addClass('e-ml')
            .attr('style', 'cursor:w-resize')
        //右边
        this.svgGroup.rect(size, size).addClass('e-bar').addClass('e-mr')
            .attr('style', 'cursor:e-resize')
        //上边
        this.svgGroup.rect(size, size).addClass('e-bar').addClass('e-mt')
            .attr('style', 'cursor:n-resize')
        //下边
        this.svgGroup.rect(size, size).addClass('e-bar').addClass('e-mb')
            .attr('style', 'cursor:s-resize')

        bars = this.svgGroup.find('rect.e-bar')
        bars.fill({
            color: COLORS.HIGHLIGHT_COLOR,
            opacity: 0.6
        })
        this._fixBarsPos() //调整位置
        return bars;
    }


    /**
     * 绑定bars拖动事件
     * @param bars bars
     * @private
     */
    _bindBarsDragEvents(bars) {
        let outline = this.svgGroup.findOne('rect.e-outline')
        let me = this
        bars.each(function (bar, index) {
            bar.draggable()
                .on('dragstart', function (e) {
                    e.cancelBubble = true
                    e.preventDefault()
                    me.showOutline()

                    //me.stage.setOperation(OPERATIONS.RESIZING)
                    me.stage.operation = OPERATIONS.RESIZING
                    me.stage._hideTools()
                })
                .on('dragmove', function (e) {
                    bars.fill({opacity: 0}) //移动过程中隐藏bars
                    me.svgGroup.findOne('rect.e-frame').stroke({color: COLORS.DISABLED_COLOR})
                    e.cancelBubble = true
                    e.preventDefault()

                    let offsetX = e.detail.event.offsetX
                    let offsetY = e.detail.event.offsetY

                    if (bar.hasClass('e-mr')) {//右边
                        outline.width(offsetX - me.box.x + 12)
                    } else if (bar.hasClass('e-mb')) { //下边
                        outline.height(offsetY - me.box.y + 12)
                    } else if (bar.hasClass('e-mt')) { //上边
                        let bottom = outline.y() + outline.height();
                        outline.y(offsetY - me.box.y + 12)
                        outline.height(bottom - outline.y())
                    } else if (bar.hasClass('e-ml')) { //左边
                        let right = outline.x() + outline.width()
                        outline.x(offsetX - me.box.x + 12)
                        outline.width(right - outline.x())
                    } else if (bar.hasClass('e-tl')) { //左上
                        let bottom = outline.y() + outline.height();
                        let right = outline.x() + outline.width()
                        outline.y(offsetY - me.box.y + 12)
                        outline.height(bottom - outline.y())
                        outline.x(offsetX - me.box.x + 12)
                        outline.width(right - outline.x())
                    } else if (bar.hasClass('e-bl')) { //左下
                        let right = outline.x() + outline.width()
                        //outline.y(offsetY - me.box.y + 12)
                        outline.height(offsetY - me.box.y + 12)
                        outline.x(offsetX - me.box.x + 12)
                        outline.width(right - outline.x())
                    } else if (bar.hasClass('e-tr')) { //右上
                        let bottom = outline.y() + outline.height();
                        outline.y(offsetY - me.box.y + 12)
                        outline.height(bottom - outline.y())
                        outline.width(offsetX - me.box.x + 12)
                    } else if (bar.hasClass('e-br')) {//右下
                        let left = outline.x();
                        outline.height(offsetY - me.box.y + 12)
                        outline.width(offsetX - me.box.x + 12)
                    }

                    me.stage.operation = OPERATIONS.RESIZING
                })
                .on('dragend', function (e) {
                    bars.fill({opacity: 0.6})
                    e.cancelBubble = true
                    e.preventDefault()

                    //移动到目标位置
                    me.move(outline.x() + me.box.x + 6, outline.y() + me.box.y + 6)
                    me.box.width = outline.width() - 12
                    me.box.height = outline.height() - 12
                    me.setActive(true)
                    me._resize(COLORS.HIGHLIGHT_COLOR)
                    //重新绘制连接线
                    _.each(me.getOutgoing(), function (element, index) {
                        element.redrawPath();
                    })

                    _.each(me.getIncoming(), function (element, index) {
                        element.redrawPath();
                    })
                    //me.resizeOver = true //标记为缩放刚刚结束，此时需要保持active状态
                    me.stage.operation = OPERATIONS.NONE
                    me.stage._showTools(me)
                })
        })
    }

    /**
     * 调整bars位置
     * @private
     */
    _fixBarsPos() {
        let outline = this.svgGroup.findOne('rect.e-outline')
        if (!this.active) {
            return;
        }
        //左上角
        this.svgGroup.findOne('rect.e-tl').cx(outline.x()).cy(outline.y())
        //右上角
        this.svgGroup.findOne('rect.e-tr').cx(outline.x() + outline.width()).cy(outline.y())
        //右下角
        this.svgGroup.findOne('rect.e-br').cx(outline.x() + outline.width()).cy(outline.y() + outline.height())
        //左下角
        this.svgGroup.findOne('rect.e-bl').cx(outline.x()).cy(outline.y() + outline.height())
        //左边
        this.svgGroup.findOne('rect.e-ml').cx(outline.x()).cy(outline.y() + outline.height() / 2)
        //右边
        this.svgGroup.findOne('rect.e-mr').cx(outline.x() + outline.width()).cy(outline.y() + outline.height() / 2)
        //上边
        this.svgGroup.findOne('rect.e-mt').cx(outline.x() + outline.width() / 2).cy(outline.y())
        //下边
        this.svgGroup.findOne('rect.e-mb').cx(outline.x() + outline.width() / 2).cy(outline.y() + outline.height())
    }

    resize(width, height) {
        this.box.width = width
        this.box.height = height
        this._resize();
    }

    _resize(color) {
        color = color ? color : COLORS.DEFAULT_COLOR
        //缩放边框
        this.svgGroup.findOne('rect.e-frame')
            .width(this.box.width)
            .height(this.box.height)
            .stroke({color: color})
        //调整text
        let text = this.svgGroup.findOne('text.e-text')
        if (text) {
            text.cx(this.box.width / 2).cy(15)
        }
        let outline = this.svgGroup.findOne('rect.e-outline')
        if (outline) {
            //调整outline
            outline.width(this.box.width + 12)
                .height(this.box.height + 12)
                .x(-6)
                .y(-6)
        }
        if (this.active) {
            this._fixBarsPos() //调整bars位置
        }
    }

    json(jsonData) {
        return jsonData ? this._setJson(jsonData) : this._getJson();
    }

    _setJson(json) {
        this.flowProperties = json;
        this.id = json.resourceId
        this.box = this.parseBounds(json.bounds)
        this.draw()
        if (json.childShapes) {
            let me = this
            //将子流程的相对位置转换为绝对位置
            _.each(json.childShapes, function (childShape) {
                let bounds = childShape.bounds
                let width = bounds.lowerRight.x - bounds.upperLeft.x
                let height = bounds.lowerRight.y - bounds.upperLeft.y

                bounds.upperLeft.x += me.getBox().x
                bounds.upperLeft.y += me.getBox().y

                bounds.lowerRight.x = bounds.upperLeft.x + width
                bounds.lowerRight.y = bounds.upperLeft.y + height

                childShape.bounds = bounds
            })
            //创建节点
            let nodes = Stage.loadElements(this.stage, json.childShapes)
            //将节点加入子流程
            _.each(nodes, function (node) {
                me.addChild(node)
            });

        }
        return this;
    }

    _getJson() {
        let children = [], me = this
        _.each(this.childShapes, function (child) {
            if (child) {
                children.push(child.json())
            }
        })
        let json = {
            bounds: this.getBounds(),
            childShapes: children,
            dockers: [],
            outgoing: this.getOutgoingJson(),
            properties: {
                asynchronousdefinition: 'No',
                exclusivedefinition: 'Yes',
                looptype: 'None',
                executionlisteners: {
                    executionListeners: []
                },
                documentation: this.flowProperties.properties.name.documentation,
                name: this.flowProperties.properties.name
            },
            resourceId: this.flowProperties.resourceId,
            stencil: {
                id: this.flowProperties.stencil.id
            }
        }

        //合并属性：把节点属性完整的按照activity格式返回
        let keys = _.keys(this.flowProperties.properties)
        _.each(keys, function (key) {
            json.properties[key] = me.flowProperties.properties[key]
        })

        return json;
    }

    /**
     *
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

export default SubProcess