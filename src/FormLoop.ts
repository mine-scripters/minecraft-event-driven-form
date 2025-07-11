import {
  DualButtonForm,
  EventReceiver,
  Form,
  FormArguments,
  FormEventProducer,
  FormHub,
  InputForm,
  MultiButtonElementButton,
  MultiButtonForm,
  NormalizedTextContent,
  triggerEvent,
} from '@mine-scripters/minecraft-event-driven-form-base';
import {
  ButtonDialogueResponse,
  DialogueRejectedResponse,
  dualButtonScriptDialogue,
  DualButtonScriptDialogue,
  inputDropdown,
  inputScriptDialogue,
  InputScriptDialogue,
  InputScriptDialogueResponse,
  inputSlider,
  inputText,
  inputToggle,
  MultiButtonDialogue,
  multiButtonScriptDialogue,
} from '@mine-scripters/minecraft-script-dialogue';
import { Player, RawMessage } from '@minecraft/server';

const assertNever = (arg: never): never => {
  throw new Error(`Should have been never but got ${arg} instead`);
};

const toRawMessage = (content: NormalizedTextContent): RawMessage => {
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
            } else {
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

const configureFormMultiButton = (form: MultiButtonForm, args: FormArguments): MultiButtonDialogue<string, never> => {
  let dialogue: MultiButtonDialogue<string, never>;
  dialogue = multiButtonScriptDialogue(toRawMessage(args.normalize(form.title)));
  if (form.body) {
    dialogue = dialogue.setBody(toRawMessage(args.normalize(form.body)));
  }

  for (let i = 0; i < form.elements.length; ++i) {
    const element = form.elements[i];
    if (element.type === 'button') {
      dialogue = dialogue.addButton(i.toString(), toRawMessage(args.normalize(element.text)), element.icon);
    } else if (element.type === 'divider') {
      dialogue = dialogue.addDivider();
    } else if (element.type === 'header') {
      dialogue = dialogue.addHeader(toRawMessage(args.normalize(element.text)));
    } else if (element.type === 'label') {
      dialogue = dialogue.addLabel(toRawMessage(args.normalize(element.text)));
    } else {
      assertNever(element);
    }
  }

  return dialogue;
};

const configureFormDualButton = (
  form: DualButtonForm,
  args: FormArguments
): DualButtonScriptDialogue<'top' | 'bottom', void, void> => {
  let dialogue: DualButtonScriptDialogue<'top' | 'bottom', void, void>;
  dialogue = dualButtonScriptDialogue(
    toRawMessage(args.normalize(form.title)),
    {
      name: 'top',
      text: toRawMessage(args.normalize(form.topButton.text)),
    },
    {
      name: 'bottom',
      text: toRawMessage(args.normalize(form.bottomButton.text)),
    }
  );

  if (form.body) {
    dialogue = dialogue.setBody(toRawMessage(args.normalize(form.body)));
  }

  return dialogue;
};

const configureFormInput = (form: InputForm, args: FormArguments): InputScriptDialogue<string> => {
  let dialogue: InputScriptDialogue<string>;
  dialogue = inputScriptDialogue(toRawMessage(args.normalize(form.title)));

  if (form.submit) {
    dialogue = dialogue.withSubmitButton(toRawMessage(args.normalize(form.submit)));
  }

  for (let i = 0; i < form.elements.length; ++i) {
    const element = form.elements[i];
    if (element.type === 'slider') {
      let input = inputSlider(
        element.name ?? i.toString(),
        toRawMessage(args.normalize(element.text)),
        element.min,
        element.max,
        element.step,
        element.defaultValue
      );
      if (element.tooltip) {
        input = input.withTooltip(toRawMessage(args.normalize(element.tooltip)));
      }

      dialogue = dialogue.addElement(input);
    } else if (element.type === 'dropdown') {
      let dropdown = inputDropdown(element.name ?? i.toString(), toRawMessage(args.normalize(element.text)));
      if (element.defaultValue) {
        const defaultIndex = element.options.findIndex((o) => o.value === element.defaultValue);
        dropdown = dropdown.setDefaultValueIndex(defaultIndex === -1 ? 0 : defaultIndex);
      }

      for (let j = 0; j < element.options.length; ++j) {
        const option = element.options[j];
        dropdown = dropdown.addOption(toRawMessage(args.normalize(option.text)), option.value);
      }

      if (element.tooltip) {
        dropdown = dropdown.withTooltip(toRawMessage(args.normalize(element.tooltip)));
      }

      dialogue = dialogue.addElement(dropdown);
    } else if (element.type === 'text') {
      let input = inputText(
        element.name ?? i.toString(),
        toRawMessage(args.normalize(element.text)),
        toRawMessage(args.normalize(element.placeholder)),
        element.defaultValue
      );
      if (element.tooltip) {
        input = input.withTooltip(toRawMessage(args.normalize(element.tooltip)));
      }
      dialogue = dialogue.addElement(input);
    } else if (element.type === 'toggle') {
      let input = inputToggle(
        element.name ?? i.toString(),
        toRawMessage(args.normalize(element.text)),
        element.defaultValue
      );
      if (element.tooltip) {
        input = input.withTooltip(toRawMessage(args.normalize(element.tooltip)));
      }

      dialogue = dialogue.addElement(input);
    } else if (element.type === 'label') {
      dialogue = dialogue.addLabel(toRawMessage(args.normalize(element.text)));
    } else if (element.type === 'divider') {
      dialogue = dialogue.addDivider();
    } else if (element.type === 'header') {
      dialogue = dialogue.addHeader(toRawMessage(args.normalize(element.text)));
    } else {
      assertNever(element);
    }
  }

  return dialogue;
};

const configureForm = (form: Form, args: FormArguments) => {
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

const renderForm = async (player: Player, formHub: FormHub, form: Form, args: FormArguments) => {
  const dialogue = configureForm(form, args);
  const response = await dialogue.open({ player });

  if (response instanceof ButtonDialogueResponse) {
    if (form.type === 'multi-button') {
      const multiButtonForm = form as MultiButtonForm;
      const selected = parseInt(response.selected);
      return new FormEventProducer(
        formHub,
        (multiButtonForm.elements[selected] as MultiButtonElementButton).action,
        args
      );
    } else if (form.type === 'dual-button') {
      const dualButtonForm = form as DualButtonForm;
      if (response.selected === 'top') {
        return new FormEventProducer(formHub, dualButtonForm.topButton.action, args);
      } else if (response.selected === 'bottom') {
        return new FormEventProducer(formHub, dualButtonForm.bottomButton.action, args);
      }
    }
  } else if (response instanceof InputScriptDialogueResponse) {
    const inputForm = form as InputForm;
    const event = new FormEventProducer(
      formHub,
      {
        ...inputForm.action,
        setArgs: {
          ...inputForm.action?.setArgs,
          ...response.values,
        },
      },
      args
    );

    return event;
  } else if (response instanceof DialogueRejectedResponse) {
    console.error('Dialogue rejected: Exception:', response.exception, 'reason:', response.reason);
  }

  return new FormEventProducer(formHub);
};

export const renderLoop = async (player: Player, formHub: FormHub, receiver: EventReceiver) => {
  const initialProducer = FormEventProducer.fromFormHub(formHub);
  let currentForm: Form | undefined = await triggerEvent(initialProducer, receiver);
  let args = initialProducer.args;
  while (currentForm !== undefined) {
    const eventProducer = await renderForm(player, formHub, currentForm, args);
    currentForm = await triggerEvent(eventProducer, receiver);
    args = eventProducer.args;
  }
};
