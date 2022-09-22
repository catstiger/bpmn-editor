import FlowElement from "./FlowElement";
import _ from "underscore"
import "@svgdotjs/svg.draggable.js"
import {COLORS, CONSTANTS, OPERATIONS, STENCIL} from "./Constants";
import Shadows from "./Shadows";

class SequenceFlow extends FlowElement {
    constructor(stage, properties) {
        properties.type = STENCIL.sequenceFlow
        super(stage, properties)

        this.incoming = properties.incoming
        this.outgoing = properties.outgoing
        this.flowProperties.outgoing = [{
            resourceId: properties.outgoing.resourceId
        }]
        //入口端的Element加入一个goutgoing
        this.incoming.addOutgoing(this)
        //出口端的element加入一个incoming
        this.outgoing.addIncoming(this)

        this.points = []
    }

    draw() {
        this._calcDestinations();
        if (this.path) {
            this.path.remove();
            this.path = null
        }
        if (this.svgGroup) {
            this.svgGroup.remove()
            this.svgGroup = null
        }

        this.svgGroup = this.stage.getSvgDraw().group();
        this.svgGroup.attr('id', this.flowProperties.resourceId)
        this.svgGroup.group().addClass('e-shape')
        let color = this.color ? this.color : COLORS.DEFAULT_COLOR
        this._drawPath(color)
        //绘制箭头
        this.endMarker = this._addEndMarker(this.path, color)
        //计算曲线范围并添加outline
        this.updateBox();
        this.setText(this.svgGroup, this.flowProperties.properties.name, color)

        return this
    }

    /**
     * 重新计算各个点，重新绘制连线
     */
    redrawPath() {
        this._calcDestinations()
        this._join()
        let color = this.color ? this.color : COLORS.DEFAULT_COLOR
        this._drawPath(color)
        this.redrawText()
    }

    setActive(active) {
        super.setActive(active);

        if (active) {
            this.setColor(COLORS.HIGHLIGHT_COLOR)
            if (!this.stage.readonly) {
                this._showHandler()
            }

        } else {
            this.setColor(COLORS.DEFAULT_COLOR)
            if (!this.stage.readonly) {
                this._hideHandler()
            }
        }
    }

    setColor(color) {
        this.color = color ? color : COLORS.DEFAULT_COLOR
        this.svgGroup.find('path').stroke({
            width: 1,
            color: this.color
        })
        this.endMarker.findOne('path').stroke({color: this.color}).fill(this.color)
        let svgText = this.svgGroup.find('text.e-text')
        if (svgText) {
            svgText.fill(this.color)
        }
    }

    eachPoint(fn) {
        if (_.isFunction(fn)) {
            _.each(this.points, function (point, index, points) {
                fn.call(this, point, index, points);
            })
        }
    }

    hitTest(x, y) {
        for (let i = 0; i < this.points.length - 1; i++) {
            let len;
            let x1 = this.points[i].x > this.points[i + 1].x ? this.points[i + 1].x : this.points[i].x;
            let x2 = this.points[i].x > this.points[i + 1].x ? this.points[i].x : this.points[i + 1].x;
            let y1 = this.points[i].y > this.points[i + 1].y ? this.points[i + 1].y : this.points[i].y;
            let y2 = this.points[i].y > this.points[i + 1].y ? this.points[i].y : this.points[i + 1].y;
            let k = (this.points[i].x - this.points[i + 1].x) / (this.points[i].y - this.points[i + 1].y); //斜率

            if (x1 === x2) { //垂直线段
                len = x - x1;
            } else if (y1 === y2) { //水平线段
                len = y - y1;
            } else {
                let xa = k * (y - this.points[i].y) + this.points[i].x; //计算以点击位置Y坐标为基准，直线上X坐标值
                let ya = (1 / k) * (x - this.points[i].x) + this.points[i].y; //计算以点击位置X坐标为基准，直线上Y坐标
                let ra1 = Math.abs(Math.abs(xa) - x); //X轴方向，点击位置和直线的距离
                let ra2 = Math.abs(Math.abs(ya) - y); //Y轴方向，点击位置和直线的距离
                let side = Math.sqrt(ra1 * ra1 + ra2 * ra2); //斜边长度
                let area = ra1 * ra2; //面积
                len = area / side; //三角形高度（以斜边为底）即是点到直线的距离
            }
            let dist = 20; //点击位置距离直线10像素，则认为直线被选中
            let blur = 10; //既要确保点击位置在线段范围内部，又要有一点模糊
            if (_.isNaN(len) || Math.abs(len) < dist) {
                if ((x >= x1 - blur && x <= x2 + blur) && (y >= y1 - blur && y <= y2 + blur)) {
                    return true;
                }
            }
        }

        return false;
    }


