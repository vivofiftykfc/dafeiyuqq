import { DesktopWebSecureEvents } from './desktop-web-secure-events.js';
export declare function createDesktopWebSecureCookieDigest(keyText: unknown, certificate: unknown, serverData: unknown): string;
export declare function verifyDesktopWebSecureCookie(cookie: unknown, keyText: unknown, certificate: unknown, serverData: unknown): boolean;
export declare function readDesktopWebSecureCookie(read: () => string, name: string): string;
export declare function desktopWebSecureCookieDomain(readHostname: () => string): string;
export declare class DesktopWebSecureCookieOperator extends DesktopWebSecureEvents {
    private readonly document;
    constructor(document: {
        cookie: string;
        readonly location: {
            readonly hostname: string;
        };
    });
    getCookie: (name: string) => string | null;
    setCookie: (name: string, value: string, path?: string, domain?: string, maxAge?: number, secure?: boolean) => boolean;
    setCookieNoTimeout: (name: string, value: string) => void;
    setCookieWithMaxAge: (name: string, value: string) => void;
    setCookieWithDomain: (name: string, value: string) => void;
    deleteCookie: (name: string, path?: string, domain?: string) => boolean;
    deleteAllCookie: (name: string) => void;
    hasCookie: (name: string) => boolean;
    getCookieKeys: () => string[];
}
//# sourceMappingURL=desktop-web-secure-cookie.d.ts.map