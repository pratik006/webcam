import { User } from "../model.js";

class JoinRoomView {
    constructor(root) {
        this.root = root;
    }

    render() {
        //fetch('./templates/JoinRoom.css').then(response => response.text())
            //.then(css => {
                fetch('./js/view/templates/JoinRoom.html').then(response => response.text()).then(html => {
                    this.root.innerHTML = html;
                    const roomIdElem = this.root.querySelector('#roomId');                
                    document.querySelector('button[type="submit"]')
                        .addEventListener('click', e => this.doJoinRoom(roomIdElem.value));
                });
            //});               
    }
}

export { JoinRoomView };