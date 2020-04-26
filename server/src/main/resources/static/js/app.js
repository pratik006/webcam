import {Controller} from "./controller.js";
import {VideoMessage} from "./model.js";

window.addEventListener("load", evt => {
    console.log("window loading");
});

(function() {
    const SERVER_URL = 'https://192.168.0.108:9443/web-conference';
    const REST_URL = 'https://192.168.0.108:9443/rest/';
    const controller = new Controller(SERVER_URL, "/app");
    const TOPIC_NAME = '/topic/public';
    const VIDEO_TOPIC = '/topic/video';
    const MY_SESSION_ID = "Me";
    const sender = document.querySelector("#name");
    const content = document.querySelector("#content");
    const btnConnect = document.querySelector("#connect");
    const btnDisconnect = document.querySelector("#disconnect");
    const btnSend = document.querySelector("#send");

    const btnStartVideo = document.querySelector("#startVideo");
    const btnStopVideo = document.querySelector("#stopVideo");
    const constraints = {
        video: true,
        audio: true
    }
    const mimeCodec = "video/webm;codecs=opus,vp8";

    const appContext = {
        connected: false,
        isConnected: () => this.connected,
        users: new Object()
    };

    function attachMediaSource(videoElem, sessionId) {
        const mediaSource = new MediaSource();
        appContext.users[sessionId].mediaSource = mediaSource;
        var mediaSourceBuffer;
        console.log(mimeCodec+" supported ? "+MediaSource.isTypeSupported(mimeCodec));
        mediaSource.addEventListener('sourceopen', evt => {
            console.log("source opened "+sessionId)
            const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
            appContext.users[sessionId].sourceBuffer = sourceBuffer;
            /*appContext.users[sessionId].chunks.forEach(chunkBlob => {
                chunkBlob.arrayBuffer().then(data => sourceBuffer.appendBuffer(data));
            });*/
            if(appContext.users[sessionId].chunks) {
                appContext.users[sessionId].chunks[0].arrayBuffer()
                .then(data => {
                    sourceBuffer.appendBuffer(data);
                });
            }
        }, false);
        mediaSource.addEventListener('sourceclose', evt => console.log("source closed"));
        mediaSource.addEventListener('sourceended', evt => {
            console.log("source ended");
            removePanel(sessionId);
        });
        videoElem.src = URL.createObjectURL(mediaSource);
        videoElem.play().then(evt => {
            console.log("playing "+this);
            //var arrayBuffer = b64ToBlob(videoMsg.content.split(",")[1]);
            //appContext.users[videoMsg.sessionId].sourceBuffer.appendBuffer(arrayBuffer);
        }).catch(err => {console.log("error while playing "+sessionId+" "+err); console.trace();});
        return mediaSource;
    }

    function startRecording(aStream) {
        //var stream = appContext.myVideo.mozCaptureStream ? appContext.myVideo.mozCaptureStream() : appContext.myVideo.captureStream();
        var recordedChunks = [];
        
        /* testing locally */
        //appContext.users["test"] ={};
        //var otherVideo = document.querySelector("#videoImg_2");
        //attachMediaSource(otherVideo, "test");
        /* testing locally ends */

        appContext.mediaRecorder = new MediaRecorder(aStream, {
            mimeType: mimeCodec,
            audioBitsPerSecond: 128000,
            videoBitsPerSecond: 100000,

        });
        appContext.mediaRecorder.addEventListener('dataavailable', event => {
            if (event.data.size > 0) {
                if (controller.isConnected()) {
                    controller.send("/binary", {}, event.data);
                    //blobToBase64(event.data, base64 => controller.send("/binary", {}, base64));
                } else {
                    //local testing
                    /* if (appContext.users["test"].mediaSource.readyState == "open") {
                        event.data.arrayBuffer().then(data => appContext.users["test"].sourceBuffer.appendBuffer(data));
                    }*/
                }
            }
        });
        appContext.mediaRecorder.addEventListener('stop', evt => {
            console.log("mediarecorder stop")
            removePanel(MY_SESSION_ID)
        });
        appContext.mediaRecorder.start(1000);
        return true;
    }

    btnStartVideo.addEventListener('click', evt => {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            appContext.recordingStatus = startRecording(stream);
            appContext.myVideoStream = stream;
            document.querySelector('.videoContainer').insertAdjacentHTML('afterbegin',createVideoWindow(MY_SESSION_ID, MY_SESSION_ID));
            const myVideo = document.querySelector('.videoContainer video[id="videoImg_Me"]');
            myVideo.muted = true;
            //const myVideo = document.querySelector('#videoImg_0');
            myVideo.addEventListener('playing', evt => {
                console.log("playing "+evt.target.id)
                if(evt.target.id == appContext.myVideo.id && !appContext.recordingStatus) {
                    appContext.recordingStatus = startRecording(stream);
                }
            });
            myVideo.addEventListener('pause', evt => {
                console.log("pause "+evt.target.id)
                if(evt.target.id == appContext.myVideo.id) {
                    appContext.myVideo.play();
                }
            });
            myVideo.srcObject = stream;
            myVideo.play();
            appContext.myVideo = myVideo;

            btnStartVideo.classList.remove('d-block');
            btnStartVideo.classList.add('d-none');
            btnStopVideo.classList.remove('d-none');
            btnStopVideo.classList.add('d-block');

            if (controller.isConnected()) {
                controller.send("/user", {}, new VideoMessage('VIDEO_CONNECT', 'video connected'));
            }            
        }).catch(err => console.log(err));
    });
    btnStopVideo.addEventListener('click', evt => {
        if (appContext.mediaRecorder.state == "recording") {
            appContext.mediaRecorder.stop();
        }
        appContext.myVideoStream.getTracks().forEach(function(track) {
            track.stop();
        });
        appContext.myVideo.pause();
        //document.querySelector("#serverCard_Me").parentElement.remove();
        btnStopVideo.classList.remove('d-block');
        btnStopVideo.classList.add('d-none');
        btnStartVideo.classList.remove('d-none');
        btnStartVideo.classList.add('d-block');      

        if (appContext.connected == true) {
            controller.send("/app/user", {}, JSON.stringify({
                'type': 'VIDEO_DISCONNECT', 
                'sessionId':  appContext.sessionId,
                'content': 'video disconnected'
             }));
        }    
    });
    btnConnect.addEventListener('click', evt => {
        controller.connect({}, onConnect, onDisconnect);
    });
    btnDisconnect.addEventListener('click', evt => disconnect());
    btnSend.addEventListener('click', evt => send());

    function onConnect(arg) {
        setConnected(true);
        const sessionId = controller.getSessionId();
        console.log("connected. sessionId: "+sessionId)
        appContext.sessionId = sessionId;
        controller.subscribe(VIDEO_TOPIC, videoMsg => {
            if (!appContext.users[videoMsg.sessionId]) {
                //incoming user was connected before I was connected
                appContext.users[videoMsg.sessionId] = {};
            }
            if (appContext.sessionId != videoMsg.sessionId && true != appContext.users[videoMsg.sessionId].disconnect) {
                handleVideoMessage(videoMsg);
            }
        });
        controller.subscribe(TOPIC_NAME, chatMsg => {
            if (!appContext.users[chatMsg.sessionId]) {
                //incoming user was connected before I was connected
                appContext.users[chatMsg.sessionId] = {};
            }

            if (chatMsg.type == "VIDEO_CONNECT" && chatMsg.sessionId != appContext.sessionId) {
                appContext.users[chatMsg.sessionId].disconnect = false;
                console.log("video user connected."+chatMsg.sender+" sessionId: "+chatMsg.sessionId);
                //document.querySelector('.videoContainer').innerHTML += createVideoWindow(chatMsg.sessionId, chatMsg.sender);
            } else if (chatMsg.type == "VIDEO_DISCONNECT" && chatMsg.sessionId != appContext.sessionId) {
                appContext.users[chatMsg.sessionId].disconnect = true;
                if (appContext.users[chatMsg.sessionId].mediaSource.readyState == "open") {
                    appContext.users[chatMsg.sessionId].mediaSource.endOfStream();
                }

                //document.querySelector('#serverCard_'+chatMsg.sessionId).parentNode.remove();
                //delete appContext.users[chatMsg.sessionId].videoImg;
                console.log("video user disconnected."+chatMsg.sessionId);
            } else if(chatMsg.type == "CHAT") {
                showMsg(chatMsg);
            } else if(chatMsg.type == "CONNECT") {
                console.log("connected "+chatMsg.sessionId);
                appContext.users[chatMsg.sessionId] = {};
            } else if(chatMsg.type == "DISCONNECT") {
                console.log("disconnected "+chatMsg.sessionId);
                delete appContext.users[chatMsg.sessionId];
            }
        });
    }

    function onError() {
        console.log("error in connecting")
    }

    function onDisconnect(arg) {
        console.log("handle disconnection")
    }

    function handleVideoMessage(videoMsg) {
        if (!appContext.users[videoMsg.sessionId].videoSession) {console.log("creating new video session for "+videoMsg.sessionId)
            fetch(REST_URL+videoMsg.sessionId)
                .then(resp => resp.json())
                .then(fMsg => {
                    appContext.users[videoMsg.sessionId].videoSession = true;
                    appContext.users[videoMsg.sessionId].chunks = [];
                    appContext.users[videoMsg.sessionId].chunks.push(b64ToBlob(fMsg.content));
                    appContext.users[videoMsg.sessionId].chunks.push(b64ToBlob(videoMsg.content));
                    document.querySelector('.videoContainer').insertAdjacentHTML('beforeend', createVideoWindow(videoMsg.sessionId, videoMsg.sender));
                    const videoImg = document.querySelector('#videoImg_'+videoMsg.sessionId);
                    //const videoImg = getVideoWindow();
                    appContext.users[videoMsg.sessionId].videoImg = videoImg;
                    attachMediaSource(videoImg, videoMsg.sessionId);
                });
            return;
        } else if (!appContext.users[videoMsg.sessionId].videoImg 
            && !document.querySelector('.videoContainer').querySelector('#videoImg_'+videoMsg.sessionId)) {
            console.log("recreate video layout ");
            document.querySelector('.videoContainer').insertAdjacentHTML('beforeend', createVideoWindow(videoMsg.sessionId, videoMsg.sender));
            const videoImg = document.querySelector('#videoImg_'+videoMsg.sessionId);
            //const videoImg = getVideoWindow();
            appContext.users[videoMsg.sessionId].videoImg = videoImg;
            attachMediaSource(videoImg, videoMsg.sessionId);
            return;
        } else {
            //console.log(videoMsg);
            const videoImg = appContext.users[videoMsg.sessionId].videoImg;//document.querySelector('#videoImg_'+videoMsg.sessionId);
            if (!videoImg)
                return;
    
            if (appContext.users[videoMsg.sessionId].mediaSource.readyState == "open") {
                
                var blob = b64ToBlob(videoMsg.content);
                blob.arrayBuffer().then(data => {
                    if (appContext.users[videoMsg.sessionId]) {//make sure other user has not closed the video
                        appContext.users[videoMsg.sessionId].sourceBuffer.appendBuffer(data);
                    }
                });
            } else {
                console.log("mediasource not open, discarding")
            }
        }
    }

    function b64ToBlob(base64) {
        var byteCharacters = window.atob(base64.split(",")[1]?base64.split(",")[1]:base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], {type: mimeCodec});
    }

    function blobToBase64(buf, callback) {
        const reader = new FileReader();
        var temp = [];
        temp.push(buf);
        reader.readAsDataURL(new Blob(temp, {type: "video/webm"})); 
        reader.onloadend = function() {
            callback(reader.result);
        }
    }

    function setConnected(value) {
        appContext.connected = value;
        if (value == true) {
            const elem = document.querySelector('#connect');
            elem.disabled = true;
            document.querySelector('#name').disabled = true;
            const elem2 = document.querySelector('#disconnect');
            elem2.disabled = false;
        } else {
            const elem = document.querySelector('#disconnect');
            elem.disabled = true;
            const elem2 = document.querySelector('#connect');
            elem2.disabled = false;
            document.querySelector('#name').disabled = false;
        }
    }

    function disconnect() {
        controller.disconnect();
        setConnected(false);
        console.log("Disconnected");
    }

    function send() {
        controller.send("/app/user", {}, JSON.stringify({'type': 'CHAT', 'sender':  sender.value,'content': content.value }));
        content.value = "";
    }

    function showMsg(chatMsg) {
        document.querySelector('.chat-history').insertAdjacentHTML('beforeend', '<div class="col-sm-2 col-lg-12 col-md-12">'+createMessageCard(chatMsg)+'</div>');
    }

    function createMessageCard(chatMsg) {
        dt = new Date(chatMsg.time);
        return `<div class="card">
        <div class="card-header">
        ${chatMsg.sender}
        </div>
        <div class="card-body">
            <span class="card-text col-md-10">${chatMsg.content}</span>
            <span class="text-right text-muted float-right">${dt.getHours()}:${dt.getMinutes()}</span>
        </div>
      </div>`;
    }

    function getVideoWindow() {
        const index = Object.keys(appContext.users).length;
        return document.querySelector('#videoImg_'+index);
    }

    function createVideoWindow(sessionId, username) {
        return `
        <div class="col-xs-12 col-sm-12 col-md-4 col-lg-4">
            <div class="card" id="serverCard_${sessionId}">
                <div class="card-header">
                ${username?username:sessionId}
                </div>
                <div class="card-body">
                    <span class="text-right text-muted float-right"></span>
                    <video id="videoImg_${sessionId}" autoplay></video>
                </div>
        </div>
      </div>`;
    }

    function removePanel(sessionId) {
        var panel = document.querySelector(`#serverCard_${sessionId}`)
        if (panel) {
            panel.parentNode.remove();
        } else {
            console.log("panel already removed. "+sessionId)
        }
    }

})();