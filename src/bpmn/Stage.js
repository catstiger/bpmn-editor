import {SVG} from "@svgdotjs/svg.js"
import _ from "underscore"
import {COLORS, CONSTANTS, OPERATIONS, STENCIL} from "./Constants";

import UserTask from "./UserTask";
import ServiceTask from "./ServiceTask";
import FlowNode from "./FlowNode";
import SequenceFlow from "./SequenceFlow";
import StartEvent from "./StartEvent"
import EndEvent from "./EndEvent";
import ExclusiveGateway from "./ExclusiveGateway";
import SubProcess from "./SubProcess";
import Elements from "./Elements";
import Shadows from "./Shadows";
import BoundaryTimerEvent from "./BoundaryTimerEvent";
import DockedObject from "./DockedObject";
import BoundaryEvent from "./BoundaryEvent";
import BaseElement from "./BaseElement";

/**
 * 流程图舞台，用于控制流程图中的各个元素
 */
class Stage {
    elements = new Elements()
    shadowNode = null //拖动节点的时候显示一个外框
    activeNode = null //当前活动节点
    incomingNode = null//绘制连接线的时候的起点节点
    shadowLine = null
    operation = OPERATIONS.NONE
    elementClick = null
    readonly = false

    selectMode = false //选择状态
    selectStartPoint = {} //选择框左上角
    selections = []
    dragNode = null
    shadows = []
    dragStart = {
        x: 0,
        y: 0
    }
    prevDragPoint = {}
    prevClickTime = new Date().getTime()
    zoom = {
        scale: 1
    }
    floatBarSelector = 'float-bar'

    /**
     * 构造器
     * @param container 容器ID，可以是一个dom ID或者一个selector
     * @param properties name-流程名称；key-必填流程Key；elementClick-点击节点和流程图的事件回调函数
     */
    constructor(container, properties) {
        if (container.indexOf('#') < 0) {
            container = '#' + container;
        }
        this.containerId = container;
        //(!properties.readonly) ? this.readonly = false : this.readonly = true
        this.readonly = properties.readonly;

        this.svgDraw = SVG()
            .addTo(container)
            .size('100%', '100%')

        if (_.isFunction(properties.elementClick)) {
            this.elementClick = properties.elementClick
        }

        this._bindClick() //鼠标点击事件
        this._bindMouseMove() //鼠标移动事件
        this._bindDblClick()//鼠标双击事件
        this._bindMouseDown()// 鼠标按下
        this._bindMouseUp()//鼠标抬起
        this._bindKeyDown() //

        this.flowProperties = {
            properties: {
                process_id: properties.key ?? properties.id,
                name: properties.name,
                documentation: '',
                process_namespace: "http://www.activiti.org/test",
                process_version: "",
                targetnamespace: "http://www.activiti.org/processdef",
                typelanguage: "http://www.w3.org/2001/XMLSchema",
                version: "",
                messages: [],
                executionlisteners: {
                    executionListeners: []
                },
                eventlisteners: {
                    eventListeners: []
                },
                signaldefinitions: [],
                messagedefinitions: []
            }
        }

        this.floatBarSelector = properties.floatBarSelector
        this.inputSelector = properties.inputSelector
    }

    setOperation(operation) {
        if (this.activeNode) {
            this.activeNode.setActive(false)
            this.activeNode = null
        }
        this._resetOperation()
        this.operation = operation ? operation : OPERATIONS.NONE
    }

    getSvgDraw() {
        return this.svgDraw
    }

    exportSVG() {
        return this.svgDraw.svg()
    }

    getContainer() {
        return document.getElementById(this.containerId.replaceAll('#', ''))
    }

    addStartEvent(properties) {
        let startEvent = new StartEvent(this, properties).draw()
        this.elements.add(startEvent)
        this._addToSubProcessIfPossible(startEvent)
        return startEvent;
    }

    addEndEvent(properties) {
        let endEvent = new EndEvent(this, properties).draw()
        this.elements.add(endEvent)
        this._addToSubProcessIfPossible(endEvent)
        return endEvent;
    }

    addBoundaryTimerEvent(properties) {
        let timerEvent = new BoundaryTimerEvent(this, properties).draw()
        this.elements.add(timerEvent)
        this._addToSubProcessIfPossible(timerEvent)
        if (timerEvent.dockTarget) {
            this._resetFill(timerEvent.dockTarget)
        }
        return timerEvent
    }

    addSubProcess(properties) {
        let subProcess = new SubProcess(this, properties).draw()
        this.elements.add(subProcess)
        //缺省的加一个startevent
        let startEvent = this.addStartEvent({
            cx: subProcess.box.x + 40,
            cy: subProcess.box.y + CONSTANTS.DEFAULT_SUBPROCESS_HEIGHT / 2
        })
        this._addToSubProcessIfPossible(subProcess)
        return subProcess;
    }

    /**
     * 添加UserTask
     * @param properties
     */
    addUserTask(properties) {
        let userTask = new UserTask(this, properties).draw()
        this.elements.add(userTask)
        this._addToSubProcessIfPossible(userTask)
        return userTask;
    }

    addServiceTask(properties) {
        let serviceTask = new ServiceTask(this, properties).draw()
        this.elements.add(serviceTask)
        this._addToSubProcessIfPossible(serviceTask)
        return serviceTask;
    }

    addSequenceFlow(properties) {
        let sequenceFlow = new SequenceFlow(this, properties).draw()
        this.elements.add(sequenceFlow)
        this._addToSubProcessIfPossible(sequenceFlow)
        return sequenceFlow;
    }

    addExclusiveGateway(properties) {
        let gateway = new ExclusiveGateway(this, properties).draw()
        this.elements.add(gateway)
        this._addToSubProcessIfPossible(gateway)
        return gateway;
    }

    /**
     * 是否处于拖动状态
     * @returns {boolean|null}
     */
    isDragging(e) {
        return e.which === 1 && this.shadowNode && this.dragNode
    }

    /**
     * 根据ID查询
     * @param id
     * @returns {null}
     */
    getById(id) {
        if (this.elements.getSize() === 0) {
            return null;
        }
        let e = null;
        this.elements.each(function (element) {
            if (element.flowProperties.resourceId === id) {
                e = element
            }
        })
        return e
    }

    /**
     * 删除一个element
     * @param element
     */
    remove(element) {
        if (this.readonly) {
            return;
        }
        if (element) {
            element.remove()
            this.operation = OPERATIONS.NONE
            this._hideTools()
        }
    }