    onMouseDown(e, target) {
        let active = this.hitTest(e.offsetX, e.offsetY);
        this.setActive(active)
        return active
    }

    onMouseMove(e, target) {
        let hit = this.hitTest(e.offsetX, e.offsetY);
        if (this.disabled) {
            return;
        }
        this.mouseOver(hit)
        return hit
    }

    mouseOver(isOver) {
        if (isOver) {
            this.setColor(COLORS.HIGHLIGHT_COLOR)
        } else {
            if (!this.active) {
                this.setColor(COLORS.DEFAULT_COLOR)
            }
        }

    }

    onDblClick(e, target) {
        let hit = this.hitTest(e.offsetX, e.offsetY);
        if (this.disabled) {
            return;
        }
        if (hit) {
            this.beforeEditText(e)
        }
        return hit;
    }

    setDisabled(disabled) {
        super.setDisabled(disabled);
        if (disabled) {
            this.setColor(COLORS.DISABLED_COLOR)
        } else {
            this.setColor(COLORS.DEFAULT_COLOR)
        }

    }

    showOutline() {
        this.updateBox()
    }

    hideOutline() {
    }

    updateBox() {
        let len = this.points.length
        if (len === 0) {
            return
        }
        let sortedX = _.sortBy(this.points, 'x')
        let sortedY = _.sortBy(this.points, 'y')
        this.box = {
            x: sortedX[0].x,
            y: sortedY[0].y,
            width: Math.abs(sortedX[len - 1].x - sortedX[0].x),
            height: Math.abs(sortedY[len - 1].y - sortedY[0].y)
        }
        return this.box;
    }


    /**
     * 重画Text，使用name作为text，svgGroup作为容器，当前color作为color
     * @private
     */
    redrawText() {
        let color = this.color ? this.color : COLORS.DEFAULT_COLOR
        this.setText(this.svgGroup, this.flowProperties.properties.name, color)
    }


    setText(parent, text, color) {
        if (!text) {
            return
        }
        this.flowProperties.properties.name = text
        if (!parent) {
            parent = this.svgGroup;
        }
        let svgText = parent.findOne('text.e-text')
        if (svgText) {
            svgText.remove()
        }

        svgText = parent.text(text)
            .addClass('e-text')
            .font({
                'font-size': '12px',
                'weight': 'normal',
                'leading': '1.5em',
                'text-anchor': 'middle',
                'pointer-events': 'none'
            })
            .fill(color ? color : COLORS.DEFAULT_COLOR)


        let point = this.getSequenceFlowTextPoint(text)
        svgText.x(point.x).y(point.y)

        if (!this.text) {
            this.text = svgText
        }
    }

    /**
     * 平移，参数给出的是新位置的第一个点的坐标
     * @param x 第一个点的X坐标
     * @param y 第一个点的Y坐标
     */
    move(x, y) {
        const deltaX = x - this.points[0].x
        const deltaY = y - this.points[0].y

        for (let j = 1; j < this.points.length - 1; j++) {
            this.points[j].x += deltaX
            this.points[j].y += deltaY
        }
        this._calcDestinations()
        this._drawPath(COLORS.DEFAULT_COLOR)
        this.redrawText()
    }

    isIncoming() {
        return false
    }

    isOutgoing() {
        return false
    }

    remove() {
        this.incoming.removeOutgoing(this) //删除起点中的引用
        this.outgoing.removeIncoming(this) //删除终点中的引用
        this.svgGroup.remove()
        this.stage.elements.remove(this)
    }

