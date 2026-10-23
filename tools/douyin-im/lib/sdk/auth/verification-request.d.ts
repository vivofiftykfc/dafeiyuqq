export interface VerificationRequestConfig {
    url?: string;
    baseURL?: string;
    method?: string;
    header?: Record<string, string>;
    params?: Record<string, unknown>;
    commonParams?: Record<string, unknown>;
    data?: unknown;
    encryptFields?: readonly string[];
    needFormData?: boolean;
    timeout?: number;
    pathType?: string;
    validateStatus?: (status: number) => boolean;
    getCacheInfo?: (common?: Record<string, unknown>) => Promise<Record<string, unknown> | null | undefined>;
}
export type VerificationPipeline = 'raw' | 'fetch' | 'fetchSec';
export interface VerificationResponse {
    data: unknown;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: VerificationRequestConfig;
}
export interface VerificationRequestChallenge {
    verifyData: string;
    responseContext: VerificationResponse;
    retry(kind: 'captcha' | 'secondary', fp?: string): Promise<VerificationResponse>;
}
export declare function createVerificationRequests(options: {
    origin: string;
    transport(request: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body: unknown;
        timeout: number;
    }, pipeline: VerificationPipeline): Promise<{
        rawText: string;
        status: number;
        statusText: string;
        headers: Record<string, string>;
    }>;
    verify(challenge: VerificationRequestChallenge): Promise<VerificationResponse>;
    query?: () => Record<string, unknown>;
    initializeVerification?: (info: Record<string, unknown>) => void;
}): {
    request: (config?: VerificationRequestConfig) => Promise<unknown>;
    fetch: (config?: VerificationRequestConfig) => Promise<unknown>;
    fetchSec: (config?: VerificationRequestConfig) => Promise<unknown>;
};
//# sourceMappingURL=verification-request.d.ts.map