    /**
     * 响应浮动工具条事件
     * @param type
     */
    onFloatButtons(type) {
        if (this.readonly) {
            return;
        }

        let me = this;
        let source = this._getActiveNode();
        if (!source) {
            return;
        }

        let dest;

        let cx = source.getBox().cx + source.getBox().width / 2 + 60
        let cy = source.getBox().cy

        switch (type) {
            case OPERATIONS.ADD_USERTASK: {
                dest = {
                    _type: UserTask,
                    name: '用户任务',
                    cx: cx + CONSTANTS.DEFAULT_WIDTH / 2,
                    cy: cy,
                    width: CONSTANTS.DEFAULT_WIDTH,
                    height: CONSTANTS.DEFAULT_HEIGHT
                }
                break;
            }
            case OPERATIONS.ADD_SERVICETASK: {
                dest = {
                    _type: ServiceTask,
                    name: '服务任务',
                    cx: cx + CONSTANTS.DEFAULT_WIDTH / 2,
                    cy: cy,
                    width: CONSTANTS.DEFAULT_WIDTH,
                    height: CONSTANTS.DEFAULT_HEIGHT
                }
                break;
            }
            case OPERATIONS.ADD_ENDEVENT: {
                dest = {
                    _type: EndEvent,
                    name: '结束',
                    cx: cx + CONSTANTS.EVENT_RADIUS,
                    cy: cy,
                    width: CONSTANTS.EVENT_RADIUS * 2,
                    height: CONSTANTS.EVENT_RADIUS * 2
                }
                break;
            }
            case OPERATIONS.ADD_SUBPROCESS: {
                dest = {
                    _type: SubProcess,
                    name: '子流程',
                    cx: cx + CONSTANTS.DEFAULT_SUBPROCESS_WIDTH / 2,
                    cy: cy,
                    width: CONSTANTS.DEFAULT_SUBPROCESS_WIDTH,
                    height: CONSTANTS.DEFAULT_SUBPROCESS_HEIGHT
                }

                break;
            }
            case OPERATIONS.ADD_EXCLUSIVE_GATEWAY: {
                dest = {
                    _type: ExclusiveGateway,
                    cx: cx + CONSTANTS.GATEWAY_SIZE,
                    cy: cy,
                    width: CONSTANTS.GATEWAY_SIZE,
                    height: CONSTANTS.GATEWAY_SIZE
                }

                break;
            }

            case OPERATIONS.PREPARE_DRAW_CONNECTION: {
                this.operation = OPERATIONS.DRAWING_CONNECTION
                this.incomingNode = source
                break;
            }
            case OPERATIONS.REMOVE: {
                this.remove(source)
                this.activeNode = null
                break
            }
        }

        if (dest) {
            if (dest._type === SubProcess && source.parent && source.parent.flowProperties.stencil.id === STENCIL.subProcess) {
                throw '暂不支持子流程嵌套'
            }
            //如果创建的节点与其他节点重合，则调整位置
            let angle = 0, length = Math.abs(dest.cx - source.box.cx), node = null;
            while (true) { //循环计算位置冲突
                //左上角，用于计算box交叉
                dest.x = dest.cx - dest.width / 2
                dest.y = dest.cy - dest.height / 2

                let conflict = false;
                this.elements.each(function (e) {
                    if (e instanceof FlowNode && !(e instanceof SubProcess)) {
                        if (me.boxCrossed(e.getBox(), dest) || me.boxContains(dest, e.getBox())) {
                            conflict = true;
                        }
                    }
                })
                if (conflict) { //有交叉，则调整45°再次计算
                    angle += Math.PI / 4
                    if (angle >= Math.PI * 2) break; //转了一圈，没有位置
                    dest.cx = source.box.cx + Math.round(length * Math.cos(angle))
                    dest.cy = source.box.cy - Math.round(length * Math.sin(angle))
                } else {
                    node = Reflect.construct(dest._type, [me, dest]).draw()
                    this.elements.add(node)
                    break;
                }
            }

            if (node) {
                //如果source位于subprocess内部，则要确保新的节点在subprocess内部
                if (source.parent && source.parent.flowProperties.stencil.id === STENCIL.subProcess) {
                    if (node.flowProperties.stencil.id === STENCIL.subProcess) {
                        throw '暂不支持子流程嵌套'
                    }
                    if (!this.boxContains(source.parent.getBox(), node.getBox())) {
                        let children = source.parent.childShapes
                        children.push(node)

                        let x = _.min(children.map(i => {
                            return i.getBox().x
                        }))
                        let y = _.min(children.map(i => {
                            return i.getBox().y
                        }))

                        let width = _.max(children.map(i => {
                            return i.getBox().x + i.getBox().width
                        })) - x
                        let height = _.max(children.map(i => {
                            return i.getBox().y + i.getBox().height
                        })) - y
                        //缩放外部的子流程，使得子流程适应内部的节点
                        source.parent.resize(width + 100, height + 100);
                        source.parent.justMove(x - 50, y - 50)

                    }
                    source.parent.addChild(node)
                    node.parent = source.parent
                }
                this.addSequenceFlow({
                    incoming: source,
                    outgoing: node
                })
                source.setActive(false)
                node.setActive(true)
                this._showTools(node) //移动工具条到新建的节点
            } else {
                throw '位置冲突'
            }
        }
    }

    /**
     * 绘制水平基准线
     * @param shadow
     */
    drawHorizonLine(shadow) {
        let x1 = 0;
        let x2 = this.svgDraw.width()

        let point = {
            x: Math.round(shadow.x() + shadow.width() / 2),
            y: Math.round(shadow.y() + shadow.height() / 2),
        }
        let showLine = false

        let me = this;
        this.elements.each(function (element) {
            if (element instanceof FlowNode) {
                let c = element.getCenter()
                if (Math.abs(point.y - c.y) <= 1) {
                    me.hideHorizonLine()
                    me.svgDraw.line(x1, c.y, x2, c.y)
                        .stroke({width: 1, color: COLORS.HIGHLIGHT_COLOR})
                        .addClass('e-horizon-line')
                    showLine = true
                }
            }
        })
        if (!showLine) {
            this.hideHorizonLine()
        }
    }

    hideHorizonLine() {
        let horizonLine = this.svgDraw.find('line.e-horizon-line')
        if (horizonLine) {
            let duration = 300
            horizonLine.animate({duration: duration}).stroke({width: 0})
            let i = setTimeout(function () {
                horizonLine.remove()
                clearTimeout(i)
            }, duration)
        }
    }

    drawVerticalLine(shadow) {
        let y1 = 0;
        let y2 = this.svgDraw.height()
        let point = {
            x: Math.round(shadow.x() + shadow.width() / 2),
            y: Math.round(shadow.y() + shadow.height() / 2),
        }
        let showLine = false;
        let me = this
        this.elements.each(function (element) {
            if (element instanceof FlowNode) {
                let c = element.getCenter()
                if (Math.abs(point.x - c.x) <= 1) {
                    me.hideVerticalLine();
                    me.svgDraw.line(c.x, y1, c.x, y2)
                        .stroke({width: 1, color: COLORS.HIGHLIGHT_COLOR})
                        .addClass('e-vertical-line')

                    showLine = true
                }
            }
        });

        if (!showLine) {
            this.hideVerticalLine()
        }
    }

    hideVerticalLine() {
        let verticalLine = this.svgDraw.find('line.e-vertical-line')
        if (verticalLine) {
            let duration = 300
            verticalLine.animate({duration: duration}).stroke({width: 0})
            let i = setTimeout(function () {
                verticalLine.remove()
                clearTimeout(i)
            }, duration)
        }
    }

