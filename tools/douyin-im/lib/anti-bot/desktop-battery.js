export async function collectDesktopBattery(context) {
    try {
        const battery = await context.navigator.getBattery();
        return {
            charging: battery.charging ? 1 : 2,
            chargingTime: battery.chargingTime + '',
            dischargingTime: battery.dischargingTime + '',
            level: context.Math.round(battery.level * 100),
        };
    }
    catch {
        return {};
    }
}
//# sourceMappingURL=desktop-battery.js.map