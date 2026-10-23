export function guidDeviceId(guid) {
    let hash = 0;
    for (let index = 0; index < guid.length; index++)
        hash = (31 * hash + guid.charCodeAt(index)) >>> 0;
    return String(hash);
}
//# sourceMappingURL=device-id.js.map