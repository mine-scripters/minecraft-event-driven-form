import { ButtonDialogueResponse, InputScriptDialogueResponse, inputScriptDialogue, inputSlider, inputDropdown, inputText, inputToggle, dualButtonScriptDialogue, multiButtonScriptDialogue } from '@mine-scripters/minecraft-script-dialogue';

class FormError extends Error {
    constructor(msg) {
        super(msg);
    }
}
class FormArgumentError extends FormError {
    path;
    step;
    current;
    constructor(path, step, current) {
        super(`Invalid path: ${path} at step: ${step} in object: ${JSON.stringify(current)}`);
        this.path = path;
        this.step = step;
        this.current = current;
    }
}

class FormArguments {
    _args = {};
    set(name, arg) {
        this._args[name] = arg;
    }
    setAll(args) {
        this._args = {
            ...this._args,
            ...args,
        };
    }
    getAll() {
        return this._args;
    }
    get(name) {
        return this._args[name];
    }
    resolvePath(path) {
        let current = this._args;
        const splitPath = path.split('.');
        for (const step of splitPath) {
            if (typeof current === 'object' && step in current) {
                current = current[step];
            }
            else {
                throw new FormArgumentError(path, step, current);
            }
        }
        return current.toString();
    }
    resolveTemplate(template) {
        return template.replace(/\{\s*([^}\s]+)\s*\}/g, (_, p1) => {
            return this.resolvePath(p1);
        });
    }
    normalize(content) {
        if (typeof content === 'string') {
            return {
                type: 'text',
                text: this.resolveTemplate(content),
            };
        }
        else if (Array.isArray(content)) {
            return {
                type: 'array',
                array: content.map((c) => this.normalize(c)),
            };
        }
        else {
            return {
                type: 'translate',
                translate: this.resolveTemplate(content.translate),
                args: content.args ? content.args.map((a) => this.normalize(a)) : undefined,
            };
        }
    }
}

class FormEvent {
    _form = undefined;
    _name = undefined;
    _continueProcessing = true;
    _hub;
    _args = new FormArguments();
    _eventArgs = [];
    constructor(hub, action, previousArgs) {
        this._hub = hub;
        if (action) {
            if (action.event) {
                this._name = action.event;
            }
            if (action.form) {
                this._form = this._hub.forms[action.form];
            }
            if (action.copyArgs && previousArgs) {
                this._args.setAll(previousArgs.getAll());
            }
            if (action.eventArgs) {
                this._eventArgs = action.eventArgs;
            }
        }
    }
    loadForm(name, type) {
        if (name in this._hub.forms) {
            const form = this._hub.forms[name];
            if (type && form.type !== type) {
                throw new FormError(`Invalid type ${type} for form named ${name}. The actual type is ${form.type}`);
            }
            return JSON.parse(JSON.stringify(form));
        }
        throw new FormError(`Unknown form named ${name}`);
    }
    set form(form) {
        this._form = form;
    }
    get form() {
        return this._form;
    }
    get name() {
        return this._name;
    }
    get args() {
        return this._args;
    }
    get eventArgs() {
        return this._eventArgs;
    }
    get continueProcessing() {
        return this._continueProcessing;
    }
    cancelProcessing() {
        this._continueProcessing = false;
    }
}
const triggerEvent = async (event, receiver) => {
    if (event.name) {
        if (receiver === undefined) {
            return;
        }
        else if (typeof receiver === 'function') {
            await receiver(event);
        }
        else {
            for (const [key, eventReceiver] of Object.entries(receiver)) {
                if (!event.continueProcessing) {
                    break;
                }
                if (key === event.name) {
                    await eventReceiver(event);
                }
            }
        }
    }
    return event.form;
};

const _ = (value, ...args) => ({
    translate: value,
    args: args.length > 0 ? args : undefined,
});

