export function createDesktopDTraitSpeechCollector(context) {
    const empty = () => ({ str_23: context.hash(''), str_22: context.hash('') });
    return async () => {
        await new Promise(resolve => context.setTimeout(() => resolve(), 50));
        return new Promise(resolve => {
            try {
                if (!('speechSynthesis' in context.window)) {
                    context.onDiagnostic('speech', '!supported');
                    resolve(empty());
                    return;
                }
                context.speechSynthesis.getVoices();
                const timer = context.setTimeout(() => {
                    context.onDiagnostic('speech', 'timeout');
                    resolve(empty());
                }, 300);
                const changed = () => {
                    const voices = context.speechSynthesis.getVoices();
                    const local = (voices || []).find(voice => voice.localService);
                    if (!voices || !voices.length || !local)
                        return;
                    context.clearTimeout(timer);
                    const seen = new Set();
                    const unique = voices.filter(voice => {
                        if (seen.has(voice.voiceURI))
                            return false;
                        seen.add(voice.voiceURI);
                        return true;
                    });
                    const localNames = unique
                        .filter(voice => voice.localService)
                        .map(voice => voice.name);
                    const remoteNames = unique
                        .filter(voice => !voice.localService)
                        .map(voice => voice.name);
                    const languages = [...new Set(unique.map(voice => voice.lang))];
                    const defaults = unique.filter(voice => voice.default && voice.localService);
                    let defaultName = '', defaultLang = '';
                    if (defaults.length === 1) {
                        defaultName = defaults[0].name;
                        defaultLang = (defaults[0].lang || '').replace(new RegExp('_'), '-');
                    }
                    resolve({
                        str_23: context.hash(''
                            .concat((languages || []).join(','), ',')
                            .concat((localNames || []).join(','))),
                        str_22: context.hash(''
                            .concat(defaultLang, ',')
                            .concat(defaultName, ',')
                            .concat((remoteNames || []).join(','))),
                    });
                };
                changed();
                if (context.speechSynthesis.addEventListener)
                    context.speechSynthesis.addEventListener('voiceschanged', changed);
                else
                    context.speechSynthesis.onvoiceschanged = changed;
            }
            catch {
                context.onDiagnostic('speech', 'error');
                resolve(empty());
            }
        });
    };
}
//# sourceMappingURL=desktop-dtrait-speech.js.map