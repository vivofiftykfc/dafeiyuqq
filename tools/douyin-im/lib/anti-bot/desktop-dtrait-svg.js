export function createDesktopDTraitSvgCollector(context) {
    return () => {
        const namespace = 'http://www.w3.org/2000/svg';
        const svg = context.document.createElementNS(namespace, 'svg');
        svg.id = 'secure-collect-svg';
        svg.setAttribute('width', '200');
        svg.setAttribute('height', '100');
        svg.setAttribute('style', 'opacity: 0;position: absolute;top: 0;left: 0;transform: translateX(-200px)');
        const rect = context.document.createElementNS(namespace, 'rect');
        rect.setAttribute('x', '10.5');
        rect.setAttribute('y', '20.25');
        rect.setAttribute('width', '123.45');
        rect.setAttribute('height', '67.89');
        svg.appendChild(rect);
        context.document.body.appendChild(svg);
        const box = rect.getBBox();
        if (svg.parentNode === context.document.body)
            context.document.body.removeChild(svg);
        else {
            const found = context.document.querySelector('#secure-collect-svg');
            if (found)
                found.parentNode?.removeChild(found);
        }
        const { x, y, width, height } = box;
        return {
            str_24: context.hash(''
                .concat(x, ',')
                .concat(y, ',')
                .concat(width, ',')
                .concat(height)),
        };
    };
}
//# sourceMappingURL=desktop-dtrait-svg.js.map