const assertNever = (arg) => {
    throw new Error(`Should have been never but got ${arg} instead`);
};
const toRawMessage = (content) => {
    switch (content.type) {
        case 'text':
            return {
                text: content.text,
            };
        case 'translate':
            if (!content.args) {
                return {
                    translate: content.translate,
                };
            }
            return {
                translate: content.translate,
                with: {
                    rawtext: content.args.map((t) => {
                        if (typeof t === 'string') {
                            return {
                                text: t,
                            };
                        }
                        else {
                            return toRawMessage(t);
                        }
                    }),
                },
            };
        case 'array':
            return {
                rawtext: content.array.map(toRawMessage),
            };
    }
    assertNever(content);
};
const configureFormMultiButton = (form, args) => {
    let dialogue;
    dialogue = multiButtonScriptDialogue(toRawMessage(args.normalize(form.title)));
    if (form.body) {
        dialogue = dialogue.setBody(toRawMessage(args.normalize(form.body)));
    }
    for (let i = 0; i < form.elements.length; ++i) {
        const element = form.elements[i];
        if (element.type === 'button') {
            dialogue = dialogue.addButton(i.toString(), toRawMessage(args.normalize(element.text)), element.icon);
        }
    }
    return dialogue;
};
const configureFormDualButton = (form, args) => {
    let dialogue;
    dialogue = dualButtonScriptDialogue(toRawMessage(args.normalize(form.title)), {
        name: 'top',
        text: toRawMessage(args.normalize(form.topButton.text)),
    }, {
        name: 'bottom',
        text: toRawMessage(args.normalize(form.bottomButton.text)),
    });
    if (form.body) {
        dialogue = dialogue.setBody(toRawMessage(args.normalize(form.body)));
    }
    return dialogue;
};
const configureFormInput = (form, args) => {
    let dialogue;
    dialogue = inputScriptDialogue(toRawMessage(args.normalize(form.title)));
    if (form.submit) {
        dialogue = dialogue.withSubmitButton(toRawMessage(args.normalize(form.submit)));
    }
    for (let i = 0; i < form.elements.length; ++i) {
        const element = form.elements[i];
        if (element.type === 'slider') {
            dialogue = dialogue.addElement(inputSlider(element.name ?? i.toString(), toRawMessage(args.normalize(element.text)), element.min, element.max, element.step, element.defaultValue));
        }
        else if (element.type === 'dropdown') {
            let dropdown = inputDropdown(element.name ?? i.toString(), toRawMessage(args.normalize(element.text)));
            if (element.defaultValue) {
                dropdown =
                    dropdown.setDefaultValueIndex(element.options.findIndex((o) => o.value === element.defaultValue)) ?? 0;
            }
            for (let j = 0; j < element.options.length; ++j) {
                const option = element.options[j];
                dropdown = dropdown.addOption(toRawMessage(args.normalize(option.text)), option.value);
            }
            dialogue = dialogue.addElement(dropdown);
        }
        else if (element.type === 'text') {
            dialogue = dialogue.addElement(inputText(element.name ?? i.toString(), toRawMessage(args.normalize(element.text)), toRawMessage(args.normalize(element.placeholder)), element.defaultValue));
        }
        else if (element.type === 'toggle') {
            dialogue = dialogue.addElement(inputToggle(element.name ?? i.toString(), toRawMessage(args.normalize(element.text)), element.defaultValue));
        }
        else {
            assertNever(element);
        }
    }
    return dialogue;
};
const configureForm = (form, args) => {
    switch (form.type) {
        case 'multi-button':
            return configureFormMultiButton(form, args);
        case 'dual-button':
            return configureFormDualButton(form, args);
        case 'input':
            return configureFormInput(form, args);
    }
    assertNever(form);
};
const renderForm = async (player, formHub, form, args) => {
    const dialogue = configureForm(form, args);
    const response = await dialogue.open({ player });
    if (response instanceof ButtonDialogueResponse) {
        if (form.type === 'multi-button') {
            const multiButtonForm = form;
            const selected = parseInt(response.selected);
            return new FormEvent(formHub, multiButtonForm.elements[selected].action, args);
        }
        else if (form.type === 'dual-button') {
            const dualButtonForm = form;
            if (response.selected === 'top') {
                return new FormEvent(formHub, dualButtonForm.topButton.action, args);
            }
            else if (response.selected === 'bottom') {
                return new FormEvent(formHub, dualButtonForm.bottomButton.action, args);
            }
        }
    }
    else if (response instanceof InputScriptDialogueResponse) {
        const inputForm = form;
        const event = new FormEvent(formHub, inputForm.action, args);
        event.args.setAll(response.values);
        return event;
    }
    return new FormEvent(formHub);
};
const renderLoop = async (player, formHub, receiver) => {
    let currentForm = formHub.forms[formHub.entrypoint];
    let args = new FormArguments();
    while (currentForm !== undefined) {
        const event = await renderForm(player, formHub, currentForm, args);
        currentForm = await triggerEvent(event, receiver);
        args = event.args;
    }
};

export { FormArgumentError, FormArguments, FormError, FormEvent, _, renderLoop, triggerEvent };
//# sourceMappingURL=MinecraftEventDrivenForm.js.map
