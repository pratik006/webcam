window.addEventListener("load", evt => {
    console.log("window loading");
});

(function() {
    const SERVER_URL = 'http://192.168.0.108:8090/web-conference';
    const TOPIC_NAME = '/topic/public';
    const VIDEO_TOPIC = '/topic/video';
    const CHUNK_SIZE = 512;
    var stompClient = null;
    const sender = document.querySelector("#name");
    const content = document.querySelector("#content");
    const btnConnect = document.querySelector("#connect");
    const btnDisconnect = document.querySelector("#disconnect");
    const btnSend = document.querySelector("#send");
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
    const mimeCodec = "video/webm; codecs=vorbis,vp8";

    function attachMediaSource(videoElem, sessionId) {
        const mediaSource = new MediaSource();
        appContext.users[sessionId].mediaSource = mediaSource;
        var mediaSourceBuffer;
        mediaSource.addEventListener('sourceopen', evt => {
            console.log("source opened "+videoElem.id);
            const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
            appContext.users[sessionId].sourceBuffer = sourceBuffer;
            
            if(appContext.users[sessionId].chunks) {
                var blob = appContext.users[sessionId].chunks.pop();
                blob.arrayBuffer().then(data => sourceBuffer.appendBuffer(data));
            }
        }, false);
        mediaSource.addEventListener('sourceclose', evt => console.log("source closed "+sessionId));
        mediaSource.addEventListener('sourceended', evt => console.log("source ended "+sessionId));
        videoElem.src = URL.createObjectURL(mediaSource);
        videoElem.play().then(evt => {
            console.log("playing "+this);
            //var arrayBuffer = _base64ToArrayBuffer(videoMsg.content.split(",")[1]);
            //appContext.users[videoMsg.sessionId].sourceBuffer.appendBuffer(arrayBuffer);
        }).catch(err => console.log("error while playing "+videoElem));
        return mediaSource;
    }

    const otherVideo = document.querySelector("#otherVideo");
    myVideo.play().then(evt => {
        console.log("onplay myvideo");
        var cStream = myVideo.mozCaptureStream();
        //otherVideo.srcObject = myVideo.captureStream();
        var recordedChunks = [];
        var options = { mimeType: "video/webm; codecs=vp8" };
        var otherVideoPlaying = false;
        appContext.users["test"] ={};
        myMediaSource = attachMediaSource(otherVideo, "test");

        mediaRecorder = new MediaRecorder(cStream, options);
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                const reader = new FileReader();
                var temp = [];
                temp.push(event.data);
                reader.readAsDataURL(new Blob(temp, {type: "video/webm"})); 
                reader.onloadend = function() {
                    console.log("sending "+reader.result.substr(0, 50));
                    //stompClient.send("/app/binary", {}, reader.result);
                    temp = [];
                }

                recordedChunks.push(event.data);
                if (appContext.users["test"].sourceBuffer) {
                    const blob = new Blob(recordedChunks, {type: "video/webm"})
                    blob.arrayBuffer().then(data => appContext.users["test"].sourceBuffer.appendBuffer(data));
                    recordedChunks = [];
                }
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

        if (appContext.connected == true) {
            stompClient.send("/app/user", {}, JSON.stringify({
                'type': 'VIDEO_DISCONNECT', 
                'sender':  sender.value,
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

    function readCanvas() {
        if (videoOn && stompClient) {
            var canvasData = canvas.toDataURL('image/jpeg', 0.5);
            var temp = canvasData.split(",")[1];
            // console.log("canvas start:"+temp.substr(0, 10)+"..."+temp.substr(temp.length-101, 100));
            // var decodedAsString = atob(canvasData.split(",")[1]);
            // var charArray=[];
            // for (var i=0;i<decodedAsString.length;i++) {
            //     charArray.push(decodedAsString.charAt(i));
            // }
            //serverImg.setAttribute('src', "data:image/jpeg;base64,"+temp);
            //console.log(stompClient);
            var matches = temp.match(/.{1,512}/g);
            matches.forEach((s, index) => {
                stompClient.send("/app/user", {}, JSON.stringify({
                    'messageNumber': messageNumber,
                    'type': 'VIDEO', 
                    'sender':  sender.value,
                    'content': s,
                    'partNumber': index,
                    'partCount': matches.length
                 }));
            });
            messageNumber++;
        }
    }

    function connect() {
        var socket = new SockJS(SERVER_URL);
        stompClient = Stomp.over(socket);
        var messageBin = [];
        var vidBin = [];
        stompClient.connect({'login': sender.value}, function (frame) {
            setConnected(true);
            console.log('Connected: ' + frame);
            stompClient.subscribe(VIDEO_TOPIC, msg => {
                const videoMsg = JSON.parse(msg.body);
                handleVideoMessage(videoMsg);
            });
            stompClient.subscribe(TOPIC_NAME, msg => {
                const chatMsg = JSON.parse(msg.body);
                if (chatMsg.type == "VIDEO_CONNECT" && chatMsg.sender != sender.value) {
                    appContext.video_users.push(chatMsg.sessionId);
                    console.log("video user connected."+chatMsg.sender+" sessionId: "+chatMsg.sessionId);
                    document.querySelector('.videoContainer > div').innerHTML += createVideoWindow(chatMsg.sessionId, chatMsg.sender);
                } else if (chatMsg.type == "VIDEO_DISCONNECT" && chatMsg.sender != sender.value) {
                    delete appContext.video_users[chatMsg.sessionId];
                    console.log("video user disconnected."+chatMsg.sender);
                    const videoWindow = document.querySelector('#serverCard_'+chatMsg.sessionId);
                    videoWindow.parentNode.removeChild(videoWindow);
                } else if (chatMsg.type == "VIDEO" && chatMsg.sender != sender.value) {
                    if (!appContext.video_users.includes(chatMsg.sessionId)) {
                        appContext.video_users.push(chatMsg.sessionId);
                        document.querySelector('.videoContainer > div').innerHTML += createVideoWindow(chatMsg.sessionId, chatMsg.sender);
                    }
                    const serverImg = document.querySelector('#serverImg_'+chatMsg.sessionId);
                    if (!serverImg)
                        return;

                    if (!messageBin[chatMsg.messageNumber]) {
                        messageBin[chatMsg.messageNumber] = [];
                    }
                    messageBin[chatMsg.messageNumber][chatMsg.partNumber] = {};
                    messageBin[chatMsg.messageNumber][chatMsg.partNumber].content = chatMsg.content;
                    if (messageBin[chatMsg.messageNumber].length == chatMsg.partCount) {
                        messageBin[chatMsg.messageNumber].sort();
                        var buf = "";
                        messageBin[chatMsg.messageNumber].forEach(item => {
                            buf += item.content;
                        });
                        //console.log("buf len"+buf.length+" partLen: "+messageBin[chatMsg.messageNumber].length);
                        var encoded = buf;//btoa(buf);
                        //console.log(encoded.substr(0,10)+"..."+encoded.substr(encoded.length-101,100));
                        serverImg.setAttribute('src', "data:image/jpeg;base64,"+encoded);
                        messageBin[chatMsg.messageNumber] = null;
                    }
                } else if(chatMsg.type == "CHAT") {
                    showMsg(chatMsg);
                } else if(chatMsg.type == "CONNECT") {
                    console.log("connected "+chatMsg.sessionId);
                    appContext.users.push(chatMsg.sessionId);
                    console.log(appContext.users);
                } else if(chatMsg.type == "DISCONNECT") {
                    console.log("disconnected "+chatMsg.sessionId);
                    delete appContext.users[chatMsg.sessionId];
                    console.log(appContext.users);
                }
            });
        });
    }

    function handleVideoMessage(videoMsg) {
        //console.log("video message: "+videoMsg.sender+" "+videoMsg.sessionId);
        console.log("receiving data: "+videoMsg.content.substring(0,50)+" len: "+videoMsg.content.length);

        if (!appContext.video_users.includes(videoMsg.sessionId)) {
            appContext.users[videoMsg.sessionId] = {};
            appContext.users[videoMsg.sessionId].chunks = [];
            appContext.users[videoMsg.sessionId].chunks.push(_base64ToArrayBuffer(videoMsg.content));
            appContext.video_users.push(videoMsg.sessionId);
            document.querySelector('.videoContainer > div').innerHTML += createVideoWindow(videoMsg.sessionId, videoMsg.sender);
            const videoImg = document.querySelector('#videoImg_'+videoMsg.sessionId);
            attachMediaSource(videoImg, videoMsg.sessionId);            
            return;
        }

        const videoImg = document.querySelector('#videoImg_'+videoMsg.sessionId);
        if (!videoImg)
            return;

        
        var blob = _base64ToArrayBuffer(videoMsg.content);
        blob.arrayBuffer().then(data => appContext.users[videoMsg.sessionId].sourceBuffer.appendBuffer(data));
    }

    function _base64ToArrayBuffer(base64) {
        var binary_string = window.atob(base64.split(",")[1]?base64.split(",")[1]:base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return new Blob(bytes, {type: "video/webm"});
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