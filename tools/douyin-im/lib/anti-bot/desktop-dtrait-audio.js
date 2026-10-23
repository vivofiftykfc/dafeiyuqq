export function createDesktopDTraitAudioCollector(context) {
    return async () => {
        try {
            context.Date.now();
            const Audio = context.OfflineAudioContext;
            const audio = new Audio(1, 5000, 44100);
            const analyser = audio.createAnalyser();
            const oscillator = audio.createOscillator();
            const compressor = audio.createDynamicsCompressor();
            oscillator.type = 'triangle';
            oscillator.frequency.value = 10000;
            compressor.threshold.value = -50;
            compressor.knee.value = 40;
            compressor.attack.value = 0;
            oscillator.connect(compressor);
            compressor.connect(analyser);
            compressor.connect(audio.destination);
            oscillator.start(0);
            audio.startRendering();
            return new Promise(resolve => {
                audio.oncomplete = event => {
                    const buffer = event.renderedBuffer;
                    const frequency = new Float32Array(analyser.frequencyBinCount);
                    const time = new Float32Array(analyser.fftSize);
                    analyser.getFloatFrequencyData(frequency);
                    analyser.getFloatTimeDomainData(time);
                    const frequencySum = [...frequency].reduce((sum, value) => sum + context.Math.abs(value), 0);
                    const timeSum = [...time].reduce((sum, value) => sum + context.Math.abs(value), 0);
                    const first100 = frequency
                        .slice(0, 100)
                        .reduce((sum, value) => sum + context.Math.abs(value), 0);
                    const unique = new Set(buffer.getChannelData(0))?.size;
                    resolve({
                        str_8: context.hash(''.concat((frequencySum || ''))),
                        str_9: context.hash(''.concat((timeSum || ''))),
                        str_20: context.hash(''.concat((first100 || ''))),
                        str_25: context.hash(''.concat((unique || ''))),
                    });
                };
            });
        }
        catch {
            context.onDiagnostic('audio');
            return {
                str_8: context.hash(''),
                str_9: context.hash(''),
                str_20: context.hash(''),
                str_25: context.hash(''),
            };
        }
    };
}
//# sourceMappingURL=desktop-dtrait-audio.js.map