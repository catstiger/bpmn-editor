import {COLORS, CONSTANTS, STENCIL} from "./Constants";

class Shadows {

    static userTask(stage, userTask, color) {
        let group = Shadows._createGroup(stage)
        color = color ? color : COLORS.HIGHLIGHT_COLOR
        let width = userTask ? userTask.getBox().width : CONSTANTS.DEFAULT_WIDTH
        let height = userTask ? userTask.getBox().height : CONSTANTS.DEFAULT_HEIGHT;

        group.rect(width, height)
            .addClass('e-frame')
            .x(0)
            .y(0)
            .stroke({width: 1, color: color})
            .radius(CONSTANTS.BORDER_RADIUS)
            .fill({color: '#fff', opacity: 0})
        Shadows._userIcon(group, color)

        let name = userTask ? userTask.flowProperties.properties.name : ''
        if (name && name.trim()) {
            group.text(name).font({
                'font-size': '12px',
                'weight': 'normal',
                'leading': '1.5em',
                'text-anchor': 'middle',
                'pointer-events': 'none'
            }).fill(color).cx(group.width() / 2 - 12).cy(group.height() / 2 - 6)
        }
        group.stencil = STENCIL.userTask
        return group
    }

    static serviceTask(stage, userTask, color) {
        let group = Shadows._createGroup(stage)
        color = color ? color : COLORS.HIGHLIGHT_COLOR
        let width = userTask ? userTask.getBox().width : CONSTANTS.DEFAULT_WIDTH
        let height = userTask ? userTask.getBox().height : CONSTANTS.DEFAULT_HEIGHT;

        group.rect(width, height)
            .addClass('e-frame')
            .x(0)
            .y(0)
            .stroke({width: 1, color: color})
            .radius(CONSTANTS.BORDER_RADIUS)
            .fill({color: '#fff', opacity: 0})
        Shadows._serviceIcon(group, color)

        let name = userTask ? userTask.flowProperties.properties.name : ''
        if (name && name.trim()) {
            group.text(name).font({
                'font-size': '12px',
                'weight': 'normal',
                'leading': '1.5em',
                'text-anchor': 'middle',
                'pointer-events': 'none'
            }).fill(color).cx(group.width() / 2 - 12).cy(group.height() / 2 - 6)
        }
        group.stencil = STENCIL.serviceTask
        return group
    }


    static subProcess(stage, subProcess, color) {
        let group = Shadows._createGroup(stage)
        color = color ? color : COLORS.HIGHLIGHT_COLOR
        let width = subProcess ? subProcess.getBox().width : CONSTANTS.DEFAULT_SUBPROCESS_WIDTH
        let height = subProcess ? subProcess.getBox().height : CONSTANTS.DEFAULT_SUBPROCESS_HEIGHT

        group.rect(width, height)
            .addClass('e-frame')
            .x(0)
            .y(0)
            .stroke({width: 1, color: color})
            .radius(CONSTANTS.BORDER_RADIUS)
            .fill({color: '#fff', opacity: 0})

        let name = subProcess ? subProcess.flowProperties.properties.name : '子流程'
        if (name && name.trim()) {
            group.text(name).font({
                'font-size': '12px',
                'weight': 'normal',
                'leading': '1.5em',
                'text-anchor': 'middle',
                'pointer-events': 'none'
            }).fill(color).cx(group.width() / 2 - 12).cy(15)
        }
        group.stencil = STENCIL.subProcess
        return group
    }

    static endEvent(stage, color) {
        let endEvent = Shadows._event(stage, color, 2)
        endEvent.stencil = STENCIL.endEvent
        return endEvent
    }

    static startEvent(stage, color) {
        let startEvent = Shadows._event(stage, color, 1)
        startEvent.stencil = STENCIL.startEvent
        return startEvent
    }

    static boundaryTimerEvent(stage, color) {
        let timer = Shadows._createGroup(stage)
        color = color ? color : COLORS.HIGHLIGHT_COLOR

        let cx = CONSTANTS.DOCKED_RADIUS
        let cy =CONSTANTS.DOCKED_RADIUS

        timer.circle(CONSTANTS.DOCKED_RADIUS * 2)
            .cx(cx)
            .cy(cy)
            .stroke({width: 1, color: color, dasharray: 3})
            .fill({color: '#fff', opacity: 0})

        timer.circle(CONSTANTS.DOCKED_RADIUS * 2 - 4)
            .cx(cx)
            .cy(cy)
            .stroke({width: 1, color: color})
            .fill({color: '#fff', opacity: 0})



        timer.line(cx, cy, cx, 5)
            .stroke({width: 2, color: COLORS.HIGHLIGHT_COLOR})
            .fill('none')

        timer.line(cx, cy, cx + timer.width() / 4 - 3, cy + timer.height() / 4 - 3)
            .stroke({width: 2, color: COLORS.HIGHLIGHT_COLOR})
            .fill('none')

        timer.stencil = STENCIL.boundaryTimerEvent
        return timer
    }