    createShadow() {
        let points = []
        //如果位于选中的子流程之内，则使用clone的points，防止两次移动节点
        if (this.stage._isSelectedElementInSubprocess(this)) {
            points = this.points.map(i => {
                return {x: i.x, y: i.y}
            })

        } else {
            points = this.points //shadow引用节点，这样shadow移动，节点也移动
        }

        return Shadows.sequenceFlow(this.stage, points, COLORS.HIGHLIGHT_COLOR)
    }

    _calcPath() {
        const r = CONSTANTS.BORDER_RADIUS
        let path = 'm ' + this.points[0].x + ',' + this.points[0].y
        let length = this.points.length

        for (let i = 1; i < length - 1; i++) {
            //计算当前线段曲线部分的起点
            let x1 = this.points[i - 1].x;
            let y1 = this.points[i - 1].y;
            let x2 = this.points[i].x;
            let y2 = this.points[i].y;

            let k = (y2 - y1) / (x2 - x1);
            let angle = Math.atan(k);
            let dx = Math.cos(angle) * r;
            let dy = Math.sin(angle) * r;
            let p = 1;
            if (x1 > x2) p = -1;

            let x = this.points[i].x - p * dx;
            let y = this.points[i].y - p * dy;
            //绘制线段
            path += ('L' + x + ',' + y + ' ')
            //根据下一个线段，计算曲线的终点
            x1 = this.points[i].x;
            y1 = this.points[i].y;
            x2 = this.points[i + 1].x;
            y2 = this.points[i + 1].y;

            k = (y2 - y1) / (x2 - x1);
            angle = Math.atan(k);
            dx = Math.cos(angle) * r;
            dy = Math.sin(angle) * r;
            p = 1;
            if (x1 > x2) p = -1;

            let ex = this.points[i].x + p * dx;
            let ey = this.points[i].y + p * dy;
            //绘制曲线
            //this.painter._addAction([ "bezierCurveTo", x, y, x1, y1, ex, ey ]);
            path += ('C' + x + ' ' + y + ',' + x1 + ' ' + y1 + ',' + ex + ' ' + ey)
        }
        path += ('L' + this.points[length - 1].x + ',' + this.points[length - 1].y + ' ')
        return path
    }

    /**
     * 重新绘制连接线
     * @param color 颜色
     * @private
     */
    _drawPath(color) {
        /*
        let d = 'm ' + this.points[0].x + ',' + this.points[0].y
        for (let i = 1; i < this.points.length; i++) {
            d += ('L' + this.points[i].x + ',' + this.points[i].y + ' ')
        }*/
        let d = this._calcPath()
        if (!this.path) {
            this.path = this.svgGroup.findOne('.e-shape').path(d)
        } else {
            this.path.plot(d)
        }

        this.path.stroke({
            width: 1,
            color: color
        }).fill('none')
    }

