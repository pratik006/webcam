import { User } from "../model.js";

class LoginView {
    events = [{
        'selector': 'input[type="submit"]',
        'callback': function(e, usernamElem) {
            this.models.user = new User(usernamElem.value);
            this.router.navigate('home')
        }
    }];
    constructor(root) {
        this.root = root;
    }

    getEvents() {
        return this.events;
    }

    render() {
        fetch('./js/view/templates/login.css').then(response => response.text())
            .then(css => {
                fetch('./js/view/templates/login.html').then(response => response.text()).then(html => {
                    this.root.insertAdjacentHTML('afterbegin' ,`<style>${css}</style>${html}`);
                    const usernamElem = this.root.querySelector('#login');                
                    document.querySelector('input[type="submit"]')
                        .addEventListener('click', e => this.doLogin(this.root.querySelector('#login').value, this.root.querySelector('#password').value));
                });
            });               
    }
}

export { LoginView };