    _zoom(step) {
        if (!step) {
            this.zoom.scale = 1;
        }  else {
            this.zoom.scale += step
        }
        let bounds = this.getBounds()
        //流程图的中心点移动到SVG中心
        this.zoom.translateX = this.svgDraw.node.clientWidth * this.zoom.scale / 2 - (bounds.upperLeft.x + (bounds.lowerRight.x - bounds.upperLeft.x) / 2)
        this.zoom.translateY = this.svgDraw.node.clientHeight * this.zoom.scale / 2 - (bounds.upperLeft.y + (bounds.lowerRight.y - bounds.upperLeft.y))

        this.svgDraw.transform({
            translateX: this.zoom.translateX,
            translateY: this.zoom.translateY,
            scale: this.zoom.scale
        })

    }

    zoomIn(step) {
        if (_.isUndefined(step)) {
            step = 0.1
        }
        this._zoom(step)
    }

    zoomOut(step) {
        if (_.isUndefined(step)) {
            step = 0.1
        }
        this._zoom(-step)
    }

    getBounds() {
        let maxX = 0, maxY = 0, minX = 100000, minY = 100000
        this.elements.each(function (element) {
            if (element.getBox().x + element.getBox().width > maxX) {
                maxX = element.getBox().x + element.getBox().width
            }
            if (element.getBox().y + element.getBox().height > maxY) {
                maxY = element.getBox().y + element.getBox().height
            }
            if (element.getBox().x < minX) {
                minX = element.getBox().x
            }
            if (element.getBox().y < minY) {
                minY = element.getBox().y
            }
        })
        return {
            upperLeft: {x: minX, y: minY},
            lowerRight: {x: maxX, y: maxY}
        };
    }

    json(jsonData) {
        if (!jsonData) {
            return this._getJson();
        } else {
            this._setJson(jsonData)
        }
    }

    _setJson(json) {
        this.flowProperties.properties = json.properties
        let me = this
        let flows = []
        Stage.loadElements(this, json.childShapes)
    }

    _getJson() {
        let json = {
            bounds: this.getBounds(),
            childShapes: [],
            properties: this.flowProperties.properties,
            resourceId: "canvas",
            ssextensions: [],
            stencil: {
                id: "BPMNDiagram"
            },
            stencilset: {
                namespace: "http://b3mn.org/stencilset/bpmn2.0#"
            }
        }


        //查找所有子流程中的element的resourceId
        let subprocessChildren = []
        this.elements.each(function (element) {
            if (element instanceof SubProcess) {
                _.each(element.childShapes, function (c) {
                    subprocessChildren.push(c.id)
                })
            }
        })

        this.elements.each(function (element) {
            if (_.indexOf(subprocessChildren, element.id) < 0) {
                let childJson = element.json();
                if (childJson) {
                    json.childShapes.push(childJson)
                }
            }
        })

        return json
    }

    update(json) {
        if (this.readonly) {
            return;
        }
        if (json.properties) {
            this.flowProperties.properties.name = json.properties.name
            this.flowProperties.properties.process_id = json.properties.process_id ?? BaseElement._id
            this.flowProperties.properties.documentation = json.properties.documentation ?? ''
            this.flowProperties.properties.executionlisteners = json.properties.executionlisteners
        }
    }

    /**
     * 尝试将一个element加入到子流程
     * @param element
     * @private
     */
    _addToSubProcessIfPossible(element) {
        let me = this;

        me.elements.eachRevert(function (ele) {
            if (ele.flowProperties.stencil.id === STENCIL.subProcess
                && ele.id !== element.id) {
                ele.addChild(element)
            }
        })
    }

    /**
     * 绑定单击事件
     * @private
     */
    _bindClick() {
        let me = this
        this.svgDraw.on('click', function (e) {

        })
    }

    /**
     * 绑定双击事件
     * @private
     */
    _bindDblClick() {
        let me = this
        this.svgDraw.on('dblclick', function (e) {
            // setActive方法重新绘制元素，导致dblclick无法响应
        })
    }

    _bindMouseDown() {
        let me = this

        this.svgDraw.on('mousedown', function (e) {
            switch (me.operation) {
                case OPERATIONS.NONE: {
                    let element = me._setActive(e) //点击的element设置为active
                    if (element) {
                        element.clickX = e.offsetX - element.getBox().x
                        element.clickY = e.offsetY - element.getBox().y
                    }
                    me.dragStart.x = e.offsetX
                    me.dragStart.y = e.offsetY

                    if (!me.readonly) {
                        me._dragStart(e) //开始拖动
                    }

                    break
                }
                //预备绘制连接线
                case OPERATIONS.PREPARE_DRAW_CONNECTION: {
                    if (me.readonly) break;
                    let ele = me.getSelectedNode(e.offsetX, e.offsetY)
                    if (me._isValidIncoming(ele)) {
                        me.setOperation(OPERATIONS.DRAWING_CONNECTION)
                        me.incomingNode = ele
                    }
                    break
                }
                //绘制连接线结束
                case OPERATIONS.DRAWING_CONNECTION: {
                    if (me.readonly) break;
                    let outgoing = me.getSelectedNode(e.offsetX, e.offsetY)
                    if (outgoing && outgoing.isOutgoing()) {
                        if (me._isValidOutgoing(me.incomingNode, outgoing)) { //subprocess内部的节点不可连接所在的subprocess
                            me.addSequenceFlow({
                                incoming: me.incomingNode,
                                outgoing: outgoing
                            })
                        }
                        me._resetFill(outgoing)
                        me.incomingNode = null;
                        me.setOperation(OPERATIONS.NONE)
                    }
                    break;
                }
                //新增UserTask
                case OPERATIONS.ADD_USERTASK: {
                    if (me.readonly) break;
                    let valid = me._validateTargetPosition(me.shadowNode);
                    if (valid.valid) {
                        me.addUserTask({
                            name: '用户任务', cx: e.offsetX, cy: e.offsetY
                        })
                        me.setOperation(OPERATIONS.NONE)
                    } else {
                        me._resetFill(valid.target)
                    }
                    break
                }
                //新增ServiceTask
                case OPERATIONS.ADD_SERVICETASK: {
                    if (me.readonly) break;
                    let valid = me._validateTargetPosition(me.shadowNode);
                    if (valid.valid) {
                        me.addServiceTask({
                            name: '服务任务', cx: e.offsetX, cy: e.offsetY
                        })
                        me.setOperation(OPERATIONS.NONE)
                    } else {
                        me._resetFill(valid.target)
                    }
                    break
                }
                //新增StartEvent
                case OPERATIONS.ADD_STARTEVENT: {
                    if (me.readonly) break;
                    let valid = me._validateTargetPosition(me.shadowNode);
                    if (valid.valid) {
                        me.addStartEvent({
                            name: '开始', cx: e.offsetX, cy: e.offsetY
                        })
                        me.setOperation(OPERATIONS.NONE)
                    } else {
                        me._resetFill(valid.target)
                    }

                    break
                }
                //新增EndEvent
                case OPERATIONS.ADD_ENDEVENT: {
                    if (me.readonly) break;
                    let valid = me._validateTargetPosition(me.shadowNode);
                    if (valid.valid) {
                        me.addEndEvent({
                            name: '结束', cx: e.offsetX, cy: e.offsetY
                        })
                        me.setOperation(OPERATIONS.NONE)
                    } else {
                        me._resetFill(valid.target)
                    }

                    break
                }
                //新增TimerEvent
                case OPERATIONS.ADD_TIMEREVENT: {
                    if (me.readonly) break;
                    let valid = me._validateTargetPosition(me.shadowNode);
                    if (valid.valid) {
                        me.addBoundaryTimerEvent({
                            name: '', cx: e.offsetX, cy: e.offsetY
                        })
                        me.setOperation(OPERATIONS.NONE)
                    } else {
                        me._resetFill(valid.target)
                    }

                    break
                }
                //新增SubProcess
                case OPERATIONS.ADD_SUBPROCESS: {
                    if (me.readonly) break;
                    let valid = me._validateTargetPosition(me.shadowNode);
                    if (valid.valid) {
                        me.addSubProcess({
                            name: '子流程', cx: e.offsetX, cy: e.offsetY
                        })
                        me.setOperation(OPERATIONS.NONE)
                    } else {
                        me._resetFill(valid.target)
                    }

                    break
                }
                //新增ExclusiveGateway
                case OPERATIONS.ADD_EXCLUSIVE_GATEWAY: {
                    if (me.readonly) break;
                    let valid = me._validateTargetPosition(me.shadowNode);
                    if (valid.valid) {
                        me.addExclusiveGateway({
                            cx: e.offsetX, cy: e.offsetY
                        })
                        me.setOperation(OPERATIONS.NONE)
                    } else {
                        me._resetFill(valid.target)
                    }

                    break
                }
            }
        })
    }


