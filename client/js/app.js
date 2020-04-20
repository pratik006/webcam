window.addEventListener("load", evt => {
    console.log("window loading");
});

(function() {
    const SERVER_URL = 'http://192.168.0.108:8090/web-conference';
    const REST_URL = 'http://192.168.0.108:8090/rest/';
    const TOPIC_NAME = '/topic/public';
    const VIDEO_TOPIC = '/topic/video';
    const CHUNK_SIZE = 512;
    var stompClient = null;
    const sender = document.querySelector("#name");
    const content = document.querySelector("#content");
    const btnConnect = document.querySelector("#connect");
    const btnDisconnect = document.querySelector("#disconnect");
    const btnSend = document.querySelector("#send");
    const otherVideo = document.querySelector("#otherVideo");
    const serverImg = document.querySelector("#serverImg");

    const btnStartVideo = document.querySelector("#startVideo");
    const btnStopVideo = document.querySelector("#stopVideo");
    const myVideo = document.querySelector("#myVideo");
    const canvas = document.querySelector("canvas");
    const img = document.querySelector("img");
    const context = canvas.getContext('2d');
    var videoOn = false;
    var gStream;
    var messageNumber = 0;
    var mediaSource = null;

    const appContext = {
        connected: false,
        users: [],
        video_users: [],
        users: new Object()
    };
    const mimeCodec = "video/webm; codecs=vp8";

    function attachMediaSource(videoElem, sessionId) {
        const mediaSource = new MediaSource();
        appContext.users[sessionId].mediaSource = mediaSource;
        var mediaSourceBuffer;
        mediaSource.addEventListener('sourceopen', evt => {
            console.log("source opened "+videoElem.id);
            const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
            appContext.users[sessionId].sourceBuffer = sourceBuffer;
            /*appContext.users[sessionId].chunks.forEach(chunkBlob => {
                chunkBlob.arrayBuffer().then(data => sourceBuffer.appendBuffer(data));
            });*/
            if(appContext.users[sessionId].chunks) {
                appContext.users[sessionId].chunks[0].arrayBuffer()
                .then(data => sourceBuffer.appendBuffer(data));
            }
        }, false);
        mediaSource.addEventListener('sourceclose', evt => console.log("source closed "+sessionId));
        mediaSource.addEventListener('sourceended', evt => console.log("source ended "+sessionId));
        videoElem.src = URL.createObjectURL(mediaSource);
        videoElem.play().then(evt => {
            console.log("playing "+this);
            //var arrayBuffer = b64ToBlob(videoMsg.content.split(",")[1]);
            //appContext.users[videoMsg.sessionId].sourceBuffer.appendBuffer(arrayBuffer);
        }).catch(err => console.log("error while playing "+videoElem));
        return mediaSource;
    }

    
    myVideo.play().then(evt => {
        var cStream = myVideo.mozCaptureStream ? myVideo.mozCaptureStream() : myVideo.captureStream();
        //otherVideo.srcObject = myVideo.captureStream();
        var recordedChunks = [];
        /*appContext.users["test"] ={};
        myMediaSource = attachMediaSource(otherVideo, "test");*/

        mediaRecorder = new MediaRecorder(cStream, { mimeType: mimeCodec });
        mediaRecorder.ondataavailable = function(event) {console.log(event)
            if (event.data.size > 0) {
                blobToBase64(event.data, function(base64) {
                    //var blob = b64ToBlob(base64);
                    //blob.arrayBuffer().then(data => appContext.users["test"].sourceBuffer.appendBuffer(data));
                    stompClient.send("/app/binary", {}, base64);
                });
            }
        };
        mediaRecorder.start(1000);
    });

    btnStartVideo.addEventListener('click', evt => {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            myVideo.classList.remove('d-none');
            myVideo.classList.add('d-block');
            gStream = stream;
            myVideo.srcObject = stream;
            myVideo.play();

            videoOn = true;
            btnStartVideo.classList.remove('d-block');
            btnStartVideo.classList.add('d-none');
            btnStopVideo.classList.remove('d-none');
            btnStopVideo.classList.add('d-block');

            if (appContext.connected == true) {
                stompClient.send("/app/user", {}, JSON.stringify({
                    'type': 'VIDEO_CONNECT', 
                    'sender':  sender.value,
                    'content': 'video connected'
                 }));
            }            
        }).catch(err => console.log(err));
    });
    btnStopVideo.addEventListener('click', evt => {
        gStream.getTracks().forEach(function(track) {
            track.stop();
        });
        videoOn = false;
        btnStopVideo.classList.remove('d-block');
        btnStopVideo.classList.add('d-none');
        btnStartVideo.classList.remove('d-none');
        btnStartVideo.classList.add('d-block');
        myVideo.classList.remove('d-block');
        myVideo.classList.add('d-none');
        mediaRecorder.stop();

        if (appContext.connected == true) {
            stompClient.send("/app/user", {}, JSON.stringify({
                'type': 'VIDEO_DISCONNECT', 
                'sessionId':  appContext.sessionId,
                'content': 'video disconnected'
             }));
        }    
    });
    btnConnect.addEventListener('click', evt => connect());
    btnDisconnect.addEventListener('click', evt => disconnect());
    btnSend.addEventListener('click', evt => send());

    var constraints = {
        video: true,
        audio: false
    }

    setInterval(() => {
        //drawCanvas();
        //readCanvas();
    }, 80);

    function drawCanvas() {
        //console.log(video.height+" "+video.width);
        context.drawImage(myVideo, 0, 0, canvas.width, canvas.height);
    }

    function connect() {
        var socket = new SockJS(SERVER_URL);
        stompClient = Stomp.over(socket);
        var messageBin = [];
        var vidBin = [];
        stompClient.connect({'login': sender.value}, function (frame) {
            setConnected(true);
            const sessionId = socket._transport.url.substr(SERVER_URL.length).split("/")[1]; 
            appContext.sessionId = sessionId;
            stompClient.subscribe(VIDEO_TOPIC, msg => {
                const videoMsg = JSON.parse(msg.body);
                console.log(appContext.users[videoMsg.sessionId])
                if (appContext.sessionId != videoMsg.sessionId && appContext.users[videoMsg.sessionId].disconnect != true) {
                    handleVideoMessage(videoMsg);    
                }
            });
            stompClient.subscribe(TOPIC_NAME, msg => {
                const chatMsg = JSON.parse(msg.body);
                if (chatMsg.type == "VIDEO_CONNECT" && chatMsg.sessionId != appContext.sessionId) {
                    appContext.users[chatMsg.sessionId].disconnect = false;
                    console.log("video user connected."+chatMsg.sender+" sessionId: "+chatMsg.sessionId);
                    //document.querySelector('.videoContainer > div').innerHTML += createVideoWindow(chatMsg.sessionId, chatMsg.sender);
                } else if (chatMsg.type == "VIDEO_DISCONNECT" && chatMsg.sessionId != appContext.sessionId) {
                    appContext.users[chatMsg.sessionId].disconnect = true;
                    appContext.users[chatMsg.sessionId].mediaSource.endOfStream();
                    document.querySelector('#serverCard_'+chatMsg.sessionId).remove();
                    delete appContext.users[chatMsg.sessionId].videoImg;
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
        });
    }

    function handleVideoMessage(videoMsg) {
        if (!appContext.users[videoMsg.sessionId].videoSession) {console.log("111")
            fetch(REST_URL+videoMsg.sessionId)
                .then(resp => resp.json())
                .then(fMsg => {
                    appContext.users[videoMsg.sessionId].videoSession = true;
                    appContext.users[videoMsg.sessionId].chunks = [];
                    appContext.users[videoMsg.sessionId].chunks.push(b64ToBlob(fMsg.content));
                    appContext.users[videoMsg.sessionId].chunks.push(b64ToBlob(videoMsg.content));
                    document.querySelector('.videoContainer > div').innerHTML += createVideoWindow(videoMsg.sessionId, videoMsg.sender);
                    const videoImg = document.querySelector('#videoImg_'+videoMsg.sessionId);
                    appContext.users[videoMsg.sessionId].videoImg = videoImg;
                    attachMediaSource(videoImg, videoMsg.sessionId);
                });
            return;
        } else if (!appContext.users[videoMsg.sessionId].videoImg) {
            console.log("recreate video layout ");
            document.querySelector('.videoContainer > div').innerHTML += createVideoWindow(videoMsg.sessionId, videoMsg.sender);
            const videoImg = document.querySelector('#videoImg_'+videoMsg.sessionId);
            appContext.users[videoMsg.sessionId].videoImg = videoImg;
            attachMediaSource(videoImg, videoMsg.sessionId);
            return;
        } else {
            console.log("exisging ")
            const videoImg = appContext.users[videoMsg.sessionId].videoImg;//document.querySelector('#videoImg_'+videoMsg.sessionId);
            if (!videoImg)
                return;
    
            
            var blob = b64ToBlob(videoMsg.content);
            blob.arrayBuffer().then(data => {
                if (appContext.users[videoMsg.sessionId]) {//make sure other user has not closed the video
                    appContext.users[videoMsg.sessionId].sourceBuffer.appendBuffer(data);
                }
            });
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
        if (stompClient !== null) {
            stompClient.disconnect();
        }
        setConnected(false);
        console.log("Disconnected");
    }

    function send() {
        stompClient.send("/app/user", {}, JSON.stringify({'type': 'CHAT', 'sender':  sender.value,'content': content.value }));
        content.value = "";
    }

    function showMsg(chatMsg) {
        document.querySelector('.chat-history').innerHTML += '<div class="col-sm-2 col-lg-12 col-md-12">'+createMessageCard(chatMsg)+'</div>';
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

    function createVideoWindow(sessionId, username) {
        return `
        <div class="card" id="serverCard_${sessionId}">
            <div class="card-header">
            ${username?username:sessionId}
            </div>
            <div class="card-body">
                <span class="text-right text-muted float-right"></span>
                <video id="videoImg_${sessionId}" autoplay></video>
            </div>
      </div>`;
    }

})();