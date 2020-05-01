export class Config {
    SERVER_ROOT = "https://192.168.0.108:9443";//".";
    SERVER_URL = this.SERVER_ROOT + '/web-conference';
    REST_URL = this.SERVER_ROOT + '/rest/';
    mediaRecorder = {
        mimeType: "video/webm;codecs=vp8",
        //audioBitsPerSecond: 64000,
        videoBitsPerSecond: 100000
    };
    mediaConstraints = {
        video: true,
        audio: false
    }
    recordingInterval= 200
    TEXT_TOPIC = '/topic/public'
    VIDEO_TOPIC = '/topic/video'
}
