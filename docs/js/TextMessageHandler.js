import { TextMessage } from "./model.js";

export class TextMessageHandler {
    constructor(stompClient, topicName, view, mySessionId) {
        this.stompClient = stompClient;
        this.view = view;
        this.mySessionId = mySessionId;
        
        this.stompClient.subscribe(topicName, this.onTextMessage.bind(this), this.onTextMessageError);
    }

    onTextMessage(message) {
        const textMessage = JSON.parse(message.body);
        if (textMessage.type == "VIDEO_DISCONNECT" && textMessage.sessionId != this.mySessionId) {
            this.view.removePanel(textMessage.sessionId);
        } else if (textMessage.type == "CHAT") {
            this.view.appendMessage(textMessage);
        } else if(textMessage.type == "CONNECT") {
            console.log("connected "+chatMsg.sessionId);
        } else if(textMessage.type == "DISCONNECT") {
            console.log("disconnected "+textMessage.sessionId);
            this.view.removePanel(textMessage.sessionId);
            //delete appContext.users[chatMsg.sessionId];
        } else {
            console.log(textMessage)
        }
        
    }

    onTextMessageError(error) {
        console.log(error)
    }

    sendMessage(text) {
        console.log("text: "+text)
        this.send("/user", {}, new TextMessage('CHAT', text));
    }
}
