export function createDesktopDTraitMediaCollector(context) {
    function supported() {
        try {
            const types = [
                'audio/ogg; codecs="vorbis"',
                'audio/mpeg',
                'audio/mpegurl',
                'audio/wav; codecs="1"',
                'audio/x-m4a',
                'audio/aac',
                'video/ogg; codecs="theora"',
                'video/quicktime',
                'video/mp4; codecs="avc1.42E01E"',
                'video/webm; codecs="vp8"',
                'video/webm; codecs="vp9"',
                'video/x-matroska',
            ].sort();
            const video = context.document.createElement('video'), audio = new context.Audio();
            const recorderPresent = 'MediaRecorder' in context.window;
            return types.reduce((items, mimeType) => {
                const item = {
                    mimeType,
                    audioPlayType: audio.canPlayType(mimeType),
                    videoPlayType: video.canPlayType(mimeType),
                    mediaSource: context.MediaSource.isTypeSupported(mimeType),
                    mediaRecorder: recorderPresent
                        ? context.MediaRecorder.isTypeSupported(mimeType)
                        : false,
                };
                if (!item.audioPlayType &&
                    !item.videoPlayType &&
                    !item.mediaSource &&
                    !item.mediaRecorder)
                    return items;
                items.push(item);
                return items;
            }, []);
        }
        catch {
            return undefined;
        }
    }
    return async () => {
        try {
            const items = supported();
            return {
                str_13: Array.isArray(items)
                    ? context.hash(items.map(item => item.mimeType).join(','))
                    : '',
            };
        }
        catch {
            context.onDiagnostic('md');
            return { str_13: context.hash('') };
        }
    };
}
//# sourceMappingURL=desktop-dtrait-media.js.map