export function readDesktopConversationRisk(settingExt) {
    const single = settingExt?.['a:sky_eye_dialog'];
    const list = settingExt?.['a:sky_eye_dialog_list'];
    if (!(single || (list && list !== '[]')))
        return undefined;
    const entries = list ? JSON.parse(list) : [];
    const dialog = single ? JSON.parse(single) : undefined;
    const dialogs = [...entries];
    if (dialog)
        dialogs.push(dialog);
    return dialogs[0];
}
export function hasDesktopConversationRisk(settingExt) {
    const dialog = readDesktopConversationRisk(settingExt);
    if (typeof dialog === 'string' || Array.isArray(dialog))
        return dialog.length > 0;
    return dialog !== null && typeof dialog === 'object' && Object.keys(dialog).length > 0;
}
//# sourceMappingURL=conversation-risk.js.map