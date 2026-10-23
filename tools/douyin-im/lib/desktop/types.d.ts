export type QrConnectStatus = 'new' | 'scanned' | 'confirmed' | 'expired' | string;
export interface QrUserData {
    app_id?: number;
    user_id?: number;
    user_id_str?: string;
    sec_user_id?: string;
    screen_name?: string;
    name?: string;
    avatar_url?: string;
    mobile?: string;
    has_password?: number;
    country_code?: number;
    [key: string]: unknown;
}
export interface GetQrcodeData {
    token: string;
    qrcode: string;
    expire_time: number;
    error_code?: number;
    qrcode_index_url?: string;
    app_name?: string;
    web_name?: string;
}
export interface GetQrcodeResponse {
    message: string;
    data: GetQrcodeData;
}
export interface CheckQrconnectData {
    data?: CheckQrconnectData;
    status?: QrConnectStatus;
    token?: string;
    qrcode?: string;
    expire_time?: number;
    qrcode_index_url?: string;
    error_code?: number;
    account_flow?: string;
    encrypt_uid?: string;
    biz_params?: Record<string, unknown>;
    common_params?: Record<string, unknown>;
    captcha?: string;
    verify_ticket?: string;
    verify_center_decision_conf?: string;
    verify_center_secondary_decision_conf?: string;
    sms_code_key?: string;
    description?: string;
    desc_url?: string;
    extra?: string;
    redirect_url?: string;
    scan_app_id?: number;
    user_data?: QrUserData;
    scan_user_info?: Record<string, unknown>;
    scan_device_info?: Record<string, unknown>;
}
export interface QrMfaChallenge {
    encrypt_uid?: string;
    biz_params?: Record<string, unknown>;
    common_params?: Record<string, unknown>;
}
export interface CheckQrconnectResponse {
    message: string;
    data: CheckQrconnectData;
}
export interface QrCodeInfo {
    token: string;
    qrcodeBase64: string;
    expireTime: number;
    qrcodeIndexUrl?: string;
}
export interface PassportApiData {
    error_code?: number;
    description?: string;
    captcha?: string;
    verify_ticket?: string;
    verify_center_decision_conf?: string;
    verify_center_secondary_decision_conf?: string;
    mobile?: string;
    mobile_ticket?: string;
    retry_time?: number;
    sub_account?: PassportSubAccount[];
    sms_code_key?: string;
    [key: string]: unknown;
}
export interface PassportApiResponse {
    message: string;
    data: PassportApiData;
}
export type PassportTokenBeatScene = 'boot' | 'active' | 'polling';
export interface PassportLoginOptions {
    retry?: PassportApiResponse | CheckQrconnectResponse;
    fp?: string;
    verificationFields?: Readonly<Record<string, unknown>>;
    subAccount?: {
        smsCodeKey: string;
        secUid?: string;
        registerNewUser?: boolean;
    };
}
export interface PassportSubAccount {
    sec_uid?: string;
    user_id?: string | number;
    name?: string;
    avatar?: string;
    aweme_id?: string | number;
    is_bind_login_mobile?: boolean;
    passport_enterprise_user_type?: number;
    business_account_active?: boolean;
    app_account_group_id?: number;
    [key: string]: unknown;
}
//# sourceMappingURL=types.d.ts.map