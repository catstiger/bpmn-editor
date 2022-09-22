import {COLORS, CONSTANTS, STENCIL} from "./Constants";
import UserTask from "./UserTask";

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
        UserTask._userIcon(group, color)

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
}

export default Shadows