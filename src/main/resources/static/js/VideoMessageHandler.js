import { VideoMessage } from "./model.js";
import { Config } from "./config.js"

export class VideoMessageHandler {
    videoConnections = [];
    chunks = [];
    constructor(stompClient, topicName, view, mySessionId) {
        this.stompClient = stompClient;
        this.view = view;
        this.mySessionId = mySessionId;
        this.stompClient.subscribe(topicName, this.onMessage.bind(this), this.onMessageError);
        this.config = new Config();
    }

    onMessage(message) {
        const videoMsg = JSON.parse(message.body);
        if (this.mySessionId === videoMsg.sessionId)
            return;

        //console.log(videoMsg.content)
        if (!this.videoConnections[videoMsg.sessionId]) {
            fetch(this.config.REST_URL+videoMsg.sessionId)
                .then(resp => resp.json())
                .then(fMsg => {
                    this.videoConnections[videoMsg.sessionId] = {};
                    const mediaSource = this.newMediaSource(videoMsg.sessionId);
                    this.videoConnections[videoMsg.sessionId].mediaSource = mediaSource;
                    this.chunks.push(this.b64ToBlob(fMsg.content));
                    //this.chunks.push(this.b64ToBlob(videoMsg.content));
                    
                    const videoElem = this.view.addPanel(videoMsg.sessionId, videoMsg.sender);                    
                    this.videoConnections[videoMsg.sessionId].videoElem = videoElem;
                    videoElem.src = URL.createObjectURL(mediaSource);
                });            
        } else if(this.videoConnections[videoMsg.sessionId].mediaSource.readyState == "open") {
            let blob;
            if (this.chunks.length > 0) {
                this.chunks.push(this.b64ToBlob(videoMsg.content));
                blob = new Blob([this.chunks], {type: videoMsg.content.split("base64,")[0]});
            } else {
                blob = this.b64ToBlob(videoMsg.content);
            }
            blob.arrayBuffer().then(data => {
                if (this.videoConnections[videoMsg.sessionId].mediaSource.readyState == "open") {//make sure other user has not closed the video
                    this.videoConnections[videoMsg.sessionId].sourceBuffer.appendBuffer(data);
                }
            });
        } else {
            let blob = this.b64ToBlob(videoMsg.content);
            this.chunks.push(blob);
        }
    }

    onMessageError(error) {
        console.log(error)
    }

    newMediaSource(sessionId) {
        console.log(this.config.mediaRecorder.mimeType+" supported ? "+MediaSource.isTypeSupported(this.config.mediaRecorder.mimeType));

        const mediaSource = new MediaSource();        
        mediaSource.addEventListener('sourceopen', evt => {
            console.log("source opened ")
            const sourceBuffer = mediaSource.addSourceBuffer("video/webm;codecs=vp8");
            //console.log(this.chunks)
            if (this.chunks.length > 0) {
                const blob = new Blob(this.chunks, {type: this.config.mediaRecorder.mimeType}); 
                blob.arrayBuffer().then(data => sourceBuffer.appendBuffer(data)).then(() => this.chunks = []);
            }
            this.videoConnections[sessionId].sourceBuffer = sourceBuffer;
        }, false);
        mediaSource.addEventListener('sourceclose', evt => console.log("source closed"));
        mediaSource.addEventListener('sourceended', evt => {
            console.log("source ended");
            this.videoConnections[sessionId].sourceBuffer = null;
            this.view.removePanel(sessionId);            
        });
        return mediaSource;
    }

    b64ToBlob(base64) {
        let parts = base64.split("base64,");
        let contentType = parts[0]?parts[0]:"video/webm;codecs=vp8";
        var byteCharacters = window.atob(parts[1]?parts[1]:base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], {type: contentType});
    }
}
