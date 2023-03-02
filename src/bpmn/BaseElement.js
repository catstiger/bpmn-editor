class BaseElement {

    /**
     * “舞台”
     */
    stage = null;

    /**
     * SVG group对象
     */
    svgGroup = null;

    prev = null;

    next = null;

    /**
     * 流程属性
     */
    flowProperties = {
        resourceId: '',
        stencil: {
            id: ''
        },
        properties: {}
    }

    /**
     * Box边界，包括左上角坐标和宽高
     */
    box = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
    }
    /**
     * 子图形，用于subprocess等
     */
    childShapes = []

    /*
     * 是否是活动状态
    */
    active = false

    /**
     * 禁用状态
     */
    disabled = false

    /*
     * 当前颜色
     */
    color = this.DEFAULT_COLOR


    constructor(stage, properties) {
        this.stage = stage
        this.id = properties.id ?? BaseElement._id()
        this.flowProperties = {
            resourceId: this.id,
            stencil: {
                id: properties.type
            },
            properties: {
                name: properties.name
            }
        }
    }

    static _id() {
        /*
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });*/
        return 'node_' + new Date().getTime()
    }

    _getElementType() {
        //class SequenceFlow extends
        let clz = this.constructor.toString();
        let start = clz.indexOf("class ") + 6;
        let end = clz.indexOf(" extends ", start)
        return clz.substr(start, end - start).trim()
    }

    _setSize(properties, width, height) {
        this.box.width = width
        this.box.height = height
        if (properties.x >= 0 && properties.y >= 0) {
            this.box.x = properties.x
            this.box.y = properties.y
            this.box.cx = properties.x + width / 2
            this.box.cy = properties.y + height / 2
        } else if (properties.cx >= 0 && properties.cy >= 0) {
            this.box.cx = properties.cx
            this.box.cy = properties.cy
            this.box.x = properties.cx - width / 2
            this.box.y = properties.cy - height / 2
        } else {
            throw '缺少坐标'
        }
    }

    /**
     * 转换为BPMNJson
     */
    json() {
        throw '未实现toJson方法'
    }

    /**
     * 检验是否命中当前元素
     */
    hitTest(x, y) {
        return (x >= this.box.x && x <= this.box.x + this.box.width &&
            y >= this.box.y && y <= this.box.y + this.box.height);
    }

    /**
     * 点击事件
     * @param e
     * @param target
     */
    onClick(e, target) {
    }

    /**
     * 鼠标移动事件
     * @param e
     * @param target
     */
    onMouseMove(e, target) {
    }

    /**
     * 鼠标双击事件
     * @param e
     * @param target
     */
    onDblClick(e, target) {

    }

    onMouseDown(e, target) {

    }

    onMouseUp(e, target) {

    }

    /**
     * 根据鼠标是否在上面,确定Element状态
     * @param isOver
     */
    mouseOver(isOver) {

    }

    /*
    * 绘制元素
    */
    draw() {
        return this;
    }

    /**
     * 设置节点文本
     */
    setText(parent, text, color) {
        this.flowProperties.properties.name = text
    }

    /**
     * 当通过双击修改name的时候，调用本方法，通知外部处理机制
     * @param text
     */
    onTextChange(text) {

    }

    /**
     * 设置节点颜色
     */
    setColor(color) {
    }

    /**
     * 节点设置为禁用或者启用状态
     */
    setDisabled(disabled) {
        this.disabled = disabled
    }

    /**
     * 节点设置为活动状态
     */
    setActive(active) {
        this.active = active
    }

    /**
     * 返回Shape中心文字
     */
    getCenter() {
        return {
            x: this.box.x + this.box.width / 2,
            y: this.box.y + this.box.height / 2,
        }
    }

    remove() {

    }

    /**
     * 移动节点
     */
    move(x, y) {
    }

    /**
     * 创建拖动的Shadow
     */
    createShadow() {

    }

    /**
     * 删除拖动Shadow
     */
    deleteShadow() {

    }

    /**
     * 计算给定点和Element中心连线连线与Element边界的交叉点
     * @param point
     */
    getJoinPoint(point) {

    }

    getBox() {
        return this.box;
    }

    getBounds() {
        return {
            upperLeft: {
                x: this.box.x,
                y: this.box.y
            },
            lowerRight: {
                x: this.box.x + this.box.width,
                y: this.box.y + this.box.height
            }
        }
    }

    /**
     * 是否可以作为连接线的起点
     * @return {boolean}
     */
    isIncoming() {
        return true;
    }

    /**
     * 是否可以作为连接线的终点
     * @return {boolean}
     */
    isOutgoing() {
        return true;
    }

    /**
     * 计算两条直线的交叉点
     * @param p1 第一条直线起点
     * @param p2 第一条直线终点
     * @param p3 第二条直线起点
     * @param p4 第二条直线终点
     */
    _calcCross(p1, p2, p3, p4) {
        if (p1.x - p2.x === 0 && p3.x - p4.x === 0) { //都垂直
            return null;
        }
        if (p1.y - p2.y === 0 && p3.y - p4.y === 0) { //都水平
            return null;
        }
        let x, y;

        let b1 = (p2.y * p1.x - p1.y * p2.x) / (p1.x - p2.x); //截距1
        let k1 = (p2.y - b1) / p2.x; //斜率1
        let b2 = (p4.y * p3.x - p3.y * p4.x) / (p3.x - p4.x); //截距2
        let k2 = (p4.y - b2) / p4.x; //斜率2
        if (p1.x === p2.x) {
            x = p1.x;
            y = k2 * x + b2;
        } else if (p3.x === p4.x) {
            x = p3.x;
            y = k1 * x + b1;
        } else {
            x = (b2 - b1) / (k1 - k2);
            y = k1 * x + b1;
        }

        return {x: x, y: y};
    }

    /**
     * 计算垂足的坐标
     * @param point 参考点
     * @param startPoint 直线起点
     * @param endPoint 直线终点
     */
    _calcPedal(point, startPoint, endPoint) {
        if (startPoint.x === endPoint.x) { //垂直
            return {
                x: startPoint.x,
                y: point.y
            }
        } else if (startPoint.y === endPoint.y) { //水平
            return {
                x: point.x,
                y: startPoint.y
            }
        } else {
            let k = Math.abs((startPoint.y - endPoint.y) / (startPoint.x - endPoint.x))
            let k2 = -1 / k//参考点到直线的垂线的斜率-1/k === Math.tan(Math.atan(k) + Math.PI / 2)
            let b = point.y - k2 * point.x; //截距y=k2*x+a
            let p2 = {//参考线上随便一个点
                x: point.x + 100,
                y: k2 * (point.x + 100) + b
            }
            return this._calcCross(point, p2, startPoint, endPoint)
        }
    }

}


export default BaseElement