    /**
     * 绑定鼠标拖动事件
     * @private
     */
    _bindMouseMove() {
        let me = this
        this.svgDraw.on('mousemove', function (e) {
            if (me.operation === OPERATIONS.NONE) { //处理拖动
                if (!me.isDragging(e) && me.selections.length === 0) { //没有拖动，也不是选择状态
                    me.elements.eachRevert(function (ele) {
                        if (!ele.onMouseMove(e, ele)) {
                            ele.mouseOver(false)
                        }
                    })
                }
                //拖动节点
                if (!me.readonly) {
                    me._dragMove(e)
                }
            } else if (me.operation === OPERATIONS.PREPARE_DRAW_CONNECTION) { //准备绘制连线（还没起点）
                me._changeElementStatusOnMoving(e)
            } else if (me.operation === OPERATIONS.DRAWING_CONNECTION) { //绘制一个虚拟的连接线（只有起点）
                me._changeElementStatusOnMoving(e)
                if (me.incomingNode) {
                    //如果起点位于Subprocess,则终点也限制在Subprocess
                    if (me.incomingNode.parent && me.incomingNode.parent instanceof SubProcess) {
                        if (!me.incomingNode.parent.hitTest(e.offsetX, e.offsetY)) {
                            return;
                        }
                    }
                    let start = me.incomingNode.getJoinPoint({x: e.offsetX, y: e.offsetY})
                    if (me.shadowLine) {
                        me.shadowLine.remove()
                    }
                    me.shadowLine = me.svgDraw.line(start.x, start.y, e.offsetX, e.offsetY)
                        .stroke({color: '#000', dasharray: 3, width: 1});
                }
            } else if (me.operation === OPERATIONS.CHANGING_CONNECTION_START) { //改变起点
                me._changeElementStatusOnMoving(e)
            } else if (me.operation === OPERATIONS.CHANGING_CONNECTION_END) { //改变终点
                me._changeElementStatusOnMoving(e)
            } else if (me.operation) { //如果操作不为空，则创建相应的Shadow
                me._createOrMoveShadow(e, me.operation)
            }
        })
    }

    _bindMouseUp() {
        let me = this
        this.svgDraw.on('mouseup', function (e) {
            me.elements.each(function (ele) {
                ele.onMouseUp(e, ele);
                return true
            })

            //拖动结束
            me._dragOver(e)
            if (me.readonly) {
                return;
            }
            me.hideVerticalLine()
            me.hideHorizonLine()
            if (e.button === 2) {
                me._resetOperation(true); //重置操作状态
            }

            let now = new Date().getTime()
            if (now - me.prevClickTime < 220) {
                me.elements.eachRevert(function (ele) {
                    return !ele.onDblClick(e, ele) //如果命中，则阻止继续传递事件
                })
            }
            me.prevClickTime = now;
        })
    }


    /**
     * 绘制连接线的时候，鼠标移动到节点，改变节点状态
     * @param e
     * @param prepare
     * @private
     */
    _changeElementStatusOnMoving(e) {
        let me = this;
        let ele = me.getSelectedNode(e.offsetX, e.offsetY) //得到路过的元素
        if (ele) {
            if (me.operation === OPERATIONS.PREPARE_DRAW_CONNECTION || me.operation === OPERATIONS.CHANGING_CONNECTION_START) {//划线开始 (没有起点)，判断是否是起点
                if (me._isValidIncoming(ele)) {
                    me._allowed(ele)
                } else {
                    me._notAllowed(ele)
                }
            }
            if (me.operation === OPERATIONS.DRAWING_CONNECTION || me.operation === OPERATIONS.CHANGING_CONNECTION_END) {
                if (me._isValidOutgoing(me.incomingNode, ele)) {
                    me._allowed(ele)
                } else {
                    me._notAllowed(ele)
                }
            }
        } else { //如果没有终点
            me._notAllowed(null)
        }
        //没有移动到的节点，填充色还原
        me.elements.each(function (element) {
            let frame = element.svgGroup.find('.e-frame');
            if (!ele || element.id !== ele.id) {
                me._resetFill(element)
            }
        })

    }

    _setFill(element, color) {
        if (element) {
            let frame = element.svgGroup.find('.e-frame');
            if (frame) {
                frame.fill({color: color, opacity: 0.1})
            }
        }
    }

    _resetFill(element) {
        if (element) {
            element.setDisabled(false)
            let frame = element.svgGroup.find('.e-frame');
            if (frame) {
                if (element instanceof SubProcess) {
                    frame.fill('none')
                } else if (element instanceof DockedObject) {
                    frame.fill({color: '#fff', opacity: 1})
                } else {
                    frame.fill({color: '#fff', opacity: 0.9})
                }
            }
        }

    }