    /**
     * 绘制两端的Handler，两端的Handler用于拖动path，重新设定起点或者终点
     * @private
     */
    _drawEndHandler() {
        let me = this;
        //终点Handler
        let endHandler = this.svgGroup.findOne('circle.e-end-handler')
        if (endHandler) {
            endHandler.remove()
        }
        //终点Handler
        endHandler = this.svgGroup.circle(10).fill({color: '#fff', opacity: 0.3}).stroke(COLORS.HIGHLIGHT_COLOR)
            .addClass('e-end-handler')
            .cx(this.points[this.points.length - 1].x)
            .cy(this.points[this.points.length - 1].y)
            .on('mousedown', function (e) {
                e.cancelBubble = true
            })
            .on('mousemove', function (e) {
                e.cancelBubble = true
            })
            .draggable()
            .on('dragstart', function (e) {

            })
            .on('dragmove', function (e) {
                let x = e.detail.event.offsetX
                let y = e.detail.event.offsetY
                me.points[me.points.length - 1].x = x
                me.points[me.points.length - 1].y = y
                //如果只有两个端点，则需要重新计算起点的位置
                // 因为起点的位置取决于终点和incoming中心的连接线与incoming边框的交叉点
                if (me.points.length === 2) {
                    me.points[0] = me.incoming.getJoinPoint(me.points[me.points.length - 1])
                    let startHandler = me.svgGroup.findOne('circle.e-start-handler')
                    if (startHandler) {
                        startHandler.cx(me.points[0].x).cy(me.points[0].y)
                    }
                }
                me._drawPath(COLORS.HIGHLIGHT_COLOR)
                me._drawMiddleHandlers()
                me.stage.operation = OPERATIONS.CHANGING_CONNECTION_END
                me.stage.incomingNode = me.incoming
                me.stage._changeElementStatusOnMoving(e.detail.event)
            })
            .on('dragend', function (e) {
                e.cancelBubble = true
                me.stage._resetOperation(true)
                let element = me.stage.getSelectedNode(e.detail.event.offsetX, e.detail.event.offsetY)
                if (element && element.isOutgoing()) {
                    me.outgoing.removeIncoming(me, true) //删除终点中的引用
                    me.outgoing = element
                    me.outgoing.addIncoming(me)
                    me.stage._resetFill(element)
                    me.redrawPath()
                    me._drawMiddleHandlers()
                    me._drawEndHandler()
                } else {
                    me.redrawPath()
                }
            })

        //起点Handler
        let startHandler = this.svgGroup.findOne('circle.e-start-handler')
        if (startHandler) {
            startHandler.remove()
        }
        startHandler = this.svgGroup.circle(10).fill({color: '#fff', opacity: 0.3}).stroke(COLORS.HIGHLIGHT_COLOR)
            .addClass('e-start-handler')
            .cx(this.points[0].x)
            .cy(this.points[0].y)
            .on('mousedown', function (e) {
                e.cancelBubble = true
            })
            .on('mousemove', function (e) {
                e.cancelBubble = true
            })
            .draggable()
            .on('dragstart', function (e) {

            })
            .on('dragmove', function (e) {
                let x = e.detail.event.offsetX
                let y = e.detail.event.offsetY
                me.points[0].x = x
                me.points[0].y = y
                //如果只有两个端点，则需要重新计算终点的位置
                //因为终点的位置取决于起点和outgoing中心的连接线与outgoing边框的交叉点
                if (me.points.length === 2) {
                    me.points[1] = me.outgoing.getJoinPoint(me.points[0])
                    let endHandler = me.svgGroup.findOne('circle.e-end-handler')
                    if (endHandler) {
                        endHandler.cx(me.points[1].x).cy(me.points[1].y)
                    }
                }
                me._drawPath(COLORS.HIGHLIGHT_COLOR)
                me._drawMiddleHandlers()
                me.stage.operation = OPERATIONS.CHANGING_CONNECTION_START
                me.stage._changeElementStatusOnMoving(e.detail.event)
            })
            .on('dragend', function (e) {
                e.cancelBubble = true
                me.stage._resetOperation(true)
                let element = me.stage.getSelectedNode(e.detail.event.offsetX, e.detail.event.offsetY)
                if (element && element.isIncoming()) {
                    me.incoming.removeOutgoing(me, true) //删除起点中的引用
                    me.incoming = element
                    me.incoming.addOutgoing(me)
                    me.stage._resetFill(element)
                    me.redrawPath()
                    me._drawMiddleHandlers()
                    me._drawEndHandler()
                } else {
                    me.redrawPath()
                }

            })
    }

