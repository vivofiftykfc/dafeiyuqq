export class DesktopWebSecureEvents {
    events = {};
    on(name, listener) {
        (this.events[name] ||= []).push(listener);
    }
    off(name, listener) {
        const listeners = this.events[name];
        if (listeners)
            for (let i = listeners.length; i >= 0; i--)
                if (!listener || listeners[i] === listener)
                    listeners.splice(i, 1);
    }
    emit(name, event) { this.events[name]?.slice().forEach(listener => listener(event)); }
    has(name, listener) {
        return !!this.events[name] && (typeof listener !== 'function' || this.events[name].indexOf(listener) !== -1);
    }
}
//# sourceMappingURL=desktop-web-secure-events.js.map