    /**
     * 判断Shadow位置是否可以放置一个Element
     * @param shadow 创建节点时，移动的那个shadow

     * @private
     */
    _validateTargetPosition(shadow) {
        if (!shadow) { //如果没有shadow, 可以随便放
            return true;
        }
        let box = {
            x: shadow.x(),
            y: shadow.y(),
            width: shadow.width(),
            height: shadow.height()
        }
        shadow.box = box;
        let isValid = true;
        let target = null;
        let me = this;

        this.elements.each(function (element) {
            if (element instanceof SequenceFlow) {
                return;
            }
            if (shadow.id !== element.id) { //自己不和自己做判断
                if (me.boxContains(box, element.getBox())) { //如果目标位置的元素包含在shadow之内
                    isValid = false;
                    target = element
                    return false;
                } else if (shadow.stencil === STENCIL.subProcess && element instanceof SubProcess && element.hitTest(shadow.cx(), shadow.cy())) { //TODO：暂不支持子流程嵌套
                    isValid = false;
                    target = element
                    return false;
                }/* else if (shadow.stencil === STENCIL.boundaryTimerEvent && me.boxContains(element.getBox(), box) && !(element instanceof SubProcess)) { //如果边界事件位于元素之内
                    isValid = false;
                    target = element
                    return false;
                }*/
            }
        })
        //如果添加邊界事件，需要全局判斷，即只有位於元素邊界才可創建
        if (shadow.stencil === STENCIL.boundaryTimerEvent) {
            let validPosition = false
            this.elements.each(function (element) {
                if (BoundaryEvent.isValidDock(me, element, shadow)) {
                    validPosition = true
                    target = element
                    return false
                }
            })
            isValid = validPosition
        }

        if (!isValid) {
            me._notAllowed(target)
        } else {
            me._allowed(target)
        }

        me.elements.each(function (element) {
            if (!target || target.id !== element.id) {
                me._resetFill(element)
            }
        })

        return {
            valid: isValid,
            target: target
        };
    }

    _notAllowed(element) {
        if (element) {
            this._setFill(element, '#333')
            element.setDisabled(true)
        }
        this.svgDraw.attr('style', 'cursor:not-allowed')
    }

    _allowed(element) {
        if (element) {
            this._setFill(element, COLORS.ENABLED_COLOR)
            element.setDisabled(false)
        }
        this.svgDraw.attr('style', 'cursor:default')
    }


    /**
     * 判断节点是否可以作为连接线的起点
     * @param incoming
     * @return {*|boolean}
     * @private
     */
    _isValidIncoming(incoming) {
        return incoming && incoming.isIncoming();
    }

    /**
     * 判断节点是否可以作为连接线的终点
     * @param incoming 起点
     * @param outgoing 终点
     * @return {boolean}
     * @private
     */
    _isValidOutgoing(incoming, outgoing) {
        let me = this;

        if (!incoming || !outgoing) {
            return false;
        }

        if (incoming.parent && !outgoing.parent) { //起点在子流程内，但是终点不在
            return false;
        }

        if (!incoming.parent && outgoing.parent) { //终点在子流程内，但是终点不在
            return false;
        }

        if (incoming.parent && outgoing.parent && incoming.parent.id !== outgoing.parent.id) { //起点和终点都在子流程内，但是不是一个子流程
            return false;
        }

        return outgoing.isOutgoing();
    }

    /**
     * 得到命中的节点
     */
    getSelectedNode(x, y) {
        let ele = null;

        this.elements.each(function (element) {
            if (element instanceof FlowNode) {
                ele = element.getHitElement({
                    offsetX: x,
                    offsetY: y
                })
                if (ele) {
                    return false;
                }
            }
        })
        return ele
    }

    /**
     * 得到命中的连接线
     */
    _getSelectedFlow(x, y) {
        let ele = null;
        //鼠标移动到Node节点，该节点变色鼠标光标改变
        this.elements.each(function (element) {
            if (element instanceof SequenceFlow) {
                if (element.hitTest(x, y)) {
                    ele = element
                }
            }
        })
        return ele
    }

    /**
     * 得到鼠标位置的Element，如果没有任何element，则返回this
     * @param x
     * @param y
     * @return {Stage}
     * @private
     */
    getSelected(x, y) {
        let node = this.getSelectedNode(x, y)
        let flow = this._getSelectedFlow(x, y)

        return node ? node : (flow ? flow : this)
    }

    hasElements() {
        return this.elements.getSize() > 0
    }

    clear() {
        this.elements.each(function (element) {
            element.svgGroup.remove()
        })
        this.elements = new Elements()
    }

    /**
     * 根据元素类型创建Shadow
     */
    _createOrMoveShadow(e, operation) {
        if (this.readonly) {
            return;
        }
        let me = this;
        let color = COLORS.HIGHLIGHT_COLOR
        switch (operation) {
            //新增用户
            case OPERATIONS.ADD_USERTASK: {
                if (!me.shadowNode) {
                    me.shadowNode = Shadows.userTask(this, null, color)
                }
                break
            }

            //新增Service
            case OPERATIONS.ADD_SERVICETASK: {
                if (!me.shadowNode) {
                    me.shadowNode = Shadows.serviceTask(this, null, color)
                }
                break
            }

            //新增StartNode
            case OPERATIONS.ADD_STARTEVENT: {
                if (!me.shadowNode) {
                    me.shadowNode = Shadows.startEvent(this, color)
                }
                break
            }
            //新增EndNode
            case OPERATIONS.ADD_ENDEVENT: {
                if (!me.shadowNode) {
                    me.shadowNode = Shadows.endEvent(this, color)
                }
                break
            }
            //新增BoundaryTimerEvent
            case OPERATIONS.ADD_TIMEREVENT: {
                if (!me.shadowNode) {
                    me.shadowNode = Shadows.boundaryTimerEvent(this, color)
                }
                break
            }
            //新增SubProcess
            case OPERATIONS.ADD_SUBPROCESS: {
                if (!me.shadowNode) {
                    me.shadowNode = Shadows.subProcess(this, null, color)
                }
                break
            }
            //新增ExclusiveGateway
            case OPERATIONS.ADD_EXCLUSIVE_GATEWAY: {
                if (!me.shadowNode) {
                    me.shadowNode = Shadows.exclusiveGateway(this, color)
                }
                break
            }
        }

        if (this.shadowNode) {
            this.shadowNode.cx(e.offsetX).cy(e.offsetY)
            this.drawHorizonLine(this.shadowNode)
            this.drawVerticalLine(this.shadowNode)
            this._validateTargetPosition(this.shadowNode)
        }
    }

    /**
     * 重置操作状态
     * @private
     */
    _resetOperation(cancel) {
        this.hideVerticalLine()
        this.hideHorizonLine()
        if (this.shadowNode) {
            this.shadowNode.remove()
            this.shadowNode = null
        }
        if (this.shadowLine) {
            this.shadowLine.remove()
            this.shadowLine = null
        }

        if (cancel) {
            this.operation = OPERATIONS.NONE
        }

        if (this.operation !== OPERATIONS.DRAWING_CONNECTION && this.operation !== OPERATIONS.PREPARE_DRAW_CONNECTION) {
            this.operation = OPERATIONS.NONE
        }

        this.svgDraw.attr('style', 'cursor:default')
    }


    _bindKeyDown() {
        let me = this
        if (me.readonly) {
            return;
        }
        document.stage = this;
        document.removeEventListener('keydown', this._onKeydown)
        document.addEventListener('keydown', this._onKeydown)
    }

