// Generated by dts-bundle-generator v9.5.1

import { Player } from '@minecraft/server';

/**
 * @inline
 */
export interface ToString {
	toString(): string;
}
/**
 * @inline
 */
export type StringResolvableMap = {
	[key: string]: StringResolvable;
};
export type StringResolvable = ToString | StringResolvableMap;
export declare class FormArguments {
	private _args;
	set(name: string, arg: StringResolvable): void;
	setAll(args: Record<string, StringResolvable>): void;
	getAll(): Record<string, StringResolvable>;
	get<Arg extends StringResolvable>(name: string): Arg;
	resolvePath(path: string): StringResolvable;
	resolveTemplate(template: string): string;
	normalize(content: TextContent): NormalizedTextContent;
}
export interface Translate {
	translate: string;
	args?: Array<TextContent>;
}
export type TextContent = string | Translate | Array<TextContent>;
export type NormalizedTextContent = {
	type: "translate";
	translate: string;
	args?: Array<string> | Array<NormalizedTextContent>;
} | {
	type: "text";
	text: string;
} | {
	type: "array";
	array: Array<NormalizedTextContent>;
};
export interface EventAction {
	event: string;
	args?: Array<unknown>;
}
export interface FormAction {
	form?: string;
	event?: string | Array<EventAction>;
	eventArgs?: Array<unknown>;
	setArgs?: Record<string, StringResolvable>;
	copyArgs?: boolean;
}
export interface DualButtonForm {
	type: "dual-button";
	title: TextContent;
	body?: TextContent;
	topButton: DualButtonElementButton;
	bottomButton: DualButtonElementButton;
}
export type DualButtonElement = DualButtonElementButton;
export interface DualButtonElementButton {
	type: "button";
	text: TextContent;
	action?: FormAction;
}
export interface Divider {
	type: "divider";
}
export interface Label {
	type: "label";
	text: TextContent;
}
export interface Header {
	type: "header";
	text: TextContent;
}
export type UIElement = Divider | Label | Header;
export interface InputForm {
	type: "input";
	title: TextContent;
	submit?: TextContent;
	elements: Array<InputElement>;
	action?: FormAction;
}
export type InputValue = string | number | boolean;
export type InputElement = InputElementSlider | InputElementDropdown | InputElementText | InputElementToggle | UIElement;
export type InputElementSlider = {
	type: "slider";
	name?: string;
	text: TextContent;
	min: number;
	max: number;
	step: number;
	defaultValue?: number;
	tooltip?: TextContent;
};
export type InputElementDropdown = {
	type: "dropdown";
	name?: string;
	text: TextContent;
	defaultValue?: InputValue;
	options: Array<{
		text: TextContent;
		value: InputValue;
	}>;
	tooltip?: TextContent;
};
export type InputElementText = {
	type: "text";
	name?: string;
	text: TextContent;
	placeholder: TextContent;
	defaultValue?: string;
	tooltip?: TextContent;
};
export type InputElementToggle = {
	type: "toggle";
	name?: string;
	text: TextContent;
	defaultValue?: boolean;
	tooltip?: TextContent;
};
export interface MultiButtonForm {
	type: "multi-button";
	title: TextContent;
	body?: TextContent;
	elements: Array<MultiButtonElement>;
}
export type MultiButtonElement = MultiButtonElementButton | UIElement;
export interface MultiButtonElementButton {
	type: "button";
	text: TextContent;
	icon?: string;
	action?: FormAction;
}
export type Form = MultiButtonForm | InputForm | DualButtonForm;
export declare class FormError extends Error {
	constructor(msg: string);
}
export declare class FormArgumentError extends FormError {
	readonly path: string;
	readonly step: string;
	readonly current: unknown;
	constructor(path: string, step: string, current: unknown);
}
export interface Entrypoint {
	form?: string;
	events?: string | Array<EventAction>;
	eventArgs?: Array<unknown>;
	initialArgs?: Record<string, StringResolvable>;
}
export interface FormHub {
	entrypoint: string | Entrypoint;
	forms: Record<string, Form>;
}
export declare class FormEventProducer {
	protected _hub: FormHub;
	protected _formAction: FormAction | undefined;
	protected _args: FormArguments;
	static fromFormHub(hub: FormHub): FormEventProducer;
	constructor(hub: FormHub, formAction?: FormAction, previousArgs?: FormArguments);
	get args(): FormArguments;
	getInitialForm(): Form | undefined;
	iterator(): Generator<FormEvent, void, unknown>;
}
export type FormType = "multi-button" | "input" | "dual-button";
export type LoadFormReturn<T extends FormType | undefined> = T extends "multi-button" ? MultiButtonForm : T extends "input" ? InputForm : T extends "dual-button" ? DualButtonForm : Form;
export declare class FormEvent {
	protected _form: Form | undefined;
	protected _name: string | undefined;
	protected _continueProcessing: boolean;
	protected readonly _hub: FormHub;
	protected _args: FormArguments;
	protected _eventArgs: Array<unknown>;
	constructor(hub: FormHub, eventAction: EventAction | undefined, args: FormArguments);
	loadForm<T extends FormType>(name: string, type?: T | undefined): LoadFormReturn<T>;
	set form(form: Form | undefined);
	get form(): Form | undefined;
	get name(): string | undefined;
	get args(): FormArguments;
	get eventArgs(): unknown[];
	get continueProcessing(): boolean;
	cancelProcessing(): void;
}
/**
 * @inline
 */
export type EventReceiverFunction = (event: FormEvent) => Promise<void>;
/**
 * @inline
 */
export type EventReceiverMap = Record<string, EventReceiverFunction>;
export type EventReceiver = EventReceiverFunction | EventReceiverMap | undefined;
export declare const triggerEvent: (eventProducer: FormEventProducer, receiver: EventReceiver) => Promise<Form | undefined>;
export declare const _: (value: string, ...args: Array<TextContent>) => Translate;
export declare const renderLoop: (player: Player, formHub: FormHub, receiver: EventReceiver) => Promise<void>;

export {};