    /**
     * 在各个点上绘制一个Handler，拖动handler可以调整该点的位置
     * @private
     */
    _drawPointHandlers() {
        let me = this;
        if (this.pointHandlers) {
            _.each(this.pointHandlers, function (handler) {
                handler.remove()
            })
        }
        this.pointHandlers = []
        for (let i = 1; i < this.points.length - 1; i++) {
            let handler = this.svgGroup.circle(8)
                .fill({
                    //color: COLORS.HIGHLIGHT_COLOR, opacity: 0.3
                    color: '#fff', opacity: 0.3
                })
                .stroke({
                    width: 1, color: COLORS.HIGHLIGHT_COLOR
                })
                .cx(this.points[i].x)
                .cy(this.points[i].y)
                .addClass('flow_handler')

            this.pointHandlers.push(handler)

            handler.on('mousedown', function (e) {
                e.cancelBubble = true
            })
            handler.on('mousemove', function (e) {
                e.cancelBubble = true
            })

            handler.draggable()
                .on('dragstart', function (e) {
                    handler.index = i
                })
                .on('dragmove', function (e) {
                    me.points[handler.index].x = e.detail.event.offsetX
                    me.points[handler.index].y = e.detail.event.offsetY
                    me._calcDestinations()
                    me._drawPath(me.active ? COLORS.HIGHLIGHT_COLOR : COLORS.DEFAULT_COLOR)
                    me._drawEndHandler()
                    me._drawMiddleHandlers()
                    me.stage._hideTools()
                })
                .on('dragend', function (e) {
                    e.cancelBubble = true
                    me._join()
                    me._drawPath(me.active ? COLORS.HIGHLIGHT_COLOR : COLORS.DEFAULT_COLOR)
                    me._showHandler()
                    me.redrawText()
                    me.stage._showTools(me)
                })
        }
    }

    /**
     * 在点与点的中点绘制一个handler，拖动handler可以增加一个点，并调整位置
     * @private
     */
    _drawMiddleHandlers() {
        let me = this
        let middles = this._calcMiddle()
        if (this.middleHandlers) {
            _.each(this.middleHandlers, function (handler) {
                handler.remove()
            })
        }
        this.middleHandlers = []
        for (let i = 0; i < middles.length; i++) {
            let handler = this.svgGroup.circle(6)
                .fill({
                    //color: COLORS.HIGHLIGHT_COLOR, opacity: 0.3
                    color: '#fff', opacity: 0.3
                })
                .stroke({
                    width: 1, color: COLORS.HIGHLIGHT_COLOR
                })
                .cx(middles[i].x).cy(middles[i].y)
                .addClass('flow_handler')

            this.middleHandlers.push(handler)

            handler.on('mousedown', function (e) {
                e.cancelBubble = true
            })
            handler.on('mousemove', function (e) {
                e.cancelBubble = true
            })

            handler.draggable()
                .on('dragstart', function (e) {
                    handler.index = me._insertPoint(e.detail.event.offsetX, e.detail.event.offsetY, middles[i].after)
                })
                .on('dragmove', function (e) {
                    me.points[handler.index].x = e.detail.event.offsetX
                    me.points[handler.index].y = e.detail.event.offsetY
                    me._calcDestinations()
                    me._drawPath(me.active ? COLORS.HIGHLIGHT_COLOR : COLORS.DEFAULT_COLOR)
                    me._drawEndHandler()
                    me.stage._hideTools()
                })
                .on('dragend', function (e) {
                    e.cancelBubble = true
                    me._join()
                    me._drawPath(me.active ? COLORS.HIGHLIGHT_COLOR : COLORS.DEFAULT_COLOR)
                    me._showHandler()
                    me.redrawText()
                    me.stage._showTools(me)
                })

        }
    }

    _showHandler() {
        let me = this
        me._drawMiddleHandlers()
        me._drawPointHandlers()
        me._drawEndHandler()
    }

    _hideHandler() {
        if (this.middleHandlers) {
            _.each(this.middleHandlers, function (handler) {
                handler.remove()
            })
            this.middleHandlers = []
        }

        if (this.pointHandlers) {
            _.each(this.pointHandlers, function (handler) {
                handler.remove()
            })
            this.pointHandlers = []
        }

        let endHandler = this.svgGroup.findOne('circle.e-end-handler')
        if (endHandler) {
            endHandler.remove()
        }

        let startHandler = this.svgGroup.findOne('circle.e-start-handler')
        if (startHandler) {
            startHandler.remove()
        }
    }

    _insertPoint(x, y, after) {
        let ps = []
        for (let i = 0; i < this.points.length; i++) {
            ps.push(this.points[i])
            if (i === after) {
                ps.push({x: x, y: y})
            }
        }
        this.points = ps
        return after + 1
    }