    /**
     * 响应键盘事件
     */
    _onKeydown(e) {
        let me = document.stage //这里的this，指向事件的target对象
        if (!me) {
            return;
        }
        /**
         * 构建一个假的Shadow(没有绘图功能)
         * @param select
         * @param dx
         * @param dy
         * @return {{x(): *, y(): *, id: *, remove: remove, points: ({x, y}[]|*[])}|*}
         */
        const mockShadow = function (select, dx, dy) {
            return {
                x() {
                    return select.box.x + dx
                },
                y() {
                    return select.box.y + dy
                },
                id: select.id,
                points: select.points ? select.points.map(point => {
                    return {x: point.x + dx, y: point.y + dy}
                }) : [],
                remove: function () {
                }
            }
        }

        //me.activeNode = me._getActiveNode();
        let mockShadows = []
        me._getSelections()

        if (e.target !== document.body) {
            return;
        }
        switch (e.key) {
            case 'ArrowLeft': {
                _.each(me.selections, function (select) {
                    mockShadows.push(mockShadow(select, -1, 0))
                })
                break;
            }
            case 'ArrowRight': {
                _.each(me.selections, function (select) {
                    mockShadows.push(mockShadow(select, 1, 0))
                })
                break;
            }
            case 'ArrowUp': {
                _.each(me.selections, function (select) {
                    mockShadows.push(mockShadow(select, 0, -1))
                })
                break;
            }
            case 'ArrowDown': {
                _.each(me.selections, function (select) {
                    mockShadows.push(mockShadow(select, 0, 1))
                })
                break;
            }
            case 'Delete': {
                _.each(me.selections, function (select) {
                    select.remove()
                })
                me.selections = []
                me._hideTools()
                break;
            }
            case 'a': {
                if (e.ctrlKey) {
                    e.preventDefault()
                    e.cancelBubble = true
                    me._selectAll()
                }
                break;
            }
            case 'A': {
                if (e.ctrlKey) {
                    e.preventDefault()
                    e.cancelBubble = true
                    me._selectAll()
                }
                break;
            }
            default: {

            }
        }
        if (mockShadows.length > 0) {
            me._dropSelections(mockShadows)
        }

    }

    _dragStart(e) {
        let me = this;
        if (me._isFlowMoving(e)) {
            return;
        }
        if (e.which === 1) {
            me._selectStart(e)
        } else { //右键点击
            me._resetSelectMode()
        }

    }

    _dragMove(e) {
        let me = this;
        if (me._isFlowMoving(e)) {
            return;
        }
        if (e.which === 1) {
            if (me._hasDragObjects(e)) { //TODO:
                me._moveShadow(e)
            } else if (me.selectMode) { //没有拖动任何元素，则为选择状态，绘制一个虚线框
                this._selecting(e)
            }
        }
    }

    _dragOver(e) {
        let me = this;
        me.dragOver = {
            x: e.offsetX,
            y: e.offsetY
        }
        if (me._isFlowMoving(e)) { //如果连接线节点移动，则跳过
            return;
        }
        if (e.which === 1) {
            if (me._isValidDrag(e) && !me.readonly) { //有效拖动
                //如果有选择的元素，并且有相应的shadow，则移动所有元素到shandow位置
                if (me._hasSelection() && me.shadows.length > 0) { //移动选择的元素
                    me._dropSelections(me.shadows)
                    me.dragNode = null
                    me.shadows = []
                } else if (me.selectMode) { //选择结束
                    me._selectOver(e)
                }
            } else { //无效拖动，相当于点击
                me._resetSelectMode()
                // 执行Stage绑定的元素点击事件
                let selected = me.getSelected(e.offsetX, e.offsetY)
                if (selected) {
                    if (!_.isFunction(this.elementClick)) {
                        return;
                    }
                    this.elementClick(selected, e)
                }
            }
        }
    }

    /**
     * 根据鼠标点击位置，判断元素Active状态
     * @param e
     * @return element or null
     * @private
     */
    _setActive(e) {
        let selected = this.getSelected(e.offsetX, e.offsetY)

        if (selected && selected !== this) {//如果是this，则表示点击了空白地方
            //如果有少于一个的选中对象，则重置选中状态（切换选择的对象）——Bug:点击子流程-拖动-点击子流程节点-拖动（导致子流程移动）
            if (this._getSelections().length <= 1) {
                this._resetSelectMode()
            }

            this.elements.each(function (element) {
                if (element.id !== selected.id) {
                    element.setActive(false)
                }
            })
            selected.svgGroup.remove()
            selected.draw() // Active状态的节点移动到顶层显示
            selected.setActive(true)
            this._showTools(selected)

            return selected
        } else {
            this.elements.each(function (element) {
                element.setActive(false)
            })
            this._hideTools()
            return null
        }
    }

    _selectAll() {
        this.selections = []
        let me = this;
        this.elements.each(function (ele) {
            ele.showOutline()
            me._addSelection(ele)
        })
        this.selectMode = false;
        this.selectStartPoint = {}
    }

    /**
     * 重置选择状态
     * @private
     */
    _resetSelectMode() {
        this.dragStart = {
            x: 0,
            y: 0
        }
        this.prevDragPoint = {}
        this.selectMode = false

        _.each(this.shadows, function (shadow) {
            shadow.remove()
        })
        this.shadows = []

        _.each(this.selections, function (selected) {
            if (!selected.active) {
                selected.hideOutline()
            }
        })
        this.selections = []
        this.dragNode = null
    }

    /**
     * 判断是否正在拖动连接线上的节点
     * @param e
     * @return {number|""|boolean|boolean}
     * @private
     */
    _isFlowMoving(e) {
        return e.target.className.baseVal && e.target.className.baseVal.indexOf('flow_handler') >= 0
    }

    /**
     * 鼠标按下-抬起的距离>1.4则任务是有效拖动
     * @param e
     * @return {boolean}
     * @private
     */
    _isValidDrag(e) {
        if (!this.dragStart) {
            return false
        }

        let dist = Math.sqrt((this.dragStart.x - e.offsetX) * (this.dragStart.x - e.offsetX) + (this.dragStart.y - e.offsetY) * (this.dragStart.y - e.offsetY))

        return dist > 1.4
    }

    /**
     * 开始选择
     */
    _selectStart(e) {
        //拖动起始点
        this.dragStart = {
            x: e.offsetX,
            y: e.offsetY
        }
        if (this._hasDragObjects(e)) { //开始拖动
            //前一次（第一次）鼠标移动的位置
            this.prevDragPoint = {
                x: this.dragStart.x,
                y: this.dragStart.y
            }

            //记录拖动时鼠标和Shape的相对位置
            let hited = false
            let me = this;
            _.each(this.selections, function (selected) {
                //记录鼠标位置和元素左上角的相对坐标
                selected.clickX = e.offsetX - selected.getBox().x
                selected.clickY = e.offsetY - selected.getBox().y
                if (selected instanceof FlowNode && selected.hitTest(e.offsetX, e.offsetY)) { //拖动的时候，鼠标要在选择的元素之上
                    me.dragNode = selected
                    hited = true
                }
            })
            if (!hited) this.dragNode = null; //确保拖动多个节点的时候，鼠标要在其中一个节点之上
        } else { //开始画一个选择的矩形
            if (!this._isFlowMoving(e)) {
                this.selections = []
                this.selectMode = true
                this.selectStartPoint.x = e.offsetX
                this.selectStartPoint.y = e.offsetY
            }
        }
    }

