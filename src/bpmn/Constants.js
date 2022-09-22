export const STENCIL = {
    startEvent: 'StartNoneEvent',
    endEvent: 'EndNoneEvent',
    sequenceFlow: 'SequenceFlow',
    userTask: 'UserTask',
    exclusiveGateway: 'ExclusiveGateway',
    subProcess: 'SubProcess',
    boundaryTimerEvent: 'BoundaryTimerEvent'
}

export const COLORS = {
    DEFAULT_COLOR: '#000',
    HIGHLIGHT_COLOR: '#409EFF',
    DISABLED_COLOR: '#acacac',
    ENABLED_COLOR: '#31e80c'
}

export const CONSTANTS = {
    GATEWAY_SIZE: 50,
    BORDER_RADIUS: 10,
    BAR_SIZE: 8,
    EVENT_RADIUS: 18,
    DOCKED_RADIUS: 14,
    DEFAULT_WIDTH: 100,
    DEFAULT_HEIGHT: 80,
    DEFAULT_SUBPROCESS_WIDTH: 360,
    DEFAULT_SUBPROCESS_HEIGHT: 200
}

export const OPERATIONS = {
    NONE: 'none',
    ADD_USERTASK: 'add_usertask',
    ADD_EXCLUSIVE_GATEWAY: 'add_exclusive_gateway',
    ADD_STARTEVENT: 'add_startevent',
    ADD_ENDEVENT: 'add_end_event',
    ADD_TIMEREVENT: 'add_timer_event',
    ADD_SUBPROCESS: 'add_subprocess',
    PREPARE_DRAW_CONNECTION: 'prepare_draw_connection',
    DRAWING_CONNECTION: 'drawing_connection',
    CHANGING_CONNECTION_START: 'changing_conection_start',
    CHANGING_CONNECTION_END: 'changing_conection_end',
    RESIZING: 'resizing',
    REMOVE: 'remove'
}