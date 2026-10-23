import { BaseEvent } from '../../base/event.js';
export class RequestEvent extends BaseEvent {
    postType = 'request';
    decision;
    constructor(account, raw = {}, time) {
        super(account, raw, time);
    }
    approve() {
        return this.decide(true);
    }
    reject() {
        return this.decide(false);
    }
    decide(approve) {
        if (this.decision) {
            return this.decision.approve === approve
                ? this.decision.task
                : Promise.reject(new Error('申请正在处理，不能同时执行相反的决策'));
        }
        if (!this.isPending)
            return Promise.reject(new Error('申请已处理'));
        const task = Promise.resolve().then(() => {
            if (!this.isPending)
                throw new Error('申请已处理');
            return this.executeDecision(approve);
        });
        this.decision = { approve, task };
        const clear = () => { delete this.decision; };
        void task.then(clear, clear);
        return task;
    }
}
export class GroupRequestEvent extends RequestEvent {
}
export class GroupJoinRequestEvent extends GroupRequestEvent {
    type = 'group.join';
}
//# sourceMappingURL=request.js.map