    static exclusiveGateway(stage, color) {
        let group = Shadows._createGroup(stage)
        color = color ? color : COLORS.HIGHLIGHT_COLOR
        group.polygon('25,0 50,25 25,50 0,25')
            .addClass('e-frame')
            .stroke({width: 1, color: color})
            .fill('none')
        group.line(15, 15, 35, 35).stroke({width: 2, color: color})
        group.line(35, 15, 15, 35).stroke({width: 2, color: color})

        group.stencil = STENCIL.exclusiveGateway
        return group
    }

    static sequenceFlow(stage, points, color) {
        let group = Shadows._createGroup(stage)
        color = color ? color : COLORS.HIGHLIGHT_COLOR
        let d = 'm ' + points[0].x + ',' + points[0].y
        for (let i = 1; i < points.length; i++) {
            d += ('L' + points[i].x + ',' + points[i].y + ' ')
        }
        group.path(d)
            .addClass('e-frame')
            .stroke({
                width: 1,
                color: color
            }).fill('none')
        group.points = points
        group.stencil = STENCIL.sequenceFlow
        return group
    }

    static moveSequenceFlow(shadow) {
        let d = 'm ' + shadow.points[0].x + ',' + shadow.points[0].y
        for (let i = 1; i < shadow.points.length; i++) {
            d += ('L' + shadow.points[i].x + ',' + shadow.points[i].y + ' ')
        }
        shadow.findOne('path.e-frame').plot(d)
    }


    static _event(stage, color, strokeWidth) {
        let group = Shadows._createGroup(stage)
        color = color ? color : COLORS.HIGHLIGHT_COLOR
        group.circle(CONSTANTS.EVENT_RADIUS * 2)
            .addClass('e-frame')
            .x(0)
            .y(0)
            .stroke({width: strokeWidth, color: color})
            .fill({color: '#fff', opacity: 0})

        return group
    }

    static _createGroup(stage) {
        return stage.getSvgDraw().group().addClass('e-shadow')
    }

    static _serviceIcon(container, color) {
        const d = "M550.4 74.666667c25.6 0 46.933333 19.2 53.333333 44.8l14.933334 85.333333 38.4 17.066667L727.466667 170.666667c19.2-14.933333 46.933333-12.8 66.133333 4.266666l2.133333 2.133334 53.333334 53.333333c19.2 19.2 21.333333 46.933333 6.4 68.266667l-49.066667 70.4 17.066667 38.4 85.333333 14.933333c23.466667 4.266667 42.666667 25.6 44.8 49.066667v78.933333c0 25.6-19.2 46.933333-44.8 53.333333l-85.333333 14.933334-17.066667 38.4 49.066667 70.4c14.933333 19.2 12.8 46.933333-4.266667 66.133333l-2.133333 2.133333-53.333334 53.333334c-19.2 19.2-46.933333 21.333333-68.266666 6.4l-70.4-49.066667-38.4 17.066667-14.933334 85.333333c-4.266667 23.466667-25.6 42.666667-49.066666 44.8h-78.933334c-25.6 0-46.933333-19.2-53.333333-44.8l-14.933333-85.333333-38.4-17.066667-72.533334 46.933333c-19.2 14.933333-46.933333 12.8-66.133333-4.266666l-2.133333-2.133334-53.333334-53.333333c-19.2-19.2-21.333333-46.933333-6.4-68.266667l49.066667-70.4-17.066667-38.4-85.333333-14.933333c-23.466667-4.266667-42.666667-25.6-44.8-49.066667v-78.933333c0-25.6 19.2-46.933333 44.8-53.333333l85.333333-14.933334 17.066667-38.4L170.666667 296.533333c-14.933333-19.2-12.8-46.933333 2.133333-64l2.133333-2.133333 53.333334-53.333333c19.2-19.2 46.933333-21.333333 68.266666-6.4l70.4 49.066666 38.4-17.066666 14.933334-85.333334c4.266667-23.466667 25.6-42.666667 49.066666-44.8H550.4z m-38.4 320c-64 0-117.333333 53.333333-117.333333 117.333333s53.333333 117.333333 117.333333 117.333333 117.333333-53.333333 117.333333-117.333333-53.333333-117.333333-117.333333-117.333333z"
        return container.path(d)
            .size(16, 16)
            .x(5)
            .y(5)
            .fill(color ? color : COLORS.DEFAULT_COLOR)
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

export default Shadows