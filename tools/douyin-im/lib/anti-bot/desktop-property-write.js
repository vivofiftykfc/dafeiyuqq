export function setDesktopProperty(target, key, value, receiver = target) {
    if (target == null || !Reflect.set(Object(target), key, value, receiver)) {
        throw new TypeError('Desktop property write rejected: ' + String(key));
    }
}
export function deleteDesktopProperty(target, key) {
    if (!Reflect.deleteProperty(target, key))
        throw new TypeError('Desktop property delete rejected: ' + String(key));
}
//# sourceMappingURL=desktop-property-write.js.map