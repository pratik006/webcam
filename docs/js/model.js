export class TextMessage {
    constructor(type, content) {
        this.type = type;
        this.content = content;
    }
}

export class VideoMessage extends TextMessage {}

export class User {
    constructor(username) {
        this.username = username;
    }
}

export class Event {
    constructor(selector, evtType, callback) {
        this.selector = selector;
        this.evtType = evtType;
        this.callback = callback;
    }
}