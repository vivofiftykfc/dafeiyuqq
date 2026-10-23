export class Contact {
    account;
    id;
    _address;
    constructor(account, id, address) {
        this.account = account;
        this.id = id;
        this._address = Object.freeze({ ...address });
    }
    get address() { return this._address; }
    get threadId() {
        return this.address.threadId;
    }
    get conversationShortId() {
        return this.address.conversationShortId;
    }
    get conversationType() {
        return this.address.conversationType;
    }
    get inboxType() {
        return this.address.inboxType;
    }
    resolveAddress() {
        return this.address;
    }
    updateAddress(address) {
        this._address = Object.freeze({ ...address });
    }
}
//# sourceMappingURL=contact.js.map