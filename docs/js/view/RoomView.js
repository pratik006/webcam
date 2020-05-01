import { User, Event } from "../model.js";

class RoomView {
    videoToggle = false;
    audioToggle = false;
    constructor(rootSelector) {
        this.root = rootSelector;
    }

    events= [
        new Event('#videoToggle', 'click', function(evt) {
            if (this.videoToggle === true) {
                this.removePanel("Me");
                this.removeWebcam();
                this.videoToggle = false;
            } else {
                const elem = this.addPanel("Me", "Me");
                this.addWebcam(elem);
                this.videoToggle = true;
            }
        }),
        new Event('#disconnect', 'click', function(evt) {
            if (this.videoToggle === true) {
                this.removePanel("Me");
                this.removeWebcam();
                this.videoToggle = false;
            }
            this.disconnect();
        }),
        new Event('#btnSend', 'click', function(text) {
            if (this.root.querySelector('#txtInput').value) {
                console.log(this)
                this.sendMessage(this.root.querySelector('#txtInput').value);
                this.root.querySelector('#txtInput').value = "";
            }
        })
    ];

    render() {
        fetch('./js/view/templates/room.css').then(response => response.text())
            .then(css => {
                fetch('./js/view/templates/room.html').then(response => response.text()).then(html => {
                    this.root.innerHTML = `<style>${css}</style>${html}`;
                    //const elem = this.addPanel("Me", "Me");
                    this.events.forEach(e => this.root.querySelector(e.selector).addEventListener(e.evtType, e.callback.bind(this)));
                    //this.addWebcam(elem);
                    //this.videoToggle = true;

                });
            });               
    }

    addPanel(sessionId, username) {
        this.root.querySelector('.videoContainer > .card-columns').insertAdjacentHTML('afterbegin', `
            <div class="card" id="serverCard_${sessionId}">
                <div class="card-header">
                ${username?username:sessionId}
                </div>
                <div class="card-body">
                    <span class="text-right text-muted float-right"></span>
                    <video id="video_${sessionId}" autoplay></video>
                </div>
            </div>`);
        return this.root.querySelector(`#video_${sessionId}`);
    }

    removePanel(sessionId) {
        var panel = document.querySelector(`#serverCard_${sessionId}`)
        if (panel) {
            panel.remove();
        } else {
            console.log("panel already removed. "+sessionId)
        }
    }

    addParticipant(participantName) {
        this.root.querySelector('.participants').insertAdjacentHTML('beforeend', `<li class="list-group-item">${participantName}</li>`);
    }

    appendMessage(textMessage) {
        this.root.querySelector('.messages').insertAdjacentHTML('beforeend', `<li class="list-group-item">${textMessage.content}</li>`);
    }
}

export { RoomView };