class HomeView {
    events = [{
        'selector': '#connect',
        'callback': function(e) {
            console.log(user)
            console.log("handle connect click")
            console.log(this)
        }
    }];
    models = ['user'];
    constructor(root, user) {
        this.root = root;
        this.user = user;
    }

    getEvents() {
        return this.events;
    }

    render() {
        fetch('./js/view/templates/home.css').then(response => response.text())
            .then(css => {
                fetch('./js/view/templates/home.html').then(response => response.text()).then(template => {
                    const html = template.replace(`{{username}}`,this.user.username);
                    this.root.innerHTML = `<style>${css}</style>${html}`;                    
                    this.root.querySelector("#connect").addEventListener('click', e => onConnect());
                });
            });               
    }
}

export { HomeView };