    _addOutline() {
        return this.svgGroup.rect(this.box.width + 12, this.box.height + 12)
            .addClass('e-outline')
            .x(this.box.x - 6)
            .y(this.box.y - 6)
            .fill('none')
    }

    _addEndMarker(path, color) {
        path.marker('end', 20, 20, function (add) {
            add.path("M 1 5 L 11 10 L 1 15 Z")
                .fill(color)
                .stroke({
                    width: 1,
                    linecap: 'round',
                    dasharray: 10000,
                    color: color
                })
        })

        let marker = path.reference('marker-end')
        marker.size(10, 10)
        marker.ref(11, 10)
        return marker
    }

    _delPoint(index) {
        var pos = [];
        for (let i = 0; i < this.points.length; i++) {
            if (i !== index) {
                pos.push(this.points[i]);
            }
        }
        this.points = pos;
    }

    /**
     * 计算相邻两条直线的夹角，如果小于一定范围，则合并为一条直线
     * 如果直线接近水平或者垂直，则调整为水平或者垂直
     * @private
     */
    _join() {
        //水平或者垂直
        for (let i = 0; i < this.points.length - 1; i++) {
            let k = (this.points[i].y - this.points[i + 1].y) / (this.points[i].x - this.points[i + 1].x);
            let angle = Math.abs(Math.atan(k)) * 180 / Math.PI //换算成角度数
            //只有两个节点，不做处理
            if (i === 0 && i + 1 === this.points.length - 1) {
                break;
            }
            let indexTarget, indexValue;
            if (i === 0) {
                indexTarget = i + 1
                indexValue = 0
            } else {
                indexTarget = i
                indexValue = i + 1
            }

            if (angle <= 8) {
                this.points[indexTarget].y = this.points[indexValue].y
            } else if (angle >= 82) {
                this.points[indexTarget].x = this.points[indexValue].x
            }
        }
        //夹角
        for (let i = 1; i < this.points.length - 1; i++) {
            let k1 = (this.points[i - 1].y - this.points[i].y) / (this.points[i - 1].x - this.points[i].x);
            let k2 = (this.points[i].y - this.points[i + 1].y) / (this.points[i].x - this.points[i + 1].x);

            let angle = Math.abs(Math.abs(Math.atan(k1)) - Math.abs(Math.atan(k2))) * 180 / Math.PI

            //如果前后两条线的夹角较小，则合成一个线段
            if (k1 === k2 || (_.isNaN(k1) && _.isNaN(k2) || Math.abs(k1 - k2) < 0.3)) {
                this._delPoint(i);
                this._calcMiddle();//重新计算中点
                this._join();
                break;
            }
        }
    };

    _addStartMarker(path, color) {

    }

    /**
     * 计算起点和终点的坐标
     */
    _calcDestinations() {
        if (!this.incoming || !this.outgoing) {
            return;
        }
        //自己连接自己
        if (this.incoming.flowProperties.resourceId === this.outgoing.flowProperties.resourceId) {
            this.points = [];
            this.points.push({x: this.incoming.box.x + this.incoming.box.width / 2, y: this.incoming.box.y});
            this.points.push({x: this.incoming.box.x + this.incoming.box.width / 2, y: this.incoming.box.y - 20});
            this.points.push({x: this.incoming.box.x + this.incoming.box.width + 20, y: this.incoming.box.y - 20});
            this.points.push({
                x: this.incoming.box.x + this.incoming.box.width + 20,
                y: this.incoming.box.y + this.incoming.box.height / 2
            });
            this.points.push({
                x: this.incoming.box.x + this.incoming.box.width,
                y: this.incoming.box.y + this.incoming.box.height / 2
            });

            return;
        }

        //给出初始点
        if (this.points.length === 0) {
            this.points.push({x: 0, y: 0});
            this.points.push({x: 0, y: 0});
        }
        //计算第一个点和最后一个点
        let refStart, refEnd
        if (this.points.length === 2) { //如果只有两个点，则参考点为两个端节点的中心点
            refStart = {x: this.outgoing.getCenter().x, y: this.outgoing.getCenter().y}
            refEnd = {x: this.incoming.getCenter().x, y: this.incoming.getCenter().y}
        } else {//如果超过两个点，则参考点为两个端点相邻的点
            refStart = this.points[1]
            refEnd = this.points[this.points.length - 2]
        }

        let crossStart = this.incoming.getJoinPoint(refStart)// this._calcHit(refStart, this.incoming.box);
        let crossEnd = this.outgoing.getJoinPoint(refEnd)// this._calcHit(refEnd, this.outgoing.box);
        //console.log(crossStart, crossEnd)

        if (crossStart) this.points[0] = crossStart;
        if (crossEnd) this.points[this.points.length - 1] = crossEnd;
    }