    /**
     * 拖动一个方框，选择元素
     */
    _selecting(e) {
        let me = this;
        if (me.selectMode && me._isValidDrag(e) && !me._isFlowMoving(e)) { //没有拖动任何元素，则为选择状态，绘制一个虚线框
            this.selectFrame = this.svgDraw.findOne('rect.e-select-frame');
            if (this.selectFrame) {
                this.selectFrame.remove();
            }
            let width = Math.abs(e.offsetX - this.selectStartPoint.x)
            let height = Math.abs(e.offsetY - this.selectStartPoint.y)
            if (width > 0 && height > 0) {
                this.selectFrame = this.svgDraw.rect(width, height)
                    .addClass('e-select-frame')
                    .x(Math.min(this.selectStartPoint.x, e.offsetX))
                    .y(Math.min(this.selectStartPoint.y, e.offsetY))
                    .fill({color: COLORS.HIGHLIGHT_COLOR, opacity: 0.1})
                    .stroke({width: 1, dasharray: 3, color: COLORS.HIGHLIGHT_COLOR})
            }
        }
    }

    /**
     * 选择元素结束, 将方框内的元素都选择
     * @param e
     * @private
     */
    _selectOver(e) {
        let me = this;
        if (me._isFlowMoving(e)) {
            return;
        }
        if (me._hasDragObjects(e)) { //清空以前选择的elements
            _.each(this.selections, function (ele) {
                ele.hideOutline()
            })
            this.selections = []
        }
        this.selectFrame = this.svgDraw.findOne('.e-select-frame');
        if (this.selectFrame) {
            let selectBox = {
                x: this.selectFrame.x(),
                y: this.selectFrame.y(),
                width: this.selectFrame.width(),
                height: this.selectFrame.height()
            }
            this.selectFrame.remove();
            this.selectMode = false;
            this.selectStartPoint = {}
            this.elements.each(function (ele) {
                if (me.boxContains(selectBox, ele.getBox())) {
                    ele.showOutline()
                    me._addSelection(ele)
                }
            })
        }
    }

    /**
     * 拖动的过程中，移动选择的element的shadow
     * @private
     */
    _moveShadow(e) {
        let me = this;

        if (!this._hasDragObjects(e)) { //鼠标必须位于某个元素之上才可拖动,如果没有，则重新选择
            me._resetSelectMode()
            me._selectStart(e) //重新划框选择
            return;
        }

        if (me.shadows.length === 0) { //创建shadow
            //根据选择的对象，创建影子节点
            _.each(this.selections, function (selected) {
                if (selected instanceof FlowNode) {
                    selected.setDisabled(true)
                    //所有出口和入口连线置灰
                    _.each(selected.getIncoming(), function (element) {
                        element.setDisabled(true)
                    })
                    _.each(selected.getOutgoing(), function (element) {
                        element.setDisabled(true)
                    })
                }
                //创建Shadow
                let shadow;
                if (selected instanceof SequenceFlow) { //连接线的两端元素都在选中之列，则创建shadow
                    if (me._isInSelection(selected.incoming) && me._isInSelection(selected.outgoing)) {
                        shadow = selected.createShadow();
                    }
                } else {
                    shadow = selected.createShadow();
                }
                if (shadow) {
                    shadow.id = selected.id
                    me.shadows.push(shadow)
                }
                selected.hideOutline()
            })
        }
        //移动shadow
        _.each(me.shadows, function (shadow) {
            let element = me.getById(shadow.id)
            if (element instanceof FlowNode) { //节点移动
                shadow.x(e.offsetX - element.clickX).y(e.offsetY - element.clickY)
                if (me.dragNode && shadow.id === me.dragNode.id) {
                    me.dragNode = shadow
                }

                //移动边界事件，改变目标对象背景色
                if (element instanceof BoundaryEvent && me.shadows.length === 1) {
                    shadow.box = {
                        x: shadow.x(), y: shadow.y(), width: shadow.width(), height: shadow.height()
                    }
                    me.elements.each(function (ele) {
                        if (BoundaryEvent.isValidDock(me, ele, shadow)) {
                            me._setFill(ele, COLORS.ENABLED_COLOR)
                            return false
                        } else {
                            me._resetFill(ele)
                        }
                    })
                }
            } else { //连接线移动
                for (let i = 0; i < shadow.points.length; i++) {
                    shadow.points[i].x += (e.offsetX - me.prevDragPoint.x)
                    shadow.points[i].y += (e.offsetY - me.prevDragPoint.y)
                }
                Shadows.moveSequenceFlow(shadow)
            }
        })
        //更新拖动起始位置
        me.prevDragPoint.x = e.offsetX
        me.prevDragPoint.y = e.offsetY

        if (me.dragNode) {
            me.drawHorizonLine(me.dragNode)
            me.drawVerticalLine(me.dragNode)
        }
        me._hideTools() //拖动的过程中隐藏工具条
    }


    /**
     * 移动选择的元素到指定位置
     * @private
     */
    _dropSelections(shadows) {
        let me = this;
        //先移动移动子流程（否则会导致外部的节点移动到内部）
        _.each(shadows, function (shadow) {
            let element = me.getById(shadow.id)
            if (element instanceof SubProcess) {
                let x = shadow.x()
                let y = shadow.y()
                element.move(x, y)
            }
        })
        //再移动Node
        _.each(shadows, function (shadow) {
            let element = me.getById(shadow.id)
            if (element instanceof FlowNode && !(element instanceof SubProcess)) {
                let x = shadow.x()
                let y = shadow.y()
                element.move(x, y)
                //如果移动的是边界事件，则重置停靠对象颜色（移动的过程中会修改停靠对象背景）
                if (element instanceof BoundaryEvent && element.dockTarget) {
                    me._resetFill(element.dockTarget)
                }
            }
        })

        //恢复
        _.each(shadows, function (shadow) {
            let element = me.getById(shadow.id)
            if (element) {
                element.showOutline()
                element.clickX = 0
                element.clickY = 0
                element.setDisabled(false)
            }
        })
        //清空shadow
        _.each(shadows, function (shadow) {
            shadow.remove()
        })
        //选择的对象及其连接线的disable=false
        _.each(this.selections, function (selected) {
            if (selected instanceof FlowNode) {
                //所有出口和入口连线
                _.each(selected.getIncoming(), function (element) {
                    element.setDisabled(false)
                })
                _.each(selected.getOutgoing(), function (element) {
                    element.setDisabled(false)
                })
            }
            if (selected.active) {
                selected.setActive(true)
                me._showTools(selected)
            }
        })

    }

    /**
     * 判断是否有可以拖动的对象：有选择的对象，并且鼠标按下的位置位于选择对象之一
     * @param e
     * @return {boolean}
     * @private
     */
    _hasDragObjects(e) {
        let me = this
        let drag = false;
        //如果有选择的元素，并且鼠标在其中之一上
        if (this._hasSelection()) {
            _.each(this.selections, function (select) {
                if (select instanceof FlowNode) {
                    if (select.hitTest(me.dragStart.x, me.dragStart.y)) {
                        drag = true
                    }
                }
            })
        }
        return drag
    }

