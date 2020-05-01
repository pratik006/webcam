import { TextMessage, User } from "./model.js";
import { LoginView } from "./view/LoginView.js";
import { JoinRoomView } from "./view/JoinRoomView.js";
import { RoomView } from "./view/RoomView.js";
import { HomeView } from "./view/HomeView.js";
import { TextMessageHandler } from "./TextMessageHandler.js";
import { VideoMessageHandler } from "./VideoMessageHandler.js";
import { Config } from "./config.js";

class Controller {
    session = {

    }
    routeMap = {
        'login': LoginView,
        'home': HomeView
    };
    models = {}
    events = [];
    constructor(url, appPrefix='', rootSelector, router) {
        this.serverUrl = url;
        this.appPrefix = appPrefix;
        this.root = document.querySelector(rootSelector);
        this.router = router;
        this.config = new Config();
    }

    showView(path) {
        if (path === "login") {
            this.models.user = new User();
            this.currentView = new LoginView(this.root);
            this.currentView.doLogin = this.doLogin.bind(this);
        } else if (path === "home") {
            if (!this.models.user) {
                this.router.navigate('login');
                return;
            }
            this.currentView = new HomeView(this.root, this.models.user);
            this.currentView.onConnect = this.onConnect.bind(this);
            this.currentView.onDisconnect = this.onDisconnect.bind(this);
        } else if(path === "joinroom") {
            this.currentView = new JoinRoomView(this.root);
            this.currentView.doJoinRoom = this.doJoinRoom.bind(this);            
        } else if(path === "room") {
            if (!this.roomId) {
                this.router.navigate('joinroom');
                return;
            }
            this.currentView = new RoomView(this.root);
            this.currentView.onAddCam = this.onAddCam.bind(this);
            this.currentView.onRemoveCam = this.onRemoveCam.bind(this);           
            this.currentView.addWebcam = this.addWebcam.bind(this);
            this.currentView.removeWebcam = this.removeWebcam.bind(this);
            this.currentView.disconnect = this.disconnect.bind(this);

            this.videoMessageHandler.view = this.currentView;
            this.textMessageHandler.view = this.currentView;
            this.currentView.sendMessage = this.textMessageHandler.sendMessage.bind(this);
            this.textMessageHandler.send = this.send.bind(this);            
        } else {
            this.currentView = new this.routeMap[path](this.root);
            if (this.currentView.models) {
                this.currentView[this.currentView.models[0]] = this.models[this.currentView.models[0]];
            }
            this.currentView.getEvents().map(evt => {
                //bind it to controller
                evt.callback = evt.callback.bind(this)
                return evt;
            });
        }
        this.currentView.render();
    }

    disconnect() {
        this.stompClient.disconnect();
        this.connected = false;
        this.router.navigate('joinroom')
    }

    send(url, header, data) {        
        if(data instanceof Blob) {
            this.blobToBase64(data, (base64) => {
                this.stompClient.send(this.appPrefix+url, {}, base64);
            });
        } else if(data instanceof TextMessage) {
            data.sender = this.getSessionId();
            this.stompClient.send(this.appPrefix+url, {}, JSON.stringify(data));
        } else {
            this.stompClient.send(this.appPrefix+url, {}, data);
        }
    }

    isConnected() {
        return this.connected?true:false;
    }

    getSessionId() {
        return this.sessionId;
    }

    blobToBase64(buf, callback) {
        const reader = new FileReader();
        var temp = [];
        temp.push(buf);
        reader.readAsDataURL(new Blob(temp, {type: this.config.mediaRecorder.mimeType})); 
        reader.onloadend = function() {
            callback(reader.result);
        }
    }

    startRecording(aStream) {
        console.log(JSON.stringify(this.config.mediaRecorder)+" supported? "+MediaRecorder.isTypeSupported(this.config.mediaRecorder));
        const mediaRecorder = new MediaRecorder(aStream, this.config.mediaRecorder);
        /*let chunks = [];
        if (!this.videoMessageHandler.videoConnections["Me2"]) {
            this.videoMessageHandler.videoConnections["Me2"] = {};
            this.mediaSource = this.videoMessageHandler.newMediaSource("Me2")
            const video = document.querySelector('#video_Me2');
            video.src = URL.createObjectURL(this.mediaSource);
        }*/
        mediaRecorder.addEventListener('dataavailable', event => {
            if (event.data.size > 0) {
                if (this.isConnected()) {
                    this.send("/binary", {}, event.data);
                    //event.data.arrayBuffer().then(data => this.videoMessageHandler.videoConnections['Me2'].sourceBuffer.appendBuffer(data));
                }
            }
        });
        mediaRecorder.addEventListener('stop', evt => {
            console.log("mediarecorder stop")
            this.send("/user", {}, new TextMessage('VIDEO_DISCONNECT', "stop video"));
        });
        mediaRecorder.start(this.config.recordingInterval);
        this.mediaRecorder = mediaRecorder;
    }

    stopRecording() {
        this.mediaRecorder.stop();
    }

    addWebcam(videoElem) {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        navigator.mediaDevices.getUserMedia(this.config.mediaConstraints).then(stream => {
            this.webcamStream = stream;
            videoElem.srcObject = stream;
            videoElem.play();
            this.startRecording(stream);
        });
    }

    removeWebcam() {
        this.webcamStream.getTracks().forEach(function(track) {
            track.stop();
        });
        this.stopRecording();
    }








    doJoinRoom(roomId) {
        console.log("Joining room "+roomId)
        this.socket = new SockJS(this.serverUrl);
        this.stompClient = Stomp.over(this.socket);
        this.roomId = roomId;
        this.stompClient.connect({"roomId": roomId}, (msg) => {
            this.connected = true;
            this.sessionId = this.socket._transport.url.substr(this.serverUrl.length).split("/")[1];
            console.log("connected. sessionId: " + this.sessionId)
            this.onConnect(msg)
            this.router.navigate("room");
        }, (message) => {
            console.log("disconnected "+message)
            this.onDisconnect(message);
        });
    }

    doLogin(username, password) {
        console.log("controller doLogin "+username+" | "+password)
        this.models.user.username = username;
        this.router.navigate('home')
    }

    onConnect() {
        this.textMessageHandler = new TextMessageHandler(this.stompClient, this.config.TEXT_TOPIC, this.currentView, this.sessionId);        
        this.videoMessageHandler = new VideoMessageHandler(this.stompClient, this.config.VIDEO_TOPIC, this.currentView, this.sessionId);
    }

    onDisconnect() {
        console.log("handle disconnect")
        console.log(this)
    }

    onAddCam(name, sessionId) {
        console.log("handle on add cam")
        console.log(this)
        this.currentView.addPanel(name, sessionId);        
    }

    onRemoveCam() {
        console.log("handle on add cam")
        console.log(this)
    }
}

export { Controller };