    /**
     * 计算中间点坐标
     */
    _calcMiddle = function () {
        this.middlePoints = [];
        //计算各个线段的中间点坐标
        for (let i = 0; i < this.points.length - 1; i++) {
            let mx = (this.points[i + 1].x - this.points[i].x) / 2;
            let my = (this.points[i + 1].y - this.points[i].y) / 2;
            this.middlePoints.push({x: this.points[i].x + mx, y: this.points[i].y + my, after: i});
        }
        return this.middlePoints
    }

    _addPoint(x, y) {
        this.points({
            x: x,
            y: y
        })
    }

    getBounds() {
        if (_.isEmpty(this.points)) {
            throw '连接线错误'
        }
        return {
            lowerRight: {
                x: _.max(this.points, function (p) {
                    return p.x
                }).x,
                y: _.max(this.points, function (p) {
                    return p.y
                }).y,
            },
            upperLeft: {
                x: _.min(this.points, function (p) {
                    return p.x
                }).x,
                y: _.min(this.points, function (p) {
                    return p.y
                }).y,
            }
        };
    }

    getBox() {
        let x = _.min(this.points.map(i => {
            return i.x
        }))
        let width = _.max(this.points.map(i => {
            return i.x
        })) - x
        let y = _.min(this.points.map(i => {
            return i.y
        }))
        let height = _.max(this.points.map(i => {
            return i.y
        })) - y
        return {
            x: x, y: y, width: width, height: height
        }
    }

    json(jsonData) {
        return jsonData ? this._setJson(jsonData) : this._getJson()
    }

    _setJson(json) {
        this.flowProperties.resourceId = json.resourceId
        this.flowProperties.properties = json.properties
        this.id = json.resourceId
        if (json.dockers.length > 2) {
            let points = []
            points.push(this.points[0])
            for (let i = 1; i < json.dockers.length - 1; i++) {
                points.push(json.dockers[i])
            }
            points.push(this.points[this.points.length - 1]);
            this.points = points
        }

        this._calcDestinations()
        this._drawPath(COLORS.DEFAULT_COLOR)
        this.redrawText()

        return this;
    }


    _getJson() {
        let dockers = [];
        for (let i = 0; i < this.points.length; i++) {
            if (i === 0) {
                dockers.push({
                    x: this.incoming.box.width / 2,
                    y: this.incoming.box.height / 2
                });
            } else if (i === this.points.length - 1) {
                dockers.push({
                    x: this.outgoing.box.width / 2,
                    y: this.outgoing.box.height / 2
                });
            } else {
                dockers.push(this.points[i]);
            }
        }

        let json = {
            bounds: this.getBounds(),
            childShapes: [],
            dockers: dockers,
            outgoing: [{resourceId: this.outgoing.flowProperties.resourceId}],
            target: {resourceId: this.outgoing.flowProperties.resourceId},
            properties: {
                conditionalflow: "None",
                conditionsequenceflow: "",
                defaultflow: "None",
                documentation: "",
                name: this.flowProperties.properties.name,
                overrideid: "",
                probability: "",
                executionlisteners: {
                    executionListeners: []
                }
            },
            resourceId: this.flowProperties.resourceId,
            stencil: {id: this.flowProperties.stencil.id}
        }
        //合并属性：把节点属性完整的按照activity格式返回
        let keys = _.keys(this.flowProperties.properties)
        let me = this;
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
        this.setActive(this.active)
    }


}

export default SequenceFlow