    _addSelection(selected) {
        if (!this.selections) {
            this.selections = [];
        }

        let alreadySelect = false;
        let me = this;
        _.each(this.selections, function (node) {
            if (node.id === selected.id) {
                alreadySelect = true;
            }
        })
        if (!alreadySelect) {
            this.selections.push(selected);
        }

    }

    /**
     * 判断元素是否在同样选中的子流程中
     * @param element
     * @private
     */
    _isSelectedElementInSubprocess(element) {
        if (!element.parent) {
            return false;
        }
        let inProcess = false;
        _.each(this.selections, function (selected) {
            if (selected instanceof SubProcess && element.parent.id === selected.id) {
                inProcess = true;
            }
        })
        return inProcess
    }

    _isInSelection(element) {
        if (!this.selections) {
            return false;
        }
        let inSel = false;
        _.each(this.selections, function (select) {
            if (element.id === select.id) {
                inSel = true;
            }
        })
        return inSel
    }

    _getActiveNode() {
        let activeElement = null;
        this.elements.each(function (element) {
            if (element.active) {
                activeElement = element
            }
        })
        return activeElement
    }

    _getSelections() {
        if (!this.selections) {
            this.selections = [];
        }
        if (this.selections.length === 0) {
            let activeNode = this._getActiveNode()
            if (activeNode) {
                this._addSelection(activeNode)
            }
        }

        return this.selections;
    }

    _hasSelection() {
        this._getSelections();
        return this.selections && this.selections.length > 0
    }


    _showTools(element) {
        if (!element || this.readonly) return;
        let svgTools = SVG(this.floatBarSelector);

        if (!svgTools) {
            return;
        }
        if (element instanceof EndEvent) {
            this._hideTools()
            return
        }

        let tools = svgTools.node;

        if (!tools) {
            return;
        }

        let container = this.getContainer()
        if (element instanceof FlowNode) {
            _.each(tools.childNodes, function (button) {
                if (button.style) {
                    button.style.display = 'block'
                }
            })

            tools.style.display = 'block'
            tools.style.left = element.getBox().x + element.svgGroup.width() + container.offsetLeft + 12 + 'px'
            tools.style.top = element.getBox().y + container.offsetTop + 12 + 'px'
        } else {
            tools.style.display = 'none'
        }

        //子流程中的元素，不可创建子流程
        if (element.parent) {
            _.each(tools.childNodes, function (button) {
                if (_.isFunction(button.getAttribute)) {
                    let className = button.getAttribute('class')
                    if (className.indexOf('icon-subprocess') >= 0) {
                        button.style.display = 'none'
                    }
                }
            })
        }
    }

    _hideTools() {
        let svgTools = SVG(this.floatBarSelector);
        if (!svgTools) {
            return;
        }
        let tools = svgTools.node;
        if (tools) {
            tools.style.display = 'none'
        }
    }


    /**
     * 判断两个矩形是否有交叉
     * @param box1
     * @param box2
     * @return {boolean}
     */
    _boxCrossed(box1, box2) {
        let points = [
            {x: box2.x, y: box2.y},
            {x: box2.x + box2.width, y: box2.y},
            {x: box2.x + box2.width, y: box2.y + box2.height},
            {x: box2.x, y: box2.y + box2.height}
        ]

        let crossed = false
        _.each(points, function (point) {
            if ((point.x >= box1.x && point.x <= box1.x + box1.width && point.y >= box1.y && point.y <= box1.y + box1.height)) {
                crossed = true;
            }
        })
        return crossed;
    };

    boxCrossed(box1, box2) {
        return this._boxCrossed(box1, box2) || this._boxCrossed(box2, box1)
    }

    /**
     * 判断box2是否在box1内部
     * @param box1
     * @param box2
     */
    boxContains(box1, box2) {
        let points = [
            {x: box2.x, y: box2.y},
            {x: box2.x + box2.width, y: box2.y},
            {x: box2.x + box2.width, y: box2.y + box2.height},
            {x: box2.x, y: box2.y + box2.height}
        ]

        let inner = true
        _.each(points, function (point) {
            if (!(point.x >= box1.x && point.x <= box1.x + box1.width && point.y >= box1.y && point.y <= box1.y + box1.height)) {
                inner = false;
            }
        })
        return inner;
    }

    static loadElements(stage, elements) {
        //绘制节点
        let flows = [], nodes = []
        _.each(elements, function(element) {
            let node;
            if (element.stencil.id === STENCIL.userTask) {
                node = stage.addUserTask({
                    id: element.resourceId,
                    name: element.properties.name,
                    x: 0,
                    y: 0
                }).json(element)
            }
            if (element.stencil.id === STENCIL.serviceTask) {
                node = stage.addServiceTask({
                    id: element.resourceId,
                    name: element.properties.name,
                    x: 0,
                    y: 0
                }).json(element)
            }
            if (element.stencil.id === STENCIL.startEvent) {
                node = stage.addStartEvent({
                    id: element.resourceId,
                    name: element.properties.name,
                    cx: 0,
                    cy: 0
                }).json(element)
            }
            if (element.stencil.id === STENCIL.endEvent) {
                node = stage.addEndEvent({
                    id: element.resourceId,
                    name: element.properties.name,
                    cx: 0,
                    cy: 0
                }).json(element)
            }
            if (element.stencil.id === STENCIL.exclusiveGateway) {
                node = stage.addExclusiveGateway({
                    id: element.resourceId,
                    name: element.properties.name,
                    x: 0,
                    y: 0
                }).json(element)
            }
            if (element.stencil.id === STENCIL.boundaryTimerEvent) {
                node = stage.addBoundaryTimerEvent({
                    id: element.resourceId,
                    name: element.properties.name,
                    cx: 0,
                    cy: 0
                }).json(element)
            }
            if(element.stencil.id === STENCIL.subProcess) {
                node = new SubProcess(stage, {
                    id: element.resourceId,
                    name: element.properties.name,
                    x: 0,
                    y: 0
                })
                stage.elements.add(node)
                node.json(element)
            }
            //只要不是连接线，则创建对应的flow
            if (node) {
                nodes.push(node)
                for(let i = 0; i < element.outgoing.length; i++) {
                    let outData = _.find(elements, (x) => x.resourceId === element.outgoing[i].resourceId) //节点出口元素数据
                    if (outData && outData.stencil.id === STENCIL.sequenceFlow) {
                        flows.push({
                            id: element.outgoing[i].resourceId,
                            incoming: node
                        })
                    }
                }
            }
        })
        //绘制连接线
        _.each(flows, function(flow) {
            let flowData = _.find(elements, c => c.resourceId === flow.id) //连接线对应的JSON
            if (flowData && flowData.outgoing) {
                flow.outgoing = stage.getById(flowData.outgoing[0].resourceId) //连接线终点节点
            }
            if (flow.incoming && flow.outgoing) {
                let seqFlow = stage.addSequenceFlow(flow).json(flowData)
                nodes.push(seqFlow)
            }
        })
        return nodes
    }
}

export default Stage